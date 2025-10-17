from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import re
from pywa.types.templates import TemplateStatus, TemplateLanguage
from whatsapp_agent._debug import Logger
from whatsapp_agent.utils.wa_instance import wa
from whatsapp_agent.database.template_delivery import TemplateDeliveryDataBase
from whatsapp_agent.schema.template_delivery import (
    BulkDeliveryResponse, 
    DeliveryStatsResponse, 
    DeliveryStatus
)
from whatsapp_agent.utils.template_delivery_processor import TemplateDeliveryProcessor
import asyncio
templates_router = APIRouter(prefix="/template", tags=["Templates"])


# ------------------ Pydantic Models ------------------
class TemplateVariable(BaseModel):
    name: str
    type: str
    example: Optional[str] = None


class TemplateComponent(BaseModel):
    type: str
    format: Optional[str] = None
    text: Optional[str] = None
    variables: List[TemplateVariable] = []


class TemplateDetails(BaseModel):
    id: str
    name: str
    language: str
    status: str
    category: str
    components: List[TemplateComponent]
    total_variables: int

class VariablePayload(BaseModel):
    name: str
    value: str  # [static, $dynamic]

class FrontendTemplatePayload(BaseModel):
    to: List[str]
    variables: List[VariablePayload]
    campaign_id: Optional[str] = None

# ------------------ Helper Functions ------------------
def extract_variables_from_text(text: str) -> List[TemplateVariable]:
    """Extract variables from template text like {{variable_name}}"""
    if not text:
        return []
    variables = re.findall(r"\{\{([^}]+)\}\}", text)
    return [
        TemplateVariable(
            name=var.strip(),
            type="text",
            example=generate_example_for_variable(var.strip()),
        )
        for var in variables
    ]


def generate_example_for_variable(var_name: str) -> str:
    """Generate meaningful examples based on variable names"""
    var_lower = var_name.lower()
    if "name" in var_lower:
        return "John Doe"
    elif "email" in var_lower:
        return "john@example.com"
    elif "phone" in var_lower:
        return "+1234567890"
    elif "date" in var_lower:
        return "2025-09-10"
    elif "time" in var_lower:
        return "14:30"
    elif "order" in var_lower or "id" in var_lower:
        return "12345"
    elif "amount" in var_lower or "price" in var_lower:
        return "99.99"
    elif "code" in var_lower or "otp" in var_lower:
        return "123456"
    elif "url" in var_lower or "link" in var_lower:
        return "https://example.com"
    elif "company" in var_lower or "business" in var_lower:
        return "ABC Company"
    elif "product" in var_lower:
        return "Product Name"
    elif "address" in var_lower:
        return "123 Main St, City"
    return f"example_{var_name}"


def extract_variables_from_url(url: str) -> List[TemplateVariable]:
    """Extract variables from URL like {{1}}, {{2}}, etc."""
    if not url:
        return []
    variables = re.findall(r"\{\{(\d+)\}\}", url)
    return [
        TemplateVariable(name=f"url_param_{var}", type="text", example=f"example_{var}")
        for var in variables
    ]


def parse_template_components(template_obj) -> List[TemplateComponent]:
    """Parse template components and extract variables"""
    components = []
    if not hasattr(template_obj, "components"):
        return components

    for component in template_obj.components:
        variables = []
        text_content = getattr(component, "text", None)
        comp_type = getattr(component, "type", "unknown")
        format_type = getattr(component, "format", None)

        if text_content:
            variables.extend(extract_variables_from_text(text_content))

        if hasattr(component, "buttons"):
            for button in component.buttons:
                if getattr(button, "url", None):
                    variables.extend(extract_variables_from_url(button.url))

        components.append(
            TemplateComponent(
                type=comp_type.lower(),
                format=format_type,
                text=text_content,
                variables=variables,
            )
        )
    return components


@templates_router.get("/structure/example")
async def get_structure():
    return {
        "frontend_payload": {
            "campaign_id": "string (optional)",
            "to": ["string"],
            "variables": [
                {
                    "name": "string -> from template",
                    "value": "string -> static or dynamic",  # [static, $dynamic]
                },
            ],
        },
        "dynamic_values": [
            "$dynamic_campaign_prizes",
            "$dynamic_campaign_name",
            "$dynamic_campaign_start_date",
            "$dynamic_campaign_end_date",
            "$dynamic_referral_code",
            "$dynamic_customer_name",
            "$dynamic_customer_email",
            "$dynamic_codes"
        ],
        "route": "/template/{template_id}/send_bulk",
    }


