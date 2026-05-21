import { useAppStore } from '../../store';
import type { PropertyDefinition, PropertyValue, TeamMember } from '../../store/types';

interface Props {
  docId: string;
}

export function PropertiesPanel({ docId }: Props) {
  const { documents, collections, teamMembers, setDocumentPropertyValue } = useAppStore();
  const doc = documents[docId];
  if (!doc || !doc.collectionId) return null;

  const collection = collections[doc.collectionId];
  if (!collection) return null;

  const getValue = (propId: string) =>
    doc.propertyValues.find((p) => p.propertyId === propId)?.value ?? null;

  return (
    <div className="border-t border-gray-100 mt-6 pt-5">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Properties</h3>
      <div className="space-y-2">
        {collection.propertySchema.map((prop) => (
          <PropertyRow
            key={prop.id}
            prop={prop}
            value={getValue(prop.id)}
            teamMembers={Object.values(teamMembers)}
            onChange={(v) => setDocumentPropertyValue(docId, prop.id, v)}
          />
        ))}
      </div>
    </div>
  );
}

function PropertyRow({
  prop,
  value,
  teamMembers,
  onChange,
}: {
  prop: PropertyDefinition;
  value: PropertyValue['value'];
  teamMembers: TeamMember[];
  onChange: (v: PropertyValue['value']) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-28 flex-shrink-0 text-sm text-gray-500 pt-1">{prop.name}</div>
      <div className="flex-1">
        {prop.type === 'select' && <SelectProperty prop={prop} value={value as string | null} onChange={onChange} />}
        {prop.type === 'date' && (
          <input
            type="date"
            value={typeof value === 'string' ? value.slice(0, 10) : ''}
            onChange={(e) => onChange(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        )}
        {prop.type === 'person' && (
          <select
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">Unassigned</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        )}
        {prop.type === 'text' && (
          <input
            type="text"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Empty"
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full"
          />
        )}
        {prop.type === 'number' && (
          <input
            type="number"
            value={typeof value === 'number' ? value : ''}
            onChange={(e) => onChange(Number(e.target.value))}
            placeholder="0"
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 w-28"
          />
        )}
        {prop.type === 'checkbox' && (
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-600 mt-1"
          />
        )}
        {prop.type === 'url' && (
          <input
            type="url"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://"
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full"
          />
        )}
      </div>
    </div>
  );
}

function SelectProperty({
  prop,
  value,
  onChange,
}: {
  prop: PropertyDefinition;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const selected = prop.options?.find((o) => o.label === value);
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
      style={selected ? { color: selected.color, borderColor: selected.color + '40' } : {}}
    >
      <option value="">None</option>
      {prop.options?.map((opt) => (
        <option key={opt.id} value={opt.label}>{opt.label}</option>
      ))}
    </select>
  );
}
