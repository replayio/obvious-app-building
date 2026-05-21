import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, GripVertical } from 'lucide-react';
import { useAppStore } from '../../store';
import type { Collection, Document, SelectOption, TeamMember } from '../../store/types';

interface Props {
  collection: Collection;
}

export function KanbanView({ collection }: Props) {
  const navigate = useNavigate();
  const { documents, teamMembers, createDocument, setActiveDocument, setDocumentPropertyValue } = useAppStore();

  const kanbanProp = collection.propertySchema.find((p) => p.id === collection.kanbanPropertyId)
    ?? collection.propertySchema.find((p) => p.type === 'select');

  const columns: SelectOption[] = kanbanProp?.options ?? [
    { id: 'default', label: 'No Status', color: '#94a3b8' },
  ];

  const collectionDocs = collection.documents
    .map((id) => documents[id])
    .filter((d): d is Document => d !== undefined);

  const docsByColumn = useMemo(() => {
    const map: Record<string, Document[]> = {};
    columns.forEach((col) => (map[col.label] = []));
    map['__none__'] = [];
    collectionDocs.forEach((doc) => {
      const val = doc.propertyValues.find((p) => p.propertyId === kanbanProp?.id)?.value as string | null;
      const colLabel = val && map[val] !== undefined ? val : '__none__';
      map[colLabel].push(doc);
    });
    return map;
  }, [collectionDocs, columns, kanbanProp]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !kanbanProp) return;
    const targetColumn = columns.find((c) => c.label === String(over.id));
    if (targetColumn) {
      setDocumentPropertyValue(String(active.id), kanbanProp.id, targetColumn.label);
    } else {
      const targetDoc = collectionDocs.find((d) => d.id === String(over.id));
      if (targetDoc) {
        const val = targetDoc.propertyValues.find((p) => p.propertyId === kanbanProp.id)?.value as string | null;
        if (val) setDocumentPropertyValue(String(active.id), kanbanProp.id, val);
      }
    }
  };

  const addCard = (columnLabel: string) => {
    if (!kanbanProp) return;
    const id = createDocument({ title: 'Untitled', collectionId: collection.id });
    setDocumentPropertyValue(id, kanbanProp.id, columnLabel);
    setActiveDocument(id);
    navigate(`/doc/${id}`);
  };

  const members = Object.values(teamMembers);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[60vh]">
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            docs={docsByColumn[col.label] ?? []}
            teamMembers={members}
            onAddCard={() => addCard(col.label)}
            onOpenDoc={(id) => { setActiveDocument(id); navigate(`/doc/${id}`); }}
          />
        ))}
      </div>
    </DndContext>
  );
}

function KanbanColumn({ column, docs, teamMembers, onAddCard, onOpenDoc }: {
  column: SelectOption;
  docs: Document[];
  teamMembers: TeamMember[];
  onAddCard: () => void;
  onOpenDoc: (id: string) => void;
}) {
  return (
    <div className="w-72 flex-shrink-0">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: column.color }} />
        <span className="text-sm font-semibold text-gray-700">{column.label}</span>
        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{docs.length}</span>
      </div>
      <SortableContext items={docs.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[120px]">
          {docs.map((doc) => (
            <KanbanCard key={doc.id} doc={doc} teamMembers={teamMembers} onOpen={() => onOpenDoc(doc.id)} />
          ))}
        </div>
      </SortableContext>
      <button
        onClick={onAddCard}
        className="flex items-center gap-2 w-full px-3 py-2 mt-2 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
      >
        <Plus size={15} />
        Add card
      </button>
    </div>
  );
}

function KanbanCard({ doc, teamMembers, onOpen }: {
  doc: Document;
  teamMembers: TeamMember[];
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: doc.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const assigneePropValue = doc.propertyValues.find((p) =>
    typeof p.value === 'string' && teamMembers.some((m) => m.id === p.value)
  );
  const assignee = assigneePropValue ? teamMembers.find((m) => m.id === assigneePropValue.value) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md cursor-pointer transition-shadow group"
      onClick={onOpen}
    >
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm leading-none">{doc.icon}</span>
            <span className="text-sm font-medium text-gray-800 truncate">{doc.title}</span>
          </div>
        </div>
      </div>
      {assignee && (
        <div className="flex items-center justify-end mt-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
            style={{ backgroundColor: assignee.avatarColor }}
            title={assignee.name}
          >
            {assignee.initials}
          </div>
        </div>
      )}
    </div>
  );
}
