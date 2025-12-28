# INTERNAL DOCS EXCLUSION - IMPLEMENTATION PLAN
**Date:** 2025-12-28
**Objective:** Ensure internal/architecture docs are NOT included in public documentation builds
**Method:** Single change - Move internal docs outside public content folder

---

## THE ONE CHANGE

### What Counts as INTERNAL

Based on audit findings, these files contain sensitive internal details and MUST be excluded from public docs:

1. **`content/docs/internal/architecture.mdx`**
   - Exposes: DB table names, service file paths, cache TTL, Redis implementation, PostgreSQL internals

2. **`content/docs/internal/checkout-flows.mdx`**
   - Exposes: Internal checkout architecture, internal endpoints, pricing structure, service paths

3. **`content/docs/internal/deployment.mdx`**
   - Exposes: Environment variable formats, secret key structures, internal health endpoints

### Why These Are Internal

| Content Type | Vendor Need | Team Need | Risk if Public |
|--------------|-------------|-----------|----------------|
| Database schema (table names, columns) | ❌ Never | ✅ Yes (migrations, debugging) | High - enables SQL injection targeting |
| Service file paths (`src/domains/*/service.ts`) | ❌ Never | ✅ Yes (development, onboarding) | Medium - reveals internal structure |
| Cache TTL (15-min Redis cache) | ❌ Never | ✅ Yes (performance tuning) | Low - minor timing attack vector |
| Internal endpoints (`/api/checkout/create`) | ❌ Never (different flow) | ✅ Yes (internal testing) | Medium - confusion about integration path |
| Pricing structure (discount percentages) | ❌ Never | ✅ Yes (sales, finance) | Low - competitive intelligence |
| Environment variables (key formats) | ❌ Never | ✅ Yes (deployment) | High - aids key extraction attacks |

---

## IMPLEMENTATION: OPTION 1 (RECOMMENDED)

### Move Internal Docs Outside Public Content Folder

**Why This Approach:**
- ✅ Guaranteed to work (Mintlify only indexes `content/docs/`)
- ✅ No Mintlify configuration changes needed
- ✅ Clear separation (public vs team-only)
- ✅ Internal docs remain in git for team access
- ✅ Cannot be served via direct URL

**Steps:**

#### 1. Create New Internal Docs Location
```bash
# Create directory for team-internal documentation
mkdir -p documentation/internal

# Verify it exists
ls -la documentation/internal
```

#### 2. Move Internal Doc Files
```bash
# Move architecture docs
mv content/docs/internal/architecture.mdx documentation/internal/architecture.mdx

# Move checkout flows docs
mv content/docs/internal/checkout-flows.mdx documentation/internal/checkout-flows.mdx

# Move deployment docs
mv content/docs/internal/deployment.mdx documentation/internal/deployment.mdx

# Remove empty internal folder from public docs
rmdir content/docs/internal
```

**Windows Commands:**
```cmd
mkdir documentation\internal
move content\docs\internal\architecture.mdx documentation\internal\architecture.mdx
move content\docs\internal\checkout-flows.mdx documentation\internal\checkout-flows.mdx
move content\docs\internal\deployment.mdx documentation\internal\deployment.mdx
rmdir content\docs\internal
```

#### 3. Add README for Internal Docs
Create `documentation/internal/README.md`:

```markdown
# Internal Documentation (Team Only)

**⚠️ THESE DOCS ARE NOT PUBLIC**

This folder contains internal architecture and implementation details for the 1Sub team.

## Files

- **architecture.mdx** - System architecture, database schema, service layer design
- **checkout-flows.mdx** - Internal checkout implementation details
- **deployment.mdx** - Deployment guide with environment variables

## Access

These docs are:
- ✅ Available to team members via git repository
- ✅ Used for onboarding and internal reference
- ❌ NOT published to public docs site (https://1sub-6e656888.mintlify.dev)
- ❌ NOT indexed by Mintlify search
- ❌ NOT accessible to vendors

## Public Docs Location

Public vendor documentation is at: `content/docs/`

## Making Changes

Edit files in this folder as needed for team documentation.
Changes will NOT affect public docs.
```

#### 4. Update .gitignore (Optional)
**NOT recommended** - keep internal docs in git for team access

If you want to exclude internal docs from git (not recommended):
```bash
# Add to .gitignore
echo "documentation/internal/" >> .gitignore
```

**Recommendation: Keep in git** so the team can access them.

#### 5. Verify Exclusion

**After deployment to Mintlify, verify these URLs return 404:**

Test in browser or curl:
```bash
# Should all return 404
curl -I https://1sub-6e656888.mintlify.dev/internal/architecture
curl -I https://1sub-6e656888.mintlify.dev/internal/checkout-flows
curl -I https://1sub-6e656888.mintlify.dev/internal/deployment

# Should return 404 or search results WITHOUT internal docs
curl https://1sub-6e656888.mintlify.dev/api/search?q=database%20schema
```

