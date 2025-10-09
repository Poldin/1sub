-- Phase 4: Low Balance Alert System
-- Database triggers and functions for monitoring credit balances

-- Create function to check and alert on low balances
CREATE OR REPLACE FUNCTION check_low_balance_trigger()
RETURNS TRIGGER AS $$
DECLARE
    user_email TEXT;
    user_name TEXT;
    alert_threshold NUMERIC := 10.00; -- Default threshold
BEGIN
    -- Only trigger on balance updates (not inserts)
    IF TG_OP = 'UPDATE' THEN
        -- Check if balance dropped below threshold
        IF NEW.balance < alert_threshold AND OLD.balance >= alert_threshold THEN
            -- Get user details
            SELECT email, full_name INTO user_email, user_name
            FROM public.users
            WHERE id = NEW.user_id;
            
            -- Log the alert (you can extend this to send emails)
            INSERT INTO public.usage_logs (
                user_id,
                tool_id,
                credits_consumed,
                status,
                metadata
            ) VALUES (
                NEW.user_id,
                NULL,
                0,
                'failed',
                jsonb_build_object(
                    'alert_type', 'low_balance',
                    'threshold', alert_threshold,
                    'current_balance', NEW.balance,
                    'previous_balance', OLD.balance,
                    'alert_date', NOW(),
                    'user_email', user_email,
                    'user_name', user_name
                )
            );
            
            -- Log to console (for development)
            RAISE NOTICE 'Low balance alert: User % (%) has %.2f credits (threshold: %.2f)', 
                user_name, user_email, NEW.balance, alert_threshold;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on credit_balances table
DROP TRIGGER IF EXISTS low_balance_alert_trigger ON public.credit_balances;
CREATE TRIGGER low_balance_alert_trigger
    AFTER UPDATE ON public.credit_balances
    FOR EACH ROW
    EXECUTE FUNCTION check_low_balance_trigger();

-- Create function to manually check all low balances
CREATE OR REPLACE FUNCTION check_all_low_balances(check_threshold NUMERIC DEFAULT 10.00)
RETURNS TABLE (
    user_id UUID,
    user_email TEXT,
    user_name TEXT,
    current_balance NUMERIC,
    threshold NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cb.user_id,
        u.email,
        u.full_name,
        cb.balance,
        check_threshold
    FROM public.credit_balances cb
    JOIN public.users u ON cb.user_id = u.id
    WHERE cb.balance < check_threshold
    AND cb.balance >= 0; -- Exclude negative balances
END;
$$ LANGUAGE plpgsql;

-- Create function to get alert statistics
CREATE OR REPLACE FUNCTION get_alert_stats()
RETURNS TABLE (
    total_alerts BIGINT,
    low_balance_alerts BIGINT,
    recent_alerts BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM public.usage_logs WHERE metadata->>'alert_type' IS NOT NULL) as total_alerts,
        (SELECT COUNT(*) FROM public.usage_logs WHERE metadata->>'alert_type' = 'low_balance') as low_balance_alerts,
        (SELECT COUNT(*) FROM public.usage_logs WHERE metadata->>'alert_type' IS NOT NULL AND created_at > NOW() - INTERVAL '24 hours') as recent_alerts;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for admin access
GRANT EXECUTE ON FUNCTION check_all_low_balances(NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION get_alert_stats() TO authenticated;
