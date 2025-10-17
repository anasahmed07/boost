from typing import List
from whatsapp_agent._debug import Logger
from whatsapp_agent.agents.d2c_customer_support_agent.instructions import dynamic_instructions
from whatsapp_agent.context.global_context import GlobalContext
from agents import Agent, Runner, OpenAIResponsesModel, FileSearchTool

# Customer support tools
from whatsapp_agent.tools.customer_support.escalate_to_human import escalate_to_human_support_tool
from whatsapp_agent.tools.customer_support.order_tracking import track_customer_order_tool
from whatsapp_agent.tools.customer_support.send_product_image import send_product_image_tool
from whatsapp_agent.tools.customer_support.referral_link import get_referral_link
from whatsapp_agent.tools.customer_support.waitlist_tool import add_customer_to_waitlist, check_customer_waitlist
from whatsapp_agent.tools.customer_support.warranty_claim import process_warranty_claim
from whatsapp_agent.utils.vector_store import VectorStoreManager


from agents import RunContextWrapper


class D2CCustomerSupportAgent(Agent):
    def __init__(self, mcp_server, openai_client, context:GlobalContext): 
        self.boost_mcp_server = mcp_server
        self.context = context

        super().__init__(
            name="D2C Customer Support Agent",
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
            track_customer_order_tool,
            escalate_to_human_support_tool,
            send_product_image_tool,
            add_customer_to_waitlist,
            check_customer_waitlist,
            process_warranty_claim,
            FileSearchTool(
                max_num_results=3,
                vector_store_ids=[faq_vector_store_id, doc_vector_store_id],
                include_search_results=True,
            )
        ]

        if self.context.campaigns:
            BASE_TOOLS.insert(3, get_referral_link)

        return BASE_TOOLS

    async def run(self, input_text: str):
        response = await self._run_agent(input_text)
        Logger.info(f"D2C Customer Support Agent response: {response.final_output_as(str)}")
        await self._cleanup()
        return response.final_output_as(str)

    async def _run_agent(self, input_text: str):
        return await Runner.run(
            starting_agent=self,
            input=input_text,
            context=self.context,
        )

    async def _cleanup(self):
        if self.boost_mcp_server:
            Logger.info("Cleaning up D2C Customer Support Agent resources (MCP).")
            await self.boost_mcp_server.cleanup()

