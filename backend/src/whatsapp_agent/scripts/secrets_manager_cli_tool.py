import os
import sys
import base64
from typing import Optional
from cryptography.fernet import Fernet
import typer
from rich.console import Console
from rich.table import Table
from rich.prompt import Prompt, Confirm
from rich.panel import Panel
from rich.live import Live
from whatsapp_agent.database.base import DataBase

app = typer.Typer(
    name="secrets",
    help="🔐 Secrets Manager CLI - Manage encrypted secrets in your database",
    add_completion=False,
)
console = Console()


class SecretsManager(DataBase):
    """Tool to view, update, and add secrets in the database"""

    def __init__(self):
        super().__init__()
        self._encryption_key = self._get_encryption_key()
        self.fernet = Fernet(self._encryption_key)

    def _get_encryption_key(self):
        """Get encryption key from environment variable"""
        key = os.getenv("ENCRYPTION_KEY")
        if not key:
            raise ValueError("ENCRYPTION_KEY environment variable not set")

        try:
            Fernet(key.encode())
            return key.encode()
        except:
            key_bytes = key.encode("utf-8")
            key_bytes = key_bytes[:32].ljust(32, b"0")
            return base64.urlsafe_b64encode(key_bytes)

    def _encrypt_value(self, value: str) -> str:
        """Encrypt a credential value"""
        encrypted_bytes = self.fernet.encrypt(value.encode("utf-8"))
        return base64.b64encode(encrypted_bytes).decode("utf-8")

    def _decrypt_value(self, value: str) -> str:
        """Try to decrypt value if encrypted, else return raw"""
        try:
            encrypted_bytes = base64.b64decode(value.encode("utf-8"))
            decrypted_bytes = self.fernet.decrypt(encrypted_bytes)
            return decrypted_bytes.decode("utf-8")
        except Exception:
            return value

    def list_secrets(self, show_values: bool = False) -> None:
        """List all secrets in the database"""
        try:
            response = self.supabase.table("secrets").select("credname, value").execute()

            if not response.data:
                console.print("[yellow]📭 No secrets found in database[/yellow]")
                return

            table = Table(title=f"🔐 Secrets ({len(response.data)} total)", show_header=True)
            table.add_column("Name", style="cyan", no_wrap=True)
            table.add_column("Value", style="green")

            for item in response.data:
                credname = item["credname"]
                if show_values:
                    decrypted_value = self._decrypt_value(item["value"])
                    table.add_row(credname, decrypted_value)
                else:
                    table.add_row(credname, "••••••••")

            console.print(table)
        except Exception as e:
            console.print(f"[red]❌ Error listing secrets: {e}[/red]")
            raise typer.Exit(code=1)

    def get_secret(self, name: str, show_value: bool = True) -> Optional[str]:
        """Get a specific secret by name"""
        try:
            response = (
                self.supabase.table("secrets")
                .select("credname, value")
                .eq("credname", name)
                .execute()
            )

            if not response.data:
                console.print(f"[red]❌ Secret '{name}' not found[/red]")
                raise typer.Exit(code=1)

            decrypted_value = self._decrypt_value(response.data[0]["value"])

            if show_value:
                console.print(
                    Panel(
                        f"[green]{decrypted_value}[/green]",
                        title=f"🔑 {name}",
                        border_style="cyan",
                    )
                )

            return decrypted_value
        except typer.Exit:
            raise
        except Exception as e:
            console.print(f"[red]❌ Error getting secret: {e}[/red]")
            raise typer.Exit(code=1)

    def add_secret(self, name: str, value: Optional[str] = None) -> None:
        """Add a new secret to the database"""
        try:
            existing = (
                self.supabase.table("secrets")
                .select("credname")
                .eq("credname", name)
                .execute()
            )

            if existing.data:
                console.print(f"[red]❌ Secret '{name}' already exists. Use 'update' command instead.[/red]")
                raise typer.Exit(code=1)

            if value is None:
                value = Prompt.ask(f"[cyan]Enter value for '{name}'[/cyan]", password=True)

            if not value:
                console.print("[red]❌ Secret value cannot be empty[/red]")
                raise typer.Exit(code=1)

            encrypted_value = self._encrypt_value(value)
            response = (
                self.supabase.table("secrets")
                .insert({"credname": name, "value": encrypted_value})
                .execute()
            )

            if response.data:
                console.print(f"[green]✅ Successfully added secret: {name}[/green]")
            else:
                console.print(f"[red]❌ Failed to add secret: {name}[/red]")
                raise typer.Exit(code=1)
        except typer.Exit:
            raise
        except Exception as e:
            console.print(f"[red]❌ Error adding secret: {e}[/red]")
            raise typer.Exit(code=1)

    def update_secret(self, name: str, value: Optional[str] = None, show_current: bool = True) -> None:
        """Update an existing secret"""
        try:
            existing = (
                self.supabase.table("secrets")
                .select("credname, value")
                .eq("credname", name)
                .execute()
            )

            if not existing.data:
                console.print(f"[red]❌ Secret '{name}' not found. Use 'add' command to create it.[/red]")
                raise typer.Exit(code=1)

            if show_current and value is None:
                current_value = self._decrypt_value(existing.data[0]["value"])
                console.print(f"[dim]Current value: {current_value}[/dim]")

            if value is None:
                value = Prompt.ask(f"[cyan]Enter new value for '{name}'[/cyan]", password=True)

            if not value:
                console.print("[red]❌ Secret value cannot be empty[/red]")
                raise typer.Exit(code=1)

            encrypted_value = self._encrypt_value(value)
            response = (
                self.supabase.table("secrets")
                .update({"value": encrypted_value})
                .eq("credname", name)
                .execute()
            )

            if response.data:
                console.print(f"[green]✅ Successfully updated secret: {name}[/green]")
            else:
                console.print(f"[red]❌ Failed to update secret: {name}[/red]")
                raise typer.Exit(code=1)
        except typer.Exit:
            raise
        except Exception as e:
            console.print(f"[red]❌ Error updating secret: {e}[/red]")
            raise typer.Exit(code=1)

    def delete_secret(self, name: str, force: bool = False) -> None:
        """Delete a secret from the database"""
        try:
            existing = (
                self.supabase.table("secrets")
                .select("credname")
                .eq("credname", name)
                .execute()
            )

            if not existing.data:
                console.print(f"[red]❌ Secret '{name}' not found[/red]")
                raise typer.Exit(code=1)

            if not force:
                if not Confirm.ask(f"[yellow]⚠️  Are you sure you want to delete '{name}'?[/yellow]"):
                    console.print("[yellow]❌ Deletion cancelled[/yellow]")
                    raise typer.Exit(code=0)

            response = (
                self.supabase.table("secrets")
                .delete()
                .eq("credname", name)
                .execute()
            )

            if response.data:
                console.print(f"[green]✅ Successfully deleted secret: {name}[/green]")
            else:
                console.print(f"[red]❌ Failed to delete secret: {name}[/red]")
                raise typer.Exit(code=1)
        except typer.Exit:
            raise
        except Exception as e:
            console.print(f"[red]❌ Error deleting secret: {e}[/red]")
            raise typer.Exit(code=1)

    def interactive_mode(self) -> None:
        """Interactive mode for managing secrets with live progress panel"""
        console.print(Panel.fit("🔐 Interactive Secrets Manager", border_style="cyan"))

        try:
            response = self.supabase.table("secrets").select("credname, value").execute()
            secrets = {item["credname"]: item["value"] for item in response.data} if response.data else {}

            if not secrets:
                console.print("[yellow]📭 No secrets found in database[/yellow]")
                return

            total = len(secrets)

            with Live(console=console, refresh_per_second=10) as live:
                for idx, (credname, stored_value) in enumerate(secrets.items(), start=1):
                    decrypted_value = self._decrypt_value(stored_value)
                    panel = Panel.fit(
                        f"[bold cyan]Variable:[/bold cyan] {credname}\n"
                        f"[dim]Current Value: {decrypted_value}[/dim]\n\n"
                        f"[grey58]Progress: {idx}/{total}[/grey58]",
                        border_style="cyan",
                        title=f"🔐 Secret {idx}/{total}",
                    )
                    live.update(panel)

                    new_value = Prompt.ask(
                        "Enter new value (leave empty to skip)",
                        default="",
                        show_default=False,
                        password=True,
                    )

                    if new_value:
                        encrypted_value = self._encrypt_value(new_value)
                        update_response = (
                            self.supabase.table("secrets")
                            .update({"value": encrypted_value})
                            .eq("credname", credname)
                            .execute()
                        )
                        if update_response.data:
                            console.print(f"[green]✅ Updated {credname}[/green]\n")
                        else:
                            console.print(f"[red]❌ Failed to update {credname}[/red]\n")
                    else:
                        console.print(f"[yellow]⏭️  Skipped {credname}[/yellow]\n")

            console.rule("[cyan]Add New Secrets[/cyan]")

            while True:
                if not Confirm.ask("[cyan]Add a new secret?[/cyan]", default=False):
                    break

                new_name = Prompt.ask("[cyan]Enter secret name[/cyan]")
                if not new_name:
                    console.print("[red]❌ Secret name cannot be empty[/red]")
                    continue

                if new_name in secrets:
                    console.print("[red]❌ Secret already exists[/red]")
                    continue

                new_value = Prompt.ask("[cyan]Enter secret value[/cyan]", password=True)
                if not new_value:
                    console.print("[red]❌ Secret value cannot be empty[/red]")
                    continue

                encrypted_value = self._encrypt_value(new_value)
                insert_response = (
                    self.supabase.table("secrets")
                    .insert({"credname": new_name, "value": encrypted_value})
                    .execute()
                )
                if insert_response.data:
                    console.print(f"[green]✅ Added new secret: {new_name}[/green]\n")
                    secrets[new_name] = encrypted_value
                else:
                    console.print(f"[red]❌ Failed to add {new_name}[/red]\n")

            console.print("[green]✨ Done![/green]")

        except Exception as e:
            console.print(f"[red]❌ Error in interactive mode: {e}[/red]")
            raise typer.Exit(code=1)


