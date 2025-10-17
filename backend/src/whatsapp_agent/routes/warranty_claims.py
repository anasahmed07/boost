from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from whatsapp_agent.database.warranty_claim import WarrantyClaimDB
from whatsapp_agent.schema.warranty_claim import WarrantyClaimSchema

warranty_claims_router = APIRouter(prefix="/warranty-claims", tags=["warranty-claims"])

# Request/Response models
class WarrantyClaimCreate(BaseModel):
    customer_phone: str
    product_name: str
    issue_description: str
    order_id: Optional[str] = None
    notes: Optional[str] = None

class WarrantyClaimUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class AttachmentUpload(BaseModel):
    filename: str
    url: str
    file_type: str

class WarrantyClaimUnifiedUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    attachment: Optional[AttachmentUpload] = None

class WarrantyClaimStats(BaseModel):
    total_claims: int
    pending_claims: int
    approved_claims: int
    rejected_claims: int

# Customer-facing routes
@warranty_claims_router.post("/", response_model=dict)
async def create_warranty_claim(
    claim_data: WarrantyClaimCreate,
):
    """Create a new warranty claim"""
    try:
        db = WarrantyClaimDB()
        claim = WarrantyClaimSchema(
            customer_phone=claim_data.customer_phone,
            product_name=claim_data.product_name,
            issue_description=claim_data.issue_description,
            order_id=claim_data.order_id,
            notes=claim_data.notes,
            attachments=[]
        )
        result = db.add_claim(claim)
        return {"message": "Warranty claim created successfully", "claim_id": result.get("id")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@warranty_claims_router.get("/all", response_model=List[WarrantyClaimSchema])
async def get_all_claims(
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """Get all warranty claims with optional filtering (admin only)"""
    try:
        db = WarrantyClaimDB()
        claims = db.get_all_claims(status=status, limit=limit, offset=offset)
        return claims
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Note: consolidated into a single PATCH endpoint above

@warranty_claims_router.get("/stats", response_model=WarrantyClaimStats)
async def get_claim_statistics():
    """Get warranty claim statistics (admin only)"""
    try:
        db = WarrantyClaimDB()
        all_claims = db.get_all_claims(limit=1000)  # Get more for stats
        
        total_claims = len(all_claims)
        pending_claims = len([c for c in all_claims if c.status == "pending"])
        approved_claims = len([c for c in all_claims if c.status == "approved"])
        rejected_claims = len([c for c in all_claims if c.status == "rejected"])
        
        return WarrantyClaimStats(
            total_claims=total_claims,
            pending_claims=pending_claims,
            approved_claims=approved_claims,
            rejected_claims=rejected_claims
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@warranty_claims_router.get("/customer/{customer_phone}", response_model=List[WarrantyClaimSchema])
async def get_customer_claims(customer_phone: str):
    """Get all warranty claims for a specific customer"""
    try:
        db = WarrantyClaimDB()
        claims = db.get_claims_by_customer(customer_phone)
        return claims
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@warranty_claims_router.get("/{claim_id}", response_model=WarrantyClaimSchema)
async def get_claim_details(claim_id: str):
    """Get specific warranty claim details"""
    try:
        db = WarrantyClaimDB()
        claim = db.get_claim_by_id(claim_id)
        if not claim:
            raise HTTPException(status_code=404, detail="Warranty claim not found")
        return claim
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@warranty_claims_router.patch("/{claim_id}", response_model=WarrantyClaimSchema)
async def update_claim(
    claim_id: str,
    update: WarrantyClaimUnifiedUpdate
):
    """Unified update endpoint: update status/notes and optionally add an attachment"""
    try:
        db = WarrantyClaimDB()

        updated_claim = None

        # Apply attachment update first (if provided)
        if update.attachment is not None:
            attachment_data = {
                "filename": update.attachment.filename,
                "url": update.attachment.url,
                "type": update.attachment.file_type,
                "uploaded_at": "now()"
            }
            updated_claim = db.add_attachment(claim_id, attachment_data)
            if not updated_claim:
                raise HTTPException(status_code=404, detail="Warranty claim not found")

        # Apply status/notes update if provided
        if update.status is not None or update.notes is not None:
            # Preserve existing status if not explicitly provided
            existing_status = None
            if update.status is None:
                if updated_claim is not None:
                    existing_status = updated_claim.status
                else:
                    current_claim = db.get_claim_by_id(claim_id)
                    if not current_claim:
                        raise HTTPException(status_code=404, detail="Warranty claim not found")
                    existing_status = current_claim.status

            updated_claim = db.update_claim_status(
                claim_id=claim_id,
                status=update.status if update.status is not None else existing_status,
                notes=update.notes
            )
            if not updated_claim:
                raise HTTPException(status_code=404, detail="Warranty claim not found")

        # If nothing was provided to update, return current claim
        if updated_claim is None:
            current = db.get_claim_by_id(claim_id)
            if not current:
                raise HTTPException(status_code=404, detail="Warranty claim not found")
            return current

        return updated_claim
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
