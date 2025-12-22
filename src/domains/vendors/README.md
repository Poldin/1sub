# Vendors Domain

Handles vendor management and analytics.

## Canonical Entry Points

| File | Functions | Purpose |
|------|-----------|---------|
| `service.ts` | `applyAsVendor()`, `approveVendor()` | Vendor lifecycle |
| `analytics.service.ts` | `getRevenue()`, `getTimeSeries()` | Vendor analytics |

## Database Tables

- `vendor_applications` - Vendor applications
- `tools` - Vendor tools (owned by vendor)

## Rules

1. Vendors must be approved before creating tools
2. Tools belong to exactly one vendor
3. Analytics are vendor-scoped
