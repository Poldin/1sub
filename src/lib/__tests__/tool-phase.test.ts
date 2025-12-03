import { getToolPhase, getPhaseLabel, getPhaseTailwindClasses } from '../tool-phase';

describe('Tool Phase Utilities', () => {
    describe('getToolPhase', () => {
        describe('Alpha phase (< 100 users OR < 1k revenue)', () => {
            it('should return alpha for low user count regardless of revenue', () => {
                expect(getToolPhase(0, 0)).toBe('alpha');
                expect(getToolPhase(50, 0)).toBe('alpha');
                expect(getToolPhase(99, 0)).toBe('alpha');
                expect(getToolPhase(50, 5000)).toBe('alpha'); // Low users, high revenue
            });

            it('should return alpha for low revenue regardless of user count', () => {
                expect(getToolPhase(0, 0)).toBe('alpha');
                expect(getToolPhase(0, 500)).toBe('alpha');
                expect(getToolPhase(0, 999)).toBe('alpha');
                expect(getToolPhase(500, 500)).toBe('alpha'); // High users, low revenue
            });

            it('should return alpha when both conditions are low', () => {
                expect(getToolPhase(50, 500)).toBe('alpha');
                expect(getToolPhase(99, 999)).toBe('alpha');
            });
        });

        describe('Beta phase (>= 100 users AND >= 1k revenue, but < 1000 users OR < 10k revenue)', () => {
            it('should return beta when both thresholds are met but below public', () => {
                expect(getToolPhase(100, 1000)).toBe('beta');
                expect(getToolPhase(500, 5000)).toBe('beta');
                expect(getToolPhase(999, 9999)).toBe('beta');
            });

            it('should return beta when users threshold met but revenue below public', () => {
                expect(getToolPhase(1000, 5000)).toBe('beta'); // Users met, revenue not
            });

            it('should return beta when revenue threshold met but users below public', () => {
                expect(getToolPhase(500, 10000)).toBe('beta'); // Revenue met, users not
            });
        });

        describe('Public phase (>= 1000 users AND >= 10k revenue)', () => {
            it('should return public when both thresholds are met', () => {
                expect(getToolPhase(1000, 10000)).toBe('public');
                expect(getToolPhase(1500, 15000)).toBe('public');
                expect(getToolPhase(10000, 100000)).toBe('public');
            });

            it('should not return public if only one threshold is met', () => {
                expect(getToolPhase(1000, 5000)).toBe('beta'); // Users met, revenue not
                expect(getToolPhase(500, 10000)).toBe('beta'); // Revenue met, users not
            });
        });

        describe('Backward compatibility', () => {
            it('should default revenue to 0 when not provided', () => {
                expect(getToolPhase(0)).toBe('alpha');
                expect(getToolPhase(100)).toBe('alpha'); // Without revenue, can't be beta
                expect(getToolPhase(1000)).toBe('alpha'); // Without revenue, can't be public
            });

            it('should handle negative numbers gracefully (default to alpha)', () => {
                expect(getToolPhase(-1)).toBe('alpha');
                expect(getToolPhase(-1, -1)).toBe('alpha');
            });
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
            expect(classes.border).toContain('border-[#ef4444]');
            expect(classes.badge).toContain('bg-[#ef4444]');
        });

        it('should return correct classes for beta', () => {
            const classes = getPhaseTailwindClasses('beta');
            expect(classes.border).toContain('border-[#f59e0b]');
            expect(classes.badge).toContain('bg-[#f59e0b]');
        });

        it('should return correct classes for public', () => {
            const classes = getPhaseTailwindClasses('public');
            expect(classes.border).toContain('border-[#3ecf8e]');
            expect(classes.badge).toContain('bg-[#3ecf8e]');
        });
    });
});