# ------------------ Routes ------------------
@templates_router.get("/", response_model=List[Dict[str, Any]])
async def list_templates():
    """List all approved WhatsApp templates"""
    if not wa:
        raise HTTPException(status_code=500, detail="WhatsApp client not initialized")

    try:
        templates = await wa.get_templates()
        return [
            {
                "id": t.id,
                "name": t.name,
                "language": getattr(t.language, "value", str(t.language)),
                "status": getattr(t.status, "value", str(t.status)),
                "category": getattr(t.category, "value", str(t.category)),
            }
            for t in templates
            if getattr(t, "status", None) == TemplateStatus.APPROVED
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch templates: {str(e)}")


@templates_router.get("/{template_name}", response_model=TemplateDetails)
async def get_template_details(template_name: str):
    """Get detailed information about a specific template including variables"""
    if not wa:
        raise HTTPException(status_code=500, detail="WhatsApp client not initialized")

    try:
        templates = await wa.get_templates()
        template = next((t for t in templates if t.name == template_name), None)
        if not template:
            template = await wa.get_template(template_id=template_name)
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

        components = parse_template_components(template)
        return TemplateDetails(
            id=getattr(template, "id", template_name),
            name=getattr(template, "name", template_name),
            language=getattr(template, "language", "en"),
            status=getattr(template, "status", "approved"),
            category=getattr(template, "category", "unknown"),
            components=components,
            total_variables=sum(len(c.variables) for c in components),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch template details: {str(e)}")

@templates_router.post("/{template_id}/send_bulk", response_model=BulkDeliveryResponse)
async def send_bulk_message(
    template_id: str,
    data: FrontendTemplatePayload,
    background_tasks: BackgroundTasks
):
    """
    Send bulk template messages to multiple recipients asynchronously.
    Returns immediately with job status and processes messages in background.
    
    - **template_id**: The WhatsApp template ID to use
    - **data**: Payload containing recipients and template variables
    """
    try:
        # Validate input data
        if not data.to or len(data.to) == 0:
            raise HTTPException(status_code=400, detail="No recipients provided")
        
        if not data.variables:
            raise HTTPException(status_code=400, detail="No template variables provided")
        
        # Get template to validate it exists
        template = await wa.get_template(template_id=template_id)
        if not template:
            raise HTTPException(status_code=404, detail=f"Template {template_id} not found")
        
        # Create bulk delivery job
        delivery_db = TemplateDeliveryDataBase()
        job_id = delivery_db.create_bulk_job(
            template_id=template_id,
            template_name=template.name,
            total_recipients=len(data.to),
            campaign_id=data.campaign_id
        )
        
        # Start background processing
        processor = TemplateDeliveryProcessor()
        background_tasks.add_task(
            processor.process_bulk_delivery,
            job_id=job_id,
            template_id=template_id,
            template_name=template.name,
            recipients=data.to,
            variables=[var.dict() for var in data.variables],
            campaign_id=data.campaign_id
        )
        
        # Calculate estimated completion time (rough estimate: 1 second per message)
        estimated_seconds = len(data.to) * 1
        estimated_time = f"{estimated_seconds} seconds" if estimated_seconds < 60 else f"{estimated_seconds // 60} minutes"
        
        return BulkDeliveryResponse(
            job_id=job_id,
            status=DeliveryStatus.PROCESSING,
            message="Bulk delivery job started successfully. Messages are being processed in the background.",
            template_id=template_id,
            template_name=template.name,
            total_recipients=len(data.to),
            estimated_completion_time=estimated_time
        )
            
    except HTTPException:
        raise
    except Exception as e:
        Logger.error(f"Unexpected error in send_bulk_message: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@templates_router.get("/delivery/{job_id}/status", response_model=DeliveryStatsResponse)
async def get_delivery_status(job_id: str):
    """
    Get the status of a bulk delivery job.
    
    - **job_id**: The job ID returned from the send_bulk endpoint
    """
    try:
        delivery_db = TemplateDeliveryDataBase()
        
        # Get bulk job details
        bulk_job = delivery_db.get_bulk_job(job_id)
        if not bulk_job:
            raise HTTPException(status_code=404, detail=f"Delivery job {job_id} not found")
        
        # Get delivery statistics
        stats = delivery_db.get_delivery_stats_by_job(job_id)
        
        # Get individual delivery records (optional, for detailed view)
        delivery_records = delivery_db.get_delivery_records_by_job(job_id)
        
        return DeliveryStatsResponse(
            job_id=job_id,
            template_id=bulk_job.template_id,
            template_name=bulk_job.template_name,
            campaign_id=bulk_job.campaign_id,
            status=bulk_job.status,
            total_recipients=bulk_job.total_recipients,
            successful_sends=bulk_job.successful_sends,
            failed_sends=bulk_job.failed_sends,
            pending_sends=stats.get("pending", 0) + stats.get("processing", 0),
            error_message=bulk_job.error_message,
            created_at=bulk_job.created_at,
            updated_at=bulk_job.updated_at,
            completed_at=bulk_job.completed_at,
            delivery_details=delivery_records
        )
        
    except HTTPException:
        raise
    except Exception as e:
        Logger.error(f"Error getting delivery status for job {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get delivery status: {str(e)}")

@templates_router.get("/delivery/jobs/recent")
async def get_recent_delivery_jobs(limit: int = 10):
    """
    Get recent bulk delivery jobs.
    
    - **limit**: Number of recent jobs to return (default: 10, max: 50)
    """
    try:
        if limit > 50:
            limit = 50
            
        delivery_db = TemplateDeliveryDataBase()
        recent_jobs = delivery_db.get_recent_bulk_jobs(limit)
        
        return {
            "jobs": recent_jobs,
            "total": len(recent_jobs)
        }
        
    except Exception as e:
        Logger.error(f"Error getting recent delivery jobs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get recent jobs: {str(e)}")