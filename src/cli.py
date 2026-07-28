"""Terminal Presentation Layer for Brototype Daily Task Updating Tool."""
import sys
from typing import List, Optional
from src.models import Task, TaskStatus, TaskPriority
from src.task_manager import TaskManager

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

try:
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich.prompt import Prompt, Confirm
    from rich.text import Text
    HAS_RICH = True
    console = Console(legacy_windows=False)
except ImportError:
    HAS_RICH = False
    console = None


def get_status_style(status: str) -> str:
    if status == TaskStatus.COMPLETED.value:
        return "bold green"
    elif status == TaskStatus.IN_PROGRESS.value:
        return "bold yellow"
    elif status == TaskStatus.BLOCKED.value:
        return "bold red"
    else:
        return "cyan"


def get_priority_style(priority: str) -> str:
    if priority == TaskPriority.HIGH.value:
        return "bold magenta"
    elif priority == TaskPriority.MEDIUM.value:
        return "blue"
    else:
        return "dim"


def display_tasks_table(tasks: List[Task], title_prefix: str = "Brototype Daily Tasks"):
    """Display task list in a formatted terminal table."""
    if not tasks:
        if HAS_RICH:
            console.print(Panel("[yellow]No tasks found matching criteria.[/yellow]", title=title_prefix))
        else:
            print(f"\n--- {title_prefix} ---")
            print("No tasks found matching criteria.")
        return

    if HAS_RICH:
        table = Table(title=f"📋 {title_prefix}", show_header=True, header_style="bold magenta", expand=True)
        table.add_column("ID", style="dim", width=4, justify="right")
        table.add_column("Status", width=13, justify="center")
        table.add_column("Priority", width=10, justify="center")
        table.add_column("Category", width=16)
        table.add_column("Title", style="bold", ratio=2)
        table.add_column("Updated At", style="dim", width=19)
        table.add_column("Notes", style="italic", ratio=2)

        for task in tasks:
            status_style = get_status_style(task.status)
            priority_style = get_priority_style(task.priority)
            
            table.add_row(
                str(task.id),
                f"[{status_style}]{task.status}[/{status_style}]",
                f"[{priority_style}]{task.priority}[/{priority_style}]",
                task.category,
                task.title,
                task.updated_at,
                task.notes or "-"
            )
        console.print(table)
    else:
        print(f"\n=== {title_prefix} ({len(tasks)} tasks) ===")
        header = f"{'ID':<4} | {'Status':<12} | {'Priority':<8} | {'Category':<14} | {'Title':<30} | {'Notes'}"
        print(header)
        print("-" * len(header))
        for task in tasks:
            print(f"{task.id:<4} | {task.status:<12} | {task.priority:<8} | {task.category:<14} | {task.title[:28]:<30} | {task.notes[:30]}")


def display_summary_dashboard(manager: TaskManager):
    """Display progress statistics dashboard."""
    stats = manager.get_summary_stats()
    
    if HAS_RICH:
        content = (
            f"[bold]Total Tasks:[/bold] {stats['total']}\n"
            f"[bold green]Completed:[/bold green] {stats['completed']}\n"
            f"[bold yellow]In Progress:[/bold yellow] {stats['in_progress']}\n"
            f"[cyan]Pending:[/cyan] {stats['pending']}\n"
            f"[bold red]Blocked:[/bold red] {stats['blocked']}\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"[bold magenta]Completion Rate:[/bold magenta] {stats['completion_rate']}%"
        )
        console.print(Panel(content, title="📊 Brototype Daily Summary", border_style="bright_blue"))
    else:
        print("\n=== Brototype Daily Productivity Summary ===")
        print(f"Total Tasks:     {stats['total']}")
        print(f"Completed:       {stats['completed']}")
        print(f"In Progress:     {stats['in_progress']}")
        print(f"Pending:         {stats['pending']}")
        print(f"Blocked:         {stats['blocked']}")
        print(f"Completion Rate: {stats['completion_rate']}%")


