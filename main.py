import streamlit as st
import pandas as pd
import json

# Backend
from config.settings import Settings
from backend.api_clients import CoreClient
from backend.M2M.data_m2m import process_m2m
from backend.Device.data_device import prepare_boards, prepare_kiwi
from backend.Info.data_info import process_devicesInfo

# Frontend (Vistas)
from frontend.views import devices_view, m2m_view, info_view

# --- CONFIGURACIÓN INICIAL ---
st.set_page_config(page_title="Dashboard Flota", layout="wide", page_icon="📊")

# --- GESTIÓN DE SESIÓN ---
if 'token' not in st.session_state:
    st.session_state['token'] = None

if not st.session_state['token']:
    col1, col2, col3 = st.columns([1,2,1])
    with col2:
        st.title("🔐 Login Core")
        if st.button("Conectar con Credenciales"):
            with st.spinner("Autenticando..."):
                try:
                    client = CoreClient()
                    token = client.login()
                    if token:
                        st.session_state['token'] = token
                        st.rerun()
                    else:
                        st.error("Error de conexión. Revisa usuario/pass en .env")
                except Exception as e:
                    st.error(f"Error al conectar con el servidor: {e}")
    st.stop()

# --- CARGA DE DATOS ---
client = CoreClient(st.session_state['token'])

with st.spinner("Descargando datos de la flota..."):
    try:
        # 1. Descarga de datos crudos
        raw_m2m = client.get_m2m()
        raw_dev = client.get_devicesB()
        raw_dev2 = client.get_devicesKiwi()
        raw_info = client.get_deviceInfo()
        raw_models = client.get_deviceModels()
        raw_soft = client.get_deviceSoftware()

        # 2. Creación de DataFrames Auxiliares (Modelos y Software)
        # Se crean una sola vez para usarlos en el enriquecimiento de datos
        try:
            df_models = pd.DataFrame(raw_models) if raw_models else pd.DataFrame()
            df_soft = pd.DataFrame(raw_soft) if raw_soft else pd.DataFrame()
        except Exception as e:
            print(f"Error creando DFs auxiliares: {e}")
            df_models = pd.DataFrame()
            df_soft = pd.DataFrame()

        # 3. Procesamiento de datos principales
        # Pasamos los DFs auxiliares para enriquecer (ej. poner nombre al modelo en lugar de ID)
        df_dev = prepare_boards(raw_dev, df_models=df_models, df_soft=df_soft)
        df_dev2 = prepare_kiwi(raw_dev2, df_models=df_models, df_soft=df_soft)
        
        df_m2m = process_m2m(raw_m2m)
        
        # NOTA: Asegúrate de que process_devicesInfo devuelva las columnas
        # 'quiiotd_version' y 'compilation_date' para que info_view funcione bien.
        df_info = process_devicesInfo(raw_info)

    except Exception as e:
        st.error(f"Ocurrió un error crítico cargando los datos: {e}")
        st.stop()


# --- INTERFAZ GRÁFICA ---

# Sidebar
with st.sidebar:
    st.title("Kiconex Dashboard")
    st.success("🟢 Conectado")
    
    st.divider()
    
    if st.button("Cerrar Sesión", type="primary"):
        st.session_state['token'] = None
        st.rerun()

# Pestañas principales
tab1, tab2, tab3 = st.tabs([
    "📡 Dispositivos", 
    "📶 Comunicaciones M2M", 
    "💽 Información de Software"
])

# TAB 1: DISPOSITIVOS
with tab1:
    sub1, sub2 = st.tabs(["Boards", "Kiwi"])
    with sub1:
        devices_view.render(df_dev)
    with sub2:
        devices_view.render(df_dev2)

# TAB 2: M2M
with tab2:
    m2m_view.render(df_m2m)

# TAB 3: SOFTWARE (Aquí es donde entra el fix anterior)
with tab3:
    # Esta llamada usa el código de info_view.py que corregimos con modo oscuro
    info_view.render(df_info)
    
    # Opcional: Debug para ver si los datos cruzados (df_soft) son útiles aquí
    # st.expander("Ver tabla raw de versiones").dataframe(df_soft)