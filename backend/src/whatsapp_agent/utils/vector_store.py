from typing import Dict, Any, List
from whatsapp_agent.utils.config import Config


class VectorStoreManager:
    def __init__(self):
        """
        Initialize the OpenAI client and set up storage for vector stores.
        """
        self.client = Config.get_openai_client(sync=True)

    # ---------- File Operations ----------
    def upload_file(self, file_name: str, content: bytes, purpose: str = "assistants") -> Dict[str, Any]:
        """
        Uploads a file to OpenAI (supports text and binary files).
        """
        file_upload = self.client.files.create(
            file=(file_name, content),
            purpose=purpose,
        )
        return file_upload.to_dict()

    def list_files(self) -> List[Dict[str, Any]]:
        """
        Lists all uploaded files.
        """
        files = self.client.files.list()
        return [f.to_dict() for f in files.data]

    def delete_file(self, file_id: str) -> Dict[str, Any]:
        """
        Deletes a file by ID.
        """
        deleted = self.client.files.delete(file_id)
        return deleted.to_dict()
        
    # ---------- Vector Store Operations ----------
    def create_vector_store(self, name: str) -> Dict[str, Any]:
        """
        Creates a new vector store.
        """
        vector_store = self.client.vector_stores.create(name=name)
        return vector_store.to_dict()

    def list_vector_stores(self) -> List[Dict[str, Any]]:
        """
        Lists all vector stores.
        """
        stores = self.client.vector_stores.list()
        return [s.to_dict() for s in stores.data]

    def delete_vector_store(self, vector_store_id: str) -> Dict[str, Any]:
        """
        Deletes a vector store by ID.
        """
        deleted = self.client.vector_stores.delete(vector_store_id)
        return deleted.to_dict()

    # ---------- Vector Store Files ----------
    def add_file_to_vector_store(self, vector_store_id: str, file_id: str) -> Dict[str, Any]:
        """
        Indexes a file into a vector store.
        """
        indexed = self.client.vector_stores.files.create_and_poll(
            vector_store_id=vector_store_id,
            file_id=file_id,
        )
        return indexed.to_dict()

    def list_vector_store_files(self, vector_store_id: str) -> List[Dict[str, Any]]:
        """
        Lists files in a vector store.
        """
        files = self.client.vector_stores.files.list(vector_store_id=vector_store_id)
        return [f.to_dict() for f in files.data]

    def remove_file_from_vector_store(self, vector_store_id: str, file_id: str) -> Dict[str, Any]:
        """
        Removes a file from a vector store.
        """
        removed = self.client.vector_stores.files.delete(
            vector_store_id=vector_store_id,
            file_id=file_id,
        )
        return removed.to_dict()

    def get_vector_store_id(self, name: str):
        """
        Fetches the ID of a vector store by name.
        """
        response = self.list_vector_stores()
        for store in response:
            if store['name'] == name:
                return store['id']
        return None
        
