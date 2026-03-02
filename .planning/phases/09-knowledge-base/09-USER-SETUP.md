# Phase 09: User Setup Required

**Generated:** 2026-03-02
**Phase:** 09-knowledge-base
**Status:** Incomplete

Complete these items for repository integration and encrypted token storage to function.

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `ENCRYPTION_KEY` | Generate locally: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | `.env.local` |

## Dashboard Configuration

- [ ] **Create a GitHub Personal Access Token**
  - Location: GitHub -> Settings -> Developer settings -> Personal access tokens -> Generate new token
  - Notes: Use `repo` scope for private repositories or `public_repo` for public repositories only.

## Verification

After completing setup:

```bash
# Confirm encryption key exists
echo $ENCRYPTION_KEY

# Trigger type-check and ensure crypto module loads
npx.cmd tsc --noEmit
```

Expected results:
- `ENCRYPTION_KEY` is set and 64 hex characters long.
- TypeScript passes and repository add/sync flows no longer fail due missing encryption key.

---

**Once all items complete:** Mark status as "Complete" at top of file.
