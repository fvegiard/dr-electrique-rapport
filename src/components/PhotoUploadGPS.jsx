import React, { useRef, useState } from 'react'
import { Icons } from '../utils/Icons'

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9)

const getGeoLocation = () => {
    return new Promise(resolve => {
        if (!navigator.geolocation) {
            resolve({ latitude: null, longitude: null, enabled: false, error: 'Non supporté' })
            return
        }
        navigator.geolocation.getCurrentPosition(
            position => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    enabled: true,
                })
            },
            error => {
                resolve({ latitude: null, longitude: null, enabled: false, error: error.message })
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        )
    })
}

export const PhotoUploadGPS = ({ photos, setPhotos, label, accent = '#22c55e', category }) => {
    const inputRef = useRef()
    const [gpsStatus, setGpsStatus] = useState(null)

    const handleFiles = async e => {
        const files = Array.from(e.target.files)

        // Get GPS location first
        setGpsStatus('fetching')
        const geo = await getGeoLocation()
        setGpsStatus(geo.enabled ? 'success' : 'disabled')

        for (const file of files) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Photo trop grosse (max 5MB)')
                continue
            }

            const reader = new FileReader()
            reader.onload = ev => {
                const newPhoto = {
                    id: generateId(),
                    data: ev.target.result,
                    timestamp: new Date().toISOString(),
                    category: category,
                    geolocation: {
                        latitude: geo.latitude,
                        longitude: geo.longitude,
                        accuracy: geo.accuracy,
                        enabled: geo.enabled,
                    },
                }
                setPhotos(prev => [...prev, newPhoto])
            }
            reader.readAsDataURL(file)
        }
        e.target.value = ''

        // Reset GPS status after 3 seconds
        setTimeout(() => setGpsStatus(null), 3000)
    }

    return (
        <div className='space-y-2'>
            <div className='photo-grid'>
                {photos.map(photo => (
                    <div key={photo.id} className='relative group'>
                        <img
                            src={photo.data}
                            className='photo-item w-full border border-white/10'
                            alt=''
                        />
                        {photo.geolocation?.enabled && (
                            <div className='absolute bottom-1 left-1 gps-badge flex items-center gap-1'>
                                {Icons.location} GPS
                            </div>
                        )}
                        <button
                            onClick={() => setPhotos(prev => prev.filter(p => p.id !== photo.id))}
                            className='absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg'
                        >
                            ×
                        </button>
                    </div>
                ))}
                <button
                    onClick={() => inputRef.current?.click()}
                    className='aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all active:scale-95'
                    style={{ borderColor: `${accent}50`, color: accent }}
                >
                    {Icons.camera}
                    <span className='text-[9px] mt-1 font-medium'>{label}</span>
                    {gpsStatus === 'fetching' && (
                        <span className='text-[8px] text-blue-400 mt-0.5'>📍...</span>
                    )}
                    {gpsStatus === 'success' && (
                        <span className='text-[8px] text-green-400 mt-0.5'>📍 OK</span>
                    )}
                </button>
            </div>
            <input
                ref={inputRef}
                type='file'
                accept='image/*'
                capture='environment'
                multiple
                onChange={handleFiles}
                className='hidden'
            />
        </div>
    )
}
