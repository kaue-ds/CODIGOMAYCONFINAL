import React from 'react';
import { InspectionData, MANDATORY_PHOTOS, PhotoType } from '../types';
import { Camera, Trash2, CheckCircle } from 'lucide-react';

interface Props {
  data: InspectionData;
  updateNestedData: (parent: keyof InspectionData, key: string, value: any) => void;
}

const TabPhotos: React.FC<Props> = ({ data, updateNestedData }) => {
  
  const handlePhotoUpload = (photoType: PhotoType, event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        updateNestedData('photos', photoType, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (photoType: PhotoType) => {
    updateNestedData('photos', photoType, undefined);
  };

  const completedPhotos = MANDATORY_PHOTOS.filter(p => data.photos[p]).length;

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="flex justify-between items-end border-b border-black pb-2">
         <h2 className="text-xl font-bold text-black uppercase tracking-wide">Fotos</h2>
         <span className={`text-sm font-bold px-3 py-1 ${completedPhotos === 8 ? 'bg-black text-white' : 'bg-gray-200 text-black'}`}>
            {completedPhotos} / 8
         </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {MANDATORY_PHOTOS.map((photoType) => {
          const hasPhoto = !!data.photos[photoType];
          
          return (
            <div key={photoType} className="bg-white border border-gray-300 flex flex-col h-48 relative group">
              <div className="relative flex-1 bg-gray-50 flex items-center justify-center overflow-hidden">
                {hasPhoto ? (
                  <>
                    <img 
                      src={data.photos[photoType]} 
                      alt={photoType} 
                      className="w-full h-full object-cover grayscale" // Optional: grayscale the photo preview for the theme
                    />
                    <div className="absolute top-2 right-2 bg-black text-white rounded-full p-1 shadow-lg">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  </>
                ) : (
                  <Camera className="w-8 h-8 text-gray-300" />
                )}
              </div>
              
              <div className="p-2 border-t border-gray-200 bg-white">
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-2 truncate" title={photoType}>
                  {photoType}
                </p>
                
                <div className="flex gap-2">
                  <label className={`flex-1 flex items-center justify-center p-2 cursor-pointer transition-colors border ${hasPhoto ? 'bg-white border-gray-300 text-gray-400' : 'bg-black border-black text-white hover:bg-gray-800'}`}>
                    <Camera className="w-4 h-4" />
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      className="hidden" 
                      onChange={(e) => handlePhotoUpload(photoType, e)}
                    />
                  </label>
                  
                  {hasPhoto && (
                    <button 
                      onClick={() => removePhoto(photoType)}
                      className="p-2 bg-white border border-gray-300 text-black hover:bg-gray-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="p-4 border border-black bg-gray-50 text-sm text-black">
        <p className="flex items-center gap-2">
            <span className="font-bold uppercase">Nota:</span> 
            Para a foto do Painel, certifique-se de LIGAR MEIA CHAVE.
        </p>
      </div>
    </div>
  );
};

export default TabPhotos;