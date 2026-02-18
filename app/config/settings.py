# Archivo: app/config/settings.py
import os
from dotenv import load_dotenv

# Carga .env buscando en la raíz del proyecto
load_dotenv() 

class Settings:
    BASE_URL = "https://core.kiconex.com/api"
    
    # Nuevo: Token de API estático (si se tiene) o desde el .env
    API_TOKEN = os.getenv("CORE_API_TOKEN", "3a50af52e02a7e757e1834d2a7af87e3") # Marcador de posición por defecto
    
    # Cloud API Configuration
    CLOUD_BASE_URL = "https://cloud.kiconex.com/api/v1"
    CLOUD_API_TOKEN = "rGVCziLROFxEACbVmLWDfEgvdPsu5Gyi"

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