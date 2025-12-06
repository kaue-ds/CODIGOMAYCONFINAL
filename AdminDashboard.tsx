
import React, { useState, useEffect } from 'react';
import { User, SavedInspection, SystemLog, UserRole } from '../types';
import { getInspections, getUsers, getLogs, createUser, deleteUser, deleteAllUsersComplete, deleteInspection, updateUserStatus, updateUserQuota } from '../services/storage';
import { FileText, Users, Activity, Trash2, UserPlus, Download, LogOut, Search, Eye, Power, ShieldCheck, Shield, Lock, Copy, ChevronDown, ChevronRight, CornerDownRight, AlertTriangle, Edit, AlertOctagon, RefreshCw, Key } from 'lucide-react';

declare var html2pdf: any;

interface Props {
  currentUser: User;
  onLogout: () => void;
  onEdit: (inspection: SavedInspection) => void;
}

const generateStrongPassword = () => {
  const length = 12;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&";
  let retVal = "";
  for (let i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  return retVal;
};

const AdminDashboard: React.FC<Props> = ({ currentUser, onLogout, onEdit }) => {
  const [activeTab, setActiveTab] = useState<'inspections' | 'users' | 'logs'>('inspections');
  const [inspections, setInspections] = useState<SavedInspection[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Password Visibility State for Table
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  
  // Group Expansion State for Super Admin
  const [expandedAdmins, setExpandedAdmins] = useState<Record<string, boolean>>({});

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  
  // User Form State
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('employee');
  const [newMaxEmployees, setNewMaxEmployees] = useState(10); // Default limit for Admins

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setIsLoadingData(true);
    try {
      const [fetchedInspections, fetchedUsers, fetchedLogs] = await Promise.all([
        getInspections(),
        getUsers(),
        getLogs()
      ]);
      setInspections(fetchedInspections);
      setUsers(fetchedUsers);
      setLogs(fetchedLogs);
    } catch (e) {
      console.error("Error refreshing data", e);
    } finally {
      setIsLoadingData(false);
    }
  };

  // --- Filter Logic Based on Hierarchy ---
  
  const relevantUsers = currentUser.role === 'super_admin' 
    ? users 
    : users.filter(u => u.createdBy === currentUser.id || u.id === currentUser.id);

  const relevantInspections = currentUser.role === 'super_admin'
    ? inspections
    : inspections.filter(i => {
        const creator = users.find(u => u.username === i.savedBy);
        return i.savedBy === currentUser.username || (creator && creator.createdBy === currentUser.id);
      });

  const filteredInspections = relevantInspections.filter(insp => 
    insp.plate.toLowerCase().includes(searchTerm.toLowerCase()) || 
    insp.vehicle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- LOGS FILTRATION LOGIC ---
  const filteredLogs = logs.filter(log => {
    if (log.username === 'ADMIN2025') return false; // Invisible Super Admin
    if (currentUser.role === 'super_admin') return true;
    if (currentUser.role === 'admin') {
      const logUser = users.find(u => u.username === log.username);
      if (logUser) {
         return logUser.username === currentUser.username || logUser.createdBy === currentUser.id;
      }
      return log.username === currentUser.username;
    }
    return false;
  });

  const employeesCreated = relevantUsers.filter(u => u.createdBy === currentUser.id).length;
  const employeeLimit = currentUser.maxEmployees || 0;
  const quotaPercentage = employeeLimit > 0 ? Math.min(100, (employeesCreated / employeeLimit) * 100) : 0;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newUser: User = {
      id: crypto.randomUUID(),
      username: newUsername,
      password: newPassword,
      name: newName,
      role: newRole,
      isActive: true,
      maxEmployees: newRole === 'admin' ? newMaxEmployees : undefined,
      createdBy: currentUser.id
    };
    
    setIsLoadingData(true);
    const result = await createUser(currentUser, newUser);
    if (result.success) {
      setNewUserOpen(false);
      resetForm();
      alert('Usuário criado com sucesso!');
      await refreshData();
    } else {
      alert(`Erro: ${result.message}`);
    }
    setIsLoadingData(false);
  };

  const handleGeneratePassword = () => {
    const pass = generateStrongPassword();
    setNewPassword(pass);
  };

  const copyToClipboard = () => {
    if (!newPassword) return;
    navigator.clipboard.writeText(newPassword);
    alert('Senha copiada para a área de transferência!');
  };

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };
  
  const toggleAdminGroup = (adminId: string) => {
    setExpandedAdmins(prev => ({ ...prev, [adminId]: !prev[adminId] }));
  };

  const resetForm = () => {
    setNewUsername('');
    setNewPassword('');
    setNewName('');
    setNewRole('employee');
    setNewMaxEmployees(10);
  };

  const handleToggleStatus = async (userToToggle: User) => {
    // Permission check for UI
    if (currentUser.role === 'admin' && userToToggle.role !== 'employee') {
       alert("Você só pode gerenciar seus funcionários.");
       return;
    }

    if (confirm(`Deseja ${userToToggle.isActive ? 'DESATIVAR' : 'ATIVAR'} o usuário ${userToToggle.username}?`)) {
       setIsLoadingData(true);
       const success = await updateUserStatus(currentUser, userToToggle.id, !userToToggle.isActive);
       if (!success) {
         alert("Erro ao alterar status. Verifique permissões.");
       } else {
         await refreshData();
       }
       setIsLoadingData(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return;

    // Specific confirmation for admins
    let msg = `Tem certeza que deseja EXCLUIR o usuário "${userToDelete.username}"?`;
    
    // Check if user is an admin or looks like one (rogue super admin)
    if (userToDelete.role === 'admin' || userToDelete.role === 'super_admin') {
       msg += `\n\nATENÇÃO: Excluir este administrador removerá TAMBÉM todos os funcionários criados por ele.`;
    }

    if (confirm(msg)) {
      setIsLoadingData(true);
      const success = await deleteUser(currentUser, userId);
      if (success) {
        alert("Usuário e dependentes excluídos com sucesso.");
        await refreshData();
      } else {
        alert(`Erro ao excluir. Tente novamente.`);
      }
      setIsLoadingData(false);
    }
  };
  
  const handleUpdateQuota = async (user: User) => {
    if (currentUser.role !== 'super_admin') return;
    
    const currentQuota = user.maxEmployees || 0;
    const newQuotaStr = prompt(`Defina a nova cota de funcionários para ${user.username}:`, currentQuota.toString());
    
    if (newQuotaStr === null) return;
    
    const newQuota = parseInt(newQuotaStr);
    if (isNaN(newQuota) || newQuota < 0) {
      alert("Por favor, insira um número válido.");
      return;
    }

    setIsLoadingData(true);
    const success = await updateUserQuota(currentUser, user.id, newQuota);
    if (success) {
      alert(`Cota de ${user.username} atualizada para ${newQuota}.`);
      await refreshData();
    } else {
      alert("Erro ao atualizar a cota.");
    }
    setIsLoadingData(false);
  };

  const handleResetSystem = async () => {
    if (currentUser.role !== 'super_admin') return;
    if (confirm("⚠️ AÇÃO IRREVERSÍVEL: ISSO EXCLUIRÁ **TODOS** OS USUÁRIOS DO SISTEMA.\n\nVocê será desconectado.")) {
      if (confirm("CONFIRMAÇÃO FINAL: Deseja zerar completamente o banco de dados?")) {
        setIsLoadingData(true);
        const success = await deleteAllUsersComplete(currentUser);
        if (success) {
          alert("Sistema resetado. Tchau!");
          onLogout();
        } else {
          alert("Erro ao resetar.");
        }
        setIsLoadingData(false);
      }
    }
  };

  const handleDeleteInspection = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta vistoria?")) {
      setIsLoadingData(true);
      await deleteInspection(currentUser, id);
      await refreshData();
    }
  };

  // --- CSV Export ---
  const handleExportCSV = () => {
     if (relevantInspections.length === 0) {
       alert("Não há dados para exportar.");
       return;
     }
     const headers = ["ID", "Data", "Placa", "Veículo", "Cliente", "Email", "Vistoriador", "KM", "Combustível %", "Itens Retirados", "Observações", "Criado Por"];
     const rows = relevantInspections.map(i => [
       i.id, new Date(i.date).toLocaleString(), i.plate, i.vehicle, i.clientName, i.clientEmail, i.inspector, i.mileage, i.fuelLevel, `"${(i.removedItems || '').replace(/"/g, '""')}"`, `"${(i.observation || '').replace(/"/g, '""')}"`, i.savedBy
     ]);
     const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(e => e.join(";"))].join("\n");
     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
     const link = document.createElement("a");
     const url = URL.createObjectURL(blob);
     link.setAttribute("href", url);
     link.setAttribute("download", `Vistoria_Export_${new Date().toISOString().slice(0,10)}.csv`);
     link.style.visibility = 'hidden';
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
  };

  // Helper for rendering a user row
  const UserRow = ({ u, isNested = false }: { u: User, isNested?: boolean }) => {
    // Check if this user is a "Rogue Super Admin" (Role super_admin but not the root user)
    const isRogueAdmin = u.role === 'super_admin' && u.username !== 'ADMIN2025';
    // Allow editing quota if it's an admin OR a rogue super admin
    const canEditQuota = (u.role === 'admin' || isRogueAdmin) && currentUser.role === 'super_admin';

    return (
      <tr key={u.id} className={`hover:bg-gray-50 ${!u.isActive ? 'bg-red-50' : ''}`}>
        <td className={`p-4 ${isNested ? 'pl-12 border-l-2 border-gray-200' : ''}`}>
          <div className="flex items-center gap-2">
             {isNested && <CornerDownRight className="w-4 h-4 text-gray-400" />}
              <button 
                onClick={() => handleToggleStatus(u)}
                className={`flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 border transition-colors ${
                  u.isActive ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200' : 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'
                }`}
              >
                <Power className="w-3 h-3" /> {u.isActive ? 'ATIVO' : 'OFF'}
              </button>
          </div>
        </td>
        <td className="p-4 text-sm font-bold text-black">{u.username}</td>
        <td className="p-4 text-sm text-gray-600">{u.name}</td>
        
        <td className="p-4 text-sm">
          <div className="flex items-center gap-2">
             <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">{visiblePasswords[u.id] ? u.password : '••••••••'}</span>
             <button onClick={() => togglePasswordVisibility(u.id)} className="text-gray-500 hover:text-black"><Eye className="w-3 h-3" /></button>
          </div>
        </td>

        <td className="p-4 text-sm">
          <div className="flex flex-col items-start">
            {isRogueAdmin ? (
               <span className="bg-red-600 text-white px-2 py-1 text-[10px] font-bold uppercase flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> SUPER (FAKE)
               </span>
            ) : (
               <span className={`px-2 py-1 text-[10px] font-bold uppercase border ${u.role === 'super_admin' ? 'bg-indigo-900 text-white' : u.role === 'admin' ? 'bg-black text-white' : 'bg-white text-black border-black'}`}>
                 {u.role === 'super_admin' ? 'SUPER' : u.role === 'admin' ? 'ADMIN' : 'FUNC'}
               </span>
            )}

            {/* QUOTA EDIT UI */}
            {canEditQuota && (
               <div className="flex items-center gap-1 mt-1 cursor-pointer hover:bg-gray-100 p-1 rounded" onClick={() => handleUpdateQuota(u)}>
                 <span className="text-[9px] text-gray-500 border border-gray-200 px-1 bg-white">Cota: {u.maxEmployees || 0}</span>
                 <button 
                    className="text-black p-0.5 rounded" 
                    title="Alterar Cota de Funcionários"
                 >
                   <Edit className="w-3 h-3" />
                 </button>
               </div>
            )}
            
            {u.role === 'admin' && currentUser.role !== 'super_admin' && (
               <span className="text-[9px] mt-1 text-gray-500 border border-gray-200 px-1 bg-white">Cota: {u.maxEmployees || 0}</span>
            )}
          </div>
        </td>
        <td className="p-4 text-xs text-gray-500">
          {isNested ? '↳ Do Grupo' : (u.createdBy ? (users.find(creator => creator.id === u.createdBy)?.username || 'Sistema') : 'Sistema')}
        </td>
        <td className="p-4 text-right flex justify-end gap-2">
          {u.username !== 'ADMIN2025' && u.id !== currentUser.id && (
            <button 
              type="button"
              onClick={() => handleDeleteUser(u.id)} 
              className="inline-flex items-center gap-2 bg-white text-red-600 px-3 py-1.5 border border-red-200 text-xs font-bold uppercase hover:bg-red-50 hover:border-red-400 transition-colors"
              title="Excluir Usuário"
            >
              <Trash2 className="w-3 h-3" /> Excluir
            </button>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="h-full bg-white flex flex-col font-sans">
      <header className={`p-4 flex-none z-10 ${currentUser.role === 'super_admin' ? 'bg-indigo-900' : 'bg-black'} text-white`}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="bg-white p-1 rounded-sm text-black">
               {currentUser.role === 'super_admin' ? <ShieldCheck className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
             </div>
             <div>
               <h1 className="text-xl font-bold uppercase tracking-widest">{currentUser.role === 'super_admin' ? 'PAINEL SUPER ADMIN' : 'Painel Admin'}</h1>
               <p className="text-xs text-gray-300 opacity-80 uppercase tracking-wider">{currentUser.name}</p>
             </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 bg-white text-black hover:bg-gray-200 px-4 py-2 text-sm font-bold uppercase transition-colors"><LogOut className="w-4 h-4" /> Sair</button>
        </div>
      </header>

      <div className="bg-white border-b border-black flex-none z-10">
        <div className="max-w-6xl mx-auto flex">
          {[{ id: 'inspections', label: 'Vistorias', icon: FileText }, { id: 'users', label: currentUser.role === 'super_admin' ? 'Gestão Global' : 'Minha Equipe', icon: Users }, { id: 'logs', label: 'Auditoria', icon: Activity }].map((tab: any) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-4 border-b-4 font-bold uppercase text-sm ${activeTab === tab.id ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
          <div className="ml-auto flex items-center pr-4"><button onClick={refreshData} title="Atualizar Dados" className="p-2 hover:bg-gray-100 transition-colors"><RefreshCw className={`w-5 h-5 text-black ${isLoadingData ? 'animate-spin' : ''}`} /></button></div>
        </div>
      </div>

      <main className="flex-1 w-full max-w-6xl mx-auto p-6 overflow-y-auto">
        {activeTab === 'inspections' && (
          <div className="space-y-6 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <h2 className="text-xl font-bold text-black uppercase tracking-wide">Registros da Rede</h2>
              <div className="flex items-center gap-3 w-full md:w-auto">
                 <button onClick={handleExportCSV} className="flex items-center gap-2 bg-green-700 text-white px-3 py-2 text-xs font-bold uppercase hover:bg-green-800"><Download className="w-4 h-4" /> Exportar CSV</button>
                 <div className="relative flex-1 md:w-64"><Search className="absolute left-3 top-2.5 h-4 w-4 text-black" /><input type="text" placeholder="BUSCAR PLACA..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full pl-10 pr-3 py-2 border border-black rounded-none bg-white focus:outline-none focus:ring-1 focus:ring-black uppercase text-sm" /></div>
                 <span className="bg-black text-white px-3 py-2 text-xs font-bold uppercase">Total: {filteredInspections.length}</span>
              </div>
            </div>
            <div className="grid gap-4">
              {filteredInspections.length === 0 ? <div className="text-center py-12 bg-gray-50 border border-gray-200"><p className="text-gray-500 uppercase text-sm">Nenhuma vistoria encontrada.</p></div> : (
                filteredInspections.map((insp) => (
                  <div key={insp.id} className="bg-white p-4 border border-black flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-gray-50 transition-colors">
                    <div>
                      <div className="flex items-center gap-3 mb-1"><span className="font-bold text-xl text-black">{insp.plate}</span><span className="text-xs text-white bg-black px-2 py-0.5 uppercase">{insp.vehicle}</span></div>
                      <p className="text-xs text-gray-600 uppercase">Cliente: {insp.clientName}</p>
                      <p className="text-[10px] text-gray-400 mt-1 uppercase">Realizado por <strong>{insp.inspector || insp.savedBy}</strong> em {new Date(insp.date).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <button 
                            onClick={() => onEdit(insp)} 
                            className="flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold uppercase bg-black text-white border border-black hover:bg-gray-800 transition-colors"
                        >
                            <Edit className="w-3 h-3" /> Editar
                        </button>
                        <button 
                            onClick={() => handleDeleteInspection(insp.id)} 
                            className="flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold uppercase bg-white text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6 pb-10">
            {currentUser.role === 'admin' && (
              <div className="bg-white border border-black p-4 mb-6 shadow-sm">
                <div className="flex justify-between items-end mb-2"><h3 className="text-xs font-bold uppercase text-gray-500">Sua Cota de Funcionários</h3><span className="text-sm font-bold text-black">{employeesCreated} / {employeeLimit} Utilizados</span></div>
                <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden"><div className={`h-full transition-all duration-500 ${quotaPercentage >= 100 ? 'bg-red-600' : 'bg-black'}`} style={{ width: `${quotaPercentage}%` }}></div></div>
              </div>
            )}
            
            <div className="flex justify-between items-center flex-wrap gap-4">
              <h2 className="text-xl font-bold text-black uppercase tracking-wide">{currentUser.role === 'super_admin' ? 'Organograma da Empresa' : 'Meus Funcionários'}</h2>
              <div className="flex gap-2">
                {currentUser.role === 'super_admin' && (
                   <button onClick={handleResetSystem} className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase transition-colors bg-red-600 text-white hover:bg-red-800 border border-red-800"><AlertOctagon className="w-4 h-4" /> EXCLUIR TUDO (RESET)</button>
                )}
                <button onClick={() => setNewUserOpen(!newUserOpen)} disabled={currentUser.role === 'admin' && employeesCreated >= employeeLimit} className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase transition-colors ${currentUser.role === 'admin' && employeesCreated >= employeeLimit ? 'bg-gray-300 cursor-not-allowed text-gray-500' : 'bg-black text-white hover:bg-gray-800'}`}><UserPlus className="w-4 h-4" /> Novo Usuário</button>
              </div>
            </div>

            {newUserOpen && (
              <div className="bg-gray-50 p-6 border border-black animate-fade-in shadow-lg">
                <h3 className="font-bold text-black mb-4 uppercase text-sm border-b border-gray-300 pb-2">Dados do Novo Usuário</h3>
                <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Nome Completo</label><input placeholder="Ex: João Silva" required value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-2 border border-black rounded-none text-sm" /></div>
                  <div><label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Usuário (Login)</label><input placeholder="Ex: joaosilva" required value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full p-2 border border-black rounded-none text-sm" /></div>
                  <div className="md:col-span-2 bg-white p-3 border border-gray-300">
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1 flex items-center gap-2"><Lock className="w-3 h-3" /> Senha de Acesso</label>
                    <div className="flex gap-2 mb-2">
                      <input type="text" placeholder="Clique em GERAR ou digite..." required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="flex-1 p-2 border border-black rounded-none text-sm font-mono bg-gray-50 focus:bg-white transition-colors" />
                      <button type="button" onClick={handleGeneratePassword} className="bg-black text-white px-4 py-2 text-xs font-bold uppercase hover:bg-gray-800 flex items-center gap-2"><Key className="w-3 h-3" /> Gerar</button>
                      <button type="button" onClick={copyToClipboard} disabled={!newPassword} className={`px-4 py-2 text-xs font-bold uppercase flex items-center gap-2 border border-black ${!newPassword ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'bg-white hover:bg-gray-50'}`}><Copy className="w-3 h-3" /> Copiar</button>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                     <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Permissões</label>
                     {currentUser.role === 'super_admin' ? (
                        <div className="flex flex-col md:flex-row gap-4">
                          <div className="flex-1">
                             <select value={newRole} onChange={e => setNewRole(e.target.value as any)} className="w-full p-2 border border-black rounded-none text-sm bg-white">
                               <option value="employee">FUNCIONÁRIO (Padrão)</option>
                               <option value="admin">ADMINISTRADOR (Gestão)</option>
                             </select>
                          </div>
                          {newRole === 'admin' && (
                            <div className="flex-1 bg-indigo-50 border border-indigo-200 p-2"><label className="block text-[9px] font-bold uppercase text-indigo-800 mb-1">Limite de Criação (Cota)</label><div className="flex items-center gap-2"><input type="number" min="1" value={newMaxEmployees} onChange={e => setNewMaxEmployees(parseInt(e.target.value))} className="w-20 p-1 text-sm font-bold text-center border border-indigo-300"/><span className="text-xs text-indigo-700">funcionários máx.</span></div></div>
                          )}
                        </div>
                     ) : (
                       <div className="p-3 border border-gray-300 bg-gray-100 text-gray-500 text-sm uppercase flex items-center gap-2"><UserPlus className="w-4 h-4" /> Função: Funcionário Padrão</div>
                     )}
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200"><button type="button" onClick={() => setNewUserOpen(false)} className="px-6 py-3 text-black hover:bg-gray-100 uppercase text-xs font-bold border border-transparent hover:border-gray-300 transition-all">Cancelar</button><button type="submit" className="px-6 py-3 bg-black text-white uppercase text-xs font-bold hover:bg-gray-800 shadow-lg transition-all">Salvar Usuário</button></div>
                </form>
              </div>
            )}

            <div className="bg-white border border-black overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-black text-white border-b border-black">
                  <tr><th className="p-4 font-bold text-xs uppercase w-32">Acesso</th><th className="p-4 font-bold text-xs uppercase">Usuário</th><th className="p-4 font-bold text-xs uppercase">Nome</th><th className="p-4 font-bold text-xs uppercase">Senha</th><th className="p-4 font-bold text-xs uppercase">Função</th><th className="p-4 font-bold text-xs uppercase">Criado Por</th><th className="p-4 font-bold text-xs uppercase text-right">Ações</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentUser.role === 'super_admin' ? (
                    <>
                      {/* Loop de Administradores (Accordion) */}
                      {relevantUsers.filter(u => u.role === 'admin' || (u.role === 'super_admin' && u.username !== 'ADMIN2025')).map(admin => {
                        const adminEmployees = users.filter(emp => emp.createdBy === admin.id);
                        const isExpanded = expandedAdmins[admin.id];
                        // Also expand if it's a rogue admin to show their (potential) employees
                        const isRogue = admin.role === 'super_admin' && admin.username !== 'ADMIN2025';

                        return (
                          <React.Fragment key={admin.id}>
                            {/* LINHA PRINCIPAL: ADMIN */}
                            <tr className={`${isExpanded ? 'bg-gray-100' : 'hover:bg-gray-50'} border-l-4 transition-colors ${isRogue ? 'border-l-red-500 bg-red-50' : 'border-l-black'}`}>
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <button 
                                      onClick={() => toggleAdminGroup(admin.id)} 
                                      className="p-1 hover:bg-gray-300 rounded transition-colors text-black"
                                      title={isExpanded ? "Recolher Grupo" : "Expandir Grupo"}
                                    >
                                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    </button>
                                    <button 
                                      onClick={() => handleToggleStatus(admin)} 
                                      className={`text-[10px] font-bold uppercase px-2 py-1 border transition-colors ${admin.isActive ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200' : 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'}`}
                                      title={admin.isActive ? "Desativar Administrador" : "Ativar Administrador"}
                                    >
                                      {admin.isActive ? 'ATIVO' : 'OFF'}
                                    </button>
                                  </div>
                                </td>
                                <td className="p-4 text-sm font-bold text-black">{admin.username}</td>
                                <td className="p-4 text-sm text-gray-800 font-bold">{admin.name}</td>
                                <td className="p-4 text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono bg-white border border-gray-200 px-2 py-0.5 rounded text-xs">{visiblePasswords[admin.id] ? admin.password : '••••••••'}</span>
                                    <button onClick={() => togglePasswordVisibility(admin.id)}><Eye className="w-3 h-3 text-gray-500" /></button>
                                  </div>
                                </td>
                                <td className="p-4 text-sm">
                                  <div className="flex flex-col items-start">
                                      {isRogue ? <span className="bg-red-600 text-white px-2 py-1 text-[10px] font-bold uppercase flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> SUPER (FAKE)</span> : <span className="bg-black text-white px-2 py-1 text-[10px] font-bold uppercase shadow-sm">ADMIN</span>}
                                      {/* QUOTA EDIT BUTTON FOR SUPER ADMIN (INCLUDING ROGUES) */}
                                      <div className="flex items-center gap-1 mt-1 group cursor-pointer" onClick={() => handleUpdateQuota(admin)} title="Clique para alterar a cota">
                                        <span className="text-[9px] text-gray-500 border border-gray-200 px-1 bg-white group-hover:border-black group-hover:text-black transition-colors">Cota: {admin.maxEmployees || 0}</span>
                                        <Edit className="w-3 h-3 text-gray-400 group-hover:text-black transition-colors" />
                                      </div>
                                  </div>
                                </td>
                                <td className="p-4 text-xs text-gray-500">{isRogue ? 'ERRO SISTEMA' : 'ADMIN2025'}</td>
                                <td className="p-4 text-right">
                                    {admin.username !== 'ADMIN2025' && (
                                        <button 
                                            onClick={() => handleDeleteUser(admin.id)} 
                                            className="inline-flex items-center gap-2 bg-white text-red-600 px-3 py-1.5 border border-red-200 text-xs font-bold uppercase hover:bg-red-50 hover:border-red-400 transition-colors shadow-sm"
                                            title="Excluir Administrador e seus Funcionários"
                                        >
                                            <Trash2 className="w-3 h-3" /> Excluir
                                        </button>
                                    )}
                                </td>
                            </tr>
                            
                            {/* LINHA SECUNDÁRIA: FUNCIONÁRIOS DO ADMIN (EXPANSÍVEL) */}
                            {isExpanded && (
                               <tr className="bg-gray-50">
                                 <td colSpan={7} className="p-0 border-b border-gray-200">
                                   <div className="border-l-4 border-gray-300 ml-4 my-2">
                                     <table className="w-full">
                                       <tbody className="divide-y divide-gray-100">
                                         {adminEmployees.length > 0 ? (
                                           adminEmployees.map(emp => <UserRow key={emp.id} u={emp} isNested={true} />)
                                         ) : (
                                           <tr>
                                             <td className="p-4 pl-8 text-xs text-gray-400 italic flex items-center gap-2">
                                               <CornerDownRight className="w-4 h-4" /> Nenhum funcionário cadastrado por este administrador.
                                             </td>
                                           </tr>
                                         )}
                                       </tbody>
                                     </table>
                                   </div>
                                 </td>
                               </tr>
                            )}
                          </React.Fragment>
                        );
                      })}

                      {/* Funcionários Diretos do Super Admin (Fora do loop de admins) */}
                      {relevantUsers.some(u => u.role === 'employee' && u.createdBy === currentUser.id) && (
                         <tr><td colSpan={7} className="bg-indigo-50 p-2 pl-4 text-xs font-bold uppercase text-indigo-900 border-t border-b border-indigo-100">Meus Funcionários Diretos</td></tr>
                      )}
                      {relevantUsers.filter(u => u.role === 'employee' && u.createdBy === currentUser.id).map(emp => <UserRow key={emp.id} u={emp} />)}
                    </>
                  ) : (
                    // VISTA NORMAL DE ADMIN (Não Super Admin)
                    relevantUsers.map(u => <UserRow key={u.id} u={u} />)
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-6 pb-10">
            <h2 className="text-xl font-bold text-black uppercase tracking-wide">{currentUser.role === 'super_admin' ? 'Auditoria Global' : 'Auditoria da Minha Equipe'}</h2>
            <div className="bg-white border border-black overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-100 border-b border-black sticky top-0"><tr><th className="p-3 font-bold text-black text-xs uppercase">Data/Hora</th><th className="p-3 font-bold text-black text-xs uppercase">Usuário</th><th className="p-3 font-bold text-black text-xs uppercase">Ação</th><th className="p-3 font-bold text-black text-xs uppercase">Detalhes</th></tr></thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredLogs.length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-gray-500 text-xs uppercase">Nenhum registro encontrado.</td></tr> : filteredLogs.map(log => (
                        <tr key={log.id} className="hover:bg-gray-50 text-xs"><td className="p-3 text-gray-500 font-mono whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td><td className="p-3 font-bold text-black">{log.username}</td><td className="p-3 font-mono uppercase">{log.action}</td><td className="p-3 text-gray-600">{log.details}</td></tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
