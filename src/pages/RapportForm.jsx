import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient'
import { Icons } from '../utils/Icons'
import { EMPLOYES, WORKERS, PROJETS, MATERIAUX_COMMUNS } from '../utils/constants'
import { Header } from '../components/Header'
import { Section } from '../components/Section'
import { TimePicker } from '../components/TimePicker'
import { PhotoUploadGPS } from '../components/PhotoUploadGPS'
import { MaterialScanner } from '../components/MaterialScanner'
import { DynamicRows } from '../components/DynamicRows'
import './RapportForm.css'

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
const getTodayStr = () => new Date().toISOString().split('T')[0]

const LOCAL_STORAGE_KEY = 'dr_rapports_pending'

const savePendingRapport = rapport => {
    const pending = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]')
    pending.push(rapport)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pending))
}


const RecentReportsList = ({ onSelect }) => {
    const [reports, setReports] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchRecent = async () => {
            const today = getTodayStr()
            const { data, error } = await supabase
                .from('rapports')
                .select('id, projet_nom, date, redacteur')
                .order('created_at', { ascending: false })
                .limit(5)

            if (!error && data) setReports(data)
            setLoading(false)
        }
        fetchRecent()
    }, [])

    if (loading || reports.length === 0) return null

    return (
        <div className="mt-8 mb-8 p-4 bg-gray-800 rounded-xl border border-gray-700">
            <h3 className="text-white font-bebas text-lg mb-3">📝 MES DERNIERS RAPPORTS</h3>
            <div className="space-y-2">
                {reports.map(r => (
                    <button
                        key={r.id}
                        onClick={() => onSelect(r.id)}
                        className="w-full text-left p-3 bg-gray-900/50 hover:bg-gray-700 rounded-lg transition-colors flex justify-between items-center group"
                    >
                        <div>
                            <div className="text-green-400 font-medium">{r.projet_nom || 'Projet Inconnu'}</div>
                            <div className="text-xs text-gray-500">{r.redacteur} • {r.date}</div>
                        </div>
                        <span className="text-gray-500 group-hover:text-white">✏️</span>
                    </button>
                ))}
            </div>
        </div>
    )
}

