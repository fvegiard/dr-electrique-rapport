
import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient'
import { Icons } from '../utils/Icons'
import { EMPLOYES, PROJETS } from '../utils/constants'

// Helpers
const getTodayStr = () => 'all' // Default: show all reports
const formatDate = d => new Date(d).toLocaleDateString('fr-CA')

const snakeToCamel = obj => {
    if (Array.isArray(obj)) return obj.map(snakeToCamel)
    if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
            acc[camelKey] = snakeToCamel(obj[key])
            return acc
        }, {})
    }
    return obj
}

const parseReunions = reunionsData => {
    if (!reunionsData) return []
    if (Array.isArray(reunionsData)) {
        return reunionsData.filter(r => r && (r.notes || r.type || r.participants))
    }
    if (typeof reunionsData === 'string') {
        const trimmed = reunionsData.trim()
        if (!trimmed) return []
        try {
            const parsed = JSON.parse(trimmed)
            if (Array.isArray(parsed)) {
                return parsed.filter(r => r && (r.notes || r.type || r.participants))
            }
            return [{ notes: trimmed }]
        } catch {
            return [{ notes: trimmed }]
        }
    }
    return []
}

// Sub-components
const Sidebar = ({ activeTab, setActiveTab }) => (
    <div className='sidebar'>
        <div className='p-4 border-b border-white/10'>
            <div className='flex items-center gap-3'>
                <div
                    className='w-10 h-10 rounded-lg flex items-center justify-center font-bebas text-lg'
                    style={{
                        background: 'linear-gradient(135deg, #00ff00, #00aa00)',
                        color: '#000',
                        boxShadow: '0 0 20px rgba(0,255,0,0.4)',
                    }}
                >
                    DR
                </div>
                <div>
                    <div className='font-bebas text-sm tracking-wide' style={{ color: '#00ff00' }}>
                        GROUPE DR ELECTRIQUE
                    </div>
                    <div className='text-[10px] text-gray-500'>Plateforme Chantier</div>
                </div>
            </div>
        </div>

        <div className='py-4'>
            <div className='px-4 text-[10px] text-gray-600 uppercase tracking-wider mb-2'>
                Navigation
            </div>

            <div
                className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
            >
                {Icons.dashboard} <span>Dashboard</span>
            </div>
            <div
                className={`nav-item ${activeTab === 'rapports' ? 'active' : ''}`}
                onClick={() => setActiveTab('rapports')}
            >
                {Icons.file} <span>Rapports Journaliers</span>
            </div>
            <div
                className={`nav-item ${activeTab === 'ordres' ? 'active' : ''}`}
                onClick={() => setActiveTab('ordres')}
            >
                {Icons.clipboard} <span>Ordres de Travail</span>
            </div>
            <div
                className={`nav-item ${activeTab === 'reunions' ? 'active' : ''}`}
                onClick={() => setActiveTab('reunions')}
            >
                {Icons.users} <span>Reunions</span>
            </div>
            <div
                className={`nav-item ${activeTab === 'photos' ? 'active' : ''}`}
                onClick={() => setActiveTab('photos')}
            >
                {Icons.camera} <span>Photos</span>
            </div>
            <div
                className={`nav-item ${activeTab === 'extras' ? 'active' : ''}`}
                onClick={() => setActiveTab('extras')}
            >
                {Icons.dollar} <span>Extras a Facturer</span>
            </div>
        </div>
    </div>
)

const Header = ({ userName, selectedDate, setSelectedDate, setFilterProjet }) => (
    <div className='flex items-center justify-between mb-6'>
        <h1
            className='font-bebas text-2xl tracking-wide'
            style={{ color: '#00ff00', textShadow: '0 0 10px rgba(0,255,0,0.3)' }}
        >
            TABLEAU DE BORD
        </h1>
        <div className='flex items-center gap-4'>
            <Link
                to="/nouveau"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-black hover:bg-green-500 transition-colors shadow-[0_0_15px_rgba(0,255,0,0.3)]"
            >
                <span className="text-lg">+</span> Nouveau
            </Link>
            <button
                onClick={() => {
                    setSelectedDate('all')
                    if (setFilterProjet) setFilterProjet(null)
                }}
                className={`px-3 py-1 rounded text-sm ${selectedDate === 'all' && (!setFilterProjet || true) ? 'bg-green-600' : 'bg-gray-700'}`}
            >
                Tous
            </button>
            <input
                type='date'
                value={selectedDate === 'all' ? '' : selectedDate}
                onChange={e => setSelectedDate(e.target.value || 'all')}
                className="bg-gray-800 border-none rounded text-white px-3 py-1"
            />
            <div className='flex items-center gap-2'>
                <span className='text-gray-400 text-sm'>{userName}</span>
                <div className='w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm'>
                    F
                </div>
            </div>
        </div>
    </div>
)

