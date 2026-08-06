"""Business logic for Brototype Daily Task Updating Tool."""
from datetime import datetime
from typing import List, Optional, Dict, Any
from src.models import Task, TaskStatus, TaskPriority
from src.storage import StorageManager


class TaskManager:
    def __init__(self, storage_manager: Optional[StorageManager] = None):
        self.storage = storage_manager or StorageManager()
        self.tasks: List[Task] = self.storage.load_tasks()

    def refresh(self):
        """Reload tasks from persistent storage."""
        self.tasks = self.storage.load_tasks()

    def save(self) -> bool:
        """Persist current task list to storage."""
        return self.storage.save_tasks(self.tasks)

    def _get_next_id(self) -> int:
        if not self.tasks:
            return 1
        return max(task.id for task in self.tasks) + 1

    def add_task(
        self,
        title: str,
        category: str = "General",
        priority: str = TaskPriority.MEDIUM.value,
        notes: str = "",
        status: str = TaskStatus.PENDING.value,
        duration: str = "1 hr",
        scheduled_time: str = "",
        subtopics: Optional[List[Dict[str, Any]]] = None,
    ) -> Task:
        """Create and append a new task."""
        if not title.strip():
            raise ValueError("Task title cannot be empty.")

        task_id = self._get_next_id()
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        new_task = Task(
            id=task_id,
            title=title.strip(),
            category=category.strip() if category else "General",
            status=status,
            priority=priority,
            duration=duration.strip() if duration else "1 hr",
            scheduled_time=scheduled_time.strip() if scheduled_time else "",
            created_at=now,
            updated_at=now,
            notes=notes.strip(),
            subtopics=subtopics or [],
        )
        self.tasks.append(new_task)
        self.save()
        return new_task

    def add_tasks_batch(self, tasks_data: List[Dict[str, Any]]) -> List[Task]:
        """Batch insert multiple tasks and persist atomically once."""
        created_tasks: List[Task] = []
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        for item in tasks_data:
            title = str(item.get("title", "")).strip()
            if not title:
                continue
            task_id = self._get_next_id()
            category = str(item.get("category", "Module Import")).strip() or "Module Import"
            priority = TaskPriority.normalize(str(item.get("priority", TaskPriority.MEDIUM.value)))
            duration = str(item.get("duration", "1 hr")).strip() or "1 hr"
            notes = str(item.get("notes", "")).strip()
            status = TaskStatus.normalize(str(item.get("status", TaskStatus.PENDING.value)))
            scheduled_time = str(item.get("scheduled_time", "")).strip()
            subtopics = item.get("subtopics", [])

            new_task = Task(
                id=task_id,
                title=title,
                category=category,
                status=status,
                priority=priority,
                duration=duration,
                scheduled_time=scheduled_time,
                created_at=now,
                updated_at=now,
                notes=notes,
                subtopics=subtopics,
            )
            self.tasks.append(new_task)
            created_tasks.append(new_task)
        if created_tasks:
            self.save()
        return created_tasks

    def get_task_by_id(self, task_id: int) -> Optional[Task]:
        """Find task by its unique ID."""
        for task in self.tasks:
            if task.id == task_id:
                return task
        return None

    def update_task_status(
        self, task_id: int, status: str, notes: Optional[str] = None
    ) -> bool:
        """Update status of a specific task."""
        task = self.get_task_by_id(task_id)
        if not task:
            return False

        norm_status = TaskStatus.normalize(status)
        task.status = norm_status

        # If manually setting main task to Completed, complete all subtopics
        if norm_status == TaskStatus.COMPLETED.value and task.subtopics:
            for s in task.subtopics:
                s["completed"] = True
        elif norm_status == TaskStatus.PENDING.value and task.subtopics:
            for s in task.subtopics:
                s["completed"] = False

        task.updated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        if notes is not None and notes.strip():
            if task.notes:
                task.notes += f" | [Updated]: {notes.strip()}"
            else:
                task.notes = notes.strip()

        return self.save()

    def update_task_priority(self, task_id: int, priority: str) -> bool:
        """Update priority level of a specific task."""
        task = self.get_task_by_id(task_id)
        if not task:
            return False

        task.priority = TaskPriority.normalize(priority)
        task.updated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        return self.save()

    def update_task_details(
        self,
        task_id: int,
        title: Optional[str] = None,
        category: Optional[str] = None,
        priority: Optional[str] = None,
        status: Optional[str] = None,
        duration: Optional[str] = None,
        scheduled_time: Optional[str] = None,
        notes: Optional[str] = None,
        subtopics: Optional[List[Dict[str, Any]]] = None,
    ) -> bool:
        """Update multiple fields of a task."""
        task = self.get_task_by_id(task_id)
        if not task:
            return False

        if title is not None and title.strip():
            task.title = title.strip()
        if category is not None:
            task.category = category.strip() or "General"
        if priority is not None:
            task.priority = TaskPriority.normalize(priority)
        if duration is not None:
            task.duration = duration.strip() or "1 hr"
        if scheduled_time is not None:
            task.scheduled_time = scheduled_time.strip()
        if notes is not None:
            task.notes = notes.strip()
        if subtopics is not None:
            task.subtopics = subtopics

        if status is not None:
            task.status = TaskStatus.normalize(status)

        # Sync overall status if subtopics exist
        task.sync_subtopics_status()

        task.updated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        return self.save()

    def delete_task(self, task_id: int) -> bool:
        """Delete task by ID."""
        initial_count = len(self.tasks)
        self.tasks = [t for t in self.tasks if t.id != task_id]
        if len(self.tasks) < initial_count:
            return self.save()
        return False

    def delete_tasks_bulk(self, task_ids: List[int]) -> int:
        """Delete multiple tasks by IDs and return count of deleted tasks."""
        id_set = set(task_ids)
        initial_count = len(self.tasks)
        self.tasks = [t for t in self.tasks if t.id not in id_set]
        deleted_count = initial_count - len(self.tasks)
        if deleted_count > 0:
            self.save()
        return deleted_count

    def add_subtopic(self, task_id: int, title: str) -> bool:
        """Add a subtopic to a specific task."""
        task = self.get_task_by_id(task_id)
        if not task or not title.strip():
            return False
        new_id = f"sub_{len(task.subtopics) + 1}"
        task.subtopics.append({"id": new_id, "title": title.strip(), "completed": False})
        task.sync_subtopics_status()
        task.updated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        return self.save()

    def delete_subtopic(self, task_id: int, sub_index: int) -> bool:
        """Delete a subtopic by index from a specific task."""
        task = self.get_task_by_id(task_id)
        if not task or sub_index < 0 or sub_index >= len(task.subtopics):
            return False
        task.subtopics.pop(sub_index)
        task.sync_subtopics_status()
        task.updated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        return self.save()

    def filter_tasks(
        self,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        category: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: Optional[str] = None,
    ) -> List[Task]:
        """Filter and sort tasks based on criteria."""
        filtered = list(self.tasks)

        if status and status.upper() != "ALL" and status.lower() not in ("null", "undefined", "none", ""):
            try:
                norm_status = TaskStatus.normalize(status)
                filtered = [t for t in filtered if t.status == norm_status]
            except ValueError:
                pass

        if priority and priority.upper() != "ALL" and priority.lower() not in ("null", "undefined", "none", ""):
            try:
                norm_priority = TaskPriority.normalize(priority)
                filtered = [t for t in filtered if t.priority == norm_priority]
            except ValueError:
                pass

        if category:
            cat_lower = category.strip().lower()
            filtered = [t for t in filtered if cat_lower in t.category.lower()]

        if search:
            query = search.strip().lower()
            filtered = [
                t
                for t in filtered
                if query in t.title.lower()
                or query in t.notes.lower()
                or query in t.category.lower()
            ]

        # Sorting logic
        if sort_by == "priority":
            prio_order = {TaskPriority.HIGH.value: 1, TaskPriority.MEDIUM.value: 2, TaskPriority.LOW.value: 3}
            filtered.sort(key=lambda t: prio_order.get(t.priority, 4))
        elif sort_by == "status":
            status_order = {TaskStatus.IN_PROGRESS.value: 1, TaskStatus.PENDING.value: 2, TaskStatus.BLOCKED.value: 3, TaskStatus.COMPLETED.value: 4}
            filtered.sort(key=lambda t: status_order.get(t.status, 5))
        elif sort_by == "id":
            filtered.sort(key=lambda t: t.id)

        return filtered

    def get_summary_stats(self) -> Dict[str, Any]:
        """Calculate productivity statistics."""
        total = len(self.tasks)
        if total == 0:
            return {
                "total": 0,
                "completed": 0,
                "in_progress": 0,
                "pending": 0,
                "blocked": 0,
                "completion_rate": 0.0,
            }

        completed = sum(1 for t in self.tasks if t.status == TaskStatus.COMPLETED.value)
        in_progress = sum(1 for t in self.tasks if t.status == TaskStatus.IN_PROGRESS.value)
        pending = sum(1 for t in self.tasks if t.status == TaskStatus.PENDING.value)
        blocked = sum(1 for t in self.tasks if t.status == TaskStatus.BLOCKED.value)

        rate = round((completed / total) * 100, 1)

        return {
            "total": total,
            "completed": completed,
            "in_progress": in_progress,
            "pending": pending,
            "blocked": blocked,
            "completion_rate": rate,
        }
