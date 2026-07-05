from pydantic import BaseModel, Field, field_validator
from typing import Optional
from uuid import UUID
from datetime import datetime
import re

# EWayBill Base Schema
class EWayBillBase(BaseModel):
    consignor_gstin: str = Field(..., description="15-character GSTIN of consignor")
    consignee_gstin: str = Field(..., description="15-character GSTIN of consignee")
    hsn_code: str = Field(..., description="HSN Code (4, 6 or 8 digits)")
    transporter_id: Optional[str] = None
    vehicle_number: Optional[str] = None
    distance_km: int = Field(..., ge=0, description="Transit distance in KM")

    # Compliance fields
    supply_type: Optional[str] = "Outward"
    sub_supply_type: Optional[str] = "B2B"
    doc_type: Optional[str] = "Tax Invoice"
    doc_date: Optional[str] = None
    from_pincode: Optional[str] = None
    to_pincode: Optional[str] = None
    act_from_state_code: Optional[int] = None
    act_to_state_code: Optional[int] = None
    trans_mode: Optional[str] = "Road"
    uqc_code: Optional[str] = "UQC"
    vehicle_type: Optional[str] = "R" # R: Regular, O: ODC
    trans_doc_no: Optional[str] = None
    trans_doc_date: Optional[str] = None
    cess_non_advol_value: Optional[float] = 0.0
    other_value: Optional[float] = 0.0
    total_value: Optional[float] = None
    cgst_value: Optional[float] = 0.0
    sgst_value: Optional[float] = 0.0
    igst_value: Optional[float] = 0.0
    cess_value: Optional[float] = 0.0
    tot_inv_value: Optional[float] = None

    @field_validator("consignor_gstin", "consignee_gstin")
    @classmethod
    def validate_gstin(cls, v: str) -> str:
        if v == "URP":
            return v
        gstin_regex = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")
        if not gstin_regex.match(v):
            raise ValueError("Invalid GSTIN format. Must be a valid 15-character Indian GSTIN or URP.")
        return v

    @field_validator("hsn_code")
    @classmethod
    def validate_hsn(cls, v: str) -> str:
        if not re.match(r"^\d{4}(\d{2}|\d{4})?$", v):
            raise ValueError("HSN Code must be 4, 6, or 8 digits.")
        return v

    @field_validator("vehicle_number")
    @classmethod
    def validate_vehicle(cls, v: Optional[str]) -> Optional[str]:
        if v:
            if v.startswith("TM"):
                # Temporary vehicle registration (TMXXXXXX)
                if not re.match(r"^TM[A-Z0-9]{1,8}$", v, re.IGNORECASE):
                    raise ValueError("Temporary registration must start with TM followed by alphanumeric chars.")
                return v.upper()
            veh_regex = re.compile(r"^[A-Z]{2}[ -]?[0-9]{1,2}[ -]?[A-Z]{1,3}[ -]?[0-9]{4}$", re.IGNORECASE)
            if not veh_regex.match(v):
                raise ValueError("Invalid Indian vehicle registration number format.")
            return v.upper().replace(" ", "-")
        return v

class EWayBillCreate(EWayBillBase):
    pass

class EWayBillUpdateVehicle(BaseModel):
    vehicle_number: str

    @field_validator("vehicle_number")
    @classmethod
    def validate_vehicle(cls, v: str) -> str:
        if v.startswith("TM"):
            if not re.match(r"^TM[A-Z0-9]{1,8}$", v, re.IGNORECASE):
                raise ValueError("Temporary registration must start with TM.")
            return v.upper()
        veh_regex = re.compile(r"^[A-Z]{2}[ -]?[0-9]{1,2}[ -]?[A-Z]{1,3}[ -]?[0-9]{4}$", re.IGNORECASE)
        if not veh_regex.match(v):
            raise ValueError("Invalid Indian vehicle registration number format.")
        return v.upper().replace(" ", "-")

class EWayBillCancel(BaseModel):
    cancel_reason_code: int = Field(..., description="1: Duplicate, 2: Order Cancelled, 3: Data Entry Mistake, 4: Others")
    cancel_remarks: Optional[str] = None

class EWayBillResponse(EWayBillBase):
    id: UUID
    invoice_id: UUID
    ewb_number: Optional[str] = None
    status: str
    valid_until: Optional[datetime] = None
    qr_code_data: Optional[str] = None
    generated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