def interactive_menu(manager: TaskManager):
    """Run interactive terminal menu loop."""
    while True:
        if HAS_RICH:
            console.print("\n[bold cyan]=== Brototype Daily Task Updating Tool ===[/bold cyan]")
            console.print("1. 📋 View All Tasks")
            console.print("2. 🔍 Filter / Search Tasks")
            console.print("3. ➕ Add New Task")
            console.print("4. 🔄 Update Task Status")
            console.print("5. ⚡ Update Task Priority")
            console.print("6. 📊 View Productivity Dashboard")
            console.print("7. 🗑️ Delete Task")
            console.print("8. 🚪 Exit")
            choice = Prompt.ask("\nSelect an option", choices=["1", "2", "3", "4", "5", "6", "7", "8"], default="1")
        else:
            print("\n=== Brototype Daily Task Updating Tool ===")
            print("1. View All Tasks")
            print("2. Filter / Search Tasks")
            print("3. Add New Task")
            print("4. Update Task Status")
            print("5. Update Task Priority")
            print("6. View Productivity Dashboard")
            print("7. Delete Task")
            print("8. Exit")
            choice = input("Select an option (1-8) [1]: ").strip() or "1"

        if choice == "1":
            manager.refresh()
            display_tasks_table(manager.tasks, "All Daily Tasks")

        elif choice == "2":
            manager.refresh()
            if HAS_RICH:
                status_choice = Prompt.ask("Filter by status (or press Enter for all)", choices=["", "Pending", "In Progress", "Completed", "Blocked"], default="")
                search_query = Prompt.ask("Search term (title/notes/category)", default="")
            else:
                status_choice = input("Filter by status (Pending/In Progress/Completed/Blocked) [All]: ").strip()
                search_query = input("Search term: ").strip()

            filtered = manager.filter_tasks(status=status_choice if status_choice else None, search=search_query if search_query else None)
            display_tasks_table(filtered, f"Filtered Results ({len(filtered)} found)")

        elif choice == "3":
            if HAS_RICH:
                title = Prompt.ask("Enter Task Title")
                category = Prompt.ask("Category", default="General")
                priority = Prompt.ask("Priority", choices=["High", "Medium", "Low"], default="Medium")
                status = Prompt.ask("Status", choices=["Pending", "In Progress", "Completed", "Blocked"], default="Pending")
                notes = Prompt.ask("Notes / Details (Optional)", default="")
            else:
                title = input("Enter Task Title: ").strip()
                category = input("Category [General]: ").strip() or "General"
                priority = input("Priority (High/Medium/Low) [Medium]: ").strip() or "Medium"
                status = input("Status (Pending/In Progress/Completed/Blocked) [Pending]: ").strip() or "Pending"
                notes = input("Notes / Details (Optional): ").strip()

            if title:
                try:
                    new_t = manager.add_task(title=title, category=category, priority=priority, status=status, notes=notes)
                    msg = f"Task #{new_t.id} '{new_t.title}' created successfully!"
                    if HAS_RICH:
                        console.print(f"[bold green]✓ {msg}[/bold green]")
                    else:
                        print(f"✓ {msg}")
                except Exception as e:
                    print(f"Error creating task: {e}")

        elif choice == "4":
            manager.refresh()
            display_tasks_table(manager.tasks, "Select Task ID to Update Status")
            try:
                task_id_str = input("\nEnter Task ID to update status: ").strip()
                if not task_id_str:
                    continue
                task_id = int(task_id_str)
                task = manager.get_task_by_id(task_id)
                if not task:
                    print(f"Task ID #{task_id} not found.")
                    continue

                if HAS_RICH:
                    new_status = Prompt.ask(f"Current status: '{task.status}'. Choose new status", choices=["Pending", "In Progress", "Completed", "Blocked"], default=task.status)
                    notes = Prompt.ask("Add status update note (Optional)", default="")
                else:
                    new_status = input(f"Current status: '{task.status}'. New status (Pending/In Progress/Completed/Blocked): ").strip()
                    notes = input("Add status update note (Optional): ").strip()

                if manager.update_task_status(task_id, new_status, notes):
                    msg = f"Task #{task_id} status updated to '{new_status}'!"
                    if HAS_RICH:
                        console.print(f"[bold green]✓ {msg}[/bold green]")
                    else:
                        print(f"✓ {msg}")
                else:
                    print("Failed to update status.")
            except ValueError:
                print("Invalid Task ID.")

        elif choice == "5":
            manager.refresh()
            display_tasks_table(manager.tasks, "Select Task ID to Update Priority")
            try:
                task_id_str = input("\nEnter Task ID to update priority: ").strip()
                if not task_id_str:
                    continue
                task_id = int(task_id_str)
                task = manager.get_task_by_id(task_id)
                if not task:
                    print(f"Task ID #{task_id} not found.")
                    continue

                if HAS_RICH:
                    new_prio = Prompt.ask(f"Current priority: '{task.priority}'. Choose new priority", choices=["High", "Medium", "Low"], default=task.priority)
                else:
                    new_prio = input(f"Current priority: '{task.priority}'. New priority (High/Medium/Low): ").strip()

                if manager.update_task_priority(task_id, new_prio):
                    msg = f"Task #{task_id} priority updated to '{new_prio}'!"
                    if HAS_RICH:
                        console.print(f"[bold green]✓ {msg}[/bold green]")
                    else:
                        print(f"✓ {msg}")
            except ValueError:
                print("Invalid Task ID.")

        elif choice == "6":
            manager.refresh()
            display_summary_dashboard(manager)

        elif choice == "7":
            manager.refresh()
            display_tasks_table(manager.tasks, "Select Task ID to Delete")
            try:
                task_id_str = input("\nEnter Task ID to delete: ").strip()
                if not task_id_str:
                    continue
                task_id = int(task_id_str)
                if manager.delete_task(task_id):
                    print(f"✓ Task #{task_id} deleted.")
                else:
                    print(f"Task #{task_id} not found.")
            except ValueError:
                print("Invalid Task ID.")

        elif choice == "8":
            print("Exiting Brototype Daily Task Updating Tool. Happy Coding! 🚀")
            break
