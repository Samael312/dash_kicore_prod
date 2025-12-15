import streamlit as st
import plotly.express as px
import pandas as pd
from datetime import datetime

def load_custom_css():
    st.markdown("""
        <style>
        .kpi-box {
            padding: 15px;
            background: #f8f9fa;
            border-left: 5px solid #004b8d;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        .kpi-title {
            font-size: 0.9rem;
            color: #555;
        }
        .kpi-value {
            font-size: 1.6rem;
            font-weight: bold;
            color: #004b8d;
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

    # Convertir fechas → datetime naive (sin timezone)
    if "compilation_date" in df.columns:
        df["compilation_date_dt"] = (
            pd.to_datetime(df["compilation_date"], errors="coerce")
            .dt.tz_localize(None)
        )
    else:
        df["compilation_date_dt"] = None

    # Clasificación de actualización
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



    # ============================================================
    # HISTOGRAMA VERSIÓN QUIIOTD
    # ============================================================

    col1, col2 = st.columns([2, 1])

    with col1:
        st.subheader("📦 Histograma de versiones Quiiotd")

        df_hist = df["quiiotd_version"].fillna("Desconocido").value_counts().reset_index()
        df_hist.columns = ["Versión", "Cantidad"]
        df_hist = df_hist.sort_values(by="Versión")

        fig = px.bar(
            df_hist,
            x="Versión",
            y="Cantidad",
            text_auto=True,
            color="Cantidad",
            color_continuous_scale="Blues"
        )
        fig.update_layout(height=350, xaxis=dict(type="category"))
        st.plotly_chart(fig, use_container_width=True)



    # ============================================================
    # DIAGRAMA DE TARTA % ACTUALIZADOS
    # ============================================================

    with col2:
        st.subheader("🔄 Estado de actualización")

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

        fig2.update_traces(textinfo="percent+label")
        fig2.update_layout(height=330)
        st.plotly_chart(fig2, use_container_width=True)
