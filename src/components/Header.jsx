import React from 'react'
import { Icons } from '../utils/Icons'

export const Header = () => (
    <header className='glass sticky top-0 z-50 px-4 py-3 safe-area-top'>
        <div className='max-w-2xl mx-auto flex items-center gap-3'>
            <div className='w-11 h-11 bg-[#E63946] rounded-xl flex items-center justify-center font-bebas text-white text-xl shadow-lg shadow-red-500/20'>
                DR
            </div>
            <div>
                <h1 className='font-bebas text-white text-xl tracking-wide'>RAPPORT JOURNALIER</h1>
                <p className='text-[10px] text-gray-500 -mt-0.5'>Groupe DR Électrique Inc.</p>
            </div>
        </div>
    </header>
)
