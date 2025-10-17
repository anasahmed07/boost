from fastapi import UploadFile, APIRouter, HTTPException, Form, Query, Body
from whatsapp_agent.utils.vector_store import VectorStoreManager
from whatsapp_agent.database.vector_storage import VectorStoreDB
from whatsapp_agent.schema.vectore_store import VectorStore, FAQVector, KnowledgeVector
from whatsapp_agent.utils.current_time import _get_current_karachi_time_str
from whatsapp_agent.utils._text_extractor import convert_file_content
from whatsapp_agent.database.faq_vector_storage import FAQVectorDB
from whatsapp_agent.database.knowledge_vector_storage import KnowledgeVectorDB
from whatsapp_agent.utils.background_tasks import background_processor
from typing import Dict, List
from pydantic import BaseModel
import asyncio

upload_router = APIRouter(prefix="/upload", tags=["Knowledge Base"])

# Response models
class FAQsListResponse(BaseModel):
    store_name: str
    faqs: List[FAQVector]
    total: int  # Total FAQs in database

vector_db = VectorStoreDB()
manager = VectorStoreManager()
faq_db = FAQVectorDB()
knowledge_db = KnowledgeVectorDB()

def _get_or_create_store(name: str) -> str:
    """
    Fetch a vector store ID by name from Supabase,
    or create it if it doesn't exist.
    """
    store_id = manager.get_vector_store_id(name)
    vector_store_id = vector_db.get_vector_store_by_name(name)

    if not store_id:
        new_store = manager.create_vector_store(name)
        store_id = new_store["id"]

    if not vector_store_id:
        vector_store = VectorStore(
            created_at=_get_current_karachi_time_str(),
            id=store_id,
            name=name,
        )
        vector_db.create_vector_store(vector_store)

    return store_id


class FAQUploadRequest(BaseModel):
    question: str
    answer: str
    author: str

@upload_router.post("/faq")
async def upload_single_faq(faq: FAQUploadRequest = Body(...)):
    faq_store_id = _get_or_create_store("FAQ-Vector-Store")
    content = f"Question: {faq.question}\nAnswer: {faq.answer}"
    file_data = await asyncio.to_thread(
        manager.upload_file,
        f"{faq.question}.txt",
        content.encode("utf-8", errors="ignore")
    )
    indexed = await asyncio.to_thread(
        manager.add_file_to_vector_store,
        faq_store_id,
        file_data["id"]
    )
    faq_obj = FAQVector(
        id=file_data["id"],
        question=faq.question,
        answer=faq.answer,
        updated_at=_get_current_karachi_time_str(),
        author=faq.author
    )
    faq_db.add_faq(faq_obj)
    return {
        "message": "FAQ uploaded successfully",
        "file": file_data,
        "indexed": indexed,
        "updated_at": faq_obj.updated_at,
        "author": faq_obj.author
    }


@upload_router.post("/faqs")
async def upload_faq(file: UploadFile, author: str = Form(...)):
    """Upload file into FAQ vector store (background processing)."""
    
    # ✅ Allow only CSV files
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Only .csv files are allowed."
        )
    
    content = await file.read()
    
    # Your custom converter (must handle CSV parsing)
    converted_content = convert_file_content(file.filename, content)
    
    if not converted_content:
        raise HTTPException(
            status_code=400,
            detail="No valid FAQ data found in the CSV file."
        )

    # Start background processing
    # Pass author to background processor
    task_id = background_processor.start_faq_processing(file.filename, converted_content, author=author)

    return {
        "message": "FAQ upload started - processing in background",
        "task_id": task_id,
        "total_items": len(converted_content),
        "status": "processing"
    }


