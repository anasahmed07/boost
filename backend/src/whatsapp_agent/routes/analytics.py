import datetime
from math import ceil
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, List, Any

from whatsapp_agent.database.customer import CustomerDataBase
from whatsapp_agent.database.referral import ReferralDataBase
from whatsapp_agent.database.message_stats import MessageStatsDatabase
from whatsapp_agent.database.escalation_stats import EscalationStatsDatabase
from whatsapp_agent.utils.current_time import _get_current_karachi_time
from whatsapp_agent._debug import Logger

analytics_router = APIRouter(prefix="/analytics",tags=["analytics"])

class CustomerStatsResponse(BaseModel):
    total_customers: int
    active_customers: int
    escalated_customers: int
    b2b_customers: int
    d2c_customers: int
    avg_total_spend: float

class MessageStatsResponse(BaseModel):
    total_conversations: int
    total_messages: int
    avg_messages_per_conversation: float
    message_types: Dict[str, int]
    sender_types: Dict[str, int]
    avg_messages_per_day: float
    active_days: int
    
    @classmethod
    def from_summary(cls, total_conversations: int, message_summary: Dict[str, Any], daily_stats: List[Dict[str, Any]]) -> "MessageStatsResponse":
        active_days = len(daily_stats)
        total_messages = sum(day.get('total_messages', 0) for day in daily_stats)
        
        message_types = {
            'text': sum(day.get('text_messages', 0) for day in daily_stats),
            'image': sum(day.get('image_messages', 0) for day in daily_stats),
            'video': sum(day.get('video_messages', 0) for day in daily_stats),
            'audio': sum(day.get('audio_messages', 0) for day in daily_stats),
            'document': sum(day.get('document_messages', 0) for day in daily_stats)
        }
        
        sender_types = {
            'customer': sum(day.get('total_customer_messages', 0) for day in daily_stats),
            'agent': sum(day.get('total_agent_messages', 0) for day in daily_stats),
            'representative': sum(day.get('total_representative_messages', 0) for day in daily_stats)
        }
        
        return cls(
            total_conversations=total_conversations,
            total_messages=total_messages,
            avg_messages_per_conversation=round(total_messages / total_conversations if total_conversations > 0 else 0, 2),
            avg_messages_per_day=round(total_messages / active_days if active_days > 0 else 0, 2),
            message_types=message_types,
            sender_types=sender_types,
            active_days=active_days
        )

class EscalationStatsResponse(BaseModel):
    total_escalations: int
    total_resolved: int
    resolution_rate: float
    b2b_escalations: int
    d2c_escalations: int
    active_days: int
    avg_escalations_per_day: float
    
    @classmethod
    def from_summary(cls, daily_stats: List[Dict[str, Any]]) -> "EscalationStatsResponse":
        active_days = len(daily_stats)
        total_escalations = sum(day.get('total_escalations', 0) for day in daily_stats)
        total_resolved = sum(day.get('total_resolved', 0) for day in daily_stats)
        
        return cls(
            total_escalations=total_escalations,
            total_resolved=total_resolved,
            resolution_rate=round(total_resolved / total_escalations * 100 if total_escalations > 0 else 0, 2),
            b2b_escalations=sum(day.get('b2b_escalations', 0) for day in daily_stats),
            d2c_escalations=sum(day.get('d2c_escalations', 0) for day in daily_stats),
            active_days=active_days,
            avg_escalations_per_day=round(total_escalations / active_days if active_days > 0 else 0, 2)
        )

class AnalyticsOverviewResponse(BaseModel):
    customer_stats: CustomerStatsResponse
    message_stats: MessageStatsResponse
    escalation_stats: EscalationStatsResponse
    top_customers_by_spend: List[Dict]

customer_db = CustomerDataBase()
message_stats = MessageStatsDatabase()
escalation_stats = EscalationStatsDatabase()