const DashboardView = ({ rapports, selectedDate, setActiveTab, setFilterProjet }) => {
    const todayRapports = selectedDate === 'all' ? rapports : rapports.filter(r => selectedDate === 'all' || r.date === selectedDate)

    const contreMaitres = EMPLOYES.filter(e => e.role === 'Contremaître')
    const submittedBy = todayRapports.map(r => r.redacteur)
    const missing = contreMaitres.filter(cm => !submittedBy.includes(cm.nom))

    const totalHeures = todayRapports.reduce((acc, r) => acc + (r.totalHeuresMo || 0), 0)
    const totalOrdres = todayRapports.reduce(
        (acc, r) => acc + (r.ordresTravail?.length || 0),
        0
    )

    const totalReunions = todayRapports.reduce((acc, r) => {
        const parsed = parseReunions(r.reunions)
        return acc + parsed.length
    }, 0)

    const projetStats = PROJETS.map(p => {
        const projRapports = todayRapports.filter(r => r.projet === p.id)
        const heures = projRapports.reduce((acc, r) => acc + (r.totalHeuresMo || 0), 0)
        const ordres = projRapports.reduce(
            (acc, r) => acc + (r.ordresTravail?.filter(o => o.isExtra)?.length || 0),
            0
        )
        return { ...p, rapports: projRapports.length, heures, ordres }
    })

    const handleProjectClick = projetId => {
        setFilterProjet(projetId)
        setActiveTab('rapports')
    }

    return (
        <div className='animate-fade'>
            {missing.length > 0 && (
                <div className='alert-card mb-6'>
                    <div className='flex items-center gap-3 mb-3'>
                        {Icons.alert}
                        <div>
                            <div className='font-medium' style={{ color: '#ff6b6b' }}>
                                Rapports manquants aujourd'hui
                            </div>
                            <div className='text-xs text-gray-400'>{missing.length} employe(s)</div>
                        </div>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                        {missing.map(emp => (
                            <span key={emp.id} className='badge badge-missing'>
                                {emp.nom}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className='grid grid-cols-4 gap-4 mb-6'>
                <div
                    className='stat-card'
                    onClick={() => setActiveTab('rapports')}
                    style={{ cursor: 'pointer' }}
                >
                    <div className='flex items-center justify-between'>
                        <div>
                            <div className='text-xs text-gray-500 mb-1'>Rapports aujourd'hui</div>
                            <div className='text-3xl font-bebas' style={{ color: '#00ff00' }}>
                                {todayRapports.length}
                            </div>
                            <div className='text-xs text-gray-600'>sur {contreMaitres.length} employes</div>
                        </div>
                        <div className='text-green-500 opacity-50'>{Icons.file}</div>
                    </div>
                </div>

                <div className='stat-card'>
                    <div className='flex items-center justify-between'>
                        <div>
                            <div className='text-xs text-gray-500 mb-1'>Heures aujourd'hui</div>
                            <div className='text-3xl font-bebas' style={{ color: '#ffc800' }}>
                                {totalHeures.toFixed(0)}h
                            </div>
                        </div>
                        <div className='text-yellow-500 opacity-50'>{Icons.clock}</div>
                    </div>
                </div>

                <div
                    className='stat-card'
                    onClick={() => setActiveTab('ordres')}
                    style={{ cursor: 'pointer' }}
                >
                    <div className='flex items-center justify-between'>
                        <div>
                            <div className='text-xs text-gray-500 mb-1'>Ordres actifs</div>
                            <div className='text-3xl font-bebas' style={{ color: '#9d00ff' }}>
                                {totalOrdres}
                            </div>
                        </div>
                        <div className='text-purple-500 opacity-50'>{Icons.clipboard}</div>
                    </div>
                </div>

                <div
                    className='stat-card'
                    onClick={() => setActiveTab('reunions')}
                    style={{ cursor: 'pointer' }}
                >
                    <div className='flex items-center justify-between'>
                        <div>
                            <div className='text-xs text-gray-500 mb-1'>Reunions aujourd'hui</div>
                            <div className='text-3xl font-bebas' style={{ color: '#00d4ff' }}>
                                {totalReunions}
                            </div>
                        </div>
                        <div className='text-cyan-500 opacity-50'>{Icons.users}</div>
                    </div>
                </div>
            </div>

            <div className='section-title'>ACTIVITE PAR PROJET</div>
            <div className='space-y-3'>
                {projetStats.map(projet => (
                    <div
                        key={projet.id}
                        className='project-row flex items-center justify-between'
                        onClick={() => handleProjectClick(projet.id)}
                    >
                        <div>
                            <div className='font-medium'>{projet.nom}</div>
                            <div className='text-xs text-gray-500'>{projet.client}</div>
                        </div>
                        <div className='flex items-center gap-6 text-sm'>
                            <span className='clickable-stat'>{projet.rapports} rapports</span>
                            <span style={{ color: '#ffc800' }}>{projet.heures}h</span>
                            <span className='clickable-stat' style={{ color: '#9d00ff' }}>
                                {projet.ordres} ordres
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

const RapportsView = ({ rapports, selectedDate, filterProjet, setFilterProjet }) => {
    let todayRapports = selectedDate === 'all' ? [...rapports] : rapports.filter(r => selectedDate === 'all' || r.date === selectedDate)

    if (filterProjet) {
        todayRapports = todayRapports.filter(r => r.projet === filterProjet)
    }

    // Group by Week (Monday Start)
    const groupedRapports = {}
    todayRapports.forEach(r => {
        const d = new Date(r.date + 'T12:00:00') // Fix timezone offset issues by picking noon
        const day = d.getDay() // 0 = Sunday
        const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
        const monday = new Date(d.setDate(diff))
        const key = monday.toISOString().split('T')[0]

        if (!groupedRapports[key]) groupedRapports[key] = []
        groupedRapports[key].push(r)
    })

    // Sort weeks descending (newest first)
    const sortedWeeks = Object.keys(groupedRapports).sort((a, b) => new Date(b) - new Date(a))

    return (
        <div className='animate-fade'>
            <div className='flex items-center justify-between mb-6'>
                <div className='section-title mb-0 border-0 pb-0'>
                    {selectedDate === 'all' ? `TOUS LES RAPPORTS (${todayRapports.length})` : `RAPPORTS DU ${formatDate(selectedDate)} (${todayRapports.length})`}
                </div>
                {filterProjet && (
                    <button
                        onClick={() => setFilterProjet(null)}
                        className='text-xs px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full hover:bg-purple-600/30'
                    >
                        ✕ Effacer filtre
                    </button>
                )}
            </div>
            {todayRapports.length === 0 ? (
                <div className='text-center py-16 text-gray-500'>
                    <div className='text-4xl mb-4'>📭</div>Aucun rapport pour cette date
                </div>
            ) : (
                <div className='space-y-10'>
                    {sortedWeeks.map(weekStart => (
                        <div key={weekStart} className="animate-fade-up">
                            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4 pl-3 border-l-4 border-green-500/50 flex items-center gap-2">
                                <span>📅 SEMAINE DU {new Date(weekStart + 'T12:00:00').toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                <span className="text-gray-600 font-normal normal-case">({groupedRapports[weekStart].length})</span>
                            </h3>
                            <div className='space-y-4'>
                                {groupedRapports[weekStart].map(rapport => {
                                    const projet = PROJETS.find(p => p.id === rapport.projet)
                                    return (
                                        <Link
                                            key={rapport.id}
                                            to={`/rapport/${rapport.id}/view`}
                                            className='block report-card overflow-hidden hover:border-green-500/50 transition-colors group'
                                        >
                                            <div className='p-4 flex flex-col md:flex-row md:items-center justify-between gap-4'>

                                                {/* Left Info: Icon + Project + Redacteur */}
                                                <div className='flex items-center gap-4 flex-1'>
                                                    <div
                                                        className='w-12 h-12 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform'
                                                        style={{
                                                            background: 'rgba(0,255,0,0.1)',
                                                            border: '1px solid rgba(0,255,0,0.3)',
                                                        }}
                                                    >
                                                        {Icons.file}
                                                    </div>
                                                    <div>
                                                        <div className='font-medium text-white flex items-center gap-2'>
                                                            {rapport.redacteur}
                                                            <span className='text-gray-500 text-[10px] ml-1 font-normal'>- {formatDate(rapport.date)}</span>
                                                            {rapport.totalPhotos > 0 && <span className='text-[10px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-400'>📷 {rapport.totalPhotos}</span>}
                                                        </div>
                                                        <div className='text-xs text-green-400 font-mono mb-1'>{projet?.nom || 'Projet Inconnu'}</div>

                                                        {/* Team List Display */}
                                                        <div className='text-xs text-gray-500 flex items-center gap-1 mt-1'>
                                                            <span className='w-2 h-2 rounded-full bg-gray-600 inline-block'></span>
                                                            {rapport.mainOeuvre?.filter(m => m.employe).length > 0
                                                                ? rapport.mainOeuvre.filter(m => m.employe).map(m => m.employe.split(' ')[0]).join(', ')
                                                                : 'Aucun employé'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right Info: Hours + Extras + Arrow */}
                                                <div className='flex items-center gap-6 justify-end'>
                                                    <div className='text-right'>
                                                        <div className='text-xl font-bebas' style={{ color: '#ffc800' }}>
                                                            {rapport.totalHeuresMo?.toFixed(1)}h
                                                        </div>
                                                        <div className='text-[10px] text-gray-500 uppercase'>Heures Journée</div>
                                                    </div>

                                                    {rapport.hasExtras && (
                                                        <div className='text-right hidden sm:block'>
                                                            <span
                                                                className='px-2 py-1 rounded text-xs font-bold block'
                                                                style={{ background: 'rgba(255,200,0,0.2)', color: '#ffc800' }}
                                                            >
                                                                EXTRA: ${rapport.totalExtras}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className='text-gray-600 group-hover:text-green-500 transition-colors'>
                                                        ➜
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

const OrdresView = ({ rapports, selectedDate }) => {
    const [expandedId, setExpandedId] = useState(null)
    const allOrdres = rapports
        .filter(r => selectedDate === 'all' || r.date === selectedDate)
        .flatMap(r => (r.ordresTravail || []).map(o => ({ ...o, rapport: r })))
        .filter(o => o.description)

    return (
        <div className='animate-fade'>
            <div className='section-title'>ORDRES DE TRAVAIL ({allOrdres.length})</div>
            {allOrdres.length === 0 ? (
                <div className='text-center py-16 text-gray-500'>
                    <div className='text-4xl mb-4'>📋</div>Aucun ordre de travail
                </div>
            ) : (
                <div className='space-y-3'>
                    {allOrdres.map((ordre, i) => {
                        const isExpanded = expandedId === i
                        const projet = PROJETS.find(p => p.id === ordre.rapport.projet)
                        return (
                            <div
                                key={i}
                                className={`p-4 rounded-xl ordre-card ${ordre.isExtra ? 'extra-card' : 'report-card'}`}
                                onClick={() => setExpandedId(isExpanded ? null : i)}
                            >
                                <div className='flex items-center justify-between'>
                                    <div>
                                        <div className='font-medium'>{ordre.description}</div>
                                        <div className='text-xs text-gray-500'>{ordre.rapport.redacteur}</div>
                                    </div>
                                    <div className='flex items-center gap-3'>
                                        <span
                                            className={`px-2 py-1 rounded text-xs ${ordre.status === 'complete' ? 'bg-green-500/20 text-green-400' : ordre.status === 'bloque' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}
                                        >
                                            {ordre.status || 'en_cours'}
                                        </span>
                                        {ordre.isExtra && (
                                            <span className='font-bold' style={{ color: '#ffc800' }}>
                                                ${ordre.montantExtra}
                                            </span>
                                        )}
                                        <span className='text-gray-500'>
                                            {isExpanded ? Icons.chevronUp : Icons.chevronDown}
                                        </span>
                                    </div>
                                </div>
                                {isExpanded && (
                                    <div className='ordre-expanded'>
                                        <div className='grid grid-cols-2 gap-4 text-sm'>
                                            <div>
                                                <span className='text-gray-500'>Projet:</span>
                                                <span className='ml-2 text-white'>{projet?.nom || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className='text-gray-500'>Date:</span>
                                                <span className='ml-2 text-white'>
                                                    {formatDate(ordre.rapport.date)}
                                                </span>
                                            </div>
                                            <div>
                                                <span className='text-gray-500'>Redacteur:</span>
                                                <span className='ml-2 text-white'>{ordre.rapport.redacteur}</span>
                                            </div>
                                            <div>
                                                <span className='text-gray-500'>Status:</span>
                                                <span className='ml-2 text-white'>{ordre.status || 'en_cours'}</span>
                                            </div>
                                        </div>
                                        {ordre.isExtra && (
                                            <div className='mt-3 p-2 rounded bg-yellow-500/10 border border-yellow-500/30'>
                                                <span className='text-yellow-400 text-sm font-medium'>
                                                    💰 Extra: ${ordre.montantExtra}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

const ReunionsView = ({ rapports, selectedDate }) => {
    const reunions = rapports
        .filter(r => selectedDate === 'all' || r.date === selectedDate)
        .flatMap(r => {
            const parsed = parseReunions(r.reunions)
            const projet = PROJETS.find(p => p.id === r.projet)?.nom
            return parsed.map((reunion, idx) => ({
                ...reunion,
                redacteur: r.redacteur,
                projet: projet,
                key: `${r.id}-${idx}`,
            }))
        })

    return (
        <div className='animate-fade'>
            <div className='section-title'>REUNIONS ({reunions.length})</div>
            {reunions.length === 0 ? (
                <div className='text-center py-16 text-gray-500'>
                    <div className='text-4xl mb-4'>👥</div>Aucune reunion enregistree
                </div>
            ) : (
                <div className='space-y-4'>
                    {reunions.map(r => (
                        <div key={r.key} className='report-card p-4'>
                            <div className='flex items-center gap-2 mb-2'>
                                <span className='text-sm font-medium'>{r.redacteur}</span>
                                <span className='text-xs text-gray-500'>- {r.projet}</span>
                                {r.type && (
                                    <span className='text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 ml-2'>
                                        {r.type}
                                    </span>
                                )}
                            </div>
                            {r.participants && (
                                <div className='text-xs text-gray-400 mb-2'>
                                    <span className='text-gray-500'>Participants:</span> {r.participants}
                                </div>
                            )}
                            {r.notes && <div className='text-gray-300 whitespace-pre-wrap'>{r.notes}</div>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

const PhotosView = ({ rapports, selectedDate }) => {
    const [selectedImg, setSelectedImg] = useState(null)

    const allPhotos = rapports
        .filter(r => selectedDate === 'all' || r.date === selectedDate)
        .flatMap(r => {
            const photos = []
                ; (r.photosGenerales || []).forEach(p =>
                    photos.push({
                        ...(typeof p === 'object' ? p : { data: p }),
                        type: 'Generale',
                        redacteur: r.redacteur,
                    })
                )
                ; (r.photosAvant || []).forEach(p =>
                    photos.push({
                        ...(typeof p === 'object' ? p : { data: p }),
                        type: 'Avant',
                        redacteur: r.redacteur,
                    })
                )
                ; (r.photosApres || []).forEach(p =>
                    photos.push({
                        ...(typeof p === 'object' ? p : { data: p }),
                        type: 'Apres',
                        redacteur: r.redacteur,
                    })
                )
                ; (r.photosProblemes || []).forEach(p =>
                    photos.push({
                        ...(typeof p === 'object' ? p : { data: p }),
                        type: 'Probleme',
                        redacteur: r.redacteur,
                    })
                )
            return photos
        })

    return (
        <div className='animate-fade'>
            {selectedImg && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out"
                    onClick={() => setSelectedImg(null)}
                >
                    <div className="relative max-w-7xl max-h-screen">
                        <img
                            src={selectedImg}
                            className="max-h-[90vh] max-w-full object-contain rounded-lg shadow-2xl border border-white/20"
                            alt="Agrandissement"
                        />
                        <button
                            className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-white/20 transition-colors"
                            onClick={() => setSelectedImg(null)}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            <div className='section-title'>PHOTOS ({allPhotos.length})</div>
            {allPhotos.length === 0 ? (
                <div className='text-center py-16 text-gray-500'>
                    <div className='text-4xl mb-4'>📷</div>Aucune photo
                </div>
            ) : (
                <div className='photo-grid grid grid-cols-4 md:grid-cols-6 gap-4'>
                    {allPhotos.map((photo, i) => (
                        <div key={i} className='relative group'>
                            {photo.data ? (
                                <img
                                    src={photo.data}
                                    alt=''
                                    className='w-full aspect-square object-cover rounded-lg cursor-zoom-in'
                                    onClick={() => setSelectedImg(photo.data)}
                                    onError={e => {
                                        e.target.style.display = 'none'
                                        e.target.nextSibling.style.display = 'flex'
                                    }}
                                />
                            ) : null}
                            <div className={`photo-placeholder ${photo.data ? 'hidden' : ''}`}>
                                {Icons.image}
                                <span className='text-xs mt-1'>{photo.type}</span>
                            </div>
                            <div
                                className='absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center text-xs cursor-zoom-in'
                                onClick={() => photo.data && setSelectedImg(photo.data)}
                            >
                                <span className='text-white'>{photo.redacteur}</span>
                                <span
                                    className={`px-2 py-0.5 rounded mt-1 ${photo.type === 'Probleme' ? 'bg-red-500' : 'bg-purple-500'}`}
                                >
                                    {photo.type}
                                </span>
                                {photo.geolocation?.latitude && (
                                    <span className='flex items-center gap-1 mt-1 text-green-400'>
                                        {Icons.mapPin} GPS
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

const ExtrasView = ({ rapports, onMarkFacture }) => {
    const allExtras = rapports
        .filter(r => r.hasExtras && !r.extrasFactures)
        .map(r => ({
            ...r,
            projet: PROJETS.find(p => p.id === r.projet)?.nom,
            extras: r.ordresTravail?.filter(o => o.isExtra) || [],
        }))
    const totalUnbilled = allExtras.reduce((acc, r) => acc + (r.totalExtras || 0), 0)
    return (
        <div className='animate-fade'>
            <div className='flex items-center justify-between mb-4'>
                <div className='section-title mb-0 border-0 pb-0'>EXTRAS A FACTURER</div>
                <div className='text-2xl font-bebas' style={{ color: '#ffc800' }}>
                    ${totalUnbilled.toLocaleString()}
                </div>
            </div>
            {allExtras.length === 0 ? (
                <div className='text-center py-16' style={{ color: '#00ff00' }}>
                    <div className='text-4xl mb-4'>✓</div>Tous les extras sont factures!
                </div>
            ) : (
                <div className='space-y-4'>
                    {allExtras.map(rapport => (
                        <div key={rapport.id} className='extra-card p-4'>
                            <div className='flex items-center justify-between mb-3'>
                                <div>
                                    <div className='font-medium'>{rapport.redacteur}</div>
                                    <div className='text-xs text-gray-400'>
                                        {rapport.projet} - {formatDate(rapport.date)}
                                    </div>
                                </div>
                                <div className='text-2xl font-bebas' style={{ color: '#ffc800' }}>
                                    ${rapport.totalExtras}
                                </div>
                            </div>
                            {rapport.extras.map((extra, i) => (
                                <div key={i} className='text-sm mb-1 text-gray-300'>
                                    • {extra.description} -{' '}
                                    <span style={{ color: '#ffc800' }}>${extra.montantExtra}</span>
                                </div>
                            ))}
                            <button
                                onClick={() => onMarkFacture(rapport.id)}
                                className='btn-primary w-full mt-4 text-sm'
                            >
                                {Icons.check} MARQUER FACTURE
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function Dashboard() {
    const [searchParams, setSearchParams] = useSearchParams()

    const [rapports, setRapports] = useState([])
    const [loading, setLoading] = useState(true)

    // Initialize state from URL params or defaults
    const [selectedDate, setSelectedDate] = useState(searchParams.get('date') || getTodayStr())
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'dashboard')
    const [filterProjet, setFilterProjet] = useState(searchParams.get('project') ? parseInt(searchParams.get('project')) : null)

    // Sync state to URL
    useEffect(() => {
        const params = {}
        if (activeTab !== 'dashboard') params.tab = activeTab
        params.date = selectedDate
        if (filterProjet) params.project = filterProjet.toString()
        setSearchParams(params, { replace: true })
    }, [activeTab, selectedDate, filterProjet])

    const loadRapports = async () => {
        try {
            // Charger rapports
            const { data: rapportsData, error: rapportsError } = await supabase
                .from('rapports')
                .select('*')
                .order('created_at', { ascending: false })
            if (rapportsError) throw rapportsError

            // Charger photos
            const { data: photosData, error: photosError } = await supabase
                .from('photos')
                .select('*')
            if (photosError) {
                console.warn('Supabase photos warning:', photosError)
            }

            // Convertir snake_case -> camelCase
            const hasPhotoTable = !photosError && Array.isArray(photosData) && photosData.length > 0
            const normalizeRapportPhotos = photos =>
                (photos || []).map(p => ({
                    data: p.url || p.data || p.storageUrl || p.storagePath,
                    geolocation: p.gps || p.geolocation || null,
                }))

            const converted = (rapportsData || []).map(r => {
                const rapport = snakeToCamel(r)
                if (hasPhotoTable) {
                    // Attacher les photos au rapport depuis la table photos
                    const rapportPhotos = (photosData || []).filter(p => p.rapport_id === r.id)
                    rapport.photosGenerales = rapportPhotos
                        .filter(p => p.category === 'GENERAL')
                        .map(p => ({
                            data: p.url,
                            geolocation: { latitude: p.latitude, longitude: p.longitude },
                        }))
                    rapport.photosAvant = rapportPhotos
                        .filter(p => p.category === 'AVANT')
                        .map(p => ({
                            data: p.url,
                            geolocation: { latitude: p.latitude, longitude: p.longitude },
                        }))
                    rapport.photosApres = rapportPhotos
                        .filter(p => p.category === 'APRES')
                        .map(p => ({
                            data: p.url,
                            geolocation: { latitude: p.latitude, longitude: p.longitude },
                        }))
                    rapport.photosProblemes = rapportPhotos
                        .filter(p => p.category === 'PROBLEME')
                        .map(p => ({
                            data: p.url,
                            geolocation: { latitude: p.latitude, longitude: p.longitude },
                        }))
                } else {
                    rapport.photosGenerales = normalizeRapportPhotos(rapport.photosGenerales)
                    rapport.photosAvant = normalizeRapportPhotos(rapport.photosAvant)
                    rapport.photosApres = normalizeRapportPhotos(rapport.photosApres)
                    rapport.photosProblemes = normalizeRapportPhotos(rapport.photosProblemes)
                }
                return rapport
            })
            setRapports(converted)
            console.log('✅ Loaded', converted.length, 'reports from Supabase')
        } catch (err) {
            console.error('❌ Erreur Supabase:', err)
            setRapports([])
        }
    }

    useEffect(() => {
        loadRapports()

        // Supabase Realtime subscription for instant updates
        const subscription = supabase
            .channel('rapports-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'rapports' },
                payload => {
                    console.log('🔄 Realtime update:', payload.eventType)
                    loadRapports() // Reload on any change
                }
            )
            .subscribe(status => {
                console.log('📡 Realtime status:', status)
            })

        // Fallback polling every 30s
        const interval = setInterval(loadRapports, 30000)

        return () => {
            clearInterval(interval)
            subscription.unsubscribe()
        }
    }, [])

    // Clear filter when changing tabs
    useEffect(() => {
        if (activeTab !== 'rapports') {
            setFilterProjet(null)
        }
    }, [activeTab])

    const markFacture = async rapportId => {
        const { error } = await supabase
            .from('rapports')
            .update({ extras_factures: true })
            .eq('id', rapportId)
        if (error) {
            console.error('Supabase error:', error)
            return
        }
        loadRapports()
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return (
                    <DashboardView
                        rapports={rapports}
                        selectedDate={selectedDate}
                        setActiveTab={setActiveTab}
                        setFilterProjet={setFilterProjet}
                    />
                )
            case 'rapports':
                return (
                    <RapportsView
                        rapports={rapports}
                        selectedDate={selectedDate}
                        filterProjet={filterProjet}
                        setFilterProjet={setFilterProjet}
                    />
                )
            case 'ordres':
                return <OrdresView rapports={rapports} selectedDate={selectedDate} />
            case 'reunions':
                return <ReunionsView rapports={rapports} selectedDate={selectedDate} />
            case 'photos':
                return <PhotosView rapports={rapports} selectedDate={selectedDate} />
            case 'extras':
                return <ExtrasView rapports={rapports} onMarkFacture={markFacture} />
            default:
                return (
                    <DashboardView
                        rapports={rapports}
                        selectedDate={selectedDate}
                        setActiveTab={setActiveTab}
                        setFilterProjet={setFilterProjet}
                    />
                )
        }
    }

    return (
        <div>
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            <div className='main-content'>
                <Header
                    userName='Francis Vegiard'
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    setFilterProjet={setFilterProjet}
                />
                {renderContent()}
            </div>
        </div>
    )
}
