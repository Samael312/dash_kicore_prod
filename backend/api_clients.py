# Archivo: backend/api_client.py
import requests
from config.settings import Settings
import pandas as pd

class CoreClient:
    def __init__(self, token=None):
        self.token = token
        self.headers = {'Authorization': f"Basic {self.token}"} if token else {}

    def login(self):
        """Hace login y devuelve el apiToken"""
        payload = {"username": Settings.USER, "password": Settings.PASSWORD}
        try:
            response = requests.post(Settings.URL_LOGIN, json=payload)
            response.raise_for_status()
            data = response.json()
            if data.get("login") is True:
                return data.get("apiToken")
            return None
        except Exception as e:
            print(f"Error login: {e}")
            return None

    def get_m2m(self):
        return self._get_data(Settings.URL_M2M, "resources/m2m.xlsx", params={"tenant_uuid": Settings.DEFAULT_TENANT_UUID})

    def get_devicesB(self):
        return self._get_data(Settings.URL_DEVICES, "resources/boards.xlsx")

    def get_devicesKiwi(self):
        return self._get_data(Settings.URL_DEVICES2, "resources/kiwi.xlsx")

    def get_deviceInfo(self):
        return self._get_data(Settings.URL_INFO, "resources/info.xlsx")
    def get_deviceModels(self):
        return self._get_data(Settings.URL_MODEL_B, "resources/models.xlsx")
    def get_deviceSoftware(self):
        return self._get_data(Settings.URL_MODEL_K, "resources/software.xlsx")

# VERIFICACION DE DATOS
    def _get_data(self, url, filename="resources/output.xlsx", params=None):
        if not self.token:
            print("No hay token de sesión. Conéctese primero.")
            return []
        try:
            resp = requests.get(url, headers=self.headers, params=params)
            resp.raise_for_status() # Esto lanzará un error para códigos 4xx/5xx

            data = resp.json()
            list_data = []

            # Detectar si es dict con lista interna
            if isinstance(data, dict):
                # Buscar la primera lista que contenga dicts
                list_data = None
                for k, v in data.items():
                    if isinstance(v, list) and len(v) > 0 and isinstance(v[0], dict):
                        list_data = v
                        break
                if list_data is None:
                    # Si el dict viene, pero no contiene una lista de dicts (puede que esté vacío)
                    print(f"Dict recibido para {filename} pero sin lista interna compatible. Claves: {list(data.keys())}")
                    list_data = []
            elif isinstance(data, list):
                list_data = data
            else:
                print(f"Formato de datos no soportado para {filename}: {type(data)}")
                list_data = []

            # Exportar a Excel
            if list_data: # Solo intenta exportar si hay datos
                self._export_columns_to_excel(list_data, filename)
            else:
                print(f"La API de {filename} devolvió datos válidos, pero la lista está vacía. No se crea el Excel.")
                
            return list_data
        
        # --- Manejo de errores específicos para mejor diagnóstico ---
        except requests.exceptions.HTTPError as http_err:
            print(f"ERROR HTTP ({resp.status_code}) en {filename} desde {url}: {http_err}")
            return []
        except requests.exceptions.ConnectionError as conn_err:
            print(f"ERROR DE CONEXIÓN en {filename} desde {url}: {conn_err}")
            return []
        except Exception as e:
            print(f"ERROR DESCONOCIDO en {filename} desde {url}: {e}")
            return []

#FUNCION EXPORTACION EN EXCEL
    def _export_columns_to_excel(self, data, filename="resources/output.xlsx"):
        if not data:
            print(f"No hay datos para exportar a {filename}")
            return
        try:
            df = pd.DataFrame(data)
            df.to_excel(filename, index=False)
            print(f"Datos exportados a {filename}. Columnas: {df.columns.tolist()}")
        except Exception as e:
            print(f"Error exportando a Excel: {e}")