"""
Integra SYS Backend API Tests - Iteration 2
Tests for expanded multi-tenant ERP/PDV SaaS with 3 apps: Admin Master, Web SaaS, Mobile/PDV
New features: Services, Real Estate, Vehicles, Resellers, API Keys, Webhooks, Support, Modules
Paginated responses: {data, total, page, pages} format
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
SUPER_ADMIN = {"email": "admin@integracode.com", "password": "Integra@2024"}
TENANT_ADMIN = {"email": "admin@empresademo.com.br", "password": "Demo@2024"}
MANAGER = {"email": "gerente@empresademo.com.br", "password": "Demo@2024"}
CASHIER = {"email": "caixa@empresademo.com.br", "password": "Demo@2024"}


@pytest.fixture(scope="function")
def api_client():
    """Fresh requests session for each test"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def super_admin_token():
    """Get super admin authentication token"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    response = session.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Super admin authentication failed: {response.text}")


@pytest.fixture(scope="module")
def tenant_admin_token():
    """Get tenant admin authentication token"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    response = session.post(f"{BASE_URL}/api/auth/login", json=TENANT_ADMIN)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Tenant admin authentication failed: {response.text}")


@pytest.fixture(scope="module")
def cashier_token():
    """Get cashier authentication token"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    response = session.post(f"{BASE_URL}/api/auth/login", json=CASHIER)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Cashier authentication failed: {response.text}")


# ===== HEALTH CHECK =====
class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_health_endpoint(self, api_client):
        """Test /api/health returns OK"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "Integra SYS API"
        print("✓ Health check passed")


# ===== AUTHENTICATION =====
class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_super_admin_login(self, api_client):
        """Test super admin login with correct credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["email"] == SUPER_ADMIN["email"]
        assert data["role"] == "super_admin"
        print(f"✓ Super admin login successful: {data['name']}")
    
    def test_tenant_admin_login(self, api_client):
        """Test tenant admin login with correct credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=TENANT_ADMIN)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["email"] == TENANT_ADMIN["email"]
        assert data["role"] == "admin"
        assert data["tenant_id"] is not None
        print(f"✓ Tenant admin login successful: {data['name']}")
    
    def test_cashier_login(self, api_client):
        """Test cashier login with correct credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=CASHIER)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["email"] == CASHIER["email"]
        assert data["role"] == "cashier"
        print(f"✓ Cashier login successful: {data['name']}")
    
    def test_invalid_credentials(self, api_client):
        """Test login with invalid credentials returns 401"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")


# ===== ADMIN DASHBOARD (10+ metrics) =====
class TestAdminDashboard:
    """Admin Master dashboard tests - expanded with 10+ metrics"""
    
    def test_admin_dashboard_expanded_metrics(self, api_client, super_admin_token):
        """Test admin dashboard returns 10+ metrics"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify 10+ metrics exist
        required_metrics = [
            "total_tenants", "active_tenants", "total_users", "total_licenses",
            "active_licenses", "test_licenses", "suspended_licenses", "expired_licenses",
            "expiring_soon", "total_plans", "total_resellers", "open_tickets",
            "total_api_keys", "mrr", "new_clients"
        ]
        for metric in required_metrics:
            assert metric in data, f"Missing metric: {metric}"
        
        # Verify recent data
        assert "recent_tenants" in data
        assert "recent_logs" in data
        
        print(f"✓ Admin dashboard has {len(required_metrics)}+ metrics")
        print(f"  - Tenants: {data['total_tenants']} (active: {data['active_tenants']})")
        print(f"  - Users: {data['total_users']}")
        print(f"  - Licenses: {data['total_licenses']} (active: {data['active_licenses']})")
        print(f"  - Resellers: {data['total_resellers']}")
        print(f"  - API Keys: {data['total_api_keys']}")
        print(f"  - MRR: R$ {data['mrr']}")


# ===== ADMIN TENANTS (paginated) =====
class TestAdminTenants:
    """Admin tenants CRUD tests with pagination"""
    
    def test_list_tenants_paginated(self, api_client, super_admin_token):
        """Test listing tenants returns paginated response"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/admin/tenants", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify paginated format
        assert "data" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        
        # Verify Empresa Demo Ltda exists
        tenants = data["data"]
        demo_tenant = next((t for t in tenants if t.get("company_name") == "Empresa Demo Ltda"), None)
        assert demo_tenant is not None, "Empresa Demo Ltda should exist in tenants"
        print(f"✓ Listed {len(tenants)} tenants (total: {data['total']}, page: {data['page']})")


