import React, { useEffect, useState } from 'react';
import { ChecklistStatus, InspectionData, INITIAL_CHECKLIST_ITEMS } from '../types';
import { ThumbsUp, ThumbsDown, AlertTriangle, Slash, Fuel, Disc } from 'lucide-react';

interface Props {
  data: InspectionData;
  updateNestedData: (parent: keyof InspectionData, key: string, value: any) => void;
}

const TabQuestionnaire: React.FC<Props> = ({ data, updateNestedData }) => {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleString());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleString('pt-BR'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleChecklistChange = (item: string, status: ChecklistStatus) => {
    updateNestedData('checklist', item, status);
  };

  const completedCount = Object.values(data.checklist).filter(v => v !== undefined && v !== null).length;

  const StatusButton = ({ 
    status, 
    current, 
    onClick, 
    icon: Icon
  }: { 
    status: ChecklistStatus, 
    current: ChecklistStatus, 
    onClick: () => void, 
    icon: any
  }) => {
    const isSelected = current === status;
    
    // Minimalist B&W Logic
    let baseClasses = "p-2 rounded-lg flex items-center justify-center transition-all duration-200 border";
    
    if (isSelected) {
      // Selected State: Solid Black
      baseClasses += " bg-black text-white border-black scale-105 shadow-md";
    } else {
      // Unselected State: White with gray border
      baseClasses += " bg-white text-gray-400 border-gray-200 hover:border-gray-400 hover:text-gray-600";
    }

    return (
      <button onClick={onClick} className={baseClasses}>
        <Icon className="w-5 h-5" />
      </button>
    );
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Date/Time Header - Minimalist */}
      <div className="border border-gray-300 rounded-none p-3 text-center bg-gray-50">
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Data e Hora</p>
        <p className="text-lg font-bold text-black font-mono">{currentTime}</p>
      </div>

      {/* Checklist Status */}
      <div className="flex justify-between items-end px-1 border-b border-black pb-2">
        <h3 className="font-bold text-xl text-black uppercase tracking-wide">Checklist</h3>
        <span className="text-sm font-bold text-black">
          {completedCount} / {INITIAL_CHECKLIST_ITEMS.length}
        </span>
      </div>

      {/* Checklist Items */}
      <div className="space-y-4">
        {INITIAL_CHECKLIST_ITEMS.map((item) => (
          <div key={item} className="bg-white pb-4 border-b border-gray-100 last:border-0">
            <p className="font-medium text-gray-900 mb-3 text-sm uppercase tracking-wide">{item}</p>
            <div className="grid grid-cols-4 gap-3">
              <StatusButton 
                status="good" 
                current={data.checklist[item] || null} 
                onClick={() => handleChecklistChange(item, 'good')} 
                icon={ThumbsUp} 
              />
              <StatusButton 
                status="bad" 
                current={data.checklist[item] || null} 
                onClick={() => handleChecklistChange(item, 'bad')} 
                icon={ThumbsDown} 
              />
              <StatusButton 
                status="damaged" 
                current={data.checklist[item] || null} 
                onClick={() => handleChecklistChange(item, 'damaged')} 
                icon={AlertTriangle} 
              />
              <StatusButton 
                status="na" 
                current={data.checklist[item] || null} 
                onClick={() => handleChecklistChange(item, 'na')} 
                icon={Slash} 
              />
            </div>
          </div>
        ))}
      </div>

      {/* Fuel Level - Grayscale */}
      <div className="bg-white pt-4 border-t-2 border-black">
        <h3 className="font-bold text-lg text-black mb-6 flex items-center uppercase tracking-wide">
          <Fuel className="w-5 h-5 mr-2"/> Nível de Combustível
        </h3>
        <div className="relative pt-6 pb-2 px-2">
          {/* Grayscale Gradient */}
          <div className="h-2 bg-gradient-to-r from-gray-300 via-gray-500 to-black rounded-full w-full"></div>
          <input
            type="range"
            min="0"
            max="100"
            value={data.fuelLevel}
            onChange={(e) => updateNestedData('fuelLevel', 'value', parseInt(e.target.value))}
            className="absolute top-5 left-0 w-full h-6 opacity-0 cursor-pointer z-10"
          />
          <div 
            className="absolute top-1 w-3 h-8 bg-black border border-white shadow-lg transition-all duration-100"
            style={{ left: `calc(${data.fuelLevel}% - 6px)` }}
          ></div>
          <div className="flex justify-between text-xs font-bold mt-4 text-gray-500 font-mono">
            <span>VAZIO</span>
            <span>1/2</span>
            <span>CHEIO</span>
          </div>
          <div className="text-center mt-2 font-mono font-bold text-xl text-black">{data.fuelLevel}%</div>
        </div>
      </div>

      {/* Tires */}
      <div className="bg-white pt-4 border-t-2 border-black">
        <h3 className="font-bold text-lg text-black mb-6 flex items-center uppercase tracking-wide">
          <Disc className="w-5 h-5 mr-2"/> Pneus
        </h3>
        <div className="space-y-4">
          {[
            { key: 'fl', label: 'Dianteiro Esquerdo' },
            { key: 'fr', label: 'Dianteiro Direito' },
            { key: 'rl', label: 'Traseiro Esquerdo' },
            { key: 'rr', label: 'Traseiro Direito' },
            { key: 'spare', label: 'Estepe' },
          ].map((tire) => (
            <div key={tire.key} className="flex flex-col">
               <label className="text-xs font-bold text-gray-500 uppercase mb-1">{tire.label}</label>
               <select 
                 className="block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm rounded-none border bg-white"
                 value={(data.tires as any)[tire.key] || ''}
                 onChange={(e) => updateNestedData('tires', tire.key, e.target.value)}
               >
                 <option value="">Selecione...</option>
                 <option value="Bom">Bom</option>
                 <option value="Regular">Regular</option>
                 <option value="Ruim">Ruim</option>
                 <option value="Careca">Careca</option>
               </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TabQuestionnaire;