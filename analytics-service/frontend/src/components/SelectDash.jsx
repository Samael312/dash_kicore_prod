// components/SelectDash.jsx
import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Eye, EyeOff, MinusSquare, Square } from "lucide-react";

const SelectDash = ({
  storageKey = "dashboard:sections",
  sections = [],
  defaultMode = "show",
  layout = "stack",
  gridClassName = "grid grid-cols-1 gap-6",
  headerTitle = "Panel",
}) => {
  const normalized = useMemo(() => {
    return (sections || []).map((s) => ({
      id: String(s.id),
      title: s.title ?? s.id,
      defaultMode: s.defaultMode ?? defaultMode,
      render: s.render,
    }));
  }, [sections, defaultMode]);

  const initialState = useMemo(() => {
    // 1) localStorage
    if (storageKey) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") return parsed;
        }
      } catch {}
    }

    // 2) defaults
    const d = {};
    normalized.forEach((s) => (d[s.id] = s.defaultMode));
    return d;
  }, [normalized, storageKey]);

  const [modes, setModes] = useState(initialState);
  const [selectorOpen, setSelectorOpen] = useState(false);

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(modes));
    } catch {}
  }, [modes, storageKey]);

  const setMode = (id, mode) => {
    setModes((prev) => ({ ...prev, [id]: mode }));
  };

  const visibleSections = useMemo(() => {
    return normalized
      .map((s) => ({ ...s, mode: modes[s.id] ?? s.defaultMode }))
      .filter((s) => s.mode !== "hide");
  }, [normalized, modes]);

  const Header = () => (
    <div className="bg-white rounded shadow border border-gray-200">
      <div className="p-4 flex items-center justify-between">
        <div className="font-bold text-gray-800">{headerTitle}</div>
        <button
          type="button"
          onClick={() => setSelectorOpen((v) => !v)}
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-gray-700"
        >
          {selectorOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          Secciones
        </button>
      </div>

      {selectorOpen && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {normalized.map((s) => {
              const mode = modes[s.id] ?? s.defaultMode;
              const isHidden = mode === "hide";
              const isMin = mode === "min";
              const isShow = mode === "show";

              return (
                <div
                  key={s.id}
                  className="border border-gray-200 rounded p-3 bg-white flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-800 truncate" title={s.title}>
                      {s.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {isShow ? "Visible" : isMin ? "Minimizado" : "Oculto"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMode(s.id, "show")}
                      className={`p-2 rounded border ${
                        isShow ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                      title="Mostrar"
                    >
                      <Eye size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode(s.id, "min")}
                      className={`p-2 rounded border ${
                        isMin ? "bg-yellow-50 border-yellow-200 text-yellow-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                      title="Minimizar"
                    >
                      <MinusSquare size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode(s.id, "hide")}
                      className={`p-2 rounded border ${
                        isHidden ? "bg-red-50 border-red-200 text-red-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                      title="Ocultar"
                    >
                      <EyeOff size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                const next = {};
                normalized.forEach((s) => (next[s.id] = "show"));
                setModes(next);
              }}
              className="px-3 py-2 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-gray-700"
            >
              Mostrar todo
            </button>

            <button
              type="button"
              onClick={() => {
                const next = {};
                normalized.forEach((s) => (next[s.id] = "min"));
                setModes(next);
              }}
              className="px-3 py-2 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-gray-700"
            >
              Minimizar todo
            </button>

            <button
              type="button"
              onClick={() => {
                const next = {};
                normalized.forEach((s) => (next[s.id] = "hide"));
                setModes(next);
              }}
              className="px-3 py-2 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-gray-700"
            >
              Ocultar todo
            </button>

            <button
              type="button"
              onClick={() => {
                const next = {};
                normalized.forEach((s) => (next[s.id] = s.defaultMode));
                setModes(next);
              }}
              className="px-3 py-2 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-gray-700 flex items-center gap-2"
            >
              <Square size={16} />
              Restaurar por defecto
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const Container = ({ children }) => {
    if (layout === "grid") return <div className={gridClassName}>{children}</div>;
    return <div className="flex flex-col gap-6">{children}</div>;
  };

  return (
    <div className="flex flex-col gap-6">
      <Header />

      <Container>
        {visibleSections.map((s) => {
          const mode = s.mode;

          // ctx para render
          const ctx = {
            mode,
            setMode: (m) => setMode(s.id, m),
            isVisible: mode !== "hide",
          };

          if (mode === "min") {
            return (
              <div key={s.id} className="bg-white rounded shadow border border-gray-200">
                <div className="p-4 flex items-center justify-between">
                  <div className="font-bold text-gray-800 truncate" title={s.title}>
                    {s.title}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="px-3 py-2 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-gray-700"
                      onClick={() => setMode(s.id, "show")}
                    >
                      Expandir
                    </button>
                    <button
                      type="button"
                      className="px-3 py-2 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-gray-700"
                      onClick={() => setMode(s.id, "hide")}
                    >
                      Ocultar
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return <React.Fragment key={s.id}>{s.render(ctx)}</React.Fragment>;
        })}
      </Container>
    </div>
  );
};

export default SelectDash;
