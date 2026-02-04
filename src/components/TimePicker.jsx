import React from 'react'

export const TimePicker = ({ value, onChange, label }) => {
    // value format: "HH:MM" ou { hours: 0, minutes: 0 }
    const parseTime = val => {
        if (typeof val === 'string' && val.includes(':')) {
            const [h, m] = val.split(':').map(Number)
            return { hours: h || 0, minutes: m || 0 }
        }
        return { hours: 0, minutes: 0 }
    }

    const time = parseTime(value)

    const formatTime = (h, m) => {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }

    const adjustHours = delta => {
        let newHours = time.hours + delta
        if (newHours > 23) newHours = 0
        if (newHours < 0) newHours = 23
        onChange(formatTime(newHours, time.minutes))
    }

    const handleMinutesChange = newMinutes => {
        onChange(formatTime(time.hours, parseInt(newMinutes)))
    }

    return (
        <div className='flex flex-col gap-1'>
            {label && <label className='text-[10px] text-gray-500 font-medium'>{label}</label>}
            <div className='flex items-center gap-2'>
                {/* Hours section with UP/DOWN arrows */}
                <div className='flex flex-col items-center'>
                    <button
                        type='button'
                        onClick={() => adjustHours(1)}
                        className='time-picker-btn w-10 h-8 text-lg'
                        title='Heures +1'
                    >
                        ▲
                    </button>
                    <div className='time-display text-white bg-black/40 px-3 py-1 rounded-lg border border-white/10 text-xl min-w-[50px]'>
                        {String(time.hours).padStart(2, '0')}
                    </div>
                    <button
                        type='button'
                        onClick={() => adjustHours(-1)}
                        className='time-picker-btn w-10 h-8 text-lg'
                        title='Heures -1'
                    >
                        ▼
                    </button>
                </div>

                <span className='text-white text-2xl font-bebas'>:</span>

                {/* Minutes section with dropdown */}
                <div className='flex flex-col items-center'>
                    <select
                        value={time.minutes}
                        onChange={e => handleMinutesChange(e.target.value)}
                        className='time-display text-white bg-black/40 px-3 py-2 rounded-lg border border-white/10 text-xl min-w-[60px] text-center cursor-pointer'
                        style={{
                            backgroundImage: 'none',
                            paddingRight: '12px',
                            appearance: 'none',
                            WebkitAppearance: 'none',
                        }}
                    >
                        <option value={0}>00</option>
                        <option value={15}>15</option>
                        <option value={30}>30</option>
                        <option value={45}>45</option>
                    </select>
                </div>
            </div>
            <p className='text-[9px] text-gray-600'>▲▼ Heures | Minutes ▼</p>
        </div>
    )
}
