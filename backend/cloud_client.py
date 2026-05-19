from turtle import pd
import os
import pandas as pd
import requests
from config.settings import Settings


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
            self._export_columns_to_excel(response.json(), "resources/alarms_cloud.xlsx")
            return response.json()
        except Exception as e:
            print(f"❌ [CloudAPI Error]: {e}")
            return []
        
    def get_device_cloud(self):
        url = Settings.URL_INFO_DEVICE_CLOUD
        print(f"📡 [CloudAPI] Solicitando información de dispositivos... {url}")
        try:
            response = requests.get(url, headers=self.headers, timeout=30)
            response.raise_for_status()
            self._export_columns_to_excel(response.json(), "resources/device_cloud_info.xlsx")
            return response.json()
        except Exception as e:
            print(f"❌ [CloudAPI Error]: {e}")
            return []
    
    def _export_columns_to_excel(self, data, filename="resources/output.xlsx"):
        try:
            os.makedirs(os.path.dirname(filename), exist_ok=True)
            
            # Convertimos a DataFrame
            df = pd.DataFrame(data)
            
            # Si está vacío, creamos un DataFrame vacío pero lo guardamos igual
            if df.empty:
                print(f"⚠️ Aviso: Dataset vacío para {filename}. Se genera Excel vacío.")
                df = pd.DataFrame(columns=["Info"]) # Columna dummy para que Excel no se queje
            
            df.to_excel(filename, index=False)
            #print(f"💾 Excel guardado: {filename}")
            
        except Exception as e:
            print(f"Error exportando a Excel {filename}: {e}")