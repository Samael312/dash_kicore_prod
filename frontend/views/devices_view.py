# Archivo: frontend/views/devices_view.py
import streamlit as st
import plotly.express as px
import pandas as pd

# =====================================================
#  1. ESTILOS CSS
# =====================================================
def load_custom_css():
    st.markdown("""
        <style>
        .stApp { background-color: #ffffff; font-family: 'Segoe UI', sans-serif; }
<<<<<<< HEAD
        
        /* Contenedores de Métricas */
        div[data-testid="stMetric"] {
            background-color: #f8f9fa; 
            border: 1px solid #e9ecef;
            border-left: 5px solid #002b5c; 
            padding: 10px; 
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        /* Títulos */
        h3 { color: #002b5c !important; font-weight: 700; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        h4 { color: #004b8d !important; font-weight: 600; }
=======
        h1, h2, h3 { color: #002b5c !important; font-weight: 700; }
        
        /* Caja de Leyenda Scrollable */
        .custom-legend-box {
            background-color: #f8f9fa; border: 1px solid #e9ecef;
            border-radius: 8px; padding: 15px;
            max-height: 400px; overflow-y: auto;
            box-shadow: inset 0 0 5px rgba(0,0,0,0.05);
        }
        .legend-row {
            display: flex; align-items: center; padding: 8px 0;
            border-bottom: 1px solid #eee; font-size: 13px;
        }
        .legend-row:hover { background-color: #eaeef3; border-radius: 4px; }
        .color-dot {
            width: 12px; height: 12px; border-radius: 50%;
            margin-right: 12px; flex-shrink: 0; border: 1px solid rgba(0,0,0,0.1);
        }
        .label-text {
            flex-grow: 1; color: #333; font-weight: 500;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-right: 10px;
        }
        .value-text { color: #002b5c; font-weight: 700; font-size: 12px; }
        .legend-header {
            font-size: 12px; text-transform: uppercase; color: #666;
            margin-bottom: 10px; font-weight: 600; letter-spacing: 0.5px;
        }
        /* Scrollbar */
        .custom-legend-box::-webkit-scrollbar { width: 6px; }
        .custom-legend-box::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
>>>>>>> master
        </style>
    """, unsafe_allow_html=True)

# =====================================================
<<<<<<< HEAD
#  2. DETECCIÓN DE TIPO DE DISPOSITIVO
# =====================================================
def detect_device_type(df):
    """
    Analiza las columnas para determinar si es Board o Kiwi.
    Basado en los excels proporcionados.
    """
    if df is None or df.empty:
        return "Dispositivos"
    
    cols = df.columns
    # Boards suelen tener 'physical_id' o 'ki_id'
    if "physical_id" in cols or "ki_id" in cols:
        return "🛠️ Boards"
    # Kiwis suelen tener 'ssid' o 'mac'
    elif "ssid" in cols or "mac" in cols:
        return "Kiwi"
    
    return "📟 Dispositivos"

