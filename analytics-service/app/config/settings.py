# Archivo: app/config/settings.py
import os
from dotenv import load_dotenv

# Carga .env buscando en la raíz del proyecto
load_dotenv() 

class Settings:
    BASE_URL = "https://core.kiconex.com/api"
    
    USER = os.getenv("CORE_USERNAME")
    PASSWORD = os.getenv("CORE_PASSWORD")
    
    DEFAULT_TENANT_UUID = "90be8c8a-f462-4a3e-afcf-d8f34094eaa8" 

    # ENDPOINTS
    URL_LOGIN = f"{BASE_URL}/users/sign-in"
    URL_POOL = f"{BASE_URL}/pools"
    URL_DEVICES = f"{BASE_URL}/boards"
    URL_DEVICES2 = f"{BASE_URL}/kiwi"
    URL_MODEL_B = f"{BASE_URL}/models"
    URL_VERSION_K = f"{BASE_URL}/versions"
    URL_REN = f"{BASE_URL}/boards/renewals"
    URL_INFO = f"{BASE_URL}/boards/info"
    URL_M2M = f"{BASE_URL}/m2m"
    URL_HISTORY = f"{BASE_URL}/m2m/{{icc}}/consumes"