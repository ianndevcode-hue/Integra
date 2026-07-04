from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request, Query
from bson import ObjectId
from typing import Optional

router = APIRouter(prefix="/api/saas", tags=["saas"])


def serialize_doc(doc):
    if doc is None:
        return None
    doc["_id"] = str(doc["_id"])
    if "id" not in doc:
        doc["id"] = doc["_id"]
    return doc

def serialize_list(docs):
    return [serialize_doc(d) for d in docs]


async def get_tenant_id(request):
    from server import get_user
    user = await get_user(request)
    tid = user.get("tenant_id")
    if not tid:
        raise HTTPException(status_code=403, detail="No tenant assigned")
    return tid, user


# ===== DASHBOARD =====
@router.get("/dashboard")
async def saas_dashboard(request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    
    total_products = await db.products.count_documents({"tenant_id": tid})
    total_services = await db.services.count_documents({"tenant_id": tid})
    total_clients = await db.clients.count_documents({"tenant_id": tid})
    total_suppliers = await db.suppliers.count_documents({"tenant_id": tid})
    total_sales = await db.sales.count_documents({"tenant_id": tid})
    
    # Today's revenue
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_sales = await db.sales.aggregate([
        {"$match": {"tenant_id": tid, "status": "completed", "created_at": {"$gte": today}}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}, "count": {"$sum": 1}}}
    ]).to_list(1)
    
    # Monthly revenue
    month_start = datetime.now(timezone.utc).replace(day=1).strftime("%Y-%m-%d")
    month_sales = await db.sales.aggregate([
        {"$match": {"tenant_id": tid, "status": "completed", "created_at": {"$gte": month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}, "count": {"$sum": 1}}}
    ]).to_list(1)
    
    # Total revenue
    all_sales = await db.sales.aggregate([
        {"$match": {"tenant_id": tid, "status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}, "count": {"$sum": 1}}}
    ]).to_list(1)
    
    # Financial 
    receivable = await db.financial.aggregate([
        {"$match": {"tenant_id": tid, "type": "receivable", "status": "pending"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    payable = await db.financial.aggregate([
        {"$match": {"tenant_id": tid, "type": "payable", "status": "pending"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    
    recent_sales = await db.sales.find({"tenant_id": tid}).sort("created_at", -1).limit(5).to_list(5)
    
    low_stock = await db.products.find({
        "tenant_id": tid, "$expr": {"$lte": ["$stock_quantity", "$min_stock"]}
    }).limit(5).to_list(5)
    
    # Top selling products
    top_products = await db.sales.aggregate([
        {"$match": {"tenant_id": tid, "status": "completed"}},
        {"$unwind": "$items"},
        {"$group": {"_id": "$items.product_name", "total_qty": {"$sum": "$items.quantity"}, "total_revenue": {"$sum": {"$multiply": ["$items.quantity", "$items.unit_price"]}}}},
        {"$sort": {"total_revenue": -1}},
        {"$limit": 5}
    ]).to_list(5)
    
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    daily_sales = await db.sales.aggregate([
        {"$match": {"tenant_id": tid, "created_at": {"$gte": thirty_days_ago}}},
        {"$addFields": {"date": {"$substr": ["$created_at", 0, 10]}}},
        {"$group": {"_id": "$date", "total": {"$sum": "$total"}, "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]).to_list(31)
    
    by_payment = await db.sales.aggregate([
        {"$match": {"tenant_id": tid, "status": "completed"}},
        {"$group": {"_id": "$payment_method", "total": {"$sum": "$total"}, "count": {"$sum": 1}}}
    ]).to_list(10)
    
    # Open cash register
    open_register = await db.cash_registers.find_one({"tenant_id": tid, "status": "open"})
    
    # Fiscal stats
    fiscal_emitted = await db.sales.count_documents({"tenant_id": tid, "fiscal_status": "emitida"})
    fiscal_rejected = await db.sales.count_documents({"tenant_id": tid, "fiscal_status": "rejeitada"})
    
    return {
        "total_products": total_products,
        "total_services": total_services,
        "total_clients": total_clients,
        "total_suppliers": total_suppliers,
        "total_sales": total_sales,
        "today_revenue": today_sales[0]["total"] if today_sales else 0,
        "today_count": today_sales[0]["count"] if today_sales else 0,
        "month_revenue": month_sales[0]["total"] if month_sales else 0,
        "total_revenue": all_sales[0]["total"] if all_sales else 0,
        "receivable": receivable[0]["total"] if receivable else 0,
        "payable": payable[0]["total"] if payable else 0,
        "recent_sales": serialize_list(recent_sales),
        "low_stock": serialize_list(low_stock),
        "top_products": top_products,
        "daily_sales": [{"date": d["_id"], "total": d["total"], "count": d["count"]} for d in daily_sales],
        "sales_by_payment": [{"method": d["_id"], "total": d["total"], "count": d["count"]} for d in by_payment],
        "cash_register_open": open_register is not None,
        "fiscal_emitted": fiscal_emitted,
        "fiscal_rejected": fiscal_rejected,
    }


# ===== PRODUCTS =====
@router.get("/products")
async def list_products(request: Request, search: Optional[str] = None, category: Optional[str] = None, page: int = 1, limit: int = 50):
    from server import db
    tid, user = await get_tenant_id(request)
    query = {"tenant_id": tid}
    if search:
        query["$or"] = [{"name": {"$regex": search, "$options": "i"}}, {"sku": {"$regex": search, "$options": "i"}}, {"barcode": {"$regex": search, "$options": "i"}}]
    if category:
        query["category"] = category
    total = await db.products.count_documents(query)
    skip = (page - 1) * limit
    products = await db.products.find(query).sort("name", 1).skip(skip).limit(limit).to_list(limit)
    return {"data": serialize_list(products), "total": total, "page": page, "pages": (total + limit - 1) // limit}


@router.post("/products")
async def create_product(data: dict, request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    data["tenant_id"] = tid
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    data["is_active"] = data.get("is_active", True)
    # Calculate margin
    cost = float(data.get("cost_price", 0) or 0)
    sale = float(data.get("sale_price", 0) or 0)
    data["margin"] = round(((sale - cost) / cost * 100) if cost > 0 else 0, 2)
    result = await db.products.insert_one(data)
    data["_id"] = str(result.inserted_id)
    data["id"] = data["_id"]
    return data


@router.put("/products/{product_id}")
async def update_product(product_id: str, data: dict, request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    data.pop("_id", None)
    data.pop("id", None)
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    cost = float(data.get("cost_price", 0) or 0)
    sale = float(data.get("sale_price", 0) or 0)
    if cost > 0:
        data["margin"] = round(((sale - cost) / cost * 100), 2)
    await db.products.update_one({"_id": ObjectId(product_id), "tenant_id": tid}, {"$set": data})
    product = await db.products.find_one({"_id": ObjectId(product_id)})
    return serialize_doc(product)


@router.delete("/products/{product_id}")
async def delete_product(product_id: str, request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    await db.products.delete_one({"_id": ObjectId(product_id), "tenant_id": tid})
    return {"message": "Product deleted"}


# ===== SERVICES =====
@router.get("/services")
async def list_services(request: Request, page: int = 1, limit: int = 50):
    from server import db
    tid, user = await get_tenant_id(request)
    total = await db.services.count_documents({"tenant_id": tid})
    skip = (page - 1) * limit
    services = await db.services.find({"tenant_id": tid}).sort("name", 1).skip(skip).limit(limit).to_list(limit)
    return {"data": serialize_list(services), "total": total, "page": page}


@router.post("/services")
async def create_service(data: dict, request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    data["tenant_id"] = tid
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    data["is_active"] = True
    result = await db.services.insert_one(data)
    data["_id"] = str(result.inserted_id)
    data["id"] = data["_id"]
    return data


@router.put("/services/{service_id}")
async def update_service(service_id: str, data: dict, request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    data.pop("_id", None)
    data.pop("id", None)
    await db.services.update_one({"_id": ObjectId(service_id), "tenant_id": tid}, {"$set": data})
    svc = await db.services.find_one({"_id": ObjectId(service_id)})
    return serialize_doc(svc)


@router.delete("/services/{service_id}")
async def delete_service(service_id: str, request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    await db.services.delete_one({"_id": ObjectId(service_id), "tenant_id": tid})
    return {"message": "Service deleted"}


# ===== REAL ESTATE (IMÓVEIS) =====
@router.get("/real-estate")
async def list_real_estate(request: Request, page: int = 1, limit: int = 50):
    from server import db
    tid, user = await get_tenant_id(request)
    total = await db.real_estate.count_documents({"tenant_id": tid})
    skip = (page - 1) * limit
    items = await db.real_estate.find({"tenant_id": tid}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"data": serialize_list(items), "total": total, "page": page}


@router.post("/real-estate")
async def create_real_estate(data: dict, request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    data["tenant_id"] = tid
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.real_estate.insert_one(data)
    data["_id"] = str(result.inserted_id)
    data["id"] = data["_id"]
    return data


@router.put("/real-estate/{item_id}")
async def update_real_estate(item_id: str, data: dict, request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    data.pop("_id", None)
    data.pop("id", None)
    await db.real_estate.update_one({"_id": ObjectId(item_id), "tenant_id": tid}, {"$set": data})
    item = await db.real_estate.find_one({"_id": ObjectId(item_id)})
    return serialize_doc(item)


@router.delete("/real-estate/{item_id}")
async def delete_real_estate(item_id: str, request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    await db.real_estate.delete_one({"_id": ObjectId(item_id), "tenant_id": tid})
    return {"message": "Deleted"}


# ===== VEHICLES =====
@router.get("/vehicles")
async def list_vehicles(request: Request, page: int = 1, limit: int = 50):
    from server import db
    tid, user = await get_tenant_id(request)
    total = await db.vehicles.count_documents({"tenant_id": tid})
    skip = (page - 1) * limit
    items = await db.vehicles.find({"tenant_id": tid}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"data": serialize_list(items), "total": total, "page": page}


@router.post("/vehicles")
async def create_vehicle(data: dict, request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    data["tenant_id"] = tid
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.vehicles.insert_one(data)
    data["_id"] = str(result.inserted_id)
    data["id"] = data["_id"]
    return data


@router.put("/vehicles/{item_id}")
async def update_vehicle(item_id: str, data: dict, request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    data.pop("_id", None)
    data.pop("id", None)
    await db.vehicles.update_one({"_id": ObjectId(item_id), "tenant_id": tid}, {"$set": data})
    item = await db.vehicles.find_one({"_id": ObjectId(item_id)})
    return serialize_doc(item)


@router.delete("/vehicles/{item_id}")
async def delete_vehicle(item_id: str, request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    await db.vehicles.delete_one({"_id": ObjectId(item_id), "tenant_id": tid})
    return {"message": "Deleted"}


# ===== CLIENTS =====
@router.get("/clients")
async def list_clients(request: Request, search: Optional[str] = None, page: int = 1, limit: int = 50):
    from server import db
    tid, user = await get_tenant_id(request)
    query = {"tenant_id": tid}
    if search:
        query["$or"] = [{"name": {"$regex": search, "$options": "i"}}, {"document": {"$regex": search, "$options": "i"}}, {"email": {"$regex": search, "$options": "i"}}]
    total = await db.clients.count_documents(query)
    skip = (page - 1) * limit
    clients = await db.clients.find(query).sort("name", 1).skip(skip).limit(limit).to_list(limit)
    return {"data": serialize_list(clients), "total": total, "page": page, "pages": (total + limit - 1) // limit}


@router.post("/clients")
async def create_client(data: dict, request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    data["tenant_id"] = tid
    data["is_active"] = True
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.clients.insert_one(data)
    data["_id"] = str(result.inserted_id)
    data["id"] = data["_id"]
    return data


@router.put("/clients/{client_id}")
async def update_client(client_id: str, data: dict, request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    data.pop("_id", None)
    data.pop("id", None)
    await db.clients.update_one({"_id": ObjectId(client_id), "tenant_id": tid}, {"$set": data})
    client = await db.clients.find_one({"_id": ObjectId(client_id)})
    return serialize_doc(client)


@router.delete("/clients/{client_id}")
async def delete_client(client_id: str, request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    await db.clients.delete_one({"_id": ObjectId(client_id), "tenant_id": tid})
    return {"message": "Deleted"}


# ===== SUPPLIERS =====
@router.get("/suppliers")
async def list_suppliers(request: Request, search: Optional[str] = None, page: int = 1, limit: int = 50):
    from server import db
    tid, user = await get_tenant_id(request)
    query = {"tenant_id": tid}
    if search:
        query["$or"] = [{"name": {"$regex": search, "$options": "i"}}, {"cnpj": {"$regex": search, "$options": "i"}}]
    total = await db.suppliers.count_documents(query)
    skip = (page - 1) * limit
    suppliers = await db.suppliers.find(query).sort("name", 1).skip(skip).limit(limit).to_list(limit)
    return {"data": serialize_list(suppliers), "total": total, "page": page}


@router.post("/suppliers")
async def create_supplier(data: dict, request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    data["tenant_id"] = tid
    data["is_active"] = True
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.suppliers.insert_one(data)
    data["_id"] = str(result.inserted_id)
    data["id"] = data["_id"]
    return data


@router.put("/suppliers/{supplier_id}")
async def update_supplier(supplier_id: str, data: dict, request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    data.pop("_id", None)
    data.pop("id", None)
    await db.suppliers.update_one({"_id": ObjectId(supplier_id), "tenant_id": tid}, {"$set": data})
    supplier = await db.suppliers.find_one({"_id": ObjectId(supplier_id)})
    return serialize_doc(supplier)


@router.delete("/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: str, request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    await db.suppliers.delete_one({"_id": ObjectId(supplier_id), "tenant_id": tid})
    return {"message": "Deleted"}


# ===== INVENTORY =====
@router.get("/inventory")
async def get_inventory(request: Request, search: Optional[str] = None, filter_type: Optional[str] = None, page: int = 1, limit: int = 50):
    from server import db
    tid, user = await get_tenant_id(request)
    query = {"tenant_id": tid}
    if search:
        query["$or"] = [{"name": {"$regex": search, "$options": "i"}}, {"sku": {"$regex": search, "$options": "i"}}]
    if filter_type == "low_stock":
        query["$expr"] = {"$lte": ["$stock_quantity", "$min_stock"]}
    elif filter_type == "out_of_stock":
        query["stock_quantity"] = {"$lte": 0}
    total = await db.products.count_documents(query)
    skip = (page - 1) * limit
    products = await db.products.find(query).sort("name", 1).skip(skip).limit(limit).to_list(limit)
    
    # Summary
    all_products = await db.products.find({"tenant_id": tid}).to_list(1000)
    total_value = sum(p.get("stock_quantity", 0) * p.get("cost_price", 0) for p in all_products)
    low_count = sum(1 for p in all_products if p.get("stock_quantity", 0) <= p.get("min_stock", 0))
    out_count = sum(1 for p in all_products if p.get("stock_quantity", 0) <= 0)
    
    return {
        "data": serialize_list(products),
        "total": total,
        "page": page,
        "summary": {"total_items": len(all_products), "total_value": total_value, "low_stock": low_count, "out_of_stock": out_count}
    }


# ===== SALES =====
@router.get("/sales")
async def list_sales(request: Request, search: Optional[str] = None, status: Optional[str] = None, payment: Optional[str] = None, page: int = 1, limit: int = 50):
    from server import db
    tid, user = await get_tenant_id(request)
    query = {"tenant_id": tid}
    if search:
        query["$or"] = [{"sale_number": {"$regex": search, "$options": "i"}}, {"client_name": {"$regex": search, "$options": "i"}}]
    if status:
        query["status"] = status
    if payment:
        query["payment_method"] = payment
    total = await db.sales.count_documents(query)
    skip = (page - 1) * limit
    sales = await db.sales.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"data": serialize_list(sales), "total": total, "page": page, "pages": (total + limit - 1) // limit}


@router.post("/sales")
async def create_sale(data: dict, request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    items = data.get("items", [])
    subtotal = sum(i.get("quantity", 0) * i.get("unit_price", 0) - i.get("discount", 0) for i in items)
    total = subtotal - data.get("discount", 0)
    
    last_sale = await db.sales.find({"tenant_id": tid}).sort("created_at", -1).limit(1).to_list(1)
    sale_num = 1001
    if last_sale:
        try:
            sale_num = int(last_sale[0].get("sale_number", "V-1000").split("-")[1]) + 1
        except:
            sale_num = 1001
    
    doc = {
        "tenant_id": tid,
        "sale_number": f"V-{sale_num}",
        "client_id": data.get("client_id"),
        "client_name": data.get("client_name", "Consumidor Final"),
        "items": items,
        "subtotal": subtotal,
        "discount": data.get("discount", 0),
        "total": total,
        "payment_method": data.get("payment_method", "dinheiro"),
        "status": "completed",
        "fiscal_status": "pendente",
        "user_id": user.get("_id"),
        "user_name": user.get("name"),
        "notes": data.get("notes"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.sales.insert_one(doc)
    
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


@router.get("/sales/{sale_id}")
async def get_sale(sale_id: str, request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    sale = await db.sales.find_one({"_id": ObjectId(sale_id), "tenant_id": tid})
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    return serialize_doc(sale)


@router.patch("/sales/{sale_id}/cancel")
async def cancel_sale(sale_id: str, request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    sale = await db.sales.find_one({"_id": ObjectId(sale_id), "tenant_id": tid})
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    await db.sales.update_one({"_id": ObjectId(sale_id)}, {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat(), "cancelled_by": user.get("name")}})
    # Restore stock
    for item in sale.get("items", []):
        if item.get("product_id"):
            try:
                await db.products.update_one({"_id": ObjectId(item["product_id"]), "tenant_id": tid}, {"$inc": {"stock_quantity": item.get("quantity", 0)}})
            except:
                pass
    return {"message": "Sale cancelled"}


# ===== FINANCIAL =====
@router.get("/financial")
async def list_financial(request: Request, type_filter: Optional[str] = None, status: Optional[str] = None, page: int = 1, limit: int = 50):
    from server import db
    tid, user = await get_tenant_id(request)
    query = {"tenant_id": tid}
    if type_filter:
        query["type"] = type_filter
    if status:
        query["status"] = status
    total = await db.financial.count_documents(query)
    skip = (page - 1) * limit
    entries = await db.financial.find(query).sort("due_date", 1).skip(skip).limit(limit).to_list(limit)
    
    # Totals
    recv = await db.financial.aggregate([{"$match": {"tenant_id": tid, "type": "receivable", "status": "pending"}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]).to_list(1)
    pay = await db.financial.aggregate([{"$match": {"tenant_id": tid, "type": "payable", "status": "pending"}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]).to_list(1)
    overdue_count = await db.financial.count_documents({"tenant_id": tid, "status": "pending", "due_date": {"$lt": datetime.now(timezone.utc).isoformat()}})
    
    return {
        "data": serialize_list(entries),
        "total": total,
        "page": page,
        "summary": {
            "receivable": recv[0]["total"] if recv else 0,
            "payable": pay[0]["total"] if pay else 0,
            "overdue_count": overdue_count
        }
    }


@router.post("/financial")
async def create_financial(data: dict, request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    data["tenant_id"] = tid
    data["status"] = data.get("status", "pending")
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.financial.insert_one(data)
    data["_id"] = str(result.inserted_id)
    data["id"] = data["_id"]
    return data


@router.put("/financial/{entry_id}")
async def update_financial(entry_id: str, data: dict, request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    data.pop("_id", None)
    data.pop("id", None)
    await db.financial.update_one({"_id": ObjectId(entry_id), "tenant_id": tid}, {"$set": data})
    entry = await db.financial.find_one({"_id": ObjectId(entry_id)})
    return serialize_doc(entry)


@router.patch("/financial/{entry_id}/pay")
async def mark_as_paid(entry_id: str, request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    await db.financial.update_one(
        {"_id": ObjectId(entry_id), "tenant_id": tid},
        {"$set": {"status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}}
    )
    entry = await db.financial.find_one({"_id": ObjectId(entry_id)})
    return serialize_doc(entry)


@router.delete("/financial/{entry_id}")
async def delete_financial(entry_id: str, request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    await db.financial.delete_one({"_id": ObjectId(entry_id), "tenant_id": tid})
    return {"message": "Deleted"}


# ===== CASH FLOW =====
@router.get("/cash-flow")
async def get_cash_flow(request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    
    # Monthly cash flow
    entries = await db.financial.find({"tenant_id": tid}).to_list(1000)
    sales_data = await db.sales.find({"tenant_id": tid, "status": "completed"}).to_list(1000)
    
    monthly = {}
    for entry in entries:
        month = entry.get("due_date", "")[:7]
        if month not in monthly:
            monthly[month] = {"month": month, "income": 0, "expense": 0}
        if entry.get("type") == "receivable" and entry.get("status") == "paid":
            monthly[month]["income"] += entry.get("amount", 0)
        elif entry.get("type") == "payable" and entry.get("status") == "paid":
            monthly[month]["expense"] += entry.get("amount", 0)
    
    for sale in sales_data:
        month = sale.get("created_at", "")[:7]
        if month not in monthly:
            monthly[month] = {"month": month, "income": 0, "expense": 0}
        monthly[month]["income"] += sale.get("total", 0)
    
    flow = sorted(monthly.values(), key=lambda x: x["month"])
    for item in flow:
        item["balance"] = item["income"] - item["expense"]
    
    return flow


# ===== FISCAL =====
@router.get("/fiscal/config")
async def get_fiscal_config(request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    config = await db.fiscal_config.find_one({"tenant_id": tid})
    if config:
        return serialize_doc(config)
    return {"environment": "homologation", "certificate_uploaded": False, "csc_configured": False, "series_nfe": 1, "series_nfce": 1, "next_nfe_number": 1, "next_nfce_number": 1}


@router.put("/fiscal/config")
async def update_fiscal_config(data: dict, request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    data["tenant_id"] = tid
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.fiscal_config.update_one({"tenant_id": tid}, {"$set": data}, upsert=True)
    return data


@router.get("/fiscal/invoices")
async def list_invoices(request: Request, page: int = 1, limit: int = 50):
    from server import db
    tid, user = await get_tenant_id(request)
    total = await db.fiscal_invoices.count_documents({"tenant_id": tid})
    skip = (page - 1) * limit
    invoices = await db.fiscal_invoices.find({"tenant_id": tid}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"data": serialize_list(invoices), "total": total, "page": page}


# ===== USERS =====
@router.get("/users")
async def list_tenant_users(request: Request):
    from server import db, require_roles
    tid, user = await get_tenant_id(request)
    require_roles("admin", "manager", "super_admin")(user)
    users = await db.users.find({"tenant_id": tid}, {"password_hash": 0}).to_list(50)
    return serialize_list(users)


@router.post("/users")
async def create_tenant_user(data: dict, request: Request):
    from server import db, get_user, require_roles, hash_password
    tid, user = await get_tenant_id(request)
    require_roles("admin", "super_admin")(user)
    email = data.get("email", "").lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "email": email,
        "password_hash": hash_password(data.get("password", "123456")),
        "name": data.get("name"),
        "role": data.get("role", "seller"),
        "tenant_id": tid,
        "is_active": True,
        "permissions": data.get("permissions", []),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(doc)
    return {"id": str(result.inserted_id), "email": email, "name": data.get("name"), "role": data.get("role")}


@router.put("/users/{user_id}")
async def update_tenant_user(user_id: str, data: dict, request: Request):
    from server import db, require_roles
    tid, user = await get_tenant_id(request)
    require_roles("admin", "super_admin")(user)
    data.pop("_id", None)
    data.pop("id", None)
    data.pop("password_hash", None)
    await db.users.update_one({"_id": ObjectId(user_id), "tenant_id": tid}, {"$set": data})
    updated = await db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
    return serialize_doc(updated)


# ===== PERMISSIONS =====
@router.get("/permissions")
async def get_permissions(request: Request):
    return [
        {"id": "dashboard", "name": "Dashboard", "group": "Geral"},
        {"id": "products_view", "name": "Ver Produtos", "group": "Produtos"},
        {"id": "products_edit", "name": "Editar Produtos", "group": "Produtos"},
        {"id": "clients_view", "name": "Ver Clientes", "group": "Clientes"},
        {"id": "clients_edit", "name": "Editar Clientes", "group": "Clientes"},
        {"id": "sales_view", "name": "Ver Vendas", "group": "Vendas"},
        {"id": "sales_create", "name": "Criar Vendas", "group": "Vendas"},
        {"id": "sales_cancel", "name": "Cancelar Vendas", "group": "Vendas"},
        {"id": "financial_view", "name": "Ver Financeiro", "group": "Financeiro"},
        {"id": "financial_edit", "name": "Editar Financeiro", "group": "Financeiro"},
        {"id": "fiscal_view", "name": "Ver Fiscal", "group": "Fiscal"},
        {"id": "fiscal_emit", "name": "Emitir Notas", "group": "Fiscal"},
        {"id": "reports_view", "name": "Ver Relatórios", "group": "Relatórios"},
        {"id": "users_manage", "name": "Gerenciar Usuários", "group": "Administração"},
        {"id": "settings", "name": "Configurações", "group": "Administração"},
        {"id": "pdv", "name": "Acesso PDV", "group": "PDV"},
    ]


# ===== REPORTS =====
@router.get("/reports/sales")
async def report_sales(request: Request, start_date: Optional[str] = None, end_date: Optional[str] = None):
    from server import db
    tid, user = await get_tenant_id(request)
    query = {"tenant_id": tid, "status": "completed"}
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        query.setdefault("created_at", {})["$lte"] = end_date + "T23:59:59"
    
    sales = await db.sales.find(query).sort("created_at", -1).to_list(1000)
    total_revenue = sum(s.get("total", 0) for s in sales)
    by_payment = {}
    by_day = {}
    for s in sales:
        pm = s.get("payment_method", "outro")
        by_payment[pm] = by_payment.get(pm, 0) + s.get("total", 0)
        day = s.get("created_at", "")[:10]
        if day not in by_day:
            by_day[day] = {"date": day, "total": 0, "count": 0}
        by_day[day]["total"] += s.get("total", 0)
        by_day[day]["count"] += 1
    
    return {
        "sales": serialize_list(sales),
        "total_revenue": total_revenue,
        "total_count": len(sales),
        "by_payment": [{"method": k, "total": v} for k, v in by_payment.items()],
        "by_day": sorted(by_day.values(), key=lambda x: x["date"])
    }


@router.get("/reports/products")
async def report_products(request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    products = await db.products.find({"tenant_id": tid}).to_list(500)
    total_value = sum(p.get("stock_quantity", 0) * p.get("cost_price", 0) for p in products)
    total_sale_value = sum(p.get("stock_quantity", 0) * p.get("sale_price", 0) for p in products)
    return {
        "products": serialize_list(products),
        "total_cost_value": total_value,
        "total_sale_value": total_sale_value,
        "total_products": len(products)
    }


@router.get("/reports/financial")
async def report_financial(request: Request, start_date: Optional[str] = None, end_date: Optional[str] = None):
    from server import db
    tid, user = await get_tenant_id(request)
    query = {"tenant_id": tid}
    if start_date:
        query["due_date"] = {"$gte": start_date}
    if end_date:
        query.setdefault("due_date", {})["$lte"] = end_date
    entries = await db.financial.find(query).sort("due_date", 1).to_list(1000)
    return {"entries": serialize_list(entries), "total": len(entries)}


@router.get("/reports/clients")
async def report_clients(request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    clients = await db.clients.find({"tenant_id": tid}).to_list(500)
    # Get purchase history per client
    for c in clients:
        cid = str(c["_id"])
        purchases = await db.sales.count_documents({"tenant_id": tid, "client_id": cid})
        c["total_purchases"] = purchases
    return {"clients": serialize_list(clients), "total": len(clients)}


# ===== SETTINGS =====
@router.get("/settings")
async def get_tenant_settings(request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    tenant = await db.tenants.find_one({"_id": ObjectId(tid)})
    if not tenant:
        return {}
    return serialize_doc(tenant)


@router.put("/settings")
async def update_tenant_settings(data: dict, request: Request):
    from server import db, require_roles
    tid, user = await get_tenant_id(request)
    require_roles("admin", "super_admin")(user)
    data.pop("_id", None)
    data.pop("id", None)
    await db.tenants.update_one({"_id": ObjectId(tid)}, {"$set": data})
    tenant = await db.tenants.find_one({"_id": ObjectId(tid)})
    return serialize_doc(tenant)


# ===== PDV SETTINGS =====
@router.get("/pdv-settings")
async def get_pdv_settings(request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    settings = await db.pdv_settings.find_one({"tenant_id": tid})
    if settings:
        return serialize_doc(settings)
    return {"tenant_id": tid, "mode": "varejo", "allow_discount": True, "require_client": False, "auto_print": False, "terminals": []}


@router.put("/pdv-settings")
async def update_pdv_settings(data: dict, request: Request):
    from server import db, require_roles
    tid, user = await get_tenant_id(request)
    require_roles("admin", "super_admin")(user)
    data["tenant_id"] = tid
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.pdv_settings.update_one({"tenant_id": tid}, {"$set": data}, upsert=True)
    return data


# ===== SUPPORT =====
@router.get("/support")
async def tenant_support_tickets(request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    tickets = await db.support_tickets.find({"tenant_id": tid}).sort("created_at", -1).to_list(50)
    return serialize_list(tickets)


@router.post("/support")
async def create_support_ticket(data: dict, request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    data["tenant_id"] = tid
    data["status"] = "open"
    data["user_name"] = user.get("name")
    data["user_email"] = user.get("email")
    data["messages"] = [{"from": "client", "message": data.get("description", ""), "user": user.get("name"), "date": datetime.now(timezone.utc).isoformat()}]
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.support_tickets.insert_one(data)
    data["_id"] = str(result.inserted_id)
    data["id"] = data["_id"]
    return data


# ===== STOCK MOVEMENTS =====
@router.get("/stock-movements")
async def list_stock_movements(request: Request, type: Optional[str] = None, page: int = 1, limit: int = 50):
    from server import db
    tid, user = await get_tenant_id(request)
    query = {"tenant_id": tid}
    if type:
        query["type"] = type
    total = await db.stock_movements.count_documents(query)
    skip = (page - 1) * limit
    items = await db.stock_movements.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"data": serialize_list(items), "total": total, "page": page}


@router.post("/stock-movements")
async def create_stock_movement(data: dict, request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    data["tenant_id"] = tid
    data["user_name"] = user.get("name")
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    qty = float(data.get("quantity", 0))
    product_id = data.get("product_id")
    
    result = await db.stock_movements.insert_one(data)
    
    # Update product stock
    if product_id:
        try:
            inc = qty if data.get("type") == "entry" else -qty
            await db.products.update_one({"_id": ObjectId(product_id), "tenant_id": tid}, {"$inc": {"stock_quantity": inc}})
        except:
            pass
    
    data["_id"] = str(result.inserted_id)
    data["id"] = data["_id"]
    return data


# ===== CASHFLOW =====
@router.get("/cashflow")
async def get_cashflow(request: Request):
    from server import db
    tid, user = await get_tenant_id(request)
    
    entries = await db.financial.find({"tenant_id": tid}).to_list(1000)
    sales = await db.sales.find({"tenant_id": tid, "status": "completed"}).to_list(1000)
    
    monthly = {}
    for entry in entries:
        month = (entry.get("due_date") or entry.get("created_at", ""))[:7]
        if not month:
            continue
        if month not in monthly:
            monthly[month] = {"month": month, "income": 0, "expense": 0}
        if entry.get("type") == "receivable" and entry.get("status") == "paid":
            monthly[month]["income"] += entry.get("amount", 0)
        elif entry.get("type") == "payable" and entry.get("status") == "paid":
            monthly[month]["expense"] += entry.get("amount", 0)
    
    for sale in sales:
        month = (sale.get("created_at") or "")[:7]
        if not month:
            continue
        if month not in monthly:
            monthly[month] = {"month": month, "income": 0, "expense": 0}
        monthly[month]["income"] += sale.get("total", 0)
    
    flow = sorted(monthly.values(), key=lambda x: x["month"])
    for item in flow:
        item["balance"] = round(item["income"] - item["expense"], 2)
    return flow
