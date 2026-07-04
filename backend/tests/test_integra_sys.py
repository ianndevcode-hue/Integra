"""
Integra SYS Backend API Tests
Tests for multi-tenant ERP/PDV SaaS with 3 apps: Admin Master, Web SaaS, Mobile/PDV
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
    
    def test_get_me_authenticated(self, api_client, super_admin_token):
        """Test /api/auth/me returns user info when authenticated"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == SUPER_ADMIN["email"]
        print("✓ Get current user successful")
    
    def test_get_me_unauthenticated(self, api_client):
        """Test /api/auth/me returns 401 when not authenticated"""
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ Unauthenticated access correctly rejected")


class TestAdminDashboard:
    """Admin Master dashboard tests"""
    
    def test_admin_dashboard(self, api_client, super_admin_token):
        """Test admin dashboard returns stats"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # Verify dashboard stats
        assert "total_tenants" in data
        assert "total_users" in data
        assert "total_licenses" in data
        assert "mrr" in data
        assert "active_licenses" in data
        assert "recent_tenants" in data
        print(f"✓ Admin dashboard: {data['total_tenants']} tenants, {data['total_users']} users, MRR: {data['mrr']}")
    
    def test_admin_dashboard_unauthorized(self, api_client, tenant_admin_token):
        """Test admin dashboard rejects non-super_admin"""
        headers = {"Authorization": f"Bearer {tenant_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        assert response.status_code == 403
        print("✓ Admin dashboard correctly rejects non-super_admin")


class TestAdminTenants:
    """Admin tenants CRUD tests"""
    
    def test_list_tenants(self, api_client, super_admin_token):
        """Test listing tenants"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/admin/tenants", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Verify Empresa Demo Ltda exists
        demo_tenant = next((t for t in data if t.get("company_name") == "Empresa Demo Ltda"), None)
        assert demo_tenant is not None, "Empresa Demo Ltda should exist in tenants"
        print(f"✓ Listed {len(data)} tenants, found Empresa Demo Ltda")


class TestAdminPlans:
    """Admin plans CRUD tests"""
    
    def test_list_plans(self, api_client, super_admin_token):
        """Test listing plans"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/admin/plans", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 3, "Should have at least 3 plans (Starter, Professional, Enterprise)"
        # Verify plan names
        plan_names = [p["name"] for p in data]
        assert "Starter" in plan_names
        assert "Professional" in plan_names
        assert "Enterprise" in plan_names
        print(f"✓ Listed {len(data)} plans: {plan_names}")


class TestAdminLicenses:
    """Admin licenses tests"""
    
    def test_list_licenses(self, api_client, super_admin_token):
        """Test listing licenses"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/admin/licenses", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} licenses")


