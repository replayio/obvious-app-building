import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useAppStore } from '../../store';

export function SearchModal() {
  const navigate = useNavigate();
  const { documents, collections, setSearchOpen, setActiveDocument, setActiveCollection } = useAppStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const docResults = Object.values(documents).filter((doc) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return doc.title.toLowerCase().includes(q) || doc.content.toLowerCase().includes(q);
  }).slice(0, 8);

  const colResults = Object.values(collections).filter((col) =>
    !query || col.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 4);

  const handleSelectDoc = (id: string) => {
    setActiveDocument(id);
    navigate(`/doc/${id}`);
    setSearchOpen(false);
  };

  const handleSelectCol = (id: string) => {
    setActiveCollection(id);
    navigate(`/collection/${id}`);
    setSearchOpen(false);
  };

  const hasResults = docResults.length > 0 || colResults.length > 0;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-start justify-center pt-[15vh] z-50"
      onClick={() => setSearchOpen(false)}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <Search size={18} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') setSearchOpen(false); }}
            placeholder="Search pages, collections…"
            className="flex-1 text-base text-gray-800 placeholder-gray-400 outline-none bg-transparent"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          )}
          <kbd className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded font-mono">esc</kbd>
        </div>

        <div className="max-h-[400px] overflow-y-auto py-2">
          {!hasResults && query && (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">No results for "{query}"</div>
          )}

          {colResults.length > 0 && (
            <div className="mb-2">
              <div className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Collections</div>
              {colResults.map((col) => (
                <button
                  key={col.id}
                  onClick={() => handleSelectCol(col.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-xl">{col.icon}</span>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-800">{col.name}</div>
                    <div className="text-xs text-gray-400">{col.documents.length} items</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {docResults.length > 0 && (
            <div>
              <div className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Pages</div>
              {docResults.map((doc) => {
                let preview = '';
                try {
                  const parsed = JSON.parse(doc.content) as { content?: Array<{ content?: Array<{ text?: string }> }> };
                  const texts: string[] = [];
                  parsed.content?.forEach((node) => node.content?.forEach((child) => { if (child.text) texts.push(child.text); }));
                  preview = texts.join(' ').slice(0, 80);
                } catch { preview = ''; }

                return (
                  <button key={doc.id} onClick={() => handleSelectDoc(doc.id)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                    <span className="text-xl flex-shrink-0">{doc.icon}</span>
                    <div className="text-left min-w-0">
                      <div className="text-sm font-medium text-gray-800">{doc.title}</div>
                      {preview && <div className="text-xs text-gray-400 truncate">{preview}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!query && <div className="px-4 py-3 text-xs text-gray-400">Type to search across all pages and collections</div>}
        </div>

        <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-400">
          <span><kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">↵</kbd> Open</span>
          <span><kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
