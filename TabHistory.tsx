import React, { useEffect, useState } from 'react';
import { SavedInspection, User } from '../types';
import { getUserInspections } from '../services/storage';
import { Clock, Edit, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  currentUser: User;
  onEdit: (inspection: SavedInspection) => void;
}

const TabHistory: React.FC<Props> = ({ currentUser, onEdit }) => {
  const [inspections, setInspections] = useState<SavedInspection[]>([]);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const fetchInspections = async () => {
    setLoading(true);
    try {
      const data = await getUserInspections(currentUser.username);
      setInspections(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections();
    
    // Update timer every minute to refresh "Edit availability"
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, [currentUser]);

  const isEditable = (dateStr: string) => {
    const created = new Date(dateStr);
    const diffMs = now.getTime() - created.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours < 1;
  };

  const getRemainingTime = (dateStr: string) => {
    const created = new Date(dateStr);
    const deadline = new Date(created.getTime() + 60 * 60 * 1000); // +1 hour
    const diffMs = deadline.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    return diffMins > 0 ? diffMins : 0;
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Clock className="w-6 h-6 text-brand-600" />
          Minhas Vistorias
        </h2>
        <button onClick={fetchInspections} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
           <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">Carregando histórico...</div>
      ) : inspections.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">Você ainda não realizou vistorias.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {inspections.map((insp) => {
            const editable = isEditable(insp.date);
            const remaining = getRemainingTime(insp.date);

            return (
              <div key={insp.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{insp.plate}</h3>
                    <p className="text-sm text-gray-500">{insp.vehicle}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(insp.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-1 text-xs">
                     {editable ? (
                       <span className="text-green-600 flex items-center gap-1 bg-green-50 px-2 py-1 rounded-full font-medium">
                         <Clock className="w-3 h-3" /> Edição: {remaining} min
                       </span>
                     ) : (
                       <span className="text-gray-400 flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
                         <CheckCircle className="w-3 h-3" /> Finalizado
                       </span>
                     )}
                  </div>

                  {editable && (
                    <button
                      onClick={() => onEdit(insp)}
                      className="flex items-center gap-2 bg-brand-100 text-brand-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-200 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Modificar
                    </button>
                  )}
                  
                  {!editable && (
                    <button disabled className="text-gray-400 px-4 py-2 text-sm cursor-not-allowed">
                       Bloqueado
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800 flex gap-2 border border-blue-100 mt-4">
        <AlertCircle className="w-4 h-4 flex-none" />
        <p>
          Nota: Vistorias só podem ser modificadas até <strong>1 hora</strong> após a criação. Após este período, contate o administrador.
        </p>
      </div>
    </div>
  );
};

export default TabHistory;