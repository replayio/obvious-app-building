import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LayoutList, Kanban, GalleryHorizontal, Plus, Pencil } from 'lucide-react';
import { useAppStore } from '../store';
import type { ViewType } from '../store/types';
import { TableView } from '../components/collections/TableView';
import { KanbanView } from '../components/collections/KanbanView';
import { GalleryView } from '../components/collections/GalleryView';

const viewIcons: Record<ViewType, React.ReactNode> = {
  table: <LayoutList size={15} />,
  kanban: <Kanban size={15} />,
  gallery: <GalleryHorizontal size={15} />,
};

const viewLabels: Record<ViewType, string> = {
  table: 'Table',
  kanban: 'Board',
  gallery: 'Gallery',
};

export function CollectionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { collections, createDocument, setActiveDocument, setCollectionView, updateCollection } = useAppStore();
  const [editingName, setEditingName] = React.useState(false);
  const [nameValue, setNameValue] = React.useState('');

  const collection = id ? collections[id] : null;

  if (!collection) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <p>Collection not found.</p>
      </div>
    );
  }

  const handleViewSwitch = (view: ViewType) => {
    setCollectionView(collection.id, view);
  };

  const handleNewDoc = () => {
    const docId = createDocument({ title: 'Untitled', collectionId: collection.id });
    setActiveDocument(docId);
    navigate(`/doc/${docId}`);
  };

  const startEditName = () => {
    setNameValue(collection.name);
    setEditingName(true);
  };

  const saveName = () => {
    if (nameValue.trim()) {
      updateCollection(collection.id, { name: nameValue.trim() });
    }
    setEditingName(false);
  };

  return (
    <div className="flex-1 overflow-auto bg-white">
      {/* Header */}
      <div className="border-b border-gray-100 px-6 py-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl leading-none">{collection.icon}</span>
          {editingName ? (
            <input
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
              className="text-2xl font-bold text-gray-900 border-b-2 border-indigo-400 outline-none bg-transparent"
            />
          ) : (
            <h1
              className="text-2xl font-bold text-gray-900 cursor-text hover:text-gray-600 transition-colors"
              onClick={startEditName}
            >
              {collection.name}
            </h1>
          )}
          <button onClick={startEditName} className="text-gray-300 hover:text-gray-500 transition-colors">
            <Pencil size={14} />
          </button>
        </div>

        {/* View switcher + actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(['table', 'kanban', 'gallery'] as ViewType[]).map((view) => (
              <button
                key={view}
                onClick={() => handleViewSwitch(view)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  collection.viewType === view
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {viewIcons[view]}
                {viewLabels[view]}
              </button>
            ))}
          </div>

          <button
            onClick={handleNewDoc}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus size={15} />
            New
          </button>
        </div>
      </div>

      {/* View content */}
      <div className="p-4">
        {collection.viewType === 'table' && <TableView collection={collection} />}
        {collection.viewType === 'kanban' && <KanbanView collection={collection} />}
        {collection.viewType === 'gallery' && <GalleryView collection={collection} />}
      </div>
    </div>
  );
}
