from pydantic import BaseModel
from typing import Literal, Optional

class FAQVector(BaseModel):
    id: str
    question: str
    answer: str
    updated_at: Optional[str] = None
    author: Optional[str] = None

class KnowledgeVector(BaseModel):
    id: str
    name: str
    updated_at: Optional[str] = None
    author: Optional[str] = None
    
class VectorFiles(BaseModel):
    file_id: str
    name: str
    vector_store_id: str
    content: str
    
class VectorStore(BaseModel):
    id: str
    created_at: str
    name: Literal["Company-Docs-Vector-Store", "FAQ-Vector-Store"]
    files: Optional[list[VectorFiles]] = None
