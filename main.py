"""Main entry point for Brototype Daily Task Updating Tool."""
import argparse
import sys
from src.storage import StorageManager
from src.task_manager import TaskManager
from src.cli import display_tasks_table, display_summary_dashboard, interactive_menu


def parse_args():
    parser = argparse.ArgumentParser(
        description="Brototype Daily Task Updating Tool - Manage & Track Daily Coding Tasks"
    )
    parser.add_argument("-l", "--list", action="store_true", help="List all daily tasks")
    parser.add_argument("-s", "--status", type=str, help="Filter tasks by status (Pending, In Progress, Completed, Blocked)")
    parser.add_argument("-p", "--priority", type=str, help="Filter or specify priority (High, Medium, Low)")
    parser.add_argument("-q", "--search", type=str, help="Search keyword across titles, notes, and categories")
    parser.add_argument("-a", "--add", type=str, metavar="TITLE", help="Quickly add a new task with given title")
    parser.add_argument("--category", type=str, default="General", help="Category for new task")
    parser.add_argument("--notes", type=str, default="", help="Notes or description for task")
    parser.add_argument("--update-id", type=int, help="Task ID to update status")
    parser.add_argument("--set-status", type=str, help="New status for task specified by --update-id")
    parser.add_argument("--stats", action="store_true", help="Display task completion summary statistics")
    parser.add_argument("-i", "--interactive", action="store_true", help="Run interactive terminal menu mode")
    parser.add_argument("--file", type=str, default="daily_tasks.json", help="Path to JSON task file (default: daily_tasks.json)")
    return parser.parse_args()


def main():
    args = parse_args()
    storage = StorageManager(file_path=args.file)
    manager = TaskManager(storage_manager=storage)

    # If status update command line arguments given
    if args.update_id is not None and args.set_status:
        if manager.update_task_status(args.update_id, args.set_status, args.notes):
            print(f"✓ Task #{args.update_id} status updated to '{args.set_status}'.")
        else:
            print(f"❌ Failed to update Task #{args.update_id}.")
        return

    # Quick add task command line argument
    if args.add:
        prio = args.priority if args.priority else "Medium"
        stat = args.status if args.status else "Pending"
        new_task = manager.add_task(
            title=args.add,
            category=args.category,
            priority=prio,
            status=stat,
            notes=args.notes
        )
        print(f"✓ Created Task #{new_task.id}: '{new_task.title}' [{new_task.status}]")
        return

    # View stats flag
    if args.stats:
        display_summary_dashboard(manager)
        return

    # List tasks flag or status filter flag
    if args.list or args.status or args.search or args.priority:
        tasks = manager.filter_tasks(status=args.status, priority=args.priority, search=args.search)
        display_tasks_table(tasks, "Filtered Tasks" if (args.status or args.search) else "Daily Tasks")
        return

    # Default to interactive menu mode if no action flags provided or --interactive specified
    interactive_menu(manager)


if __name__ == "__main__":
    main()
