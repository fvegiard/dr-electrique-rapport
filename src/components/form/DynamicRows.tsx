import React from 'react';
import { Icons } from '../ui/Icons';
import TimePicker from './TimePicker';

interface FieldConfig {
  key: string;
  placeholder?: string;
  type?: string;
  width?: string;
  options?: string[] | { value: string; label: string }[];
  default?: any;
}

interface DynamicRowsProps {
  rows: any[];
  setRows: (rows: any[]) => void;
  fields: FieldConfig[];
  addLabel: string;
  color?: string;
}

const DynamicRows: React.FC<DynamicRowsProps> = ({ rows, setRows, fields, addLabel, color = '#E63946' }) => {
  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

  const addRow = () => {
    const newRow: any = { id: generateId() };
    fields.forEach(f => (newRow[f.key] = f.default || ''));
    setRows([...rows, newRow]);
  };

  const updateRow = (id: string, key: string, value: any) => {
    setRows(rows.map(r => (r.id === id ? { ...r, [key]: value } : r)));
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) setRows(rows.filter(r => r.id !== id));
  };

  return (
    <div className='space-y-3'>
      {rows.map(row => (
        <div key={row.id} className='flex gap-2 animate-slide-up'>
          <div
            className='flex-1 grid gap-2'
            style={{ gridTemplateColumns: fields.map(f => f.width || '1fr').join(' ') }}
          >
            {fields.map(field =>
              field.type === 'select' ? (
                <select
                  key={field.key}
                  value={row[field.key] || ''}
                  onChange={e => updateRow(row.id, field.key, e.target.value)}
                  className='px-3 py-3 rounded-xl bg-black/40 border border-white/10 text-white w-full'
                >
                  <option value=''>{field.placeholder}</option>
                  {field.options?.map((opt: any) => (
                    <option key={opt.value || opt} value={opt.value || opt}>
                      {opt.label || opt}
                    </option>
                  ))}
                </select>
              ) : field.type === 'datalist' ? (
                <div key={field.key}>
                  <input
                    list={`list-${field.key}-${row.id}`}
                    value={row[field.key] || ''}
                    onChange={e => updateRow(row.id, field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className='w-full px-3 py-3 rounded-xl bg-black/40 border border-white/10 text-white'
                  />
                  <datalist id={`list-${field.key}-${row.id}`}>
                    {field.options?.map((opt: any) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>
              ) : field.type === 'time-picker' ? (
                <TimePicker
                  key={field.key}
                  value={row[field.key] || '06:00'}
                  onChange={val => updateRow(row.id, field.key, val)}
                  label={field.placeholder}
                />
              ) : (
                <input
                  key={field.key}
                  type={field.type || 'text'}
                  inputMode={field.type === 'number' ? 'decimal' : 'text'}
                  placeholder={field.placeholder}
                  value={row[field.key] || ''}
                  onChange={e => updateRow(row.id, field.key, e.target.value)}
                  className='px-3 py-3 rounded-xl bg-black/40 border border-white/10 text-white w-full'
                />
              )
            )}
          </div>
          <button
            type='button'
            onClick={() => removeRow(row.id)}
            className='p-3 text-gray-600 hover:text-red-500 active:scale-95 transition-all rounded-xl'
            disabled={rows.length === 1}
          >
            {Icons.trash}
          </button>
        </div>
      ))}
      <button
        type='button'
        onClick={addRow}
        className='w-full py-3 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all active:scale-[0.98]'
        style={{ borderColor: `${color}40`, color: color }}
      >
        {Icons.plus} {addLabel}
      </button>
    </div>
  );
};

export default DynamicRows;
