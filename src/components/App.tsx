
import React, { useState, useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { InspectionData, User, SavedInspection } from '../../types';
import TabInitial from './TabInitial';
import TabQuestionnaire from './TabQuestionnaire';
import TabPhotos from './TabPhotos';
import TabSave from './TabSave';
import TabHistory from './TabHistory';
import Login from './Login';
import AdminDashboard from './AdminDashboard';
import UserSettings from './UserSettings';
import { LayoutDashboard, ClipboardList, Camera, Save as SaveIcon, LogOut, History, Settings } from 'lucide-react';
import { getCurrentUser, logoutUser, saveInspection } from '../../services/storage';

const INITIAL_DATA: InspectionData = {
  contractNumber: '',
  plate: '',
  inspector: '',
  clientName: '',
  clientEmail: '',
  vehicle: '',
  mileage: '',
  removedItems: '',
  observation: '',
  collectionObservation: '',
  checklist: {},
  fuelLevel: 50,
  tires: { fl: '', fr: '', rl: '', rr: '', spare: '' },
  photos: {},
  inspectorSignature: '',
  clientSignature: ''
};

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState<InspectionData>(INITIAL_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // State to control if Admin is viewing Dashboard or Inspection Form
  const [showAdminDashboard, setShowAdminDashboard] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
      setIsLoading(false);
    };
    fetchUser();
  }, []);

  const updateData = (field: keyof InspectionData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const updateNestedData = (parent: keyof InspectionData, key: string, value: any) => {
    if (parent === 'fuelLevel') {
      setData(prev => ({ ...prev, fuelLevel: value }));
      return;
    }
    setData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent] as Record<string, any>),
        [key]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      await saveInspection(data, currentUser);
      alert(data.id ? "Vistoria atualizada com sucesso!" : "Vistoria salva com sucesso!");
      setData(INITIAL_DATA);
      
      // If admin was editing, return to dashboard after save/complete? 
      // Or stay on Save tab? Let's stay on save tab for consistency, 
      // but if they want to go back, they use the header button.
      setActiveTab(4); 
    } catch (e: any) {
      alert("Erro ao salvar vistoria: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (confirm("Tem certeza que deseja descartar esta vistoria?")) {
      setData(INITIAL_DATA);
      setActiveTab(0);
    }
  };

  const handleEdit = (inspection: SavedInspection) => {
    setData(inspection);
    setActiveTab(0);
    setShowAdminDashboard(false); // Switch Admin to Form View
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setShowAdminDashboard(true); // Reset to dashboard on login
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setData(INITIAL_DATA);
    setActiveTab(0);
    setShowAdminDashboard(true);
  };

  if (isLoading) return <div className="flex items-center justify-center h-screen bg-white">Carregando...</div>;

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';

  // Admin OR Super Admin -> Dashboard (Unless they are editing/viewing form)
  if (isAdmin && showAdminDashboard) {
    return <AdminDashboard currentUser={currentUser} onLogout={handleLogout} onEdit={handleEdit} />;
  }

  // Employee OR Admin in Form Mode -> App
  const renderTabContent = () => {
    switch (activeTab) {
      case 0: return <TabInitial data={data} updateData={updateData} updateNestedData={updateNestedData} />;
      case 1: return <TabQuestionnaire data={data} updateNestedData={updateNestedData} />;
      case 2: return <TabPhotos data={data} updateNestedData={updateNestedData} />;
      case 3: 
        if (isSaving) return <div className="flex items-center justify-center h-full"><p className="text-xl font-bold text-black uppercase animate-pulse">Salvando na Nuvem...</p></div>;
        return <TabSave data={data} updateData={updateData} onSave={handleSave} onDiscard={handleDiscard} />;
      case 4: return <TabHistory currentUser={currentUser} onEdit={handleEdit} />;
      default: return null;
    }
  };

  const tabs = [
    { label: 'Inicial', icon: LayoutDashboard },
    { label: 'Quest.', icon: ClipboardList },
    { label: 'Fotos', icon: Camera },
    { label: 'Salvar', icon: SaveIcon },
    { label: 'Histórico', icon: History },
  ];

  return (
    <HashRouter>
      <div className="h-full bg-white flex flex-col font-sans relative">
        {showSettings && <UserSettings user={currentUser} onClose={() => setShowSettings(false)} />}
        <header className="bg-black text-white p-4 z-20 flex-none border-b border-gray-800">
          <div className="max-w-2xl mx-auto w-full flex justify-between items-center">
            <h1 className="text-xl font-extrabold tracking-widest uppercase">AutoCheck</h1>
            <div className="flex items-center gap-2">
              <div className="text-xs text-right mr-2 hidden sm:block">
                 <div className="font-bold uppercase">{currentUser.name}</div>
                 {data.id ? <div className="bg-white text-black px-1 font-bold animate-pulse text-[10px] uppercase tracking-wide">EDITANDO</div> : <div className="bg-gray-800 px-1 text-[10px] uppercase tracking-wide">{data.plate || 'NOVA VISTORIA'}</div>}
              </div>
              
              {/* Back to Dashboard Button for Admins */}
              {isAdmin && !showAdminDashboard && (
                 <button onClick={() => setShowAdminDashboard(true)} className="bg-white text-black p-2 hover:bg-gray-200 transition-colors mr-1" title="Voltar ao Painel">
                    <LayoutDashboard className="w-4 h-4" />
                 </button>
              )}

              <button onClick={() => setShowSettings(true)} className="bg-black border border-white p-2 hover:bg-white hover:text-black transition-colors" title="Configurações"><Settings className="w-4 h-4" /></button>
              <button onClick={handleLogout} className="bg-white text-black p-2 hover:bg-gray-200 transition-colors" title="Sair"><LogOut className="w-4 h-4" /></button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-2xl mx-auto w-full overflow-y-auto">
          {renderTabContent()}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-black z-30 pb-safe">
          <div className="max-w-2xl mx-auto flex justify-around items-center">
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = activeTab === index;
              return (
                <button key={index} onClick={() => setActiveTab(index)} className={`flex flex-col items-center justify-center w-full py-3 transition-colors duration-200 ${isActive ? 'text-black bg-gray-50' : 'text-gray-400 hover:text-black'}`}>
                  <Icon className={`w-6 h-6 mb-1 ${isActive ? 'stroke-2' : 'stroke-1'}`} />
                  <span className={`text-[10px] uppercase tracking-wide ${isActive ? 'font-bold' : ''}`}>{tab.label}</span>
                  {isActive && <span className="absolute bottom-0 w-8 h-1 bg-black" />}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </HashRouter>
  );
}

export default App;