# ===== ADMIN LICENSES (paginated) =====
class TestAdminLicenses:
    """Admin licenses tests with pagination"""
    
    def test_list_licenses_paginated(self, api_client, super_admin_token):
        """Test listing licenses returns paginated response"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/admin/licenses", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify paginated format
        assert "data" in data
        assert "total" in data
        assert "page" in data
        
        licenses = data["data"]
        assert len(licenses) >= 1, "Should have at least 1 license"
        print(f"✓ Listed {len(licenses)} licenses (total: {data['total']})")


# ===== ADMIN PLANS =====
class TestAdminPlans:
    """Admin plans CRUD tests"""
    
    def test_list_plans(self, api_client, super_admin_token):
        """Test listing plans"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/admin/plans", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 3, "Should have at least 3 plans"
        plan_names = [p["name"] for p in data]
        assert "Starter" in plan_names
        assert "Professional" in plan_names
        assert "Enterprise" in plan_names
        print(f"✓ Listed {len(data)} plans: {plan_names}")


# ===== ADMIN MODULES =====
class TestAdminModules:
    """Admin modules tests"""
    
    def test_list_modules(self, api_client, super_admin_token):
        """Test listing modules"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/admin/modules", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 10, f"Should have at least 10 modules, got {len(data)}"
        
        # Verify module structure
        module_ids = [m.get("id") for m in data]
        expected_modules = ["products", "services", "clients", "sales", "financial", "pdv"]
        for mod in expected_modules:
            assert mod in module_ids, f"Missing module: {mod}"
        
        print(f"✓ Listed {len(data)} modules")


# ===== ADMIN RESELLERS =====
class TestAdminResellers:
    """Admin resellers tests"""
    
    def test_list_resellers(self, api_client, super_admin_token):
        """Test listing resellers - should have 2 seeded"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/admin/resellers", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify paginated format
        assert "data" in data
        assert "total" in data
        
        resellers = data["data"]
        assert len(resellers) >= 2, f"Expected at least 2 resellers, got {len(resellers)}"
        print(f"✓ Listed {len(resellers)} resellers (total: {data['total']})")
    
    def test_create_reseller(self, api_client, super_admin_token):
        """Test creating a new reseller"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.post(f"{BASE_URL}/api/admin/resellers", headers=headers, json={
            "name": "TEST_Reseller Teste",
            "email": "test_reseller@test.com",
            "phone": "(11) 99999-9999",
            "commission_rate": 10
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Reseller Teste"
        assert data["is_active"] == True
        print(f"✓ Created reseller: {data['name']}")


# ===== ADMIN API KEYS =====
class TestAdminApiKeys:
    """Admin API keys tests"""
    
    def test_list_api_keys(self, api_client, super_admin_token):
        """Test listing API keys"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/admin/api-keys", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} API keys")
    
    def test_create_api_key(self, api_client, super_admin_token):
        """Test creating a new API key"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.post(f"{BASE_URL}/api/admin/api-keys", headers=headers, json={
            "name": "TEST_API Key",
            "description": "Test API key for testing"
        })
        assert response.status_code == 200
        data = response.json()
        assert "key" in data
        assert data["key"].startswith("ik_")
        assert "key_preview" in data
        assert data["is_active"] == True
        print(f"✓ Created API key: {data['key_preview']}")


# ===== ADMIN WEBHOOKS =====
class TestAdminWebhooks:
    """Admin webhooks tests"""
    
    def test_list_webhooks(self, api_client, super_admin_token):
        """Test listing webhooks"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/admin/webhooks", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} webhooks")
    
    def test_create_webhook(self, api_client, super_admin_token):
        """Test creating a new webhook"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.post(f"{BASE_URL}/api/admin/webhooks", headers=headers, json={
            "name": "TEST_Webhook",
            "url": "https://example.com/webhook",
            "events": ["sale.created", "sale.cancelled"]
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Webhook"
        assert "secret" in data
        print(f"✓ Created webhook: {data['name']}")


# ===== ADMIN USERS =====
class TestAdminUsers:
    """Admin users tests"""
    
    def test_list_users(self, api_client, super_admin_token):
        """Test listing all users"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify paginated format
        assert "data" in data
        assert "total" in data
        
        users = data["data"]
        assert len(users) >= 4, f"Expected at least 4 users, got {len(users)}"
        print(f"✓ Listed {len(users)} users (total: {data['total']})")


