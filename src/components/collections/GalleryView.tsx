import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAppStore } from '../../store';
import type { Collection, Document } from '../../store/types';

interface Props {
  collection: Collection;
}

export function GalleryView({ collection }: Props) {
  const navigate = useNavigate();
  const { documents, createDocument, setActiveDocument } = useAppStore();

  const collectionDocs = collection.documents
    .map((id) => documents[id])
    .filter((d): d is Document => d !== undefined);

  const statusProp = collection.propertySchema.find((p) => p.name === 'Status' || p.type === 'select');

  const getStatusOption = (doc: Document) => {
    if (!statusProp) return null;
    const val = doc.propertyValues.find((p) => p.propertyId === statusProp.id)?.value as string | null;
    return statusProp.options?.find((o) => o.label === val) ?? null;
  };

  const handleAdd = () => {
    const id = createDocument({ title: 'Untitled', collectionId: collection.id });
    setActiveDocument(id);
    navigate(`/doc/${id}`);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {collectionDocs.map((doc) => {
        const statusOpt = getStatusOption(doc);
        return (
          <div
            key={doc.id}
            onClick={() => { setActiveDocument(doc.id); navigate(`/doc/${doc.id}`); }}
            className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
          >
            {doc.coverImage ? (
              <div className="h-36 overflow-hidden bg-gray-100">
                <img src={doc.coverImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
            ) : (
              <div className="h-36 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                <span className="text-5xl">{doc.icon}</span>
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold text-gray-900 leading-tight">{doc.title}</h3>
                {statusOpt && (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                    style={{ backgroundColor: statusOpt.color + '20', color: statusOpt.color }}
                  >
                    {statusOpt.label}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {collection.propertySchema
                  .filter((p) => p.id !== statusProp?.id && p.type !== 'person')
                  .slice(0, 2)
                  .map((prop) => {
                    const val = doc.propertyValues.find((p) => p.propertyId === prop.id)?.value;
                    if (!val) return null;
                    return (
                      <div key={prop.id} className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="font-medium">{prop.name}:</span>
                        <span>
                          {prop.type === 'number' && typeof val === 'number'
                            ? `$${val.toLocaleString()}`
                            : prop.type === 'date'
                            ? new Date(String(val)).toLocaleDateString()
                            : String(val)}
                        </span>
                      </div>
                    );
                  })}
              </div>
              <div className="mt-3 text-xs text-gray-400">{new Date(doc.updatedAt).toLocaleDateString()}</div>
            </div>
          </div>
        );
      })}
      <button
        onClick={handleAdd}
        className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
      >
        <Plus size={24} className="mb-2" />
        <span className="text-sm font-medium">New item</span>
      </button>
    </div>
  );
}
