export type Role = 'owner' | 'editor' | 'viewer';
export type ViewType = 'table' | 'kanban' | 'gallery';
export type PropertyType = 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'person' | 'checkbox' | 'url';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarColor: string;
  initials: string;
}

export interface SelectOption {
  id: string;
  label: string;
  color: string;
}

export interface PropertyDefinition {
  id: string;
  name: string;
  type: PropertyType;
  options?: SelectOption[]; // for select/multiselect
}

export interface PropertyValue {
  propertyId: string;
  value: string | number | boolean | string[] | null;
}

export interface DocumentShare {
  memberId: string;
  permission: Role;
}

export interface Document {
  id: string;
  title: string;
  icon: string;
  coverImage?: string;
  content: string; // TipTap JSON string
  collectionId?: string;
  propertyValues: PropertyValue[];
  createdAt: string;
  updatedAt: string;
  createdBy: string; // memberId
  shares: DocumentShare[];
  parentId?: string;
  order: number;
}

export interface Collection {
  id: string;
  name: string;
  icon: string;
  propertySchema: PropertyDefinition[];
  viewType: ViewType;
  defaultView: ViewType;
  kanbanPropertyId?: string; // which property drives kanban columns
  documents: string[]; // ordered doc IDs
  createdAt: string;
}

export interface AppState {
  // Data
  documents: Record<string, Document>;
  collections: Record<string, Collection>;
  teamMembers: Record<string, TeamMember>;
  currentWorkspace: { id: string; name: string; logo: string };

  // UI state
  sidebarCollapsed: boolean;
  searchOpen: boolean;
  activeDocumentId: string | null;
  activeCollectionId: string | null;

  // Actions — documents
  createDocument: (data: Partial<Document> & { title: string }) => string;
  updateDocument: (id: string, data: Partial<Document>) => void;
  deleteDocument: (id: string) => void;
  setDocumentPropertyValue: (docId: string, propertyId: string, value: PropertyValue['value']) => void;
  reorderDocuments: (collectionId: string, orderedIds: string[]) => void;

  // Actions — collections
  createCollection: (data: Partial<Collection> & { name: string }) => string;
  updateCollection: (id: string, data: Partial<Collection>) => void;
  deleteCollection: (id: string) => void;
  setCollectionView: (id: string, view: ViewType) => void;
  addDocumentToCollection: (collectionId: string, docId: string) => void;

  // Actions — team
  inviteTeamMember: (email: string, role: Role) => void;
  updateTeamMember: (id: string, data: Partial<TeamMember>) => void;
  removeTeamMember: (id: string) => void;

  // Actions — UI
  setSidebarCollapsed: (v: boolean) => void;
  setSearchOpen: (v: boolean) => void;
  setActiveDocument: (id: string | null) => void;
  setActiveCollection: (id: string | null) => void;

  // Actions — sharing
  shareDocument: (docId: string, memberId: string, permission: Role) => void;
  removeDocumentShare: (docId: string, memberId: string) => void;
}
