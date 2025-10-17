from whatsapp_agent._debug import Logger
import tempfile
import aiohttp
from openai import OpenAI
from typing import Optional

class AudioProcessor:
    """Handles audio processing for voice messages"""
    
    def __init__(self, openai_client: OpenAI):
        self.client = openai_client
    
    async def download_audio(self, audio_url: str, access_token: str) -> Optional[str]:
        """Download audio file from URL"""
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(audio_url, headers=headers) as response:
                    if response.status == 200:
                        # Create temporary file
                        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.ogg')
                        temp_file.write(await response.read())
                        temp_file.close()
                        return temp_file.name
                    else:
                        Logger.error(f"{__name__}: download_audio -> Download failed. Status: {response.status}")
                        Logger.error(f"{__name__}: download_audio -> Response: {await response.text()}")
                        return None
        except Exception as e:
            Logger.error(f"{__name__}: download_audio -> Error downloading audio: {e}")
            return None

    async def download_audio_from_message(self, message) -> Optional[str]:
        """Download audio file from pywa Message object"""
        try:
            # Get the media URL from the message
            media_url = await message.audio.get_media_url()
            
            # Get the access token from config
            from whatsapp_agent.utils.config import Config
            access_token = Config.get("WHATSAPP_ACCESS_TOKEN")
            
            # Download the audio file
            return await self.download_audio(media_url, access_token)
            
        except Exception as e:
            Logger.error(f"{__name__}: download_audio_from_message -> Error downloading audio from message: {e}")
            return None


    async def convert_to_text(self, audio_file: str) -> Optional[str]:
        """Convert audio to text using Whisper"""
        try:
            with open(audio_file, "rb") as file:
                response = self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=file
                )
                return response.text
        except Exception as e:
            Logger.error(f"{__name__}: convert_to_text -> Error converting audio to text: {e}")
            return None