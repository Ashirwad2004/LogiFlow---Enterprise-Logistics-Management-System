from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.schemas.billing import InvoiceCreate, InvoiceResponse, PaymentCreate, PaymentResponse

router = APIRouter()

@router.get("/invoices", response_model=List[InvoiceResponse])
def get_invoices(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Simple query for now, ideally we would filter invoices linked to user's company's shipments
    return db.query(Invoice).all()

@router.post("/invoices", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(invoice_in: InvoiceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if db.query(Invoice).filter(Invoice.invoice_number == invoice_in.invoice_number).first():
        raise HTTPException(status_code=400, detail="Invoice with this number already exists.")
    
    invoice = Invoice(**invoice_in.model_dump())
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice

@router.post("/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def create_payment(payment_in: PaymentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    invoice = db.query(Invoice).filter(Invoice.id == payment_in.invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")
        
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
    return payment

@router.get("/payments/{invoice_id}", response_model=List[PaymentResponse])
def get_payments_for_invoice(invoice_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Payment).filter(Payment.invoice_id == invoice_id).all()
