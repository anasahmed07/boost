from typing import List, Optional
from whatsapp_agent.database.base import DataBase
from whatsapp_agent.schema.warranty_claim import WarrantyClaimSchema

class WarrantyClaimDB(DataBase):
    TABLE_NAME = "warranty_claims"

    def __init__(self):
        super().__init__()

    def add_claim(self, claim: WarrantyClaimSchema) -> dict:
        """Adds a new warranty claim to the database."""
        response = self.supabase.table(self.TABLE_NAME).insert(claim.model_dump(exclude_none=True)).execute()
        return response.data[0] if response.data else {}

    def get_claims_by_customer(self, customer_phone: str) -> List[WarrantyClaimSchema]:
        """Retrieves all warranty claims for a specific customer."""
        response = self.supabase.table(self.TABLE_NAME).select("*").eq("customer_phone", customer_phone).execute()
        return [WarrantyClaimSchema(**claim) for claim in response.data]

    def get_claim_by_id(self, claim_id: str) -> Optional[WarrantyClaimSchema]:
        """Retrieves a specific warranty claim by ID."""
        response = self.supabase.table(self.TABLE_NAME).select("*").eq("id", claim_id).execute()
        if response.data:
            return WarrantyClaimSchema(**response.data[0])
        return None

    def update_claim_status(self, claim_id: str, status: str, notes: Optional[str] = None) -> Optional[WarrantyClaimSchema]:
        """Updates the status and optionally notes of a warranty claim."""
        update_data = {"status": status, "updated_at": "now()"}
        if notes is not None:
            update_data["notes"] = notes
        
        response = self.supabase.table(self.TABLE_NAME).update(update_data).eq("id", claim_id).execute()
        if response.data:
            return WarrantyClaimSchema(**response.data[0])
        return None

    def add_attachment(self, claim_id: str, attachment: dict) -> Optional[WarrantyClaimSchema]:
        """Adds an attachment to a warranty claim."""
        # Get current claim
        claim = self.get_claim_by_id(claim_id)
        if not claim:
            return None
        
        # Add new attachment to existing attachments
        current_attachments = claim.attachments or []
        current_attachments.append(attachment)
        
        response = self.supabase.table(self.TABLE_NAME).update({
            "attachments": current_attachments,
            "updated_at": "now()"
        }).eq("id", claim_id).execute()
        
        if response.data:
            return WarrantyClaimSchema(**response.data[0])
        return None

    def get_all_claims(self, status: Optional[str] = None, limit: int = 100, offset: int = 0) -> List[WarrantyClaimSchema]:
        """Retrieves all warranty claims with optional status filter."""
        query = self.supabase.table(self.TABLE_NAME).select("*")

        if status:
            query = query.eq("status", status)

        # Use order + limit/offset to avoid client-specific range semantics
        query = query.order("created_at", desc=True).limit(limit).offset(offset)
        response = query.execute()

        return [WarrantyClaimSchema(**claim) for claim in response.data]
