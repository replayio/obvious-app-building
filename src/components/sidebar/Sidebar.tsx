import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search, Plus, ChevronDown, ChevronRight,
  Users, Settings, PanelLeftClose, PanelLeft, Home,
} from 'lucide-react';
import { useAppStore } from '../../store';

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    collections, currentWorkspace,
    sidebarCollapsed, setSidebarCollapsed,
    setSearchOpen, createDocument, createCollection,
    setActiveDocument, setActiveCollection, documents,
  } = useAppStore();

  const [pagesExpanded, setPagesExpanded] = useState(true);
  const [collectionsExpanded, setCollectionsExpanded] = useState(true);

  const standaloneDocs = Object.values(documents)
    .filter((d) => !d.collectionId)
    .sort((a, b) => a.order - b.order);

  const allCollections = Object.values(collections);

  if (sidebarCollapsed) {
    return (
      <div className="w-12 bg-gray-900 flex flex-col items-center py-3 gap-3 border-r border-gray-700">
        <button onClick={() => setSidebarCollapsed(false)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors" title="Expand sidebar">
          <PanelLeft size={18} />
        </button>
        <button onClick={() => setSearchOpen(true)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors" title="Search">
          <Search size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-60 bg-gray-900 flex flex-col border-r border-gray-700 flex-shrink-0">
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl">{currentWorkspace.logo}</span>
          <span className="text-sm font-semibold text-white truncate">{currentWorkspace.name}</span>
        </div>
        <button onClick={() => setSidebarCollapsed(true)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors flex-shrink-0" title="Collapse sidebar">
          <PanelLeftClose size={15} />
        </button>
      </div>

      <div className="px-3 pt-3 pb-2">
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors text-sm"
        >
          <Search size={14} />
          <span className="flex-1 text-left">Search</span>
          <span className="text-xs bg-gray-700 px-1.5 py-0.5 rounded font-mono text-gray-400">⌘K</span>
        </button>
      </div>

      <div className="px-3 pb-2 space-y-0.5">
        <NavItem icon={<Home size={15} />} label="Home" active={location.pathname === '/'} onClick={() => navigate('/')} />
        <NavItem icon={<Users size={15} />} label="Team" active={location.pathname === '/team'} onClick={() => navigate('/team')} />
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <SectionHeader
          label="Pages"
          expanded={pagesExpanded}
          onToggle={() => setPagesExpanded((v) => !v)}
          onAdd={() => {
            const id = createDocument({ title: 'Untitled' });
            setActiveDocument(id);
            navigate(`/doc/${id}`);
          }}
        />
        {pagesExpanded && (
          <div className="mt-1 space-y-0.5 mb-2">
            {standaloneDocs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => { setActiveDocument(doc.id); navigate(`/doc/${doc.id}`); }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left group ${
                  location.pathname === `/doc/${doc.id}` ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <span className="text-base leading-none">{doc.icon}</span>
                <span className="text-sm truncate flex-1">{doc.title}</span>
              </button>
            ))}
          </div>
        )}

        <SectionHeader
          label="Collections"
          expanded={collectionsExpanded}
          onToggle={() => setCollectionsExpanded((v) => !v)}
          onAdd={() => {
            const id = createCollection({ name: 'New Collection' });
            setActiveCollection(id);
            navigate(`/collection/${id}`);
          }}
        />
        {collectionsExpanded && (
          <div className="mt-1 space-y-0.5">
            {allCollections.map((col) => (
              <button
                key={col.id}
                onClick={() => { setActiveCollection(col.id); navigate(`/collection/${col.id}`); }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left group ${
                  location.pathname === `/collection/${col.id}` ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <span className="text-base leading-none">{col.icon}</span>
                <span className="text-sm truncate flex-1">{col.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${location.pathname === `/collection/${col.id}` ? 'bg-gray-600 text-gray-300' : 'bg-gray-800 text-gray-500'}`}>
                  {col.documents.length}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-3 py-3 border-t border-gray-700">
        <NavItem icon={<Settings size={15} />} label="Settings" active={false} onClick={() => navigate('/team')} />
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left ${
        active ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
      }`}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  );
}

function SectionHeader({ label, expanded, onToggle, onAdd }: { label: string; expanded: boolean; onToggle: () => void; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between px-1 py-1 group">
      <button onClick={onToggle} className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-300 uppercase tracking-wider transition-colors">
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {label}
      </button>
      <button onClick={onAdd} className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-500 hover:text-gray-300 hover:bg-gray-700 rounded transition-all" title={`New ${label.slice(0, -1)}`}>
        <Plus size={13} />
      </button>
    </div>
  );
}
