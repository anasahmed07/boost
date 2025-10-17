from dotenv import load_dotenv
from agents import set_default_openai_key
from fastapi import Depends, HTTPException, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security.api_key import APIKeyHeader
from whatsapp_agent.routes.callback import callback
from whatsapp_agent.routes.chats import chat_router
from whatsapp_agent.routes.customers import customer_router
from whatsapp_agent.routes.analytics import analytics_router
from whatsapp_agent.routes.websocket_chat import chat_ws_router
from whatsapp_agent.routes.campaign import campaign_router
from whatsapp_agent.routes.persona import persona_router
from whatsapp_agent.routes.upload import upload_router
from whatsapp_agent.routes.secrets import secrets_router
from whatsapp_agent.routes.join_luckydraw import join_luckydraw_router
from whatsapp_agent.routes.broadcast import broadcast_router
from whatsapp_agent.routes.templates import templates_router
from whatsapp_agent.routes.shopify import shopifyRouter
from whatsapp_agent.routes.waitlist import waitlist_router
from whatsapp_agent.routes.referral import router as referral_router
from whatsapp_agent.routes.warranty_claims import warranty_claims_router
from whatsapp_agent._debug import enable_verbose_logging, Logger
from whatsapp_agent.utils.config import Config
from whatsapp_agent.utils.app_instance import app
from whatsapp_agent.utils.wa_instance import wa

# Load environment variables
load_dotenv()
enable_verbose_logging()

def _configure_agents_openai_from_config():
    """Configure agents SDK default OpenAI key/client from Config; safe to call repeatedly."""
    try:
        key = Config.get("OPENAI_API_KEY")
        if not key:
            Logger.warning("OPENAI_API_KEY missing; skipping agents default client setup")
            return
        set_default_openai_key(key)
        Logger.info("Configured agents default OpenAI key and client from Config")
    except Exception as e:
        Logger.error(f"Failed to configure agents OpenAI defaults: {e}")

_configure_agents_openai_from_config()

Config.add_listener(_configure_agents_openai_from_config)

api_key_header = APIKeyHeader(name="x-api-key", auto_error=False)
def get_api_key(api_key: str = Security(api_key_header)):
    expected_key = Config.get('FRONTEND_API_KEY')
    if not api_key or api_key != expected_key:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return True


# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/ping", tags=["Health"])
async def health_check():
    """
    Health check endpoint to verify if the API is running.
    """
    return {
        "status": "healthy",
        "message": "WhatsApp Agent is running",
        "version": "1.0.0"
    }

# Include routers
app.include_router(callback, tags=["Callback"])
app.include_router(chat_router, dependencies=[Depends(get_api_key)])
app.include_router(shopifyRouter)
app.include_router(customer_router, dependencies=[Depends(get_api_key)])
app.include_router(analytics_router, dependencies=[Depends(get_api_key)])
app.include_router(chat_ws_router, tags=["WebSocket Chats"])
app.include_router(campaign_router, dependencies=[Depends(get_api_key)])
app.include_router(persona_router, dependencies=[Depends(get_api_key)], tags=["Persona Management"])
app.include_router(upload_router, dependencies=[Depends(get_api_key)])
app.include_router(secrets_router, tags=["Secrets"], dependencies=[Depends(get_api_key)])
app.include_router(templates_router, dependencies=[Depends(get_api_key)])
app.include_router(join_luckydraw_router, tags=["Join Lucky Draw"])
app.include_router(broadcast_router, tags=["Broadcasts"], dependencies=[Depends(get_api_key)])
app.include_router(waitlist_router, dependencies=[Depends(get_api_key)])
app.include_router(referral_router, tags=["Referral"])
app.include_router(warranty_claims_router, dependencies=[Depends(get_api_key)])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000) # set """reload = True""" for hot relod in development