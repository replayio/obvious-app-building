import { useNavigate } from 'react-router-dom';
import { FileText, Database, Users, Plus } from 'lucide-react';
import { useAppStore } from '../store';

export function HomePage() {
  const navigate = useNavigate();
  const { documents, collections, teamMembers, createDocument, setActiveDocument } = useAppStore();

  const recentDocs = Object.values(documents)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  const allCollections = Object.values(collections);
  const memberCount = Object.keys(teamMembers).length;

  const handleNewDoc = () => {
    const id = createDocument({ title: 'Untitled' });
    setActiveDocument(id);
    navigate(`/doc/${id}`);
  };

  return (
    <div className="flex-1 overflow-auto bg-white">
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Good morning 👋</h1>
          <p className="text-gray-500">Here's what's happening in your workspace.</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-10">
          <StatCard icon={<FileText size={20} />} label="Documents" value={Object.keys(documents).length} color="indigo" />
          <StatCard icon={<Database size={20} />} label="Collections" value={allCollections.length} color="purple" />
          <StatCard icon={<Users size={20} />} label="Team members" value={memberCount} color="green" />
        </div>

        <div className="flex items-center gap-3 mb-10">
          <button
            onClick={handleNewDoc}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus size={16} />
            New page
          </button>
          <button
            onClick={() => navigate('/team')}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Users size={16} />
            Manage team
          </button>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent pages</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentDocs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => { setActiveDocument(doc.id); navigate(`/doc/${doc.id}`); }}
                className="flex items-center gap-3 p-4 border border-gray-100 rounded-xl hover:border-gray-200 hover:bg-gray-50 transition-all text-left"
              >
                <span className="text-2xl leading-none flex-shrink-0">{doc.icon}</span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{doc.title}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(doc.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Collections</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {allCollections.map((col) => (
              <button
                key={col.id}
                onClick={() => navigate(`/collection/${col.id}`)}
                className="p-4 border border-gray-100 rounded-xl hover:border-gray-200 hover:bg-gray-50 transition-all text-left"
              >
                <div className="text-2xl mb-2">{col.icon}</div>
                <div className="text-sm font-semibold text-gray-800">{col.name}</div>
                <div className="text-xs text-gray-400 mt-1">{col.documents.length} items · {col.viewType}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-emerald-50 text-emerald-600',
  };
  return (
    <div className="p-5 border border-gray-100 rounded-2xl bg-white hover:shadow-sm transition-shadow">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}
