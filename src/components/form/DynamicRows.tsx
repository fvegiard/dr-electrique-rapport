import { Icons } from '../ui/Icons';
import TimePicker from './TimePicker';

interface FieldConfig {
  key: string;
  placeholder?: string;
  type?: string;
  width?: string;
  options?: string[] | { value: string; label: string }[];
  default?: string;
}

interface DynamicRowsProps<T extends { id: string }> {
  rows: T[];
  setRows: (rows: T[]) => void;
  fields: FieldConfig[];
  addLabel: string;
  color?: string;
}

function DynamicRows<T extends { id: string }>({ rows, setRows, fields, addLabel, color = '#E63946' }: DynamicRowsProps<T>) {
  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

  const addRow = () => {
    const newRow = { id: generateId() } as Record<string, string> & { id: string };
    fields.forEach(f => { newRow[f.key] = f.default || ''; });
    setRows([...rows, newRow as T]);
  };

  const updateRow = (id: string, key: string, value: string) => {
    setRows(rows.map(r => (r.id === id ? { ...r, [key]: value } : r)));
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) setRows(rows.filter(r => r.id !== id));
  };

  const getFieldValue = (row: T, key: string): string => {
    const val = (row as Record<string, unknown>)[key];
    return val != null ? String(val) : '';
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
                  value={getFieldValue(row, field.key)}
                  onChange={e => updateRow(row.id, field.key, e.target.value)}
                  className='px-3 py-3 rounded-xl bg-black/40 border border-white/10 text-white w-full'
                >
                  <option value=''>{field.placeholder}</option>
                  {field.options?.map(opt => {
                    const val = typeof opt === 'string' ? opt : opt.value;
                    const label = typeof opt === 'string' ? opt : opt.label;
                    return (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              ) : field.type === 'datalist' ? (
                <div key={field.key}>
                  <input
                    list={`list-${field.key}-${row.id}`}
                    value={getFieldValue(row, field.key)}
                    onChange={e => updateRow(row.id, field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className='w-full px-3 py-3 rounded-xl bg-black/40 border border-white/10 text-white'
                  />
                  <datalist id={`list-${field.key}-${row.id}`}>
                    {field.options?.map(opt => {
                      const val = typeof opt === 'string' ? opt : opt.value;
                      return <option key={val} value={val} />;
                    })}
                  </datalist>
                </div>
              ) : field.type === 'time-picker' ? (
                <TimePicker
                  key={field.key}
                  value={getFieldValue(row, field.key) || '06:00'}
                  onChange={val => updateRow(row.id, field.key, val)}
                  label={field.placeholder}
                />
              ) : (
                <input
                  key={field.key}
                  type={field.type || 'text'}
                  inputMode={field.type === 'number' ? 'decimal' : 'text'}
                  placeholder={field.placeholder}
                  value={getFieldValue(row, field.key)}
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
}

export default DynamicRows;