export default function RapportForm() {
    const [step, setStep] = useState('form')
    const [data, setData] = useState({
        projet: 'PRJ-001',
        date: getTodayStr(),
        adresse: '1500 Atwater, Montréal, QC H3Z 1X5',
        meteo: '',
        temperature: '',
        redacteur: 'Maxime Robert',
        // Main d'oeuvre avec heures début/fin
        mainOeuvre: [
            {
                id: generateId(),
                employe: '',
                heureDebut: '07:00',
                heureFin: '15:30',
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
    })
    const { id } = useParams()
    const navigate = useNavigate()

    useEffect(() => {
        if (id && id !== 'nouveau') {
            loadRapport(id)
        }
    }, [id])

    const loadRapport = async (rapportId) => {
        try {
            // 1. Fetch rapport details
            const { data: rapport, error } = await supabase
                .from('rapports')
                .select('*')
                .eq('id', rapportId)
                .single()

            if (error) throw error

            // 2. Fetch associated photos
            const { data: photos, error: photosError } = await supabase
                .from('photos')
                .select('*')
                .eq('rapport_id', rapportId)

            if (photosError) console.error('Error fetching photos:', photosError)

            // 3. Populate state
            setData({
                projet: rapport.projet || '',
                date: rapport.date || getTodayStr(),
                adresse: rapport.adresse || '',
                meteo: rapport.meteo || '',
                temperature: rapport.temperature || '',
                redacteur: rapport.redacteur || '',
                mainOeuvre: rapport.main_oeuvre || [],
                materiaux: rapport.materiaux || [],
                equipements: rapport.equipements || [],
                soustraitants: rapport.soustraitants || [],
                ordresTravail: rapport.ordres_travail || [],
                reunions: rapport.reunions || [],
                evenements: rapport.evenements || '',
                problemesSecurite: rapport.problemes_securite || '',
                notesGenerales: rapport.notes_generales || '',
                // Map photos back to categories
                photosGenerales: (photos || []).filter(p => p.category === 'GENERAL').map(p => ({ data: p.url, ...p })),
                photosAvant: (photos || []).filter(p => p.category === 'AVANT').map(p => ({ data: p.url, ...p })),
                photosApres: (photos || []).filter(p => p.category === 'APRES').map(p => ({ data: p.url, ...p })),
                photosProblemes: (photos || []).filter(p => p.category === 'PROBLEME').map(p => ({ data: p.url, ...p })),
            })
        } catch (err) {
            console.error('Error loading rapport:', err)
            alert('Erreur lors du chargement du rapport')
        }
    }

    const update = (key, val) => setData(prev => ({ ...prev, [key]: val }))

    // Calculate hours from time range
    const calculateHours = (debut, fin) => {
        if (!debut || !fin) return 0
        const [h1, m1] = debut.split(':').map(Number)
        const [h2, m2] = fin.split(':').map(Number)
        const start = h1 + m1 / 60
        const end = h2 + m2 / 60
        return Math.max(0, end - start)
    }

    // Handle AI-detected material
    const handleMaterialDetected = material => {
        const newMaterial = {
            id: generateId(),
            ...material,
        }
        update('materiaux', [...data.materiaux, newMaterial])
    }

    const submitRapport = async rapport => {
        // 1. Soumettre rapport à Supabase
        const supabaseData = {
            date: rapport.date,
            redacteur: rapport.redacteur,
            projet: rapport.projet,
            projet_nom: PROJETS.find(p => p.id === rapport.projet)?.nom || rapport.projet,
            adresse: rapport.adresse,
            meteo: rapport.meteo,
            temperature: rapport.temperature ? parseInt(rapport.temperature) : null,
            main_oeuvre: rapport.mainOeuvre,
            materiaux: rapport.materiaux,
            equipements: rapport.equipements,
            ordres_travail: rapport.ordresTravail,
            reunions: rapport.reunions,
            notes_generales: rapport.notesGenerales,
            problemes_securite: rapport.problemesSecurite,
            total_heures_mo: rapport.totalHeuresMO,
            total_photos: rapport.totalPhotos,
            has_extras: rapport.hasExtras,
            total_extras: rapport.totalExtras,
        }

        if (rapport.id) {
            supabaseData.id = rapport.id
        }

        const { data: dbData, error } = await supabase.from('rapports').upsert([supabaseData]).select()

        if (error) {
            console.error('Erreur Supabase:', error)
            const pending = JSON.parse(localStorage.getItem('dr_rapports_pending') || '[]')
            pending.push(rapport)
            localStorage.setItem('dr_rapports_pending', JSON.stringify(pending))
            throw new Error('Erreur de connexion - rapport sauvegardé localement')
        }

        const rapportId = dbData[0].id
        console.log('Rapport créé:', rapportId)

        // 2. Insérer photos dans table photos avec rapport_id
        const photoRecords = []

        const processPhotos = (photos, cat) => {
            (photos || []).forEach(p => {
                photoRecords.push({
                    rapport_id: rapportId,
                    category: cat,
                    url: p.data || '',
                    latitude: p.geolocation?.latitude || null,
                    longitude: p.geolocation?.longitude || null,
                    gps_accuracy: p.geolocation?.accuracy || null,
                })
            })
        }

        // If updating, clear old photos first to avoid duplicates
        // (In a real app with storage, we would compare URLs, but here we just wipe for parity)
        if (rapport.id) {
            await supabase.from('photos').delete().eq('rapport_id', rapportId)
        }

        processPhotos(rapport.photosGenerales, 'GENERAL')
        processPhotos(rapport.photosAvant, 'AVANT')
        processPhotos(rapport.photosApres, 'APRES')
        processPhotos(rapport.photosProblemes, 'PROBLEME')

        if (photoRecords.length > 0) {
            console.log('Uploading', photoRecords.length, 'photos...')
            // Note: In a real app we would upload the file to Storage and save the URL. 
            // Here we are saving base64 to 'url' field which is not ideal but matches the legacy code.
            // The user should eventually migrate to Supabase Storage.
            const { error: photoError } = await supabase.from('photos').insert(photoRecords)
            if (photoError) {
                console.error('Erreur photos:', photoError)
                // Continue anyway - rapport is saved
            } else {
                console.log('Photos uploadées!')
            }
        }

        return dbData[0]
    }

    const handleSubmit = async e => {
        e.preventDefault()

        if (!data.redacteur) {
            alert('Sélectionne ton nom!')
            return
        }
        if (!data.projet) {
            alert('Sélectionne le projet!')
            return
        }

        setStep('submitting')

        // Calculate total hours from time ranges
        const totalHeuresMO = data.mainOeuvre.reduce((acc, m) => {
            if (!m.employe) return acc
            return acc + calculateHours(m.heureDebut, m.heureFin)
        }, 0)

        const rapport = {
            ...data,
            id: (id && id !== 'nouveau') ? id : generateId(),
            submittedAt: new Date().toISOString(),
            totalHeuresMO,
            totalPhotos:
                data.photosGenerales.length +
                data.photosAvant.length +
                data.photosApres.length +
                data.photosProblemes.length,
            hasExtras: data.ordresTravail.some(o => o.isExtra),
            nbExtras: data.ordresTravail.filter(o => o.isExtra).length,
            totalExtras: data.ordresTravail
                .filter(o => o.isExtra)
                .reduce((acc, o) => acc + (parseFloat(o.montantExtra) || 0), 0),
            // GPS data is already embedded in photos
            hasGPSPhotos: [
                ...data.photosGenerales,
                ...data.photosAvant,
                ...data.photosApres,
                ...data.photosProblemes,
            ].some(p => p.geolocation?.enabled),
        }

        try {
            await submitRapport(rapport)
            setStep('success')
        } catch (error) {
            console.error('Submit error:', error)
            savePendingRapport(rapport)
            setStep('offline')
        }
    }

    const resetForm = () => {
        setData({
            projet: '',
            date: getTodayStr(),
            adresse: '',
            meteo: '',
            temperature: '',
            redacteur: data.redacteur,
            mainOeuvre: [
                {
                    id: generateId(),
                    employe: '',
                    heureDebut: '07:00',
                    heureFin: '15:30',
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
        })
        setStep('form')
    }

    // SUCCESS SCREEN
    if (step === 'success') {
        return (
            <>
                <div className='min-h-screen flex items-center justify-center p-6'>
                    <div className='glass rounded-3xl p-8 text-center max-w-sm w-full animate-slide-up'>
                        <div className='w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-500/30'>
                            {Icons.check}
                        </div>
                        <h2 className='font-bebas text-3xl text-white mb-2'>RAPPORT ENVOYÉ!</h2>
                        <p className='text-gray-400 mb-1'>Merci {data.redacteur?.split(' ')[0]}!</p>
                        <p className='text-sm text-gray-500 mb-8'>
                            Ton rapport a été transmis au dashboard.
                        </p>
                        <button
                            onClick={resetForm}
                            className='w-full py-4 bg-[#E63946] text-white font-bebas text-lg tracking-wide rounded-xl active:scale-[0.98] transition-transform mb-3'
                        >
                            NOUVEAU RAPPORT
                        </button>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className='w-full py-4 bg-gray-700 text-white font-bebas text-lg tracking-wide rounded-xl active:scale-[0.98] transition-transform'
                        >
                            RETOUR DASHBOARD
                        </button>
                    </div>

                </div>

                {/* Liste des rapports récents pour accès rapide */}
                <div className="w-full max-w-sm mx-auto mt-6 px-4">
                    <button
                        onClick={() => navigate('/mes-rapports')}
                        className="w-full py-4 bg-gray-800 text-gray-300 font-bebas text-lg tracking-wide rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2 border border-gray-700"
                    >
                        📂 VOIR MES ANCIENS RAPPORTS
                    </button>
                </div>
            </>
        )
    }

    // OFFLINE SCREEN
    if (step === 'offline') {
        return (
            <div className='min-h-screen flex items-center justify-center p-6'>
                <div className='glass rounded-3xl p-8 text-center max-w-sm w-full animate-slide-up'>
                    <div className='w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-yellow-500/30'>
                        <svg
                            width='60'
                            height='60'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='#eab308'
                            strokeWidth='2'
                        >
                            <path d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' />
                        </svg>
                    </div>
                    <h2 className='font-bebas text-3xl text-white mb-2'>SAUVEGARDÉ LOCALEMENT</h2>
                    <p className='text-yellow-400 mb-1'>Connexion échouée</p>
                    <p className='text-sm text-gray-500 mb-8'>
                        Ton rapport est sauvegardé localement et sera envoyé automatiquement quand la
                        connexion sera rétablie.
                    </p>
                    <button
                        onClick={resetForm}
                        className='w-full py-4 bg-yellow-600 text-white font-bebas text-lg tracking-wide rounded-xl active:scale-[0.98] transition-transform'
                    >
                        NOUVEAU RAPPORT
                    </button>
                </div>
            </div>
        )
    }

    // SUBMITTING SCREEN
    if (step === 'submitting') {
        return (
            <div className='min-h-screen flex items-center justify-center p-6'>
                <div className='text-center'>
                    <div className='w-16 h-16 border-4 border-[#E63946] border-t-transparent rounded-full animate-spin mx-auto mb-6'></div>
                    <p className='text-white font-medium'>Envoi en cours...</p>
                    <p className='text-gray-500 text-sm mt-1'>Transfert des données et photos</p>
                </div>
            </div>
        )
    }

    return (
        <div className='min-h-screen'>
            {/* Quick Link for History */}
            <div className="fixed top-4 right-4 z-50">
                <button
                    onClick={() => navigate('/mes-rapports')}
                    className="bg-black/40 backdrop-blur-md border border-white/10 text-white p-2 rounded-full shadow-lg"
                >
                    {Icons.file}
                </button>
            </div>
            <Header />
            <form onSubmit={handleSubmit} className='max-w-2xl mx-auto p-4 space-y-4 pb-32'>
                {/* EN-TÊTE */}
                <div className='glass rounded-2xl p-4 space-y-4 animate-slide-up'>
                    <div className='grid grid-cols-2 gap-3'>
                        <div>
                            <label className='text-[11px] text-gray-500 mb-1.5 block font-medium'>
                                PROJET *
                            </label>
                            <select
                                value={data.projet}
                                onChange={e => update('projet', e.target.value)}
                                className='w-full px-3 py-3 rounded-xl'
                                required
                            >
                                <option value=''>Sélectionner...</option>
                                {PROJETS.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.nom}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className='text-[11px] text-gray-500 mb-1.5 block font-medium'>
                                DATE *
                            </label>
                            <input
                                type='date'
                                value={data.date}
                                onChange={e => update('date', e.target.value)}
                                className='w-full px-3 py-3 rounded-xl'
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className='text-[11px] text-gray-500 mb-1.5 block font-medium'>
                            ADRESSE CHANTIER
                        </label>
                        <input
                            type='text'
                            value={data.adresse}
                            onChange={e => update('adresse', e.target.value)}
                            placeholder='123 rue Exemple, Montréal'
                            className='w-full px-3 py-3 rounded-xl'
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
                                        className={`p-2 rounded-xl border-2 transition-all active:scale-95 ${data.meteo === m.k
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
                            <label className='text-[11px] text-gray-500 mb-1.5 block font-medium'>
                                TEMP. (°C)
                            </label>
                            <input
                                type='number'
                                inputMode='numeric'
                                value={data.temperature}
                                onChange={e => update('temperature', e.target.value)}
                                placeholder='-5'
                                className='w-full px-3 py-3 rounded-xl'
                            />
                        </div>
                    </div>

                    <div>
                        <label className='text-[11px] text-gray-500 mb-1.5 block font-medium'>
                            TON NOM *
                        </label>
                        <select
                            value={data.redacteur}
                            onChange={e => update('redacteur', e.target.value)}
                            className='w-full px-3 py-3 rounded-xl'
                            required
                        >
                            <option value=''>Qui es-tu?</option>
                            {EMPLOYES.map(e => (
                                <option key={e.id} value={e.nom}>
                                    {e.nom} ({e.role})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* MAIN D'OEUVRE - AVEC TIME PICKER */}
                <Section
                    icon={Icons.clock}
                    title="TEMPS - MAIN D'OEUVRE"
                    subtitle='Heures début/fin avec flèches'
                    color='#3b82f6'
                >
                    <div className='space-y-4'>
                        {data.mainOeuvre.map((row, idx) => (
                            <div
                                key={row.id}
                                className='bg-black/20 rounded-xl p-3 space-y-3 animate-slide-up'
                            >
                                <div className='flex items-center justify-between'>
                                    <select
                                        value={row.employe}
                                        onChange={e => {
                                            const updated = [...data.mainOeuvre]
                                            updated[idx].employe = e.target.value
                                            update('mainOeuvre', updated)
                                        }}
                                        className='flex-1 px-3 py-3 rounded-xl mr-2'
                                    >
                                        <option value=''>Sélectionner employé</option>
                                        {WORKERS.map((w, i) => (
                                            <option key={i} value={w}>
                                                {w}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type='button'
                                        onClick={() => {
                                            if (data.mainOeuvre.length > 1) {
                                                update(
                                                    'mainOeuvre',
                                                    data.mainOeuvre.filter(r => r.id !== row.id)
                                                )
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
                                            const updated = [...data.mainOeuvre]
                                            updated[idx].heureDebut = val
                                            update('mainOeuvre', updated)
                                        }}
                                        label='DÉBUT'
                                    />
                                    <div className='text-gray-600 text-2xl'>→</div>
                                    <TimePicker
                                        value={row.heureFin}
                                        onChange={val => {
                                            const updated = [...data.mainOeuvre]
                                            updated[idx].heureFin = val
                                            update('mainOeuvre', updated)
                                        }}
                                        label='FIN'
                                    />
                                </div>

                                {row.employe && (
                                    <div className='text-center text-sm text-blue-400 bg-blue-400/10 py-2 rounded-lg'>
                                        Total:{' '}
                                        <span className='font-bold'>
                                            {calculateHours(row.heureDebut, row.heureFin).toFixed(1)}h
                                        </span>
                                    </div>
                                )}

                                <input
                                    type='text'
                                    value={row.description}
                                    onChange={e => {
                                        const updated = [...data.mainOeuvre]
                                        updated[idx].description = e.target.value
                                        update('mainOeuvre', updated)
                                    }}
                                    placeholder='Description des travaux effectués...'
                                    className='w-full px-3 py-2 rounded-xl text-sm'
                                />
                            </div>
                        ))}

                        <button
                            type='button'
                            onClick={() =>
                                update('mainOeuvre', [
                                    ...data.mainOeuvre,
                                    {
                                        id: generateId(),
                                        employe: '',
                                        heureDebut: '07:00',
                                        heureFin: '15:30',
                                        description: '',
                                    },
                                ])
                            }
                            className='w-full py-3 border-2 border-dashed border-blue-500/40 rounded-xl text-blue-500 flex items-center justify-center gap-2 text-sm font-medium'
                        >
                            {Icons.plus} Ajouter employé
                        </button>
                    </div>
                </Section>

                {/* MATÉRIAUX - AVEC AI SCANNER */}
                <Section
                    icon={Icons.box}
                    title='MATÉRIAUX UTILISÉS'
                    subtitle='Scanner ou ajouter manuellement'
                    color='#f59e0b'
                >
                    <div className='space-y-4'>
                        {/* AI Material Scanner */}
                        <MaterialScanner onMaterialDetected={handleMaterialDetected} />

                        {/* Manual Entry */}
                        <div className='border-t border-white/10 pt-4'>
                            <p className='text-xs text-gray-500 mb-3'>Ou ajouter manuellement:</p>
                            <DynamicRows
                                rows={data.materiaux}
                                setRows={rows => update('materiaux', rows)}
                                fields={[
                                    {
                                        key: 'item',
                                        placeholder: 'Matériau',
                                        type: 'datalist',
                                        options: MATERIAUX_COMMUNS,
                                        width: '1fr',
                                    },
                                    { key: 'quantite', placeholder: 'Qté', type: 'number', width: '65px' },
                                    {
                                        key: 'unite',
                                        placeholder: 'Unité',
                                        type: 'select',
                                        options: ['unité', 'pi', 'm', 'rouleau', 'boîte'],
                                        width: '80px',
                                    },
                                ]}
                                addLabel='Ajouter matériau'
                                color='#f59e0b'
                            />
                        </div>
                    </div>
                </Section>

                {/* ÉQUIPEMENTS */}
                <Section
                    icon={Icons.tool}
                    title='ÉQUIPEMENTS'
                    subtitle='Outils et machinerie'
                    color='#8b5cf6'
                >
                    <DynamicRows
                        rows={data.equipements}
                        setRows={rows => update('equipements', rows)}
                        fields={[
                            { key: 'nom', placeholder: 'Équipement / #', width: '1fr' },
                            { key: 'heures', placeholder: 'Hrs', type: 'number', width: '65px' },
                        ]}
                        addLabel='Ajouter équipement'
                        color='#8b5cf6'
                    />
                </Section>

                {/* SOUS-TRAITANTS */}
                <Section
                    icon={Icons.users}
                    title='SOUS-TRAITANTS'
                    subtitle='Entreprises sur le chantier'
                    color='#06b6d4'
                >
                    <DynamicRows
                        rows={data.soustraitants}
                        setRows={rows => update('soustraitants', rows)}
                        fields={[
                            { key: 'entreprise', placeholder: 'Entreprise', width: '1fr' },
                            { key: 'nbPersonnes', placeholder: '#', type: 'number', width: '50px' },
                            { key: 'heures', placeholder: 'Hrs', type: 'number', width: '60px' },
                        ]}
                        addLabel='Ajouter sous-traitant'
                        color='#06b6d4'
                    />
                </Section>

                {/* ORDRES DE TRAVAIL / EXTRAS */}
                <Section
                    icon={Icons.dollar}
                    title='ORDRES DE TRAVAIL'
                    subtitle='⚠️ Cocher les EXTRAS!'
                    color='#eab308'
                >
                    <div className='space-y-3'>
                        {data.ordresTravail.map((ordre, idx) => (
                            <div
                                key={ordre.id}
                                className='bg-black/30 rounded-xl p-3 space-y-3 border border-white/5'
                            >
                                <div className='flex gap-2'>
                                    <input
                                        type='text'
                                        value={ordre.description}
                                        onChange={e => {
                                            const updated = [...data.ordresTravail]
                                            updated[idx].description = e.target.value
                                            update('ordresTravail', updated)
                                        }}
                                        placeholder='Description du travail'
                                        className='flex-1 px-3 py-3 rounded-xl'
                                    />
                                    <button
                                        type='button'
                                        onClick={() => {
                                            if (data.ordresTravail.length > 1) {
                                                update(
                                                    'ordresTravail',
                                                    data.ordresTravail.filter(o => o.id !== ordre.id)
                                                )
                                            }
                                        }}
                                        className='p-3 text-gray-600'
                                    >
                                        {Icons.trash}
                                    </button>
                                </div>
                                <div className='flex items-center gap-3 flex-wrap'>
                                    <label className='flex items-center gap-2 cursor-pointer'>
                                        <input
                                            type='checkbox'
                                            checked={ordre.isExtra}
                                            onChange={e => {
                                                const updated = [...data.ordresTravail]
                                                updated[idx].isExtra = e.target.checked
                                                update('ordresTravail', updated)
                                            }}
                                            className='w-5 h-5 rounded accent-yellow-500'
                                        />
                                        <span className='extra-badge text-white'>💰 EXTRA</span>
                                    </label>
                                    {ordre.isExtra && (
                                        <input
                                            type='number'
                                            inputMode='decimal'
                                            value={ordre.montantExtra}
                                            onChange={e => {
                                                const updated = [...data.ordresTravail]
                                                updated[idx].montantExtra = e.target.value
                                                update('ordresTravail', updated)
                                            }}
                                            placeholder='Montant $'
                                            className='w-28 px-3 py-2 rounded-xl text-yellow-400'
                                        />
                                    )}
                                    <select
                                        value={ordre.status}
                                        onChange={e => {
                                            const updated = [...data.ordresTravail]
                                            updated[idx].status = e.target.value
                                            update('ordresTravail', updated)
                                        }}
                                        className='px-3 py-2 rounded-xl text-sm'
                                    >
                                        <option value='en_cours'>En cours</option>
                                        <option value='complete'>Complété</option>
                                        <option value='bloque'>Bloqué</option>
                                    </select>
                                </div>
                            </div>
                        ))}
                        <button
                            type='button'
                            onClick={() =>
                                update('ordresTravail', [
                                    ...data.ordresTravail,
                                    {
                                        id: generateId(),
                                        description: '',
                                        isExtra: false,
                                        montantExtra: '',
                                        status: 'en_cours',
                                    },
                                ])
                            }
                            className='w-full py-3 border-2 border-dashed border-yellow-500/40 rounded-xl text-yellow-500 flex items-center justify-center gap-2 text-sm font-medium'
                        >
                            {Icons.plus} Ajouter ordre de travail
                        </button>
                    </div>
                </Section>

                {/* RÉUNIONS */}
                <Section
                    icon={Icons.meeting}
                    title='RÉUNIONS'
                    subtitle='Rencontres de chantier'
                    color='#6366f1'
                >
                    <DynamicRows
                        rows={data.reunions}
                        setRows={rows => update('reunions', rows)}
                        fields={[
                            {
                                key: 'type',
                                placeholder: 'Type',
                                type: 'select',
                                options: ['Coordination', 'Sécurité', 'Client', 'Ingénieur', 'Autre'],
                                width: '100px',
                            },
                            { key: 'participants', placeholder: 'Participants', width: '1fr' },
                        ]}
                        addLabel='Ajouter réunion'
                        color='#6366f1'
                    />
                </Section>

                {/* PHOTOS AVEC GPS */}
                <Section
                    icon={Icons.camera}
                    title='PHOTOS'
                    subtitle='📍 Géolocalisation automatique'
                    color='#22c55e'
                >
                    <div className='grid grid-cols-2 gap-4'>
                        <div className='bg-black/30 rounded-xl p-3'>
                            <p className='text-[10px] text-gray-400 mb-2 font-medium'>📸 GÉNÉRALES</p>
                            <PhotoUploadGPS
                                photos={data.photosGenerales}
                                setPhotos={p => update('photosGenerales', p)}
                                label='Photo'
                                accent='#22c55e'
                                category='GENERALES'
                            />
                        </div>
                        <div className='bg-black/30 rounded-xl p-3'>
                            <p className='text-[10px] text-blue-400 mb-2 font-medium'>🔜 AVANT</p>
                            <PhotoUploadGPS
                                photos={data.photosAvant}
                                setPhotos={p => update('photosAvant', p)}
                                label='Avant'
                                accent='#3b82f6'
                                category='AVANT'
                            />
                        </div>
                        <div className='bg-black/30 rounded-xl p-3'>
                            <p className='text-[10px] text-green-400 mb-2 font-medium'>✅ APRÈS</p>
                            <PhotoUploadGPS
                                photos={data.photosApres}
                                setPhotos={p => update('photosApres', p)}
                                label='Après'
                                accent='#22c55e'
                                category='APRES'
                            />
                        </div>
                        <div className='bg-black/30 rounded-xl p-3 border border-red-500/30'>
                            <p className='text-[10px] text-red-400 mb-2 font-medium'>⚠️ PROBLÈMES</p>
                            <PhotoUploadGPS
                                photos={data.photosProblemes}
                                setPhotos={p => update('photosProblemes', p)}
                                label='Problème'
                                accent='#ef4444'
                                category='PROBLEMES'
                            />
                        </div>
                    </div>
                    <p className='text-[10px] text-gray-600 mt-3 text-center'>
                        📍 Les coordonnées GPS sont capturées automatiquement si activé sur ton téléphone
                    </p>
                </Section>

                {/* NOTES */}
                <Section
                    icon={Icons.alert}
                    title='NOTES & ÉVÉNEMENTS'
                    subtitle='Infos importantes'
                    color='#64748b'
                >
                    <div className='space-y-4'>
                        <div>
                            <label className='text-[10px] text-gray-500 mb-1.5 block'>
                                Événements (visites, livraisons, retards...)
                            </label>
                            <textarea
                                value={data.evenements}
                                onChange={e => update('evenements', e.target.value)}
                                rows={2}
                                className='w-full px-3 py-3 rounded-xl resize-none'
                                placeholder='CNESST, CCQ, livraisons...'
                            />
                        </div>
                        <div>
                            <label className='text-[10px] text-red-400 mb-1.5 block'>
                                ⚠️ Problèmes de sécurité
                            </label>
                            <textarea
                                value={data.problemesSecurite}
                                onChange={e => update('problemesSecurite', e.target.value)}
                                rows={2}
                                className='w-full px-3 py-3 rounded-xl resize-none border-red-500/30'
                                placeholder='Risques, incidents, équipements défectueux...'
                            />
                        </div>
                        <div>
                            <label className='text-[10px] text-gray-500 mb-1.5 block'>Notes générales</label>
                            <textarea
                                value={data.notesGenerales}
                                onChange={e => update('notesGenerales', e.target.value)}
                                rows={3}
                                className='w-full px-3 py-3 rounded-xl resize-none'
                                placeholder='Autres informations...'
                            />
                        </div>
                    </div>
                </Section>

                {/* SUBMIT BUTTON */}
                <button
                    type='submit'
                    className='fixed bottom-6 left-0 right-0 max-w-2xl mx-auto w-[calc(100%-2rem)] py-5 bg-[#E63946] text-white font-bebas text-xl tracking-wider rounded-2xl flex items-center justify-center gap-3 shadow-2xl shadow-red-500/30 animate-pulse-btn active:scale-[0.98] transition-transform z-40'
                >
                    {Icons.send}
                    ENVOYER LE RAPPORT
                </button>
            </form>
        </div>
    )
}
