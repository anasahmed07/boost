from typing import List
from whatsapp_agent._debug import Logger
from whatsapp_agent.agents.b2b_business_support_agent.instructions import dynamic_instructions
from whatsapp_agent.context.global_context import GlobalContext
from agents import Agent, Runner, OpenAIResponsesModel, FileSearchTool

from whatsapp_agent.tools.customer_support.escalate_to_human import escalate_to_human_support_tool
from whatsapp_agent.tools.customer_support.send_product_image import send_product_image_tool
from whatsapp_agent.utils.vector_store import VectorStoreManager

from whatsapp_agent.tools.quickbook_tools.invoices import (
    check_invoice_status_tool,
    create_invoice_tool,
    get_invoices_by_customer_tool,
    get_last_invoice_by_customer_tool,
    get_unpaid_invoices_by_customer_tool,
    get_due_date_tool,
    get_invoice_tool,
)

class B2BBusinessSupportAgent(Agent):
    def __init__(self, mcp_server, openai_client, context:GlobalContext):
        self.boost_mcp_server = mcp_server
        self.context = context
       
        super().__init__(
            name="B2BBusinessSupportAgent",
            instructions=dynamic_instructions,
            model=OpenAIResponsesModel(
                model="gpt-4.1",
                openai_client=openai_client
            ),
            mcp_servers=[self.boost_mcp_server],
            tools=self._get_all_tools()
        )
    
    def _get_all_tools(self) -> List[str]:
        manager = VectorStoreManager()
        faq_vector_store_id = manager.get_vector_store_id("FAQ-Vector-Store")
        doc_vector_store_id = manager.get_vector_store_id("Company-Docs-Vector-Store")
        BASE_TOOLS = [
            escalate_to_human_support_tool,
            check_invoice_status_tool,
            create_invoice_tool,
            get_invoices_by_customer_tool,
            get_last_invoice_by_customer_tool,
            get_unpaid_invoices_by_customer_tool,
            get_due_date_tool,
            get_invoice_tool,
            send_product_image_tool,
            FileSearchTool(
                max_num_results=3,
                vector_store_ids=[faq_vector_store_id, doc_vector_store_id],
                include_search_results=True,
            )
        ]
        return BASE_TOOLS

    async def run(self, input_text: str):
        # This method would handle the input text and interact with QuickBook services
        response = await self._run_agent(input_text)
        Logger.info(f"B2B Business Support Agent response: {response.final_output}")
        await self._cleanup()
        return response.final_output_as(str)

    async def _run_agent(self, input_text: str):
        # This method would process the input text and return a response
        return await Runner.run(
            starting_agent=self,
            input=input_text,
            context=self.context,
        )

    async def _cleanup(self):
        if self.boost_mcp_server:
            Logger.info("Cleaning up B2B Business Support Agent resources.")
            await self.boost_mcp_server.cleanup()