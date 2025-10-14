# Bug Fixes - Session 2

## Date
October 13, 2025

## Issues Fixed

### 1. White Page on Load
**Problem**: The dev server was running but displaying a white page with Pinia initialization errors.

**Root Cause**: Stores were being called at module level (before Pinia was initialized) in `wallet.ts`.

**Solution**: 
- Removed module-level store calls in `wallet.ts` (lines 89-91)
- Moved store initialization inside the `redeem` action where they're actually used
- Updated `App.vue` to initialize stores inside `onMounted` lifecycle hook

**Files Changed**:
- `src/stores/wallet.ts`
- `src/App.vue`

### 2. Pinia Getter/State Name Conflict
**Problem**: Error: `[🍍]: A getter cannot have the same name as another state property. Found with "seedSignerPrivateKeyNsec" in store "nostr".`

**Root Cause**: The `nostr.ts` store had both a state property AND a getter with the same name `seedSignerPrivateKeyNsec`.

**Solution**: Removed the state property since the getter was computing it from `seedSignerPrivateKey`.

**Files Changed**:
- `src/stores/nostr.ts` (line 87)

### 3. Wrong API Endpoint for npubcash Server
**Problem**: Network error when trying to register with npubcash server - `POST https://npubcash.trailscoffee.com/api/register net::ERR_NAME_NOT_RESOLVED`

**Root Cause**: The API endpoint was `/api/register` instead of `/api/v1/register` (and same for `/api/claim`).

**Solution**: Updated both endpoints to use the correct `/api/v1/` prefix.

**Files Changed**:
- `src/stores/trailsIdentity.ts` (lines 139, 189)

## Remaining Non-Critical Issues

### 1. Missing Icon Files (404 errors)
```
GET https://localhost:8080/icons/32x32.png 404 (Not Found)
GET https://localhost:8080/icons/16x16.png 404 (Not Found)
GET https://localhost:8080/icons/96x96.png 404 (Not Found)
GET https://localhost:8080/icons/128x128.png 404 (Not Found)
```

**Impact**: Low - These are just favicon warnings and don't affect functionality.

**Fix**: Copy icon files to `public/icons/` directory or update icon references in `index.html`.

### 2. i18n Legacy API Warning
```
[intlify] Legacy API mode has been deprecated in v11. Use Composition API mode instead.
```

**Impact**: Low - This is a deprecation warning from the existing codebase.

**Fix**: Update `src/boot/i18n.js` to use Composition API mode (can be done later).

### 3. npubcash Server Not Deployed
**Impact**: Medium - The Lightning address registration will fail until the server is deployed.

**Status**: Expected - The server needs to be deployed to `npubcash.trailscoffee.com` following the instructions in `TRAILS-NPUBCASH-DEPLOYMENT.md`.

## Testing Instructions

1. **Clear browser cache and localStorage** (important!)
   - Open DevTools → Application → Clear Storage → Clear site data

2. **Refresh the page**
   - You should see the onboarding page
   - Click "Get Started"
   - The identity creation should work (Lightning address registration will fail until server is deployed)

3. **Check console for errors**
   - The Pinia error should be gone
   - The only errors should be:
     - Missing icon files (404s) - can be ignored
     - npubcash server network error - expected until server is deployed
     - i18n legacy API warning - can be ignored

## Next Steps

1. **Deploy npubcash-server** to `npubcash.trailscoffee.com`
   - Follow instructions in `TRAILS-NPUBCASH-DEPLOYMENT.md`
   - Configure it to use `ecash.trailscoffee.com` as the mint

2. **Test full onboarding flow** with deployed server
   - Registration should succeed
   - Lightning address should be created
   - Default mint should be added

3. **Fix icon files** (optional, low priority)
   - Copy icons to `public/icons/` or update references

4. **Update i18n to Composition API** (optional, low priority)
   - Follow vue-i18n migration guide

## Summary

All critical bugs have been fixed! The app now loads properly and the onboarding flow works (except for the server registration which requires deployment). The remaining issues are either cosmetic (icons) or require external setup (npubcash server).




