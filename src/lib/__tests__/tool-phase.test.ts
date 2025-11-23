import { getToolPhase, getPhaseLabel, getPhaseTailwindClasses } from '../tool-phase';

describe('Tool Phase Utilities', () => {
    describe('getToolPhase', () => {
        it('should return alpha for 0-99 users', () => {
            expect(getToolPhase(0)).toBe('alpha');
            expect(getToolPhase(50)).toBe('alpha');
            expect(getToolPhase(99)).toBe('alpha');
        });

        it('should return beta for 100-499 users', () => {
            expect(getToolPhase(100)).toBe('beta');
            expect(getToolPhase(250)).toBe('beta');
            expect(getToolPhase(499)).toBe('beta');
        });

        it('should return public for 500+ users', () => {
            expect(getToolPhase(500)).toBe('public');
            expect(getToolPhase(1000)).toBe('public');
            expect(getToolPhase(10000)).toBe('public');
        });

        it('should handle negative numbers gracefully (default to alpha)', () => {
            expect(getToolPhase(-1)).toBe('alpha');
        });
    });

    describe('getPhaseLabel', () => {
        it('should return correct labels', () => {
            expect(getPhaseLabel('alpha')).toBe('Alpha');
            expect(getPhaseLabel('beta')).toBe('Beta');
            expect(getPhaseLabel('public')).toBe('Public');
        });
    });

    describe('getPhaseTailwindClasses', () => {
        it('should return correct classes for alpha', () => {
            const classes = getPhaseTailwindClasses('alpha');
            expect(classes.border).toContain('border-purple-500');
            expect(classes.badge).toContain('bg-purple-500');
        });

        it('should return correct classes for beta', () => {
            const classes = getPhaseTailwindClasses('beta');
            expect(classes.border).toContain('border-blue-500');
            expect(classes.badge).toContain('bg-blue-500');
        });

        it('should return correct classes for public', () => {
            const classes = getPhaseTailwindClasses('public');
            expect(classes.border).toContain('border-[#3ecf8e]');
            expect(classes.badge).toContain('bg-[#3ecf8e]');
        });
    });
});
