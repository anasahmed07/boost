from pydantic import BaseModel
from whatsapp_agent.database.base import DataBase  
from whatsapp_agent.schema.vectore_store import FAQVector
from typing import List, Optional

class FAQVectorDB(DataBase):
    def __init__(self):
        super().__init__()
        self.table_name = "faq_vectors"

    def add_faq(self, faq: FAQVector):
        """Adds a new FAQ to the database."""
        self.supabase.table(self.table_name).insert(faq.dict()).execute()

    def get_faq(self, faq_id: str) -> Optional[FAQVector]:
        """Retrieves an FAQ from the database by its ID."""
        response = self.supabase.table(self.table_name).select("*").eq("id", faq_id).execute()
        if response.data:
            return FAQVector(**response.data[0])
        return None

    def list_faqs(self, limit: Optional[int] = None, offset: Optional[int] = None, search_query: str = None) -> List[FAQVector]:
        """Lists FAQs in the database with optional search and optional pagination (when limit/offset provided)."""
        query = self.supabase.table(self.table_name).select("*")
        
        # Apply search filter if provided
        if search_query and search_query.strip():
            search_term = search_query.strip()
            # Use Supabase text search - search in both question and answer fields
            query = query.or_(f"question.ilike.%{search_term}%,answer.ilike.%{search_term}%")
        
        # Apply pagination only if explicitly requested
        if isinstance(limit, int) and isinstance(offset, int):
            response = query.range(offset, offset + limit - 1).execute()
        else:
            response = query.execute()
        return [FAQVector(**row) for row in response.data]
    
    def count_faqs(self, search_query: str = None) -> int:
        """Get total count of FAQs with optional search filter."""
        query = self.supabase.table(self.table_name).select("id", count="exact")
        
        # Apply search filter if provided
        if search_query and search_query.strip():
            search_term = search_query.strip()
            query = query.or_(f"question.ilike.%{search_term}%,answer.ilike.%{search_term}%")
        
        response = query.execute()
        return response.count or 0

    def update_faq(self, faq_id: str, faq: FAQVector) -> Optional[FAQVector]:
        """Updates an existing FAQ in the database."""
        response = self.supabase.table(self.table_name).update(faq.dict()).eq("id", faq_id).execute()
        if response.data:
            return FAQVector(**response.data[0])
        return None

    def delete_faq(self, faq_id: str) -> None:
        """Deletes an FAQ from the database."""
        self.supabase.table(self.table_name).delete().eq("id", faq_id).execute()