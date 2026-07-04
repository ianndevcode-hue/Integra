from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request, Query
from bson import ObjectId
from typing import Optional
import secrets

router = APIRouter(prefix="/api/admin", tags=["admin"])


def serialize_doc(doc):
    if doc is None:
        return None
    doc["_id"] = str(doc["_id"])
    if "id" not in doc:
        doc["id"] = doc["_id"]
    return doc


def serialize_list(docs):
    return [serialize_doc(d) for d in docs]


# ===== DASHBOARD =====
@router.get("/dashboard")
async def admin_dashboard(request: Request):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    
    total_tenants = await db.tenants.count_documents({})
    active_tenants = await db.tenants.count_documents({"is_active": True})
    total_users = await db.users.count_documents({})
    total_licenses = await db.licenses.count_documents({})
    active_licenses = await db.licenses.count_documents({"status": "active"})
    test_licenses = await db.licenses.count_documents({"status": "trial"})
    suspended_licenses = await db.licenses.count_documents({"status": {"$in": ["suspended", "blocked"]}})
    expired_licenses = await db.licenses.count_documents({"status": "expired"})
    total_plans = await db.plans.count_documents({})
    total_resellers = await db.resellers.count_documents({})
    open_tickets = await db.support_tickets.count_documents({"status": {"$in": ["open", "in_progress"]}})
    total_api_keys = await db.api_keys.count_documents({"is_active": True})
    
    # Expiring soon (next 30 days)
    thirty_days = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    expiring_soon = await db.licenses.count_documents({
        "status": "active",
        "expires_at": {"$lte": thirty_days}
    })
    
    # MRR calculation
    mrr_pipeline = [
        {"$match": {"status": "active"}},
        {"$lookup": {"from": "plans", "localField": "plan_id", "foreignField": "_id", "as": "plan_info"}},
    ]
    
    # Simple MRR based on active licenses count * avg plan price
    plans_list = await db.plans.find({"is_active": True}).to_list(50)
    avg_price = sum(p.get("price", 0) for p in plans_list) / max(len(plans_list), 1)
    mrr = active_licenses * avg_price
    
    recent_tenants = await db.tenants.find().sort("created_at", -1).limit(5).to_list(5)
    recent_logs = await db.audit_logs.find().sort("created_at", -1).limit(5).to_list(5)
    
    # New clients this month
    month_start = datetime.now(timezone.utc).replace(day=1).isoformat()
    new_clients = await db.tenants.count_documents({"created_at": {"$gte": month_start}})
    
    return {
        "total_tenants": total_tenants,
        "active_tenants": active_tenants,
        "total_users": total_users,
        "total_licenses": total_licenses,
        "active_licenses": active_licenses,
        "test_licenses": test_licenses,
        "suspended_licenses": suspended_licenses,
        "expired_licenses": expired_licenses,
        "expiring_soon": expiring_soon,
        "total_plans": total_plans,
        "total_resellers": total_resellers,
        "open_tickets": open_tickets,
        "total_api_keys": total_api_keys,
        "mrr": mrr,
        "new_clients": new_clients,
        "recent_tenants": serialize_list(recent_tenants),
        "recent_logs": serialize_list(recent_logs)
    }


