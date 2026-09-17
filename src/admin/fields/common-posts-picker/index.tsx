import React, { useEffect, useState } from 'react';

interface SelectedEntry {
  id: number;
  type: 'post' | 'page';
}

interface Item {
  id: number;
  title?: string;
  attributes?: { title?: string; main_title?: string };
}

const fetchItems = async (type: 'post' | 'page'): Promise<Item[]> => {
  const plural = type === 'post' ? 'posts' : 'pages';
  const res = await fetch(`/api/${plural}?pagination[page]=1&pagination[pageSize]=100&fields=id,title`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
};

const parseValue = (raw: any): SelectedEntry[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
};

interface Props {
  name: string;
  value: any;
  onChange: (e: { target: { name: string; value: any; type: string } }) => void;
  attribute?: any;
}

const CommonPostsPicker = ({ name, value, onChange }: Props) => {
  const [items, setItems] = useState<Item[]>([]);
  const [type, setType] = useState<'post' | 'page'>('post');
  const selected = parseValue(value);

  useEffect(() => {
    let mounted = true;
    fetchItems(type).then((data) => { if (mounted) setItems(data); });
    return () => { mounted = false; };
  }, [type]);

  const toggle = (id: number) => {
    const exists = selected.find((s) => s.id === id && s.type === type);
    const next = exists
      ? selected.filter((s) => !(s.id === id && s.type === type))
      : [...selected, { id, type }];
    onChange({ target: { name, value: next, type: 'json' } });
  };

  const selectedForType = selected.filter((s) => s.type === type);

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden' }}>
      {/* Tab switcher */}
      <div style={{ display: 'flex', borderBottom: '1px solid #ddd', background: '#f9f9f9' }}>
        {(['post', 'page'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            style={{
              flex: 1,
              padding: '8px 0',
              border: 'none',
              borderBottom: type === t ? '2px solid #4945ff' : '2px solid transparent',
              background: 'transparent',
              fontWeight: type === t ? 600 : 400,
              color: type === t ? '#4945ff' : '#666',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {t === 'post' ? 'Posts' : 'Pages'} {selected.filter((s) => s.type === t).length > 0 && `(${selected.filter((s) => s.type === t).length})`}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        {items.length === 0 && (
          <div style={{ padding: '12px 16px', color: '#999', fontSize: 13 }}>No {type}s found</div>
        )}
        {items.map((item) => {
          const id = item.id;
          const title = item.attributes?.title || item.attributes?.main_title || (item as any).title || 'Untitled';
          const checked = !!selected.find((s) => s.id === id && s.type === type);
          return (
            <label
              key={id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 16px',
                cursor: 'pointer',
                borderBottom: '1px solid #f3f3f3',
                background: checked ? '#f0efff' : 'transparent',
              }}
            >
              <input type="checkbox" checked={checked} onChange={() => toggle(id)} style={{ cursor: 'pointer' }} />
              <span style={{ fontSize: 13 }}>{title}</span>
            </label>
          );
        })}
      </div>

      {/* Footer */}
      {selected.length > 0 && (
        <div style={{ padding: '6px 16px', borderTop: '1px solid #f3f3f3', background: '#f9f9f9', fontSize: 12, color: '#666' }}>
          Selected: {selectedForType.length} {type}(s) &nbsp;|&nbsp; Total: {selected.length}
        </div>
      )}
    </div>
  );
};

export default CommonPostsPicker;
