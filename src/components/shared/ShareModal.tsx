import { useState } from 'react';
import { X, Link } from 'lucide-react';
import { useAppStore } from '../../store';
import type { Role } from '../../store/types';
import { Avatar } from './Avatar';

interface Props {
  docId: string;
  onClose: () => void;
}

export function ShareModal({ docId, onClose }: Props) {
  const { documents, teamMembers, shareDocument, removeDocumentShare } = useAppStore();
  const [copied, setCopied] = useState(false);
  const doc = documents[docId];
  if (!doc) return null;

  const sharedMemberIds = doc.shares.map((s) => s.memberId);
  const unsharedMembers = Object.values(teamMembers).filter((m) => !sharedMemberIds.includes(m.id));

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Share "{doc.title}"</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <button
          onClick={copyLink}
          className="w-full flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm mb-5"
        >
          <Link size={16} className="text-gray-500" />
          <span className="flex-1 text-left text-gray-600">{copied ? 'Copied to clipboard!' : 'Copy link'}</span>
        </button>

        {unsharedMembers.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Add people</p>
            <div className="space-y-1">
              {unsharedMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-xl group">
                  <Avatar member={member} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800">{member.name}</div>
                    <div className="text-xs text-gray-400">{member.email}</div>
                  </div>
                  <button
                    onClick={() => shareDocument(docId, member.id, 'editor')}
                    className="text-xs text-indigo-600 font-medium hover:text-indigo-800"
                  >
                    Invite
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {doc.shares.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">People with access</p>
            <div className="space-y-1">
              {doc.shares.map((share) => {
                const member = teamMembers[share.memberId];
                if (!member) return null;
                return (
                  <div key={share.memberId} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-xl group">
                    <Avatar member={member} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800">{member.name}</div>
                      <div className="text-xs text-gray-400">{member.email}</div>
                    </div>
                    <select
                      value={share.permission}
                      onChange={(e) => shareDocument(docId, member.id, e.target.value as Role)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-white"
                    >
                      <option value="editor">Can edit</option>
                      <option value="viewer">Can view</option>
                    </select>
                    <button
                      onClick={() => removeDocumentShare(docId, member.id)}
                      className="text-xs text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
