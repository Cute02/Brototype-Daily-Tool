"""Integration tests for Brototype Daily Tool REST API server."""
import json
import urllib.request
import urllib.error
import pytest
from src.models import TaskStatus, TaskPriority


import threading
import time
import socketserver
from server import CustomHTTPRequestHandler

BASE_URL = "http://localhost:8000/api/tasks"


@pytest.fixture(scope="module", autouse=True)
def ensure_server_running():
    try:
        req = urllib.request.Request(BASE_URL)
        with urllib.request.urlopen(req, timeout=1):
            yield
            return
    except Exception:
        pass

    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("", 8000), CustomHTTPRequestHandler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    time.sleep(0.5)
    yield
    httpd.shutdown()
    httpd.server_close()



def test_api_get_tasks():
    req = urllib.request.Request(BASE_URL)
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        data = json.loads(resp.read().decode("utf-8"))
        assert "tasks" in data
        assert "stats" in data
        assert isinstance(data["tasks"], list)
        assert data["stats"]["total"] >= 0


def test_api_post_create_task():
    payload = {
        "title": "API Test - Advanced System Design",
        "category": "System Design",
        "priority": "High",
        "status": "Pending",
        "duration": "2 hrs",
        "notes": "Testing REST API task creation"
    }
    req = urllib.request.Request(
        BASE_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 201
        data = json.loads(resp.read().decode("utf-8"))
        assert data["success"] is True
        task = data["task"]
        assert task["title"] == payload["title"]
        assert task["priority"] == "High"
        assert task["duration"] == "2 hrs"
        created_id = task["id"]

    # Clean up test task
    del_req = urllib.request.Request(f"{BASE_URL}/{created_id}", method="DELETE")
    with urllib.request.urlopen(del_req) as resp:
        assert resp.status == 200


def test_api_put_update_task():
    # 1. Create temporary task
    payload = {"title": "API Update Test Task", "priority": "Low", "status": "Pending"}
    req = urllib.request.Request(
        BASE_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        task_id = json.loads(resp.read().decode("utf-8"))["task"]["id"]

    # 2. Update task details
    update_payload = {
        "title": "API Update Test Task - Modified",
        "priority": "High",
        "status": "Completed",
        "notes": "Updated via PUT endpoint test"
    }
    update_req = urllib.request.Request(
        f"{BASE_URL}/{task_id}",
        data=json.dumps(update_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="PUT"
    )
    with urllib.request.urlopen(update_req) as resp:
        assert resp.status == 200
        updated = json.loads(resp.read().decode("utf-8"))["task"]
        assert updated["title"] == "API Update Test Task - Modified"
        assert updated["priority"] == "High"
        assert updated["status"] == "Completed"

    # 3. Clean up
    del_req = urllib.request.Request(f"{BASE_URL}/{task_id}", method="DELETE")
    with urllib.request.urlopen(del_req) as resp:
        assert resp.status == 200


def test_api_filter_and_search():
    url = f"{BASE_URL}?status=Completed&sort_by=priority"
    with urllib.request.urlopen(url) as resp:
        assert resp.status == 200
        data = json.loads(resp.read().decode("utf-8"))
        for t in data["tasks"]:
            assert t["status"] == "Completed"