**Expected Results:**
- All `/internal/*` URLs → 404 Not Found
- Search for "database schema" → No results from internal docs
- Mintlify sitemap → No `/internal/*` URLs

#### 6. Update Team Documentation Links (If Any)

Search codebase for links to internal docs:
```bash
# Find references to internal docs
grep -r "docs/internal" .
grep -r "/internal/architecture" .
```

**Update any internal wikis/READMEs:**
```diff
- See [architecture docs](content/docs/internal/architecture.mdx)
+ See [architecture docs](documentation/internal/architecture.mdx)
```

---

## EXACT FILE PATHS

### Before (Current State)
```
content/
└── docs/
    ├── internal/
    │   ├── architecture.mdx        ⚠️ PUBLIC (via Mintlify)
    │   ├── checkout-flows.mdx      ⚠️ PUBLIC (via Mintlify)
    │   └── deployment.mdx          ⚠️ PUBLIC (via Mintlify)
    ├── api/
    ├── webhooks/
    └── ...
```

### After (Target State)
```
content/
└── docs/
    ├── api/
    ├── webhooks/
    └── ...                          ✅ PUBLIC (via Mintlify)

documentation/
├── fixes/
│   ├── PUBLIC_DOCS_AUDIT_REPORT.md
│   └── ...
└── internal/                        ✅ TEAM ONLY (not published)
    ├── README.md                    ✅ New file
    ├── architecture.mdx             ✅ Moved from content/docs/internal/
    ├── checkout-flows.mdx           ✅ Moved from content/docs/internal/
    └── deployment.mdx               ✅ Moved from content/docs/internal/
```

---

## BUILD-TIME FILTER LOGIC

### How Mintlify Works

**Mintlify indexes and serves:**
1. Files referenced in `content/docs/docs.json` navigation
2. All files in the `content/docs/` directory (discoverable via direct URL)

**Mintlify does NOT index:**
- Files outside `content/docs/` (our target for internal docs)
- Files not in the configured content directory

### Current Configuration

**File:** `vercel.json`
```json
{
  "redirects": [
    {
      "source": "/docs",
      "destination": "https://1sub-6e656888.mintlify.dev/docs"
    },
    {
      "source": "/docs/:match*",
      "destination": "https://1sub-6e656888.mintlify.dev/docs/:match*"
    }
  ]
}
```

**File:** `content/docs/docs.json`
```json
{
  "$schema": "https://mintlify.com/docs.json",
  "navigation": {
    "dropdowns": [
      {
        "dropdown": "Documentation",
        "groups": [
          // NO "internal/" group listed ✅
        ]
      }
    ]
  }
}
```

