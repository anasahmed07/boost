
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional
from whatsapp_agent.utils.config import Config
from whatsapp_agent._debug import Logger

secrets_router = APIRouter(tags=["Secrets"], prefix="/secrets")


class SecretRequest(BaseModel):
    key: str
    value: str

class SecretResponse(BaseModel):
    key: str
    value: str

class BulkSecretRequest(BaseModel):
    secrets: List[SecretRequest]

class BulkSecretResponse(BaseModel):
    updated_secrets: List[SecretResponse]
    failed_secrets: List[Dict[str, str]]
    total_updated: int
    total_failed: int

class SecretsListResponse(BaseModel):
    secrets: Dict[str, str]


@secrets_router.get("/keys")
async def get_secret_keys():
    """Get only secret keys (without values) for security purposes"""
    try:
        credentials_manager = Config._get_credentials_manager()
        credentials = credentials_manager.load_credentials(force_reload=True)
        
        return {"keys": list(credentials.keys())}
    
    except Exception as e:
        Logger.error(f"Error fetching secret keys: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch secret keys")


@secrets_router.get("/", response_model=SecretsListResponse)
async def get_all_secrets():
    """Get all secrets (keys and values)"""
    try:
        credentials_manager = Config._get_credentials_manager()
        credentials = credentials_manager.load_credentials(force_reload=True)
        
        return SecretsListResponse(secrets=credentials)
    
    except Exception as e:
        Logger.error(f"Error fetching secrets: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch secrets")


@secrets_router.post("/", response_model=SecretResponse)
async def create_or_update_secret(secret: SecretRequest):
    """Create or update a single secret"""
    try:
        Config.set(secret.key, secret.value)
        
        return SecretResponse(key=secret.key, value=secret.value)
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        Logger.error(f"Error setting secret {secret.key}: {e}")
        raise HTTPException(status_code=500, detail="Failed to set secret")


@secrets_router.post("/bulk", response_model=BulkSecretResponse)
async def create_or_update_secrets_bulk(bulk_request: BulkSecretRequest):
    """Create or update multiple secrets at once"""
    try:
        updated_secrets = []
        failed_secrets = []
        
        for secret in bulk_request.secrets:
            try:
                Config.set(secret.key, secret.value)
                updated_secrets.append(SecretResponse(key=secret.key, value=secret.value))
                Logger.info(f"Successfully updated secret: {secret.key}")
            except ValueError as e:
                failed_secrets.append({
                    "key": secret.key,
                    "error": str(e),
                    "error_type": "validation_error"
                })
                Logger.warning(f"Validation error for secret {secret.key}: {e}")
            except Exception as e:
                failed_secrets.append({
                    "key": secret.key,
                    "error": str(e),
                    "error_type": "system_error"
                })
                Logger.error(f"Error setting secret {secret.key}: {e}")
        
        return BulkSecretResponse(
            updated_secrets=updated_secrets,
            failed_secrets=failed_secrets,
            total_updated=len(updated_secrets),
            total_failed=len(failed_secrets)
        )
    
    except Exception as e:
        Logger.error(f"Error in bulk secret update: {e}")
        raise HTTPException(status_code=500, detail="Failed to process bulk secret update")


