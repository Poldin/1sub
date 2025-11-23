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

interface VendorApplicationRaw extends VendorApplication {
  user_profile: { id: string; full_name: string | null } | { id: string; full_name: string | null }[] | null;
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
        id,
        user_id,
        company,
        website,
        description,
        status,
        created_at,
        updated_at,
        reviewed_at,
        reviewed_by,
        rejection_reason,
        metadata,
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

    const applicationsWithEmail = (data as VendorApplicationRaw[] | null)?.map((app) => {
      // Handle user_profile which might be an array or a single object
      const userProfile = Array.isArray(app.user_profile) 
        ? app.user_profile[0] || null
        : app.user_profile;

      return {
        ...app,
        user_profile: userProfile ? {
          ...userProfile,
          email: userEmailMap.get(app.user_id) || 'Unknown',
        } : {
          id: app.user_id,
          full_name: null,
          email: userEmailMap.get(app.user_id) || 'Unknown',
        },
      };
    }) || [];

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
      console.error('Error processing vendor application (RPC):', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        applicationId: params.applicationId,
        newStatus: params.newStatus,
      });
      
      // If RPC function doesn't exist or fails, try direct update as fallback
      if (error.code === '42883' || error.message?.includes('does not exist')) {
        console.warn('RPC function not found, using fallback method');
        return await processVendorApplicationFallback(params);
      }
      
      // Provide more detailed error message
      let errorMessage = 'Failed to process application';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.details) {
        errorMessage = error.details;
      } else if (error.hint) {
        errorMessage = error.hint;
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }

    const result = data?.[0];
    if (!result) {
      console.error('RPC function returned no result:', { data, applicationId: params.applicationId });
      return {
        success: false,
        error: 'No result returned from server',
      };
    }
    
    if (!result.success) {
      console.error('RPC function returned failure:', { result, applicationId: params.applicationId });
      return {
        success: false,
        error: result.message || 'Failed to process application',
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
      error: error instanceof Error ? error.message : 'Internal server error',
    };
  }
}

/**
 * Fallback method to process vendor application without RPC function
 */
async function processVendorApplicationFallback(params: {
  applicationId: string;
  newStatus: 'approved' | 'rejected' | 'under_review';
  reviewerId: string;
  rejectionReason?: string;
}): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const supabase = await createClient();

    // Get application details first
    const { data: application, error: fetchError } = await supabase
      .from('vendor_applications')
      .select('user_id, status')
      .eq('id', params.applicationId)
      .single();

    if (fetchError || !application) {
      return {
        success: false,
        error: 'Application not found',
      };
    }

    // Update application status
    const { error: updateError } = await supabase
      .from('vendor_applications')
      .update({
        status: params.newStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: params.reviewerId,
        rejection_reason: params.rejectionReason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.applicationId);

    if (updateError) {
      console.error('Error updating vendor application:', updateError);
      return {
        success: false,
        error: 'Failed to update application status',
      };
    }

    // If approved, update user profile to vendor
    if (params.newStatus === 'approved') {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          is_vendor: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', application.user_id);

      if (profileError) {
        console.error('Error updating user profile:', profileError);
        // Don't fail the whole operation, just log the error
      }
    }

    return {
      success: true,
      message: 'Application processed successfully',
    };
  } catch (error) {
    console.error('Error in processVendorApplicationFallback:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
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

