import streamlit as st
import plotly.express as px
import pandas as pd
from datetime import datetime

# ============================================================
# ESTILOS CSS CON MODIFICACIONES PARA MODO OSCURO
# ============================================================
def load_custom_css():
    st.markdown("""
        <style>
        /* --- ESTILOS BASE (Por defecto / Modo Claro) --- */
        .kpi-box {
            padding: 15px;
            background-color: #f8f9fa; /* Gris muy claro para modo luz */
            border-left: 5px solid #004b8d;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
            margin-bottom: 10px;
        }
        .kpi-title {
            font-size: 0.9rem;
            color: #555;
            opacity: 0.9;
        }
        .kpi-value {
            font-size: 1.6rem;
            font-weight: bold;
            color: #004b8d;
        }
        .title-value {
                font-size: 1.6rem;
                font-weight: bold;
                color:  #555
                }

        /* --- OVERRIDE PARA MODO OSCURO --- */
        @media (prefers-color-scheme: dark) {
            .kpi-box {
                background-color: #262730 !important; /* Gris Oscuro (Fondo típico de Streamlit Dark) */
                border: 1px solid #444; /* Borde sutil para separar del fondo negro total */
                border-left: 5px solid #4fa8ff !important; /* Azul más brillante para contraste */
            }
            .kpi-title {
                color: #e0e0e0 !important; /* Texto claro */
            }
            .kpi-value {
                color: #4fa8ff !important; /* Azul claro */
            }
        }
        </style>
    """, unsafe_allow_html=True)

def render(df):
    load_custom_css()

    if df is None or df.empty:
        st.warning("⚠️ No hay datos disponibles para mostrar.")
        return

    st.markdown("### ⚙️ Software & Versiones (Quiiotd)")

    # ============================================================
    # PREPARACIÓN DE DATOS
    # ============================================================
    if "compilation_date" in df.columns:
        df["compilation_date_dt"] = (
            pd.to_datetime(df["compilation_date"], errors="coerce")
            .dt.tz_localize(None)
        )
    else:
        df["compilation_date_dt"] = None

    cutoff = datetime(2025, 6, 1)

    def classify(d):
        if pd.isna(d):
            return "Sin Datos"
        return "Actualizado" if d >= cutoff else "Desactualizado"

    df["update_status"] = df["compilation_date_dt"].apply(classify)

    # ============================================================
    # KPIs SUPERIORES
    # ============================================================
    total_devices = len(df)
    updated_pct = (df["update_status"].eq("Actualizado").mean() * 100)
    most_common_version = df["quiiotd_version"].mode()[0] if "quiiotd_version" in df.columns else "N/A"

    colA, colB, colC = st.columns(3)

    with colA:
        st.markdown(f"""
            <div class="kpi-box">
                <div class="kpi-title">Total de Dispositivos</div>
                <div class="kpi-value">{total_devices}</div>
            </div>
        """, unsafe_allow_html=True)

    with colB:
        st.markdown(f"""
            <div class="kpi-box">
                <div class="kpi-title">% Actualizados</div>
                <div class="kpi-value">{updated_pct:.1f}%</div>
            </div>
        """, unsafe_allow_html=True)

    with colC:
        st.markdown(f"""
            <div class="kpi-box">
                <div class="kpi-title">Versión más común</div>
                <div class="kpi-value">{most_common_version}</div>
            </div>
        """, unsafe_allow_html=True)

    st.divider()

    # ============================================================
    # GRÁFICAS
    # ============================================================
    
    col1, col2 = st.columns([2, 1])

    # --- GRAFICA DE BARRAS ---
    with col1:
        st.subheader("Distribución por Modelo")

        if "quiiotd_version" in df.columns:
            df_hist = df["quiiotd_version"].fillna("Desconocido").value_counts().reset_index()
            df_hist.columns = ["Versión", "Cantidad"]
            df_hist = df_hist.sort_values(by="Cantidad", ascending=False)
        else:
            df_hist = pd.DataFrame(columns=["Versión", "Cantidad"])

        custom_colors = [
            "#007bff", "#e83e8c", "#28a745", "#dc3545", 
            "#6f42c1", "#343a40", "#fd7e14", "#20c997"
        ]



        fig = px.bar(
            df_hist,
            x="Versión",
            y="Cantidad",
            text_auto=True,
            color="Versión",
            color_discrete_sequence=custom_colors
        )
        
        # FORZAMOS LETRAS NEGRAS EN LAS BARRAS
        fig.update_traces(
            textfont_color="black",  # <--- ESTO PONE EL TEXTO DE DATOS EN NEGRO
            textfont_size=12
        )

        fig.update_layout(
            height=400,
            xaxis_title=None,
            yaxis_title="Dispositivos",
            showlegend=False,
            plot_bgcolor="rgba(0,0,0,0)",
            paper_bgcolor="rgba(0,0,0,0)",
            margin=dict(l=20, r=20, t=30, b=20),
            # Ajustamos ejes para que sean legibles en ambos modos
            xaxis=dict(tickfont=dict(color=None)), # Color automático (blanco en dark, negro en light)
            yaxis=dict(tickfont=dict(color=None)) 
        )
        st.plotly_chart(fig, use_container_width=True)

    # --- DIAGRAMA DE TARTA ---
    with col2:
        st.subheader("Estado de Actualización")

        df_pie = df["update_status"].value_counts().reset_index()
        df_pie.columns = ["Estado", "Cantidad"]

        fig2 = px.pie(
            df_pie,
            names="Estado",
            values="Cantidad",
            hole=0.5,
            color="Estado",
            color_discrete_map={
                "Actualizado": "#28a745",
                "Desactualizado": "#dc3545",
                "Sin Datos": "#adb5bd"
            }
        )

        # FORZAMOS LETRAS NEGRAS EN EL PIE CHART
        fig2.update_traces(
            textinfo="percent+label",
            textfont_color="black"  # <--- ESTO PONE EL TEXTO DENTRO DE LA DONA EN NEGRO
        )

        fig2.update_layout(
            height=350,
            showlegend=True,
            legend=dict(orientation="h", yanchor="bottom", y=-0.2, xanchor="center", x=0.5),
            plot_bgcolor="rgba(0,0,0,0)",
            paper_bgcolor="rgba(0,0,0,0)",
            margin=dict(l=20, r=20, t=0, b=50)
        )
        st.plotly_chart(fig2, use_container_width=True)