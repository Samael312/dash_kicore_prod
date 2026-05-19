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
  Bell,
  Info,
  Power,
  Library,
  Menu, // Icono para abrir menú móvil
  X     // Icono para cerrar menú móvil
} from 'lucide-react';

// IMPORTACIONES DE TUS VISTAS
import M2MView from './views/M2MView';
import DevicesView from './views/DevicesView';
import KiwiView from './views/KiwiView';
import InfoView from './views/InfoView';
import PoolView from './views/PoolView';
import RenView from './views/RenView';
import AlarmsView from './views/AlarmsView';
import InstView from './views/InstView';
import VpnView from './views/VpnView';

// ==========================================
// COMPONENTE PRINCIPAL APP
// ==========================================
const App = () => {
  const [activeView, setActiveView] = useState('m2m'); 
  const [openMenu, setOpenMenu] = useState(null); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openMobileSections, setOpenMobileSections] = useState({});
  const navRef = useRef(null);

  // Cerrar menús al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setOpenMenu(null);
        setIsMobileMenuOpen(false);
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
      case 'versions': return <InfoView />;
      case 'alarms': return <AlarmsView />;
      case 'ren': return <RenView />;
      case 'inst': return <InstView />;
      case 'vpn': return <VpnView />;
      default: return <M2MView />;
    }
  };

  const toggleMobileSection = (index) => {
    setOpenMobileSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
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
        { label: 'Renovaciones', id: 'ren', icon: <Library size={16} /> },
      ]
    },
    {
      title: 'SOFTWARE',
      icon: <FileCode size={18} />,
      items: [
        { label: 'Versiones', id: 'versions', icon: <Info size={16} /> },
      ]
    },
    {
      title: 'INSTALACIONES',
      icon: <Power size={18} />,
      items: [
        { label: 'Instalaciones', id: 'inst', icon: <Power size={16} /> },
        { label: 'VPN Status', id: 'vpn', icon: <Wifi size={16} /> },
      ] 
    },
    {
      title: 'ALARMAS',
      icon: <Bell size={18} />,
      items: [
        { label: 'Historial', id: 'alarms', icon: <Bell size={16} /> },
      ]
    }
  ];

  // Obtener el item activo actual para renderizar dinámicamente el título de la sección
  const currentActiveItem = menuStructure.flatMap(m => m.items).find(i => i.id === activeView);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col w-full overflow-x-hidden">
      
      {/* ================= BARRA SUPERIOR RESPONSIVA ================= */}
      <nav ref={navRef} className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50 w-full">
        <div className="w-full px-4 sm:px-6"> 
          <div className="flex justify-between h-16 items-center">
            
            {/* LADO IZQUIERDO: HAMBURGUESA + LOGO */}
            <div className="flex items-center flex-1 md:flex-initial">
              {/* Botón de Menú Móvil */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-blue-600 hover:bg-gray-100 md:hidden mr-2 focus:outline-none transition-colors"
                aria-label="Abrir menú de navegación"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>

              {/* LOGO Y TITULO */}
              <div className="flex-shrink-0 flex items-center text-blue-600 font-bold text-lg sm:text-xl tracking-tight mr-4 md:mr-8 select-none">
                <LayoutDashboard className="mr-1.5 sm:mr-2 flex-shrink-0" size={22} />
                <span className="truncate max-w-[160px] xs:max-w-none">Metrics Dashboard</span>
              </div>
              
              {/* MENÚS DESPLEGABLES (DESKTOP) */}
              <div className="hidden md:flex md:space-x-2 h-full items-center">
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

                    {/* DROPDOWN PANEL (DESKTOP) */}
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
                              ${activeView === item.id ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-semibold' : 'text-gray-700'}`}
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

            {/* ZONA DERECHA: ESTADO DE API (ESTILIZADO MÓVIL) */}
            <div className="flex items-center flex-shrink-0">
               <span className="px-2.5 py-1 sm:px-3 sm:py-1 rounded-full bg-green-100 text-green-800 text-[11px] sm:text-xs font-semibold border border-green-200 flex items-center gap-1.5 sm:gap-2">
                 <span className="relative flex h-2 w-2">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                 </span>
                 <span className="hidden xs:inline">Core API: Connected</span>
                 <span className="inline xs:hidden">Online</span>
               </span>
            </div>
          </div>
        </div>

        {/* ================= MENÚ DESPLEGABLE MÓVIL (MÓVIL / TABLET) ================= */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white shadow-inner max-h-[calc(100vh-4rem)] overflow-y-auto w-full absolute left-0 top-16 z-40 animate-in slide-in-from-top-4 duration-200">
            <div className="px-4 py-3 space-y-1">
              {menuStructure.map((menu, index) => {
                const isSectionOpen = !!openMobileSections[index];
                return (
                  <div key={index} className="border-b border-gray-100 last:border-none pb-1 pt-1">
                    <button
                      onClick={() => toggleMobileSection(index)}
                      className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-semibold text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-gray-400">{menu.icon}</span>
                        <span>{menu.title}</span>
                      </div>
                      <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isSectionOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* SUB-ITEMS ACCORDION */}
                    {isSectionOpen && (
                      <div className="mt-1 pl-4 space-y-1 border-l-2 border-gray-100 ml-5 animate-in fade-in duration-150">
                        {menu.items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveView(item.id);
                              setIsMobileMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center rounded-md hover:bg-gray-50 transition-colors
                              ${activeView === item.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-600'}`}
                          >
                            <span className={`mr-2.5 ${activeView === item.id ? 'text-blue-600' : 'text-gray-400'}`}>{item.icon}</span>
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* ================= CONTENIDO PRINCIPAL RESPONSIVO ================= */}
      <main className="flex-1 w-full max-w-none px-4 sm:px-6 py-6 flex flex-col">
        
        {/* Título Sección Adaptable */}
        <div className="mb-6 border-b border-gray-200 pb-3">
           <h2 className="text-xl sm:text-2xl font-bold text-gray-800 capitalize flex items-center gap-2">
             <span className="text-blue-600 flex-shrink-0">
               {currentActiveItem?.icon}
             </span>
             <span className="truncate">
               {currentActiveItem?.label || 'Dashboard'}
             </span>
           </h2>
        </div>

        {/* Contenedor Vista Dinámica */}
        <div className="w-full flex-1">
           {renderContent()}
        </div>

      </main>
    </div>
  );
};

export default App;