**Current State:**
- ✅ Navigation does NOT include internal/* (good)
- ❌ Files still in `content/docs/internal/` (may be servable via direct URL)

**After Moving Files:**
- ✅ Navigation does NOT include internal/* (unchanged)
- ✅ Files NOT in `content/docs/` (cannot be served by Mintlify)
- ✅ Files in `documentation/internal/` (team access via git, not published)

### No Configuration Changes Needed

**This approach requires ZERO Mintlify config changes** because:
1. Mintlify only serves files in `content/docs/`
2. Moving files to `documentation/internal/` puts them outside Mintlify's scope
3. Navigation already excludes internal docs

---

## NAVIGATION/SIDEBAR EXCLUSION

### Current Navigation (Already Correct)

**File:** `content/docs/docs.json` (lines 17-82)

```json
"groups": [
  {
    "group": "Getting Started",
    "pages": ["index", "quickstart"]
  },
  {
    "group": "Core Concepts",
    "pages": [
      "concepts/monetization-models",
      "concepts/tools-and-accounts",
      "concepts/credits-and-subscriptions",
      "concepts/vendor-payouts",
      "concepts/authentication"  // ⚠️ File doesn't exist - separate issue
    ]
  },
  {
    "group": "REST APIs",
    "pages": [
      "api/overview",
      "api/authentication",
      "api/reference",
      "api/errors"
    ]
  },
  // ... other groups ...
]
// ✅ NO "internal" group - already excluded from navigation
```

**Status:** ✅ Navigation already correct (no internal docs listed)

**After File Move:** No navigation changes needed.

---

## SEARCH INDEXING EXCLUSION

### How Mintlify Search Works

Mintlify search indexes:
1. All files in the configured content directory (`content/docs/`)
2. Follows navigation structure for primary indexing
3. May index files via discovery (crawling `content/docs/`)

**After moving files to `documentation/internal/`:**
- ✅ Files outside content directory → NOT indexed
- ✅ Search for "database schema" → No internal doc results
- ✅ Search for "Redis cache" → No internal doc results

**No search configuration needed** - exclusion is automatic when files are moved.

---

## VERIFICATION TESTS

### Pre-Deployment Tests (Local)

```bash
# 1. Verify files moved
test -f documentation/internal/architecture.mdx && echo "✅ Architecture moved" || echo "❌ Not moved"
test -f documentation/internal/checkout-flows.mdx && echo "✅ Checkout flows moved" || echo "❌ Not moved"
test -f documentation/internal/deployment.mdx && echo "✅ Deployment moved" || echo "❌ Not moved"

# 2. Verify old location empty
test ! -d content/docs/internal && echo "✅ Old internal/ deleted" || echo "❌ Still exists"

# 3. Verify docs.json navigation still valid
cat content/docs/docs.json | grep -q '"internal"' && echo "❌ Internal in nav" || echo "✅ No internal in nav"
```

### Post-Deployment Tests (Production)

```bash
# 1. Test direct URL access (should be 404)
curl -I https://1sub-6e656888.mintlify.dev/internal/architecture | grep "404"
curl -I https://1sub-6e656888.mintlify.dev/internal/checkout-flows | grep "404"
curl -I https://1sub-6e656888.mintlify.dev/internal/deployment | grep "404"

# 2. Test search exclusion
curl "https://1sub-6e656888.mintlify.dev/api/search?q=authorization_codes" | grep -v "architecture.mdx"
curl "https://1sub-6e656888.mintlify.dev/api/search?q=database%20table" | grep -v "internal"

# 3. Check sitemap
curl https://1sub-6e656888.mintlify.dev/sitemap.xml | grep -v "internal"
```

**Expected Results:**
- ✅ All `/internal/*` URLs return 404
- ✅ Search does not return internal doc results
- ✅ Sitemap does not list internal docs

---

## TEAM ACCESS TO INTERNAL DOCS

### How Team Members Access Internal Docs

**Method 1: Read from Git Repository**
```bash
# Clone repo
git clone https://github.com/yourorg/1sub.git
cd 1sub

# Read internal docs
cat documentation/internal/architecture.mdx
cat documentation/internal/checkout-flows.mdx
cat documentation/internal/deployment.mdx
```

**Method 2: GitHub Web UI**
- Navigate to: `https://github.com/yourorg/1sub/tree/main/documentation/internal`
- Click on any `.mdx` file to view (GitHub renders MDX as Markdown)

**Method 3: Local MDX Viewer (Optional)**
Set up a local Nextra or Mintlify preview for internal docs:

```bash
# Create internal docs preview (optional)
# Add to package.json:
"scripts": {
  "docs:internal": "mintlify dev documentation/internal"
}

# Run locally
npm run docs:internal
```

**Recommended:** Method 1 or 2 (no additional setup needed)

---

## ROLLBACK PLAN

If this change causes issues:

```bash
# Rollback: Move files back
mv documentation/internal/architecture.mdx content/docs/internal/architecture.mdx
mv documentation/internal/checkout-flows.mdx content/docs/internal/checkout-flows.mdx
mv documentation/internal/deployment.mdx content/docs/internal/deployment.mdx

# Re-create internal folder if needed
mkdir -p content/docs/internal

# Remove new location
rmdir documentation/internal
```

**Time to Rollback:** < 1 minute

**Risk:** Low - files are just moved, no content changes

---

## SUMMARY

### The ONE Change

**Move 3 files:**
```
content/docs/internal/*.mdx → documentation/internal/*.mdx
```

### Why This Works

1. ✅ Mintlify only serves files in `content/docs/`
2. ✅ Files outside that folder = not published
3. ✅ Navigation already excludes internal docs
4. ✅ No build config changes needed
5. ✅ Team can still access via git

### Implementation Time

- **File moves:** 1 minute
- **Verification:** 5 minutes
- **Post-deployment testing:** 10 minutes
- **Total:** ~15 minutes

### Risk Level

**🟢 LOW**
- Simple file move operation
- No code changes
- No build config changes
- Easy rollback
- Team access preserved

---

## FINAL CHECKLIST

Before considering this complete, verify:

- [ ] Files moved to `documentation/internal/`
- [ ] Old `content/docs/internal/` folder deleted
- [ ] README added to `documentation/internal/`
- [ ] Changes committed to git
- [ ] Deployed to production (Mintlify)
- [ ] `/internal/architecture` returns 404 ✅
- [ ] `/internal/checkout-flows` returns 404 ✅
- [ ] `/internal/deployment` returns 404 ✅
- [ ] Search does not index internal docs ✅
- [ ] Sitemap excludes internal docs ✅
- [ ] Team can access via git repository ✅
- [ ] Rollback plan documented ✅

**STATUS AFTER IMPLEMENTATION:** Internal docs excluded from public builds ✅
