/**
 * Configuration for determining sidebar behavior across different routes
 */

/**
 * Routes where the sidebar should NOT be forced open on desktop
 * (i.e., they keep the hamburger-only behavior even on desktop)
 */
const HAMBURGER_ONLY_ROUTES = [
  '/profile',
  '/support',
];

/**
 * Check if a given pathname should use hamburger-only sidebar behavior
 * @param pathname - The current route pathname
 * @returns true if sidebar should be hamburger-only (not forced open on desktop)
 */
export function shouldUseHamburgerOnly(pathname: string): boolean {
  return HAMBURGER_ONLY_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`));
}

/**
 * Check if a given pathname is in the back office section
 * @param pathname - The current route pathname
 * @returns true if in back office
 */
export function isBackOfficePage(pathname: string): boolean {
  return pathname.startsWith('/backoffice');
}

/**
 * Check if a given pathname is in the vendor dashboard section
 * @param pathname - The current route pathname
 * @returns true if in vendor dashboard
 */
export function isVendorDashboardPage(pathname: string): boolean {
  return pathname.startsWith('/vendor-dashboard');
}

/**
 * Check if a given pathname is in the admin section
 * @param pathname - The current route pathname
 * @returns true if in admin section
 */
export function isAdminPage(pathname: string): boolean {
  return pathname.startsWith('/admin');
}

/**
 * Determine if the sidebar should be forced open on desktop for the given pathname
 * @param pathname - The current route pathname
 * @returns true if sidebar should be forced open on desktop
 */
export function shouldForceDesktopOpen(pathname: string): boolean {
  // Don't force open on profile or support pages
  if (shouldUseHamburgerOnly(pathname)) {
    return false;
  }

  // Force open for back office, vendor dashboard, and admin pages
  return isBackOfficePage(pathname) || isVendorDashboardPage(pathname) || isAdminPage(pathname);
}













