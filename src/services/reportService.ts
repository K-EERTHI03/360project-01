import { createClient } from '@supabase/supabase-js';
import { Report } from '../types/Report';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

export interface CreateReportInput {
  title: string;
  content: Record<string, any>;
  groupId: string;
}

export interface UpdateReportInput extends Partial<CreateReportInput> {
  id: string;
}

export const reportService = {
  async createReport(input: CreateReportInput): Promise<Report> {
    const { data, error } = await supabase
      .from('reports')
      .insert({
        title: input.title,
        content: input.content,
        group_id: input.groupId
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create report: ${error.message}`);
    return this.mapReportFromDB(data);
  },

  async updateReport(input: UpdateReportInput): Promise<Report> {
    const updates: Record<string, any> = {};
    if (input.title) updates.title = input.title;
    if (input.content) updates.content = input.content;
    if (input.groupId) updates.group_id = input.groupId;

    const { data, error } = await supabase
      .from('reports')
      .update(updates)
      .eq('id', input.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update report: ${error.message}`);
    return this.mapReportFromDB(data);
  },

  async deleteReport(reportId: string): Promise<void> {
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId);

    if (error) throw new Error(`Failed to delete report: ${error.message}`);
  },

  async getReport(reportId: string): Promise<Report> {
    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        group:groups!inner (*)
      `)
      .eq('id', reportId)
      .single();

    if (error) throw new Error(`Failed to fetch report: ${error.message}`);
    return this.mapReportFromDB(data);
  },

  async getGroupReports(groupId: string): Promise<Report[]> {
    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        group:groups!inner (*)
      `)
      .eq('group_id', groupId);

    if (error) throw new Error(`Failed to fetch group reports: ${error.message}`);
    return data.map(this.mapReportFromDB);
  },

  async getUserAccessibleReports(userId: string): Promise<Report[]> {
    const { data, error } = await supabase
      .rpc('get_user_accessible_reports', { p_user_id: userId });

    if (error) throw new Error(`Failed to fetch accessible reports: ${error.message}`);
    return data.map(this.mapReportFromDB);
  },

  private mapReportFromDB(data: any): Report {
    return {
      id: data.id,
      title: data.title,
      content: data.content,
      groupId: data.group_id,
      group: data.group ? {
        id: data.group.id,
        name: data.group.name,
        expiryDays: data.group.expiry_days,
        accessibleTabs: data.group.accessible_tabs,
        createdAt: data.group.created_at
      } : undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
};