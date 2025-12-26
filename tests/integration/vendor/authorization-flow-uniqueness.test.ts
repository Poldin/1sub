/**
 * Authorization Flow Uniqueness Test
 *
 * Verifies the non-negotiable invariant:
 * There MUST be exactly ONE vendor authorization flow.
 *
 * This test ensures:
 * 1. Only ONE canonical authorization service exists
 * 2. No duplicate implementations exist
 * 3. All API routes use the canonical source
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Vendor Authorization Flow Uniqueness', () => {
  describe('Canonical Source', () => {
    it('should have exactly ONE canonical authorization service', () => {
      const canonicalPath = path.join(
        process.cwd(),
        'src/domains/auth/service.ts'
      );
      expect(fs.existsSync(canonicalPath)).toBe(true);
    });

    it('should export authorization functions from canonical source', () => {
      const canonicalPath = path.join(
        process.cwd(),
        'src/domains/auth/service.ts'
      );
      const content = fs.readFileSync(canonicalPath, 'utf-8');

      // Verify core authorization functions are exported
      expect(content).toMatch(/export.*function createAuthorizationCode/);
      expect(content).toMatch(/export.*function exchangeAuthorizationCode/);
      expect(content).toMatch(/export.*function validateTokenReadOnly/);
      expect(content).toMatch(/export.*function rotateToken/);
      expect(content).toMatch(/export.*function verifyToken/);
      expect(content).toMatch(/export.*function revokeAccess/);
      expect(content).toMatch(/export.*function checkRevocation/);
    });

    it('should have canonical source comment in service.ts', () => {
      const canonicalPath = path.join(
        process.cwd(),
        'src/domains/auth/service.ts'
      );
      const content = fs.readFileSync(canonicalPath, 'utf-8');

      // Verify CANONICAL SOURCE marker exists
      expect(content).toMatch(/CANONICAL SOURCE/i);
    });
  });

  describe('No Duplicates', () => {
    it('should NOT have duplicate vendor-auth file in lib', () => {
      const duplicatePath = path.join(
        process.cwd(),
        'src/lib/vendor-auth.ts'
      );
      expect(fs.existsSync(duplicatePath)).toBe(false);
    });

    it('should NOT have vendor-auth in any lib directory', () => {
      const libPath = path.join(process.cwd(), 'src/lib');
      if (fs.existsSync(libPath)) {
        const files = fs.readdirSync(libPath);
        expect(files).not.toContain('vendor-auth.ts');
      }
    });
  });

  describe('API Route Compliance', () => {
    const apiRoutes = [
      {
        path: 'src/app/api/v1/verify/route.ts',
        description: 'Verify endpoint',
      },
      {
        path: 'src/app/api/v1/authorize/initiate/route.ts',
        description: 'Authorization initiate endpoint',
      },
      {
        path: 'src/app/api/v1/authorize/exchange/route.ts',
        description: 'Authorization exchange endpoint',
      },
      {
        path: 'src/app/api/v1/credits/consume/route.ts',
        description: 'Credits consume endpoint',
      },
    ];

    apiRoutes.forEach(({ path: routePath, description }) => {
      it(`${description} should import from @/domains/auth`, () => {
        const fullPath = path.join(process.cwd(), routePath);

        // Skip if route doesn't exist (flexibility for future changes)
        if (!fs.existsSync(fullPath)) {
          console.warn(`Route not found (skipping): ${routePath}`);
          return;
        }

        const content = fs.readFileSync(fullPath, 'utf-8');

        // Should import from @/domains/auth
        expect(content).toMatch(/@\/domains\/auth/);

        // Should NOT import from lib/vendor-auth
        expect(content).not.toMatch(/lib\/vendor-auth/);
        expect(content).not.toMatch(/@\/lib\/vendor-auth/);
      });
    });

    it('legacy credit-checkout should import from @/domains/auth (if exists)', () => {
      const legacyPath = path.join(
        process.cwd(),
        'src/app/api/credit-checkout/route.ts'
      );

      // This endpoint is deprecated but should still use canonical source
      if (fs.existsSync(legacyPath)) {
        const content = fs.readFileSync(legacyPath, 'utf-8');

        // Should import from @/domains/auth for revocation checks
        expect(content).toMatch(/@\/domains\/auth/);

        // Should NOT import from lib/vendor-auth
        expect(content).not.toMatch(/lib\/vendor-auth/);
      }
    });
  });

  describe('ESLint Protection', () => {
    it('should have ESLint rule preventing vendor-auth imports', () => {
      const eslintConfigPath = path.join(process.cwd(), 'eslint.config.mjs');

      if (fs.existsSync(eslintConfigPath)) {
        const content = fs.readFileSync(eslintConfigPath, 'utf-8');

        // Should have no-restricted-imports rule
        expect(content).toMatch(/no-restricted-imports/);
        expect(content).toMatch(/vendor-auth/);
      } else {
        // Try alternative config files
        const alternativePaths = [
          '.eslintrc.js',
          '.eslintrc.json',
          '.eslintrc.cjs',
        ];

        const foundConfig = alternativePaths.find((configFile) =>
          fs.existsSync(path.join(process.cwd(), configFile))
        );

        if (foundConfig) {
          const content = fs.readFileSync(
            path.join(process.cwd(), foundConfig),
            'utf-8'
          );
          expect(content).toMatch(/no-restricted-imports/);
          expect(content).toMatch(/vendor-auth/);
        }
      }
    });
  });

  describe('Documentation Compliance', () => {
    it('should have README in auth domain documenting canonical source', () => {
      const readmePath = path.join(
        process.cwd(),
        'src/domains/auth/README.md'
      );

      if (fs.existsSync(readmePath)) {
        const content = fs.readFileSync(readmePath, 'utf-8');

        // Should mention canonical source
        expect(content).toMatch(/CANONICAL|canonical/i);
      }
    });
  });

  describe('Flow Architecture', () => {
    it('should have correct vendor authorization flow structure', () => {
      const expectedFlow = [
        'src/app/api/v1/authorize/initiate/route.ts',  // Step 1: User initiates
        'src/app/api/v1/authorize/exchange/route.ts',  // Step 2: Vendor exchanges code
        'src/app/api/v1/verify/route.ts',              // Step 3: Vendor verifies
      ];

      expectedFlow.forEach((routePath) => {
        const fullPath = path.join(process.cwd(), routePath);
        expect(fs.existsSync(fullPath), `Route should exist: ${routePath}`).toBe(true);
      });
    });

    it('should NOT have alternative authorization flows', () => {
      const forbiddenPaths = [
        'src/app/api/auth/vendor.ts',
        'src/app/api/vendor/auth.ts',
        'src/lib/auth/vendor.ts',
        'src/lib/vendor/auth.ts',
        'src/utils/vendor-auth.ts',
        'src/helpers/vendor-auth.ts',
      ];

      forbiddenPaths.forEach((forbiddenPath) => {
        const fullPath = path.join(process.cwd(), forbiddenPath);
        expect(
          fs.existsSync(fullPath),
          `Forbidden alternative auth path should NOT exist: ${forbiddenPath}`
        ).toBe(false);
      });
    });
  });
});
