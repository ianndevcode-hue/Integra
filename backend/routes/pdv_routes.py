from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from bson import ObjectId
from typing import Optional

router = APIRouter(prefix="/api/pdv", tags=["pdv"])


def serialize_doc(doc):
    if doc is None:
        return None
    doc["_id"] = str(doc["_id"])
    if "id" not in doc:
        doc["id"] = doc["_id"]
    return doc

def serialize_list(docs):
    return [serialize_doc(d) for d in docs]


async def get_pdv_user(request):
    from server import get_user
    user = await get_user(request)
    tid = user.get("tenant_id")
    if not tid:
        raise HTTPException(status_code=403, detail="No tenant assigned")
    return tid, user


@router.get("/products")
async def pdv_products(request: Request, search: Optional[str] = None, category: Optional[str] = None):
    from server import db
    tid, user = await get_pdv_user(request)
    query = {"tenant_id": tid, "is_active": True}
    if search:
        query["$or"] = [{"name": {"$regex": search, "$options": "i"}}, {"barcode": {"$regex": search, "$options": "i"}}, {"sku": {"$regex": search, "$options": "i"}}]
    if category:
        query["category"] = category
    products = await db.products.find(query).to_list(500)
    return serialize_list(products)


@router.get("/products/categories")
async def pdv_categories(request: Request):
    from server import db
    tid, user = await get_pdv_user(request)
    categories = await db.products.distinct("category", {"tenant_id": tid, "is_active": True})
    return [c for c in categories if c]


@router.get("/clients")
async def pdv_clients(request: Request, search: Optional[str] = None):
    from server import db
    tid, user = await get_pdv_user(request)
    query = {"tenant_id": tid, "is_active": True}
    if search:
        query["$or"] = [{"name": {"$regex": search, "$options": "i"}}, {"document": {"$regex": search, "$options": "i"}}]
    clients = await db.clients.find(query).limit(20).to_list(20)
    return serialize_list(clients)


# ===== CASH REGISTER =====
@router.get("/cash-register")
async def get_cash_register(request: Request):
    from server import db
    tid, user = await get_pdv_user(request)
    register = await db.cash_registers.find_one({"tenant_id": tid, "status": "open"})
    if register:
        return serialize_doc(register)
    return None


