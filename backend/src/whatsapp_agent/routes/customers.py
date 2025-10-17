from fastapi import APIRouter, HTTPException, Query, Path
from pydantic import BaseModel
from typing import List, Optional, Literal

from whatsapp_agent.database.customer import CustomerDataBase
from whatsapp_agent.database.chat_history import ChatHistoryDataBase
from whatsapp_agent.schema.customer_schema import CustomerSchema
from whatsapp_agent.database.escalation_stats import EscalationStatsDatabase

customer_router = APIRouter(prefix="/customers", tags=["Customers"])

class CustomerListResponse(BaseModel):
    customers: List[CustomerSchema]
    total: int
    page: int
    limit: int
    total_pages: int
    has_next: bool
    has_previous: bool

class CustomerUpdateRequest(BaseModel):
    customer_name: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    company_name: Optional[str] = None
    tags: Optional[List[str]] = None

class CustomerSearchResponse(BaseModel):
    customers: List[CustomerSchema]
    total: int
    query: str
    page: int
    limit: int
    total_pages: int
    has_next: bool
    has_previous: bool

class HighValueCustomersResponse(BaseModel):
    customers: List[CustomerSchema]
    total: int
    min_spend_threshold: int
    page: int
    limit: int
    total_pages: int
    has_next: bool
    has_previous: bool

customer_db = CustomerDataBase()
chat_db = ChatHistoryDataBase()
escalation_stats_handler = EscalationStatsDatabase()

