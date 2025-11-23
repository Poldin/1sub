/**
 * Tool Phase Calculation Utility
 * 
 * Automatically calculates tool development phases based on paying user counts.
 * Phase thresholds:
 * - Alpha: 0-99 paying users (Red #ef4444)
 * - Beta: 100-499 paying users (Orange #f59e0b)
 * - Public: 500+ paying users (Green #3ecf8e)
 */

export type ToolPhase = 'alpha' | 'beta' | 'public';

export interface PhaseColors {
    border: string;
    badge: string;
    text: string;
    hover: string;
}

/**
 * Calculate the tool phase based on paying user count
 * @param payingUserCount - Number of unique paying users
 * @returns The calculated phase: 'alpha', 'beta', or 'public'
 */
export function getToolPhase(payingUserCount: number): ToolPhase {
    if (payingUserCount >= 500) {
        return 'public';
    } else if (payingUserCount >= 100) {
        return 'beta';
    }
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
 * @returns Formatted label with Greek letter prefix
 */
export function getPhaseLabel(phase: ToolPhase): string {
    switch (phase) {
        case 'alpha':
            return 'α ALPHA';
        case 'beta':
            return 'β BETA';
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
                hover: 'hover:border-[#dc2626] hover:shadow-[#ef4444]/30',
            };
        case 'beta':
            return {
                border: 'border-2 border-[#f59e0b]',
                badge: 'bg-[#f59e0b] text-white',
                hover: 'hover:border-[#d97706] hover:shadow-[#f59e0b]/30',
            };
        case 'public':
            return {
                border: 'border-2 border-[#3ecf8e]',
                badge: 'bg-[#3ecf8e] text-black',
                hover: 'hover:border-[#2dd4bf] hover:shadow-[#3ecf8e]/30',
            };
    }
}
