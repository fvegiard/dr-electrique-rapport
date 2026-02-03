import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './ui/Icons';
import Header from './ui/Header';
import Section from './ui/Section';
import TimePicker from './form/TimePicker';
import DynamicRows from './form/DynamicRows';
import PhotoUploadGPS from './form/PhotoUploadGPS';
import MaterialScanner from './form/MaterialScanner';
import { supabase } from '../services/supabase';
import { EMPLOYES, WORKERS_NAMES, PROJETS, MATERIAUX_COMMUNS, LOCAL_STORAGE_KEY } from '../utils/constants';
import { DailyReport, Material, Photo } from '../types';
import { uploadPhotosWithRetry } from '../lib/photoTransaction';

const RapportForm: React.FC = () => {
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

  const [step, setStep] = useState<'form' | 'submitting' | 'success' | 'offline'>('form');
  
  const [data, setData] = useState<DailyReport>({
    projet: 'PRJ-001',
    date: getTodayStr(),
    adresse: '1500 Atwater, Montréal, QC H3Z 1X5',
    meteo: '',
    temperature: '',
    redacteur: 'Maxime Robert',
    mainOeuvre: [
      {
        id: generateId(),
        employe: '',
        heureDebut: '06:00',
        heureFin: '14:15',
        description: '',
      },
    ],
    materiaux: [
      { id: generateId(), item: '', quantite: '', unite: 'unité', detectedByAI: false },
    ],
    equipements: [{ id: generateId(), nom: '', heures: '', description: '' }],
    soustraitants: [
      { id: generateId(), entreprise: '', nbPersonnes: '', heures: '', description: '' },
    ],
    ordresTravail: [
      {
        id: generateId(),
        description: '',
        isExtra: false,
        montantExtra: '',
        status: 'en_cours',
      },
    ],
    reunions: [{ id: generateId(), type: '', participants: '', notes: '' }],
    photosGenerales: [],
    photosAvant: [],
    photosApres: [],
    photosProblemes: [],
    evenements: '',
    problemesSecurite: '',
    notesGenerales: '',
  });

  // ============== FIX STALE CLOSURE: useRef pour photos ==============
  // Ces refs maintiennent toujours la valeur la plus récente des photos
  // pour éviter le problème de "stale closure" lors du submit
  const photosGeneralesRef = useRef<Photo[]>([]);
  const photosAvantRef = useRef<Photo[]>([]);
  const photosApresRef = useRef<Photo[]>([]);
  const photosProblemeRef = useRef<Photo[]>([]);

  // Synchroniser les refs avec le state à chaque mise à jour
  useEffect(() => {
    photosGeneralesRef.current = data.photosGenerales || [];
    console.log('[Ref Sync] photosGenerales:', photosGeneralesRef.current.length);
  }, [data.photosGenerales]);

  useEffect(() => {
    photosAvantRef.current = data.photosAvant || [];
    console.log('[Ref Sync] photosAvant:', photosAvantRef.current.length);
  }, [data.photosAvant]);

  useEffect(() => {
    photosApresRef.current = data.photosApres || [];
    console.log('[Ref Sync] photosApres:', photosApresRef.current.length);
  }, [data.photosApres]);

  useEffect(() => {
    photosProblemeRef.current = data.photosProblemes || [];
    console.log('[Ref Sync] photosProblemes:', photosProblemeRef.current.length);
  }, [data.photosProblemes]);
  // ============== FIN FIX STALE CLOSURE ==============

  const update = <K extends keyof DailyReport>(key: K, val: DailyReport[K]) => setData(prev => ({ ...prev, [key]: val }));

  // Helper to calculate hours
  const calculateHours = (debut: string, fin: string) => {
    if (!debut || !fin) return 0;
    const [h1, m1] = debut.split(':').map(Number);
    const [h2, m2] = fin.split(':').map(Number);
    const start = h1 + m1 / 60;
    const end = h2 + m2 / 60;
    return Math.max(0, end - start);
  };

  const handleMaterialDetected = (material: Partial<Material>) => {
    const newMaterial: Material = {
      id: generateId(),
      item: material.item || '',
      quantite: material.quantite || '1',
      unite: material.unite || 'unité',
      detectedByAI: true,
      confidence: material.confidence,
      ...material
    };
    update('materiaux', [...(data.materiaux || []), newMaterial]);
  };

  const savePendingRapport = (rapport: DailyReport) => {
    const pending = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    pending.push(rapport);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pending));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!data.redacteur) {
      alert('Sélectionne ton nom!');
      return;
    }
    if (!data.projet) {
      alert('Sélectionne le projet!');
      return;
    }

    setStep('submitting');

    // ============== FIX BUG HEURES: Condition corrigée ==============
    // AVANT: if (!m.employe && !m.heureDebut) - skip si PAS d'employé ET PAS d'heure
    // APRÈS: if (!m.heureDebut || !m.heureFin) - skip seulement si heures manquantes
    const totalHeuresMO = (data.mainOeuvre || []).reduce((acc, m) => {
      // Ne calculer que si on a les heures de début ET fin
      if (!m.heureDebut || !m.heureFin) return acc;
      return acc + calculateHours(m.heureDebut, m.heureFin);
    }, 0);
    // ============== FIN FIX BUG HEURES ==============

    // ============== UTILISER LES REFS AU LIEU DU STATE ==============
    // Les refs contiennent toujours la valeur la plus récente (pas de stale closure)
    const currentPhotosGenerales = photosGeneralesRef.current;
    const currentPhotosAvant = photosAvantRef.current;
    const currentPhotosApres = photosApresRef.current;
    const currentPhotosProblemes = photosProblemeRef.current;

    // DEBUG: Log photos from REFS (should always be current)
    console.log('[Submit] Photos from REFS:', {
      generales: currentPhotosGenerales.length,
      avant: currentPhotosAvant.length,
      apres: currentPhotosApres.length,
      problemes: currentPhotosProblemes.length,
      sampleGeneral: currentPhotosGenerales[0]
    });

    // Build rapport object - USING REFS FOR PHOTOS
    const rapportForSubmit = {
      date: data.date,
      redacteur: data.redacteur,
      projet: data.projet,
      projet_nom: data.projetNom || null,
      adresse: data.adresse || null,
      meteo: data.meteo || null,
      temperature: data.temperature ? Number(data.temperature) : null,

      main_oeuvre: data.mainOeuvre || [],
      materiaux: data.materiaux || [],
      equipements: data.equipements || [],
      ordres_travail: data.ordresTravail || [],
      reunions: data.reunions || [],

      notes_generales: data.notesGenerales || null,
      problemes_securite: data.problemesSecurite || null,

      total_heures_mo: totalHeuresMO,
      // Calculer total_photos depuis les REFS
      total_photos:
        currentPhotosGenerales.length +
        currentPhotosAvant.length +
        currentPhotosApres.length +
        currentPhotosProblemes.length,
      has_extras: (data.ordresTravail || []).some(o => o.isExtra),
      total_extras: (data.ordresTravail || [])
        .filter(o => o.isExtra)
        .reduce((acc, o) => acc + (parseFloat(o.montantExtra) || 0), 0),

    };

    // DEBUG: Log final payload
    console.log('[Submit] Rapport payload:', {
      total_heures_mo: rapportForSubmit.total_heures_mo,
      total_photos: rapportForSubmit.total_photos
    });

    try {
      const { data: result, error } = await supabase
        .from('rapports')
        .insert([rapportForSubmit])
        .select();

      if (error) {
        console.error('[Submit] Supabase error:', error);
        throw error;
      }

      console.log('[Submit] Rapport saved:', result?.[0]?.id);

      const rapportId = result?.[0]?.id;
      if (rapportId) {
        // Utiliser les REFS pour les photos aussi ici
        const photoGroups = [
          { category: 'GENERAL', items: currentPhotosGenerales },
          { category: 'AVANT', items: currentPhotosAvant },
          { category: 'APRES', items: currentPhotosApres },
          { category: 'PROBLEME', items: currentPhotosProblemes },
        ];

        const hasPhotos = photoGroups.some(g => g.items.length > 0);

        if (hasPhotos) {
          const photoResult = await uploadPhotosWithRetry(photoGroups, rapportId, supabase);

          if (photoResult.success) {
            console.log(`[Submit] ${photoResult.insertedCount} photos inserted to photos table`);
          } else {
            console.error('[Submit] Photo insert to table failed:', photoResult.errors);
          }
        }
      }

      setStep('success');

    } catch (error: unknown) {
      console.error('[Submit] Error:', error);
      savePendingRapport({ ...data, errorMsg: error instanceof Error ? error.message : String(error) });
      setStep('offline');
    }
  };

  const resetForm = () => {
    // Basic reset, keeping some defaults
    setData(prev => ({
      ...prev,
      mainOeuvre: [{ id: generateId(), employe: '', heureDebut: '06:00', heureFin: '14:15', description: '' }],
      materiaux: [{ id: generateId(), item: '', quantite: '', unite: 'unité' }],
      photosGenerales: [],
      photosAvant: [],
      photosApres: [],
      photosProblemes: [],
      notesGenerales: '',
      problemesSecurite: '',
    }));
    setStep('form');
  };

  // SUCCESS SCREEN
  if (step === 'success') {
    return (
      <div className='min-h-screen flex items-center justify-center p-6 bg-black'>
        <div className='glass rounded-3xl p-8 text-center max-w-sm w-full animate-slide-up'>
          <div className='w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-500/30'>
            {Icons.check}
          </div>
          <h2 className='font-bebas text-3xl text-white mb-2'>RAPPORT ENVOYÉ!</h2>
          <p className='text-gray-400 mb-1'>Merci {data.redacteur?.split(' ')[0]}!</p>
          <button
            type='button'
            onClick={resetForm}
            className='w-full py-4 bg-[#E63946] text-white font-bebas text-lg tracking-wide rounded-xl active:scale-[0.98] transition-transform mt-8'
          >
            NOUVEAU RAPPORT
          </button>
        </div>
      </div>
    );
  }

  // OFFLINE SCREEN
  if (step === 'offline') {
    return (
      <div className='min-h-screen flex items-center justify-center p-6 bg-black'>
        <div className='glass rounded-3xl p-8 text-center max-w-sm w-full animate-slide-up'>
          <div className='w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-yellow-500/30'>
            {Icons.alert}
          </div>
          <h2 className='font-bebas text-3xl text-white mb-2'>SAUVEGARDÉ LOCALEMENT</h2>
          <p className='text-yellow-400 mb-1'>Connexion échouée</p>
          <button
            type='button'
            onClick={resetForm}
            className='w-full py-4 bg-yellow-600 text-white font-bebas text-lg tracking-wide rounded-xl active:scale-[0.98] transition-transform mt-8'
          >
            NOUVEAU RAPPORT
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32">
      <Header />
      
      <form onSubmit={handleSubmit} className='max-w-2xl mx-auto p-4 space-y-4'>
        {/* EN-TÊTE */}
        <div className='glass rounded-2xl p-4 space-y-4 animate-slide-up'>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='text-[11px] text-gray-500 mb-1.5 block font-medium'>PROJET *</label>
              <select
                value={data.projet}
                onChange={e => update('projet', e.target.value)}
                className='w-full px-3 py-3 rounded-xl bg-black/40 border border-white/10 text-white'
                required
              >
                <option value=''>Sélectionner...</option>
                {PROJETS.map(p => (
                  <option key={p.id} value={p.id}>{p.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className='text-[11px] text-gray-500 mb-1.5 block font-medium'>DATE *</label>
              <input
                type='date'
                value={data.date}
                onChange={e => update('date', e.target.value)}
                className='w-full px-3 py-3 rounded-xl bg-black/40 border border-white/10 text-white'
                required
              />
            </div>
          </div>

          <div>
            <label className='text-[11px] text-gray-500 mb-1.5 block font-medium'>ADRESSE CHANTIER</label>
            <input
              type='text'
              value={data.adresse}
              onChange={e => update('adresse', e.target.value)}
              placeholder='123 rue Exemple, Montréal'
              className='w-full px-3 py-3 rounded-xl bg-black/40 border border-white/10 text-white'
            />
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='text-[11px] text-gray-500 mb-2 block font-medium'>MÉTÉO</label>
              <div className='grid grid-cols-4 gap-2'>
                {[
                  { k: 'soleil', i: Icons.sun },
                  { k: 'nuageux', i: Icons.cloud },
                  { k: 'pluie', i: Icons.rain },
                  { k: 'neige', i: Icons.snow },
                ].map(m => (
                  <button
                    key={m.k}
                    type='button'
                    onClick={() => update('meteo', m.k)}
                    className={`p-2 rounded-xl border-2 transition-all active:scale-95 flex items-center justify-center ${
                      data.meteo === m.k
                        ? 'border-[#E63946] bg-[#E63946]/10 text-[#E63946]'
                        : 'border-transparent bg-black/30 text-gray-500'
                    }`}
                  >
                    {m.i}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className='text-[11px] text-gray-500 mb-1.5 block font-medium'>TEMP. (°C)</label>
              <input
                type='number'
                inputMode='decimal'
                value={data.temperature}
                onChange={e => update('temperature', e.target.value)}
                placeholder='-5'
                className='w-full px-3 py-3 rounded-xl bg-black/40 border border-white/10 text-white'
              />
            </div>
          </div>

          <div>
            <label className='text-[11px] text-gray-500 mb-1.5 block font-medium'>TON NOM *</label>
            <select
              value={data.redacteur}
              onChange={e => update('redacteur', e.target.value)}
              className='w-full px-3 py-3 rounded-xl bg-black/40 border border-white/10 text-white'
              required
            >
              <option value=''>Qui es-tu?</option>
              {EMPLOYES.map(e => (
                <option key={e.id} value={e.nom}>{e.nom} ({e.role})</option>
              ))}
            </select>
          </div>
        </div>

        {/* MAIN D'OEUVRE */}
        <Section icon={Icons.clock} title="TEMPS - MAIN D'OEUVRE" subtitle='Heures début/fin' color='#E63946'>
          <div className='space-y-4'>
            {(data.mainOeuvre || []).map((row, idx) => (
              <div key={row.id} className='bg-black/20 rounded-xl p-3 space-y-3 animate-slide-up'>
                <div className='flex items-center justify-between'>
                  <select
                    value={row.employe}
                    onChange={e => {
                      const updated = [...(data.mainOeuvre || [])];
                      updated[idx].employe = e.target.value;
                      update('mainOeuvre', updated);
                    }}
                    className='flex-1 px-3 py-3 rounded-xl mr-2 bg-black/40 border border-white/10 text-white'
                  >
                    <option value=''>Sélectionner employé</option>
                    {WORKERS_NAMES.map((w, i) => (
                      <option key={i} value={w}>{w}</option>
                    ))}
                  </select>
                  <button
                    type='button'
                    onClick={() => {
                      if ((data.mainOeuvre || []).length > 1) {
                        update('mainOeuvre', (data.mainOeuvre || []).filter(r => r.id !== row.id));
                      }
                    }}
                    className='p-2 text-gray-600 hover:text-red-500'
                  >
                    {Icons.trash}
                  </button>
                </div>

                <div className='flex items-center justify-around gap-4'>
                  <TimePicker
                    value={row.heureDebut}
                    onChange={val => {
                      const updated = [...(data.mainOeuvre || [])];
                      updated[idx].heureDebut = val;
                      update('mainOeuvre', updated);
                    }}
                    label='DÉBUT'
                  />
                  <div className='text-gray-600 text-2xl'>→</div>
                  <TimePicker
                    value={row.heureFin}
                    onChange={val => {
                      const updated = [...(data.mainOeuvre || [])];
                      updated[idx].heureFin = val;
                      update('mainOeuvre', updated);
                    }}
                    label='FIN'
                  />
                </div>
              </div>
            ))}
            <button
              type='button'
              onClick={() => update('mainOeuvre', [...(data.mainOeuvre || []), { id: generateId(), employe: '', heureDebut: '06:00', heureFin: '14:15', description: '' }])}
              className='w-full py-3 border-2 border-dashed border-[#E63946]/40 rounded-xl text-[#E63946] flex items-center justify-center gap-2 text-sm font-medium transition-all active:scale-[0.98]'
            >
              {Icons.plus} Ajouter employé
            </button>
          </div>
        </Section>

        {/* MATÉRIAUX */}
        <Section icon={Icons.box} title='MATÉRIAUX UTILISÉS' subtitle='Scanner IA ou manuel' color='#E63946'>
          <div className='space-y-4'>
            <MaterialScanner onMaterialDetected={handleMaterialDetected} />
            <div className='border-t border-white/10 pt-4'>
              <DynamicRows
                rows={data.materiaux}
                setRows={rows => update('materiaux', rows)}
                fields={[
                  { key: 'item', placeholder: 'Matériau', type: 'datalist', options: MATERIAUX_COMMUNS, width: '1fr' },
                  { key: 'quantite', placeholder: 'Qté', type: 'number', width: '65px' },
                  { key: 'unite', placeholder: 'Unit', type: 'select', options: ['unité', 'pi', 'm', 'rouleau', 'boîte'], width: '80px' },
                ]}
                addLabel='Ajouter matériau'
                color='#E63946'
              />
            </div>
          </div>
        </Section>

        {/* PHOTOS */}
        <Section icon={Icons.camera} title='PHOTOS CHANTIER' subtitle='Avec géolocalisation' color='#E63946'>
          <div className='space-y-6'>
            <PhotoUploadGPS
              photos={data.photosGenerales}
              setPhotos={val => {
                if (typeof val === 'function') {
                  setData(prev => ({ ...prev, photosGenerales: val(prev.photosGenerales || []) }));
                } else {
                  update('photosGenerales', val);
                }
              }}
              label='GÉNÉRALES'
              category='general'
              projectId={data.projet}
              supabase={supabase}
            />
            <PhotoUploadGPS
              photos={data.photosAvant}
              setPhotos={val => {
                if (typeof val === 'function') {
                  setData(prev => ({ ...prev, photosAvant: val(prev.photosAvant || []) }));
                } else {
                  update('photosAvant', val);
                }
              }}
              label='AVANT'
              category='avant'
              projectId={data.projet}
              supabase={supabase}
              accent='#E63946'
            />
            <PhotoUploadGPS
              photos={data.photosApres}
              setPhotos={val => {
                if (typeof val === 'function') {
                  setData(prev => ({ ...prev, photosApres: val(prev.photosApres || []) }));
                } else {
                  update('photosApres', val);
                }
              }}
              label='APRÈS'
              category='apres'
              projectId={data.projet}
              supabase={supabase}
              accent='#E63946'
            />
             <PhotoUploadGPS
              photos={data.photosProblemes}
              setPhotos={val => {
                if (typeof val === 'function') {
                  setData(prev => ({ ...prev, photosProblemes: val(prev.photosProblemes || []) }));
                } else {
                  update('photosProblemes', val);
                }
              }}
              label='PROBLÈMES'
              category='problemes'
              projectId={data.projet}
              supabase={supabase}
              accent='#ef4444'
            />
          </div>
        </Section>
        
        {/* SUBMIT BUTTON */}
        <button
          type='submit'
          disabled={step === 'submitting'}
          className='w-full py-4 bg-[#E63946] text-white font-bebas text-2xl tracking-wide rounded-xl shadow-lg shadow-red-600/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 animate-pulse-btn'
        >
          {step === 'submitting' ? 'ENVOI EN COURS...' : 'ENVOYER LE RAPPORT'}
        </button>
      </form>
    </div>
  );
};

export default RapportForm;
