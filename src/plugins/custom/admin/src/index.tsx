import React, { useEffect, useMemo, useState } from 'react';

const MAX = 6;

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
  const res = await fetch(`/api/${plural}?pagination[page]=1&pagination[pageSize]=200&fields=id,title`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
};

const getTitle = (item: Item): string =>
  item.attributes?.title || item.attributes?.main_title || (item as any).title || 'Untitled';

const parseValue = (raw: any, fallbackType: 'post' | 'page'): SelectedEntry[] => {
  let arr: any[] = [];
  if (!raw) return [];
  if (Array.isArray(raw)) arr = raw;
  else if (typeof raw === 'string') {
    try { arr = JSON.parse(raw); } catch { return []; }
    if (!Array.isArray(arr)) return [];
  } else return [];

  return arr
    .filter((s) => s !== null && s !== undefined)
    .map((s) => {
      if (typeof s === 'object' && s !== null && s.id && s.type) {
        return { id: Number(s.id), type: s.type as 'post' | 'page' };
      }
      const id = Number(s);
      return (!isNaN(id) && id > 0) ? { id, type: fallbackType } : null;
    })
    .filter((s): s is SelectedEntry => s !== null);
};

interface Props {
  name: string;
  value: any;
  onChange: (e: { target: { name: string; value: any; type: string } }) => void;
  attribute?: any;
  [key: string]: any;
}