@analytics_router.get("/overview")
async def get_analytics_overview():
    """Get comprehensive analytics overview including customer stats, message stats, and engagement metrics.
    
    Message stats are for the last 30 days by default. This provides a consistent and relevant
    window for analysis while maintaining good performance."""
    try:
        # Get total customer count first for validation
        total_customers = customer_db.count_customers()
        
        # Get all customers for accurate analytics
        customers = customer_db.list_customers()  # No limit = fetch all
        if not customers:
            Logger.warning("No customers found in the database")
            customers = []
            total_customers = 0
        
        Logger.info(f"Processing analytics for {len(customers)} customers")
        
        # Basic customer metrics
        active_customers = sum(1 for c in customers if c.get("is_active", False))
        escalated_customers = sum(1 for c in customers if c.get("escalation_status", False))
        b2b_customers = sum(1 for c in customers if c.get("customer_type") == "B2B")
        d2c_customers = sum(1 for c in customers if c.get("customer_type") == "D2C")
        
        # Financial metrics
        total_spend = sum(c.get("total_spend", 0) or 0 for c in customers)
        avg_total_spend = total_spend / total_customers if total_customers > 0 else 0
        high_value_customers = sum(1 for c in customers if (c.get("total_spend", 0) or 0) > 10000)
        
        # Top customers by spend with more details
        top_customers = sorted([
            {
                "phone_number": c.get("phone_number"),
                "name": c.get("customer_name"),
                "company": c.get("company_name"),
                "customer_type": c.get("customer_type"),
                "spend": c.get("total_spend", 0) or 0,
                "is_active": c.get("is_active", False),
                "escalation_status": c.get("escalation_status", False)
            } 
            for c in customers
            if c.get("total_spend", 0) or 0 > 0  # Only include customers with some spend
        ], key=lambda x: x["spend"], reverse=True)[:5]
        
        customer_stats = CustomerStatsResponse(
            total_customers=total_customers,
            active_customers=active_customers,
            escalated_customers=escalated_customers,
            b2b_customers=b2b_customers,
            d2c_customers=d2c_customers,
            avg_total_spend=round(avg_total_spend, 2)
        )
        
        # Get message analytics (last 30 days by default)
        current_date = _get_current_karachi_time().date()
        start_date = str(current_date - datetime.timedelta(days=30))
        stats_data = message_stats.get_stats_in_range(start_date=start_date)
        
        if not stats_data:
            Logger.warning(f"No message stats found for date range starting {start_date}")
            stats_data = []
            
        # Create message stats response with enhanced metrics
        message_stats_response = MessageStatsResponse.from_summary(
            total_customers,
            {},  # Empty dict as we're not using this parameter anymore
            stats_data
        )
        
        # Get escalation analytics (last 30 days)
        escalation_data = escalation_stats.get_stats_in_range(start_date=start_date)
        if not escalation_data:
            Logger.warning(f"No escalation stats found for date range starting {start_date}")
            escalation_data = []
        
        # Create escalation stats response
        escalation_stats_response = EscalationStatsResponse.from_summary(escalation_data)
        
        return AnalyticsOverviewResponse(
            customer_stats=customer_stats,
            message_stats=message_stats_response,
            escalation_stats=escalation_stats_response,
            top_customers_by_spend=top_customers
        )
        
    except Exception as e:
        Logger.error(f"Failed to generate analytics overview: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate analytics overview: {str(e)}"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate analytics: {str(e)}")

@analytics_router.get("/customers/stats")
async def get_customers_stats():
    """Get detailed customer statistics."""
    try:
        customers = customer_db.list_customers()
        
        stats = {
            "total": len(customers),
            "active": sum(1 for c in customers if c.get("is_active", False)),
            "inactive": sum(1 for c in customers if not c.get("is_active", False)),
            "escalated": sum(1 for c in customers if c.get("escalation_status", False)),
            "by_type": {
                "B2B": sum(1 for c in customers if c.get("customer_type") == "B2B"),
                "D2C": sum(1 for c in customers if c.get("customer_type") == "D2C")
            },
            "spend_analysis": {
                "total_spend": sum(c.get("total_spend", 0) or 0 for c in customers),
                "avg_spend": sum(c.get("total_spend", 0) or 0 for c in customers) / len(customers) if customers else 0,
                "high_value_customers": sum(1 for c in customers if (c.get("total_spend", 0) or 0) > 10000)
            }
        }
        
        return stats
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate customer stats: {str(e)}")

@analytics_router.get("/escalations")
async def get_escalation_stats(start_date: str = None, end_date: str = None):
    """Get comprehensive escalation analytics including both current status and historical stats.
    If no dates are specified for historical stats, returns stats for the last 30 days."""
    try:
        # Get current customer escalation status
        customers = customer_db.list_customers()
        escalated = [c for c in customers if c.get("escalation_status", False)]
        
        current_stats = {
            "current_total_escalations": len(escalated),
            "current_escalation_rate": round(len(escalated) / len(customers) * 100 if customers else 0, 2),
            "current_escalated_by_type": {
                "B2B": sum(1 for c in escalated if c.get("customer_type") == "B2B"),
                "D2C": sum(1 for c in escalated if c.get("customer_type") == "D2C")
            },
            "escalated_customers": [
                {
                    "phone_number": c.get("phone_number"), 
                    "customer_name": c.get("customer_name"),
                    "customer_type": c.get("customer_type"),
                    "total_spend": c.get("total_spend", 0) or 0,
                    "company_name": c.get("company_name")
                }
                for c in escalated
            ]
        }
        
        # Get historical escalation stats
        stats_data = escalation_stats.get_stats_in_range(start_date, end_date)
        if not stats_data:
            Logger.warning(f"No historical escalation stats found for the specified date range")
            stats_data = []
            
        historical_stats = EscalationStatsResponse.from_summary(stats_data)
        
        return {
            **current_stats,
            "historical_stats": {
                **historical_stats.dict(),
                "daily_breakdown": stats_data
            }
        }
        
    except Exception as e:
        Logger.error(f"Failed to get escalation stats: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get escalation stats: {str(e)}"
        )

@analytics_router.get("/messages/stats")
async def get_message_stats(start_date: str = None, end_date: str = None):
    """Get message analytics aggregated from `daily_message_stats` table.
    If no dates are specified, returns stats for the last 30 days.

    Args:
        start_date: Optional start date in YYYY-MM-DD format. If None, defaults to 30 days ago.
        end_date: Optional end date in YYYY-MM-DD format. If None, defaults to current date.

    Returns:
        Dictionary containing message statistics:
        - days: Total number of days in the range
        - total_messages: Total number of messages
        - avg_messages_per_day: Average messages per day
        - message_types: Breakdown of messages by type
    """
    try:
        stats_list = message_stats.get_stats_in_range(start_date, end_date)
        
        # Aggregate stats
        total_messages = sum(day.get('total_messages', 0) for day in stats_list)
        days = len(stats_list)
        message_types = {
            'text': sum(day.get('text_messages', 0) for day in stats_list),
            'image': sum(day.get('image_messages', 0) for day in stats_list),
            'video': sum(day.get('video_messages', 0) for day in stats_list),
            'audio': sum(day.get('audio_messages', 0) for day in stats_list),
            'document': sum(day.get('document_messages', 0) for day in stats_list)
        }
        sender_types = {
            'customer': sum(day.get('total_customer_messages', 0) for day in stats_list),
            'agent': sum(day.get('total_agent_messages', 0) for day in stats_list),
            'representative': sum(day.get('total_representative_messages', 0) for day in stats_list)
        }
        
        return {
            "days": days,
            "total_messages": total_messages,
            "avg_messages_per_day": round(total_messages / days if days > 0 else 0, 2),
            "message_types": message_types,
            "sender_types": sender_types,
            "daily_stats": stats_list
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get message stats: {str(e)}")

@analytics_router.get("/leaderboard/{campaign_code}")
async def get_campaign_leaderboard(
    campaign_code: str,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Number of items per page")
):
    """
    Get the paginated leaderboard for a specific campaign.
    Returns top referrers sorted by their points for the given campaign.
    
    Parameters:
    - campaign_code: The campaign ID to get leaderboard for
    - page: Page number (starts from 1)
    - page_size: Number of items per page (max 100)
    """
    try:
        referral_db = ReferralDataBase()
        # Get all referrals from the database
        response = referral_db.supabase.table("referrals").select("*").execute()
        referrals = response.data

        # Process referrals to create leaderboard entries
        leaderboard_entries = []
        for referral in referrals:
            # Find points for the specific campaign
            campaign_points = 0
            for points in referral.get('total_points', []):
                if points.get('campaign_id') == campaign_code:
                    campaign_points = points.get('points', 0)
                    break
            
            # Only include users who have points in this campaign
            if campaign_points > 0:
                leaderboard_entries.append({
                    "referrer_name": referral.get('referrer_name', 'Anonymous'),
                    "referrer_phone": referral.get('referrer_phone', ''),
                    "points": campaign_points,
                    "total_referrals": len([user for user in referral.get('referred_users', []) 
                                         if user.get('campaign_id') == campaign_code])
                })

        # Sort entries by points in descending order
        leaderboard_entries.sort(key=lambda x: x['points'], reverse=True)

        # Calculate total entries and pagination metadata
        total_entries = len(leaderboard_entries)
        total_pages = ceil(total_entries / page_size)
        
        # Validate page number
        if page > total_pages and total_entries > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Page {page} does not exist. Total pages: {total_pages}"
            )

        # Calculate slice indices for pagination
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size

        # Get paginated entries
        paginated_entries = leaderboard_entries[start_idx:end_idx]

        # Add rank to each entry (rank is global, not just for current page)
        for entry in paginated_entries:
            entry['rank'] = leaderboard_entries.index(entry) + 1

        return {
            "campaign_id": campaign_code,
            "pagination": {
                "current_page": page,
                "page_size": page_size,
                "total_pages": total_pages,
                "total_entries": total_entries
            },
            "leaderboard": paginated_entries
        }

    except Exception as e:
        Logger.error(f"Error getting leaderboard for campaign {campaign_code}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get leaderboard: {str(e)}"
        )