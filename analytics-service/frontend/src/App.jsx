import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Wifi, 
  Cpu, 
  ChevronDown, 
  Server, 
  Layers, 
  Radio,
  FileCode,
  Info
} from 'lucide-react';

// IMPORTACIONES DE TUS VISTAS
import M2MView from './views/M2MView';
import DevicesView from './views/DevicesView';
import KiwiView from './views/KiwiView';
import InfoView from './views/InfoView';
import PoolView from './views/PoolView';

// ==========================================
// COMPONENTE PRINCIPAL APP
// ==========================================
const App = () => {
  const [activeView, setActiveView] = useState('m2m'); 
  const [openMenu, setOpenMenu] = useState(null); 
  const navRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderContent = () => {
    switch (activeView) {
      case 'm2m': return <M2MView />;
      case 'pool': return <PoolView />;
      case 'boards': return <DevicesView />;
      case 'kiwi': return <KiwiView />;
      case 'versions': return <InfoView />; // Reusamos InfoView para Versiones
      default: return <M2MView />;
    }
  };

  const menuStructure = [
    {
      title: 'M2M',
      icon: <Wifi size={18} />,
      items: [
        { label: 'Gestión M2M', id: 'm2m', icon: <Radio size={16} /> },
        { label: 'Gestión Pool', id: 'pool', icon: <Layers size={16} /> },
      ]
    },
    {
      title: 'DISPOSITIVOS',
      icon: <Cpu size={18} />,
      items: [
        { label: 'Boards', id: 'boards', icon: <Server size={16} /> },
        { label: 'Kiwi', id: 'kiwi', icon: <LayoutDashboard size={16} /> },
      ]
    },
    {
      title: 'SOFTWARE',
      icon: <FileCode size={18} />,
      items: [
        { label: 'Versiones', id: 'versions', icon: <Info size={16} /> },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col w-full">
      
      {/* ================= BARRA SUPERIOR (100% WIDTH) ================= */}
      <nav ref={navRef} className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50 w-full">
        {/* Eliminado max-w-7xl, ahora es w-full con padding lateral */}
        <div className="w-full px-6"> 
          <div className="flex justify-between h-16">
            
            {/* LOGO Y TITULO */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center text-blue-600 font-bold text-xl tracking-tight mr-8">
                <LayoutDashboard className="mr-2" size={24} />
                Core Dashboard
              </div>
              
              {/* MENÚS DESPLEGABLES */}
              <div className="hidden md:flex md:space-x-4 h-full items-center">
                {menuStructure.map((menu, index) => (
                  <div key={index} className="relative group h-full flex items-center">
                    <button 
                      onClick={() => setOpenMenu(openMenu === index ? null : index)}
                      className={`inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md transition-colors 
                        ${openMenu === index ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'}`}
                    >
                      {menu.icon}
                      <span className="ml-2">{menu.title}</span>
                      <ChevronDown size={14} className={`ml-1 transition-transform duration-200 ${openMenu === index ? 'rotate-180' : ''}`} />
                    </button>

                    {/* DROPDOWN PANEL */}
                    {openMenu === index && (
                      <div className="absolute top-14 left-0 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                        {menu.items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveView(item.id);
                              setOpenMenu(null);
                            }}
                            className={`w-full text-left px-4 py-3 text-sm flex items-center hover:bg-gray-50 transition-colors
                              ${activeView === item.id ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600' : 'text-gray-700'}`}
                          >
                            <span className="mr-3 text-gray-400">{item.icon}</span>
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ZONA DERECHA */}
            <div className="flex items-center">
               <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold border border-green-200 flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                 Core API: Connected
               </span>
            </div>
          </div>
        </div>
      </nav>

      {/* ================= CONTENIDO PRINCIPAL (100% WIDTH) ================= */}
      {/* Eliminado max-w-7xl y mx-auto. Añadido w-full y max-w-none */}
      <main className="flex-1 w-full max-w-none px-6 py-6">
        
        {/* Título Sección */}
        <div className="mb-6 border-b border-gray-200 pb-2">
           <h2 className="text-2xl font-bold text-gray-800 capitalize flex items-center gap-2">
             {menuStructure.flatMap(m => m.items).find(i => i.id === activeView)?.icon}
             {menuStructure.flatMap(m => m.items).find(i => i.id === activeView)?.label || 'Dashboard'}
           </h2>
        </div>

        {/* Contenedor Vista */}
        <div className="w-full">
             {renderContent()}
        </div>

      </main>
    </div>
  );
};

export default App;