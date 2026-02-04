import React from 'react'
import { Link } from 'react-router-dom'

export default function Home() {
    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4 font-sans">
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-bold text-green-500 mb-2">DR ÉLECTRIQUE</h1>
                <p className="text-gray-400">Système de Rapports Journaliers</p>
            </div>

            <div className="grid gap-4 w-full max-w-md">
                <Link
                    to="/dashboard"
                    className="p-6 bg-[#1a1a1a] border border-purple-500/30 rounded-xl hover:border-purple-500 transition-all group"
                >
                    <h2 className="text-xl font-bold text-purple-400 mb-1 group-hover:text-purple-300">📊 Dashboard</h2>
                    <p className="text-sm text-gray-500">Gestion et vue d'ensemble</p>
                </Link>

                <Link
                    to="/rapport/nouveau"
                    className="p-6 bg-[#1a1a1a] border border-red-500/30 rounded-xl hover:border-red-500 transition-all group"
                >
                    <h2 className="text-xl font-bold text-red-500 mb-1 group-hover:text-red-400">📝 Nouveau Rapport</h2>
                    <p className="text-sm text-gray-500">Formulaire journalier chantier</p>
                </Link>
            </div>
        </div>
    )
}
