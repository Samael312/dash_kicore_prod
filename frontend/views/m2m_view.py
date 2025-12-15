import streamlit as st
import plotly.express as px
import pandas as pd

# =====================================================
#  1. ESTILOS CSS (MODERNO Y LIMPIO)
# =====================================================
def load_custom_css():
    st.markdown("""
        <style>
        /* Tipografía y Fondo */
        .stApp {
            background-color: #ffffff;
            font-family: 'Segoe UI', sans-serif;
        }
        
        /* Títulos */
        h1, h2, h3 {
            color: #002b5c !important; /* Azul Oscuro Corporativo */
            font-weight: 700;
        }
        
        /* Contenedor de la Leyenda Personalizada */
        .custom-legend-box {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 15px;
            max-height: 400px; /* Altura fija */
            overflow-y: auto;  /* Scroll vertical */
            box-shadow: inset 0 0 5px rgba(0,0,0,0.05);
        }

        /* Items de la Leyenda */
        .legend-row {
            display: flex;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
            font-size: 13px;
            transition: background 0.2s;
        }
        .legend-row:hover {
            background-color: #eaeef3; /* Efecto hover sutil */
            border-radius: 4px;
        }

        /* Indicador de Color (Puntito) */
        .color-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%; /* Círculo perfecto */
            margin-right: 12px;
            flex-shrink: 0;
            border: 1px solid rgba(0,0,0,0.1);
        }

        /* Texto de la etiqueta */
        .label-text {
            flex-grow: 1;
            color: #333;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis; /* Puntos suspensivos si es muy largo */
            margin-right: 10px;
        }

        /* Valor numérico */
        .value-text {
            color: #002b5c;
            font-weight: 700;
            font-size: 12px;
        }

        /* Scrollbar Personalizada */
        .custom-legend-box::-webkit-scrollbar {
            width: 6px;
        }
        .custom-legend-box::-webkit-scrollbar-track {
            background: transparent; 
        }
        .custom-legend-box::-webkit-scrollbar-thumb {
            background: #cbd5e1; 
            border-radius: 10px;
        }
        .custom-legend-box::-webkit-scrollbar-thumb:hover {
            background: #94a3b8; 
        }
        </style>
    """, unsafe_allow_html=True)

# =====================================================
#  2. FUNCIONES AUXILIARES (COLORES, LEYENDAS, HOVER)
# =====================================================
def get_consistent_colors(items):
    """Asigna colores únicos a cada item usando paletas extendidas."""
    full_palette = px.colors.qualitative.Dark24 + px.colors.qualitative.Alphabet + px.colors.qualitative.Light24
    color_map = {}
    for i, item in enumerate(items):
        color_map[item] = full_palette[i % len(full_palette)]
    return color_map

def create_html_legend(df, col_name, color_map):
    """Genera el HTML limpio para la leyenda."""
    counts = df[col_name].value_counts()
    total = counts.sum()
    
    html = '<div class="custom-legend-box">'
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

def preparar_datos_con_hover(df, col_categoria, col_id='icc'):
    """
    Agrupa por categoría y crea una lista HTML de las SIMs para el tooltip.
    """
    # Si la columna ID no existe, usamos el índice
    if col_id not in df.columns:
        df['temp_index'] = df.index.astype(str)
        col_id = 'temp_index'

    # Orden lógico de categorías (si aplica)
    tier_order = ["Inactivo (0 MB)", "Bajo (< 1 MB)", "Medio (1 - 10 MB)", "Alto (10 - 100 MB)", "Extremo (> 100 MB)"]
    
    # Función para limitar la lista de SIMs en el tooltip
    def listar_sims(series):
        lista = series.astype(str).tolist()
        total = len(lista)
        # Mostramos máximo 10 para no romper el navegador
        mostrados = lista[:10]
        texto = "<br>".join(mostrados)
        if total > 10:
            texto += f"<br>... y {total - 10} más"
        return texto

    # Agrupación
    try:
        # Agrupamos los IDs
        df_grouped = df.groupby(col_categoria)[col_id].apply(listar_sims).reset_index()
        df_grouped.columns = ['Categoría', 'sims_list']
        
        # Contamos cantidades
        df_counts = df[col_categoria].value_counts().reset_index()
        df_counts.columns = ['Categoría', 'Cantidad SIMs']
        
        # Unimos
        df_final = pd.merge(df_counts, df_grouped, on='Categoría')
        
        # Intentamos ordenar si las categorías coinciden con los tiers predefinidos
        if all(x in tier_order for x in df_final['Categoría'].unique() if x in tier_order):
             df_final = df_final.set_index('Categoría').reindex([t for t in tier_order if t in df_final['Categoría'].values]).reset_index()
        
        return df_final
    except Exception as e:
        st.error(f"Error procesando hover: {e}")
        return pd.DataFrame()

