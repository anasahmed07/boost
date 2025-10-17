import os
import base64
import time
from cryptography.fernet import Fernet
from whatsapp_agent.database.base import DataBase
from whatsapp_agent._debug import Logger


class CredentialsManager(DataBase):
    """Manages encrypted credentials stored in Supabase"""
    
    def __init__(self, cache_timeout=60):  # 1 minutes default
        super().__init__()
        self._credentials = {}
        self._loaded = False
        self._encryption_key = self._get_encryption_key()
        self._last_loaded = 0
        self._cache_timeout = cache_timeout  # seconds
    
    def _get_encryption_key(self):
        """Get encryption key from environment variable"""
        key = os.getenv('ENCRYPTION_KEY')
        if not key:
            raise ValueError("ENCRYPTION_KEY environment variable not set")
        
        # If the key is not in the correct format, generate it from the provided string
        try:
            # Try to use it directly (if it's already a Fernet key)
            Fernet(key.encode())
            return key.encode()
        except:
            key_bytes = key.encode('utf-8')
            # Pad or truncate to 32 bytes for Fernet
            key_bytes = key_bytes[:32].ljust(32, b'0')
            return base64.urlsafe_b64encode(key_bytes)
    
    def _encrypt_value(self, value: str) -> str:
        """Encrypt a credential value"""
        fernet = Fernet(self._encryption_key)
        encrypted_bytes = fernet.encrypt(value.encode('utf-8'))
        return base64.b64encode(encrypted_bytes).decode('utf-8')
    
    def _decrypt_value(self, encrypted_value: str) -> str:
        """Decrypt a credential value"""
        try:
            fernet = Fernet(self._encryption_key)
            encrypted_bytes = base64.b64decode(encrypted_value.encode('utf-8'))
            decrypted_bytes = fernet.decrypt(encrypted_bytes)
            return decrypted_bytes.decode('utf-8')
        except Exception as e:
            Logger.error(f"Error decrypting credential: {e}")
            return None

    def _is_cache_expired(self):
        """Check if cache has expired"""
        if self._cache_timeout <= 0:  # 0 or negative means no caching
            return True
        return (time.time() - self._last_loaded) > self._cache_timeout

    def load_credentials(self, force_reload=False):
        """Load and decrypt all credentials from Supabase credentials table"""
        if self._loaded and not force_reload and not self._is_cache_expired():
            return self._credentials
                     
        try:
            # Load credentials from the credentials table
            response = self.supabase.table("secrets").select("credname, value").execute()
                         
            if response.data:
                # Convert the key-value pairs to a dictionary and decrypt values
                self._credentials = {}
                for item in response.data:
                    credname = item["credname"]
                    encrypted_value = item["value"]
                    
                    # Decrypt the value
                    decrypted_value = self._decrypt_value(encrypted_value)
                    if decrypted_value is not None:
                        self._credentials[credname] = decrypted_value
                    else:
                        Logger.error(f"Failed to decrypt credential: {credname}")
            else:
                # Initialize empty credentials if none exist
                self._credentials = {}
                             
            self._loaded = True
            self._last_loaded = time.time()
            return self._credentials
        except Exception as e:
            Logger.error(f"Error loading credentials from Supabase: {e}")
            return {}

    def reload_credentials(self):
        """Force reload credentials from database (clears cache)"""
        self._loaded = False
        self._credentials = {}
        return self.load_credentials()
    
    def get_credential(self, key, default=None, force_reload=False):
        """Get a specific credential value (decrypted)"""
        if force_reload:
            self.reload_credentials()
        elif not self._loaded:
            self.load_credentials()
        return self._credentials.get(key, default)

    def set_credential(self, key: str, value: str) -> bool:
        """Set/update a credential"""
        try:
            encrypted_value = self._encrypt_value(value)

            # Check if credential exists first
            existing = self.supabase.table('secrets').select('credname').eq('credname', key).execute()
            
            if existing.data:
                # Update existing credential
                result = self.supabase.table('secrets').update({
                    'value': encrypted_value,
                    'updated_at': 'now()'
                }).eq('credname', key).execute()
            else:
                # Insert new credential
                result = self.supabase.table('secrets').insert({
                    'credname': key,
                    'value': encrypted_value,
                    'updated_at': 'now()'
                }).execute()

            # Invalidate cache for this key to ensure fresh value on next get
            # This part is crucial for cache coherency
            if key in self._credentials:
                del self._credentials[key]
            self._loaded = False # Invalidate the entire cache since we modified the db
            self._last_loaded = 0
            Logger.info(f"Set credential {key} and invalidated cache")
            
            return True
        except Exception as e:
            Logger.error(f"Error setting credential {key}: {e}")
            return False