import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState, Document, Collection } from './types';
import { seedDocuments, seedCollections, seedTeamMembers } from './seedData';

const generateId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial data
      documents: seedDocuments,
      collections: seedCollections,
      teamMembers: seedTeamMembers,
      currentWorkspace: {
        id: 'ws-replay',
        name: 'Replay.io',
        logo: '🔄',
      },

      // UI state
      sidebarCollapsed: false,
      searchOpen: false,
      activeDocumentId: 'doc-welcome',
      activeCollectionId: null,

      // Document actions
      createDocument: (data) => {
        const id = generateId();
        const now = new Date().toISOString();
        const doc: Document = {
          id,
          title: data.title,
          icon: data.icon ?? '📄',
          content: data.content ?? JSON.stringify({ type: 'doc', content: [] }),
          collectionId: data.collectionId,
          propertyValues: data.propertyValues ?? [],
          createdAt: now,
          updatedAt: now,
          createdBy: data.createdBy ?? 'member-1',
          shares: data.shares ?? [],
          order: data.order ?? 0,
        };
        set((state) => ({ documents: { ...state.documents, [id]: doc } }));
        if (data.collectionId) {
          get().addDocumentToCollection(data.collectionId, id);
        }
        return id;
      },

      updateDocument: (id, data) => {
        set((state) => ({
          documents: {
            ...state.documents,
            [id]: {
              ...state.documents[id],
              ...data,
              updatedAt: new Date().toISOString(),
            },
          },
        }));
      },

      deleteDocument: (id) => {
        set((state) => {
          const { [id]: removed, ...rest } = state.documents;
          // Also remove from collection
          const doc = removed;
          if (doc?.collectionId) {
            const col = state.collections[doc.collectionId];
            if (col) {
              return {
                documents: rest,
                collections: {
                  ...state.collections,
                  [doc.collectionId]: {
                    ...col,
                    documents: col.documents.filter((d) => d !== id),
                  },
                },
              };
            }
          }
          return { documents: rest };
        });
      },

      setDocumentPropertyValue: (docId, propertyId, value) => {
        set((state) => {
          const doc = state.documents[docId];
          if (!doc) return {};
          const existing = doc.propertyValues.find((p) => p.propertyId === propertyId);
          const newValues = existing
            ? doc.propertyValues.map((p) => p.propertyId === propertyId ? { ...p, value } : p)
            : [...doc.propertyValues, { propertyId, value }];
          return {
            documents: {
              ...state.documents,
              [docId]: { ...doc, propertyValues: newValues, updatedAt: new Date().toISOString() },
            },
          };
        });
      },

      reorderDocuments: (collectionId, orderedIds) => {
        set((state) => ({
          collections: {
            ...state.collections,
            [collectionId]: {
              ...state.collections[collectionId],
              documents: orderedIds,
            },
          },
        }));
      },

      // Collection actions
      createCollection: (data) => {
        const id = generateId();
        const col: Collection = {
          id,
          name: data.name,
          icon: data.icon ?? '📁',
          propertySchema: data.propertySchema ?? [
            {
              id: generateId(),
              name: 'Status',
              type: 'select',
              options: [
                { id: generateId(), label: 'Not Started', color: '#94a3b8' },
                { id: generateId(), label: 'In Progress', color: '#3b82f6' },
                { id: generateId(), label: 'Done', color: '#22c55e' },
              ],
            },
          ],
          viewType: data.viewType ?? 'table',
          defaultView: data.defaultView ?? 'table',
          kanbanPropertyId: data.kanbanPropertyId,
          documents: data.documents ?? [],
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ collections: { ...state.collections, [id]: col } }));
        return id;
      },

      updateCollection: (id, data) => {
        set((state) => ({
          collections: {
            ...state.collections,
            [id]: { ...state.collections[id], ...data },
          },
        }));
      },

      deleteCollection: (id) => {
        set((state) => {
          const { [id]: removed, ...rest } = state.collections;
          return { collections: rest };
        });
      },

      setCollectionView: (id, view) => {
        set((state) => ({
          collections: {
            ...state.collections,
            [id]: { ...state.collections[id], viewType: view },
          },
        }));
      },

      addDocumentToCollection: (collectionId, docId) => {
        set((state) => {
          const col = state.collections[collectionId];
          if (!col) return {};
          if (col.documents.includes(docId)) return {};
          return {
            collections: {
              ...state.collections,
              [collectionId]: { ...col, documents: [...col.documents, docId] },
            },
          };
        });
      },

      // Team actions
      inviteTeamMember: (email, role) => {
        const id = generateId();
        const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
        const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#3b82f6', '#14b8a6'];
        const avatarColor = colors[Math.floor(Math.random() * colors.length)];
        set((state) => ({
          teamMembers: {
            ...state.teamMembers,
            [id]: { id, name, email, role, avatarColor, initials },
          },
        }));
      },

      updateTeamMember: (id, data) => {
        set((state) => ({
          teamMembers: {
            ...state.teamMembers,
            [id]: { ...state.teamMembers[id], ...data },
          },
        }));
      },

      removeTeamMember: (id) => {
        set((state) => {
          const { [id]: removed, ...rest } = state.teamMembers;
          return { teamMembers: rest };
        });
      },

      // UI actions
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setSearchOpen: (v) => set({ searchOpen: v }),
      setActiveDocument: (id) => set({ activeDocumentId: id, activeCollectionId: null }),
      setActiveCollection: (id) => set({ activeCollectionId: id, activeDocumentId: null }),

      // Sharing actions
      shareDocument: (docId, memberId, permission) => {
        set((state) => {
          const doc = state.documents[docId];
          if (!doc) return {};
          const existing = doc.shares.find((s) => s.memberId === memberId);
          const newShares = existing
            ? doc.shares.map((s) => s.memberId === memberId ? { ...s, permission } : s)
            : [...doc.shares, { memberId, permission }];
          return {
            documents: {
              ...state.documents,
              [docId]: { ...doc, shares: newShares },
            },
          };
        });
      },

      removeDocumentShare: (docId, memberId) => {
        set((state) => {
          const doc = state.documents[docId];
          if (!doc) return {};
          return {
            documents: {
              ...state.documents,
              [docId]: { ...doc, shares: doc.shares.filter((s) => s.memberId !== memberId) },
            },
          };
        });
      },
    }),
    {
      name: 'replay-workspace-v1',
      partialize: (state) => ({
        documents: state.documents,
        collections: state.collections,
        teamMembers: state.teamMembers,
        currentWorkspace: state.currentWorkspace,
        activeDocumentId: state.activeDocumentId,
        activeCollectionId: state.activeCollectionId,
      }),
    }
  )
);
