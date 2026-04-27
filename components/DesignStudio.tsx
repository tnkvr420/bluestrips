
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback } from 'react';
import { defaultDesigns } from '../wardrobe';
import { DesignElement } from '../types';
import { UploadCloudIcon } from './icons';

interface DesignStudioProps {
  isLoading: boolean;
}

const DesignStudio: React.FC<DesignStudioProps> = ({ isLoading }) => {
  const [userDesigns, setUserDesigns] = useState<DesignElement[]>([]);

  const handleDragStart = (e: React.DragEvent, design: DesignElement) => {
    e.dataTransfer.setData('designId', design.id);
    e.dataTransfer.setData('designUrl', design.url);
    e.dataTransfer.setData('designName', design.name);
  };

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const newDesign: DesignElement = {
        id: `user-design-${Date.now()}`,
        name: file.name,
        url: url,
      };
      setUserDesigns(prev => [...prev, newDesign]);
    };
    reader.readAsDataURL(file);
  }, []);

  const allDesigns = [...defaultDesigns, ...userDesigns];

  return (
    <div className="pt-6 border-t border-gray-400/50">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-serif tracking-wider text-gray-800 flex items-center gap-2">
          Design Studio
          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-sans uppercase font-bold tracking-tighter">Drag to Apply</span>
        </h2>
        <label className="cursor-pointer bg-gray-100 p-2 rounded-full hover:bg-gray-200" title="Upload Logo">
          <UploadCloudIcon className="w-5 h-5 text-gray-700" />
          <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
        </label>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {allDesigns.map((design) => (
          <div
            key={design.id}
            draggable={!isLoading}
            onDragStart={(e) => handleDragStart(e, design)}
            className={`aspect-square p-2 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center transition-all cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:bg-indigo-50/30 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={design.name}
          >
            <img src={design.url} alt={design.name} className="w-8 h-8 opacity-70 group-hover:opacity-100" />
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-400 mt-2 italic">Drag an icon or uploaded logo onto the model's shirt to print it.</p>
    </div>
  );
};

export default DesignStudio;