@upload_router.get("/faqs/list", response_model=FAQsListResponse)
async def list_faqs(
    q: str = Query(None, description="Optional search query to filter FAQs by question/answer content")
):
    """
    List FAQs in the FAQ vector store with pagination and optional search.
    
    - **page**: Page number (starting from 1)
    - **limit**: Number of FAQs per page (1-100)
    - **q**: Optional search query to filter FAQs by question/answer content
    """
    try:
        # Get total count of ALL FAQs in database (regardless of search)
        total_faqs_in_db = faq_db.count_faqs()
        
        # Get FAQs with optional search filter (no pagination)
        faqs = faq_db.list_faqs(search_query=q)
        # Ensure all returned FAQs include updated_at and author
        return FAQsListResponse(
            store_name="FAQ-Vector-Store",
            faqs=faqs,
            total=total_faqs_in_db
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list FAQs: {str(e)}")

@upload_router.get("/faqs/status/{task_id}")
async def get_upload_status(task_id: str):
    """Get upload status and results for a task."""
    task = background_processor.get_task_status(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # If task is completed, include detailed results
    if task.status.value in ["completed", "failed"]:
        results = background_processor.get_task_results(task_id)
        return results
    else:
        # For pending/processing tasks, return basic status
        return {
            "task_id": task.task_id,
            "filename": task.filename,
            "status": task.status.value,
            "total_items": task.total_items,
            "processed_items": task.processed_items,
            "progress_percentage": round((task.processed_items / task.total_items) * 100, 2) if task.total_items > 0 else 0,
            "created_at": task.created_at,
            "completed_at": task.completed_at,
            "error_message": task.error_message
        }

@upload_router.post("/faqs/edit/{file_id}")
async def edit_faq(
    file_id: str,
    faq: dict = Body(...)
):
    """Edit a file in the FAQ vector store."""
    faq_store_id = manager.get_vector_store_id("FAQ-Vector-Store")
    if not faq_store_id:
        raise HTTPException(status_code=404, detail=f"Store 'FAQ-Vector-Store' not found")
    await asyncio.to_thread(manager.remove_file_from_vector_store, faq_store_id, file_id)
    await asyncio.to_thread(manager.delete_file, file_id)
    question = faq.get("question")
    answer = faq.get("answer")
    author = faq.get("author")
    content = f"Question: {question}\nAnswer: {answer}"
    file_data = await asyncio.to_thread(
        manager.upload_file,
        f"{question}.txt",
        content.encode("utf-8", errors="ignore")
    )
    indexed = await asyncio.to_thread(
        manager.add_file_to_vector_store,
        faq_store_id,
        file_data["id"]
    )
    faq_obj = FAQVector(
        id=file_data["id"],
        question=question,
        answer=answer,
        updated_at=_get_current_karachi_time_str(),
        author=author
    )
    faq_db.delete_faq(file_id)
    faq_db.add_faq(faq_obj)
    return {
        "message": "FAQ updated successfully",
        "file": file_data,
        "indexed": indexed,
        "updated_at": faq_obj.updated_at,
        "author": faq_obj.author
    }

@upload_router.delete("/faqs/delete/{file_id}")
async def delete_faq(file_id: str):
    """Delete a file from a vector store."""
    store_id = manager.get_vector_store_id("FAQ-Vector-Store")
    if not store_id:
        raise HTTPException(status_code=404, detail=f"Store 'FAQ-Vector-Store' not found")
    removed = await asyncio.to_thread(manager.remove_file_from_vector_store, store_id, file_id)
    faq_db.delete_faq(file_id)
    await asyncio.to_thread(manager.delete_file, file_id)
    return {"message": f"File {file_id} removed from FAQ-Vector-Store", "removed": removed}

@upload_router.post("/documents")
async def upload_document(file: UploadFile, filename: str = Form(...), author: str = Form(...)):
    """Upload file into Company Docs vector store."""
    doc_store_id = _get_or_create_store("Company-Docs-Vector-Store")
    content = await file.read()
    file_data = await asyncio.to_thread(
        manager.upload_file,
        f"{filename}.txt",
        content
    )
    indexed = await asyncio.to_thread(
        manager.add_file_to_vector_store,
        doc_store_id,
        file_data["id"]
    )

    knowledge_vector = KnowledgeVector(
        id=file_data["id"],
        name=filename,
        updated_at=_get_current_karachi_time_str(),
        author=author
    )
    knowledge_db.add_knowledge_vector(knowledge_vector)
    return {
        "message": "Document uploaded successfully",
        "file": file_data,
        "indexed": indexed,
        "updated_at": knowledge_vector.updated_at,
        "author": knowledge_vector.author
    }

@upload_router.get("/documents/list")
async def list_documents():
    """List all files in the Document vector store."""
    store_id = manager.get_vector_store_id("Company-Docs-Vector-Store")
    file_names = knowledge_db.list_knowledge_vectors()
    files = await asyncio.to_thread(manager.list_vector_store_files, store_id)
    for file in files:
        for fn in file_names:
            if file["id"] == fn.id:
                file["name"] = fn.name
                file["updated_at"] = getattr(fn, "updated_at", None)
                file["author"] = getattr(fn, "author", None)
    return {"store_name": "Company-Docs-Vector-Store", "files": files}

@upload_router.delete("/documents/delete/{file_id}")
async def delete_document(file_id: str):
    """Delete a file from a vector store."""
    store_id = manager.get_vector_store_id("Company-Docs-Vector-Store")
    removed = await asyncio.to_thread(manager.remove_file_from_vector_store, store_id, file_id)
    await asyncio.to_thread(manager.delete_file, file_id)
    knowledge_db.delete_knowledge_vector(file_id)
    return {"message": f"File {file_id} removed from Company-Docs-Vector-Store", "removed": removed}