# =====================================================
#  3. FUNCIÓN DE RENDERIZADO (ÚNICA)
# =====================================================
def render(df):
    """
    Renderiza un dashboard completo para el DataFrame proporcionado.
    Detecta automáticamente el tipo de dispositivo.
    """
    load_custom_css()
    
    # 1. Validación básica
    if df is None or df.empty:
        st.warning("⚠️ No hay datos disponibles para mostrar en esta sección.")
        st.divider()
        return

    # 2. Detectar título
    title_prefix = detect_device_type(df)
    
    # Usamos un expander o un contenedor para separar visualmente si se llama 2 veces
    st.markdown(f"### {title_prefix}")

    # Validar columnas requeridas del procesado
    required_cols = ["organization", "model", "status_clean", "enabled_clean"]
    if not all(col in df.columns for col in required_cols):
        st.error(f"Error: El DataFrame de {title_prefix} no tiene las columnas procesadas requeridas.")
        st.dataframe(df.head())
        return

    # --- FILTROS ---
    with st.container():
        c1, c2 = st.columns(2)
        with c1:
            # Dropdown Organización
            orgs = ["Todas"] + sorted(df["organization"].fillna("Sin Asignar").astype(str).unique())
            # Usamos keys dinámicas basadas en el título para que no choque Streamlit al renderizar 2 veces
            sel_org = st.selectbox(f"🏢 Organización - {title_prefix}", orgs, key=f"org_{title_prefix}")
        
        # Filtrado temporal para el dropdown de modelos
        df_temp = df[df["organization"] == sel_org] if sel_org != "Todas" else df
        
        with c2:
            # Dropdown Modelo
            models = ["Todos"] + sorted(df_temp["model"].fillna("Genérico").astype(str).unique())
            sel_model = st.selectbox(f"📦 Modelo - {title_prefix}", models, key=f"mod_{title_prefix}")

    # --- APLICACIÓN DE FILTROS ---
    df_filt = df.copy()
    if sel_org != "Todas":
        df_filt = df_filt[df_filt["organization"] == sel_org]
    if sel_model != "Todos":
        df_filt = df_filt[df_filt["model"] == sel_model]

    st.markdown("<br>", unsafe_allow_html=True)

    # --- KPIs ---
    k1, k2, k3 = st.columns(3)
    k1.metric("Total Dispositivos", len(df_filt))
    k2.metric("Conectados", len(df_filt[df_filt["status_clean"] == "Conectado"]))
    k3.metric("Habilitados", len(df_filt[df_filt["enabled_clean"] == "Habilitado"]))

    st.markdown("<br>", unsafe_allow_html=True)

    # --- GRÁFICOS ---
    
    # 1. Histograma Modelos
    st.markdown(f"#### 📊 Distribución por Modelo ({title_prefix})")
    df_chart = df_filt["model"].value_counts().reset_index()
    df_chart.columns = ["Modelo", "Cantidad"]

    if not df_chart.empty:
        fig_hist = px.bar(
            df_chart, x="Modelo", y="Cantidad", text_auto=True, 
            color="Cantidad", color_continuous_scale=px.colors.sequential.Blues
        )
        fig_hist.update_layout(plot_bgcolor='rgba(0,0,0,0)', height=300, showlegend=False, xaxis_title=None)
        st.plotly_chart(fig_hist, use_container_width=True)

    # 2. Tartas de Estado
    col_pie1, col_pie2 = st.columns(2)
    
    color_map_conn = {"Conectado": "#002b5c", "Desconectado": "#cbd5e1"}
    color_map_enb = {"Habilitado": "#0074d9", "Deshabilitado": "#e1e1e1"}

    with col_pie1:
        st.caption("Estado de Conectividad")
        if not df_filt.empty:
            fig1 = px.pie(df_filt, names="status_clean", hole=0.5, color="status_clean", color_discrete_map=color_map_conn)
            fig1.update_traces(textinfo='percent+label')
            fig1.update_layout(height=250, margin=dict(t=10, b=10, l=10, r=10), showlegend=False)
            st.plotly_chart(fig1, use_container_width=True)

    with col_pie2:
        st.caption("Estado de Habilitación")
        if not df_filt.empty:
            fig2 = px.pie(df_filt, names="enabled_clean", hole=0.5, color="enabled_clean", color_discrete_map=color_map_enb)
            fig2.update_traces(textinfo='percent+label')
            fig2.update_layout(height=250, margin=dict(t=10, b=10, l=10, r=10), showlegend=False)
            st.plotly_chart(fig2, use_container_width=True)

    # Tabla Dataframe
    with st.expander(f"📂 Ver listado completo de {title_prefix}"):
        st.dataframe(df_filt, use_container_width=True)
    
    # Separador final para cuando se apilan dos renders
    st.divider()
=======
#  2. FUNCIONES AUXILIARES
# =====================================================
def get_consistent_colors(items):
    """Genera colores consistentes."""
    full_palette = px.colors.qualitative.Dark24 + px.colors.qualitative.Alphabet
    color_map = {}
    for i, item in enumerate(items):
        color_map[item] = full_palette[i % len(full_palette)]
    return color_map

def create_html_legend(df, col_name, color_map, title=None):
    """Genera HTML limpio para la leyenda."""
    if df.empty or col_name not in df.columns:
        return f'<div class="custom-legend-box">Sin datos</div>'

    counts = df[col_name].value_counts()
    total = counts.sum()
    
    html = '<div class="custom-legend-box">'
    if title: html += f'<div class="legend-header">{title}</div>'
        
    for category, count in counts.items():
        percent = (count / total) * 100
        color = color_map.get(category, "#ccc")
        row_html = (
            f'<div class="legend-row">'
            f'<div class="color-dot" style="background-color: {color};"></div>'
            f'<span class="label-text" title="{category}">{category}</span>'
            f'<span class="value-text">{count} ({percent:.1f}%)</span>'
            f'</div>'
        )
        html += row_html
    html += '</div>'
    return html

