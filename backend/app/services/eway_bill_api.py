import random
import math
from datetime import datetime, timedelta
from typing import Dict, Any, List, Tuple

# Mock Databases for E-Way Bill Validation Engine
CANCELLED_GSTINS = {
    "27CANCELLED1234A": {
        "active_from": datetime(2018, 1, 1),
        "active_to": datetime(2023, 12, 31)
    }
}

PIN_TO_PIN_DISTANCE = {
    ("400001", "400002"): 10,
    ("400001", "110001"): 1400,
    ("560001", "560002"): 15,
    ("400001", "560001"): 1000,
    ("270001", "270002"): 60,
    ("110001", "110002"): 12,
}

STATE_PIN_PREFIX = {
    27: ["400", "401", "402", "410", "411", "412", "420", "430", "440"],  # Maharashtra
    7: ["110", "111", "112"],  # Delhi (07)
    29: ["560", "561", "562", "570", "580", "590"],  # Karnataka
    19: ["700", "710", "720", "730", "740"],  # West Bengal
    33: ["600", "610", "620", "630", "640"],  # Tamil Nadu
    36: ["500", "501", "502"],  # Telangana
}

ALLOWED_TAX_RATES = {0.0, 0.1, 0.25, 1.0, 1.5, 3.0, 5.0, 7.5, 12.0, 18.0, 28.0}

