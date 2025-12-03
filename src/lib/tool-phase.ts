/**
 * Tool Phase Calculation Utility
 * 
 * Automatically calculates tool development phases based on paying user counts and revenue.
 * Phase thresholds (both conditions must be met to exit):
 * - Alpha: < 100 users OR < 1k revenue (Red #ef4444)
 * - Beta: >= 100 users AND >= 1k revenue, but < 1000 users OR < 10k revenue (Orange #f59e0b)
 * - Public: >= 1000 users AND >= 10k revenue (Green #3ecf8e)
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
                border: '#ef4444', // Red
                badge: '#ef4444',
                text: '#ffffff',
                hover: '#dc2626', // Darker red for hover
            };
        case 'beta':
            return {
                border: '#f59e0b', // Orange/Amber
                badge: '#f59e0b',
                text: '#ffffff',
                hover: '#d97706', // Darker orange for hover
            };
        case 'public':
            return {
                border: '#3ecf8e', // Green
                badge: '#3ecf8e',
                text: '#000000',
                hover: '#2dd4bf', // Darker green for hover
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
                border: 'border-2 border-[#ef4444]',
                badge: 'bg-[#ef4444] text-white',
                hover: 'hover:border-[#dc2626] hover:shadow-lg hover:shadow-[#ef4444]/30 hover:-translate-y-1',
            };
        case 'beta':
            return {
                border: 'border-2 border-[#f59e0b]',
                badge: 'bg-[#f59e0b] text-white',
                hover: 'hover:border-[#d97706] hover:shadow-lg hover:shadow-[#f59e0b]/30 hover:-translate-y-1',
            };
        case 'public':
            return {
                border: 'border-2 border-[#3ecf8e]',
                badge: 'bg-[#3ecf8e] text-black',
                hover: 'hover:border-[#2dd4bf] hover:shadow-lg hover:shadow-[#3ecf8e]/30 hover:-translate-y-1',
            };
    }
}
