import { supabaseAdmin } from './supabaseAdmin';

export interface AuditLogEntry {
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an admin action to the audit trail
 */
export async function logAdminAction(entry: AuditLogEntry): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin.rpc('log_admin_action', {
      p_action: entry.action,
      p_resource_type: entry.resourceType,
      p_resource_id: entry.resourceId || null,
      p_old_values: entry.oldValues || null,
      p_new_values: entry.newValues || null,
      p_ip_address: entry.ipAddress || null,
      p_user_agent: entry.userAgent || null
    });

    if (error) {
      console.error('Error logging admin action:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in logAdminAction:', error);
    return null;
  }
}

/**
 * Get admin audit logs with pagination and filters
 */
export async function getAdminAuditLogs(
  page: number = 1,
  limit: number = 50,
  actionFilter?: string,
  resourceTypeFilter?: string
) {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_admin_audit_logs', {
      p_page: page,
      p_limit: limit,
      p_action_filter: actionFilter || null,
      p_resource_type_filter: resourceTypeFilter || null
    });

    if (error) {
      console.error('Error fetching audit logs:', error);
      return { logs: [], totalCount: 0 };
    }

    return {
      logs: data || [],
      totalCount: data?.[0]?.total_count || 0
    };
  } catch (error) {
    console.error('Error in getAdminAuditLogs:', error);
    return { logs: [], totalCount: 0 };
  }
}

/**
 * Extract IP address and user agent from NextRequest
 */
export function extractRequestInfo(req: Request): { ipAddress?: string; userAgent?: string } {
  const userAgent = req.headers.get('user-agent') || undefined;
  
  // Try to get IP from various headers (for different proxy setups)
  const ipAddress = 
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-client-ip') ||
    undefined;

  return { ipAddress, userAgent };
}

/**
 * Helper function to create audit log entry for tool operations
 */
export async function auditToolOperation(
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  toolId: string,
  oldValues?: any,
  newValues?: any,
  req?: Request
): Promise<void> {
  const requestInfo = req ? extractRequestInfo(req) : {};
  
  await logAdminAction({
    action,
    resourceType: 'tool',
    resourceId: toolId,
    oldValues,
    newValues,
    ...requestInfo
  });
}

/**
 * Helper function to create audit log entry for user operations
 */
export async function auditUserOperation(
  action: 'UPDATE' | 'DELETE',
  userId: string,
  oldValues?: any,
  newValues?: any,
  req?: Request
): Promise<void> {
  const requestInfo = req ? extractRequestInfo(req) : {};
  
  await logAdminAction({
    action,
    resourceType: 'user',
    resourceId: userId,
    oldValues,
    newValues,
    ...requestInfo
  });
}

/**
 * Helper function to create audit log entry for credit operations
 */
export async function auditCreditOperation(
  action: 'ADJUST' | 'GRANT' | 'CONSUME',
  userId: string,
  amount: number,
  reason: string,
  req?: Request
): Promise<void> {
  const requestInfo = req ? extractRequestInfo(req) : {};
  
  await logAdminAction({
    action,
    resourceType: 'credits',
    resourceId: userId,
    newValues: { amount, reason },
    ...requestInfo
  });
}
