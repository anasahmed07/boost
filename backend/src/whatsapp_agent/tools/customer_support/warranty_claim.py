from agents import function_tool, RunContextWrapper
from pydantic import Field, BaseModel
from typing import Optional, List
from whatsapp_agent.context.global_context import GlobalContext
from whatsapp_agent.database.warranty_claim import WarrantyClaimDB
from whatsapp_agent.schema.warranty_claim import WarrantyClaimSchema


class AttachmentInput(BaseModel):
    filename: str = Field(..., description="Filename of the attachment (e.g., image.jpg)")
    url: str = Field(..., description="Public URL of the attachment from the message")
    file_type: str = Field(..., description="Type of the file, e.g., image/png")

@function_tool
def process_warranty_claim(
    wrapper: RunContextWrapper[GlobalContext],
    product_name: str = Field(..., description="The name of the product for the warranty claim."),
    issue_description: str = Field(..., description="A detailed description of the issue with the product."),
    order_id: Optional[str] = Field(None, description="The order ID associated with the purchase of the product."),
    attachments: Optional[List[AttachmentInput]] = Field(None, description="List of attachment metadata (filename, image/vedio url, file_type) for supporting photos/vedios."),
    notes: Optional[str] = Field(None, description="Additional notes or comments about the warranty claim."),
) -> str:
    """
    Submit a warranty claim after the customer has explicitly agreed to the eligibility guidelines.

    Eligibility guidelines (the assistant must present and get confirmation before calling this tool):
      1) Product is within the warranty period from purchase date.
      2) Issue is a manufacturing defect or damaged parcel, not due to misuse, accidental damage, or normal wear.
      3) Proof of purchase is available (order ID or receipt and warranty card).
      4) Product has not been modified or repaired by unauthorized parties.
      5) A clear description of the fault is provided; photos/videos must be provided.

    Required fields: product_name, issue_description. Optional: order_id, attachments, notes.
    
    Args:
        product_name: The name of the product.
        issue_description: A detailed description of the issue.
        order_id: The order ID associated with the purchase.
        attachments: List of attachment metadata for supporting photos/videos/document.
        notes: Additional notes or comments about the warranty claim.
    
    Returns a confirmation that the claim has been created with status 'pending' and includes the claim ID.
    """
    # Basic input validation for clearer user feedback
    if not product_name or not product_name.strip():
        return "Please provide the product name to proceed with a warranty claim."
    if not issue_description or not issue_description.strip():
        return "Please provide a brief description of the issue to proceed with a warranty claim."

    # Validate customer context
    try:
        customer_phone = wrapper.context.customer_context.phone_number
    except Exception:
        return "We couldn't identify your phone number from the conversation. Please try again or contact support."
    if not customer_phone:
        return "We couldn't identify your phone number from the conversation. Please try again or contact support."

    # Normalize attachments safely
    normalized_attachments = []
    if attachments:
        try:
            normalized_attachments = [a.model_dump() for a in attachments]
        except Exception:
            return "Attachments format looks invalid. Please resend the photos/videos and try again."

    # Persist claim with robust error handling
    try:
        db = WarrantyClaimDB()
        claim = WarrantyClaimSchema(
            customer_phone=customer_phone,
            product_name=product_name.strip(),
            issue_description=issue_description.strip(),
            order_id=order_id.strip() if isinstance(order_id, str) else order_id,
            attachments=normalized_attachments,
            notes=notes.strip() if isinstance(notes, str) else notes,
        )
        result = db.add_claim(claim)
        claim_id = result.get('id') if isinstance(result, dict) else None
        if not claim_id:
            return "Sorry, we couldn't submit your warranty claim at the moment. Please try again shortly."
    except Exception:
        return "Sorry, we couldn't submit your warranty claim due to a system error. Please try again shortly."

    # Success message
    return (
        f"Thank you. We have received your warranty claim details for '{product_name.strip()}'. "
        f"Claim ID: {claim_id}. The case is now under review by our warranty department. "
        f"You confirm that you agree to our warranty claim guidelines. "
        f"Please ship your product to our Karachi office for inspection. "
        f"Note: If the claim is found to be fraudulent, we will not be responsible and no reimbursement will be provided."
    )
