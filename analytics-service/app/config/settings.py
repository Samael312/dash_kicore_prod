# Archivo: app/config/settings.py
import os
from dotenv import load_dotenv

# Carga .env buscando en la raíz del proyecto
load_dotenv() 

class Settings:
    BASE_URL = "https://core.kiconex.com/api"
    
    USER = os.getenv("CORE_USERNAME")
    PASSWORD = os.getenv("CORE_PASSWORD")
    
    API_TOKEN = os.getenv("CORE_API_TOKEN")
    CLOUD_API_TOKEN = os.getenv("CLOUD_API_TOKEN")

    # Cloud API Configuration
    CLOUD_BASE_URL = "https://cloud.kiconex.com/api/v1"

    # Database Configuration
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_NAME = os.getenv("DB_NAME", "metrics")
    DB_USER = os.getenv("DB_USER")
    DB_PASS = os.getenv("DB_PASS")

    DEFAULT_TENANT_UUID = "90be8c8a-f462-4a3e-afcf-d8f34094eaa8" 

    # ENDPOINTS
    URL_LOGIN = f"{BASE_URL}/users/sign-in"
    URL_POOL = f"{BASE_URL}/pools"
    URL_DEVICES = f"{BASE_URL}/boards"
    URL_DEVICES2 = f"{BASE_URL}/kiwi"
    URL_MODEL_B = f"{BASE_URL}/models"
    URL_VERSION_K = f"{BASE_URL}/versions"
    URL_INSTAL = f"{BASE_URL}/devices"
    URL_M2M_REN = f"{BASE_URL}/m2m-subscriptions/renewals"
    URL_PLAN_REN = f"{BASE_URL}/plan-subscriptions/renewals"
    URL_INFO = f"{BASE_URL}/boards/info"
    URL_M2M = f"{BASE_URL}/m2m"
    URL_HISTORY = f"{BASE_URL}/m2m/{{icc}}/consumes"