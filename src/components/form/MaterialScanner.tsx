import React, { useState, useRef } from 'react';
import { Icons } from '../ui/Icons';
import { MATERIAUX_COMMUNS } from '../../utils/constants';
import { Material } from '../../types';

interface MaterialScannerProps {
  onMaterialDetected: (material: Partial<Material>) => void;
}

const MaterialScanner: React.FC<MaterialScannerProps> = ({ onMaterialDetected }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedMaterial, setDetectedMaterial] = useState<Material | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedItem, setEditedItem] = useState('');
  const [editedQty, setEditedQty] = useState('');
  const [editedUnit, setEditedUnit] = useState('unité');

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setDetectedMaterial(null);

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async ev => {
      const imageData = ev.target?.result as string;
      const base64Data = imageData.split(',')[1];
      const mediaType = file.type || 'image/jpeg';

      try {
        // Claude Vision API call via Netlify Functions
        const response = await fetch('/.netlify/functions/claude-vision', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-5-haiku-20241022', // Updated model name if needed
            max_tokens: 500,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'image',
                    source: { type: 'base64', media_type: mediaType, data: base64Data },
                  },
                  {
                    type: 'text',
                    text: `Analyse cette photo de matériel électrique. Identifie le matériel et estime la quantité visible.
                                    
Réponds UNIQUEMENT en JSON valide, sans markdown:
{"item": "nom du matériel électrique", "quantite": "nombre estimé", "unite": "unité|pi|m|rouleau|boîte", "confidence": 0.85}

Matériaux connus: ${MATERIAUX_COMMUNS.slice(0, 15).join(', ')}

Si tu ne reconnais pas de matériel électrique, réponds: {"item": "Non identifié", "quantite": "1", "unite": "unité", "confidence": 0.0}`,
                  },
                ],
              },
            ],
          }),
        });

        const data = await response.json();
        const text = data.content?.[0]?.text || '{}';
        const cleanJson = text.replace(/```json|```/g, '').trim();
        const detected = JSON.parse(cleanJson);
        detected.image = imageData;

        // Create a temporary Material object
        const newMaterial: Material = {
            id: 'temp',
            item: detected.item,
            quantite: detected.quantite,
            unite: detected.unite,
            confidence: detected.confidence,
            image: imageData,
            error: false
        };

        setDetectedMaterial(newMaterial);
        setEditedItem(detected.item);
        setEditedQty(detected.quantite);
        setEditedUnit(detected.unite);
      } catch (err: any) {
        console.error('Claude API error:', err);
        // Fallback to manual entry
        setDetectedMaterial({
          id: 'error',
          item: 'Erreur détection',
          quantite: '1',
          unite: 'unité',
          confidence: 0,
          image: imageData,
          error: true,
        });
        setEditedItem('');
        setEditedQty('1');
      }

      setIsAnalyzing(false);
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const confirmMaterial = () => {
    if (editedItem && editedQty) {
      onMaterialDetected({
        item: editedItem,
        quantite: editedQty,
        unite: editedUnit,
        detectedByAI: true,
        confidence: detectedMaterial?.confidence,
      });
      setDetectedMaterial(null);
      setEditMode(false);
      setEditedItem('');
      setEditedQty('');
    }
  };

  const cancelDetection = () => {
    setDetectedMaterial(null);
    setEditMode(false);
  };

  return (
    <div className='space-y-3'>
      {/* Scan Button */}
      {!detectedMaterial && !isAnalyzing && (
        <button
          type='button'
          onClick={() => inputRef.current?.click()}
          className='w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform'
        >
          {Icons.scan}
          📷 Scanner un matériel (IA)
        </button>
      )}

      {/* Analyzing State */}
      {isAnalyzing && (
        <div className='ai-analyzing rounded-xl p-4 text-center animate-slide-up bg-purple-500/10 border border-purple-500/30'>
          <div className='flex items-center justify-center gap-2 text-purple-400'>
            <svg className='animate-spin h-5 w-5' viewBox='0 0 24 24'>
              <circle
                className='opacity-25'
                cx='12'
                cy='12'
                r='10'
                stroke='currentColor'
                strokeWidth='4'
                fill='none'
              />
              <path
                className='opacity-75'
                fill='currentColor'
                d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
              />
            </svg>
            <span className='animate-pulse'>Claude analyse l&apos;image...</span>
          </div>
        </div>
      )}

      {/* Detection Result */}
      {detectedMaterial && (
        <div className='ai-analyzing rounded-xl p-4 animate-slide-up bg-purple-900/20 border border-purple-500/30'>
          <div className='flex items-start gap-3'>
            {detectedMaterial.image && (
                <img
                    src={detectedMaterial.image}
                    className='w-16 h-16 rounded-lg object-cover'
                    alt=''
                />
            )}
            <div className='flex-1'>
              <div className='flex items-center gap-2 mb-1'>
                <span className='text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full'>
                  🤖 Détecté {detectedMaterial.confidence ? Math.round(detectedMaterial.confidence * 100) : 0}%
                </span>
              </div>

              {editMode ? (
                <div className='space-y-2'>
                  <input
                    type='text'
                    value={editedItem}
                    onChange={e => setEditedItem(e.target.value)}
                    className='w-full px-3 py-2 rounded-lg text-sm bg-black/50 border border-white/20 text-white'
                    placeholder='Nom du matériel'
                    list='materials-list'
                  />
                  <datalist id='materials-list'>
                    {MATERIAUX_COMMUNS.map(m => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                  <div className='flex gap-2'>
                    <input
                      type='number'
                      value={editedQty}
                      onChange={e => setEditedQty(e.target.value)}
                      className='w-20 px-3 py-2 rounded-lg text-sm bg-black/50 border border-white/20 text-white'
                      placeholder='Qté'
                    />
                    <select
                      className='flex-1 px-3 py-2 rounded-lg text-sm bg-black/50 border border-white/20 text-white'
                      value={editedUnit}
                      onChange={e => setEditedUnit(e.target.value)}
                    >
                      <option>unité</option>
                      <option>pi</option>
                      <option>m</option>
                      <option>rouleau</option>
                      <option>boîte</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <p className='text-white font-medium'>{detectedMaterial.item}</p>
                  <p className='text-sm text-gray-400'>
                    Quantité: {detectedMaterial.quantite} {detectedMaterial.unite}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className='flex gap-2 mt-3'>
            {!editMode && (
              <button
                type='button'
                onClick={() => setEditMode(true)}
                className='flex-1 py-2 bg-white/10 rounded-lg text-white text-sm flex items-center justify-center gap-1 hover:bg-white/20'
              >
                {Icons.edit} Modifier
              </button>
            )}
            <button
              type='button'
              onClick={confirmMaterial}
              className='flex-1 py-2 bg-green-600 rounded-lg text-white text-sm font-medium hover:bg-green-500'
            >
              ✓ Ajouter
            </button>
            <button
              type='button'
              onClick={cancelDetection}
              className='py-2 px-4 bg-red-600/20 rounded-lg text-red-400 text-sm hover:bg-red-600/30'
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type='file'
        accept='image/*'
        capture='environment'
        onChange={handleCapture}
        className='hidden'
      />
    </div>
  );
};

export default MaterialScanner;
