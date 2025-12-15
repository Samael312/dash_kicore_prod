# main.py
import streamlit as st
from config.settings import Settings
from backend.api_clients import CoreClient
from backend.M2M.data_m2m import process_m2m
from backend.Device.data_device import prepare_boards, prepare_kiwi
import json
import pandas as pd
from backend.Info.data_info import process_devicesInfo

# Importamos las nuevas vistas
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
                client = CoreClient()
                token = client.login()
                if token:
                    st.session_state['token'] = token
                    st.rerun()
                else:
                    st.error("Error de conexión. Revisa usuario/pass en .env")
    st.stop()

# --- CARGA DE DATOS ---
client = CoreClient(st.session_state['token'])

with st.spinner("Descargando datos de la flota..."):
    # Descargamos
    raw_m2m = client.get_m2m()
    raw_dev = client.get_devicesB()
    raw_dev2 = client.get_devicesKiwi()
    raw_info = client.get_deviceInfo()
    raw_models = client.get_deviceModels()
    raw_soft = client.get_deviceSoftware()

    # 1. CREAMOS PRIMERO LOS DATAFRAMES AUXILIARES
    try:
        df_models = pd.DataFrame(raw_models)
        df_soft = pd.DataFrame(raw_soft)
    except Exception as e:
        print(f"Error creando DFs auxiliares: {e}")
        df_models = pd.DataFrame()
        df_soft = pd.DataFrame()


    df_dev = prepare_boards(raw_dev, df_models=df_models, df_soft=df_soft)
    df_dev2 = prepare_kiwi(raw_dev2, df_models=df_models, df_soft=df_soft)
    
    df_m2m = process_m2m(raw_m2m)
    df_info = process_devicesInfo(raw_info)

    try:
        df_models = pd.DataFrame(raw_models)
        df_soft = pd.DataFrame(raw_soft)
        
        # Más diagnóstico para ver si tienen datos
        if not df_models.empty:
            print(f"DataFrame df_models creado con {len(df_models)} filas.")
        if not df_soft.empty:
            print(f"DataFrame df_soft creado con {len(df_soft)} filas.")
            
    except Exception as e:
        print(f"Error al crear DataFrames de modelos/software: {e}")
        df_models = pd.DataFrame()
        df_soft = pd.DataFrame()


# --- INTERFAZ GRÁFICA ---
# Sidebar
with st.sidebar:
    st.title("Kiconex Dashboard")
    st.success("🟢 Conectado")
    if st.button("Cerrar Sesión"):
        st.session_state['token'] = None
        st.rerun()

# Pestañas principales
tab1, tab2, tab3 = st.tabs(["📡 Dispositivos", "📶 Comunicaciones M2M", "💽 Informacion de Software"])

with tab1:
    sub1, sub2 = st.tabs(["Boards", "Kiwi"])
    with sub1:
        devices_view.render(df_dev)
    with sub2:
        devices_view.render(df_dev2)

with tab2:

    m2m_view.render(df_m2m)

with tab3:
 
    info_view.render(df_info)
    
