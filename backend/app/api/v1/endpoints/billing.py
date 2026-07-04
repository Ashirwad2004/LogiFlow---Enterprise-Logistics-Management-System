from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from app.api.deps import get_db, get_current_user, check_role
from app.models.user import User
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.shipment import Shipment
from app.schemas.billing import InvoiceCreate, InvoiceResponse, PaymentCreate, PaymentResponse

router = APIRouter()

@router.get("/invoices/unbilled-shipments")
def get_unbilled_shipments(
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Accountant", "Company Admin", "Super Admin"]))
):
    """
    Get all shipments belonging to the logged-in user's company tenant that have been delivered but have no invoice.
    """
    from app.models.customer import Customer
    unbilled = db.query(Shipment).filter(
        Shipment.company_id == current_user.company_id,
        Shipment.status == "delivered"
    ).filter(
        ~db.query(Invoice).filter(Invoice.shipment_id == Shipment.id).exists()
    ).all()
    
    res = []
    for s in unbilled:
        cust = db.query(Customer).filter(Customer.id == s.customer_id).first()
        cust_name = cust.name if cust else "Unknown"
        total_weight = sum(float(item.weight_kg or 0.0) * int(item.quantity or 1) for item in s.items)
        res.append({
            "id": str(s.id),
            "tracking_number": s.tracking_number,
            "pickup_address": s.pickup_address,
            "delivery_address": s.delivery_address,
            "actual_delivery": s.actual_delivery.isoformat() if s.actual_delivery else None,
            "customer_name": cust_name,
            "items_count": len(s.items),
            "total_weight": total_weight
        })
    return res

@router.post("/invoices/generate/{shipment_id}", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def generate_invoice_for_shipment(
    shipment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Accountant", "Company Admin", "Super Admin"]))
):
    """
    Manually generate an invoice for a specific shipment, using the company rate cards.
    """
    from app.models.company import Company
    
    shipment = db.query(Shipment).filter(
        Shipment.id == shipment_id,
        Shipment.company_id == current_user.company_id
    ).first()
    
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found or access denied.")
        
    existing_invoice = db.query(Invoice).filter(Invoice.shipment_id == shipment.id).first()
    if existing_invoice:
        raise HTTPException(status_code=400, detail="An invoice already exists for this shipment.")
        
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    prefix = company.invoice_prefix if company and company.invoice_prefix else "INV"
    tax_pct = float(company.tax_rate) / 100.0 if company and company.tax_rate is not None else 0.18
    base_rate = float(company.base_rate) if company and company.base_rate is not None else 50.00
    rate_per_kg = float(company.rate_per_kg) if company and company.rate_per_kg is not None else 0.50
    
    item_charge = 0.00
    for item in shipment.items:
        weight = float(item.weight_kg or 0.0)
        quantity = int(item.quantity or 1)
        item_charge += quantity * weight * rate_per_kg
        
    subtotal = base_rate + item_charge
    gst_amount = subtotal * tax_pct
    total_amount = subtotal + gst_amount
    
    import random
    inv_number = f"{prefix}-{datetime.now().year}-{random.randint(100000, 999999)}"
    
    db_invoice = Invoice(
        shipment_id=shipment.id,
        invoice_number=inv_number,
        subtotal=subtotal,
        tax_amount=gst_amount,
        total_amount=total_amount,
        status="unpaid",
        issued_at=datetime.utcnow()
    )
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)
    
    # Log Action
    from app.services.audit import log_action
    log_action(
        db=db,
        user_id=current_user.id,
        action="create_invoice",
        table_name="invoices",
        record_id=db_invoice.id,
        new_values={
            "invoice_number": db_invoice.invoice_number,
            "total_amount": float(db_invoice.total_amount)
        }
    )
    
    return db_invoice

@router.get("/invoices", response_model=List[InvoiceResponse])
def get_invoices(db: Session = Depends(get_db), current_user: User = Depends(check_role(["Accountant", "Customer", "Company Admin", "Super Admin"]))):
    """
    Retrieve all invoices belonging to shipments of the logged-in user's company tenant.
    """
    query = db.query(Invoice).join(Shipment, Invoice.shipment_id == Shipment.id).filter(
        Shipment.company_id == current_user.company_id
    )
    
    if current_user.role_name == "Customer":
        from app.models.customer import Customer
        customer_record = db.query(Customer).filter(Customer.email == current_user.email, Customer.company_id == current_user.company_id).first()
        if not customer_record:
            return []
        query = query.filter(Shipment.customer_id == customer_record.id)
        
    return query.all()

