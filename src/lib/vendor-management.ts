/**
 * Vendor Management Utilities
 * 
 * Handles vendor application workflow, status management, and vendor operations.
 */

import { createClient } from '@/lib/supabase/server';

export interface VendorApplication {
  id: string;
  user_id: string;
  company: string;
  website: string | null;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  metadata: Record<string, unknown> | null;
}

export interface VendorApplicationWithUser extends VendorApplication {
  user_profile: {
    id: string;
    full_name: string | null;
    email: string;
  };
}

/**
 * Create a new vendor application
 */
export async function createVendorApplication(params: {
  userId: string;
  company: string;
  website?: string;
  description: string;
}): Promise<{ success: boolean; error?: string; application?: VendorApplication }> {
  try {
    const supabase = await createClient();

    // Check if user already has an application
    const { data: existing } = await supabase
      .from('vendor_applications')
      .select('id, status')
      .eq('user_id', params.userId)
      .single();

    if (existing) {
      return {
        success: false,
        error: `You already have a ${existing.status} application`,
      };
    }

    // Create new application
    const { data, error } = await supabase
      .from('vendor_applications')
      .insert({
        user_id: params.userId,
        company: params.company,
        website: params.website || null,
        description: params.description,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating vendor application:', error);
      return {
        success: false,
        error: 'Failed to create application',
      };
    }

    return {
      success: true,
      application: data as VendorApplication,
    };
  } catch (error) {
    console.error('Error in createVendorApplication:', error);
    return {
      success: false,
      error: 'Internal server error',
    };
  }
}

/**
 * Get vendor application by user ID
 */
export async function getVendorApplicationByUserId(
  userId: string
): Promise<VendorApplication | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('vendor_applications')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as VendorApplication;
  } catch (error) {
    console.error('Error in getVendorApplicationByUserId:', error);
    return null;
  }
}

/**
 * Get all vendor applications (admin only)
 */
export async function getAllVendorApplications(filters?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ applications: VendorApplicationWithUser[]; total: number }> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('vendor_applications')
      .select(`
        *,
        user_profile:user_profiles!vendor_applications_user_id_fkey(
          id,
          full_name
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching vendor applications:', error);
      return { applications: [], total: 0 };
    }

    // Get user emails from auth
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    
    const userEmailMap = new Map(
      authUsers?.users.map(u => [u.id, u.email]) || []
    );

    const applicationsWithEmail = data?.map((app: VendorApplication & { user_profile: { id: string; full_name: string | null } | null }) => ({
      ...app,
      user_profile: {
        ...app.user_profile,
        email: userEmailMap.get(app.user_id) || 'Unknown',
      },
    })) || [];

    return {
      applications: applicationsWithEmail as VendorApplicationWithUser[],
      total: count || 0,
    };
  } catch (error) {
    console.error('Error in getAllVendorApplications:', error);
    return { applications: [], total: 0 };
  }
}

/**
 * Process vendor application (approve/reject)
 */
export async function processVendorApplication(params: {
  applicationId: string;
  newStatus: 'approved' | 'rejected' | 'under_review';
  reviewerId: string;
  rejectionReason?: string;
}): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const supabase = await createClient();

    // Use the RPC function for atomic operation
    const { data, error } = await supabase.rpc('process_vendor_application', {
      p_application_id: params.applicationId,
      p_new_status: params.newStatus,
      p_reviewer_id: params.reviewerId,
      p_rejection_reason: params.rejectionReason || null,
    });

    if (error) {
      console.error('Error processing vendor application:', error);
      return {
        success: false,
        error: 'Failed to process application',
      };
    }

    const result = data?.[0];
    if (!result || !result.success) {
      return {
        success: false,
        error: result?.message || 'Failed to process application',
      };
    }

    return {
      success: true,
      message: result.message,
    };
  } catch (error) {
    console.error('Error in processVendorApplication:', error);
    return {
      success: false,
      error: 'Internal server error',
    };
  }
}

/**
 * Check if user is a vendor
 */
export async function isUserVendor(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('user_profiles')
      .select('is_vendor')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.is_vendor === true;
  } catch (error) {
    console.error('Error in isUserVendor:', error);
    return false;
  }
}

/**
 * Update vendor application status
 */
export async function updateApplicationStatus(
  applicationId: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('vendor_applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', applicationId);

    if (error) {
      console.error('Error updating application status:', error);
      return {
        success: false,
        error: 'Failed to update status',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateApplicationStatus:', error);
    return {
      success: false,
      error: 'Internal server error',
    };
  }
}

