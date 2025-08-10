from typing import Optional
import os
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

class Settings:
    # Traccar demo sunucu ayarları
    TRACCAR_URL: str = "https://demo.traccar.org"  # Alternatif demo sunucusu
    TRACCAR_USER: str = "arif_4_4@hotmail.com"  # Kullanıcı e-posta
    TRACCAR_PASS: str = "15141514"  # Şifre
    
    def __init__(self):
        # Validate settings
        if not all([self.TRACCAR_URL, self.TRACCAR_USER, self.TRACCAR_PASS]):
            raise ValueError("Missing required Traccar configuration. Please check your environment variables or config.py")

settings = Settings()