class TestSaaSDashboard:
    """Web SaaS dashboard tests"""
    
    def test_saas_dashboard(self, api_client, tenant_admin_token):
        """Test SaaS dashboard returns stats"""
        headers = {"Authorization": f"Bearer {tenant_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/saas/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # Verify dashboard stats
        assert "total_products" in data
        assert "total_clients" in data
        assert "total_sales" in data
        assert "total_revenue" in data
        assert "receivable" in data
        assert "payable" in data
        assert "daily_sales" in data
        assert "sales_by_payment" in data
        # Verify seed data counts (at least the seeded amounts)
        assert data["total_products"] >= 10, f"Expected at least 10 products, got {data['total_products']}"
        assert data["total_clients"] >= 5, f"Expected at least 5 clients, got {data['total_clients']}"
        assert data["total_sales"] >= 15, f"Expected at least 15 sales, got {data['total_sales']}"
        print(f"✓ SaaS dashboard: {data['total_products']} products, {data['total_clients']} clients, {data['total_sales']} sales, revenue: {data['total_revenue']}")


class TestSaaSProducts:
    """SaaS products CRUD tests"""
    
    def test_list_products(self, api_client, tenant_admin_token):
        """Test listing products"""
        headers = {"Authorization": f"Bearer {tenant_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/saas/products", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 10, f"Expected 10 products, got {len(data)}"
        # Verify product structure
        product = data[0]
        assert "name" in product
        assert "sku" in product
        assert "sale_price" in product
        assert "stock_quantity" in product
        print(f"✓ Listed {len(data)} products")


class TestSaaSClients:
    """SaaS clients CRUD tests"""
    
    def test_list_clients(self, api_client, tenant_admin_token):
        """Test listing clients"""
        headers = {"Authorization": f"Bearer {tenant_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/saas/clients", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 5, f"Expected 5 clients, got {len(data)}"
        print(f"✓ Listed {len(data)} clients")


class TestSaaSFinancial:
    """SaaS financial tests"""
    
    def test_list_financial(self, api_client, tenant_admin_token):
        """Test listing financial entries"""
        headers = {"Authorization": f"Bearer {tenant_admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/saas/financial", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 10, f"Expected at least 10 financial entries, got {len(data)}"
        # Verify entry structure
        entry = data[0]
        assert "type" in entry
        assert "amount" in entry
        assert "status" in entry
        # Count receivable and payable
        receivable = [e for e in data if e["type"] == "receivable" and e["status"] == "pending"]
        payable = [e for e in data if e["type"] == "payable" and e["status"] == "pending"]
        print(f"✓ Listed {len(data)} financial entries: {len(receivable)} receivable, {len(payable)} payable")


class TestPDV:
    """PDV (Point of Sale) tests"""
    
    def test_pdv_products(self, api_client, cashier_token):
        """Test PDV products endpoint"""
        headers = {"Authorization": f"Bearer {cashier_token}"}
        response = api_client.get(f"{BASE_URL}/api/pdv/products", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 10, f"Expected 10 products, got {len(data)}"
        print(f"✓ PDV products: {len(data)} products available")
    
    def test_pdv_cash_register_status(self, api_client, cashier_token):
        """Test PDV cash register status"""
        headers = {"Authorization": f"Bearer {cashier_token}"}
        response = api_client.get(f"{BASE_URL}/api/pdv/cash-register", headers=headers)
        assert response.status_code == 200
        # Can be null if no register is open
        print("✓ PDV cash register status checked")
    
    def test_pdv_open_cash_register(self, api_client, cashier_token):
        """Test opening cash register"""
        headers = {"Authorization": f"Bearer {cashier_token}"}
        # First close any existing register
        api_client.post(f"{BASE_URL}/api/pdv/cash-register/close", headers=headers, json={"notes": "Test close"})
        
        # Open new register
        response = api_client.post(f"{BASE_URL}/api/pdv/cash-register/open", headers=headers, json={
            "initial_amount": 100.00,
            "notes": "Test opening"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["initial_amount"] == 100.00
        assert data["status"] == "open"
        print(f"✓ PDV cash register opened with R$ {data['initial_amount']}")
    
    def test_pdv_create_sale(self, api_client, cashier_token):
        """Test creating a PDV sale"""
        headers = {"Authorization": f"Bearer {cashier_token}"}
        
        # Get products first
        products_response = api_client.get(f"{BASE_URL}/api/pdv/products", headers=headers)
        products = products_response.json()
        product = products[0]
        
        # Create sale
        response = api_client.post(f"{BASE_URL}/api/pdv/sales", headers=headers, json={
            "items": [{
                "product_id": product["_id"],
                "product_name": product["name"],
                "quantity": 1,
                "unit_price": product["sale_price"],
                "discount": 0
            }],
            "payment_method": "dinheiro",
            "client_name": "Consumidor Final",
            "discount": 0
        })
        assert response.status_code == 200
        data = response.json()
        assert "sale_number" in data
        assert data["status"] == "completed"
        assert data["payment_method"] == "dinheiro"
        print(f"✓ PDV sale created: {data['sale_number']} - R$ {data['total']}")
    
    def test_pdv_close_cash_register(self, api_client, cashier_token):
        """Test closing cash register"""
        headers = {"Authorization": f"Bearer {cashier_token}"}
        response = api_client.post(f"{BASE_URL}/api/pdv/cash-register/close", headers=headers, json={
            "notes": "Test closing"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "closed"
        print(f"✓ PDV cash register closed. Final amount: R$ {data['current_amount']}")


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