@router.post("/invoices", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(invoice_in: InvoiceCreate, db: Session = Depends(get_db), current_user: User = Depends(check_role(["Accountant"]))):
    """
    Manually register an invoice, verifying the shipment belongs to the same tenant company.
    """
    shipment = db.query(Shipment).filter(
        Shipment.id == invoice_in.shipment_id,
        Shipment.company_id == current_user.company_id
    ).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found or access denied.")
        
    if db.query(Invoice).filter(Invoice.invoice_number == invoice_in.invoice_number).first():
        raise HTTPException(status_code=400, detail="Invoice with this number already exists.")
    
    invoice = Invoice(**invoice_in.model_dump())
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice

@router.post("/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def create_payment(payment_in: PaymentCreate, db: Session = Depends(get_db), current_user: User = Depends(check_role(["Accountant"]))):
    """
    Log a payment for an invoice, securing company borders.
    """
    invoice = db.query(Invoice).join(Shipment, Invoice.shipment_id == Shipment.id).filter(
        Invoice.id == payment_in.invoice_id,
        Shipment.company_id == current_user.company_id
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found or access denied.")
        
    payment = Payment(
        **payment_in.model_dump(),
        paid_at=datetime.utcnow() if payment_in.status == "completed" else None
    )
    db.add(payment)
    db.flush()
    
    # Calculate outstanding balance based on all completed payments
    completed_payments_sum = sum(float(p.amount) for p in invoice.payments if p.status == "completed")
    if payment.status == "completed":
        completed_payments_sum += float(payment.amount)
        
    if completed_payments_sum >= float(invoice.total_amount):
        invoice.status = "paid"
    elif completed_payments_sum > 0:
        invoice.status = "partially_paid"
    else:
        invoice.status = "unpaid"
        
    db.commit()
    db.refresh(payment)
    
    from app.services.audit import log_action
    log_action(
        db=db,
        user_id=current_user.id,
        action="settle_invoice_payment",
        table_name="payments",
        record_id=payment.id,
        new_values={
            "invoice_number": invoice.invoice_number,
            "amount": float(payment.amount),
            "status": payment.status
        }
    )
    
    from app.services.notifications import trigger_notification
    if payment.status == "completed":
        from app.models.company import Company
        company = db.query(Company).filter(Company.id == current_user.company_id).first()
        currency = company.currency if company and company.currency else "USD"
        symbol = "₹" if currency == "INR" else "$"
        trigger_notification(
            db=db,
            company_id=current_user.company_id,
            trigger_event="payment_logged",
            title="Invoice Payment Settled",
            message=f"Payment of {symbol}{float(payment.amount):.2f} settled for invoice {invoice.invoice_number}. Outstanding balance: {symbol}{invoice.outstanding_balance:.2f}."
        )
    return payment

@router.get("/payments/{invoice_id}", response_model=List[PaymentResponse])
def get_payments_for_invoice(invoice_id: str, db: Session = Depends(get_db), current_user: User = Depends(check_role(["Accountant"]))):
    """
    Retrieve payments for a specific invoice, scoped by company tenant.
    """
    invoice = db.query(Invoice).join(Shipment, Invoice.shipment_id == Shipment.id).filter(
        Invoice.id == invoice_id,
        Shipment.company_id == current_user.company_id
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found or access denied.")
        
    return db.query(Payment).filter(Payment.invoice_id == invoice_id).all()

@router.get("/invoices/{invoice_id}/pdf")
def get_invoice_pdf(
    invoice_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate and download a beautifully formatted tax invoice PDF.
    """
    from app.models.company import Company
    from app.models.customer import Customer
    import io
    from datetime import timedelta
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")
        
    shipment = db.query(Shipment).filter(Shipment.id == invoice.shipment_id).first()
    if not shipment or shipment.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Shipment not found.")
        
    if current_user.role_name == "Customer":
        customer_record = db.query(Customer).filter(Customer.email == current_user.email, Customer.company_id == current_user.company_id).first()
        if not customer_record or shipment.customer_id != customer_record.id:
            raise HTTPException(status_code=404, detail="Invoice not found.")
        
    company = db.query(Company).filter(Company.id == shipment.company_id).first()
    customer = db.query(Customer).filter(Customer.id == shipment.customer_id).first()
    
    # PDF generation in memory
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=(612, 792), rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    story = []
    
    styles = getSampleStyleSheet()
    primary_color = colors.HexColor("#1e3a8a")
    secondary_color = colors.HexColor("#475569")
    
    title_style = ParagraphStyle(
        'InvoiceTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        textColor=primary_color,
        spaceAfter=10
    )
    
    company_style = ParagraphStyle(
        'CompanyHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        textColor=primary_color,
        spaceAfter=3
    )
    
    normal_style = ParagraphStyle(
        'NormalText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=secondary_color,
        spaceAfter=2
    )

    bold_style = ParagraphStyle(
        'BoldText',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=colors.black,
        spaceAfter=2
    )
    
    header_data = [
        [
            Paragraph(f"<b>{company.name if company else 'LogiFlow Cargo'}</b>", company_style),
            Paragraph(f"<b>TAX INVOICE</b>", ParagraphStyle('TaxInv', parent=title_style, alignment=2))
        ],
        [
            Paragraph(f"{company.address if company else 'Logistics Depot St 15'}<br/>Support: {company.support_email if company else 'support@logiflow.com'}", normal_style),
            Paragraph(f"<b>Invoice #:</b> {invoice.invoice_number}<br/><b>Status:</b> {invoice.status.upper()}<br/><b>Date:</b> {invoice.issued_at.strftime('%Y-%m-%d') if invoice.issued_at else ''}<br/><b>Due Date:</b> {(invoice.issued_at + timedelta(days=15)).strftime('%Y-%m-%d') if invoice.issued_at else 'Immediate'}", ParagraphStyle('RightText', parent=normal_style, alignment=2))
        ]
    ]
    header_table = Table(header_data, colWidths=[260, 260])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 20))
    
    bill_data = [
        [
            Paragraph("<b>CLIENT BILL TO:</b>", bold_style),
            Paragraph("<b>ROUTE INFO:</b>", bold_style)
        ],
        [
            Paragraph(f"<b>Name:</b> {customer.name if customer else 'Client Partner'}<br/><b>Email:</b> {customer.email if customer else ''}<br/><b>Billing Address:</b> {customer.billing_address if customer else 'N/A'}", normal_style),
            Paragraph(f"<b>Tracking #:</b> {shipment.tracking_number}<br/><b>Pickup:</b> {shipment.pickup_address}<br/><b>Delivery:</b> {shipment.delivery_address}", normal_style)
        ]
    ]
    bill_table = Table(bill_data, colWidths=[260, 260])
    bill_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(bill_table)
    story.append(Spacer(1, 25))
    
    currency = company.currency if company and company.currency else "USD"
    symbol = "Rs. " if currency == "INR" else "$"
    
    items_data = [
        [
            Paragraph("<b>Sl.</b>", bold_style),
            Paragraph("<b>Cargo Package Description</b>", bold_style),
            Paragraph("<b>Qty</b>", bold_style),
            Paragraph(f"<b>Unit Price ({currency})</b>", bold_style),
            Paragraph(f"<b>Total Amount ({currency})</b>", bold_style)
        ]
    ]
    
    tax_pct = float(company.tax_rate) if company and company.tax_rate else 18.00
    total_due = float(invoice.total_amount)
    subtotal = total_due / (1 + (tax_pct / 100.0))
    tax_amount = total_due - subtotal
    
    items_list = shipment.items
    if items_list:
        for idx, item in enumerate(items_list, 1):
            qty = int(item.quantity or 1)
            weight = float(item.weight_kg or 0.0)
            item_price = subtotal / len(items_list) / qty
            item_total = item_price * qty
            items_data.append([
                Paragraph(str(idx), normal_style),
                Paragraph(f"{item.description} ({weight} kg)", normal_style),
                Paragraph(str(qty), normal_style),
                Paragraph(f"{symbol}{item_price:.2f}", normal_style),
                Paragraph(f"{symbol}{item_total:.2f}", normal_style)
            ])
    else:
        items_data.append([
            Paragraph("1", normal_style),
            Paragraph("Freight Carriage Logistics Service Cargo", normal_style),
            Paragraph("1", normal_style),
            Paragraph(f"{symbol}{subtotal:.2f}", normal_style),
            Paragraph(f"{symbol}{subtotal:.2f}", normal_style)
        ])
        
    items_table = Table(items_data, colWidths=[30, 240, 50, 100, 100])
    items_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 15))
    
    summary_data = [
        [Paragraph("", normal_style), Paragraph("<b>Subtotal:</b>", ParagraphStyle('Sub', parent=normal_style, alignment=2)), Paragraph(f"{symbol}{subtotal:.2f}", ParagraphStyle('Val', parent=normal_style, alignment=2))],
        [Paragraph("", normal_style), Paragraph(f"<b>GST Tax ({tax_pct:.2f}%):</b>", ParagraphStyle('Tax', parent=normal_style, alignment=2)), Paragraph(f"{symbol}{tax_amount:.2f}", ParagraphStyle('Val', parent=normal_style, alignment=2))],
        [Paragraph("", normal_style), Paragraph("<b>Total Payable Due:</b>", ParagraphStyle('Tot', parent=bold_style, alignment=2)), Paragraph(f"{symbol}{total_due:.2f}", ParagraphStyle('ValBold', parent=bold_style, alignment=2))],
        [Paragraph("", normal_style), Paragraph("<b>Outstanding Balance:</b>", ParagraphStyle('Out', parent=bold_style, alignment=2)), Paragraph(f"{symbol}{invoice.outstanding_balance:.2f}", ParagraphStyle('ValOutBold', parent=bold_style, alignment=2))]
    ]
    summary_table = Table(summary_data, colWidths=[280, 140, 100])
    summary_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 40))
    
    footer_style = ParagraphStyle(
        'FooterText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        textColor=colors.HexColor("#64748b"),
        alignment=1,
        spaceAfter=2
    )
    story.append(Paragraph("Thank you for your business with LogiFlow Cargo Logistics!", ParagraphStyle('BoldFooter', parent=footer_style, fontName='Helvetica-Bold')))
    story.append(Paragraph("This is a computer-generated tax receipt document. No physical signature is required.", footer_style))
    story.append(Paragraph("LogiFlow Cargo Inc. — Compliance Audited Ledger System.", footer_style))
    
    doc.build(story)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=invoice-{invoice.invoice_number}.pdf"}
    )

@router.get("/reports")
def get_billing_reports(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Accountant", "Company Admin", "Super Admin"]))
):
    """
    Retrieve aggregated financial tax and revenue reports for the tenant company.
    """
    from typing import Optional
    
    query = db.query(Invoice).join(Shipment, Invoice.shipment_id == Shipment.id).filter(
        Shipment.company_id == current_user.company_id
    )
    
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(Invoice.issued_at >= start_dt)
        except ValueError:
            pass
            
    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            query = query.filter(Invoice.issued_at <= end_dt)
        except ValueError:
            pass
            
    invoices = query.all()
    
    gross_revenue = 0.0
    pending_receivables = 0.0
    tax_collected = 0.0
    discounts_given = 0.0
    monthly_data = {}
    
    for inv in invoices:
        tot = float(inv.total_amount)
        sub = float(inv.subtotal)
        tax = float(inv.tax_amount)
        disc = float(inv.discount_amount or 0.0)
        
        if inv.status == "paid":
            gross_revenue += tot
            tax_collected += tax
            discounts_given += disc
        elif inv.status == "unpaid":
            pending_receivables += tot
            
        if inv.issued_at:
            month_key = inv.issued_at.strftime("%b %Y")
            if month_key not in monthly_data:
                monthly_data[month_key] = {"revenue": 0.0, "tax": 0.0}
            if inv.status == "paid":
                monthly_data[month_key]["revenue"] += tot
                monthly_data[month_key]["tax"] += tax

    def parse_month_key(key):
        try:
            return datetime.strptime(key, "%b %Y")
        except Exception:
            return datetime.min
            
    sorted_months = sorted(monthly_data.keys(), key=parse_month_key)
    monthly_trend = [
        {
            "month": m,
            "revenue": monthly_data[m]["revenue"],
            "tax": monthly_data[m]["tax"]
        }
        for m in sorted_months
    ]
    
    return {
        "gross_revenue": gross_revenue,
        "pending_receivables": pending_receivables,
        "tax_collected": tax_collected,
        "discounts_given": discounts_given,
        "monthly_trend": monthly_trend
    }