# ===== ADMIN LOGS =====
class TestAdminLogs:
    """Admin audit logs tests"""
    
    def test_list_logs(self, api_client, super_admin_token):
        """Test listing audit logs"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/admin/logs", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify paginated format
        assert "data" in data
        assert "total" in data
        print(f"✓ Listed {len(data['data'])} logs (total: {data['total']})")


# ===== ADMIN SUPPORT =====
class TestAdminSupport:
    """Admin support tickets tests"""
    
    def test_list_support_tickets(self, api_client, super_admin_token):
        """Test listing support tickets"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/admin/support", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify paginated format
        assert "data" in data
        assert "total" in data
        print(f"✓ Listed {len(data['data'])} support tickets (total: {data['total']})")


# ===== ADMIN SETTINGS =====
class TestAdminSettings:
    """Admin settings tests"""
    
    def test_get_settings(self, api_client, super_admin_token):
        """Test getting admin settings"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/admin/settings", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "company_name" in data or "type" in data
        print(f"✓ Got admin settings")


# ===== SAAS DASHBOARD =====
class TestSaaSDashboard:
    """Web SaaS dashboard tests"""
    
    def test_saas_dashboard(self, api_client, tenant_admin_token):
        """Test SaaS dashboard returns stats"""
        headers = {"Authorization": f"Bearer {tenant_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/saas/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify dashboard stats
        required_fields = [
            "total_products", "total_services", "total_clients", "total_suppliers",
            "total_sales", "today_revenue", "month_revenue", "total_revenue",
            "receivable", "payable", "recent_sales", "low_stock", "top_products",
            "daily_sales", "sales_by_payment"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ SaaS dashboard: {data['total_products']} products, {data['total_services']} services")
        print(f"  - Clients: {data['total_clients']}, Suppliers: {data['total_suppliers']}")
        print(f"  - Sales: {data['total_sales']}, Revenue: R$ {data['total_revenue']}")


# ===== SAAS PRODUCTS (paginated) =====
class TestSaaSProducts:
    """SaaS products CRUD tests with pagination"""
    
    def test_list_products_paginated(self, api_client, tenant_admin_token):
        """Test listing products returns paginated response with 12 products"""
        headers = {"Authorization": f"Bearer {tenant_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/saas/products", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify paginated format
        assert "data" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        
        products = data["data"]
        assert len(products) >= 10, f"Expected at least 10 products, got {len(products)}"
        
        # Verify product structure
        product = products[0]
        assert "name" in product
        assert "sku" in product
        assert "sale_price" in product
        
        print(f"✓ Listed {len(products)} products (total: {data['total']})")
    
    def test_search_products(self, api_client, tenant_admin_token):
        """Test searching products"""
        headers = {"Authorization": f"Bearer {tenant_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/saas/products?search=Monitor", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        print(f"✓ Search returned {len(data['data'])} products")


# ===== SAAS SERVICES =====
class TestSaaSServices:
    """SaaS services CRUD tests"""
    
    def test_list_services(self, api_client, tenant_admin_token):
        """Test listing services - should have 5 seeded"""
        headers = {"Authorization": f"Bearer {tenant_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/saas/services", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify paginated format
        assert "data" in data
        assert "total" in data
        
        services = data["data"]
        assert len(services) >= 5, f"Expected at least 5 services, got {len(services)}"
        print(f"✓ Listed {len(services)} services (total: {data['total']})")
    
    def test_create_service(self, api_client, tenant_admin_token):
        """Test creating a new service"""
        headers = {"Authorization": f"Bearer {tenant_admin_token}"}
        response = api_client.post(f"{BASE_URL}/api/saas/services", headers=headers, json={
            "name": "TEST_Serviço de Teste",
            "description": "Serviço para testes",
            "price": 150.00,
            "duration": 60
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Serviço de Teste"
        print(f"✓ Created service: {data['name']}")


# ===== SAAS CLIENTS (paginated) =====
class TestSaaSClients:
    """SaaS clients CRUD tests with pagination"""
    
    def test_list_clients_paginated(self, api_client, tenant_admin_token):
        """Test listing clients returns paginated response"""
        headers = {"Authorization": f"Bearer {tenant_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/saas/clients", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify paginated format
        assert "data" in data
        assert "total" in data
        assert "page" in data
        
        clients = data["data"]
        assert len(clients) >= 5, f"Expected at least 5 clients, got {len(clients)}"
        print(f"✓ Listed {len(clients)} clients (total: {data['total']})")


# ===== SAAS SUPPLIERS =====
class TestSaaSSuppliers:
    """SaaS suppliers CRUD tests"""
    
    def test_list_suppliers(self, api_client, tenant_admin_token):
        """Test listing suppliers"""
        headers = {"Authorization": f"Bearer {tenant_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/saas/suppliers", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify paginated format
        assert "data" in data
        assert "total" in data
        
        suppliers = data["data"]
        assert len(suppliers) >= 3, f"Expected at least 3 suppliers, got {len(suppliers)}"
        print(f"✓ Listed {len(suppliers)} suppliers (total: {data['total']})")


# ===== SAAS INVENTORY =====
class TestSaaSInventory:
    """SaaS inventory tests"""
    
    def test_get_inventory_with_summary(self, api_client, tenant_admin_token):
        """Test inventory returns summary with 4 stat cards"""
        headers = {"Authorization": f"Bearer {tenant_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/saas/inventory", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify paginated format with summary
        assert "data" in data
        assert "total" in data
        assert "summary" in data
        
        # Verify 4 summary stats
        summary = data["summary"]
        assert "total_items" in summary
        assert "total_value" in summary
        assert "low_stock" in summary
        assert "out_of_stock" in summary
        
        print(f"✓ Inventory: {summary['total_items']} items, value: R$ {summary['total_value']}")
        print(f"  - Low stock: {summary['low_stock']}, Out of stock: {summary['out_of_stock']}")


# ===== SAAS SALES =====
class TestSaaSSales:
    """SaaS sales tests"""
    
    def test_list_sales_paginated(self, api_client, tenant_admin_token):
        """Test listing sales returns paginated response"""
        headers = {"Authorization": f"Bearer {tenant_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/saas/sales", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify paginated format
        assert "data" in data
        assert "total" in data
        assert "page" in data
        
        sales = data["data"]
        assert len(sales) >= 15, f"Expected at least 15 sales, got {len(sales)}"
        print(f"✓ Listed {len(sales)} sales (total: {data['total']})")


# ===== SAAS FINANCIAL (paginated with summary) =====
class TestSaaSFinancial:
    """SaaS financial tests with pagination"""
    
    def test_list_financial_paginated(self, api_client, tenant_admin_token):
        """Test listing financial entries returns paginated response with summary"""
        headers = {"Authorization": f"Bearer {tenant_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/saas/financial", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify paginated format with summary
        assert "data" in data
        assert "total" in data
        assert "summary" in data
        
        # Verify summary
        summary = data["summary"]
        assert "receivable" in summary
        assert "payable" in summary
        assert "overdue_count" in summary
        
        entries = data["data"]
        assert len(entries) >= 10, f"Expected at least 10 entries, got {len(entries)}"
        print(f"✓ Listed {len(entries)} financial entries")
        print(f"  - Receivable: R$ {summary['receivable']}, Payable: R$ {summary['payable']}")


# ===== SAAS REPORTS =====
class TestSaaSReports:
    """SaaS reports tests"""
    
    def test_sales_report(self, api_client, tenant_admin_token):
        """Test sales report"""
        headers = {"Authorization": f"Bearer {tenant_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/saas/reports/sales", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "sales" in data
        assert "total_revenue" in data
        assert "total_count" in data
        assert "by_payment" in data
        assert "by_day" in data
        
        print(f"✓ Sales report: {data['total_count']} sales, R$ {data['total_revenue']}")
    
    def test_products_report(self, api_client, tenant_admin_token):
        """Test products report"""
        headers = {"Authorization": f"Bearer {tenant_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/saas/reports/products", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "products" in data
        assert "total_cost_value" in data
        assert "total_sale_value" in data
        assert "total_products" in data
        
        print(f"✓ Products report: {data['total_products']} products")
    
    def test_financial_report(self, api_client, tenant_admin_token):
        """Test financial report"""
        headers = {"Authorization": f"Bearer {tenant_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/saas/reports/financial", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "entries" in data
        assert "total" in data
        
        print(f"✓ Financial report: {data['total']} entries")
    
    def test_clients_report(self, api_client, tenant_admin_token):
        """Test clients report"""
        headers = {"Authorization": f"Bearer {tenant_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/saas/reports/clients", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "clients" in data
        assert "total" in data
        
        print(f"✓ Clients report: {data['total']} clients")


# ===== SAAS PERMISSIONS =====
class TestSaaSPermissions:
    """SaaS permissions tests"""
    
    def test_list_permissions(self, api_client, tenant_admin_token):
        """Test listing available permissions"""
        headers = {"Authorization": f"Bearer {tenant_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/saas/permissions", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 10, f"Expected at least 10 permissions, got {len(data)}"
        
        # Verify permission structure
        perm = data[0]
        assert "id" in perm
        assert "name" in perm
        assert "group" in perm
        
        print(f"✓ Listed {len(data)} permissions")


# ===== SAAS USERS =====
class TestSaaSUsers:
    """SaaS tenant users tests"""
    
    def test_list_tenant_users(self, api_client, tenant_admin_token):
        """Test listing tenant users"""
        headers = {"Authorization": f"Bearer {tenant_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/saas/users", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 4, f"Expected at least 4 users, got {len(data)}"
        print(f"✓ Listed {len(data)} tenant users")


# ===== SAAS PDV SETTINGS =====
class TestSaaSPdvSettings:
    """SaaS PDV settings tests"""
    
    def test_get_pdv_settings(self, api_client, tenant_admin_token):
        """Test getting PDV settings"""
        headers = {"Authorization": f"Bearer {tenant_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/saas/pdv-settings", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "mode" in data or "tenant_id" in data
        print(f"✓ Got PDV settings")


# ===== SAAS REAL ESTATE =====
class TestSaaSRealEstate:
    """SaaS real estate tests"""
    
    def test_list_real_estate(self, api_client, tenant_admin_token):
        """Test listing real estate"""
        headers = {"Authorization": f"Bearer {tenant_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/saas/real-estate", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify paginated format
        assert "data" in data
        assert "total" in data
        print(f"✓ Listed {len(data['data'])} real estate items")


# ===== SAAS VEHICLES =====
class TestSaaSVehicles:
    """SaaS vehicles tests"""
    
    def test_list_vehicles(self, api_client, tenant_admin_token):
        """Test listing vehicles"""
        headers = {"Authorization": f"Bearer {tenant_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/saas/vehicles", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify paginated format
        assert "data" in data
        assert "total" in data
        print(f"✓ Listed {len(data['data'])} vehicles")


# ===== SAAS FISCAL =====
class TestSaaSFiscal:
    """SaaS fiscal tests"""
    
    def test_get_fiscal_config(self, api_client, tenant_admin_token):
        """Test getting fiscal config"""
        headers = {"Authorization": f"Bearer {tenant_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/saas/fiscal/config", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "environment" in data
        print(f"✓ Got fiscal config: environment={data['environment']}")
    
    def test_list_fiscal_invoices(self, api_client, tenant_admin_token):
        """Test listing fiscal invoices"""
        headers = {"Authorization": f"Bearer {tenant_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/saas/fiscal/invoices", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "data" in data
        assert "total" in data
        print(f"✓ Listed {len(data['data'])} fiscal invoices")


# ===== SAAS SUPPORT =====
class TestSaaSSupport:
    """SaaS support tests"""
    
    def test_list_support_tickets(self, api_client, tenant_admin_token):
        """Test listing tenant support tickets"""
        headers = {"Authorization": f"Bearer {tenant_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/saas/support", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} support tickets")


# ===== PDV =====
class TestPDV:
    """PDV (Point of Sale) tests"""
    
    def test_pdv_products(self, api_client, cashier_token):
        """Test PDV products endpoint"""
        headers = {"Authorization": f"Bearer {cashier_token}"}
        response = api_client.get(f"{BASE_URL}/api/pdv/products", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 10, f"Expected at least 10 products, got {len(data)}"
        print(f"✓ PDV products: {len(data)} products available")
    
    def test_pdv_categories(self, api_client, cashier_token):
        """Test PDV categories endpoint"""
        headers = {"Authorization": f"Bearer {cashier_token}"}
        response = api_client.get(f"{BASE_URL}/api/pdv/products/categories", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ PDV categories: {len(data)} categories")
    
    def test_pdv_clients(self, api_client, cashier_token):
        """Test PDV clients endpoint"""
        headers = {"Authorization": f"Bearer {cashier_token}"}
        response = api_client.get(f"{BASE_URL}/api/pdv/clients", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ PDV clients: {len(data)} clients")
    
    def test_pdv_cash_register_flow(self, api_client, cashier_token):
        """Test PDV cash register open/close flow"""
        headers = {"Authorization": f"Bearer {cashier_token}"}
        
        # Close any existing register
        api_client.post(f"{BASE_URL}/api/pdv/cash-register/close", headers=headers, json={"notes": "Test close"})
        
        # Open new register
        response = api_client.post(f"{BASE_URL}/api/pdv/cash-register/open", headers=headers, json={
            "initial_amount": 200.00,
            "notes": "Test opening"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["initial_amount"] == 200.00
        assert data["status"] == "open"
        print(f"✓ PDV cash register opened with R$ {data['initial_amount']}")
        
        # Close register
        response = api_client.post(f"{BASE_URL}/api/pdv/cash-register/close", headers=headers, json={
            "notes": "Test closing"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "closed"
        print(f"✓ PDV cash register closed")
    
    def test_pdv_sales_history(self, api_client, cashier_token):
        """Test PDV sales history endpoint"""
        headers = {"Authorization": f"Bearer {cashier_token}"}
        response = api_client.get(f"{BASE_URL}/api/pdv/sales/history", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify paginated format
        assert "data" in data
        assert "total" in data
        print(f"✓ PDV sales history: {len(data['data'])} sales")
    
    def test_pdv_config(self, api_client, cashier_token):
        """Test PDV config endpoint"""
        headers = {"Authorization": f"Bearer {cashier_token}"}
        response = api_client.get(f"{BASE_URL}/api/pdv/config", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "settings" in data
        assert "user" in data
        print(f"✓ PDV config loaded")


# ===== LOGOUT =====
class TestLogout:
    """Logout tests"""
    
    def test_logout(self, api_client, super_admin_token):
        """Test logout endpoint"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.post(f"{BASE_URL}/api/auth/logout", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Logged out"
        print("✓ Logout successful")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
