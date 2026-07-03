from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.api.deps import get_db, get_current_user, check_role
from app.models.user import User
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.shipment import Shipment
from app.schemas.billing import InvoiceCreate, InvoiceResponse, PaymentCreate, PaymentResponse

router = APIRouter()

@router.get("/invoices", response_model=List[InvoiceResponse])
def get_invoices(db: Session = Depends(get_db), current_user: User = Depends(check_role(["Accountant"]))):
    """
    Retrieve all invoices belonging to shipments of the logged-in user's company tenant.
    """
    return db.query(Invoice).join(Shipment, Invoice.shipment_id == Shipment.id).filter(
        Shipment.company_id == current_user.company_id
    ).all()

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
    
    # Update invoice status if payment is completed
    if payment.status == "completed":
        invoice.status = "paid"
        
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
        trigger_notification(
            db=db,
            company_id=current_user.company_id,
            trigger_event="payment_logged",
            title="Invoice Payment Settled",
            message=f"Payment of ${float(payment.amount):.2f} settled for invoice {invoice.invoice_number}."
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

