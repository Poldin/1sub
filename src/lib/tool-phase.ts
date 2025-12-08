/**
 * Tool Phase Calculation Utility
 * 
 * Automatically calculates tool development phases based on paying user counts and revenue.
 * Phase thresholds (both conditions must be met to exit):
 * - Alpha: < 100 users OR < 1k revenue (Dark Green #166534)
 * - Beta: >= 100 users AND >= 1k revenue, but < 1000 users OR < 10k revenue (Medium Green #22c55e)
 * - Public: >= 1000 users AND >= 10k revenue (Light Green #4ade80)
 */

export type ToolPhase = 'alpha' | 'beta' | 'public';

export interface PhaseColors {
    border: string;
    badge: string;
    text: string;
    hover: string;
}

/**
 * Calculate the tool phase based on paying user count and revenue
 * Both conditions must be met to exit a phase.
 * @param payingUserCount - Number of unique paying users
 * @param revenue - Revenue in credits/currency (defaults to 0 if not provided)
 * @returns The calculated phase: 'alpha', 'beta', or 'public'
 */
export function getToolPhase(payingUserCount: number, revenue: number = 0): ToolPhase {
    // Public: Need 1000+ users AND 10k+ revenue
    if (payingUserCount >= 1000 && revenue >= 10000) {
        return 'public';
    }
    
    // Beta: Need 100+ users AND 1k+ revenue (but not yet public)
    if (payingUserCount >= 100 && revenue >= 1000) {
        return 'beta';
    }
    
    // Alpha: Everything else (< 100 users OR < 1k revenue)
    return 'alpha';
}

/**
 * Get color configuration for a given phase
 * @param phase - The tool phase
 * @returns Object with border, badge, text, and hover colors
 */
export function getPhaseColors(phase: ToolPhase): PhaseColors {
    switch (phase) {
        case 'alpha':
            return {
                border: '#166534', // Dark Green
                badge: '#166534',
                text: '#ffffff',
                hover: '#14532d', // Darker green for hover
            };
        case 'beta':
            return {
                border: '#22c55e', // Medium Green
                badge: '#22c55e',
                text: '#000000',
                hover: '#16a34a', // Slightly darker green for hover
            };
        case 'public':
            return {
                border: '#4ade80', // Light Green
                badge: '#4ade80',
                text: '#000000',
                hover: '#3ecf8e', // Slightly darker green for hover
            };
    }
}

/**
 * Get human-readable label for a phase
 * @param phase - The tool phase
 * @returns Formatted label
 */
export function getPhaseLabel(phase: ToolPhase): string {
    switch (phase) {
        case 'alpha':
            return 'ALPHA';
        case 'beta':
            return 'BETA';
        case 'public':
            return 'PUBLIC';
    }
}

/**
 * Get Tailwind CSS classes for phase styling
 * Useful for components that need Tailwind-specific classes
 * @param phase - The tool phase
 * @returns Object with Tailwind class strings
 */
export function getPhaseTailwindClasses(phase: ToolPhase) {
    switch (phase) {
        case 'alpha':
            return {
                border: 'border-2 border-[#166534]',
                badge: 'bg-[#166534] text-white',
                hover: 'hover:border-[#14532d] hover:shadow-lg hover:shadow-[#166534]/30 hover:-translate-y-1',
            };
        case 'beta':
            return {
                border: 'border-2 border-[#22c55e]',
                badge: 'bg-[#22c55e] text-black',
                hover: 'hover:border-[#16a34a] hover:shadow-lg hover:shadow-[#22c55e]/30 hover:-translate-y-1',
            };
        case 'public':
            return {
                border: 'border-2 border-[#4ade80]',
                badge: 'bg-[#4ade80] text-black',
                hover: 'hover:border-[#3ecf8e] hover:shadow-lg hover:shadow-[#4ade80]/30 hover:-translate-y-1',
            };
    }
}
