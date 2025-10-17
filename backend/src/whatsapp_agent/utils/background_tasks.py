import asyncio
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
from whatsapp_agent.utils.vector_store import VectorStoreManager
from whatsapp_agent.database.faq_vector_storage import FAQVectorDB
from whatsapp_agent.schema.vectore_store import FAQVector
from whatsapp_agent._debug import Logger


class TaskStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class ProcessingTask:
    task_id: str
    filename: str
    status: TaskStatus
    total_items: int
    processed_items: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    failed_faqs: List[Dict[str, Any]] = None
    successful_count: int = 0

    def __post_init__(self):
        if self.failed_faqs is None:
            self.failed_faqs = []

    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result['status'] = self.status.value
        result['progress_percentage'] = round((self.processed_items / self.total_items) * 100, 2) if self.total_items > 0 else 0
        return result


class BackgroundProcessor:
    def __init__(self):
        self.tasks: Dict[str, ProcessingTask] = {}
        self.manager = VectorStoreManager()
        self.faq_db = FAQVectorDB()

    def start_faq_processing(self, filename: str, faq_data: List[Dict[str, str]], author: str = "unknown") -> str:
        """Start background processing of FAQ data and return task ID"""
        task_id = str(uuid.uuid4())
        task = ProcessingTask(
            task_id=task_id,
            filename=filename,
            status=TaskStatus.PENDING,
            total_items=len(faq_data),
            processed_items=0,
            created_at=datetime.now()
        )
        self.tasks[task_id] = task
        # Start background processing
        asyncio.create_task(self._process_faqs_async(task_id, faq_data, author))
        return task_id

    async def _process_faqs_async(self, task_id: str, faq_data: List[Dict[str, str]], author: str = "unknown"):
        """Process FAQs in background"""
        task = self.tasks.get(task_id)
        if not task:
            return

        try:
            task.status = TaskStatus.PROCESSING
            Logger.info(f"Starting FAQ processing for task {task_id}")

            # Get or create vector store
            from whatsapp_agent.routes.upload import _get_or_create_store
            faq_store_id = _get_or_create_store("FAQ-Vector-Store")

            for i, data in enumerate(faq_data):
                try:
                    # Process single FAQ
                    content = f"Question: {data['question']}\nAnswer: {data['answer']}"
                    
                    # Upload to vector store (run in thread to avoid blocking)
                    file_data = await asyncio.to_thread(
                        self.manager.upload_file,
                        f"{data['question']}.txt",
                        content.encode("utf-8", errors="ignore")
                    )
                    
                    indexed = await asyncio.to_thread(
                        self.manager.add_file_to_vector_store,
                        faq_store_id,
                        file_data["id"]
                    )

                    # Save to database
                    faq = FAQVector(
                        id=file_data["id"],
                        question=data["question"],
                        answer=data["answer"],
                        updated_at=datetime.now().isoformat(),
                        author=author
                    )
                    self.faq_db.add_faq(faq)

                    # Increment successful count
                    task.successful_count += 1
                    Logger.info(f"Processed FAQ {i+1}/{len(faq_data)} for task {task_id}")

                except Exception as e:
                    Logger.error(f"Failed to process FAQ {i+1} for task {task_id}: {e}")
                    # Track failed FAQ
                    task.failed_faqs.append({
                        "question": data.get("question", "Unknown"),
                        "answer": data.get("answer", "Unknown"),
                        "error": str(e),
                        "index": i
                    })

                # Update progress
                task.processed_items = i + 1

            # Mark as completed
            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.now()
            Logger.info(f"Completed FAQ processing for task {task_id}. Success: {task.successful_count}, Failed: {len(task.failed_faqs)}")

        except Exception as e:
            task.status = TaskStatus.FAILED
            task.error_message = str(e)
            task.completed_at = datetime.now()
            Logger.error(f"FAQ processing failed for task {task_id}: {e}")

    def get_task_status(self, task_id: str) -> Optional[ProcessingTask]:
        """Get task status by ID"""
        return self.tasks.get(task_id)

    def list_tasks(self) -> List[Dict[str, Any]]:
        """List all tasks"""
        return [task.to_dict() for task in self.tasks.values()]

    def get_task_results(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed results for a completed task"""
        task = self.tasks.get(task_id)
        if not task:
            return None

        return {
            "task_id": task.task_id,
            "filename": task.filename,
            "status": task.status.value,
            "total_items": task.total_items,
            "processed_items": task.processed_items,
            "successful_count": task.successful_count,
            "failed_count": len(task.failed_faqs),
            "failed_faqs": task.failed_faqs,
            "created_at": task.created_at,
            "completed_at": task.completed_at,
            "error_message": task.error_message
        }

    def cleanup_old_tasks(self, max_age_hours: int = 24):
        """Clean up old completed tasks"""
        cutoff_time = datetime.now().timestamp() - (max_age_hours * 3600)
        tasks_to_remove = []
        
        for task_id, task in self.tasks.items():
            if (task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED] and 
                task.created_at.timestamp() < cutoff_time):
                tasks_to_remove.append(task_id)
        
        for task_id in tasks_to_remove:
            del self.tasks[task_id]
            Logger.info(f"Cleaned up old task: {task_id}")


# Global instance
background_processor = BackgroundProcessor()