# =====================================================
#  3. RENDER PRINCIPAL
# =====================================================
def render(df_devices, key_prefix=None):
    load_custom_css()

    if df_devices.empty:
        st.warning("No hay datos de dispositivos para mostrar.")
        return

    # --- PREPARACIÓN ---
    is_kiwi = 'ssid' in df_devices.columns
    
    # Generamos un prefijo único automáticamente si no se provee uno
    if key_prefix is None:
        key_prefix = "kiwi" if is_kiwi else "std"
    
    # Rellenar nulos
    for col in ['organization', 'model', 'status_clean', 'enabled_clean']:
        if col not in df_devices.columns: df_devices[col] = "Desconocido"

    st.markdown("## 🏭 Inventario de Dispositivos")

    # =====================================================
    #  A. LÓGICA DE FILTRADO (ESTABLE)
    # =====================================================
    df_active = df_devices.copy()
    
    # Variables de estado para saber si estamos filtrando por modelo específico
    is_model_filtered = False
    current_model_name = ""

    with st.container():
        col_f1, col_f2 = st.columns(2)
        
        # --- MODO KIWI ---
        if is_kiwi:
            with col_f1:
                modelos = ["Todos"] + sorted(df_active["model"].astype(str).unique().tolist())
                sel_model = st.selectbox("📦 Modelo (Kiwi)", modelos, key=f"{key_prefix}_filter_model")
            
            if sel_model != "Todos":
                df_active = df_active[df_active["model"] == sel_model]
                is_model_filtered = True
                current_model_name = sel_model

        # --- MODO ESTÁNDAR ---
        else:
            with col_f1:
                orgs = ["Todas"] + sorted(df_active["organization"].astype(str).unique().tolist())
                sel_org = st.selectbox("🏢 Organización", orgs, key=f"{key_prefix}_filter_org")
            
            if sel_org != "Todas":
                df_active = df_active[df_active["organization"] == sel_org]

            with col_f2:
                modelos_disp = ["Todos"] + sorted(df_active["model"].astype(str).unique().tolist())
                sel_model_sub = st.selectbox("📦 Modelo", modelos_disp, key=f"{key_prefix}_filter_model_sub")
            
            if sel_model_sub != "Todos":
                df_active = df_active[df_active["model"] == sel_model_sub]
                is_model_filtered = True
                current_model_name = sel_model_sub

    # --- VALIDACIÓN FINAL ---
    if df_active.empty:
        st.info("No hay registros que coincidan con los filtros seleccionados.")
        return

    st.divider()

    # =====================================================
    #  B. ZONA SUPERIOR: HISTOGRAMA Y LISTA (MODELOS U ORGANIZACIONES)
    # =====================================================
    col_left, col_right = st.columns([2, 1])
    selected_drilldown = None
    
    # Colores consistentes para MODELOS
    df_counts = df_active.groupby("model").size().reset_index(name="count")
    df_counts = df_counts.sort_values(by="count", ascending=False)
    color_map_models = get_consistent_colors(df_counts['model'].unique())

    # --- IZQUIERDA: GRÁFICO DE BARRAS (MODELOS) ---
    with col_left:
        st.markdown("### Distribución por Modelo")
        
        fig_hist = px.bar(
            df_counts, x="model", y="count", color="model", text="count",
            labels={"model": "", "count": "Dispositivos"},
            template="plotly_white",
            color_discrete_map=color_map_models
        )
        fig_hist.update_layout(showlegend=False, margin=dict(t=10, b=10), height=400)
        fig_hist.update_traces(textposition='outside')
        
        event = st.plotly_chart(
            fig_hist, 
            use_container_width=True, 
            on_select="rerun", 
            selection_mode="points", 
            key=f"{key_prefix}_chart_main_interact" 
        )
        if event and len(event["selection"]["points"]) > 0:
            selected_drilldown = event["selection"]["points"][0]["x"]

    # --- DEFINIR CONTEXTO (¿QUÉ DATOS VEMOS ABAJO?) ---
    # Si clicamos barra -> Filtramos por esa barra
    if selected_drilldown:
        df_context = df_active[df_active["model"] == selected_drilldown]
        context_title = f"🔎 {selected_drilldown}"
        is_viewing_specific_model = True
        model_name_display = selected_drilldown
    
    # Si no clicamos barra, pero el dropdown ya filtró un modelo específico
    elif is_model_filtered:
        df_context = df_active
        context_title = f"📦 {current_model_name}"
        is_viewing_specific_model = True
        model_name_display = current_model_name
    
    # Vista general
    else:
        df_context = df_active
        context_title = "🩺 Estado General"
        is_viewing_specific_model = False
        model_name_display = ""

    # --- DERECHA: LISTA DINÁMICA ---
    with col_right:
        # CASO 1: ESTAMOS VIENDO UN MODELO ESPECÍFICO (Click o Dropdown)
        # -> Mostramos las ORGANIZACIONES que tienen ese modelo
        if is_viewing_specific_model:
            st.markdown(f"### 🏢 En Organizaciones")
            
            # Generamos colores para las organizaciones
            unique_orgs = df_context['organization'].unique()
            color_map_orgs = get_consistent_colors(unique_orgs)
            
            html_orgs = create_html_legend(
                df_context, 
                'organization', 
                color_map_orgs, 
                f"Usuarios de {model_name_display}"
            )
            st.markdown(html_orgs, unsafe_allow_html=True)
            
            if selected_drilldown:
                 st.caption("ℹ️ *Haz doble clic en el gráfico para volver.*")

        # CASO 2: VISTA GENERAL
        # -> Mostramos la lista de MODELOS
        else:
            st.markdown("### Lista de Modelos")
            html_m = create_html_legend(
                df_active, 
                'model', 
                color_map_models, 
                "Modelos Visibles"
            )
            st.markdown(html_m, unsafe_allow_html=True)

    st.markdown("---")

    # =====================================================
    #  C. ZONA MEDIA: TARTAS DE ESTADO
    # =====================================================
    st.markdown(f"### {context_title}")
    
    col_pie1, col_pie2 = st.columns(2)
    
    colors_status = {'Conectado': '#00CC96', 'Desconectado': '#EF553B', 'Desconocido': '#999'}
    colors_enabled = {'Habilitado': '#636EFA', 'Deshabilitado': '#AB63FA', 'Desconocido': '#999'}

    with col_pie1:
        st.markdown("#### Conectividad")
        df_c = df_context['status_clean'].value_counts().reset_index(name='count')
        df_c.columns = ['status', 'count']
        
        fig1 = px.pie(df_c, values='count', names='status', color='status', 
                      color_discrete_map=colors_status, hole=0.5)
        fig1.update_layout(height=250, margin=dict(t=20,b=20,l=20,r=20))
        st.plotly_chart(fig1, use_container_width=True, key=f"{key_prefix}_pie_conn")

    with col_pie2:
        st.markdown("#### Operatividad")
        df_e = df_context['enabled_clean'].value_counts().reset_index(name='count')
        df_e.columns = ['status', 'count']
        
        fig2 = px.pie(df_e, values='count', names='status', color='status',
                      color_discrete_map=colors_enabled, hole=0.5)
        fig2.update_layout(height=250, margin=dict(t=20,b=20,l=20,r=20))
        st.plotly_chart(fig2, use_container_width=True, key=f"{key_prefix}_pie_oper")

    st.markdown("---")

    # =====================================================
    #  D. TABLA FINAL
    # =====================================================
    label_tabla = f"📂 Ver Listado Detallado ({len(df_context)} registros)"
    if is_viewing_specific_model:
        label_tabla += f" (Filtrado por: {model_name_display})"

    with st.expander(label_tabla, expanded=False):
        cols_base = ['uuid', 'name', 'model', 'organization', 'status_clean', 'enabled_clean', 'ssid', 'version_uuid']
        cols_show = [c for c in cols_base if c in df_context.columns]
        
        st.dataframe(
            df_context[cols_show],
            use_container_width=True,
            hide_index=True
        )
>>>>>>> master
