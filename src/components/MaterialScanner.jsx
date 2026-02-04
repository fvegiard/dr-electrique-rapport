import React, { useRef, useState } from 'react'
import { Icons } from '../utils/Icons'
import { MATERIAUX_COMMUNS } from '../utils/constants'

export const MaterialScanner = ({ onMaterialDetected }) => {
    const inputRef = useRef()
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [detectedMaterial, setDetectedMaterial] = useState(null)
    const [editMode, setEditMode] = useState(false)
    const [editedItem, setEditedItem] = useState('')
    const [editedQty, setEditedQty] = useState('')

    const handleCapture = async e => {
        const file = e.target.files[0]
        if (!file) return

        setIsAnalyzing(true)
        setDetectedMaterial(null)

        // Convert to base64
        const reader = new FileReader()
        reader.onload = async ev => {
            const imageData = ev.target.result
            const base64Data = imageData.split(',')[1]
            const mediaType = file.type || 'image/jpeg'

            try {
                // Claude Vision API call - REQUIRES BACKEND PROXY FOR PRODUCTION
                // WARNING: API keys should NEVER be exposed in client-side code
                // Set up a serverless function (Netlify Functions) to proxy API calls
                const response = await fetch('/.netlify/functions/claude-vision', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'claude-sonnet-4-20250514',
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
                })

                const data = await response.json()
                const text = data.content?.[0]?.text || '{}'
                const cleanJson = text.replace(/```json|```/g, '').trim()
                const detected = JSON.parse(cleanJson)
                detected.image = imageData

                setDetectedMaterial(detected)
                setEditedItem(detected.item)
                setEditedQty(detected.quantite)
            } catch (err) {
                console.error('Claude API error:', err)
                // Fallback to manual entry
                setDetectedMaterial({
                    item: 'Erreur détection',
                    quantite: '1',
                    unite: 'unité',
                    confidence: 0,
                    image: imageData,
                    error: true,
                })
                setEditedItem('')
                setEditedQty('1')
            }

            setIsAnalyzing(false)
        }
        reader.readAsDataURL(file)
        e.target.value = ''
    }

    const confirmMaterial = () => {
        if (editedItem && editedQty) {
            onMaterialDetected({
                item: editedItem,
                quantite: editedQty,
                unite: detectedMaterial?.unite || 'unité',
                detectedByAI: true,
                confidence: detectedMaterial?.confidence,
            })
            setDetectedMaterial(null)
            setEditMode(false)
            setEditedItem('')
            setEditedQty('')
        }
    }

    const cancelDetection = () => {
        setDetectedMaterial(null)
        setEditMode(false)
    }

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
                <div className='ai-analyzing rounded-xl p-4 text-center animate-slide-up'>
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
                        <span className='animate-analyzing'>Claude analyse l'image...</span>
                    </div>
                </div>
            )}

            {/* Detection Result */}
            {detectedMaterial && (
                <div className='ai-analyzing rounded-xl p-4 animate-slide-up'>
                    <div className='flex items-start gap-3'>
                        <img
                            src={detectedMaterial.image}
                            className='w-16 h-16 rounded-lg object-cover'
                            alt=''
                        />
                        <div className='flex-1'>
                            <div className='flex items-center gap-2 mb-1'>
                                <span className='text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full'>
                                    🤖 Détecté {Math.round(detectedMaterial.confidence * 100)}%
                                </span>
                            </div>

                            {editMode ? (
                                <div className='space-y-2'>
                                    <input
                                        type='text'
                                        value={editedItem}
                                        onChange={e => setEditedItem(e.target.value)}
                                        className='w-full px-3 py-2 rounded-lg text-sm'
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
                                            className='w-20 px-3 py-2 rounded-lg text-sm'
                                            placeholder='Qté'
                                        />
                                        <select
                                            className='flex-1 px-3 py-2 rounded-lg text-sm'
                                            defaultValue={detectedMaterial.unite}
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
                                className='flex-1 py-2 bg-white/10 rounded-lg text-white text-sm flex items-center justify-center gap-1'
                            >
                                {Icons.edit} Modifier
                            </button>
                        )}
                        <button
                            type='button'
                            onClick={confirmMaterial}
                            className='flex-1 py-2 bg-green-600 rounded-lg text-white text-sm font-medium'
                        >
                            ✓ Ajouter
                        </button>
                        <button
                            type='button'
                            onClick={cancelDetection}
                            className='py-2 px-4 bg-red-600/20 rounded-lg text-red-400 text-sm'
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
    )
}
