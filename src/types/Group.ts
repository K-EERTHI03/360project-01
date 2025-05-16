export interface Group {
  id: string;
  name: string; // unique
  expiryDays: number;
  accessibleTabs: string[];
  createdAt: string;
}

export interface GroupMember {
  userId: string;
  groupId: string;
  role: 'admin' | 'user';
}