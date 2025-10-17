from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi


app = FastAPI(
    title="WhatsApp AI Agent API",
    description="""
    This is a WhatsApp AI Agent API that processes incoming WhatsApp messages and responds using AI.
    
    ## Workflow
    1. User sends message on WhatsApp
    2. Meta WhatsApp Cloud API receives message
    3. Webhook receives request
    4. Message is processed
    5. AI Agent generates reply
    6. Reply is sent back to WhatsApp
    
    ## Setup Required
    - Meta WhatsApp Business API credentials
    - OpenAI API key
    - Ngrok for local development
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)


# Custom OpenAPI schema
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="WhatsApp AI Agent API",
        version="1.0.0",
        description="API for WhatsApp AI Agent with detailed workflow",
        routes=app.routes,
    )
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema
app.openapi = custom_openapi
