import { useState, useCallback } from 'react';
import { GeoLocation } from '../types';

export const useGeoLocation = () => {
  const [geo, setGeo] = useState<GeoLocation>({
    latitude: null,
    longitude: null,
    accuracy: null,
    enabled: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getGeoLocation = useCallback((): Promise<GeoLocation> => {
    setLoading(true);
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        const result = { latitude: null, longitude: null, accuracy: null, enabled: false, error: 'Non supporté' };
        setGeo(result);
        setLoading(false);
        setError('GPS non supporté par ce navigateur');
        resolve(result);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const result = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            enabled: true,
          };
          setGeo(result);
          setLoading(false);
          setError(null);
          resolve(result);
        },
        (err) => {
          const result = { latitude: null, longitude: null, accuracy: null, enabled: false, error: err.message };
          setGeo(result);
          setLoading(false);
          setError(err.message);
          resolve(result);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }, []);

  return { geo, loading, error, getGeoLocation };
};