@customer_router.get("/")
async def get_customers(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    limit: int = Query(50, ge=1, le=1000, description="Number of customers per page"),
    customer_type: Optional[Literal["B2B", "D2C"]] = Query(None, description="Filter by customer type")
):
    """Get paginated list of customers with optional filtering."""
    try:
        # Calculate offset
        offset = (page - 1) * limit
        
        # Get total count first
        total_customers = customer_db.count_customers()
        
        # Get customers with pagination
        customers = customer_db.list_customers(limit=limit, offset=offset)
        
        # Apply customer type filter if specified
        if customer_type:
            customers = [c for c in customers if c.get("customer_type") == customer_type]
            # Recalculate total for filtered results
            all_customers = customer_db.list_customers(limit=10000, offset=0)  # Get all for filtering
            total_customers = len([c for c in all_customers if c.get("customer_type") == customer_type])
        
        # Calculate pagination metadata
        total_pages = (total_customers + limit - 1) // limit  # Ceiling division
        has_next = page < total_pages
        has_previous = page > 1
        
        return CustomerListResponse(
            customers=[CustomerSchema.model_validate(c) for c in customers],
            total=total_customers,
            page=page,
            limit=limit,
            total_pages=total_pages,
            has_next=has_next,
            has_previous=has_previous
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve customers: {str(e)}")

@customer_router.get("/search")
async def search_customers(
    q: str = Query(..., description="Search query for customer name, phone, or company"),
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    limit: int = Query(20, ge=1, le=100, description="Number of results per page")
):
    """Search customers by name, phone number, or company with pagination."""
    try:
        # Get all customers for search (in a real app, you'd want database-level search)
        all_customers = customer_db.list_customers(limit=10000, offset=0)
        
        # Simple text search across relevant fields
        results = []
        for customer in all_customers:
            search_fields = [
                customer.get("customer_name", "").lower(),
                customer.get("phone_number", "").lower(),
                customer.get("company_name", "").lower(),
                customer.get("email", "").lower()
            ]
            
            if any(q.lower() in field for field in search_fields):
                results.append(customer)
        
        # Calculate pagination
        total_results = len(results)
        total_pages = (total_results + limit - 1) // limit
        has_next = page < total_pages
        has_previous = page > 1
        
        # Apply pagination to results
        start_index = (page - 1) * limit
        end_index = start_index + limit
        paginated_results = results[start_index:end_index]
        
        return CustomerSearchResponse(
            customers=[CustomerSchema.model_validate(c) for c in paginated_results],
            total=total_results,
            query=q,
            page=page,
            limit=limit,
            total_pages=total_pages,
            has_next=has_next,
            has_previous=has_previous
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@customer_router.get("/escalated")
async def get_escalated_customers(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    limit: int = Query(50, ge=1, le=100, description="Number of customers per page")
):
    """Get all escalated customers with pagination."""
    try:
        # Get all customers to filter escalated ones
        all_customers = customer_db.list_customers(limit=10000, offset=0)
        escalated = [c for c in all_customers if c.get("escalation_status", False)]
        
        # Calculate pagination
        total_escalated = len(escalated)
        total_pages = (total_escalated + limit - 1) // limit
        has_next = page < total_pages
        has_previous = page > 1
        
        # Apply pagination
        start_index = (page - 1) * limit
        end_index = start_index + limit
        paginated_escalated = escalated[start_index:end_index]
        
        return CustomerListResponse(
            customers=[CustomerSchema.model_validate(c) for c in paginated_escalated],
            total=total_escalated,
            page=page,
            limit=limit,
            total_pages=total_pages,
            has_next=has_next,
            has_previous=has_previous
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get escalated customers: {str(e)}")

@customer_router.get("/high-value")
async def get_high_value_customers(
    min_spend: int = Query(10000, description="Minimum spend threshold"),
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    limit: int = Query(50, ge=1, le=100, description="Number of customers per page")
):
    """Get high-value customers based on spending with pagination."""
    try:
        # Get all customers to filter high-value ones
        all_customers = customer_db.list_customers(limit=10000, offset=0)
        high_value = [c for c in all_customers if (c.get("total_spend", 0) or 0) >= min_spend]
        
        # Sort by spend descending
        high_value.sort(key=lambda x: x.get("total_spend", 0) or 0, reverse=True)
        
        # Calculate pagination
        total_high_value = len(high_value)
        total_pages = (total_high_value + limit - 1) // limit
        has_next = page < total_pages
        has_previous = page > 1
        
        # Apply pagination
        start_index = (page - 1) * limit
        end_index = start_index + limit
        paginated_high_value = high_value[start_index:end_index]
        
        return HighValueCustomersResponse(
            customers=[CustomerSchema.model_validate(c) for c in paginated_high_value],
            total=total_high_value,
            min_spend_threshold=min_spend,
            page=page,
            limit=limit,
            total_pages=total_pages,
            has_next=has_next,
            has_previous=has_previous
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get high-value customers: {str(e)}")

@customer_router.get("/tags")
async def get_unique_tags():
    """Get a list of all unique tags used across all customers."""
    try:
        unique_tags = customer_db.get_unique_tags()
        
        return {
            "tags": unique_tags,
            "total": len(unique_tags)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve tags: {str(e)}")

@customer_router.get("/{phone_number}")
async def get_customer(
    phone_number: str = Path(..., description="Customer phone number")
):
    """Get customer details by phone number."""
    try:
        customer = customer_db.get_customer_by_phone(phone_number)
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        return customer
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve customer: {str(e)}")

@customer_router.put("/{phone_number}")
async def update_customer(
    phone_number: str = Path(..., description="Customer phone number"),
    updates: CustomerUpdateRequest = ...
):
    """Update customer information."""
    try:
        existing_customer = customer_db.get_customer_by_phone(phone_number)
        if not existing_customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        update_data = {k: v for k, v in updates.dict().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid updates provided")
        
        result = customer_db.update_customer(phone_number, update_data)
        if not result:
            raise HTTPException(status_code=500, detail="Failed to update customer")
        
        return {"message": "Customer updated successfully", "updated_fields": list(update_data.keys())}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update customer: {str(e)}")

@customer_router.post("/{phone_number}/escalate")
async def escalate_customer(phone_number: str = Path(..., description="Customer phone number")):
    """Escalate customer to human support."""
    try:
        success = customer_db.update_escalation_status(phone_number, True)
        if not success:
            raise HTTPException(status_code=404, detail="Customer not found")
        if success:
            escalation_stats_handler.increment_escalation_count(customer_type="D2C")
        return {"message": "Customer escalated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to escalate customer: {str(e)}")

@customer_router.post("/{phone_number}/de-escalate")
async def de_escalate_customer(phone_number: str = Path(..., description="Customer phone number")):
    """Remove escalation status from customer."""
    try:
        success = customer_db.update_escalation_status(phone_number, False)
        if success:
            escalation_stats_handler.increment_resolved_count()
        if not success:
            raise HTTPException(status_code=404, detail="Customer not found")
        return {"message": "Customer de-escalated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to de-escalate customer: {str(e)}")

@customer_router.delete("/{phone_number}")
async def delete_customer_and_chats(
    phone_number: str = Path(..., description="Customer phone number")
):
    """Delete a customer and their chat history by phone number.

    - Validates customer exists (404 if not found)
    - Attempts chat history deletion (best-effort)
    - Deletes customer record (fails with 500 if unable)
    """
    try:
        existing_customer = customer_db.get_customer_by_phone(phone_number)
        if not existing_customer:
            raise HTTPException(status_code=404, detail="Customer not found")

        # Best-effort delete of chat history (some customers may not have chats)
        chats_deleted = False
        try:
            chats_deleted = bool(chat_db.delete_chat(phone_number))
        except Exception:
            chats_deleted = False

        # Delete customer record
        customer_deleted = bool(customer_db.delete_customer(phone_number))
        if not customer_deleted:
            raise HTTPException(status_code=500, detail="Failed to delete customer")

        return {
            "message": "Customer deleted; chat history removed if present",
            "customer_deleted": True,
            "chats_deleted": chats_deleted,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete customer and chats: {str(e)}")

    except HTTPException:

        raise

    except Exception as e:

        raise HTTPException(status_code=500, detail=f"Failed to de-escalate customer: {str(e)}")



@customer_router.get("/search")

async def search_customers(

    q: str = Query(..., description="Search query for customer name, phone, or company"),

    limit: int = Query(20, ge=1, le=100)

):

    """Search customers by name, phone number, or company."""

    try:

        customers = customer_db.list_customers(limit=1000)

        

        # Simple text search across relevant fields

        results = []

        for customer in customers:

            search_fields = [

                customer.get("customer_name", "").lower(),

                customer.get("phone_number", "").lower(),

                customer.get("company_name", "").lower(),

                customer.get("email", "").lower()

            ]

            

            if any(q.lower() in field for field in search_fields):

                results.append(customer)

        

        return {

            "customers": [CustomerSchema.model_validate(c) for c in results[:limit]],

            "total": len(results),

            "query": q

        }

        

    except Exception as e:

        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")



@customer_router.get("/escalated")

async def get_escalated_customers(

    limit: int = Query(50, ge=1, le=100)

):

    """Get all escalated customers."""

    try:

        customers = customer_db.list_customers(limit=1000)

        escalated = [c for c in customers if c.get("escalation_status", False)]

        

        return {

            "customers": [CustomerSchema.model_validate(c) for c in escalated[:limit]],

            "total": len(escalated)

        }

        

    except Exception as e:

        raise HTTPException(status_code=500, detail=f"Failed to get escalated customers: {str(e)}")



@customer_router.get("/high-value")

async def get_high_value_customers(

    min_spend: int = Query(10000, description="Minimum spend threshold"),

    limit: int = Query(50, ge=1, le=100)

):

    """Get high-value customers based on spending."""

    try:

        customers = customer_db.list_customers(limit=1000)

        high_value = [c for c in customers if (c.get("total_spend", 0) or 0) >= min_spend]

        

        # Sort by spend descending

        high_value.sort(key=lambda x: x.get("total_spend", 0) or 0, reverse=True)

        

        return {

            "customers": [CustomerSchema.model_validate(c) for c in high_value[:limit]],

            "total": len(high_value),

            "min_spend_threshold": min_spend

        }

        

    except Exception as e:

        raise HTTPException(status_code=500, detail=f"Failed to get high-value customers: {str(e)}")





@customer_router.delete("/{phone_number}")

async def delete_customer_and_chats(

    phone_number: str = Path(..., description="Customer phone number")

):

    """Delete a customer and their chat history by phone number.



    - Validates customer exists (404 if not found)

    - Attempts chat history deletion (best-effort)

    - Deletes customer record (fails with 500 if unable)

    """

    try:

        existing_customer = customer_db.get_customer_by_phone(phone_number)

        if not existing_customer:

            raise HTTPException(status_code=404, detail="Customer not found")



        # Best-effort delete of chat history (some customers may not have chats)

        chats_deleted = False

        try:

            chats_deleted = bool(chat_db.delete_chat(phone_number))

        except Exception:

            chats_deleted = False



        # Delete customer record

        customer_deleted = bool(customer_db.delete_customer(phone_number))

        if not customer_deleted:

            raise HTTPException(status_code=500, detail="Failed to delete customer")



        return {

            "message": "Customer deleted; chat history removed if present",

            "customer_deleted": True,

            "chats_deleted": chats_deleted,

        }

    except HTTPException:

        raise

    except Exception as e:

        raise HTTPException(status_code=500, detail=f"Failed to delete customer and chats: {str(e)}")
