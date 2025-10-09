import { supabaseAdmin } from './supabaseAdmin';

export interface AlertConfig {
  threshold: number;
  enabled: boolean;
  emailNotifications: boolean;
}

export interface LowBalanceAlert {
  userId: string;
  userEmail: string;
  userName: string;
  currentBalance: number;
  threshold: number;
  alertDate: string;
}

/**
 * Check for users with low credit balances
 */
export async function checkLowBalances(threshold: number = 10): Promise<LowBalanceAlert[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('credit_balances')
      .select(`
        user_id,
        balance,
        users!inner(
          id,
          email,
          full_name
        )
      `)
      .lt('balance', threshold)
      .not('balance', 'is', null);

    if (error) {
      console.error('Error checking low balances:', error);
      return [];
    }

    return (data || []).map(item => ({
      userId: item.user_id,
      userEmail: item.users.email,
      userName: item.users.full_name || 'Unknown',
      currentBalance: parseFloat(item.balance),
      threshold,
      alertDate: new Date().toISOString()
    }));
  } catch (error) {
    console.error('Error in checkLowBalances:', error);
    return [];
  }
}

/**
 * Send low balance alert (placeholder for email integration)
 */
export async function sendLowBalanceAlert(alert: LowBalanceAlert): Promise<boolean> {
  try {
    // Log the alert
    console.log(`Low balance alert for ${alert.userEmail}: ${alert.currentBalance} credits (threshold: ${alert.threshold})`);
    
    // TODO: Integrate with email service (Resend, SendGrid, etc.)
    // For now, we'll just log the alert
    await logAlert(alert);
    
    return true;
  } catch (error) {
    console.error('Error sending low balance alert:', error);
    return false;
  }
}

/**
 * Log alert to database for tracking
 */
async function logAlert(alert: LowBalanceAlert): Promise<void> {
  try {
    await supabaseAdmin
      .from('usage_logs')
      .insert({
        user_id: alert.userId,
        tool_id: null,
        credits_consumed: 0,
        status: 'failed',
        metadata: {
          alert_type: 'low_balance',
          threshold: alert.threshold,
          current_balance: alert.currentBalance,
          alert_date: alert.alertDate
        }
      });
  } catch (error) {
    console.error('Error logging alert:', error);
  }
}

/**
 * Get alert configuration for a user
 */
export async function getUserAlertConfig(userId: string): Promise<AlertConfig> {
  try {
    // For now, return default config
    // In the future, this could be stored in user_settings table
    return {
      threshold: 10,
      enabled: true,
      emailNotifications: true
    };
  } catch (error) {
    console.error('Error getting user alert config:', error);
    return {
      threshold: 10,
      enabled: false,
      emailNotifications: false
    };
  }
}

/**
 * Update user alert configuration
 */
export async function updateUserAlertConfig(userId: string, config: AlertConfig): Promise<boolean> {
  try {
    // TODO: Implement user settings storage
    // For now, just return success
    console.log(`Updated alert config for user ${userId}:`, config);
    return true;
  } catch (error) {
    console.error('Error updating user alert config:', error);
    return false;
  }
}

/**
 * Process all low balance alerts
 */
export async function processLowBalanceAlerts(): Promise<void> {
  try {
    const alerts = await checkLowBalances();
    
    for (const alert of alerts) {
      const config = await getUserAlertConfig(alert.userId);
      
      if (config.enabled) {
        await sendLowBalanceAlert(alert);
      }
    }
    
    console.log(`Processed ${alerts.length} low balance alerts`);
  } catch (error) {
    console.error('Error processing low balance alerts:', error);
  }
}
