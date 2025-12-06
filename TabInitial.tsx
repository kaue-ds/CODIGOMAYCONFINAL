import React, { useState } from 'react';
import { InspectionData } from '../types';
import { Car, User, Clipboard, Mail, Hash, Truck, AlertCircle, Wand2 } from 'lucide-react';
import { generateObservationSummary } from '../services/geminiService';

interface Props {
  data: InspectionData;
  updateData: (field: keyof InspectionData, value: string) => void;
  updateNestedData: (parent: keyof InspectionData, field: string, value: any) => void;
}

const InputField = ({ 
  label, 
  value, 
  onChange, 
  icon: Icon, 
  type = "text", 
  placeholder = "" 
}: { 
  label: string; 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; 
  icon: any; 
  type?: string;
  placeholder?: string;
}) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <div className="relative rounded-md shadow-sm">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Icon className="h-5 w-5 text-gray-400" />
      </div>
      {type === 'textarea' ? (
        <textarea
          rows={3}
          className="focus:ring-brand-500 focus:border-brand-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type}
          className="focus:ring-brand-500 focus:border-brand-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
      )}
    </div>
  </div>
);

const TabInitial: React.FC<Props> = ({ data, updateData, updateNestedData }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    const summary = await generateObservationSummary(data);
    updateData('observation', summary);
    setIsGenerating(false);
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Clipboard className="w-5 h-5 mr-2 text-brand-600" /> 
          Dados do Contrato
        </h2>
        <InputField 
          label="Número do Contrato" 
          value={data.contractNumber} 
          onChange={(e) => updateData('contractNumber', e.target.value)} 
          icon={Hash}
        />
        <InputField 
          label="Vistoriador" 
          value={data.inspector} 
          onChange={(e) => updateData('inspector', e.target.value)} 
          icon={User}
          placeholder="Ex: A.B.M TRANSPORTADORA LTDA"
        />
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Car className="w-5 h-5 mr-2 text-brand-600" /> 
          Veículo & Cliente
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <InputField 
            label="PLACA" 
            value={data.plate} 
            onChange={(e) => updateData('plate', e.target.value.toUpperCase())} 
            icon={Truck}
            placeholder="NAN7722"
          />
           <InputField 
            label="KM Atual" 
            value={data.mileage} 
            onChange={(e) => updateData('mileage', e.target.value)} 
            icon={Hash}
            type="number"
          />
        </div>
        <InputField 
          label="Veículo (Modelo/Cor)" 
          value={data.vehicle} 
          onChange={(e) => updateData('vehicle', e.target.value)} 
          icon={Car}
        />
        <InputField 
          label="Nome do Cliente" 
          value={data.clientName} 
          onChange={(e) => updateData('clientName', e.target.value)} 
          icon={User}
        />
        <InputField 
          label="E-mail do Cliente" 
          value={data.clientEmail} 
          onChange={(e) => updateData('clientEmail', e.target.value)} 
          icon={Mail}
          type="email"
        />
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 text-brand-600" /> 
          Detalhes da Coleta
        </h2>
        <InputField 
          label="Pertences Retirados" 
          value={data.removedItems} 
          onChange={(e) => updateData('removedItems', e.target.value)} 
          icon={Truck}
          type="textarea"
          placeholder="Liste os itens retirados do veículo..."
        />
        
        <div className="relative">
          <InputField 
            label="Observação" 
            value={data.observation} 
            onChange={(e) => updateData('observation', e.target.value)} 
            icon={Clipboard}
            type="textarea"
          />
          <button
            onClick={handleGenerateSummary}
            disabled={isGenerating}
            className="absolute top-0 right-0 mt-8 mr-2 text-xs bg-brand-100 text-brand-700 px-2 py-1 rounded-full flex items-center hover:bg-brand-200 transition-colors"
          >
            {isGenerating ? 'Gerando...' : (
              <>
                <Wand2 className="w-3 h-3 mr-1" />
                Gerar com IA
              </>
            )}
          </button>
        </div>

        <InputField 
          label="Observação Coleta" 
          value={data.collectionObservation} 
          onChange={(e) => updateData('collectionObservation', e.target.value)} 
          icon={Clipboard}
          type="textarea"
        />
      </div>
    </div>
  );
};

export default TabInitial;