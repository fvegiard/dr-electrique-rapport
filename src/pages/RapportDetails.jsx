
import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient'
import { Icons } from '../utils/Icons'
import { PROJETS } from '../utils/constants'

const formatDate = d => new Date(d).toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

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

export default function RapportDetails() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [rapport, setRapport] = useState(null)
    const [loading, setLoading] = useState(true)
    const [selectedImg, setSelectedImg] = useState(null)

    useEffect(() => {
        const fetchRapport = async () => {
            const { data, error } = await supabase
                .from('rapports')
                .select('*')
                .eq('id', id)
                .single()

            if (data) {
                setRapport(snakeToCamel(data))
            }
            setLoading(false)
        }
        fetchRapport()
    }, [id])

    if (loading) return <div className="min-h-screen bg-[#111] text-white flex items-center justify-center">Chargement...</div>
    if (!rapport) return <div className="min-h-screen bg-[#111] text-white flex items-center justify-center">Rapport introuvable</div>

    const projet = PROJETS.find(p => p.id === rapport.projet)

    return (
        <div className="min-h-screen bg-[#111] text-gray-200 p-6 md:p-10 font-sans">
            {/* LIGHTBOX MODAL */}
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

            <div className="max-w-6xl mx-auto space-y-8">

                {/* HEADER NAVIGATION */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                        ← Retour
                    </button>
                    <div className="flex gap-3">
                        <button className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-sm">Imprimer / PDF</button>
                        <Link to={`/rapport/${id}`} className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 text-sm font-medium">
                            ✏️ Éditer
                        </Link>
                    </div>
                </div>

                {/* PROJECT HEADER */}
                <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/10 shadow-xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bebas tracking-wide text-white mb-1">
                                {projet?.nom || rapport.projetNom || 'PROJET INCONNU'}
                            </h1>
                            <div className="text-gray-400 flex items-center gap-2">
                                <span>📅 {formatDate(rapport.date)}</span>
                                <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                                <span>👤 {rapport.redacteur}</span>
                            </div>
                            <div className="mt-4 flex gap-4 text-sm">
                                <div className="bg-black/30 px-3 py-1.5 rounded flex items-center gap-2">
                                    {rapport.meteo === 'soleil' ? '☀️' : '🌤️'} {rapport.meteo}
                                </div>
                                {rapport.temperature && (
                                    <div className="bg-black/30 px-3 py-1.5 rounded">
                                        🌡️ {rapport.temperature}°C
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-4xl font-bebas text-green-500">
                                {rapport.totalHeuresMo || 0}h
                            </div>
                            <div className="text-xs text-gray-500 uppercase tracking-widest">Heures Totales</div>
                        </div>
                    </div>
                </div>

                {/* PHOTOS SECTION - CLICKABLE */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-2">
                        {Icons.camera}
                        <h2 className="font-bebas text-xl text-green-400">DOCUMENTATION VISUELLE (Cliquer pour agrandir)</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* AVANT */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-blue-400 border-l-2 border-blue-500 pl-2">TRAVAIL AVANT</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                {rapport.photosAvant?.map((p, i) => (
                                    <div
                                        key={i}
                                        className="aspect-square bg-black rounded-lg overflow-hidden border border-white/10 cursor-zoom-in group relative"
                                        onClick={() => setSelectedImg(p.data || p)}
                                    >
                                        <img src={p.data || p} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">🔍</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* APRES */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-green-400 border-l-2 border-green-500 pl-2">TRAVAIL TERMINÉ (APRÈS)</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                {rapport.photosApres?.map((p, i) => (
                                    <div
                                        key={i}
                                        className="aspect-square bg-black rounded-lg overflow-hidden border border-white/10 cursor-zoom-in group relative"
                                        onClick={() => setSelectedImg(p.data || p)}
                                    >
                                        <img src={p.data || p} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">🔍</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* MAIN D'OEUVRE */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-2">
                        {Icons.users}
                        <h2 className="font-bebas text-xl text-yellow-400">MAIN D'OEUVRE</h2>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a]">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-black/40 text-gray-400 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Employé</th>
                                    <th className="px-4 py-3 font-medium">Période</th>
                                    <th className="px-4 py-3 font-medium text-right">Total</th>
                                    <th className="px-4 py-3 font-medium">Détails</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {rapport.mainOeuvre?.map((m, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-3 font-medium text-white">{m.employe}</td>
                                        <td className="px-4 py-3 text-gray-400">{m.heureDebut} - {m.heureFin}</td>
                                        <td className="px-4 py-3 text-right text-yellow-400 font-mono">
                                            {m.heureDebut && m.heureFin ? (
                                                ((parseInt(m.heureFin.split(':')[0]) + parseInt(m.heureFin.split(':')[1]) / 60) -
                                                    (parseInt(m.heureDebut.split(':')[0]) + parseInt(m.heureDebut.split(':')[1]) / 60)).toFixed(1) + 'h'
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 italic">{m.description}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* MATERIALS AND NOTES ... (Same as before) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* ... Keeping existing structure mostly ... */}
                    <div>
                        <h2 className="font-bebas text-xl text-cyan-400 border-b border-white/10 pb-2 mb-4">MATÉRIAUX UTILISÉS</h2>
                        <ul className="space-y-2">
                            {rapport.materiaux?.map((m, i) => (
                                <li key={i} className="flex justify-between items-center bg-[#1a1a1a] p-2 rounded border border-white/5">
                                    <span>{m.item}</span>
                                    <span className="font-mono text-cyan-400">x{m.quantite} {m.unite}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h2 className="font-bebas text-xl text-gray-400 border-b border-white/10 pb-2 mb-4">NOTES</h2>
                        <div className="space-y-4">
                            {rapport.problemesSecurite && (
                                <div className="bg-red-500/10 p-3 rounded border border-red-500/20">
                                    <div className="text-xs text-red-400 mb-1">SÉCURITÉ</div>
                                    <div className="text-sm text-red-200">{rapport.problemesSecurite}</div>
                                </div>
                            )}
                            {rapport.notesGenerales && <div className="text-sm bg-[#1a1a1a] p-3 rounded">{rapport.notesGenerales}</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
