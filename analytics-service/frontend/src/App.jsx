import React, { useState } from 'react';
import { LayoutDashboard, Wifi, Cpu, Info } from 'lucide-react';
import M2MView from './views/M2MView';
import DevicesView from './views/DevicesView';
import './App.css'; // Asegúrate de tener Tailwind configurado o CSS básico
import InfoView from './views/InfoView';
import KiwiView from './views/KiwiView';

const App = () => {
  const [activeTab, setActiveTab] = useState('m2m');

  const renderContent = () => {
    switch (activeTab) {
      case 'm2m': return <M2MView />;
      case 'devices': return <DevicesView />;
      case 'kiwi': return <KiwiView />;
      case 'info': return <InfoView />
      default: return <M2MView />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900">
      {/* Header */}
      <header className="bg-white shadow px-6 py-4 mb-6">
        <h1 className="text-2xl font-bold text-blue-600">Analytics Dashboard</h1>
        <p className="text-sm text-gray-500">Conectado a Core API via FastAPI</p>
      </header>

      <main className="w-full px-6"> 
        <div className="flex space-x-4 mb-6 border-b border-gray-300">
          <button 
            onClick={() => setActiveTab('m2m')}
            className={`flex items-center pb-2 px-4 ${activeTab === 'm2m' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          >
            <Wifi size={18} className="mr-2"/> M2M (SIMs)
          </button>
          <button 
            onClick={() => setActiveTab('devices')}
            className={`flex items-center pb-2 px-4 ${activeTab === 'devices' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          >
            <Cpu size={18} className="mr-2"/> Boards
          </button>
          <button 
            onClick={() => setActiveTab('kiwi')}
            className={`flex items-center pb-2 px-4 ${activeTab === 'kiwi' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          >
            <LayoutDashboard size={18} className="mr-2"/> Kiwi
          </button>
          <button 
            onClick={() => setActiveTab('info')}
            className={`flex items-center pb-2 px-4 ${activeTab === 'info' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          >
            <Info size={18} className="mr-2"/> Info Versiones
          </button>
        </div>

        {/* Contenido Dinámico */}
        <div className="fade-in">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;