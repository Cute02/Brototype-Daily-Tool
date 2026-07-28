"""Data models for Brototype Daily Task Updating Tool."""
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
from typing import Dict, Any, List


class TaskStatus(str, Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    BLOCKED = "Blocked"

    @classmethod
    def list_values(cls) -> List[str]:
        return [status.value for status in cls]

    @classmethod
    def normalize(cls, value: str) -> str:
        val_lower = value.strip().lower()
        for status in cls:
            if status.value.lower() == val_lower or status.name.lower() == val_lower:
                return status.value
        raise ValueError(f"Invalid Task Status: '{value}'. Valid choices: {cls.list_values()}")


class TaskPriority(str, Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"

    @classmethod
    def list_values(cls) -> List[str]:
        return [priority.value for priority in cls]

    @classmethod
    def normalize(cls, value: str) -> str:
        val_lower = value.strip().lower()
        for priority in cls:
            if priority.value.lower() == val_lower or priority.name.lower() == val_lower:
                return priority.value
        raise ValueError(f"Invalid Task Priority: '{value}'. Valid choices: {cls.list_values()}")


@dataclass
class Task:
    id: int
    title: str
    category: str = "General"
    status: str = TaskStatus.PENDING.value
    priority: str = TaskPriority.MEDIUM.value
    duration: str = "1 hr"
    scheduled_time: str = ""
    created_at: str = ""
    updated_at: str = ""
    notes: str = ""

    def __post_init__(self):
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        if not self.created_at:
            self.created_at = now
        if not self.updated_at:
            self.updated_at = now
        if not self.duration:
            self.duration = "1 hr"

        # Normalize status & priority
        self.status = TaskStatus.normalize(self.status)
        self.priority = TaskPriority.normalize(self.priority)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Task":
        return cls(
            id=int(data.get("id", 0)),
            title=str(data.get("title", "")),
            category=str(data.get("category", "General")),
            status=str(data.get("status", TaskStatus.PENDING.value)),
            priority=str(data.get("priority", TaskPriority.MEDIUM.value)),
            duration=str(data.get("duration", "1 hr")),
            scheduled_time=str(data.get("scheduled_time", "")),
            created_at=str(data.get("created_at", "")),
            updated_at=str(data.get("updated_at", "")),
            notes=str(data.get("notes", "")),
        )
