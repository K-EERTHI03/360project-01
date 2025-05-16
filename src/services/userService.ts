import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

export interface User {
  id: string;
  email: string;
  fullName: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  isAdmin?: boolean;
}

export interface UpdateUserInput {
  id: string;
  fullName?: string;
  isAdmin?: boolean;
}

export const userService = {
  async createUser(input: CreateUserInput): Promise<User> {
    // First create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: input.email,
      password: input.password
    });

    if (authError) throw new Error(`Failed to create user: ${authError.message}`);
    if (!authData.user) throw new Error('User creation failed');

    // Then create profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: input.email,
        full_name: input.fullName,
        is_admin: input.isAdmin || false
      })
      .select()
      .single();

    if (userError) {
      // Cleanup auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Failed to create user profile: ${userError.message}`);
    }

    return this.mapUserFromDB(userData);
  },

  async updateUser(input: UpdateUserInput): Promise<User> {
    const updates: Record<string, any> = {};
    if (input.fullName !== undefined) updates.full_name = input.fullName;
    if (input.isAdmin !== undefined) updates.is_admin = input.isAdmin;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', input.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update user: ${error.message}`);
    return this.mapUserFromDB(data);
  },

  async deleteUser(userId: string): Promise<void> {
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) throw new Error(`Failed to delete user: ${authError.message}`);
  },

  async getUser(userId: string): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .select()
      .eq('id', userId)
      .single();

    if (error) throw new Error(`Failed to fetch user: ${error.message}`);
    return this.mapUserFromDB(data);
  },

  async getUsersByGroup(groupId: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('user_groups')
      .select(`
        user:users (*)
      `)
      .eq('group_id', groupId);

    if (error) throw new Error(`Failed to fetch group users: ${error.message}`);
    return data.map((item: any) => this.mapUserFromDB(item.user));
  },

  private mapUserFromDB(data: any): User {
    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      isAdmin: data.is_admin,
      createdAt: data.created_at
    };
  }
};