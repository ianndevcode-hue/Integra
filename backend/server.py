from dotenv import load_dotenv
load_dotenv()

import os
import secrets
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, HTTPException, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from contextlib import asynccontextmanager

from auth import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    set_auth_cookies, get_current_user, check_brute_force, record_failed_attempt,
    clear_failed_attempts, require_roles
)
from models import (
    UserCreate, UserLogin, TenantCreate, LicenseCreate, PlanCreate,
    ProductCreate, ClientCreate, SupplierCreate, SaleCreate, SaleItemCreate,
    CashRegisterOpen, CashRegisterClose, CashMovement, FinancialEntryCreate,
    PDVSyncPayload
)

# ===== DATABASE =====
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "integra_sys")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


# ===== SEED =====
async def seed_data():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@integracode.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Integra@2024")

    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.products.create_index([("tenant_id", 1), ("sku", 1)])
    await db.clients.create_index([("tenant_id", 1)])
    await db.sales.create_index([("tenant_id", 1), ("created_at", -1)])
    await db.cash_registers.create_index([("tenant_id", 1), ("status", 1)])

    # Seed super admin
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin Integra Code",
            "role": "super_admin",
            "tenant_id": None,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    # Seed plans
    plans_count = await db.plans.count_documents({})
    if plans_count == 0:
        plans = [
            {"name": "Starter", "description": "Plano inicial para pequenos negócios", "price": 99.90, "modules": ["products", "clients", "sales", "financial"], "max_users": 3, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Professional", "description": "Plano completo para empresas em crescimento", "price": 199.90, "modules": ["products", "clients", "sales", "financial", "inventory", "suppliers", "reports", "fiscal"], "max_users": 10, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Enterprise", "description": "Plano empresarial com todos os módulos", "price": 399.90, "modules": ["products", "clients", "sales", "financial", "inventory", "suppliers", "reports", "fiscal", "pdv", "api", "support"], "max_users": 50, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.plans.insert_many(plans)

    # Seed demo tenant
    demo_tenant = await db.tenants.find_one({"cnpj": "12.345.678/0001-90"})
    if demo_tenant is None:
        plans_list = await db.plans.find({"name": "Enterprise"}).to_list(1)
        enterprise_plan = plans_list[0] if plans_list else None
        
        tenant_result = await db.tenants.insert_one({
            "company_name": "Empresa Demo Ltda",
            "cnpj": "12.345.678/0001-90",
            "email": "contato@empresademo.com.br",
            "phone": "(11) 99999-9999",
            "address": {
                "street": "Rua das Inovações",
                "number": "1000",
                "neighborhood": "Centro",
                "city": "São Paulo",
                "state": "SP",
                "zip": "01001-000"
            },
            "plan_id": str(enterprise_plan["_id"]) if enterprise_plan else None,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        tenant_id = str(tenant_result.inserted_id)

        # Seed license
        if enterprise_plan:
            await db.licenses.insert_one({
                "tenant_id": tenant_id,
                "plan_id": str(enterprise_plan["_id"]),
                "plan_name": enterprise_plan["name"],
                "modules": enterprise_plan["modules"],
                "max_users": enterprise_plan["max_users"],
                "status": "active",
                "starts_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            })

        # Seed tenant admin user
        tenant_admin_email = "admin@empresademo.com.br"
        tenant_admin_password = "Demo@2024"
        existing_ta = await db.users.find_one({"email": tenant_admin_email})
        if existing_ta is None:
            await db.users.insert_one({
                "email": tenant_admin_email,
                "password_hash": hash_password(tenant_admin_password),
                "name": "Administrador Demo",
                "role": "admin",
                "tenant_id": tenant_id,
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            })

        # Seed manager user
        manager_email = "gerente@empresademo.com.br"
        existing_mgr = await db.users.find_one({"email": manager_email})
        if existing_mgr is None:
            await db.users.insert_one({
                "email": manager_email,
                "password_hash": hash_password("Demo@2024"),
                "name": "Carlos Gerente",
                "role": "manager",
                "tenant_id": tenant_id,
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            })

        # Seed cashier user
        cashier_email = "caixa@empresademo.com.br"
        existing_csh = await db.users.find_one({"email": cashier_email})
        if existing_csh is None:
            await db.users.insert_one({
                "email": cashier_email,
                "password_hash": hash_password("Demo@2024"),
                "name": "Ana Caixa",
                "role": "cashier",
                "tenant_id": tenant_id,
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            })

        # Seed products
        products = [
            {"name": "Notebook Dell Inspiron 15", "sku": "NB-DELL-001", "barcode": "7891234567890", "category": "Informática", "unit": "UN", "cost_price": 3200.00, "sale_price": 4599.90, "stock_quantity": 25, "min_stock": 5, "ncm": "8471.30.19", "cfop": "5102", "tenant_id": tenant_id, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Mouse Logitech MX Master 3", "sku": "MS-LOG-001", "barcode": "7891234567891", "category": "Periféricos", "unit": "UN", "cost_price": 350.00, "sale_price": 549.90, "stock_quantity": 80, "min_stock": 15, "ncm": "8471.60.53", "cfop": "5102", "tenant_id": tenant_id, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Teclado Mecânico HyperX Alloy", "sku": "TC-HYP-001", "barcode": "7891234567892", "category": "Periféricos", "unit": "UN", "cost_price": 280.00, "sale_price": 449.90, "stock_quantity": 45, "min_stock": 10, "ncm": "8471.60.52", "cfop": "5102", "tenant_id": tenant_id, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Monitor Samsung 27\" 4K", "sku": "MN-SAM-001", "barcode": "7891234567893", "category": "Monitores", "unit": "UN", "cost_price": 1800.00, "sale_price": 2799.90, "stock_quantity": 15, "min_stock": 3, "ncm": "8528.52.20", "cfop": "5102", "tenant_id": tenant_id, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Webcam Logitech C920", "sku": "WC-LOG-001", "barcode": "7891234567894", "category": "Periféricos", "unit": "UN", "cost_price": 250.00, "sale_price": 399.90, "stock_quantity": 60, "min_stock": 10, "ncm": "8525.80.19", "cfop": "5102", "tenant_id": tenant_id, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Headset Gamer JBL Quantum", "sku": "HS-JBL-001", "barcode": "7891234567895", "category": "Áudio", "unit": "UN", "cost_price": 180.00, "sale_price": 299.90, "stock_quantity": 40, "min_stock": 8, "ncm": "8518.30.00", "cfop": "5102", "tenant_id": tenant_id, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "SSD Kingston 1TB NVMe", "sku": "HD-KNG-001", "barcode": "7891234567896", "category": "Armazenamento", "unit": "UN", "cost_price": 320.00, "sale_price": 499.90, "stock_quantity": 55, "min_stock": 10, "ncm": "8471.70.12", "cfop": "5102", "tenant_id": tenant_id, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Memória RAM Corsair 16GB DDR5", "sku": "MM-CRS-001", "barcode": "7891234567897", "category": "Componentes", "unit": "UN", "cost_price": 290.00, "sale_price": 449.90, "stock_quantity": 35, "min_stock": 8, "ncm": "8473.30.49", "cfop": "5102", "tenant_id": tenant_id, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Cabo HDMI 2.1 2m", "sku": "CB-HDM-001", "barcode": "7891234567898", "category": "Cabos", "unit": "UN", "cost_price": 25.00, "sale_price": 49.90, "stock_quantity": 200, "min_stock": 30, "ncm": "8544.42.00", "cfop": "5102", "tenant_id": tenant_id, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Impressora HP LaserJet Pro", "sku": "IM-HP-001", "barcode": "7891234567899", "category": "Impressoras", "unit": "UN", "cost_price": 1200.00, "sale_price": 1899.90, "stock_quantity": 10, "min_stock": 2, "ncm": "8443.32.39", "cfop": "5102", "tenant_id": tenant_id, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.products.insert_many(products)

        # Seed clients
        clients_data = [
            {"name": "João Silva", "document": "123.456.789-00", "document_type": "CPF", "email": "joao@email.com", "phone": "(11) 91111-1111", "tenant_id": tenant_id, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Maria Oliveira", "document": "987.654.321-00", "document_type": "CPF", "email": "maria@email.com", "phone": "(11) 92222-2222", "tenant_id": tenant_id, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Tech Solutions Ltda", "document": "11.222.333/0001-44", "document_type": "CNPJ", "email": "contato@techsolutions.com", "phone": "(11) 93333-3333", "tenant_id": tenant_id, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Pedro Santos", "document": "111.222.333-44", "document_type": "CPF", "email": "pedro@email.com", "phone": "(11) 94444-4444", "tenant_id": tenant_id, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Digital Corp S.A.", "document": "55.666.777/0001-88", "document_type": "CNPJ", "email": "compras@digitalcorp.com", "phone": "(11) 95555-5555", "tenant_id": tenant_id, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.clients.insert_many(clients_data)

        # Seed suppliers
        suppliers_data = [
            {"name": "Distribuidora Tech BR", "cnpj": "99.888.777/0001-66", "email": "vendas@techbr.com", "phone": "(11) 3333-3333", "tenant_id": tenant_id, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Importadora Global IT", "cnpj": "88.777.666/0001-55", "email": "compras@globalit.com", "phone": "(11) 4444-4444", "tenant_id": tenant_id, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "MegaStore Informática", "cnpj": "77.666.555/0001-44", "email": "atacado@megastore.com", "phone": "(11) 5555-5555", "tenant_id": tenant_id, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.suppliers.insert_many(suppliers_data)

        # Seed some sales for dashboard
        products_list = await db.products.find({"tenant_id": tenant_id}).to_list(10)
        for i in range(15):
            days_ago = 30 - (i * 2)
            sale_date = (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat()
            prod = products_list[i % len(products_list)]
            qty = (i % 5) + 1
            total = prod["sale_price"] * qty
            await db.sales.insert_one({
                "tenant_id": tenant_id,
                "sale_number": f"V-{1000 + i}",
                "client_name": clients_data[i % len(clients_data)]["name"],
                "items": [{"product_id": str(prod["_id"]) if "_id" in prod else "", "product_name": prod["name"], "quantity": qty, "unit_price": prod["sale_price"], "discount": 0}],
                "subtotal": total,
                "discount": 0,
                "total": total,
                "payment_method": ["dinheiro", "cartao_credito", "cartao_debito", "pix"][i % 4],
                "status": "completed",
                "fiscal_status": "emitida" if i % 3 == 0 else "pendente",
                "user_id": None,
                "user_name": "Administrador Demo",
                "created_at": sale_date
            })

        # Seed financial entries
        for i in range(10):
            days = (i * 3) + 1
            await db.financial.insert_one({
                "tenant_id": tenant_id,
                "type": "receivable" if i % 2 == 0 else "payable",
                "description": f"{'Venda #' + str(1000+i) if i%2==0 else 'Fornecedor ' + suppliers_data[i%3]['name']}",
                "amount": round(500 + (i * 150.50), 2),
                "due_date": (datetime.now(timezone.utc) + timedelta(days=days)).isoformat(),
                "category": "vendas" if i % 2 == 0 else "compras",
                "status": "pending" if i > 3 else "paid",
                "paid_at": datetime.now(timezone.utc).isoformat() if i <= 3 else None,
                "created_at": datetime.now(timezone.utc).isoformat()
            })

    # Write test credentials
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# Integra SYS - Test Credentials\n\n")
        f.write("## Super Admin (Admin Master)\n")
        f.write(f"- Email: {admin_email}\n")
        f.write(f"- Password: {admin_password}\n")
        f.write("- Role: super_admin\n")
        f.write("- Access: /admin\n\n")
        f.write("## Tenant Admin (Web SaaS)\n")
        f.write("- Email: admin@empresademo.com.br\n")
        f.write("- Password: Demo@2024\n")
        f.write("- Role: admin\n")
        f.write("- Access: /app\n\n")
        f.write("## Manager (Web SaaS)\n")
        f.write("- Email: gerente@empresademo.com.br\n")
        f.write("- Password: Demo@2024\n")
        f.write("- Role: manager\n\n")
        f.write("## Cashier (PDV)\n")
        f.write("- Email: caixa@empresademo.com.br\n")
        f.write("- Password: Demo@2024\n")
        f.write("- Role: cashier\n")
        f.write("- Access: /pdv\n\n")
        f.write("## Auth Endpoints\n")
        f.write("- POST /api/auth/login\n")
        f.write("- POST /api/auth/register\n")
        f.write("- POST /api/auth/logout\n")
        f.write("- GET /api/auth/me\n")
        f.write("- POST /api/auth/refresh\n")


# ===== LIFESPAN =====
@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed_data()
    yield
    client.close()


# ===== APP =====
app = FastAPI(title="Integra SYS API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.environ.get("FRONTEND_URL", "http://localhost:3000"),
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===== HELPERS =====
def serialize_doc(doc):
    if doc is None:
        return None
    doc["_id"] = str(doc["_id"])
    if "id" not in doc:
        doc["id"] = doc["_id"]
    return doc


def serialize_list(docs):
    return [serialize_doc(d) for d in docs]


async def get_user(request: Request):
    return await get_current_user(request, db)


# ===== AUTH ROUTES =====
@app.post("/api/auth/login")
async def login(data: UserLogin, request: Request, response: Response):
    email = data.email.lower().strip()
    ip = request.client.host if request.client else "unknown"
    await check_brute_force(db, ip, email)
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        await record_failed_attempt(db, ip, email)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account deactivated")
    await clear_failed_attempts(db, ip, email)
    access = create_access_token(str(user["_id"]), user["email"], user.get("role", "user"), user.get("tenant_id"))
    refresh = create_refresh_token(str(user["_id"]))
    set_auth_cookies(response, access, refresh)
    return {"id": str(user["_id"]), "email": user["email"], "name": user["name"], "role": user.get("role", "user"), "tenant_id": user.get("tenant_id"), "token": access}


@app.post("/api/auth/register")
async def register(data: UserCreate, response: Response):
    email = data.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_doc = {
        "email": email,
        "password_hash": hash_password(data.password),
        "name": data.name,
        "role": data.role,
        "tenant_id": data.tenant_id,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    access = create_access_token(user_id, email, data.role, data.tenant_id)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return {"id": user_id, "email": email, "name": data.name, "role": data.role, "tenant_id": data.tenant_id, "token": access}


@app.get("/api/auth/me")
async def get_me(request: Request):
    user = await get_user(request)
    return user


@app.post("/api/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}


@app.post("/api/auth/refresh")
async def refresh_token(request: Request, response: Response):
    import jwt as pyjwt
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = pyjwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(str(user["_id"]), user["email"], user.get("role"), user.get("tenant_id"))
        response.set_cookie(key="access_token", value=access, httponly=True, secure=False, samesite="lax", max_age=28800, path="/")
        return {"message": "Token refreshed"}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


# ===== ADMIN MASTER ROUTES =====

# Dashboard
@app.get("/api/admin/dashboard")
async def admin_dashboard(request: Request):
    user = await get_user(request)
    require_roles("super_admin")(user)
    total_tenants = await db.tenants.count_documents({})
    active_tenants = await db.tenants.count_documents({"is_active": True})
    total_users = await db.users.count_documents({})
    total_licenses = await db.licenses.count_documents({})
    active_licenses = await db.licenses.count_documents({"status": "active"})
    total_plans = await db.plans.count_documents({})
    # Revenue from plans
    revenue_pipeline = [{"$match": {"status": "active"}}, {"$group": {"_id": None, "total": {"$sum": "$price"}}}]
    # Recent tenants
    recent_tenants = await db.tenants.find().sort("created_at", -1).limit(5).to_list(5)
    return {
        "total_tenants": total_tenants,
        "active_tenants": active_tenants,
        "total_users": total_users,
        "total_licenses": total_licenses,
        "active_licenses": active_licenses,
        "total_plans": total_plans,
        "mrr": active_licenses * 199.90,
        "recent_tenants": serialize_list(recent_tenants)
    }


# Tenants CRUD
@app.get("/api/admin/tenants")
async def list_tenants(request: Request):
    user = await get_user(request)
    require_roles("super_admin")(user)
    tenants = await db.tenants.find().sort("created_at", -1).to_list(100)
    return serialize_list(tenants)


@app.post("/api/admin/tenants")
async def create_tenant(data: TenantCreate, request: Request):
    user = await get_user(request)
    require_roles("super_admin")(user)
    doc = data.model_dump()
    doc["is_active"] = True
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.tenants.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc["id"] = doc["_id"]
    return doc


@app.get("/api/admin/tenants/{tenant_id}")
async def get_tenant(tenant_id: str, request: Request):
    user = await get_user(request)
    require_roles("super_admin")(user)
    tenant = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return serialize_doc(tenant)


@app.put("/api/admin/tenants/{tenant_id}")
async def update_tenant(tenant_id: str, data: dict, request: Request):
    user = await get_user(request)
    require_roles("super_admin")(user)
    data.pop("_id", None)
    data.pop("id", None)
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.tenants.update_one({"_id": ObjectId(tenant_id)}, {"$set": data})
    tenant = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    return serialize_doc(tenant)


@app.patch("/api/admin/tenants/{tenant_id}/toggle")
async def toggle_tenant(tenant_id: str, request: Request):
    user = await get_user(request)
    require_roles("super_admin")(user)
    tenant = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    new_status = not tenant.get("is_active", True)
    await db.tenants.update_one({"_id": ObjectId(tenant_id)}, {"$set": {"is_active": new_status}})
    return {"is_active": new_status}


# Plans CRUD
@app.get("/api/admin/plans")
async def list_plans(request: Request):
    user = await get_user(request)
    require_roles("super_admin")(user)
    plans = await db.plans.find().to_list(50)
    return serialize_list(plans)


@app.post("/api/admin/plans")
async def create_plan(data: PlanCreate, request: Request):
    user = await get_user(request)
    require_roles("super_admin")(user)
    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.plans.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc["id"] = doc["_id"]
    return doc


# Licenses CRUD
@app.get("/api/admin/licenses")
async def list_licenses(request: Request):
    user = await get_user(request)
    require_roles("super_admin")(user)
    licenses = await db.licenses.find().sort("created_at", -1).to_list(100)
    return serialize_list(licenses)


@app.post("/api/admin/licenses")
async def create_license(data: LicenseCreate, request: Request):
    user = await get_user(request)
    require_roles("super_admin")(user)
    doc = data.model_dump()
    doc["status"] = "active"
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    if not doc.get("expires_at"):
        doc["expires_at"] = (datetime.now(timezone.utc) + timedelta(days=365)).isoformat()
    result = await db.licenses.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc["id"] = doc["_id"]
    return doc


# Admin Users
@app.get("/api/admin/users")
async def admin_list_users(request: Request):
    user = await get_user(request)
    require_roles("super_admin")(user)
    users = await db.users.find({}, {"password_hash": 0}).sort("created_at", -1).to_list(200)
    return serialize_list(users)


# Audit Logs
@app.get("/api/admin/logs")
async def list_audit_logs(request: Request):
    user = await get_user(request)
    require_roles("super_admin")(user)
    logs = await db.audit_logs.find().sort("created_at", -1).limit(100).to_list(100)
    return serialize_list(logs)


# ===== WEB SAAS ROUTES =====

# Dashboard
@app.get("/api/saas/dashboard")
async def saas_dashboard(request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=403, detail="No tenant assigned")
    
    total_products = await db.products.count_documents({"tenant_id": tenant_id})
    total_clients = await db.clients.count_documents({"tenant_id": tenant_id})
    total_suppliers = await db.suppliers.count_documents({"tenant_id": tenant_id})
    total_sales = await db.sales.count_documents({"tenant_id": tenant_id})
    
    # Sales totals
    sales_pipeline = [
        {"$match": {"tenant_id": tenant_id, "status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}, "count": {"$sum": 1}}}
    ]
    sales_agg = await db.sales.aggregate(sales_pipeline).to_list(1)
    total_revenue = sales_agg[0]["total"] if sales_agg else 0
    
    # Financial summary
    receivable = await db.financial.aggregate([
        {"$match": {"tenant_id": tenant_id, "type": "receivable", "status": "pending"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    payable = await db.financial.aggregate([
        {"$match": {"tenant_id": tenant_id, "type": "payable", "status": "pending"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    
    # Recent sales
    recent_sales = await db.sales.find({"tenant_id": tenant_id}).sort("created_at", -1).limit(5).to_list(5)
    
    # Low stock alerts
    low_stock = await db.products.find({
        "tenant_id": tenant_id,
        "$expr": {"$lte": ["$stock_quantity", "$min_stock"]}
    }).limit(5).to_list(5)
    
    # Sales by day (last 30 days)
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    daily_sales = await db.sales.aggregate([
        {"$match": {"tenant_id": tenant_id, "created_at": {"$gte": thirty_days_ago}}},
        {"$addFields": {"date": {"$substr": ["$created_at", 0, 10]}}},
        {"$group": {"_id": "$date", "total": {"$sum": "$total"}, "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]).to_list(31)
    
    # Sales by payment method
    by_payment = await db.sales.aggregate([
        {"$match": {"tenant_id": tenant_id, "status": "completed"}},
        {"$group": {"_id": "$payment_method", "total": {"$sum": "$total"}, "count": {"$sum": 1}}}
    ]).to_list(10)
    
    return {
        "total_products": total_products,
        "total_clients": total_clients,
        "total_suppliers": total_suppliers,
        "total_sales": total_sales,
        "total_revenue": total_revenue,
        "receivable": receivable[0]["total"] if receivable else 0,
        "payable": payable[0]["total"] if payable else 0,
        "recent_sales": serialize_list(recent_sales),
        "low_stock": serialize_list(low_stock),
        "daily_sales": [{"date": d["_id"], "total": d["total"], "count": d["count"]} for d in daily_sales],
        "sales_by_payment": [{"method": d["_id"], "total": d["total"], "count": d["count"]} for d in by_payment]
    }


# Products CRUD
@app.get("/api/saas/products")
async def list_products(request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    products = await db.products.find({"tenant_id": tenant_id}).sort("name", 1).to_list(500)
    return serialize_list(products)


@app.post("/api/saas/products")
async def create_product(data: ProductCreate, request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    doc = data.model_dump()
    doc["tenant_id"] = tenant_id
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.products.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc["id"] = doc["_id"]
    return doc


@app.put("/api/saas/products/{product_id}")
async def update_product(product_id: str, data: dict, request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    data.pop("_id", None)
    data.pop("id", None)
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.products.update_one({"_id": ObjectId(product_id), "tenant_id": tenant_id}, {"$set": data})
    product = await db.products.find_one({"_id": ObjectId(product_id)})
    return serialize_doc(product)


@app.delete("/api/saas/products/{product_id}")
async def delete_product(product_id: str, request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    await db.products.delete_one({"_id": ObjectId(product_id), "tenant_id": tenant_id})
    return {"message": "Product deleted"}


# Clients CRUD
@app.get("/api/saas/clients")
async def list_clients(request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    clients = await db.clients.find({"tenant_id": tenant_id}).sort("name", 1).to_list(500)
    return serialize_list(clients)


@app.post("/api/saas/clients")
async def create_client(data: ClientCreate, request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    doc = data.model_dump()
    doc["tenant_id"] = tenant_id
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.clients.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc["id"] = doc["_id"]
    return doc


@app.put("/api/saas/clients/{client_id}")
async def update_client(client_id: str, data: dict, request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    data.pop("_id", None)
    data.pop("id", None)
    await db.clients.update_one({"_id": ObjectId(client_id), "tenant_id": tenant_id}, {"$set": data})
    client = await db.clients.find_one({"_id": ObjectId(client_id)})
    return serialize_doc(client)


@app.delete("/api/saas/clients/{client_id}")
async def delete_client(client_id: str, request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    await db.clients.delete_one({"_id": ObjectId(client_id), "tenant_id": tenant_id})
    return {"message": "Client deleted"}


# Suppliers CRUD
@app.get("/api/saas/suppliers")
async def list_suppliers(request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    suppliers = await db.suppliers.find({"tenant_id": tenant_id}).sort("name", 1).to_list(500)
    return serialize_list(suppliers)


@app.post("/api/saas/suppliers")
async def create_supplier(data: SupplierCreate, request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    doc = data.model_dump()
    doc["tenant_id"] = tenant_id
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.suppliers.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc["id"] = doc["_id"]
    return doc


@app.delete("/api/saas/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: str, request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    await db.suppliers.delete_one({"_id": ObjectId(supplier_id), "tenant_id": tenant_id})
    return {"message": "Supplier deleted"}


# Sales
@app.get("/api/saas/sales")
async def list_sales(request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    sales = await db.sales.find({"tenant_id": tenant_id}).sort("created_at", -1).to_list(500)
    return serialize_list(sales)


@app.post("/api/saas/sales")
async def create_sale(data: SaleCreate, request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    items_list = [item.model_dump() for item in data.items]
    subtotal = sum(i["quantity"] * i["unit_price"] - i["discount"] for i in items_list)
    total = subtotal - data.discount
    
    # Get next sale number
    last_sale = await db.sales.find({"tenant_id": tenant_id}).sort("created_at", -1).limit(1).to_list(1)
    sale_num = 1001
    if last_sale:
        try:
            sale_num = int(last_sale[0].get("sale_number", "V-1000").split("-")[1]) + 1
        except (ValueError, IndexError):
            sale_num = 1001
    
    doc = {
        "tenant_id": tenant_id,
        "sale_number": f"V-{sale_num}",
        "client_id": data.client_id,
        "client_name": data.client_name,
        "items": items_list,
        "subtotal": subtotal,
        "discount": data.discount,
        "total": total,
        "payment_method": data.payment_method,
        "status": "completed",
        "fiscal_status": "pendente",
        "user_id": user.get("_id"),
        "user_name": user.get("name"),
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.sales.insert_one(doc)
    
    # Update stock
    for item in items_list:
        if item.get("product_id"):
            try:
                await db.products.update_one(
                    {"_id": ObjectId(item["product_id"]), "tenant_id": tenant_id},
                    {"$inc": {"stock_quantity": -item["quantity"]}}
                )
            except Exception:
                pass
    
    doc["_id"] = str(result.inserted_id)
    doc["id"] = doc["_id"]
    return doc


# Financial
@app.get("/api/saas/financial")
async def list_financial(request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    entries = await db.financial.find({"tenant_id": tenant_id}).sort("due_date", 1).to_list(500)
    return serialize_list(entries)


@app.post("/api/saas/financial")
async def create_financial(data: FinancialEntryCreate, request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    doc = data.model_dump()
    doc["tenant_id"] = tenant_id
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.financial.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc["id"] = doc["_id"]
    return doc


@app.patch("/api/saas/financial/{entry_id}/pay")
async def mark_as_paid(entry_id: str, request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    await db.financial.update_one(
        {"_id": ObjectId(entry_id), "tenant_id": tenant_id},
        {"$set": {"status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}}
    )
    entry = await db.financial.find_one({"_id": ObjectId(entry_id)})
    return serialize_doc(entry)


# Users management (tenant-level)
@app.get("/api/saas/users")
async def list_tenant_users(request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    require_roles("admin", "manager", "super_admin")(user)
    users = await db.users.find({"tenant_id": tenant_id}, {"password_hash": 0}).to_list(50)
    return serialize_list(users)


@app.post("/api/saas/users")
async def create_tenant_user(data: UserCreate, request: Request, response: Response):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    require_roles("admin", "super_admin")(user)
    email = data.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "email": email,
        "password_hash": hash_password(data.password),
        "name": data.name,
        "role": data.role,
        "tenant_id": tenant_id,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(doc)
    return {"id": str(result.inserted_id), "email": email, "name": data.name, "role": data.role}


# Tenant Settings
@app.get("/api/saas/settings")
async def get_tenant_settings(request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    tenant = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    if not tenant:
        return {}
    return serialize_doc(tenant)


@app.put("/api/saas/settings")
async def update_tenant_settings(data: dict, request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    require_roles("admin", "super_admin")(user)
    data.pop("_id", None)
    data.pop("id", None)
    await db.tenants.update_one({"_id": ObjectId(tenant_id)}, {"$set": data})
    tenant = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    return serialize_doc(tenant)


# ===== PDV ROUTES =====

# Get products for PDV
@app.get("/api/pdv/products")
async def pdv_products(request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    products = await db.products.find({"tenant_id": tenant_id, "is_active": True}).to_list(500)
    return serialize_list(products)


# Cash Register
@app.get("/api/pdv/cash-register")
async def get_cash_register(request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    register = await db.cash_registers.find_one({"tenant_id": tenant_id, "status": "open"})
    if register:
        return serialize_doc(register)
    return None


@app.post("/api/pdv/cash-register/open")
async def open_cash_register(data: CashRegisterOpen, request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    existing = await db.cash_registers.find_one({"tenant_id": tenant_id, "status": "open"})
    if existing:
        raise HTTPException(status_code=400, detail="Cash register already open")
    doc = {
        "tenant_id": tenant_id,
        "opened_by": user.get("name"),
        "opened_by_id": user.get("_id"),
        "initial_amount": data.initial_amount,
        "current_amount": data.initial_amount,
        "total_sales": 0,
        "total_sales_count": 0,
        "total_sangria": 0,
        "total_suprimento": 0,
        "movements": [],
        "status": "open",
        "notes": data.notes,
        "opened_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.cash_registers.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc["id"] = doc["_id"]
    return doc


@app.post("/api/pdv/cash-register/close")
async def close_cash_register(data: CashRegisterClose, request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    register = await db.cash_registers.find_one({"tenant_id": tenant_id, "status": "open"})
    if not register:
        raise HTTPException(status_code=400, detail="No open cash register")
    await db.cash_registers.update_one(
        {"_id": register["_id"]},
        {"$set": {
            "status": "closed",
            "closed_by": user.get("name"),
            "closed_by_id": user.get("_id"),
            "closed_at": datetime.now(timezone.utc).isoformat(),
            "notes": data.notes
        }}
    )
    register = await db.cash_registers.find_one({"_id": register["_id"]})
    return serialize_doc(register)


@app.post("/api/pdv/cash-register/movement")
async def cash_movement(data: CashMovement, request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    register = await db.cash_registers.find_one({"tenant_id": tenant_id, "status": "open"})
    if not register:
        raise HTTPException(status_code=400, detail="No open cash register")
    movement = {
        "type": data.type,
        "amount": data.amount,
        "reason": data.reason,
        "user": user.get("name"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    amount_change = -data.amount if data.type == "sangria" else data.amount
    inc_field = "total_sangria" if data.type == "sangria" else "total_suprimento"
    await db.cash_registers.update_one(
        {"_id": register["_id"]},
        {"$push": {"movements": movement}, "$inc": {"current_amount": amount_change, inc_field: data.amount}}
    )
    return {"message": "Movement recorded", "movement": movement}


# PDV Sales
@app.post("/api/pdv/sales")
async def pdv_create_sale(data: SaleCreate, request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    
    # Check cash register
    register = await db.cash_registers.find_one({"tenant_id": tenant_id, "status": "open"})
    if not register:
        raise HTTPException(status_code=400, detail="Cash register not open")
    
    items_list = [item.model_dump() for item in data.items]
    subtotal = sum(i["quantity"] * i["unit_price"] - i["discount"] for i in items_list)
    total = subtotal - data.discount
    
    last_sale = await db.sales.find({"tenant_id": tenant_id}).sort("created_at", -1).limit(1).to_list(1)
    sale_num = 1001
    if last_sale:
        try:
            sale_num = int(last_sale[0].get("sale_number", "V-1000").split("-")[1]) + 1
        except (ValueError, IndexError):
            sale_num = 1001
    
    doc = {
        "tenant_id": tenant_id,
        "sale_number": f"V-{sale_num}",
        "client_id": data.client_id,
        "client_name": data.client_name or "Consumidor Final",
        "items": items_list,
        "subtotal": subtotal,
        "discount": data.discount,
        "total": total,
        "payment_method": data.payment_method,
        "status": "completed",
        "fiscal_status": "pendente",
        "source": "pdv",
        "cash_register_id": str(register["_id"]),
        "user_id": user.get("_id"),
        "user_name": user.get("name"),
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.sales.insert_one(doc)
    
    # Update cash register
    await db.cash_registers.update_one(
        {"_id": register["_id"]},
        {"$inc": {"current_amount": total, "total_sales": total, "total_sales_count": 1}}
    )
    
    # Update stock
    for item in items_list:
        if item.get("product_id"):
            try:
                await db.products.update_one(
                    {"_id": ObjectId(item["product_id"]), "tenant_id": tenant_id},
                    {"$inc": {"stock_quantity": -item["quantity"]}}
                )
            except Exception:
                pass
    
    doc["_id"] = str(result.inserted_id)
    doc["id"] = doc["_id"]
    return doc


@app.get("/api/pdv/sales")
async def pdv_list_sales(request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    sales = await db.sales.find({"tenant_id": tenant_id, "source": "pdv", "created_at": {"$gte": today}}).sort("created_at", -1).to_list(100)
    return serialize_list(sales)


# PDV Sync (offline sales)
@app.post("/api/pdv/sync")
async def pdv_sync(data: PDVSyncPayload, request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    synced_sales = []
    for sale_data in data.sales:
        sale_data["tenant_id"] = tenant_id
        sale_data["synced_at"] = datetime.now(timezone.utc).isoformat()
        sale_data["status"] = "completed"
        sale_data["sync_status"] = "synced"
        result = await db.sales.insert_one(sale_data)
        synced_sales.append(str(result.inserted_id))
    return {"synced_sales": len(synced_sales), "ids": synced_sales}


# Fiscal (structure ready)
@app.get("/api/fiscal/config")
async def get_fiscal_config(request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    config = await db.fiscal_config.find_one({"tenant_id": tenant_id})
    if config:
        return serialize_doc(config)
    return {"environment": "homologation", "certificate_uploaded": False, "csc_configured": False, "series_nfe": 1, "series_nfce": 1}


@app.get("/api/fiscal/invoices")
async def list_invoices(request: Request):
    user = await get_user(request)
    tenant_id = user.get("tenant_id")
    invoices = await db.fiscal_invoices.find({"tenant_id": tenant_id}).sort("created_at", -1).to_list(100)
    return serialize_list(invoices)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "Integra SYS API", "version": "2.0.0"}
