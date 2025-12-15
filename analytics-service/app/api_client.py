# Archivo: app/api_client.py
import requests
import pandas as pd
import os
from app.config.settings import Settings

class CoreClient:
    def __init__(self, token=None):
        self.token = token
        self.headers = {'Authorization': f"Basic {self.token}"} if token else {}

    def login(self):
        """Hace login y actualiza el token interno"""
        payload = {"username": Settings.USER, "password": Settings.PASSWORD}
        try:
            print(f"Intentando login con usuario: {Settings.USER}")
            response = requests.post(Settings.URL_LOGIN, json=payload)
            response.raise_for_status()
            data = response.json()
            if data.get("login") is True:
                self.token = data.get("apiToken")
                self.headers = {'Authorization': f"Basic {self.token}"}
                print(f"TOKEN: {self.headers}")
                print("Login exitoso.")
                return self.token
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
            print("No hay token de sesión. Intentando relogin...")
            if not self.login():
                print("Fallo crítico: No se pudo iniciar sesión.")
                return []

        try:
            resp = requests.get(url, headers=self.headers, params=params)
            resp.raise_for_status() 

            data = resp.json()
            list_data = []

            if isinstance(data, dict):
                list_data = None
                for k, v in data.items():
                    if isinstance(v, list) and len(v) > 0 and isinstance(v[0], dict):
                        list_data = v
                        break
                if list_data is None:
                    list_data = []
            elif isinstance(data, list):
                list_data = data
            else:
                list_data = []
            if list_data: 
                self._export_columns_to_excel(list_data, filename)
            
            return list_data
        
        except Exception as e:
            print(f"ERROR en {filename}: {e}")
            return []

    def _export_columns_to_excel(self, data, filename="resources/output.xlsx"):
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        
        if not data:
            return
        try:
            df = pd.DataFrame(data)
            df.to_excel(filename, index=False)
        except Exception as e:
            print(f"Error exportando a Excel: {e}")