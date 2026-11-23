---
kind: code
---

# Proposal: no-calls-to-missing-apps-and-presence-beacon

## Summary

The round-5 check on cloud.conduction.nl found two request errors on every
pipelinq and dossiq page. Both start in this library.

1. **`GET /apps/hermiq/api/chat/health` 404, three times per page.** Hermiq is
   not installed there. `CnAiCompanion` probed its backend's health on every
   mount and retried three times before hiding. Nextcloud already tells the page
   which apps the user has (`OC.appswebroots`, read by the shared
   `isAppInstalled`), so the companion now skips the probe, and stays hidden,
   when its backend app is not installed. No request is made.
2. **`POST .../presence?_method=DELETE` 405.** `useObjectPresence` departs a
   closing tab with a beacon, which is always a POST. OpenRegister had no POST
   route on `/presence` (fixed in OpenRegister, change
   `presence-departs-from-a-closing-tab`). That route keeps Nextcloud's CSRF
   check, and a beacon cannot set the `requesttoken` header, so the beacon now
   carries the token as a form field, which Nextcloud also reads.

Not in this library: `GET /apps/buildiq/api/app-overrides/pipelinq` 404 comes
from pipelinq's own `src/main.js`, which has to guard it with
`isAppInstalled('buildiq')`.

## Impact

- `src/components/CnAiCompanion/CnAiCompanion.vue`, `src/composables/useObjectPresence.js`
- Tests: `tests/components/CnAiCompanion.spec.js`, `src/composables/__tests__/useObjectPresence.spec.js`
- Apps pick it up with the next release and a bump. The presence fix also needs
  the OpenRegister release with the POST route.
