import os
import base64
from cryptography.fernet import Fernet
from whatsapp_agent.database.base import DataBase


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

    def manage_secrets(self):
        """View, update, and add secrets interactively"""
        print("🔐 Secrets Manager")
        print("=" * 40)

        try:
            # Fetch all existing secrets
            response = self.supabase.table("secrets").select("credname, value").execute()
            secrets = {item["credname"]: item["value"] for item in response.data} if response.data else {}

            # Update existing secrets
            for credname, stored_value in secrets.items():
                decrypted_value = self._decrypt_value(stored_value)

                print(f"\nVariable: {credname}")
                print(f"Current Value (decrypted): {decrypted_value}")

                new_value = input("Enter new value (leave empty to keep current): ").strip()
                if new_value:
                    try:
                        encrypted_value = self._encrypt_value(new_value)
                        update_response = (
                            self.supabase.table("secrets")
                            .update({"value": encrypted_value})
                            .eq("credname", credname)
                            .execute()
                        )
                        if update_response.data:
                            print(f"✓ Updated {credname}")
                        else:
                            print(f"✗ Failed to update {credname}")
                    except Exception as e:
                        print(f"✗ Error updating {credname}: {e}")
                else:
                    print(f"Skipped {credname}")

            # Add new secrets
            while True:
                add_choice = input("\nDo you want to add a new secret? (y/n): ").lower().strip()
                if add_choice not in ["y", "yes"]:
                    break

                new_name = input("Enter secret name: ").strip()
                if not new_name:
                    print("✗ Secret name cannot be empty.")
                    continue

                if new_name in secrets:
                    print("✗ Secret already exists. Use update section instead.")
                    continue

                new_value = input("Enter secret value: ").strip()
                if not new_value:
                    print("✗ Secret value cannot be empty.")
                    continue

                try:
                    encrypted_value = self._encrypt_value(new_value)
                    insert_response = (
                        self.supabase.table("secrets")
                        .insert({"credname": new_name, "value": encrypted_value})
                        .execute()
                    )
                    if insert_response.data:
                        print(f"✓ Added new secret: {new_name}")
                    else:
                        print(f"✗ Failed to add {new_name}")
                except Exception as e:
                    print(f"✗ Error adding {new_name}: {e}")

        except Exception as e:
            print(f"Error managing secrets: {e}")


def main():
    print("🔐 Secrets Manager Tool")
    print("=" * 40)

    if not os.getenv("ENCRYPTION_KEY"):
        print("❌ Error: ENCRYPTION_KEY environment variable not set")
        return

    try:
        manager = SecretsManager()
        manager.manage_secrets()
    except Exception as e:
        print(f"❌ Tool failed: {e}")


if __name__ == "__main__":
    main()
