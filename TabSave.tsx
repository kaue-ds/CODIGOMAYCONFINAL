import React from 'react';
import { InspectionData, MANDATORY_PHOTOS } from '../types';
import { Save, Trash, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import SignaturePad from './SignaturePad';

interface Props {
  data: InspectionData;
  updateData: (field: keyof InspectionData, value: string) => void;
  onSave: () => void;
  onDiscard: () => void;
}

const TabSave: React.FC<Props> = ({ data, updateData, onSave, onDiscard }) => {
  const missingPhotos = MANDATORY_PHOTOS.filter(p => !data.photos[p]);
  const hasSignatures = data.inspectorSignature && data.clientSignature;
  const isComplete = missingPhotos.length === 0 && data.contractNumber && data.plate && hasSignatures;
  
  // Check if we are updating
  const isUpdating = !!data.id;

  return (
    <div className="p-6 pb-24 flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      
      <div className="text-center space-y-2">
        <div className="w-20 h-20 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-4">
           {isComplete ? <CheckCircle2 className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
        </div>
        <h2 className="text-2xl font-bold text-black uppercase tracking-tight">
            {isUpdating ? 'Atualizar Vistoria' : 'Finalizar Vistoria'}
        </h2>
        <p className="text-gray-500 text-sm">
           {isUpdating 
             ? 'Revise os dados antes de atualizar o registro.' 
             : 'Coleta de assinaturas e finalização.'}
        </p>
      </div>

      <div className="w-full space-y-6">
        <SignaturePad 
          label="Assinatura do Vistoriador" 
          onSave={(sig) => updateData('inspectorSignature', sig)}
          initialData={data.inspectorSignature}
        />
        
        <SignaturePad 
          label="Assinatura do Responsável/Cliente" 
          onSave={(sig) => updateData('clientSignature', sig)}
          initialData={data.clientSignature}
        />
      </div>

      {!isComplete && (
         <div className="w-full bg-white text-black p-4 text-left text-sm border-2 border-black">
            <p className="font-bold mb-2 uppercase flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Pendências:
            </p>
            <ul className="list-square list-inside space-y-1 text-gray-600">
                {!data.contractNumber && <li>Número do contrato obrigatório</li>}
                {!data.plate && <li>Placa obrigatória</li>}
                {missingPhotos.length > 0 && <li>Faltam {missingPhotos.length} fotos obrigatórias</li>}
                {!hasSignatures && <li>Assinaturas obrigatórias</li>}
            </ul>
         </div>
      )}

      <div className="w-full space-y-4 pt-4">
        <button
          onClick={onSave}
          disabled={!isComplete}
          className={`w-full flex items-center justify-center py-4 text-lg font-bold uppercase tracking-wider transition-all border-2 ${
            isComplete 
              ? 'bg-black text-white border-black hover:bg-gray-800' 
              : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
          }`}
        >
          {isUpdating ? <RefreshCw className="w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />}
          {isUpdating ? 'Atualizar' : 'Salvar'}
        </button>

        <button
          onClick={onDiscard}
          className="w-full flex items-center justify-center py-4 bg-white border-2 border-black text-black text-lg font-bold uppercase tracking-wider hover:bg-gray-50 transition-colors"
        >
          <Trash className="w-5 h-5 mr-2" />
          {isUpdating ? 'Cancelar' : 'Descartar'}
        </button>
      </div>
    </div>
  );
};

export default TabSave;