# =====================================================
#  3. RENDERIZADO PRINCIPAL
# =====================================================
def render(df_m2m):
    load_custom_css()
    
    st.markdown("## 📡 Gestión de Comunicaciones (M2M)")

    if df_m2m.empty:
        st.info("No hay datos disponibles.")
        return

    # --- FILTROS ---
    with st.container():
        orgs = ["Todas"]
        if "organization" in df_m2m.columns:
            orgs += sorted(df_m2m["organization"].unique())
        sel_org = st.selectbox("🏢 Organización", orgs)

    df_filt = df_m2m.copy()
    if sel_org != "Todas":
        df_filt = df_filt[df_filt["organization"] == sel_org]

    st.markdown("---")

    # =====================================================
    #  AUTO-DETECCIÓN DE COLUMNA ID (SOLUCIÓN AL ERROR)
    # =====================================================
    # Buscamos qué columna de identificación existe realmente en el DF
    posibles_ids = ['icc', 'iccid', 'msisdn', 'alias', 'id', 'name', 'imei']
    col_id_sim = 'index_id' # Valor por defecto
    
    for col in posibles_ids:
        if col in df_filt.columns:
            col_id_sim = col
            break
    
    # Si no encontramos ninguna, creamos una temporal con el índice
    if col_id_sim == 'index_id':
        df_filt['index_id'] = df_filt.index.astype(str)

    # --- KPIs ---
    k1, k2, k3 = st.columns(3)
    k1.metric("Total SIMs", len(df_filt))
    
    alarms = df_filt["alarm_count"].sum() if "alarm_count" in df_filt.columns else 0
    sims_alert = (df_filt["alarm_count"] > 0).sum() if "alarm_count" in df_filt.columns else 0
    
    k2.metric("Alarmas Totales", int(alarms))
    k3.metric("SIMs con Alertas", int(sims_alert))

    st.markdown("---")

    # =====================================================
    #  ESTADO Y RED
    # =====================================================
    c1, c2 = st.columns(2)
    with c1:
        st.markdown("### 🟢 Estado")
        if "status_clean" in df_filt.columns:
            fig = px.pie(df_filt, names="status_clean", hole=0.6, color_discrete_sequence=px.colors.qualitative.Bold)
            fig.update_layout(margin=dict(t=20, b=20, l=20, r=20), height=300)
            st.plotly_chart(fig, use_container_width=True)

    with c2:
        st.markdown("### 📡 Red")
        if "network_type" in df_filt.columns:
            fig = px.pie(df_filt, names="network_type", hole=0.6, color_discrete_sequence=px.colors.qualitative.Safe)
            fig.update_layout(margin=dict(t=20, b=20, l=20, r=20), height=300)
            st.plotly_chart(fig, use_container_width=True)

    st.markdown("---")

    # =====================================================
    #  PAÍS Y PLANES (Leyendas Externas)
    # =====================================================
    st.markdown("### 🌍 Distribución Geográfica")
    if "country_code" in df_filt.columns:
        paises_unicos = df_filt["country_code"].unique()
        mapa_colores_pais = get_consistent_colors(paises_unicos)
        
        col_graf, col_ley = st.columns([2, 1])
        with col_graf:
            fig = px.pie(
                df_filt, names="country_code", hole=0.5,
                color="country_code", color_discrete_map=mapa_colores_pais
            )
            fig.update_traces(textinfo='percent') 
            fig.update_layout(showlegend=False, margin=dict(t=0, b=0, l=0, r=0), height=350)
            st.plotly_chart(fig, use_container_width=True)
            
        with col_ley:
            st.caption("Detalle por País")
            html_pais = create_html_legend(df_filt, "country_code", mapa_colores_pais)
            st.markdown(html_pais, unsafe_allow_html=True)

    st.markdown("---")

    st.markdown("### 💳 Planes de Servicio")
    if "rate_plan" in df_filt.columns:
        planes_unicos = df_filt["rate_plan"].unique()
        mapa_colores_plan = get_consistent_colors(planes_unicos)
        
        col_graf_p, col_ley_p = st.columns([2, 1])
        with col_graf_p:
            fig = px.pie(
                df_filt, names="rate_plan", hole=0.5,
                color="rate_plan", color_discrete_map=mapa_colores_plan
            )
            fig.update_traces(textposition='inside', textinfo='percent')
            fig.update_layout(showlegend=False, margin=dict(t=0, b=0, l=0, r=0), height=400)
            st.plotly_chart(fig, use_container_width=True)
            
        with col_ley_p:
            st.caption("Lista Completa de Planes (Scroll) 👇")
            html_planes = create_html_legend(df_filt, "rate_plan", mapa_colores_plan)
            st.markdown(html_planes, unsafe_allow_html=True)
    
    # =====================================================
    #   ANÁLISIS DE CONSUMO (DIARIO Y MENSUAL EN TABS)
    # =====================================================
    st.markdown("---")
    st.markdown("### 📊 Análisis de Consumo de Datos")
    
    tab_diario, tab_mensual = st.tabs(["📅 Consumo Diario", "🗓️ Consumo Mensual"])

    # --- TAB 1: DIARIO ---
    with tab_diario:
        if "cons_daily_mb" in df_filt.columns and "usage_tier_daily" in df_filt.columns:
            # KPIs
            c_total = df_filt["cons_daily_mb"].sum()
            c_avg = df_filt["cons_daily_mb"].mean()
            c_max = df_filt["cons_daily_mb"].max()
            
            kd1, kd2, kd3 = st.columns(3)
            kd1.metric("Promedio Diario", f"{c_avg:.2f} MB")
            kd2.metric("Máximo Diario", f"{c_max:.2f} MB")
            kd3.metric("Tráfico Total", f"{c_total/1024:.2f} GB")
            st.markdown("<br>", unsafe_allow_html=True)

            subtab_bar, subtab_box = st.tabs(["📊 Distribución", "📦 Anomalías"])
            
            with subtab_bar:
                # Usamos la columna ID detectada dinámicamente
                df_viz = preparar_datos_con_hover(df_filt, "usage_tier_daily", col_id_sim)
                
                fig_bar = px.bar(
                    df_viz, x='Categoría', y='Cantidad SIMs', text_auto=True,
                    color='Cantidad SIMs', color_continuous_scale=px.colors.sequential.Blues,
                    custom_data=['sims_list']
                )
                fig_bar.update_traces(hovertemplate="<b>%{x}</b><br>SIMs: %{y}<br><br>%{customdata[0]}<extra></extra>")
                fig_bar.update_layout(plot_bgcolor='rgba(0,0,0,0)', height=350, showlegend=False)
                st.plotly_chart(fig_bar, use_container_width=True)

            with subtab_box:
                st.info("ℹ️ **¿Qué muestra esto?** Los puntos aislados a la derecha son las SIMs 'Outliers' (Anómalas) que consumen mucho más que el rango normal.")
                df_active = df_filt[df_filt["cons_daily_mb"] > 0].copy()
                
                if not df_active.empty:
                    fig_hist = px.histogram(
                        df_active, x="cons_daily_mb", nbins=30, marginal="box",
                        hover_data=[col_id_sim], # Usamos la columna ID detectada
                        title="Distribución Activa (Excluye 0 MB)"
                    )
                    fig_hist.update_traces(marker_color='#002b5c')
                    fig_hist.update_layout(plot_bgcolor='rgba(0,0,0,0)', height=400, xaxis_title="Consumo (MB)")
                    st.plotly_chart(fig_hist, use_container_width=True)
                else:
                    st.warning("No hay consumo diario activo.")
        else:
            st.warning("Faltan datos de consumo diario.")

    # --- TAB 2: MENSUAL ---
    with tab_mensual:
        if "cons_month_mb" in df_filt.columns and "usage_tier_month" in df_filt.columns:
            cm_total = df_filt["cons_month_mb"].sum()
            cm_avg = df_filt["cons_month_mb"].mean()
            cm_max = df_filt["cons_month_mb"].max()
            
            km1, km2, km3 = st.columns(3)
            km1.metric("Promedio Mes", f"{cm_avg:.2f} MB")
            km2.metric("Máximo Mes", f"{cm_max/1024:.2f} GB")
            km3.metric("Tráfico Total", f"{cm_total/1024:.2f} GB")
            st.markdown("<br>", unsafe_allow_html=True)
            
            subtab_bar_m, subtab_box_m = st.tabs(["📊 Distribución", "📦 Anomalías"])
            
            with subtab_bar_m:
                df_viz_m = preparar_datos_con_hover(df_filt, "usage_tier_month", col_id_sim)
                fig_bar_m = px.bar(
                    df_viz_m, x='Categoría', y='Cantidad SIMs', text_auto=True,
                    color='Cantidad SIMs', color_continuous_scale=px.colors.sequential.Blues,
                    custom_data=['sims_list']
                )
                fig_bar_m.update_traces(hovertemplate="<b>%{x}</b><br>SIMs: %{y}<br><br>%{customdata[0]}<extra></extra>")
                fig_bar_m.update_layout(plot_bgcolor='rgba(0,0,0,0)', height=350, showlegend=False)
                st.plotly_chart(fig_bar_m, use_container_width=True)

            with subtab_box_m:
                st.info("ℹ️ **Análisis de Anomalías:** Identifica SIMs con comportamiento inusual en el acumulado mensual.")
                df_active_m = df_filt[df_filt["cons_month_mb"] > 0].copy()
                if not df_active_m.empty:
                    fig_hist_m = px.histogram(
                        df_active_m, x="cons_month_mb", nbins=30, marginal="box",
                        hover_data=[col_id_sim], # Usamos la columna ID detectada
                        title="Distribución Mensual Activa"
                    )
                    fig_hist_m.update_traces(marker_color='#002b5c')
                    fig_hist_m.update_layout(plot_bgcolor='rgba(0,0,0,0)', height=400, xaxis_title="Consumo (MB)")
                    st.plotly_chart(fig_hist_m, use_container_width=True)
                else:
                    st.warning("No hay consumo mensual activo.")
        else:
             st.warning("Faltan datos de consumo mensual.")

    # --- TABLA FINAL ---
    with st.expander("📂 Ver datos crudos"):
        st.dataframe(df_filt, use_container_width=True)