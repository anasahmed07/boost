from typing import Dict, Optional, Literal, List, Any
from whatsapp_agent.utils.current_time import _get_current_karachi_time
from whatsapp_agent.database.base import DataBase
from whatsapp_agent._debug import Logger
import datetime

class MessageStatsDatabase(DataBase):
    """Handles message statistics tracking and aggregation."""
    
    TABLE_NAME = "daily_message_stats"
    
    # Message type mapping between schema and database columns
    MESSAGE_TYPE_COLUMNS = {
        "text": "text_messages",
        "image": "image_messages",
        "video": "video_messages",
        "audio": "audio_messages", 
        "document": "document_messages"
    }
    
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

    def increment_message_count(
        self,
        sender: Literal["customer", "agent","representative"],
        message_type: str,
    ) -> None:
        """
        Increment message count for a specific phone number and message type.
        
        Args:
            sender: Who sent the message ("customer" or "agent" or "representative")
            message_type: Type of message (text, image, audio, etc.)
        """
        try:
            current_time = _get_current_karachi_time()
            date = current_time.date()
            
            # Get the column name for the message type
            column = self.MESSAGE_TYPE_COLUMNS.get(message_type.lower(), "text_messages")
            
            # Get current stats first
            response = self.supabase.table(self.TABLE_NAME).select("*").eq("date", str(date)).limit(1).execute()
            current_stats = response.data[0] if response.data else {
                "date": str(date),
                "total_messages": 0,
                "text_messages": 0,
                "image_messages": 0,
                "video_messages": 0,
                "audio_messages": 0,
                "document_messages": 0,
                "total_customer_messages": 0,
                "total_agent_messages": 0,
                "total_representative_messages": 0
            }
            
            # Prepare updates
            updates = {
                column: current_stats.get(column, 0) + 1,
                "total_messages": current_stats.get("total_messages", 0) + 1
            }
            
            # Add sender-specific updates
            if sender == "representative":
                updates["total_representative_messages"] = current_stats.get("total_representative_messages", 0) + 1
            elif sender == "customer":
                updates["total_customer_messages"] = current_stats.get("total_customer_messages", 0) + 1
            else:
                updates["total_agent_messages"] = current_stats.get("total_agent_messages", 0) + 1

            # Use upsert to create or update the row atomically
            self.supabase.table(self.TABLE_NAME).upsert(
                {"date": str(date), **current_stats, **updates},
                on_conflict=["date"]
            ).execute()
            Logger.info(f"Updated message stats for {date}")
            
        except Exception as e:
            Logger.error(f"Failed to increment message count: {e}")
            # Don't raise the exception - stats tracking should not break core functionality

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
                end_date_obj = datetime.datetime.strptime(end_date, "%Y-%m-%d").date()
                start_date = str(end_date_obj - datetime.timedelta(days=30))
            elif not self._validate_date_format(start_date):
                Logger.error(f"Invalid start_date format: {start_date}. Using 30 days before end_date.")
                end_date_obj = datetime.datetime.strptime(end_date, "%Y-%m-%d").date()
                start_date = str(end_date_obj - datetime.timedelta(days=30))
            
            query = self.supabase.table(self.TABLE_NAME).select("*").order("date", desc=True)
            query = query.gte("date", start_date).lte("date", end_date)

            response = query.execute()
            Logger.info(f"Fetched {len(response.data or [])} daily message stats rows")
            return response.data or []

        except Exception as e:
            Logger.error(f"Failed to fetch daily message stats: {e}")
            return []

    def get_daily_stats(self, date: Optional[str] = None) -> Dict:
        """
        Get message statistics for a specific date.
        
        Args:
            date: Date string in YYYY-MM-DD format. If None, uses current date.
            
        Returns:
            Dict containing message statistics for the specified date
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
        except Exception as e:
            Logger.error(f"Failed to get daily stats: {e}")
            return {}