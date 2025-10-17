from typing import Dict, Optional, Literal, List, Any
from datetime import datetime, timedelta
from whatsapp_agent.utils.current_time import _get_current_karachi_time
from whatsapp_agent.database.base import DataBase
from whatsapp_agent._debug import Logger

class EscalationStatsDatabase(DataBase):
    """Handles escalation statistics tracking and aggregation."""
    
    TABLE_NAME = "daily_escalation_stats"
    
    def __init__(self):
        """Initialize the handler with a connection to stats database."""
        super().__init__()
    
    def _validate_date_format(self, date: str) -> bool:
        """Validate date string format (YYYY-MM-DD)"""
        try:
            year, month, day = date.split("-")
            return len(year) == 4 and len(month) == 2 and len(day) == 2
        except ValueError:
            return False

    def increment_escalation_count(
        self,
        customer_type: Literal["B2B", "D2C"],
    ) -> None:
        """
        Increment escalation count for a given customer type.
        
        Args:
            customer_type: Type of customer ("B2B" or "D2C")
        """
        try:
            current_time = _get_current_karachi_time()
            date = current_time.date()
            
            # Get current stats first
            response = self.supabase.table(self.TABLE_NAME).select("*").eq("date", str(date)).limit(1).execute()
            current_stats = response.data[0] if response.data else {
                "date": str(date),
                "total_escalations": 0,
                "total_resolved": 0,
                "b2b_escalations": 0,
                "d2c_escalations": 0
            }
            
            # Prepare updates
            updates = {
                "total_escalations": current_stats.get("total_escalations", 0) + 1
            }
            
            # Add customer type specific updates
            if customer_type == "B2B":
                updates["b2b_escalations"] = current_stats.get("b2b_escalations", 0) + 1
            else:
                updates["d2c_escalations"] = current_stats.get("d2c_escalations", 0) + 1

            # Use upsert to create or update the row atomically
            self.supabase.table(self.TABLE_NAME).upsert(
                {"date": str(date), **current_stats, **updates},
                on_conflict=["date"]
            ).execute()
            Logger.info(f"Updated escalation stats for {date}")
            
        except Exception as e:
            Logger.error(f"Failed to increment escalation count: {e}")
            # Don't raise the exception - stats tracking should not break core functionality

    def increment_resolved_count(self) -> None:
        """Increment the count of resolved escalations for today."""
        try:
            current_time = _get_current_karachi_time()
            date = current_time.date()
            
            # Get current stats first
            response = self.supabase.table(self.TABLE_NAME).select("*").eq("date", str(date)).limit(1).execute()
            current_stats = response.data[0] if response.data else {
                "date": str(date),
                "total_escalations": 0,
                "total_resolved": 0,
                "b2b_escalations": 0,
                "d2c_escalations": 0
            }
            
            # Prepare updates
            updates = {
                "total_resolved": current_stats.get("total_resolved", 0) + 1
            }

            # Use upsert to create or update the row atomically
            self.supabase.table(self.TABLE_NAME).upsert(
                {"date": str(date), **current_stats, **updates},
                on_conflict=["date"]
            ).execute()
            Logger.info(f"Updated resolved count for {date}")
            
        except Exception as e:
            Logger.error(f"Failed to increment resolved count: {e}")

    def get_stats_in_range(self, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch daily stats rows within optional date range.
        
        Args:
            start_date: Start date in YYYY-MM-DD format. If None, defaults to 30 days ago.
            end_date: End date in YYYY-MM-DD format. If None, defaults to current date.
            
        Returns:
            List of daily stats records sorted by date
        """
        try:
            # Get current date in Karachi timezone
            current_date = _get_current_karachi_time().date()
            
            # If no end_date specified, use current date
            if not end_date:
                end_date = str(current_date)
            elif not self._validate_date_format(end_date):
                Logger.error(f"Invalid end_date format: {end_date}. Using current date.")
                end_date = str(current_date)
            
            # If no start_date specified, use 30 days before end_date
            if not start_date:
                end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()
                start_date = str(end_date_obj - timedelta(days=30))
            elif not self._validate_date_format(start_date):
                Logger.error(f"Invalid start_date format: {start_date}. Using 30 days before end_date.")
                end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()
                start_date = str(end_date_obj - timedelta(days=30))
            
            query = self.supabase.table(self.TABLE_NAME).select("*").order("date", desc=True)
            query = query.gte("date", start_date).lte("date", end_date)

            response = query.execute()
            Logger.info(f"Fetched {len(response.data or [])} daily escalation stats rows")
            return response.data or []

        except Exception as e:
            Logger.error(f"Failed to fetch daily escalation stats: {e}")
            return []

    def get_daily_stats(self, date: Optional[str] = None) -> Dict:
        """
        Get escalation statistics for a specific date.
        
        Args:
            date: Date string in YYYY-MM-DD format. If None, uses current date.
            
        Returns:
            Dict containing escalation statistics for the specified date
        """
        try:
            if not date:
                current_time = _get_current_karachi_time()
                date = str(current_time.date())
            elif not self._validate_date_format(date):
                Logger.error(f"Invalid date format: {date}. Expected YYYY-MM-DD")
                return {}
            
            response = self.supabase.table(self.TABLE_NAME).select("*").eq("date", date).limit(1).execute()
            if not response.data:
                Logger.info(f"No stats found for date: {date}")
                return {}
            
            return response.data[0]
            
        except Exception as e:
            Logger.error(f"Failed to get daily stats for {date}: {e}")
            return {}