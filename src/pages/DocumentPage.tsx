import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Share2, Trash2, MoreHorizontal } from 'lucide-react';
import { useAppStore } from '../store';
import { RichTextEditor } from '../components/editor/RichTextEditor';
import { PropertiesPanel } from '../components/editor/PropertiesPanel';
import { ShareModal } from '../components/shared/ShareModal';

export function DocumentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { documents, updateDocument, deleteDocument } = useAppStore();
  const [shareOpen, setShareOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const doc = id ? documents[id] : null;

  const handleContentChange = useCallback(
    (content: string) => { if (id) updateDocument(id, { content }); },
    [id, updateDocument]
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (id) updateDocument(id, { title: e.target.value });
  };

  const handleDelete = () => {
    if (!id) return;
    const collectionId = doc?.collectionId;
    deleteDocument(id);
    if (collectionId) navigate(`/collection/${collectionId}`);
    else navigate('/');
  };

  if (!doc) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="text-xl mb-2">Document not found</p>
          <p className="text-sm">It may have been deleted.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-white">
      <div className="max-w-3xl mx-auto px-8 py-8">

        <div className="flex items-center justify-end gap-2 mb-4">
          <button
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Share2 size={15} />
            Share
          </button>
          <div className="relative">
            <button onClick={() => setShowMenu((v) => !v)} className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-lg transition-colors">
              <MoreHorizontal size={18} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-20 w-44">
                  <button
                    onClick={() => { handleDelete(); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                    Delete document
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="text-4xl mb-2 leading-none">{doc.icon}</div>

        <input
          type="text"
          value={doc.title}
          onChange={handleTitleChange}
          placeholder="Untitled"
          className="w-full text-4xl font-bold text-gray-900 border-none outline-none bg-transparent placeholder-gray-300 mb-4 leading-tight"
        />

        <PropertiesPanel docId={doc.id} />

        <div className="border-t border-gray-100 mt-4 mb-4" />

        <RichTextEditor
          key={doc.id}
          content={doc.content}
          onChange={handleContentChange}
          placeholder="Type '/' for commands, or start writing…"
        />
      </div>

      {shareOpen && <ShareModal docId={doc.id} onClose={() => setShareOpen(false)} />}
    </div>
  );
}