const CommonPostsPicker = ({ name, value, onChange, ...rest }: Props) => {
  const [allItems, setAllItems] = useState<{ post: Item[]; page: Item[] }>({ post: [], page: [] });
  const [tab, setTab] = useState<'post' | 'page'>('post');
  const [search, setSearch] = useState('');
  const [loaded, setLoaded] = useState(false);

  const fallbackType: 'post' | 'page' =
    (rest as any)?.formValues?.post_type ||
    (rest as any)?.post_type ||
    'page';

  const selected = parseValue(value, fallbackType);

  // Flat map: id → { title, type } searching both lists
  const titleMap = useMemo<Record<number, { title: string; type: 'post' | 'page' }>>(() => {
    const map: Record<number, { title: string; type: 'post' | 'page' }> = {};
    allItems.post.forEach((item) => { map[item.id] = { title: getTitle(item), type: 'post' }; });
    allItems.page.forEach((item) => { map[item.id] = { title: getTitle(item), type: 'page' }; });
    return map;
  }, [allItems]);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchItems('post'), fetchItems('page')]).then(([posts, pages]) => {
      if (mounted) { setAllItems({ post: posts, page: pages }); setLoaded(true); }
    });
    return () => { mounted = false; };
  }, []);

  // Migrate legacy string-ID array once items are loaded
  useEffect(() => {
    if (!loaded || !value) return;
    const raw = Array.isArray(value) ? value
      : (() => { try { return JSON.parse(value); } catch { return []; } })();
    if (!Array.isArray(raw) || raw.length === 0) return;
    const isLegacy = typeof raw[0] === 'string' || typeof raw[0] === 'number';
    if (!isLegacy) return;
    const migrated = raw
      .map((s: any) => {
        const id = Number(s);
        if (isNaN(id) || id <= 0) return null;
        // Use titleMap to determine correct type
        const found = titleMap[id];
        return { id, type: found ? found.type : fallbackType };
      })
      .filter(Boolean);
    onChange({ target: { name, value: migrated, type: 'json' } });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (allItems[tab] ?? []).filter((item) => getTitle(item).toLowerCase().includes(q));
  }, [allItems, tab, search]);

  const toggle = (id: number) => {
    const exists = selected.find((s) => s.id === id && s.type === tab);
    if (!exists && selected.length >= MAX) return;
    const next = exists
      ? selected.filter((s) => !(s.id === id && s.type === tab))
      : [...selected, { id, type: tab }];
    onChange({ target: { name, value: next, type: 'json' } });
  };

  const remove = (entry: SelectedEntry) => {
    onChange({
      target: {
        name,
        value: selected.filter((s) => !(s.id === entry.id && s.type === entry.type)),
        type: 'json',
      },
    });
  };

  // Resolve title from flat map — works for both legacy and new format
  const getEntryLabel = (entry: SelectedEntry): string =>
    titleMap[entry.id]?.title ?? `#${entry.id}`;

  const getEntryType = (entry: SelectedEntry): 'post' | 'page' =>
    titleMap[entry.id]?.type ?? entry.type;

  const atMax = selected.length >= MAX;

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden', fontFamily: 'sans-serif' }}>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #ddd', background: '#f9f9f9' }}>
        {(['post', 'page'] as const).map((t) => {
          const count = selected.filter((s) => (titleMap[s.id]?.type ?? s.type) === t).length;
          return (
            <button key={t} type="button" onClick={() => { setTab(t); setSearch(''); }}
              style={{
                flex: 1, padding: '8px 0', border: 'none',
                borderBottom: tab === t ? '2px solid #4945ff' : '2px solid transparent',
                background: 'transparent', fontWeight: tab === t ? 600 : 400,
                color: tab === t ? '#4945ff' : '#666', cursor: 'pointer',
              }}
            >
              {t === 'post' ? 'Posts' : 'Pages'}{count > 0 ? ` (${count})` : ''}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
        <input
          type="text"
          placeholder={`Search ${tab}s...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '6px 10px', border: '1px solid #ddd',
            borderRadius: 4, fontSize: 13, boxSizing: 'border-box', outline: 'none',
          }}
        />
      </div>

      {/* List */}
      <div style={{ maxHeight: 220, overflowY: 'auto' }}>
        {!loaded && (
          <div style={{ padding: '12px 16px', color: '#aaa', fontSize: 13 }}>Loading...</div>
        )}
        {loaded && filtered.length === 0 && (
          <div style={{ padding: '12px 16px', color: '#999', fontSize: 13 }}>
            {search ? `No results for "${search}"` : `No ${tab}s found`}
          </div>
        )}
        {loaded && filtered.map((item) => {
          const id = item.id;
          const title = getTitle(item);
          const checked = !!selected.find((s) => s.id === id && s.type === tab);
          const disabled = !checked && atMax;
          return (
            <label key={id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 16px', cursor: disabled ? 'not-allowed' : 'pointer',
              borderBottom: '1px solid #f3f3f3',
              background: checked ? '#f0efff' : 'transparent',
              opacity: disabled ? 0.45 : 1,
            }}>
              <input type="checkbox" checked={checked} disabled={disabled}
                onChange={() => toggle(id)} style={{ cursor: disabled ? 'not-allowed' : 'pointer' }} />
              <span style={{ fontSize: 13 }}>{title}</span>
            </label>
          );
        })}
      </div>

      {/* Selected tags */}
      {selected.length > 0 && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid #eee', background: '#fafafa' }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
            Selected ({selected.length}/{MAX}){atMax ? ' — max reached' : ''}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {selected.map((entry) => {
              const resolvedType = getEntryType(entry);
              const label = loaded ? getEntryLabel(entry) : `#${entry.id}`;
              return (
                <span key={`${entry.type}-${entry.id}`} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', borderRadius: 12,
                  background: resolvedType === 'post' ? '#e8e8ff' : '#e8f4ff',
                  border: `1px solid ${resolvedType === 'post' ? '#b0aeff' : '#90caf9'}`,
                  fontSize: 12, color: '#333',
                }}>
                  <span style={{ fontSize: 10, opacity: 0.6, textTransform: 'uppercase' }}>{resolvedType}</span>
                  {label}
                  <button type="button" onClick={() => remove(entry)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: 0, lineHeight: 1, color: '#888', fontSize: 14,
                  }}>×</button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default {
  register(app: any) {
    app.customFields.register({
      name: 'common-posts-picker',
      pluginId: 'custom',
      type: 'json',
      intlLabel: { id: 'custom.common-posts-picker.label', defaultMessage: 'Posts/Pages Picker' },
      intlDescription: { id: 'custom.common-posts-picker.description', defaultMessage: 'Select posts or pages to display' },
      components: {
        Input: async () => ({ default: CommonPostsPicker }),
      },
    });
  },
};
