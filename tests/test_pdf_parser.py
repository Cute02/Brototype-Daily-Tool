"""Unit test suite for PDF Module Parser & AI Task Extraction."""
import io
import pytest
from src.pdf_parser import extract_raw_text_from_pdf, infer_priority, infer_duration, parse_pdf_to_tasks
from src.task_manager import TaskManager
from src.storage import StorageManager


def test_infer_priority():
    assert infer_priority("Advanced Database Architecture", "Deep dive into SQL") == "High"
    assert infer_priority("Introduction to Python", "Overview of setup") == "Low"
    assert infer_priority("Building REST API Endpoints", "Standard CRUD logic") == "Medium"


def test_infer_duration():
    assert infer_duration("Quick Setup (30 mins)", "Installing dependencies") == "30 mins"
    assert infer_duration("Comprehensive Full Stack Project", "Building frontend and backend") == "3 hrs"
    assert infer_duration("Advanced Authentication Deep Dive", "JWT tokens and OAuth") == "2 hrs"
    assert infer_duration("Standard Data Structures", "Lists and dictionaries") == "1 hr"


def test_parse_pdf_to_tasks_fallback():
    # Empty byte stream returns fallback task gracefully
    tasks = parse_pdf_to_tasks(b"", filename="python_syllabus.pdf")
    assert len(tasks) == 1
    assert "python_syllabus.pdf" in tasks[0]["title"]
    assert tasks[0]["priority"] == "Medium"


def test_parse_pdf_text_extraction():
    raw_text = """
    Module 1: Python Data Structures
    - Introduction and Setup (30 mins)
    - Lists and Dictionaries Deep Dive
    - Advanced Database Architecture and Performance (3 hours)
    """
    # Create simple PDF or test raw string extraction fallback
    tasks = parse_pdf_to_tasks(raw_text.encode("latin-1"), filename="python_curriculum.pdf")
    assert len(tasks) >= 2
    titles = [t["title"] for t in tasks]
    assert any("Lists and Dictionaries" in title or "Python Data Structures" in title for title in titles)


def test_batch_task_addition(tmp_path):
    file_path = str(tmp_path / "test_batch.json")
    storage = StorageManager(file_path=file_path)
    manager = TaskManager(storage_manager=storage)

    candidates = [
        {"title": "Module 1: Python Basics", "category": "Module 1", "priority": "Low", "duration": "30 mins"},
        {"title": "Module 2: Advanced Async SQL", "category": "Module 2", "priority": "High", "duration": "2 hrs"},
    ]

    created = manager.add_tasks_batch(candidates)
    assert len(created) == 2
    assert created[0].title == "Module 1: Python Basics"
    assert created[1].priority == "High"

    # Verify atomic load
    reloaded_manager = TaskManager(storage_manager=storage)
    assert len(reloaded_manager.tasks) == 2
