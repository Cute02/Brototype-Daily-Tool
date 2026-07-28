"""Python Standard Library HTTP & REST API Server for Brototype Daily Tool."""
import http.server
import socketserver
import json
import re
import urllib.parse
from pathlib import Path
from src.storage import StorageManager
from src.task_manager import TaskManager

PORT = 8000
DIRECTORY = Path(__file__).parent.resolve()

storage = StorageManager(file_path="daily_tasks.json")
manager = TaskManager(storage_manager=storage)


class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIRECTORY), **kwargs)

    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def _send_error_json(self, message, status=400):
        self._send_json({"error": message}, status=status)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        if path == "/api/tasks":
            query_params = urllib.parse.parse_qs(parsed_url.query)
            status = query_params.get("status", [None])[0]
            priority = query_params.get("priority", [None])[0]
            search = query_params.get("search", [None])[0]
            sort_by = query_params.get("sort_by", ["priority"])[0]

            manager.refresh()
            tasks = manager.filter_tasks(status=status, priority=priority, search=search, sort_by=sort_by)
            stats = manager.get_summary_stats()

            response = {
                "tasks": [t.to_dict() for t in tasks],
                "stats": stats
            }
            self._send_json(response)
            return

        # Serve static files
        return super().do_GET()

    def do_POST(self):
        if self.path == "/api/tasks":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                data = json.loads(body.decode("utf-8")) if body else {}
                title = data.get("title", "")
                category = data.get("category", "General")
                priority = data.get("priority", "Medium")
                status = data.get("status", "Pending")
                duration = data.get("duration", "1 hr")
                scheduled_time = data.get("scheduled_time", "")
                notes = data.get("notes", "")

                manager.refresh()
                new_task = manager.add_task(
                    title=title,
                    category=category,
                    priority=priority,
                    status=status,
                    duration=duration,
                    scheduled_time=scheduled_time,
                    notes=notes
                )
                self._send_json({"success": True, "task": new_task.to_dict()}, status=201)
            except Exception as e:
                self._send_error_json(str(e), status=400)
            return

        self._send_error_json("Endpoint not found", status=404)

    def do_PUT(self):
        match = re.match(r"^/api/tasks/(\d+)$", self.path)
        if match:
            task_id = int(match.group(1))
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                data = json.loads(body.decode("utf-8")) if body else {}
                manager.refresh()
                success = manager.update_task_details(
                    task_id=task_id,
                    title=data.get("title"),
                    category=data.get("category"),
                    priority=data.get("priority"),
                    status=data.get("status"),
                    duration=data.get("duration"),
                    scheduled_time=data.get("scheduled_time"),
                    notes=data.get("notes")
                )
                if success:
                    updated_task = manager.get_task_by_id(task_id)
                    self._send_json({"success": True, "task": updated_task.to_dict()})
                else:
                    self._send_error_json(f"Task #{task_id} not found", status=404)
            except Exception as e:
                self._send_error_json(str(e), status=400)
            return

        self._send_error_json("Endpoint not found", status=404)

    def do_DELETE(self):
        match = re.match(r"^/api/tasks/(\d+)$", self.path)
        if match:
            task_id = int(match.group(1))
            manager.refresh()
            if manager.delete_task(task_id):
                self._send_json({"success": True, "deleted_id": task_id})
            else:
                self._send_error_json(f"Task #{task_id} not found", status=404)
            return

        self._send_error_json("Endpoint not found", status=404)


def run_server():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
        print(f"[Server] Brototype Daily Task Server running at http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")


if __name__ == "__main__":
    run_server()