# ===== TENANTS CRUD =====
@router.get("/tenants")
async def list_tenants(request: Request, status: Optional[str] = None, search: Optional[str] = None, page: int = 1, limit: int = 20):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    query = {}
    if status == "active":
        query["is_active"] = True
    elif status == "inactive":
        query["is_active"] = False
    if search:
        query["$or"] = [
            {"company_name": {"$regex": search, "$options": "i"}},
            {"cnpj": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    total = await db.tenants.count_documents(query)
    skip = (page - 1) * limit
    tenants = await db.tenants.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"data": serialize_list(tenants), "total": total, "page": page, "pages": (total + limit - 1) // limit}


@router.post("/tenants")
async def create_tenant(data: dict, request: Request):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    data["is_active"] = True
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.tenants.insert_one(data)
    data["_id"] = str(result.inserted_id)
    data["id"] = data["_id"]
    await db.audit_logs.insert_one({"action": f"Tenant criado: {data.get('company_name')}", "user_name": user.get("name"), "user_id": user.get("_id"), "entity": "tenant", "entity_id": data["_id"], "created_at": datetime.now(timezone.utc).isoformat()})
    return data


@router.get("/tenants/{tenant_id}")
async def get_tenant(tenant_id: str, request: Request):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    tenant = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    # Get related data
    license_data = await db.licenses.find({"tenant_id": tenant_id}).to_list(10)
    users_count = await db.users.count_documents({"tenant_id": tenant_id})
    tenant_data = serialize_doc(tenant)
    tenant_data["licenses"] = serialize_list(license_data)
    tenant_data["users_count"] = users_count
    return tenant_data


@router.put("/tenants/{tenant_id}")
async def update_tenant(tenant_id: str, data: dict, request: Request):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    data.pop("_id", None)
    data.pop("id", None)
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.tenants.update_one({"_id": ObjectId(tenant_id)}, {"$set": data})
    tenant = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    return serialize_doc(tenant)


@router.patch("/tenants/{tenant_id}/toggle")
async def toggle_tenant(tenant_id: str, request: Request):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    tenant = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    new_status = not tenant.get("is_active", True)
    await db.tenants.update_one({"_id": ObjectId(tenant_id)}, {"$set": {"is_active": new_status}})
    await db.audit_logs.insert_one({"action": f"Tenant {'ativado' if new_status else 'bloqueado'}: {tenant.get('company_name')}", "user_name": user.get("name"), "user_id": user.get("_id"), "entity": "tenant", "entity_id": tenant_id, "created_at": datetime.now(timezone.utc).isoformat()})
    return {"is_active": new_status}


# ===== LICENSES CRUD =====
@router.get("/licenses")
async def list_licenses(request: Request, status: Optional[str] = None, plan: Optional[str] = None, search: Optional[str] = None, page: int = 1, limit: int = 20):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    query = {}
    if status:
        query["status"] = status
    if plan:
        query["plan_name"] = plan
    if search:
        query["$or"] = [{"tenant_id": {"$regex": search, "$options": "i"}}, {"plan_name": {"$regex": search, "$options": "i"}}]
    total = await db.licenses.count_documents(query)
    skip = (page - 1) * limit
    licenses = await db.licenses.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    # Enrich with tenant info
    for lic in licenses:
        if lic.get("tenant_id"):
            try:
                tenant = await db.tenants.find_one({"_id": ObjectId(lic["tenant_id"])})
                lic["tenant_name"] = tenant.get("company_name", "N/A") if tenant else "N/A"
            except:
                lic["tenant_name"] = "N/A"
    return {"data": serialize_list(licenses), "total": total, "page": page, "pages": (total + limit - 1) // limit}


@router.post("/licenses")
async def create_license(data: dict, request: Request):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    data["status"] = data.get("status", "active")
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    data["history"] = [{"action": "created", "user": user.get("name"), "date": datetime.now(timezone.utc).isoformat()}]
    if not data.get("expires_at"):
        data["expires_at"] = (datetime.now(timezone.utc) + timedelta(days=365)).isoformat()
    result = await db.licenses.insert_one(data)
    data["_id"] = str(result.inserted_id)
    data["id"] = data["_id"]
    return data


@router.get("/licenses/{license_id}")
async def get_license(license_id: str, request: Request):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    lic = await db.licenses.find_one({"_id": ObjectId(license_id)})
    if not lic:
        raise HTTPException(status_code=404, detail="License not found")
    if lic.get("tenant_id"):
        try:
            tenant = await db.tenants.find_one({"_id": ObjectId(lic["tenant_id"])})
            lic["tenant_name"] = tenant.get("company_name") if tenant else "N/A"
        except:
            lic["tenant_name"] = "N/A"
    return serialize_doc(lic)


@router.put("/licenses/{license_id}")
async def update_license(license_id: str, data: dict, request: Request):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    data.pop("_id", None)
    data.pop("id", None)
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.licenses.update_one({"_id": ObjectId(license_id)}, {
        "$set": data,
        "$push": {"history": {"action": "updated", "user": user.get("name"), "changes": list(data.keys()), "date": datetime.now(timezone.utc).isoformat()}}
    })
    lic = await db.licenses.find_one({"_id": ObjectId(license_id)})
    return serialize_doc(lic)


@router.patch("/licenses/{license_id}/status")
async def change_license_status(license_id: str, data: dict, request: Request):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    new_status = data.get("status")
    if new_status not in ["active", "trial", "pending", "suspended", "blocked", "expired", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    await db.licenses.update_one({"_id": ObjectId(license_id)}, {
        "$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()},
        "$push": {"history": {"action": f"status_changed_to_{new_status}", "user": user.get("name"), "date": datetime.now(timezone.utc).isoformat()}}
    })
    lic = await db.licenses.find_one({"_id": ObjectId(license_id)})
    await db.audit_logs.insert_one({"action": f"Licença {new_status}: {license_id}", "user_name": user.get("name"), "entity": "license", "entity_id": license_id, "created_at": datetime.now(timezone.utc).isoformat()})
    return serialize_doc(lic)


@router.patch("/licenses/{license_id}/renew")
async def renew_license(license_id: str, data: dict, request: Request):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    days = data.get("days", 365)
    lic = await db.licenses.find_one({"_id": ObjectId(license_id)})
    if not lic:
        raise HTTPException(status_code=404, detail="License not found")
    new_expiry = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
    await db.licenses.update_one({"_id": ObjectId(license_id)}, {
        "$set": {"expires_at": new_expiry, "status": "active", "updated_at": datetime.now(timezone.utc).isoformat()},
        "$push": {"history": {"action": "renewed", "days": days, "user": user.get("name"), "date": datetime.now(timezone.utc).isoformat()}}
    })
    return {"message": "License renewed", "expires_at": new_expiry}


# ===== PLANS CRUD =====
@router.get("/plans")
async def list_plans(request: Request):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    plans = await db.plans.find().to_list(50)
    return serialize_list(plans)


@router.post("/plans")
async def create_plan(data: dict, request: Request):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    data["is_active"] = True
    result = await db.plans.insert_one(data)
    data["_id"] = str(result.inserted_id)
    data["id"] = data["_id"]
    return data


@router.put("/plans/{plan_id}")
async def update_plan(plan_id: str, data: dict, request: Request):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    data.pop("_id", None)
    data.pop("id", None)
    await db.plans.update_one({"_id": ObjectId(plan_id)}, {"$set": data})
    plan = await db.plans.find_one({"_id": ObjectId(plan_id)})
    return serialize_doc(plan)


# ===== MODULES =====
@router.get("/modules")
async def list_modules(request: Request):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    modules = await db.modules.find().to_list(50)
    if not modules:
        # Return default modules
        return [
            {"id": "products", "name": "Produtos", "description": "Cadastro e gestão de produtos", "is_active": True},
            {"id": "services", "name": "Serviços", "description": "Cadastro e gestão de serviços", "is_active": True},
            {"id": "clients", "name": "Clientes", "description": "Cadastro de clientes", "is_active": True},
            {"id": "suppliers", "name": "Fornecedores", "description": "Cadastro de fornecedores", "is_active": True},
            {"id": "sales", "name": "Vendas", "description": "Módulo de vendas", "is_active": True},
            {"id": "financial", "name": "Financeiro", "description": "Contas a pagar e receber", "is_active": True},
            {"id": "inventory", "name": "Estoque", "description": "Controle de estoque", "is_active": True},
            {"id": "fiscal", "name": "Fiscal", "description": "NF-e, NFC-e e NFS-e", "is_active": True},
            {"id": "pdv", "name": "PDV", "description": "Ponto de venda", "is_active": True},
            {"id": "reports", "name": "Relatórios", "description": "Relatórios gerenciais", "is_active": True},
            {"id": "real_estate", "name": "Imóveis", "description": "Gestão de imóveis", "is_active": True},
            {"id": "vehicles", "name": "Veículos", "description": "Gestão de veículos", "is_active": True},
            {"id": "support", "name": "Suporte", "description": "Sistema de suporte", "is_active": True},
            {"id": "api", "name": "API", "description": "Acesso à API", "is_active": True},
        ]
    return serialize_list(modules)


@router.post("/modules")
async def create_module(data: dict, request: Request):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.modules.insert_one(data)
    data["_id"] = str(result.inserted_id)
    return data


# ===== RESELLERS =====
@router.get("/resellers")
async def list_resellers(request: Request, page: int = 1, limit: int = 20):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    total = await db.resellers.count_documents({})
    skip = (page - 1) * limit
    resellers = await db.resellers.find().sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"data": serialize_list(resellers), "total": total, "page": page}


@router.post("/resellers")
async def create_reseller(data: dict, request: Request):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    data["is_active"] = True
    data["total_clients"] = 0
    data["total_commission"] = 0
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.resellers.insert_one(data)
    data["_id"] = str(result.inserted_id)
    data["id"] = data["_id"]
    return data


@router.put("/resellers/{reseller_id}")
async def update_reseller(reseller_id: str, data: dict, request: Request):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    data.pop("_id", None)
    data.pop("id", None)
    await db.resellers.update_one({"_id": ObjectId(reseller_id)}, {"$set": data})
    reseller = await db.resellers.find_one({"_id": ObjectId(reseller_id)})
    return serialize_doc(reseller)


# ===== API KEYS =====
@router.get("/api-keys")
async def list_api_keys(request: Request):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    keys = await db.api_keys.find().sort("created_at", -1).to_list(100)
    return serialize_list(keys)


@router.post("/api-keys")
async def create_api_key(data: dict, request: Request):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    key = f"ik_{secrets.token_hex(32)}"
    data["key"] = key
    data["key_preview"] = key[:12] + "..." + key[-4:]
    data["is_active"] = True
    data["usage_count"] = 0
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    data["created_by"] = user.get("name")
    result = await db.api_keys.insert_one(data)
    data["_id"] = str(result.inserted_id)
    data["id"] = data["_id"]
    return data


@router.patch("/api-keys/{key_id}/revoke")
async def revoke_api_key(key_id: str, request: Request):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    await db.api_keys.update_one({"_id": ObjectId(key_id)}, {"$set": {"is_active": False, "revoked_at": datetime.now(timezone.utc).isoformat(), "revoked_by": user.get("name")}})
    return {"message": "API Key revoked"}


# ===== WEBHOOKS =====
@router.get("/webhooks")
async def list_webhooks(request: Request):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    webhooks = await db.webhooks.find().sort("created_at", -1).to_list(100)
    return serialize_list(webhooks)


@router.post("/webhooks")
async def create_webhook(data: dict, request: Request):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    data["is_active"] = True
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    data["secret"] = secrets.token_hex(16)
    result = await db.webhooks.insert_one(data)
    data["_id"] = str(result.inserted_id)
    return data


@router.delete("/webhooks/{webhook_id}")
async def delete_webhook(webhook_id: str, request: Request):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    await db.webhooks.delete_one({"_id": ObjectId(webhook_id)})
    return {"message": "Webhook deleted"}


# ===== AUDIT LOGS =====
@router.get("/logs")
async def list_audit_logs(request: Request, page: int = 1, limit: int = 50):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    total = await db.audit_logs.count_documents({})
    skip = (page - 1) * limit
    logs = await db.audit_logs.find().sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"data": serialize_list(logs), "total": total, "page": page}


# ===== SUPPORT TICKETS =====
@router.get("/support")
async def list_support_tickets(request: Request, status: Optional[str] = None, page: int = 1, limit: int = 20):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    query = {}
    if status:
        query["status"] = status
    total = await db.support_tickets.count_documents(query)
    skip = (page - 1) * limit
    tickets = await db.support_tickets.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"data": serialize_list(tickets), "total": total, "page": page}


@router.patch("/support/{ticket_id}")
async def update_ticket(ticket_id: str, data: dict, request: Request):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    data.pop("_id", None)
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    if data.get("response"):
        await db.support_tickets.update_one({"_id": ObjectId(ticket_id)}, {
            "$set": data,
            "$push": {"messages": {"from": "admin", "message": data["response"], "user": user.get("name"), "date": datetime.now(timezone.utc).isoformat()}}
        })
    else:
        await db.support_tickets.update_one({"_id": ObjectId(ticket_id)}, {"$set": data})
    ticket = await db.support_tickets.find_one({"_id": ObjectId(ticket_id)})
    return serialize_doc(ticket)


# ===== ADMIN USERS =====
@router.get("/users")
async def admin_list_users(request: Request, search: Optional[str] = None, role: Optional[str] = None, page: int = 1, limit: int = 20):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    query = {}
    if search:
        query["$or"] = [{"name": {"$regex": search, "$options": "i"}}, {"email": {"$regex": search, "$options": "i"}}]
    if role:
        query["role"] = role
    total = await db.users.count_documents(query)
    skip = (page - 1) * limit
    users = await db.users.find(query, {"password_hash": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"data": serialize_list(users), "total": total, "page": page}


# ===== ADMIN SETTINGS =====
@router.get("/settings")
async def get_admin_settings(request: Request):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    settings = await db.admin_settings.find_one({"type": "global"})
    if settings:
        return serialize_doc(settings)
    return {"type": "global", "company_name": "Integra Code", "email": "contato@integracode.com", "fiscal_default_env": "homologation"}


@router.put("/settings")
async def update_admin_settings(data: dict, request: Request):
    from server import db, get_user, require_roles
    user = await get_user(request)
    require_roles("super_admin")(user)
    data["type"] = "global"
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.admin_settings.update_one({"type": "global"}, {"$set": data}, upsert=True)
    return data
