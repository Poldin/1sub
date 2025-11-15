/**
 * Credit Balance Validation API (Admin Only)
 * 
 * Validates credit balances for all users or specific users.
 * Compares balance_after from latest transaction with calculated balance from all transactions.
 * 
 * Features:
 * - Admin-only access
 * - Batch validation for all users or specific users
 * - Identifies inconsistencies in balance tracking
 * - Returns detailed validation results
 * - Can be called by monitoring systems
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface ValidationResult {
  userId: string;
  userEmail: string;
  balanceFromLatest: number;
  balanceFromCalculation: number;
  isConsistent: boolean;
  discrepancy: number;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    if (profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { userIds, limit = 100 } = body;

    console.log('[Admin] Starting balance validation', {
      adminId: authUser.id,
      specificUsers: userIds ? userIds.length : 'all',
      limit,
    });

    // Get users to validate
    let usersToValidate: { id: string; email: string }[] = [];

    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      // Validate specific users
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, email')
        .in('id', userIds);

      if (usersError) {
        console.error('Error fetching users:', usersError);
        return NextResponse.json(
          { error: 'Failed to fetch users' },
          { status: 500 }
        );
      }

      usersToValidate = users || [];
    } else {
      // Get all users with credit transactions
      const { data: allUserIds, error: userIdsError } = await supabase
        .from('credit_transactions')
        .select('user_id')
        .limit(limit);

      if (userIdsError) {
        console.error('Error fetching user IDs:', userIdsError);
        return NextResponse.json(
          { error: 'Failed to fetch user IDs' },
          { status: 500 }
        );
      }

      // Get unique user IDs
      const uniqueUserIds = [...new Set(allUserIds?.map(t => t.user_id) || [])];

      // Fetch user profiles
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, email')
        .in('id', uniqueUserIds.slice(0, limit));

      if (usersError) {
        console.error('Error fetching users:', usersError);
        return NextResponse.json(
          { error: 'Failed to fetch users' },
          { status: 500 }
        );
      }

      usersToValidate = users || [];
    }

    console.log(`[Admin] Validating ${usersToValidate.length} users`);

    // Validate each user's balance
    const results: ValidationResult[] = [];
    let inconsistencies = 0;

    for (const user of usersToValidate) {
      try {
        // Get balance from latest transaction (balance_after)
        const { data: latestTransaction } = await supabase
          .from('credit_transactions')
          .select('balance_after')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const balanceFromLatest = latestTransaction?.balance_after ?? 0;

        // Calculate balance from all transactions
        const { data: transactions } = await supabase
          .from('credit_transactions')
          .select('credits_amount, type')
          .eq('user_id', user.id);

        let balanceFromCalculation = 0;
        if (transactions) {
          balanceFromCalculation = transactions.reduce((sum, transaction) => {
            const amount = transaction.credits_amount || 0;
            if (transaction.type === 'add') {
              return sum + amount;
            } else if (transaction.type === 'subtract') {
              return sum - amount;
            }
            return sum;
          }, 0);
        }

        const isConsistent = balanceFromLatest === balanceFromCalculation;
        const discrepancy = balanceFromLatest - balanceFromCalculation;

        if (!isConsistent) {
          inconsistencies++;
          console.warn('[Admin] Balance inconsistency detected', {
            userId: user.id,
            userEmail: user.email,
            balanceFromLatest,
            balanceFromCalculation,
            discrepancy,
          });
        }

        results.push({
          userId: user.id,
          userEmail: user.email,
          balanceFromLatest,
          balanceFromCalculation,
          isConsistent,
          discrepancy,
        });

        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 50));

      } catch (error) {
        console.error(`[Admin] Error validating user ${user.id}:`, error);
        results.push({
          userId: user.id,
          userEmail: user.email,
          balanceFromLatest: 0,
          balanceFromCalculation: 0,
          isConsistent: false,
          discrepancy: 0,
        });
      }
    }

    const summary = {
      totalValidated: results.length,
      consistent: results.filter(r => r.isConsistent).length,
      inconsistent: inconsistencies,
      inconsistencyRate: results.length > 0 
        ? ((inconsistencies / results.length) * 100).toFixed(2) + '%'
        : '0%',
    };

    console.log('[Admin] Balance validation complete', summary);

    // Log to audit log
    await supabase
      .from('audit_logs')
      .insert({
        user_id: authUser.id,
        action: 'credits_validate',
        resource_type: 'credit_transactions',
        metadata: {
          ...summary,
          adminId: authUser.id,
          adminEmail: authUser.email,
        }
      });

    return NextResponse.json({
      success: true,
      summary,
      results: results.filter(r => !r.isConsistent), // Only return inconsistencies by default
      allResults: results, // Include all results for debugging
    });

  } catch (error) {
    console.error('Error in /api/admin/credits/validate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET method not supported
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'Use POST to validate credit balances'
    },
    { status: 405 }
  );
}

