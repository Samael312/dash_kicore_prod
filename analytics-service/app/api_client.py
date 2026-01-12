# Archivo: app/api_client.py
import requests
import pandas as pd
import json
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
            response = requests.post(Settings.URL_LOGIN, json=payload, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if data.get("login") is True:
                self.token = data.get("apiToken")
                # Importante: Actualizamos los headers de la instancia
                self.headers = {'Authorization': f"Basic {self.token}"}
                print("✅ Login exitoso.")
                return self.token
            
            return None
        except Exception as e:
            print(f"❌ Error login: {e}")
            return None
    
    def _post(self, url, json_payload=None):
        """ Wrapper robusto para POST """
        # 1. Auto-login si no hay token
        if not self.token:
            print("⚠️ No hay sesión, intentando login...")
            if not self.login():
                return {"error": "No se pudo iniciar sesión"}

        # 2. Asegurar headers
        headers = self.headers.copy()
        
        try:
            # DEBUG: Ver exactamente qué estamos enviando
            print(f"\n📡 [POST] URL: {url}")
            print(f"📦 [PAYLOAD]: {json.dumps(json_payload)}") 
            
            response = requests.post(url, json=json_payload, headers=headers, timeout=15)
            
            # DEBUG: Ver respuesta cruda si hay error lógico
            if response.status_code == 200:
                try:
                    data = response.json()
                    # Kiconex devuelve {ok: false} en errores lógicos aunque sea 200 OK
                    if isinstance(data, dict) and data.get("ok") is False:
                        print(f"❌ [API Error Lógico]: {data.get('message')}")
                        # Lanzamos excepción para que main.py lo capture
                        raise ValueError(f"Kiconex Error: {data.get('message')}")
                    return data
                except ValueError as ve:
                    raise ve
                except Exception:
                    # Si no es JSON valido pero es 200
                    return response.text

            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            print(f"❌ [Http Error]: {e}")
            if e.response: print(f"Body: {e.response.text}")
            raise e

    def get_m2m(self):
        return self._get_data(Settings.URL_M2M, "resources/m2m.xlsx", params={"tenant_uuid": Settings.DEFAULT_TENANT_UUID})
    
    def get_pools(self):
        return self._get_data(Settings.URL_POOL, "resources/pool.xlsx")

    def get_devicesB(self):
        return self._get_data(Settings.URL_DEVICES, "resources/boards.xlsx")

    def get_devicesKiwi(self):
        return self._get_data(Settings.URL_DEVICES2, "resources/kiwi.xlsx")

    def get_deviceInfo(self):
        return self._get_data(Settings.URL_INFO, "resources/info.xlsx")
        
    def get_deviceModels(self):
        return self._get_data(Settings.URL_MODEL_B, "resources/models.xlsx")
        
    def get_deviceSoftware(self):
        return self._get_data(Settings.URL_VERSION_K, "resources/software.xlsx")
    
    def get_m2m_history(self, icc, payload):
        url = Settings.URL_HISTORY.format(icc=icc)
        return self._post(url, json_payload=payload)
    
    def get_deviceRenewals(self, show_all=True, from_date=None, to=None):
        # 1. Configurar params
        params = {}
        if show_all:
            params['showAll'] = 'true'
            # Usamos fechas por defecto amplias si es show_all
            params['from'] = '2020-01-01'
            params['to'] = '2035-01-01'
        else:
            # Si vienen fechas específicas, las usamos
            if from_date: params['from'] = from_date
            if to: params['to'] = to
            
        return self._get_data(
            Settings.URL_REN,           
            "resources/renewals.xlsx",  
            params=params               
        )

    # --- VERIFICACION Y OBTENCIÓN DE DATOS MEJORADA ---
    def _get_data(self, url, filename="resources/output.xlsx", params=None):
        if not self.token:
            print("No hay token de sesión. Intentando relogin...")
            if not self.login():
                print("Fallo crítico: No se pudo iniciar sesión.")
                return []

        try:
            print(f"Fetching: {url}")
            resp = requests.get(url, headers=self.headers, params=params, timeout=30)
            resp.raise_for_status() 

            data = resp.json()
            list_data = []

            # 1. Si es lista directa
            if isinstance(data, list):
                list_data = data
            
            # 2. Si es diccionario, buscamos la lista dentro
            elif isinstance(data, dict):
                # A. Busqueda por claves estándar
                if "content" in data and isinstance(data["content"], list):
                    list_data = data["content"]
                elif "data" in data and isinstance(data["data"], list):
                    list_data = data["data"]
                # B. Busqueda heurística (la primera lista que encuentre)
                else:
                    for k, v in data.items():
                        if isinstance(v, list):
                            list_data = v
                            break # Tomamos la primera lista que encontramos
            
            # 3. SIEMPRE intentamos exportar, aunque esté vacío (para debug)
            print(f"Datos recibidos para {filename}: {len(list_data)} registros.")
            self._export_columns_to_excel(list_data, filename)
            
            return list_data
        
        except Exception as e:
            print(f"ERROR CRÍTICO en {filename}: {e}")
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