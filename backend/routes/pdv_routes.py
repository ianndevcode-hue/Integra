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


# ===== RESTAURANT MODE - TABLES & ORDERS =====
@router.get("/tables")
async def list_tables(request: Request):
    from server import db
    tid, user = await get_pdv_user(request)
    tables = await db.restaurant_tables.find({"tenant_id": tid}).sort("number", 1).to_list(100)
    if not tables:
        # Auto-create default tables
        default_tables = []
        for i in range(1, 16):
            default_tables.append({"tenant_id": tid, "number": i, "name": f"Mesa {i}", "seats": 4, "status": "free", "area": "Salão", "created_at": datetime.now(timezone.utc).isoformat()})
        await db.restaurant_tables.insert_many(default_tables)
        tables = await db.restaurant_tables.find({"tenant_id": tid}).sort("number", 1).to_list(100)
    return serialize_list(tables)


@router.post("/tables")
async def create_table(data: dict, request: Request):
    from server import db
    tid, user = await get_pdv_user(request)
    data["tenant_id"] = tid
    data["status"] = "free"
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.restaurant_tables.insert_one(data)
    data["_id"] = str(result.inserted_id)
    return data


@router.patch("/tables/{table_id}/status")
async def update_table_status(table_id: str, data: dict, request: Request):
    from server import db
    tid, user = await get_pdv_user(request)
    await db.restaurant_tables.update_one(
        {"_id": ObjectId(table_id), "tenant_id": tid},
        {"$set": {"status": data.get("status", "free"), "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    table = await db.restaurant_tables.find_one({"_id": ObjectId(table_id)})
    return serialize_doc(table)


# ===== TABLE ORDERS (Comandas) =====
@router.get("/table-orders")
async def list_table_orders(request: Request, table_id: Optional[str] = None, status: Optional[str] = None):
    from server import db
    tid, user = await get_pdv_user(request)
    query = {"tenant_id": tid}
    if table_id:
        query["table_id"] = table_id
    if status:
        query["status"] = status
    else:
        query["status"] = {"$in": ["open", "in_progress"]}
    orders = await db.table_orders.find(query).sort("created_at", -1).to_list(100)
    return serialize_list(orders)


@router.post("/table-orders")
async def create_table_order(data: dict, request: Request):
    from server import db
    tid, user = await get_pdv_user(request)

    last = await db.table_orders.find({"tenant_id": tid}).sort("created_at", -1).limit(1).to_list(1)
    num = 1
    if last:
        try:
            num = int(last[0].get("order_number", "CMD-0").split("-")[1]) + 1
        except:
            num = 1

    doc = {
        "tenant_id": tid,
        "order_number": f"CMD-{num:04d}",
        "table_id": data.get("table_id"),
        "table_name": data.get("table_name"),
        "customer_name": data.get("customer_name", ""),
        "people_count": data.get("people_count", 1),
        "items": data.get("items", []),
        "subtotal": 0,
        "service_fee": 0,
        "discount": 0,
        "total": 0,
        "notes": data.get("notes", ""),
        "status": "open",
        "opened_by": user.get("name"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.table_orders.insert_one(doc)

    # Update table status
    if data.get("table_id"):
        await db.restaurant_tables.update_one(
            {"_id": ObjectId(data["table_id"]), "tenant_id": tid},
            {"$set": {"status": "occupied", "current_order_id": str(result.inserted_id)}}
        )

    doc["_id"] = str(result.inserted_id)
    return doc


@router.post("/table-orders/{order_id}/items")
async def add_items_to_order(order_id: str, data: dict, request: Request):
    from server import db
    tid, user = await get_pdv_user(request)
    items = data.get("items", [])
    for item in items:
        item["added_at"] = datetime.now(timezone.utc).isoformat()
        item["added_by"] = user.get("name")
        item["status"] = "pending"

    order = await db.table_orders.find_one({"_id": ObjectId(order_id), "tenant_id": tid})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    existing_items = order.get("items", [])
    all_items = existing_items + items
    subtotal = sum(i.get("quantity", 0) * i.get("unit_price", 0) for i in all_items)
    service_fee = round(subtotal * 0.1, 2)  # 10% service
    total = subtotal + service_fee - order.get("discount", 0)

    await db.table_orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"items": all_items, "subtotal": subtotal, "service_fee": service_fee, "total": total, "status": "in_progress"}}
    )
    updated = await db.table_orders.find_one({"_id": ObjectId(order_id)})
    return serialize_doc(updated)


@router.patch("/table-orders/{order_id}/close")
async def close_table_order(order_id: str, data: dict, request: Request):
    from server import db
    tid, user = await get_pdv_user(request)
    order = await db.table_orders.find_one({"_id": ObjectId(order_id), "tenant_id": tid})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    payment_method = data.get("payment_method", "dinheiro")
    split_count = data.get("split_count", 1)

    # Create sale from table order
    register = await db.cash_registers.find_one({"tenant_id": tid, "status": "open"})

    last_sale = await db.sales.find({"tenant_id": tid}).sort("created_at", -1).limit(1).to_list(1)
    sale_num = 1001
    if last_sale:
        try:
            sale_num = int(last_sale[0].get("sale_number", "V-1000").split("-")[1]) + 1
        except:
            sale_num = 1001

    sale_doc = {
        "tenant_id": tid,
        "sale_number": f"V-{sale_num}",
        "client_name": order.get("customer_name") or f"Mesa {order.get('table_name', '')}",
        "items": order.get("items", []),
        "subtotal": order.get("subtotal", 0),
        "service_fee": order.get("service_fee", 0),
        "discount": order.get("discount", 0),
        "total": order.get("total", 0),
        "payment_method": payment_method,
        "status": "completed",
        "fiscal_status": "pendente",
        "source": "pdv_restaurant",
        "table_order_id": order_id,
        "table_name": order.get("table_name"),
        "cash_register_id": str(register["_id"]) if register else None,
        "user_name": user.get("name"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    sale_result = await db.sales.insert_one(sale_doc)

    # Update cash register
    if register:
        await db.cash_registers.update_one({"_id": register["_id"]}, {"$inc": {"current_amount": order.get("total", 0), "total_sales": order.get("total", 0), "total_sales_count": 1}})

    # Close order + free table
    await db.table_orders.update_one({"_id": ObjectId(order_id)}, {"$set": {"status": "closed", "payment_method": payment_method, "closed_at": datetime.now(timezone.utc).isoformat(), "closed_by": user.get("name"), "sale_id": str(sale_result.inserted_id)}})

    if order.get("table_id"):
        await db.restaurant_tables.update_one({"_id": ObjectId(order["table_id"]), "tenant_id": tid}, {"$set": {"status": "free", "current_order_id": None}})

    sale_doc["_id"] = str(sale_result.inserted_id)
    return serialize_doc(sale_doc)


@router.delete("/table-orders/{order_id}/items/{item_index}")
async def remove_item_from_order(order_id: str, item_index: int, request: Request):
    from server import db
    tid, user = await get_pdv_user(request)
    order = await db.table_orders.find_one({"_id": ObjectId(order_id), "tenant_id": tid})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    items = order.get("items", [])
    if 0 <= item_index < len(items):
        items.pop(item_index)
    subtotal = sum(i.get("quantity", 0) * i.get("unit_price", 0) for i in items)
    service_fee = round(subtotal * 0.1, 2)
    total = subtotal + service_fee - order.get("discount", 0)
    await db.table_orders.update_one({"_id": ObjectId(order_id)}, {"$set": {"items": items, "subtotal": subtotal, "service_fee": service_fee, "total": total}})
    updated = await db.table_orders.find_one({"_id": ObjectId(order_id)})
    return serialize_doc(updated)