def check_encryption_key():
    """Check if ENCRYPTION_KEY is set"""
    if not os.getenv("ENCRYPTION_KEY"):
        console.print("[red]❌ Error: ENCRYPTION_KEY environment variable not set[/red]")
        raise typer.Exit(code=1)


@app.command()
def list(
    show_values: bool = typer.Option(False, "--show-values", "-s", help="Show decrypted values")
):
    """List all secrets in the database"""
    check_encryption_key()
    manager = SecretsManager()
    manager.list_secrets(show_values=show_values)


@app.command()
def get(name: str = typer.Argument(..., help="Secret name to retrieve")):
    """Get a specific secret by name"""
    check_encryption_key()
    manager = SecretsManager()
    manager.get_secret(name)


@app.command()
def add(
    name: str = typer.Argument(..., help="Secret name to add"),
    value: Optional[str] = typer.Option(None, "--value", "-v", help="Secret value (will prompt if not provided)"),
):
    """Add a new secret to the database"""
    check_encryption_key()
    manager = SecretsManager()
    manager.add_secret(name, value)


@app.command()
def update(
    name: str = typer.Argument(..., help="Secret name to update"),
    value: Optional[str] = typer.Option(None, "--value", "-v", help="New secret value (will prompt if not provided)"),
    hide_current: bool = typer.Option(False, "--hide-current", help="Don't show current value before updating"),
):
    """Update an existing secret"""
    check_encryption_key()
    manager = SecretsManager()
    manager.update_secret(name, value, show_current=not hide_current)


@app.command()
def delete(
    name: str = typer.Argument(..., help="Secret name to delete"),
    force: bool = typer.Option(False, "--force", "-f", help="Skip confirmation prompt"),
):
    """Delete a secret from the database"""
    check_encryption_key()
    manager = SecretsManager()
    manager.delete_secret(name, force)


@app.command()
def interactive():
    """Launch interactive mode for managing secrets"""
    check_encryption_key()
    manager = SecretsManager()
    manager.interactive_mode()


def main():
    app()


if __name__ == "__main__":
    main()
