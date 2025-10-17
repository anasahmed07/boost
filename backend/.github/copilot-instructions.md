# AI Agent Instructions for Boost-Buddy-Backend

This document outlines key patterns and knowledge for AI agents working with the Boost Buddy WhatsApp agent codebase.

## Project Architecture

### Core Components
- **WhatsApp Integration** (`whatsapp_agent/bot/whatsapp_bot.py`): Central hub for message handling using Meta's WhatsApp Cloud API
- **AI Agents** (`whatsapp_agent/agents/`): Specialized agents for different conversation flows:
  - `b2b_business_support_agent/`: B2B customer support
  - `d2c_customer_support_agent/`: D2C customer support
  - `conversation_intent_router/`: Routes conversations to appropriate agents
  - `customer_greeting_agent/`: Handles initial customer interactions

### Data Flow
1. Incoming WhatsApp messages → Webhook → Message Processing → AI Agent Response → WhatsApp Reply
2. Real-time chat updates via WebSocket for frontend interface (`routes/websocket_chat.py`)
3. Vector stores for FAQ and knowledge base integration (`database/faq_vector_storage.py`, `database/knowledge_vector_storage.py`)

## Key Conventions

### Database Access
- All database operations inherit from `DataBase` class in `database/base.py`
- Each entity has its own database class (e.g., `CustomerDataBase`, `ReferralDataBase`)
- Use Pydantic models for data validation (`schema/` directory)

### Configuration Management
- Configuration handled via `utils/config.py` using environment variables
- Credential management through `database/credentials.py`
- Dynamic config updates supported via listener pattern

### Error Handling
- Custom exceptions defined in `exceptions.py`
- Structured hierarchy: WorkflowBaseError → specific error types
- Use appropriate error types for different categories (Input, Database, Agent, API, Security)

## Development Setup

```bash
# Run the development server
uv run -m uvicorn src.whatsapp_agent.main:app --reload --host 0.0.0.0 --port 8000

# For local testing, expose via ngrok
ngrok http --url=<your-ngrok-url> 8000
```

## Common Patterns

### Adding New Features
1. Define schemas in `schema/` if new data structures needed
2. Create database class in `database/` if persistence required
3. Add routes in `routes/` for API endpoints
4. Update agent instructions/tools for AI integration

### Agent Development
- Agent tools defined in `tools/` directory
- Use `@function_tool` decorator for new agent capabilities
- Vector stores for knowledge base integration
- Maintain conversation context via `context/` classes

### Integration Points
- WhatsApp Cloud API: `utils/wa_instance.py`
- Shopify: `shopify/base.py`
- QuickBooks: `quickbook/` directory
- OpenAI: Configuration in `utils/config.py`

## Critical Files
- `main.py`: Application entry point and router configuration
- `bot/whatsapp_bot.py`: Core message handling logic
- `utils/config.py`: Central configuration management
- `context/global_context.py`: Conversation context structure

Remember to check environment variables and API credentials before making changes. The system uses Supabase for storage and requires various external API keys to function properly.