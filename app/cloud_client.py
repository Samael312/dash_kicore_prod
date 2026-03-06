import requests
from app.config.settings import Settings

class CloudClient:
    def __init__(self, token=None):
        self.token = token or Settings.CLOUD_API_TOKEN
        self.base_url = Settings.CLOUD_BASE_URL
        self.headers = {"X-QUIIOT-TOKEN": self.token}

    def get_alarms(self, state="1,2"):
        """
        Obtiene las alarmas desde la API de Cloud filtered por estado.
        Por defecto trae activas (1) y no reconocidas/otras (2).
        """
        url = f"{self.base_url}/devices/alarms"
        params = {"state": state}
        
        print(f"📡 [CloudAPI] Solicitando alarmas (state={state})...")
        try:
            response = requests.get(url, headers=self.headers, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"❌ [CloudAPI Error]: {e}")
            return []
