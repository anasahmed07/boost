"""Backfill script to populate daily_message_stats from existing chat_history data.

Usage: run this script from the project root in the same Python env used by the project.

This script will read all chat_history rows, group messages by date (YYYY-MM-DD),
aggregate counts by message_type and upsert into the `daily_message_stats` table.
"""
from collections import defaultdict
from whatsapp_agent.database.chat_history import ChatHistoryDataBase
from whatsapp_agent.database.message_stats import MessageStatsDatabase
from whatsapp_agent._debug import Logger


def backfill():
    chat_db = ChatHistoryDataBase()
    stats_handler = MessageStatsDatabase()

    # Fetch all chat history rows (be mindful of size; this reads up to 1000 rows by default)
    # If you have more rows, consider paging using .range or other Supabase features.
    chats = chat_db.supabase.table(chat_db.TABLE_NAME).select("*").execute().data or []
    Logger.info(f"Found {len(chats)} chat history records to process")

    # Initialize daily counters 
    agg = defaultdict(lambda: {
        "text_messages": 0,
        "image_messages": 0,
        "video_messages": 0,
        "audio_messages": 0,
        "document_messages": 0,
        "total_messages": 0,
        "total_customer_messages": 0,
        "total_agent_messages": 0,
        "total_representative_messages": 0  # Messages from customer service representatives
    })

    for chat in chats:
        messages = chat.get("messages") or []
        for m in messages:
            ts = m.get("time_stamp")
            if not ts:
                continue
            # Expect timestamp like YYYY-MM-DDTHH:MM:SS...; take date portion
            date = ts.split("T")[0]
            mtype = m.get("message_type", "text").lower()
            sender = m.get("sender", "agent")
            
            # Update message type count
            column = stats_handler.MESSAGE_TYPE_COLUMNS.get(mtype, "text_messages")
            agg[date][column] += 1
            agg[date]["total_messages"] += 1

            # Update sender counts
            if sender == "customer":
                agg[date]["total_customer_messages"] += 1
            elif sender == "representative":
                agg[date]["total_representative_messages"] += 1
            else:
                agg[date]["total_agent_messages"] += 1

    Logger.info(f"Aggregated daily counts for {len(agg)} dates")

    # Upsert aggregated counts into daily_message_stats
    for date, counts in agg.items():
        try:
            stats_handler.supabase.table(stats_handler.TABLE_NAME).upsert({
                "date": date,
                **counts
            }, on_conflict=["date"]).execute()
        except Exception as e:
            Logger.error(f"Failed to upsert stats for {date}: {e}")

    Logger.info("Backfill completed")


if __name__ == '__main__':
    backfill()
