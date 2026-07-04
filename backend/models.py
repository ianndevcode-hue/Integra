from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime, timezone
from bson import ObjectId
from typing import Annotated
from pydantic import BeforeValidator

PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v)]


class BaseDocument(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
    
    @classmethod
    def from_mongo(cls, doc: dict):
        if doc is None:
            return None
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return cls(**doc)
    
    def to_mongo(self):
        data = self.model_dump(by_alias=True, exclude_none=True)
        if "_id" in data and data["_id"]:
            data["_id"] = ObjectId(data["_id"])
        else:
            data.pop("_id", None)
        return data


# ===== AUTH MODELS =====
class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "user"
    tenant_id: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    tenant_id: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None

# ===== TENANT / LICENSE MODELS =====
class TenantCreate(BaseModel):
    company_name: str
    cnpj: Optional[str] = None
    email: str
    phone: Optional[str] = None
    address: Optional[dict] = None
    plan_id: Optional[str] = None

class LicenseCreate(BaseModel):
    tenant_id: str
    plan_id: str
    modules: List[str] = []
    max_users: int = 5
    expires_at: Optional[str] = None

class PlanCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float = 0
    modules: List[str] = []
    max_users: int = 5
    is_active: bool = True

# ===== PRODUCT MODELS =====
class ProductCreate(BaseModel):
    name: str
    sku: Optional[str] = None
    barcode: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    unit: str = "UN"
    cost_price: float = 0
    sale_price: float = 0
    stock_quantity: float = 0
    min_stock: float = 0
    ncm: Optional[str] = None
    cfop: Optional[str] = None
    is_active: bool = True

# ===== CLIENT MODELS =====
class ClientCreate(BaseModel):
    name: str
    document: Optional[str] = None
    document_type: str = "CPF"
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[dict] = None
    is_active: bool = True

# ===== SUPPLIER MODELS =====
class SupplierCreate(BaseModel):
    name: str
    cnpj: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[dict] = None
    is_active: bool = True

# ===== SALE MODELS =====
class SaleItemCreate(BaseModel):
    product_id: str
    product_name: str
    quantity: float
    unit_price: float
    discount: float = 0

class SaleCreate(BaseModel):
    client_id: Optional[str] = None
    client_name: Optional[str] = "Consumidor Final"
    items: List[SaleItemCreate]
    payment_method: str = "dinheiro"
    discount: float = 0
    notes: Optional[str] = None

# ===== CASH REGISTER MODELS =====
class CashRegisterOpen(BaseModel):
    initial_amount: float = 0
    notes: Optional[str] = None

class CashRegisterClose(BaseModel):
    notes: Optional[str] = None

class CashMovement(BaseModel):
    type: str  # "sangria" or "suprimento"
    amount: float
    reason: Optional[str] = None

# ===== FINANCIAL MODELS =====
class FinancialEntryCreate(BaseModel):
    type: str  # "payable" or "receivable"
    description: str
    amount: float
    due_date: str
    category: Optional[str] = None
    client_id: Optional[str] = None
    supplier_id: Optional[str] = None
    status: str = "pending"
    notes: Optional[str] = None

# ===== PDV SYNC =====
class PDVSyncPayload(BaseModel):
    sales: List[dict] = []
    cash_movements: List[dict] = []
