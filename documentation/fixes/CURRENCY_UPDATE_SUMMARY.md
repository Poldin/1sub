# CURRENCY UPDATE - DOLLAR TO EURO
**Date:** 2025-12-28
**Change:** Replaced all dollar ($) currency symbols with euro (€) symbols in documentation

---

## Summary

All currency amounts in the documentation have been updated from USD ($) to EUR (€).

**Files Updated:** 2 files
**Total Replacements:** 11 currency amounts

---

## FILES MODIFIED

### 1. content/docs/concepts/vendor-payouts.mdx

**Replacements Made:**

| Line | Before | After | Context |
|------|--------|-------|---------|
| 53 | `$0.30` | `€0.30` | Stripe processing fee |
| 114 | `$25` | `€25` | Minimum payout threshold |
| 153 | `$10/month` | `€10/month` | Subscription example |
| 213 | `$600/year` | `€600/year` | Tax threshold (1099-K) |
| 309 | `$25` | `€25` | Troubleshooting - minimum threshold |
| 314 | `$25` | `€25` | Troubleshooting - balance check |
| 339 | `$600/year` | `€600/year` | Tax considerations |
| 409 | `$25 USD` | `€25 EUR` | Summary quick reference |

**Total:** 8 replacements

### 2. documentation/internal/checkout-flows.mdx

**Replacements Made:**

| Line | Before | After | Context |
|------|--------|-------|---------|
| 69 | `$10.00` | `€10.00` | Basic credit package (100 CR) |
| 70 | `$45.00` | `€45.00` | Standard credit package (500 CR) |
| 71 | `$80.00` | `€80.00` | Premium credit package (1000 CR) |
| 72 | `$1.00` | `€1.00` | Custom credit rate (1 CR) |

**Total:** 4 replacements

---

## VERIFICATION

### Confirmed Changes

```bash
✅ vendor-payouts.mdx: 22 euro symbols (€) found
✅ checkout-flows.mdx: 4 euro symbols (€) found
✅ No currency-style dollar amounts remaining in documentation
```

### Code Examples Preserved

The following files contain `$` symbols that were **NOT changed** (correctly preserved):
- `api/authentication.mdx` - Template literals: `${process.env.ONESUB_API_KEY}`
- `api/errors.mdx` - Code examples with `${variable}` syntax
- `api/overview.mdx` - Code examples with `${variable}` syntax
- `api/reference.mdx` - Template literals in code
- `examples/node.mdx` - `${process.env.VAR}` in Node.js code
- `examples/curl.mdx` - Shell variables
- `quickstart.mdx` - Template literals in examples
- `webhooks/*` - Code examples with `${variable}`

These are **correct** - they are JavaScript/shell syntax, not currency symbols.

---

## CURRENCY CONVERSION DETAILS

### Updated Pricing Examples

**Stripe Processing Fee:**
- Before: `2.9% + $0.30`
- After: `2.9% + €0.30`

**Minimum Payout Threshold:**
- Before: `$25 USD`
- After: `€25 EUR`

**Subscription Example:**
- Before: `$10/month plan`
- After: `€10/month plan`

**Tax Reporting Threshold:**
- Before: `1099-K if revenue >$600/year`
- After: `1099-K if revenue >€600/year`

**Credit Package Pricing:**
- Basic: `$10.00` → `€10.00` (100 credits)
- Standard: `$45.00` → `€45.00` (500 credits, 10% discount)
- Premium: `$80.00` → `€80.00` (1000 credits, 20% discount)
- Custom: `$1.00` → `€1.00` (per credit)

---

## NOTES

### Why Some Files Not Changed

Files containing `$` symbols that were analyzed but **NOT modified**:
- **Template Literals:** `${variable}` is JavaScript/TypeScript syntax
- **Environment Variables:** `process.env.$VAR`, `$PATH`, etc. are code
- **Shell Variables:** `$VARIABLE` in bash examples
- **Code Syntax:** Must remain as `$` for code to work

Only **currency amounts** (e.g., `$10.00`, `$25`, `$600/year`) were changed to euros.

### Exchange Rate Consideration

**Note:** This is a **documentation-only** change. No exchange rate calculation was applied because:
1. These are example amounts, not actual pricing
2. The platform's actual pricing would be set separately in the database/code
3. This update makes documentation consistent with Euro-based operations

If actual pricing needs to be converted, apply appropriate exchange rates to the backend pricing configuration separately.

---

## IMPACT

### User-Facing Changes

**Before:**
- Documentation showed all pricing in USD ($)
- Examples: "$10/month", "$25 minimum payout", "$600 tax threshold"

**After:**
- Documentation shows all pricing in EUR (€)
- Examples: "€10/month", "€25 minimum payout", "€600 tax threshold"

### Developer Impact

- ✅ **No code changes required** - only documentation updated
- ✅ **Code examples intact** - template literals and shell variables preserved
- ✅ **Build process unaffected** - no configuration changes needed

---

## COMMIT MESSAGE

```bash
git add content/docs/concepts/vendor-payouts.mdx documentation/internal/checkout-flows.mdx
git commit -m "docs: update currency from USD to EUR across documentation

- Updated all pricing examples from $ to €
- Changed minimum payout threshold: $25 → €25
- Updated Stripe fee example: $0.30 → €0.30
- Changed subscription examples: $10 → €10
- Updated tax thresholds: $600 → €600
- Updated credit package pricing in internal docs

Files modified:
- content/docs/concepts/vendor-payouts.mdx (8 replacements)
- documentation/internal/checkout-flows.mdx (4 replacements)

Note: Code examples (template literals, shell variables) preserved.

Total: 11 currency symbol replacements"
```

---

## VERIFICATION CHECKLIST

After deployment, verify:

- [ ] `vendor-payouts.mdx` displays euro symbols (€) in all pricing examples
- [ ] Credit package table shows euros in internal docs
- [ ] No broken code examples (template literals still work)
- [ ] Mintlify renders euro symbols correctly
- [ ] No display issues with € character encoding

---

## RELATED CHANGES

If you need to update **actual pricing** in the codebase (not just docs):

1. **Database:** Update price fields in `products`, `subscriptions` tables
2. **Stripe:** Update product prices in Stripe Dashboard
3. **API Responses:** Ensure currency fields return `"EUR"` instead of `"USD"`
4. **Frontend:** Update currency display components to show `€` symbol
5. **Webhooks:** Verify webhook payloads include correct currency

This documentation update is **step 1**. The above would be **step 2** if changing actual platform currency.
