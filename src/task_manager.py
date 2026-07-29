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
        )
        self.tasks.append(new_task)
        self.save()
        return new_task

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

        task.status = TaskStatus.normalize(status)
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
        if status is not None:
            task.status = TaskStatus.normalize(status)
        if duration is not None:
            task.duration = duration.strip() or "1 hr"
        if scheduled_time is not None:
            task.scheduled_time = scheduled_time.strip()
        if notes is not None:
            task.notes = notes.strip()

        task.updated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        return self.save()

    def delete_task(self, task_id: int) -> bool:
        """Delete task by ID."""
        initial_count = len(self.tasks)
        self.tasks = [t for t in self.tasks if t.id != task_id]
        if len(self.tasks) < initial_count:
            return self.save()
        return False

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
