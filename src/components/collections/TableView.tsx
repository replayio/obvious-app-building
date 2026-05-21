import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useAppStore } from '../../store';
import type { Collection, Document, PropertyDefinition, PropertyValue, TeamMember } from '../../store/types';

interface Props {
  collection: Collection;
}

type SortDir = 'asc' | 'desc' | null;

export function TableView({ collection }: Props) {
  const navigate = useNavigate();
  const { documents, teamMembers, createDocument, setActiveDocument } = useAppStore();
  const [sortProp, setSortProp] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const collectionDocs = collection.documents
    .map((id) => documents[id])
    .filter((d): d is Document => d !== undefined);

  const sortedDocs = [...collectionDocs].sort((a, b) => {
    if (!sortProp || !sortDir) return 0;
    const av = a.propertyValues.find((p) => p.propertyId === sortProp)?.value ?? '';
    const bv = b.propertyValues.find((p) => p.propertyId === sortProp)?.value ?? '';
    const cmp = String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const handleSort = (propId: string) => {
    if (sortProp !== propId) { setSortProp(propId); setSortDir('asc'); }
    else if (sortDir === 'asc') setSortDir('desc');
    else { setSortProp(null); setSortDir(null); }
  };

  const handleAddRow = () => {
    const id = createDocument({ title: 'Untitled', collectionId: collection.id });
    setActiveDocument(id);
    navigate(`/doc/${id}`);
  };

  const getValue = (doc: Document, propId: string) =>
    doc.propertyValues.find((p) => p.propertyId === propId)?.value ?? null;

  const members = Object.values(teamMembers);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-64">Title</th>
            {collection.propertySchema.map((prop) => (
              <th
                key={prop.id}
                className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 whitespace-nowrap"
                onClick={() => handleSort(prop.id)}
              >
                <div className="flex items-center gap-1">
                  {prop.name}
                  {sortProp === prop.id ? (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedDocs.map((doc) => (
            <tr
              key={doc.id}
              onClick={() => { setActiveDocument(doc.id); navigate(`/doc/${doc.id}`); }}
              className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg leading-none">{doc.icon}</span>
                  <span className="text-sm font-medium text-gray-800 truncate max-w-[200px]">{doc.title}</span>
                </div>
              </td>
              {collection.propertySchema.map((prop) => (
                <td key={prop.id} className="px-4 py-3 whitespace-nowrap">
                  <CellValue prop={prop} value={getValue(doc, prop.id)} teamMembers={members} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <button
        onClick={handleAddRow}
        className="flex items-center gap-2 px-4 py-3 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 w-full transition-colors"
      >
        <Plus size={16} />
        New row
      </button>
    </div>
  );
}

function CellValue({ prop, value, teamMembers }: {
  prop: PropertyDefinition;
  value: PropertyValue['value'];
  teamMembers: TeamMember[];
}) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-300 text-sm">—</span>;
  }
  if (prop.type === 'select') {
    const opt = prop.options?.find((o) => o.label === String(value));
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
        style={opt ? { backgroundColor: opt.color + '20', color: opt.color } : { backgroundColor: '#f3f4f6', color: '#6b7280' }}
      >
        {String(value)}
      </span>
    );
  }
  if (prop.type === 'person') {
    const member = teamMembers.find((m) => m.id === String(value));
    if (!member) return <span className="text-gray-300 text-sm">—</span>;
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0" style={{ backgroundColor: member.avatarColor }}>
          {member.initials}
        </div>
        <span className="text-sm text-gray-700">{member.name}</span>
      </div>
    );
  }
  if (prop.type === 'date') {
    try { return <span className="text-sm text-gray-600">{new Date(String(value)).toLocaleDateString()}</span>; }
    catch { return <span className="text-sm text-gray-600">{String(value)}</span>; }
  }
  if (prop.type === 'number') {
    return <span className="text-sm text-gray-700">{typeof value === 'number' ? value.toLocaleString() : String(value)}</span>;
  }
  if (prop.type === 'checkbox') {
    return <span>{value ? '✓' : '—'}</span>;
  }
  return <span className="text-sm text-gray-700">{String(value)}</span>;
}
