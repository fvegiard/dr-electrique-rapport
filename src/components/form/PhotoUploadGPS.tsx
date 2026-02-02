import React, { useRef, useState } from 'react';
import { Icons } from '../ui/Icons';
import { useGeoLocation } from '../../hooks/useGeoLocation';
import { processPhoto } from '../../utils/photoUtils';
import { Photo } from '../../types';
import { SupabaseClient } from '@supabase/supabase-js';

interface PhotoUploadGPSProps {
  photos: Photo[];
  setPhotos: (photos: Photo[] | ((prev: Photo[]) => Photo[])) => void;
  label: string;
  accent?: string;
  category: string;
  projectId: string;
  supabase: SupabaseClient;
}

const PhotoUploadGPS: React.FC<PhotoUploadGPSProps> = ({ 
  photos, 
  setPhotos, 
  label, 
  accent = '#22c55e', 
  category, 
  projectId,
  supabase
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [gpsStatus, setGpsStatus] = useState<'fetching' | 'success' | 'disabled' | null>(null);
  const { getGeoLocation } = useGeoLocation();

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Get GPS location first
    setGpsStatus('fetching');
    const geo = await getGeoLocation();
    setGpsStatus(geo.enabled ? 'success' : 'disabled');

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Photo trop grosse (max 10MB avant compression)');
        continue;
      }

      try {
        const processed = await processPhoto(
          file,
          geo,
          category,
          projectId || 'DEFAULT',
          supabase
        );

        const newPhoto: Photo = {
          id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
          data: processed.data || undefined,
          preview: processed.preview,
          storagePath: processed.storagePath || undefined,
          storageUrl: processed.storageUrl || undefined,
          timestamp: new Date().toISOString(),
          category: category,
          filename: file.name,
          geolocation: {
            latitude: geo.latitude,
            longitude: geo.longitude,
            accuracy: geo.accuracy,
            enabled: geo.enabled,
          },
          metadata: processed.metadata
        };
        
        setPhotos(prev => [...prev, newPhoto]);
        
        // Show compression feedback
        if (processed.metadata) {
          console.log(`[Photo] ${file.name}: ${processed.metadata.compressionRatio}% compressé`);
        }
      } catch (err: unknown) {
        console.error('[Photo] Processing error:', err);
        alert('Erreur traitement photo: ' + (err instanceof Error ? err.message : String(err)));
      }
    }
    
    if (e.target) e.target.value = '';

    // Reset GPS status after 3 seconds
    setTimeout(() => setGpsStatus(null), 3000);
  };

  return (
    <div className='space-y-2'>
      <div className='grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2'>
        {(Array.isArray(photos) ? photos : []).map(photo => (
          <div key={photo.id} className='relative group'>
            <img
              src={photo.preview || photo.data}
              className='aspect-square object-cover rounded-[10px] w-full border border-white/10'
              alt=''
              loading='lazy'
            />
            {photo.geolocation?.enabled && (
              <div className='absolute bottom-1 left-1 bg-green-500/20 text-[#22c55e] border border-green-500/30 text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-1'>
                {Icons.location} GPS
              </div>
            )}
            {photo.storageUrl && (
              <div className='absolute top-1 left-1 text-[8px] bg-blue-500/80 text-white px-1 rounded'>☁️</div>
            )}
            {photo.metadata?.compressedSize && (
              <div className='absolute top-1 right-6 text-[8px] bg-black/60 text-white px-1 rounded'>
                {(photo.metadata.compressedSize / 1024).toFixed(0)}KB
              </div>
            )}
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setPhotos((prev: Photo[]) => prev.filter(p => p.id !== photo.id));
              }}
              className='absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg'
            >
              ×
            </button>
          </div>
        ))}
        <button
          type='button'
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
  );
};

export default PhotoUploadGPS;
