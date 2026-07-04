from dotenv import load_dotenv
load_dotenv()

import os
import secrets
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from contextlib import asynccontextmanager

from auth import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    set_auth_cookies, get_current_user, check_brute_force, record_failed_attempt,
    clear_failed_attempts, require_roles
)

# ===== DATABASE =====
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "integra_sys")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


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


# ===== SEED =====
async def seed_data():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@integracode.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Integra@2024")

    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.products.create_index([("tenant_id", 1), ("sku", 1)])
    await db.clients.create_index([("tenant_id", 1)])
    await db.sales.create_index([("tenant_id", 1), ("created_at", -1)])
    await db.cash_registers.create_index([("tenant_id", 1), ("status", 1)])
    await db.services.create_index([("tenant_id", 1)])
    await db.real_estate.create_index([("tenant_id", 1)])
    await db.vehicles.create_index([("tenant_id", 1)])

    # Seed super admin
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({"email": admin_email, "password_hash": hash_password(admin_password), "name": "Admin Integra Code", "role": "super_admin", "tenant_id": None, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()})
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    # Seed plans
    plans_count = await db.plans.count_documents({})
    if plans_count == 0:
        plans = [
            {"name": "Starter", "description": "Plano inicial para pequenos negócios", "price": 99.90, "modules": ["products", "clients", "sales", "financial"], "max_users": 3, "max_pdvs": 1, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Professional", "description": "Plano completo para empresas em crescimento", "price": 199.90, "modules": ["products", "services", "clients", "sales", "financial", "inventory", "suppliers", "reports", "fiscal"], "max_users": 10, "max_pdvs": 3, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Enterprise", "description": "Plano empresarial com todos os módulos", "price": 399.90, "modules": ["products", "services", "clients", "sales", "financial", "inventory", "suppliers", "reports", "fiscal", "pdv", "api", "support", "real_estate", "vehicles"], "max_users": 50, "max_pdvs": 20, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.plans.insert_many(plans)

    # Seed demo tenant
    demo_tenant = await db.tenants.find_one({"cnpj": "12.345.678/0001-90"})
    if demo_tenant is None:
        plans_list = await db.plans.find({"name": "Enterprise"}).to_list(1)
        enterprise_plan = plans_list[0] if plans_list else None
        
        tenant_result = await db.tenants.insert_one({
            "company_name": "Empresa Demo Ltda", "cnpj": "12.345.678/0001-90", "email": "contato@empresademo.com.br",
            "phone": "(11) 99999-9999", "address": {"street": "Rua das Inovações", "number": "1000", "neighborhood": "Centro", "city": "São Paulo", "state": "SP", "zip": "01001-000"},
            "plan_id": str(enterprise_plan["_id"]) if enterprise_plan else None, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()
        })
        tid = str(tenant_result.inserted_id)

        if enterprise_plan:
            await db.licenses.insert_one({"tenant_id": tid, "plan_id": str(enterprise_plan["_id"]), "plan_name": enterprise_plan["name"], "modules": enterprise_plan["modules"], "max_users": enterprise_plan["max_users"], "max_pdvs": enterprise_plan.get("max_pdvs", 20), "status": "active", "starts_at": datetime.now(timezone.utc).isoformat(), "expires_at": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(), "history": [{"action": "created", "date": datetime.now(timezone.utc).isoformat()}], "created_at": datetime.now(timezone.utc).isoformat()})

        # Users
        for u in [
            {"email": "admin@empresademo.com.br", "name": "Administrador Demo", "role": "admin"},
            {"email": "gerente@empresademo.com.br", "name": "Carlos Gerente", "role": "manager"},
            {"email": "caixa@empresademo.com.br", "name": "Ana Caixa", "role": "cashier"},
            {"email": "vendedor@empresademo.com.br", "name": "Pedro Vendedor", "role": "seller"},
        ]:
            if not await db.users.find_one({"email": u["email"]}):
                await db.users.insert_one({"email": u["email"], "password_hash": hash_password("Demo@2024"), "name": u["name"], "role": u["role"], "tenant_id": tid, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()})

        # Products
        products = [
            {"name": "Notebook Dell Inspiron 15", "sku": "NB-DELL-001", "barcode": "7891234567890", "category": "Informática", "unit": "UN", "cost_price": 3200, "sale_price": 4599.90, "stock_quantity": 25, "min_stock": 5, "ncm": "8471.30.19", "cfop": "5102", "cst": "000", "origin": "0", "group": "Notebooks", "brand": "Dell"},
            {"name": "Mouse Logitech MX Master 3", "sku": "MS-LOG-001", "barcode": "7891234567891", "category": "Periféricos", "unit": "UN", "cost_price": 350, "sale_price": 549.90, "stock_quantity": 80, "min_stock": 15, "ncm": "8471.60.53", "cfop": "5102", "cst": "000", "origin": "0", "group": "Periféricos", "brand": "Logitech"},
            {"name": "Teclado Mecânico HyperX", "sku": "TC-HYP-001", "barcode": "7891234567892", "category": "Periféricos", "unit": "UN", "cost_price": 280, "sale_price": 449.90, "stock_quantity": 45, "min_stock": 10, "ncm": "8471.60.52", "cfop": "5102", "cst": "000", "origin": "0", "group": "Periféricos", "brand": "HyperX"},
            {"name": "Monitor Samsung 27\" 4K", "sku": "MN-SAM-001", "barcode": "7891234567893", "category": "Monitores", "unit": "UN", "cost_price": 1800, "sale_price": 2799.90, "stock_quantity": 15, "min_stock": 3, "ncm": "8528.52.20", "cfop": "5102", "cst": "000", "origin": "0", "group": "Monitores", "brand": "Samsung"},
            {"name": "Webcam Logitech C920", "sku": "WC-LOG-001", "barcode": "7891234567894", "category": "Periféricos", "unit": "UN", "cost_price": 250, "sale_price": 399.90, "stock_quantity": 60, "min_stock": 10, "ncm": "8525.80.19", "cfop": "5102", "cst": "000", "origin": "0", "group": "Periféricos", "brand": "Logitech"},
            {"name": "Headset JBL Quantum 400", "sku": "HS-JBL-001", "barcode": "7891234567895", "category": "Áudio", "unit": "UN", "cost_price": 180, "sale_price": 299.90, "stock_quantity": 40, "min_stock": 8, "ncm": "8518.30.00", "cfop": "5102", "cst": "000", "origin": "0", "group": "Áudio", "brand": "JBL"},
            {"name": "SSD Kingston 1TB NVMe", "sku": "HD-KNG-001", "barcode": "7891234567896", "category": "Armazenamento", "unit": "UN", "cost_price": 320, "sale_price": 499.90, "stock_quantity": 55, "min_stock": 10, "ncm": "8471.70.12", "cfop": "5102", "cst": "000", "origin": "0", "group": "Armazenamento", "brand": "Kingston"},
            {"name": "Memória RAM Corsair 16GB DDR5", "sku": "MM-CRS-001", "barcode": "7891234567897", "category": "Componentes", "unit": "UN", "cost_price": 290, "sale_price": 449.90, "stock_quantity": 35, "min_stock": 8, "ncm": "8473.30.49", "cfop": "5102", "cst": "000", "origin": "0", "group": "Componentes", "brand": "Corsair"},
            {"name": "Cabo HDMI 2.1 2m", "sku": "CB-HDM-001", "barcode": "7891234567898", "category": "Cabos", "unit": "UN", "cost_price": 25, "sale_price": 49.90, "stock_quantity": 200, "min_stock": 30, "ncm": "8544.42.00", "cfop": "5102", "cst": "000", "origin": "0", "group": "Cabos", "brand": "Genérico"},
            {"name": "Impressora HP LaserJet Pro", "sku": "IM-HP-001", "barcode": "7891234567899", "category": "Impressoras", "unit": "UN", "cost_price": 1200, "sale_price": 1899.90, "stock_quantity": 10, "min_stock": 2, "ncm": "8443.32.39", "cfop": "5102", "cst": "000", "origin": "0", "group": "Impressoras", "brand": "HP"},
            {"name": "Cadeira Gamer ThunderX3", "sku": "CD-TX3-001", "barcode": "7891234567900", "category": "Mobiliário", "unit": "UN", "cost_price": 800, "sale_price": 1299.90, "stock_quantity": 12, "min_stock": 3, "ncm": "9401.30.90", "cfop": "5102", "cst": "000", "origin": "0", "group": "Mobiliário", "brand": "ThunderX3"},
            {"name": "Placa de Vídeo RTX 4060", "sku": "VD-NVD-001", "barcode": "7891234567901", "category": "Componentes", "unit": "UN", "cost_price": 2200, "sale_price": 3499.90, "stock_quantity": 8, "min_stock": 2, "ncm": "8471.80.00", "cfop": "5102", "cst": "000", "origin": "0", "group": "Componentes", "brand": "NVIDIA"},
        ]
        for p in products:
            p["tenant_id"] = tid
            p["is_active"] = True
            p["pdv_enabled"] = True
            p["margin"] = round(((p["sale_price"] - p["cost_price"]) / p["cost_price"] * 100), 2) if p["cost_price"] > 0 else 0
            p["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.products.insert_many(products)

        # Services
        services = [
            {"name": "Formatação de Computador", "category": "Manutenção", "price": 150, "estimated_time": "2h", "professional": "Técnico", "commission": 15},
            {"name": "Limpeza de Notebook", "category": "Manutenção", "price": 80, "estimated_time": "1h", "professional": "Técnico", "commission": 10},
            {"name": "Instalação de Software", "category": "Software", "price": 50, "estimated_time": "30min", "professional": "Técnico", "commission": 10},
            {"name": "Montagem de PC", "category": "Hardware", "price": 200, "estimated_time": "3h", "professional": "Técnico Sênior", "commission": 20},
            {"name": "Consultoria TI", "category": "Consultoria", "price": 300, "estimated_time": "2h", "professional": "Consultor", "commission": 25},
        ]
        for s in services:
            s["tenant_id"] = tid
            s["is_active"] = True
            s["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.services.insert_many(services)

        # Clients
        clients_data = [
            {"name": "João Silva", "document": "123.456.789-00", "document_type": "CPF", "email": "joao@email.com", "phone": "(11) 91111-1111", "whatsapp": "(11) 91111-1111", "credit_limit": 5000},
            {"name": "Maria Oliveira", "document": "987.654.321-00", "document_type": "CPF", "email": "maria@email.com", "phone": "(11) 92222-2222", "whatsapp": "(11) 92222-2222", "credit_limit": 3000},
            {"name": "Tech Solutions Ltda", "document": "11.222.333/0001-44", "document_type": "CNPJ", "email": "contato@techsolutions.com", "phone": "(11) 93333-3333", "ie": "123456789", "credit_limit": 50000},
            {"name": "Pedro Santos", "document": "111.222.333-44", "document_type": "CPF", "email": "pedro@email.com", "phone": "(11) 94444-4444", "credit_limit": 2000},
            {"name": "Digital Corp S.A.", "document": "55.666.777/0001-88", "document_type": "CNPJ", "email": "compras@digitalcorp.com", "phone": "(11) 95555-5555", "ie": "987654321", "credit_limit": 100000},
            {"name": "Ana Costa", "document": "222.333.444-55", "document_type": "CPF", "email": "ana@email.com", "phone": "(11) 96666-6666", "credit_limit": 4000},
            {"name": "Roberto Lima", "document": "333.444.555-66", "document_type": "CPF", "email": "roberto@email.com", "phone": "(11) 97777-7777", "credit_limit": 3500},
        ]
        for c in clients_data:
            c["tenant_id"] = tid
            c["is_active"] = True
            c["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.clients.insert_many(clients_data)

        # Suppliers
        suppliers_data = [
            {"name": "Distribuidora Tech BR", "fantasy_name": "Tech BR", "cnpj": "99.888.777/0001-66", "email": "vendas@techbr.com", "phone": "(11) 3333-3333", "payment_terms": "30/60/90 dias", "vendor_name": "Carlos"},
            {"name": "Importadora Global IT", "fantasy_name": "Global IT", "cnpj": "88.777.666/0001-55", "email": "compras@globalit.com", "phone": "(11) 4444-4444", "payment_terms": "28 dias", "vendor_name": "Ana"},
            {"name": "MegaStore Informática", "fantasy_name": "MegaStore", "cnpj": "77.666.555/0001-44", "email": "atacado@megastore.com", "phone": "(11) 5555-5555", "payment_terms": "30 dias", "vendor_name": "Pedro"},
        ]
        for s in suppliers_data:
            s["tenant_id"] = tid
            s["is_active"] = True
            s["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.suppliers.insert_many(suppliers_data)

        # Sales
        products_list = await db.products.find({"tenant_id": tid}).to_list(12)
        for i in range(20):
            days_ago = 30 - (i * 1.5)
            sale_date = (datetime.now(timezone.utc) - timedelta(days=int(days_ago))).isoformat()
            prod = products_list[i % len(products_list)]
            qty = (i % 5) + 1
            total = prod["sale_price"] * qty
            await db.sales.insert_one({
                "tenant_id": tid, "sale_number": f"V-{1000 + i}", "client_name": clients_data[i % len(clients_data)]["name"],
                "items": [{"product_id": str(prod["_id"]), "product_name": prod["name"], "quantity": qty, "unit_price": prod["sale_price"], "discount": 0}],
                "subtotal": total, "discount": 0, "total": total, "payment_method": ["dinheiro", "cartao_credito", "cartao_debito", "pix"][i % 4],
                "status": "completed", "fiscal_status": "emitida" if i % 3 == 0 else "pendente",
                "source": "pdv" if i % 2 == 0 else "web", "user_name": "Administrador Demo", "created_at": sale_date
            })

        # Financial entries
        for i in range(15):
            days = (i * 3) + 1
            await db.financial.insert_one({
                "tenant_id": tid, "type": "receivable" if i % 2 == 0 else "payable",
                "description": f"{'Venda #' + str(1000+i) if i%2==0 else 'Fornecedor ' + suppliers_data[i%3]['name']}",
                "amount": round(500 + (i * 150.50), 2), "due_date": (datetime.now(timezone.utc) + timedelta(days=days)).isoformat(),
                "category": "vendas" if i % 2 == 0 else "compras", "status": "pending" if i > 4 else "paid",
                "paid_at": datetime.now(timezone.utc).isoformat() if i <= 4 else None, "created_at": datetime.now(timezone.utc).isoformat()
            })

        # Resellers seed
        await db.resellers.insert_many([
            {"name": "Revendedor São Paulo", "email": "sp@revendedor.com", "phone": "(11) 98888-8888", "commission_rate": 10, "total_clients": 5, "total_commission": 4999.50, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Revendedor Rio de Janeiro", "email": "rj@revendedor.com", "phone": "(21) 97777-7777", "commission_rate": 12, "total_clients": 3, "total_commission": 2399.70, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        ])

        # Audit logs seed
        await db.audit_logs.insert_many([
            {"action": "Sistema iniciado", "user_name": "Sistema", "entity": "system", "created_at": datetime.now(timezone.utc).isoformat()},
            {"action": "Tenant criado: Empresa Demo Ltda", "user_name": "Admin Integra Code", "entity": "tenant", "entity_id": tid, "created_at": datetime.now(timezone.utc).isoformat()},
            {"action": "Licença Enterprise ativada", "user_name": "Admin Integra Code", "entity": "license", "created_at": datetime.now(timezone.utc).isoformat()},
        ])

    # Write credentials
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# Integra SYS - Test Credentials\n\n")
        f.write("## Super Admin (Admin Master)\n- Email: admin@integracode.com\n- Password: Integra@2024\n- Role: super_admin\n- Access: /admin\n\n")
        f.write("## Tenant Admin (Web SaaS)\n- Email: admin@empresademo.com.br\n- Password: Demo@2024\n- Role: admin\n- Access: /app\n\n")
        f.write("## Manager\n- Email: gerente@empresademo.com.br\n- Password: Demo@2024\n- Role: manager\n\n")
        f.write("## Cashier (PDV)\n- Email: caixa@empresademo.com.br\n- Password: Demo@2024\n- Role: cashier\n- Access: /pdv\n\n")
        f.write("## Seller\n- Email: vendedor@empresademo.com.br\n- Password: Demo@2024\n- Role: seller\n")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed_data()
    yield
    client.close()


# ===== APP =====
app = FastAPI(title="Integra SYS API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000"), "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
from routes.admin_routes import router as admin_router
from routes.saas_routes import router as saas_router
from routes.pdv_routes import router as pdv_router

app.include_router(admin_router)
app.include_router(saas_router)
app.include_router(pdv_router)


# ===== AUTH ROUTES =====
@app.post("/api/auth/login")
async def login(data: dict, request: Request, response: Response):
    email = data.get("email", "").lower().strip()
    password = data.get("password", "")
    ip = request.client.host if request.client else "unknown"
    await check_brute_force(db, ip, email)
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(password, user["password_hash"]):
        await record_failed_attempt(db, ip, email)
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Conta desativada")
    await clear_failed_attempts(db, ip, email)
    access = create_access_token(str(user["_id"]), user["email"], user.get("role", "user"), user.get("tenant_id"))
    refresh = create_refresh_token(str(user["_id"]))
    set_auth_cookies(response, access, refresh)
    return {"id": str(user["_id"]), "email": user["email"], "name": user["name"], "role": user.get("role"), "tenant_id": user.get("tenant_id"), "token": access}


@app.post("/api/auth/register")
async def register(data: dict, response: Response):
    email = data.get("email", "").lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    doc = {"email": email, "password_hash": hash_password(data.get("password", "")), "name": data.get("name", ""), "role": data.get("role", "user"), "tenant_id": data.get("tenant_id"), "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()}
    result = await db.users.insert_one(doc)
    uid = str(result.inserted_id)
    access = create_access_token(uid, email, data.get("role", "user"), data.get("tenant_id"))
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    return {"id": uid, "email": email, "name": data.get("name"), "role": data.get("role", "user"), "tenant_id": data.get("tenant_id"), "token": access}


@app.get("/api/auth/me")
async def get_me(request: Request):
    return await get_user(request)


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


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "Integra SYS API", "version": "2.0.0"}
