"""Storage management for Brototype Daily Task Updating Tool with atomic save and backups."""
import json
import os
import shutil
from pathlib import Path
from typing import List, Dict, Any, Optional
from src.models import Task


class StorageManager:
    def __init__(self, file_path: str = "daily_tasks.json"):
        self.file_path = Path(file_path).resolve()
        self.backup_path = self.file_path.with_suffix(".json.bak")

    @classmethod
    def get_for_user(cls, username: Optional[str] = None) -> "StorageManager":
        if username and username.strip():
            safe_user = "".join(c for c in username.strip().lower() if c.isalnum() or c in "_-")
            return cls(file_path=f"daily_tasks_{safe_user}.json")
        return cls(file_path="daily_tasks.json")

    def load_tasks(self) -> List[Task]:
        """Load tasks from JSON file. Returns empty list if file doesn't exist or is invalid."""
        if not self.file_path.exists():
            return []

        try:
            with open(self.file_path, "r", encoding="utf-8") as f:
                raw_data = json.load(f)
                if not isinstance(raw_data, list):
                    raise ValueError("JSON root element must be a list of task objects.")
                return [Task.from_dict(item) for item in raw_data if isinstance(item, dict)]
        except (json.JSONDecodeError, ValueError) as e:
            # If main file corrupted, attempt backup recovery
            print(f"[Warning] Corrupted JSON detected in '{self.file_path.name}': {e}")
            if self.backup_path.exists():
                print(f"[Info] Attempting recovery from backup '{self.backup_path.name}'...")
                try:
                    with open(self.backup_path, "r", encoding="utf-8") as bf:
                        raw_data = json.load(bf)
                        return [Task.from_dict(item) for item in raw_data if isinstance(item, dict)]
                except Exception as be:
                    print(f"[Error] Backup recovery failed: {be}")
            return []

    def save_tasks(self, tasks: List[Task]) -> bool:
        """Save tasks atomically to JSON file and update rolling backup."""
        task_dicts = [task.to_dict() for task in tasks]

        # 1. Create rolling backup if main file exists
        if self.file_path.exists():
            try:
                shutil.copy2(self.file_path, self.backup_path)
            except Exception as e:
                print(f"[Warning] Failed to create rolling backup: {e}")

        # 2. Atomic write using temporary file
        temp_path = self.file_path.with_suffix(".tmp")
        try:
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(task_dicts, f, indent=2, ensure_ascii=False)
            
            # Atomic replace
            os.replace(temp_path, self.file_path)

            # Ensure backup is updated with latest valid state
            try:
                shutil.copy2(self.file_path, self.backup_path)
            except Exception as e:
                print(f"[Warning] Failed to update backup file: {e}")

            return True
        except Exception as e:
            print(f"[Error] Failed to save tasks to JSON: {e}")
            if temp_path.exists():
                try:
                    temp_path.unlink()
                except Exception:
                    pass
            return False