class EWayBillGovernmentAPI:
    @staticmethod
    def validate_eway_bill_request(
        consignor_gstin: str,
        consignee_gstin: str,
        hsn_code: str,
        invoice_number: str,
        distance_km: int,
        vehicle_number: str = None,
        company_is_e_invoice_enabled: bool = False,
        supply_type: str = "Outward",
        sub_supply_type: str = "B2B",
        doc_type: str = "Tax Invoice",
        doc_date_str: str = None,
        from_pincode: str = None,
        to_pincode: str = None,
        act_from_state_code: int = None,
        act_to_state_code: int = None,
        trans_mode: str = "Road",
        vehicle_type: str = "R",
        trans_doc_no: str = None,
        trans_doc_date_str: str = None,
        cess_non_advol_value: float = 0.0,
        other_value: float = 0.0,
        total_value: float = 0.0,
        cgst_value: float = 0.0,
        sgst_value: float = 0.0,
        igst_value: float = 0.0,
        cess_value: float = 0.0,
        tot_inv_value: float = 0.0,
        uqc_code: str = "UQC",
        item_count: int = 1,
        transporter_id: str = None
    ) -> List[str]:
        """
        Runs comprehensive portal validations. Returns a list of warning/alert strings.
        Raises ValueError if a validation blocks generation.
        """
        alerts = []

        # Parse Dates
        doc_date = datetime.strptime(doc_date_str, "%Y-%m-%d") if doc_date_str else datetime.utcnow()
        trans_doc_date = datetime.strptime(trans_doc_date_str, "%Y-%m-%d") if trans_doc_date_str else None

        # 1. Block for E-Invoice Enabled Suppliers (CGST Rule 138 / Notification 20/2020)
        if company_is_e_invoice_enabled:
            # Block B2B and Export Tax Invoices dated >= 01/10/2020
            if (sub_supply_type in ["B2B", "Export"]) and (doc_type == "Tax Invoice") and (doc_date >= datetime(2020, 10, 1)):
                raise ValueError(
                    "E-Way Bill generation blocked. Supplier is enabled for E-Invoice. "
                    "E-Way Bill must be generated along with E-Invoice IRN or with reference to it."
                )

        # 2. TDS/TCS restrictions
        if consignor_gstin.startswith("27TDS"):
            raise ValueError("TDS/TCS GSTINs cannot be used as supplier GSTINs for generating E-Way Bills.")

        # 3. Cancelled GSTIN Check
        for gstin, role in [(consignor_gstin, "consignor"), (consignee_gstin, "consignee")]:
            if gstin in CANCELLED_GSTINS:
                active_from = CANCELLED_GSTINS[gstin]["active_from"]
                active_to = CANCELLED_GSTINS[gstin]["active_to"]
                if not (active_from <= doc_date <= active_to):
                    raise ValueError(
                        f"Generation blocked. The {role} GSTIN {gstin} is cancelled and "
                        f"the document date ({doc_date.strftime('%Y-%m-%d')}) is outside its active period."
                    )

        # 4. Item Limit Check
        if item_count > 250:
            raise ValueError("Maximum number of items in each invoice cannot exceed 250 items.")

        # 5. Date Validations
        if doc_date > datetime.utcnow() + timedelta(days=1):  # allowance of 1 day buffer for timezones
            raise ValueError("Document Date should be less than or equal to current date.")
        if (datetime.utcnow() - doc_date).days > 180:
            raise ValueError("Limiting generation of E-Way Bill within 180 days of Document Date.")
        if trans_doc_date and trans_doc_date < doc_date:
            raise ValueError("Transport document Date should be greater than or equal to document date.")

        # 6. PIN Code and State Prefix Validations
        if from_pincode:
            if act_from_state_code and act_from_state_code in STATE_PIN_PREFIX:
                prefix = from_pincode[:3]
                if prefix not in STATE_PIN_PREFIX[act_from_state_code]:
                    raise ValueError(f"fromPincode {from_pincode} does not belong to the state code {act_from_state_code}.")
        if to_pincode:
            if act_to_state_code and act_to_state_code in STATE_PIN_PREFIX:
                prefix = to_pincode[:3]
                if prefix not in STATE_PIN_PREFIX[act_to_state_code]:
                    raise ValueError(f"toPincode {to_pincode} does not belong to the state code {act_to_state_code}.")

        # 7. Other Country normalization
        if act_from_state_code in [96, 99]:
            act_from_state_code = 99
        if act_to_state_code in [96, 99]:
            act_to_state_code = 99

        # 8. Same PIN Code checks
        if from_pincode and to_pincode and from_pincode == to_pincode:
            max_allowed = 300 if sub_supply_type == "Line Sales" else 100
            if distance_km > max_allowed:
                raise ValueError(
                    f"Same PIN Code transit. Maximum distance allowed is {max_allowed} km "
                    f"({sub_supply_type if sub_supply_type == 'Line Sales' else 'Regular'} movement)."
                )

        # 9. Max Distance Validation
        if distance_km > 4000:
            raise ValueError("The actual distance from source to destination cannot be greater than 4000 km.")

        # 10. SEZ Outward / Inward Rules
        is_consignee_sez = "SEZ" in consignee_gstin or consignee_gstin.endswith("SEZ")
        is_consignor_sez = "SEZ" in consignor_gstin or consignor_gstin.endswith("SEZ")
        if supply_type == "Outward" and is_consignee_sez:
            if act_to_state_code != 99:
                alerts.append("SEZ Alert: For SEZ Bill-To, Destination state code is overridden to 99 (Other Country).")
        if supply_type == "Inward" and is_consignor_sez:
            if act_from_state_code != 99:
                alerts.append("SEZ Alert: For SEZ Bill-From, Source state code is overridden to 99 (Other Country).")

        # 11. Tax Rate Validation
        # CGST/SGST/IGST rates checked in main API payload structure
        # Simple validation: if CGST rate and value are provided, SGST must also be provided
        if act_from_state_code == act_to_state_code and (act_from_state_code is not None):
            # Intrastate transaction
            if igst_value > 0.0:
                raise ValueError("Intrastate transaction cannot have IGST value.")
            if cgst_value <= 0.0 or sgst_value <= 0.0:
                alerts.append("Tax warning: Intrastate movement usually requires CGST and SGST rates and values.")
        else:
            # Interstate transaction or SEZ
            if (cgst_value > 0.0 or sgst_value > 0.0) and not (is_consignee_sez or is_consignor_sez):
                raise ValueError("Interstate transaction must pass IGST value instead of CGST/SGST.")

        # 12. Document Type vs Supply / Sub Supply Type
        if supply_type == "Outward" and sub_supply_type == "B2B" and doc_type != "Tax Invoice":
            raise ValueError("For Outward B2B transactions, Document Type must be Tax Invoice.")

        # 13. Financial Sum Check
        sum_of_values = total_value + cgst_value + sgst_value + igst_value + cess_value + other_value + cess_non_advol_value
        if sum_of_values > tot_inv_value + 2.00:
            raise ValueError(
                f"Validation Error: Sum of values ({sum_of_values:.2f}) exceeds total invoice value ({tot_inv_value:.2f}) "
                f"by more than the allowed ₹2.00 grace limit."
            )

        # 14. SMS Alert for high values (> 10 Crores = ₹100,000,000)
        if tot_inv_value > 100000000.0:
            alerts.append("SMS Alert: High-value transaction (> ₹10 Crores) registered. SMS notification dispatched to GSTIN administrators.")

        # 15. Part A Slip vs Vehicle Number
        if transporter_id and not vehicle_number:
            if trans_doc_no or trans_mode != "Road":
                pass
            else:
                # Part A Slip generated
                alerts.append("Part A Slip: Transporter ID provided without vehicle details. Part A slip generated.")
        elif not transporter_id and not vehicle_number and tot_inv_value > 50000.0:
            raise ValueError("Part B Alert: Vehicle Number or Transporter ID is mandatory for values above ₹50,000.")

        # 16. Mode specific validations
        if trans_mode == "Rail":
            if not trans_doc_no:
                raise ValueError("For Rail transportation, Railway Receipt (RR) number is mandatory in transDocNo.")
            # Prefix check
            if not trans_doc_no[0] in ["P", "F", "L"]:
                raise ValueError(
                    "Railway RR Number format invalid. Must start with prefix:\n"
                    "- 'P' for Parcel System\n"
                    "- 'F' for FOIS System\n"
                    "- 'L' for Leased Wagon"
                )
        elif trans_mode in ["Air", "Ship"]:
            if not trans_doc_no:
                raise ValueError(f"For {trans_mode} transportation, Transport Document Number (Airway Bill/Bill of Lading) is mandatory.")

        if trans_mode == "Ship" and vehicle_type == "ODC" and not vehicle_number:
            raise ValueError("ODC Vehicle type under Ship mode requires a valid vessel/barge registration number.")

        return alerts

    @classmethod
    def generate_eway_bill(
        cls,
        consignor_gstin: str,
        consignee_gstin: str,
        hsn_code: str,
        invoice_number: str,
        invoice_total: float,
        distance_km: int,
        vehicle_number: str = None,
        company_is_e_invoice_enabled: bool = False,
        supply_type: str = "Outward",
        sub_supply_type: str = "B2B",
        doc_type: str = "Tax Invoice",
        doc_date_str: str = None,
        from_pincode: str = None,
        to_pincode: str = None,
        act_from_state_code: int = None,
        act_to_state_code: int = None,
        trans_mode: str = "Road",
        vehicle_type: str = "R",
        trans_doc_no: str = None,
        trans_doc_date_str: str = None,
        cess_non_advol_value: float = 0.0,
        other_value: float = 0.0,
        total_value: float = 0.0,
        cgst_value: float = 0.0,
        sgst_value: float = 0.0,
        igst_value: float = 0.0,
        cess_value: float = 0.0,
        tot_inv_value: float = 0.0,
        uqc_code: str = "UQC",
        item_count: int = 1,
        transporter_id: str = None
    ) -> Dict[str, Any]:
        """
        Simulates NIC E-Way Bill Portal API handshake.
        Applies portal validations first.
        """
        # Run validations
        alerts = cls.validate_eway_bill_request(
            consignor_gstin=consignor_gstin,
            consignee_gstin=consignee_gstin,
            hsn_code=hsn_code,
            invoice_number=invoice_number,
            distance_km=distance_km,
            vehicle_number=vehicle_number,
            company_is_e_invoice_enabled=company_is_e_invoice_enabled,
            supply_type=supply_type,
            sub_supply_type=sub_supply_type,
            doc_type=doc_type,
            doc_date_str=doc_date_str,
            from_pincode=from_pincode,
            to_pincode=to_pincode,
            act_from_state_code=act_from_state_code,
            act_to_state_code=act_to_state_code,
            trans_mode=trans_mode,
            vehicle_type=vehicle_type,
            trans_doc_no=trans_doc_no,
            trans_doc_date_str=trans_doc_date_str,
            cess_non_advol_value=cess_non_advol_value,
            other_value=other_value,
            total_value=total_value,
            cgst_value=cgst_value,
            sgst_value=sgst_value,
            igst_value=igst_value,
            cess_value=cess_value,
            tot_inv_value=tot_inv_value,
            uqc_code=uqc_code,
            item_count=item_count,
            transporter_id=transporter_id
        )

        # Distance logic: replace 0 distance if pincodes are available in DB
        final_distance = distance_km
        if distance_km == 0 and from_pincode and to_pincode:
            pair = (from_pincode, to_pincode)
            if pair in PIN_TO_PIN_DISTANCE:
                final_distance = PIN_TO_PIN_DISTANCE[pair]
            else:
                raise ValueError("Distance is 0 and no pin-to-pin distance available in E-Way Bill master database.")
        
        # Pincode distance match warning check
        if from_pincode and to_pincode and final_distance > 0:
            pair = (from_pincode, to_pincode)
            if pair in PIN_TO_PIN_DISTANCE:
                sys_dist = PIN_TO_PIN_DISTANCE[pair]
                if sys_dist < 100:
                    if final_distance > sys_dist * 1.1:
                        raise ValueError(f"Distance {final_distance} km differs by more than +10% for system distance of {sys_dist} km.")
                else:
                    if not (sys_dist * 0.9 <= final_distance <= sys_dist * 1.1):
                        raise ValueError(f"Distance {final_distance} km differs by more than ±10% for system distance of {sys_dist} km.")
            else:
                alerts.append("The distance between the given PIN codes are not available in the system.")

        # Generate unique 12-digit E-Way Bill Number (starts with standard NIC code '39')
        ewb_number = f"39{random.randint(1000000000, 9999999999)}"
        
        # Calculate validity period: Rule 138(10) specifies 1 day per 200 km (or part thereof)
        validity_days = max(1, math.ceil(final_distance / 200.0))
        now = datetime.utcnow()
        valid_until = now + timedelta(days=validity_days)
        
        # Generate official-looking NIC verification QR Code string
        qr_code_data = (
            f"NIC-EWB|EwbNo:{ewb_number}|GenDt:{now.strftime('%Y-%m-%d %H:%M:%S')}|"
            f"Consignor:{consignor_gstin}|Consignee:{consignee_gstin}|"
            f"DocNo:{invoice_number}|Val:{tot_inv_value:.2f}|HSN:{hsn_code}"
        )
        
        return {
            "ewb_number": ewb_number,
            "status": "generated" if vehicle_number else "active_part_a",
            "valid_until": valid_until,
            "qr_code_data": qr_code_data,
            "generated_at": now,
            "distance_km": final_distance,
            "alerts": alerts
        }

    @staticmethod
    def cancel_eway_bill(ewb_number: str, cancel_reason_code: int, remarks: str = None) -> Dict[str, Any]:
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
        return {
            "ewb_number": ewb_number,
            "vehicle_number": vehicle_number,
            "updated_at": datetime.utcnow(),
            "status": "generated"
        }
