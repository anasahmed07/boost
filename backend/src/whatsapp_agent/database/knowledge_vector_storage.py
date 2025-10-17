from whatsapp_agent.database.base import DataBase  
from whatsapp_agent.schema.vectore_store import KnowledgeVector
from typing import List

class KnowledgeVectorDB(DataBase):
    def __init__(self):
        super().__init__()
        self.table_name = "knowledge_vectors"

    def add_knowledge_vector(self, vector: KnowledgeVector):
        """Adds a new knowledge vector to the database."""
        self.supabase.table(self.table_name).insert(vector.dict()).execute()

    def list_knowledge_vectors(self) -> List[KnowledgeVector]:
        """Lists all knowledge vectors in the database."""
        response = self.supabase.table(self.table_name).select("*").execute()
        return [KnowledgeVector(**row) for row in response.data]

    def delete_knowledge_vector(self, vector_id: str) -> None:
        """Deletes a knowledge vector from the database."""
        self.supabase.table(self.table_name).delete().eq("id", vector_id).execute()