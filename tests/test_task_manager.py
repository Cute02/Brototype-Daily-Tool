"""Unit test suite for Brototype Daily Task Updating Tool."""
import json
import pytest
from pathlib import Path
from src.models import Task, TaskStatus, TaskPriority
from src.storage import StorageManager
from src.task_manager import TaskManager


@pytest.fixture
def temp_json_file(tmp_path):
    """Fixture providing temporary JSON file path."""
    return str(tmp_path / "test_tasks.json")


def test_task_model_creation():
    task = Task(id=1, title="Test Task", category="Testing", status="Pending", priority="High", duration="2 hrs")
    assert task.id == 1
    assert task.title == "Test Task"
    assert task.status == TaskStatus.PENDING.value
    assert task.priority == TaskPriority.HIGH.value
    assert task.duration == "2 hrs"
    assert task.created_at != ""
    assert task.updated_at != ""


def test_task_status_normalization():
    assert TaskStatus.normalize("in progress") == TaskStatus.IN_PROGRESS.value
    assert TaskStatus.normalize("COMPLETED") == TaskStatus.COMPLETED.value
    assert TaskStatus.normalize("blocked") == TaskStatus.BLOCKED.value

    with pytest.raises(ValueError):
        TaskStatus.normalize("invalid_status")


def test_storage_save_and_load(temp_json_file):
    storage = StorageManager(file_path=temp_json_file)
    tasks = [
        Task(id=1, title="Task One", status="Pending", duration="1 hr"),
        Task(id=2, title="Task Two", status="Completed", duration="2 hrs"),
    ]

    assert storage.save_tasks(tasks) is True

    loaded = storage.load_tasks()
    assert len(loaded) == 2
    assert loaded[0].title == "Task One"
    assert loaded[1].duration == "2 hrs"


def test_storage_corrupted_recovery(temp_json_file):
    storage = StorageManager(file_path=temp_json_file)
    
    # 1. Save valid state to create backup
    valid_tasks = [Task(id=1, title="Backup Task", status="Pending")]
    storage.save_tasks(valid_tasks)

    # 2. Corrupt main JSON file
    with open(temp_json_file, "w", encoding="utf-8") as f:
        f.write("{ INVALID JSON CONTENT ...")

    # 3. Load tasks should recover from backup
    loaded = storage.load_tasks()
    assert len(loaded) == 1
    assert loaded[0].title == "Backup Task"


def test_task_manager_crud_and_sorting(temp_json_file):
    storage = StorageManager(file_path=temp_json_file)
    manager = TaskManager(storage_manager=storage)

    # Add tasks with different priorities and durations
    t1 = manager.add_task(title="Medium Task", category="Dev", priority="Medium", duration="1 hr")
    t2 = manager.add_task(title="High Task", category="Dev", priority="High", duration="2 hrs")
    t3 = manager.add_task(title="Low Task", category="Dev", priority="Low", duration="30 mins")

    assert len(manager.tasks) == 3

    # Priority sorting check
    sorted_prio = manager.filter_tasks(sort_by="priority")
    assert sorted_prio[0].title == "High Task"
    assert sorted_prio[1].title == "Medium Task"
    assert sorted_prio[2].title == "Low Task"

    # Details update
    assert manager.update_task_details(t2.id, status="Completed", notes="Finished in 2 hours") is True
    updated = manager.get_task_by_id(t2.id)
    assert updated.status == TaskStatus.COMPLETED.value
    assert updated.notes == "Finished in 2 hours"

    # Delete task
    assert manager.delete_task(t3.id) is True
    assert len(manager.tasks) == 2


def test_subtopics_auto_checklist_completion(temp_json_file):
    storage = StorageManager(file_path=temp_json_file)
    manager = TaskManager(storage_manager=storage)

    subtopics = [
        {"id": "sub_1", "title": "Setup virtualenv", "completed": False},
        {"id": "sub_2", "title": "Install dependencies", "completed": False},
    ]

    t = manager.add_task(
        title="1. Python Environment Setup",
        category="Dev",
        priority="High",
        subtopics=subtopics
    )
    assert t.status == TaskStatus.PENDING.value

    # Complete 1 subtopic -> In Progress
    updated_subs = [
        {"id": "sub_1", "title": "Setup virtualenv", "completed": True},
        {"id": "sub_2", "title": "Install dependencies", "completed": False},
    ]
    manager.update_task_details(t.id, subtopics=updated_subs)
    assert manager.get_task_by_id(t.id).status == TaskStatus.IN_PROGRESS.value

    # Complete all subtopics -> Completed automatically!
    updated_subs_all = [
        {"id": "sub_1", "title": "Setup virtualenv", "completed": True},
        {"id": "sub_2", "title": "Install dependencies", "completed": True},
    ]
    manager.update_task_details(t.id, subtopics=updated_subs_all)
    assert manager.get_task_by_id(t.id).status == TaskStatus.COMPLETED.value

