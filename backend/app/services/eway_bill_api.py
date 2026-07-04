import random
from datetime import datetime, timedelta
import math
from typing import Dict, Any

class EWayBillGovernmentAPI:
    @staticmethod
    def generate_eway_bill(
        consignor_gstin: str,
        consignee_gstin: str,
        hsn_code: str,
        invoice_number: str,
        invoice_total: float,
        distance_km: int,
        vehicle_number: str = None
    ) -> Dict[str, Any]:
        """
        Simulates NIC E-Way Bill Portal API handshake.
        Applies GST threshold validation and formats details according to Indian CGST Rules.
        """
        # Threshold check: CGST Rule 138 specifies E-Way Bill is mandatory for values > INR 50,000.
        is_mandatory = invoice_total > 50000.0
        
        # Simulating government validation checks
        if not consignor_gstin or len(consignor_gstin) != 15:
            raise ValueError("Invalid Consignor GSTIN. Must be exactly 15 characters.")
        if not consignee_gstin or len(consignee_gstin) != 15:
            raise ValueError("Invalid Consignee GSTIN. Must be exactly 15 characters.")
        if not hsn_code or len(hsn_code) not in [4, 6, 8]:
            raise ValueError("Invalid HSN Code. Government portal requires 4, 6, or 8 digit HSN codes.")
            
        # Vehicle number validation (Part B check)
        if is_mandatory and not vehicle_number:
            raise ValueError("Part B Alert: Vehicle Number is mandatory for generating a valid e-Way Bill for transit.")

        # Generate unique 12-digit E-Way Bill Number (starts with standard NIC code '39')
        ewb_number = f"39{random.randint(1000000000, 9999999999)}"
        
        # Calculate validity period: Rule 138(10) specifies 1 day per 200 km (or part thereof)
        validity_days = max(1, math.ceil(distance_km / 200.0))
        now = datetime.utcnow()
        valid_until = now + timedelta(days=validity_days)
        
        # Generate official-looking NIC verification QR Code string
        qr_code_data = (
            f"NIC-EWB|EwbNo:{ewb_number}|GenDt:{now.strftime('%Y-%m-%d %H:%M:%S')}|"
            f"Consignor:{consignor_gstin}|Consignee:{consignee_gstin}|"
            f"DocNo:{invoice_number}|Val:{invoice_total:.2f}|HSN:{hsn_code}"
        )
        
        return {
            "ewb_number": ewb_number,
            "status": "generated" if vehicle_number else "active_part_a",
            "valid_until": valid_until,
            "qr_code_data": qr_code_data,
            "generated_at": now
        }

    @staticmethod
    def cancel_eway_bill(ewb_number: str, cancel_reason_code: int, remarks: str = None) -> Dict[str, Any]:
        """
        Simulates cancellation request to government NIC portal.
        Note: Rules specify that EWB can only be cancelled within 24 hours of generation.
        """
        reasons = {
            1: "Duplicate E-Way Bill",
            2: "Order Cancelled",
            3: "Data Entry Mistake",
            4: "Others"
        }
        reason_text = reasons.get(cancel_reason_code, "Others")
        
        return {
            "ewb_number": ewb_number,
            "status": "cancelled",
            "cancelled_at": datetime.utcnow(),
            "reason": reason_text,
            "remarks": remarks
        }

    @staticmethod
    def update_transshipment_vehicle(ewb_number: str, vehicle_number: str) -> Dict[str, Any]:
        """
        Simulates Part B vehicle number update on Government portal due to breakdown/transshipment.
        """
        return {
            "ewb_number": ewb_number,
            "vehicle_number": vehicle_number,
            "updated_at": datetime.utcnow(),
            "status": "generated"
        }
