# Brototype Daily Task Updating Tool & Web Dashboard

## Overview
The **Brototype Daily Task Updating Tool** is a high-performance Python and Web application designed to streamline daily task management, status tracking, time scheduling, focus sessions, and progress reporting for Brototype students and mentors. It provides both an intuitive Rich CLI interface and a modern interactive Web Dashboard featuring **Priority Sorting**, **Scheduled Task Durations (30m, 1h, 2h, 3h)**, an integrated **Pomodoro Focus Timer** with Web Audio chimes, **Circular Goal Completion Ring**, **Multi-Theme Engine**, **PDF Subtopic Extraction**, and an automated **Mentor Email Generator**.

## Architecture
The application follows a clean 3-Tier Layered Architecture with dual Frontend support (React + Vanilla HTML):

```
+-------------------------------------------------------------------------+
|                        Presentation Layer                               |
|   (frontend/ - React 18, Vite, Subtopics Checklist, Circular Ring)      |
|   (index.html / styles.css / app.js - Web To-Do UI & Pomodoro Focus)     |
|              (main.py / cli.py - Rich CLI Tables & Flags)               |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                       Application & REST API Layer                      |
|                  (server.py - Python HTTP REST API Server)              |
|                   (task_manager.py - Task Domain Logic)                 |
|            (pdf_parser.py - Subtopic & Document Extractor)              |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                        Data & Storage Layer                             |
|              (models.py & storage.py - Atomic JSON Persistence)          |
+------------------------------------+------------------------------------+
                                     |
                                     v
                           daily_tasks.json
```

1. **Presentation Layer (`frontend/`, `index.html`, `app.js`, `src/cli.py`)**: Renders interactive To-Do items, subtopic checklists, circular goal progress ring, priority badges, Pomodoro focus timer, theme switcher, and email previews.
2. **REST API & Business Logic Layer (`server.py`, `src/task_manager.py`, `src/pdf_parser.py`)**: Exposes REST endpoints (`GET`, `POST`, `PUT`, `DELETE` `/api/tasks`, `/api/tasks/bulk-delete`, `/api/tasks/parse-pdf`), filtering, priority sorting, subtopics sync, and metrics calculation.
3. **Data Access & Model Layer (`src/models.py`, `src/storage.py`)**: Enforces data schemas (`Task`, `TaskStatus`, `TaskPriority`), subtopics sync, atomic file operations via `.tmp` staging, and rolling backups (`daily_tasks.json.bak`).

## Features
* **Interactive To-Do List Web UI**: Toggle task completions, status dropdowns (`Pending`, `In Progress`, `Completed`, `Blocked`), and edit notes inline.
* **Priority Management & Sorting**: High (🔴), Medium (🟡), Low (🔵) priority tagging with priority sorting.
* **Scheduled Task Durations**: Set estimated durations (`30 mins`, `1 hour`, `2 hours`, `3 hours`) per task.
* **🎯 Circular Goal Completion Ring**: SVG animated progress circle showing completion percentage and milestone badges above the Pomodoro timer.
* **🎨 Live Multi-Theme Engine**: Toggle between 🎃 Ember Copper Cyber, 🔮 Solo Leveling Neon, ⚡ Matrix Sci-Fi Cyan, and 🌌 Midnight Ocean Blue.
* **📑 Smart Subtopic Extraction & Auto-Sync**: Multi-strategy parsing for numbered, bulleted, and indented subtopics in PDFs/Text. Checking all subtopics automatically completes the main topic.
* **➕ Inline Subtopic Add & ✖ Delete**: Add new subtopics or delete subtopics directly on any task card.
* **🗑️ Batch Selection & Bulk Delete**: Multi-select task checkboxes with single-click bulk deletion (`POST /api/tasks/bulk-delete`).
* **🍅 Integrated Pomodoro Focus Timer**: 25 min Work / 5 min Break / 15 min Break timer linked to target tasks with Web Audio chime alerts.
* **📧 Mentor Email Generator**: One-click generation of pre-formatted daily status reports with `mailto:` email integration and copy-to-clipboard functionality.
* **Rich CLI & Dual Execution**: Dual support for CLI terminal table operations (`python main.py --list`) and Web GUI (`python server.py`).
* **Atomic JSON Storage & Backups**: Safe write operations with automatic rolling backups (`daily_tasks.json.bak`).

## Tech Stack
* **Language & Backend**: Python 3.12+ (standard library `http.server`, `json`, `dataclasses`)
* **Frontend**: React 18, Vite, Vanilla HTML5, CSS3 (Multi-theme dark cyber system), ES6 JavaScript
* **CLI UI & Formatting**: `rich>=13.0.0`
* **Testing**: `pytest>=8.0.0`

## Development Status
- [x] Core Data Models & Validation (`src/models.py`)
- [x] Storage Manager with Atomic Writes (`src/storage.py`)
- [x] Task Business Logic & Priority Sorting (`src/task_manager.py`)
- [x] Rich Terminal Interface & Interactive CLI (`src/cli.py`, `main.py`)
- [x] Python REST API Server (`server.py`)
- [x] Interactive To-Do List Web Dashboard (`index.html`, `styles.css`, `app.js`)
- [x] 🍅 Pomodoro Focus Timer with Web Audio Chime
- [x] 📧 Mentor Email Status Report Generator & `mailto:` Link
- [x] Automated Unit Test Suite (`tests/test_task_manager.py`, `tests/test_pdf_parser.py`)
- [x] 📑 Multi-Strategy PDF & Document Subtopic Extraction Engine (`src/pdf_parser.py`)
- [x] 🔄 Auto-Checklist Synchronization (Main topic auto-completes when subtopics are done)
- [x] ⚛️ React.js Migration & Vite Dev Environment (`frontend/`)
- [x] 🎨 Multi-Theme Cyber Engine (Ember Copper, Solo Leveling Purple, Matrix Cyan, Midnight Blue)
- [x] 🎯 Circular Goal Completion Ring Widget above Pomodoro Timer
- [x] 🗑️ Batch Task Selection & Bulk Deletion (`POST /api/tasks/bulk-delete`)
- [x] ➕ Inline Subtopic Add & ✖ Delete Controls on Task Cards

## Source Code & Code Review Rules
1. **Type Annotations**: Explicit type hints on all domain models and business logic methods.
2. **Error Isolation**: Storage and JSON parsing operation error recovery with backup restoration.
3. **Verification Requirements**: Every update must pass automated unit test execution (`pytest`).

## Milestones
* **Milestone 1**: Core Data Engine & Atomic Persistence.
* **Milestone 2**: Business Logic, Priority Sorting & CLI presentation.
* **Milestone 3**: REST API Backend & Interactive To-Do Web Interface.
* **Milestone 4**: Pomodoro Timer Widget, Time Scheduling & Mentor Email Generator.
* **Milestone 5**: PDF/Syllabus Subtopic Parser & Automatic Checklist Status Sync.
* **Milestone 6**: React.js Architecture Migration & Vite Dev Environment (`frontend/`).
* **Milestone 7**: Multi-Theme Cyber Engine & Circular Goal Completion Ring Widget.
* **Milestone 8**: Batch Selection, Bulk Deletion & Inline Subtopic Management.

## Rules
1. Don't take screenshots
2. Commit every change to git and push with appropriate commit messages only when i say so ask me every time in chat when to push if i forget pusht it at 9pm everyday.

## Site URL link(Update it here)
- http://localhost:8000