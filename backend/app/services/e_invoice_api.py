import hashlib
import random
from jose import jwt
from datetime import datetime
from typing import Dict, Any

class EInvoiceGovernmentAPI:
    @staticmethod
    def generate_irn(
        supplier_gstin: str,
        doc_type: str,
        doc_number: str,
        financial_year: str = "2026-27"
    ) -> str:
        """
        Generates the standard Indian GST Invoice Reference Number (IRN).
        IRN is a SHA256 hash of (SupplierGSTIN + FinancialYear + DocType + DocNumber)
        """
        raw_str = f"{supplier_gstin}{financial_year}{doc_type}{doc_number}"
        return hashlib.sha256(raw_str.encode('utf-8')).hexdigest()

    @classmethod
    def generate_e_invoice(
        cls,
        supplier_gstin: str,
        recipient_gstin: str,
        doc_type: str,
        doc_number: str,
        invoice_total: float,
        tax_amount: float
    ) -> Dict[str, Any]:
        """
        Simulates generation of E-Invoice details from NIC/GSTN server.
        """
        if not supplier_gstin or len(supplier_gstin) != 15:
            raise ValueError("Supplier GSTIN must be exactly 15 characters.")
        if not recipient_gstin or (len(recipient_gstin) != 15 and recipient_gstin != "URP"):
            raise ValueError("Recipient GSTIN must be exactly 15 characters or URP.")
            
        irn = cls.generate_irn(supplier_gstin, doc_type, doc_number)
        ack_no = f"112{random.randint(100000000000, 999999999999)}"
        now = datetime.utcnow()
        
        # Simulate signed invoice (JWT)
        payload = {
            "supplier_gstin": supplier_gstin,
            "recipient_gstin": recipient_gstin,
            "doc_type": doc_type,
            "doc_number": doc_number,
            "invoice_total": invoice_total,
            "tax_amount": tax_amount,
            "irn": irn,
            "ack_no": ack_no,
            "ack_date": now.strftime("%Y-%m-%d %H:%M:%S")
        }
        signed_invoice = jwt.encode(payload, "secret-govt-key", algorithm="HS256")
        
        # Simulate signed QR code
        signed_qr_code = f"E-INV|IRN:{irn}|AckNo:{ack_no}|AckDt:{now.strftime('%Y-%m-%d %H:%M:%S')}|Val:{invoice_total:.2f}"
        
        return {
            "irn": irn,
            "ack_no": ack_no,
            "ack_date": now,
            "signed_invoice": signed_invoice,
            "signed_qr_code": signed_qr_code,
            "status": "active"
        }