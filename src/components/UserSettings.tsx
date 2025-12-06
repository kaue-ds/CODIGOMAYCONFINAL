import React, { useState } from 'react';
import { User } from '../../types';
import { changePassword } from '../../services/storage';
import { Lock, X, Save } from 'lucide-react';

interface Props {
  user: User;
  onClose: () => void;
}

const UserSettings: React.FC<Props> = ({ user, onClose }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'As novas senhas não coincidem.' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    setLoading(true);
    const result = await changePassword(newPassword);
    setLoading(false);
    
    if (result.success) {
      setMessage({ type: 'success', text: result.message });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(onClose, 2000);
    } else {
      setMessage({ type: 'error', text: result.message });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        <div className="bg-brand-600 p-4 flex justify-between items-center text-white">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Lock className="w-5 h-5" /> Configurações de Segurança
          </h2>
          <button onClick={onClose} className="hover:bg-brand-700 p-1 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 mb-4">
            Olá, <strong>{user.name}</strong>. Para sua segurança, todas as alterações de senha são registradas no sistema.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 text-white py-3 rounded-xl font-bold transition-colors shadow-lg shadow-brand-200 ${
              loading ? 'bg-brand-400 cursor-wait' : 'bg-brand-600 hover:bg-brand-700'
            }`}
          >
            {loading ? 'Atualizando...' : <><Save className="w-5 h-5" /> Alterar Senha</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserSettings;