import { createClient } from '@supabase/supabase-js';
import { Group, GroupMember } from '../types/Group';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface CreateGroupInput {
  name: string;
  expiryDays: number;
  accessibleTabs: string[];
}

export interface UpdateGroupInput extends Partial<CreateGroupInput> {
  id: string;
}

export const groupService = {
  async createGroup(input: CreateGroupInput): Promise<Group> {
    const { data, error } = await supabase
      .from('groups')
      .insert({
        name: input.name,
        expiry_days: input.expiryDays,
        accessible_tabs: input.accessibleTabs
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create group: ${error.message}`);
    return this.mapGroupFromDB(data);
  },

  async updateGroup(input: UpdateGroupInput): Promise<Group> {
    const updates: Record<string, any> = {};
    if (input.name) updates.name = input.name;
    if (input.expiryDays) updates.expiry_days = input.expiryDays;
    if (input.accessibleTabs) updates.accessible_tabs = input.accessibleTabs;

    const { data, error } = await supabase
      .from('groups')
      .update(updates)
      .eq('id', input.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update group: ${error.message}`);
    return this.mapGroupFromDB(data);
  },

  async deleteGroup(groupId: string): Promise<void> {
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId);

    if (error) throw new Error(`Failed to delete group: ${error.message}`);
  },

  async getGroup(groupId: string): Promise<Group> {
    const { data, error } = await supabase
      .from('groups')
      .select()
      .eq('id', groupId)
      .single();

    if (error) throw new Error(`Failed to fetch group: ${error.message}`);
    return this.mapGroupFromDB(data);
  },

  async getUserGroups(userId: string): Promise<Group[]> {
    const { data, error } = await supabase
      .from('user_groups')
      .select(`
        group:groups (*)  
      `)
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to fetch user groups: ${error.message}`);
    return data.map((item: any) => this.mapGroupFromDB(item.group));
  },

  async addUserToGroup(userId: string, groupId: string, role: GroupMember['role'] = 'user'): Promise<void> {
    const { error } = await supabase
      .from('user_groups')
      .insert({
        user_id: userId,
        group_id: groupId,
        role
      });

    if (error) throw new Error(`Failed to add user to group: ${error.message}`);
  },

  async removeUserFromGroup(userId: string, groupId: string): Promise<void> {
    const { error } = await supabase
      .from('user_groups')
      .delete()
      .eq('user_id', userId)
      .eq('group_id', groupId);

    if (error) throw new Error(`Failed to remove user from group: ${error.message}`);
  },

  async updateUserRole(userId: string, groupId: string, role: GroupMember['role']): Promise<void> {
    const { error } = await supabase
      .from('user_groups')
      .update({ role })
      .eq('user_id', userId)
      .eq('group_id', groupId);

    if (error) throw new Error(`Failed to update user role: ${error.message}`);
  },

  mapGroupFromDB(data: any): Group {
    return {
      id: data.id,
      name: data.name,
      expiryDays: data.expiry_days,
      accessibleTabs: data.accessible_tabs,
      createdAt: data.created_at
    };
  }
};