@router.post("/cash-register/open")
async def open_cash_register(data: dict, request: Request):
    from server import db
    tid, user = await get_pdv_user(request)
    existing = await db.cash_registers.find_one({"tenant_id": tid, "status": "open"})
    if existing:
        raise HTTPException(status_code=400, detail="Cash register already open")
    doc = {
        "tenant_id": tid,
        "opened_by": user.get("name"),
        "opened_by_id": user.get("_id"),
        "initial_amount": float(data.get("initial_amount", 0)),
        "current_amount": float(data.get("initial_amount", 0)),
        "total_sales": 0,
        "total_sales_count": 0,
        "total_sangria": 0,
        "total_suprimento": 0,
        "total_cash": 0,
        "total_credit": 0,
        "total_debit": 0,
        "total_pix": 0,
        "movements": [],
        "status": "open",
        "notes": data.get("notes"),
        "opened_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.cash_registers.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc["id"] = doc["_id"]
    return doc


@router.post("/cash-register/close")
async def close_cash_register(data: dict, request: Request):
    from server import db
    tid, user = await get_pdv_user(request)
    register = await db.cash_registers.find_one({"tenant_id": tid, "status": "open"})
    if not register:
        raise HTTPException(status_code=400, detail="No open cash register")
    await db.cash_registers.update_one(
        {"_id": register["_id"]},
        {"$set": {
            "status": "closed",
            "closed_by": user.get("name"),
            "closed_by_id": user.get("_id"),
            "closed_at": datetime.now(timezone.utc).isoformat(),
            "closing_amount": float(data.get("closing_amount", register.get("current_amount", 0))),
            "difference": float(data.get("closing_amount", register.get("current_amount", 0))) - register.get("current_amount", 0),
            "notes": data.get("notes")
        }}
    )
    register = await db.cash_registers.find_one({"_id": register["_id"]})
    return serialize_doc(register)


@router.post("/cash-register/movement")
async def cash_movement(data: dict, request: Request):
    from server import db
    tid, user = await get_pdv_user(request)
    register = await db.cash_registers.find_one({"tenant_id": tid, "status": "open"})
    if not register:
        raise HTTPException(status_code=400, detail="No open cash register")
    movement = {
        "type": data.get("type"),
        "amount": float(data.get("amount", 0)),
        "reason": data.get("reason"),
        "user": user.get("name"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    amount_change = -float(data.get("amount", 0)) if data.get("type") == "sangria" else float(data.get("amount", 0))
    inc_field = "total_sangria" if data.get("type") == "sangria" else "total_suprimento"
    await db.cash_registers.update_one(
        {"_id": register["_id"]},
        {"$push": {"movements": movement}, "$inc": {"current_amount": amount_change, inc_field: float(data.get("amount", 0))}}
    )
    return {"message": "Movement recorded", "movement": movement}


# ===== PDV SALES =====
@router.post("/sales")
async def pdv_create_sale(data: dict, request: Request):
    from server import db
    tid, user = await get_pdv_user(request)
    
    register = await db.cash_registers.find_one({"tenant_id": tid, "status": "open"})
    if not register:
        raise HTTPException(status_code=400, detail="Cash register not open")
    
    items = data.get("items", [])
    subtotal = sum(i.get("quantity", 0) * i.get("unit_price", 0) - i.get("discount", 0) for i in items)
    discount = float(data.get("discount", 0))
    surcharge = float(data.get("surcharge", 0))
    total = subtotal - discount + surcharge
    
    last_sale = await db.sales.find({"tenant_id": tid}).sort("created_at", -1).limit(1).to_list(1)
    sale_num = 1001
    if last_sale:
        try:
            sale_num = int(last_sale[0].get("sale_number", "V-1000").split("-")[1]) + 1
        except:
            sale_num = 1001
    
    payment_method = data.get("payment_method", "dinheiro")
    payments = data.get("payments", [{"method": payment_method, "amount": total}])
    
    doc = {
        "tenant_id": tid,
        "sale_number": f"V-{sale_num}",
        "client_id": data.get("client_id"),
        "client_name": data.get("client_name", "Consumidor Final"),
        "items": items,
        "subtotal": subtotal,
        "discount": discount,
        "surcharge": surcharge,
        "total": total,
        "payment_method": payment_method,
        "payments": payments,
        "status": "completed",
        "fiscal_status": "pendente",
        "source": "pdv",
        "pdv_mode": data.get("pdv_mode", "varejo"),
        "cash_register_id": str(register["_id"]),
        "user_id": user.get("_id"),
        "user_name": user.get("name"),
        "notes": data.get("notes"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.sales.insert_one(doc)
    
    # Update cash register
    payment_inc = {}
    for p in payments:
        m = p.get("method", "dinheiro")
        if m == "dinheiro":
            payment_inc["total_cash"] = payment_inc.get("total_cash", 0) + p.get("amount", 0)
        elif m == "cartao_credito":
            payment_inc["total_credit"] = payment_inc.get("total_credit", 0) + p.get("amount", 0)
        elif m == "cartao_debito":
            payment_inc["total_debit"] = payment_inc.get("total_debit", 0) + p.get("amount", 0)
        elif m == "pix":
            payment_inc["total_pix"] = payment_inc.get("total_pix", 0) + p.get("amount", 0)
    
    inc_data = {"current_amount": total, "total_sales": total, "total_sales_count": 1}
    inc_data.update(payment_inc)
    await db.cash_registers.update_one({"_id": register["_id"]}, {"$inc": inc_data})
    
    # Update stock
    for item in items:
        if item.get("product_id"):
            try:
                await db.products.update_one(
                    {"_id": ObjectId(item["product_id"]), "tenant_id": tid},
                    {"$inc": {"stock_quantity": -item.get("quantity", 0)}}
                )
            except:
                pass
    
    doc["_id"] = str(result.inserted_id)
    doc["id"] = doc["_id"]
    return doc


@router.get("/sales")
async def pdv_list_sales(request: Request, date: Optional[str] = None):
    from server import db
    tid, user = await get_pdv_user(request)
    today = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    sales = await db.sales.find({"tenant_id": tid, "source": "pdv", "created_at": {"$gte": today}}).sort("created_at", -1).to_list(100)
    return serialize_list(sales)


@router.get("/sales/history")
async def pdv_sales_history(request: Request, page: int = 1, limit: int = 20):
    from server import db
    tid, user = await get_pdv_user(request)
    total = await db.sales.count_documents({"tenant_id": tid, "source": "pdv"})
    skip = (page - 1) * limit
    sales = await db.sales.find({"tenant_id": tid, "source": "pdv"}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"data": serialize_list(sales), "total": total, "page": page}


@router.patch("/sales/{sale_id}/cancel")
async def pdv_cancel_sale(sale_id: str, data: dict, request: Request):
    from server import db
    tid, user = await get_pdv_user(request)
    sale = await db.sales.find_one({"_id": ObjectId(sale_id), "tenant_id": tid})
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    if sale.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="Sale already cancelled")
    await db.sales.update_one({"_id": ObjectId(sale_id)}, {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat(), "cancel_reason": data.get("reason", ""), "cancelled_by": user.get("name")}})
    # Restore stock
    for item in sale.get("items", []):
        if item.get("product_id"):
            try:
                await db.products.update_one({"_id": ObjectId(item["product_id"]), "tenant_id": tid}, {"$inc": {"stock_quantity": item.get("quantity", 0)}})
            except:
                pass
    return {"message": "Sale cancelled"}


# ===== PDV SYNC =====
@router.post("/sync")
async def pdv_sync(data: dict, request: Request):
    from server import db
    tid, user = await get_pdv_user(request)
    synced = []
    for sale_data in data.get("sales", []):
        sale_data["tenant_id"] = tid
        sale_data["synced_at"] = datetime.now(timezone.utc).isoformat()
        sale_data["sync_status"] = "synced"
        result = await db.sales.insert_one(sale_data)
        synced.append(str(result.inserted_id))
    return {"synced_count": len(synced), "ids": synced}


@router.get("/sync/status")
async def pdv_sync_status(request: Request):
    from server import db
    tid, user = await get_pdv_user(request)
    pending = await db.sales.count_documents({"tenant_id": tid, "sync_status": "pending"})
    last_sync = await db.sales.find({"tenant_id": tid, "synced_at": {"$exists": True}}).sort("synced_at", -1).limit(1).to_list(1)
    return {"pending_sync": pending, "last_sync": last_sync[0].get("synced_at") if last_sync else None}


# ===== PDV CONFIG =====
@router.get("/config")
async def pdv_config(request: Request):
    from server import db
    tid, user = await get_pdv_user(request)
    settings = await db.pdv_settings.find_one({"tenant_id": tid})
    license_data = await db.licenses.find_one({"tenant_id": tid, "status": "active"})
    return {
        "settings": serialize_doc(settings) if settings else {"mode": "varejo", "allow_discount": True},
        "license": serialize_doc(license_data) if license_data else None,
        "user": {"name": user.get("name"), "role": user.get("role"), "email": user.get("email")}
    }


@router.get("/cash-register/history")
async def cash_register_history(request: Request, page: int = 1, limit: int = 10):
    from server import db
    tid, user = await get_pdv_user(request)
    total = await db.cash_registers.count_documents({"tenant_id": tid, "status": "closed"})
    skip = (page - 1) * limit
    registers = await db.cash_registers.find({"tenant_id": tid, "status": "closed"}).sort("closed_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"data": serialize_list(registers), "total": total, "page": page}
