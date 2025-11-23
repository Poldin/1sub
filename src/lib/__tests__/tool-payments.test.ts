import { countPayingUsersForTool, batchCountPayingUsers, isPayingUser } from '../tool-payments';
import { createClient } from '@/lib/supabase/client';

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
    createClient: jest.fn()
}));

describe('Tool Payment Utilities', () => {
    const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn(),
    };

    beforeEach(() => {
        (createClient as jest.Mock).mockReturnValue(mockSupabase);
        jest.clearAllMocks();
    });

    describe('countPayingUsersForTool', () => {
        it('should count unique users from subscriptions and purchases', async () => {
            // Mock subscriptions
            mockSupabase.select.mockReturnValueOnce({
                data: [{ user_id: 'user1' }, { user_id: 'user2' }],
                error: null
            });

            // Mock purchases
            mockSupabase.select.mockReturnValueOnce({
                data: [
                    { user_id: 'user2', metadata: { tool_id: 'tool1', status: 'completed' } }, // Duplicate user
                    { user_id: 'user3', metadata: { tool_id: 'tool1', status: 'completed' } }
                ],
                error: null
            });

            const count = await countPayingUsersForTool('tool1');
            expect(count).toBe(3); // user1, user2, user3
        });

        it('should handle errors gracefully', async () => {
            mockSupabase.select.mockReturnValue({ data: null, error: 'Some error' });
            const count = await countPayingUsersForTool('tool1');
            expect(count).toBe(0);
        });
    });

    describe('batchCountPayingUsers', () => {
        it('should return counts for multiple tools', async () => {
            // Mock subscriptions
            mockSupabase.select.mockReturnValueOnce({
                data: [
                    { tool_id: 'tool1', user_id: 'user1' },
                    { tool_id: 'tool2', user_id: 'user2' }
                ],
                error: null
            });

            // Mock purchases
            mockSupabase.select.mockReturnValueOnce({
                data: [
                    { user_id: 'user3', metadata: { tool_id: 'tool1', status: 'completed' } }
                ],
                error: null
            });

            const counts = await batchCountPayingUsers(['tool1', 'tool2']);
            expect(counts.get('tool1')).toBe(2); // user1, user3
            expect(counts.get('tool2')).toBe(1); // user2
        });
    });

    describe('isPayingUser', () => {
        it('should return true if user has subscription', async () => {
            mockSupabase.single.mockReturnValueOnce({ data: { id: 'sub1' }, error: null });
            const isPaying = await isPayingUser('user1', 'tool1');
            expect(isPaying).toBe(true);
        });

        it('should return true if user has completed purchase', async () => {
            mockSupabase.single.mockReturnValueOnce({ data: null, error: null }); // No subscription
            mockSupabase.select.mockReturnValueOnce({
                data: [{ metadata: { tool_id: 'tool1', status: 'completed' } }],
                error: null
            });

            const isPaying = await isPayingUser('user1', 'tool1');
            expect(isPaying).toBe(true);
        });

        it('should return false if neither', async () => {
            mockSupabase.single.mockReturnValueOnce({ data: null, error: null });
            mockSupabase.select.mockReturnValueOnce({ data: [], error: null });

            const isPaying = await isPayingUser('user1', 'tool1');
            expect(isPaying).toBe(false);
        });
    });
});
