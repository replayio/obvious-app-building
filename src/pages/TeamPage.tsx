import { useState } from 'react';
import { UserPlus, MoreHorizontal, X, Mail, Eye, Edit3, Crown } from 'lucide-react';
import { useAppStore } from '../store';
import type { Role, TeamMember } from '../store/types';
import { Avatar } from '../components/shared/Avatar';

const roleConfig: Record<Role, { label: string; icon: React.ReactNode; color: string }> = {
  owner: { label: 'Owner', icon: <Crown size={12} />, color: 'text-amber-600 bg-amber-50' },
  editor: { label: 'Editor', icon: <Edit3 size={12} />, color: 'text-indigo-600 bg-indigo-50' },
  viewer: { label: 'Viewer', icon: <Eye size={12} />, color: 'text-gray-600 bg-gray-100' },
};

export function TeamPage() {
  const { teamMembers, inviteTeamMember, updateTeamMember, removeTeamMember, currentWorkspace } = useAppStore();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('editor');
  const [inviting, setInviting] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const members = Object.values(teamMembers).sort((a, b) => {
    const order: Record<Role, number> = { owner: 0, editor: 1, viewer: 2 };
    return order[a.role] - order[b.role];
  });

  const handleInvite = () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) return;
    inviteTeamMember(inviteEmail.trim(), inviteRole);
    setInviteEmail('');
    setInviting(false);
  };

  return (
    <div className="flex-1 overflow-auto bg-white">
      <div className="max-w-3xl mx-auto px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Team</h1>
            <p className="text-gray-500 mt-1">{members.length} members in {currentWorkspace.name}</p>
          </div>
          <button
            onClick={() => setInviting(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <UserPlus size={16} />
            Invite member
          </button>
        </div>

        {inviting && (
          <div className="mb-8 p-5 bg-indigo-50 border border-indigo-200 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Invite new member</h2>
              <button onClick={() => setInviting(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                <Mail size={16} className="text-gray-400" />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleInvite(); }}
                  placeholder="Enter email address"
                  className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent"
                  autoFocus
                />
              </div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Role)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white focus:outline-none"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button onClick={handleInvite} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                Send invite
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">The user will be added to the workspace immediately (simulated).</p>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
            <div className="grid grid-cols-[1fr_auto_auto] gap-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <span>Member</span>
              <span>Role</span>
              <span></span>
            </div>
          </div>
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              menuOpen={menuOpen === member.id}
              onMenuToggle={() => setMenuOpen(menuOpen === member.id ? null : member.id)}
              onMenuClose={() => setMenuOpen(null)}
              onRoleChange={(role) => updateTeamMember(member.id, { role })}
              onRemove={() => { removeTeamMember(member.id); setMenuOpen(null); }}
            />
          ))}
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Access Levels</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(Object.entries(roleConfig) as [Role, typeof roleConfig[Role]][]).map(([role, config]) => (
              <div key={role} className="p-4 border border-gray-200 rounded-xl">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-3 ${config.color}`}>
                  {config.icon}
                  {config.label}
                </div>
                <p className="text-sm text-gray-600">
                  {role === 'owner' && 'Full access. Can manage members, billing, and workspace settings.'}
                  {role === 'editor' && 'Can create, edit, and delete documents. Can invite viewers.'}
                  {role === 'viewer' && 'Read-only access to shared documents and collections.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberRow({ member, menuOpen, onMenuToggle, onMenuClose, onRoleChange, onRemove }: {
  member: TeamMember;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onRoleChange: (role: Role) => void;
  onRemove: () => void;
}) {
  const config = roleConfig[member.role];
  return (
    <div className="px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
      <div className="grid grid-cols-[1fr_auto_auto] gap-4 items-center">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar member={member} size="md" />
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900">{member.name}</div>
            <div className="text-xs text-gray-400">{member.email}</div>
          </div>
        </div>
        <div>
          <select
            value={member.role}
            onChange={(e) => onRoleChange(e.target.value as Role)}
            disabled={member.role === 'owner'}
            className={`text-xs border rounded-full px-2.5 py-1 font-medium focus:outline-none ${config.color} disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <option value="owner">Owner</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        <div className="relative">
          <button onClick={onMenuToggle} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={onMenuClose} />
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-20 w-44">
                <button
                  onClick={onRemove}
                  disabled={member.role === 'owner'}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <X size={14} />
                  Remove member
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
