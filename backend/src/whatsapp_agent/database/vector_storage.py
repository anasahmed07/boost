from typing import List, Optional
from pydantic import BaseModel
from whatsapp_agent.database.base import DataBase  # assuming your base class is in db/base.py
from whatsapp_agent.schema.vectore_store import VectorStore, VectorFiles

class VectorStoreDB(DataBase):
    def __init__(self):
        super().__init__()
        self.table_name = "vector_stores"  # Supabase table for VectorStore

    # --------- Create ---------
    def create_vector_store(self, store: VectorStore) -> dict:
        response = self.supabase.table(self.table_name).insert(store.dict()).execute()
        return response.data

    # --------- Read ---------
    def get_vector_store(self, store_id: str) -> Optional[VectorStore]:
        response = self.supabase.table(self.table_name).select("*").eq("id", store_id).execute()
        if response.data:
            return VectorStore(**response.data[0])
        return None

    def get_vector_store_by_name(self, store_name: str) -> Optional[VectorStore]:
        response = self.supabase.table(self.table_name).select("*").eq("name", store_name).execute()
        if response.data:
            return VectorStore(**response.data[0])
        return None

    def list_vector_stores(self) -> List[VectorStore]:
        response = self.supabase.table(self.table_name).select("*").execute()
        return [VectorStore(**row) for row in response.data]

    # --------- Update ---------
    def update_vector_store(self, store_id: str, update_data: dict) -> dict:
        response = self.supabase.table(self.table_name).update(update_data).eq("id", store_id).execute()
        return response.data

    # --------- Delete ---------
    def delete_vector_store(self, store_id: str) -> dict:
        response = self.supabase.table(self.table_name).delete().eq("id", store_id).execute()
        return response.data

    # --------- Files Management ---------
    def add_file_to_store(self, store_id: str, file: VectorFiles) -> dict:
        store = self.get_vector_store(store_id)
        if not store:
            return {"error": "VectorStore not found"}

        # append new file
        updated_files = store.files + [file.dict()]
        response = self.update_vector_store(store_id, {"files": updated_files})
        return response

    def remove_file_from_store(self, store_id: str, file_id: str) -> dict:
        store = self.get_vector_store(store_id)
        if not store:
            return {"error": "VectorStore not found"}

        # remove file by id
        updated_files = [f.dict() for f in store.files if f.file_id != file_id]
        response = self.update_vector_store(store_id, {"files": updated_files})
        return response
