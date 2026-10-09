---
kind: code
---

# Proposal: r4-object-lock-url-and-credentials-copy

## Summary

Two things the round-3 cloud check found in apps built on this library.

1. Every pipelinq detail page sent
   `/apps/openregister/api/objects/()=>pn/()=>Ct.schema||Bn/()=>Ct.objectId/lock`
   and got a 404. `CnDetailPage` hands `useObjectLock` getter functions
   (`() => props.objectId`), and the composable read them with `unref`. In
   Vue 3 `unref` returns a function untouched, so the getter's source went into
   the path. The same read made the object-cache lookup use the function as
   its key, so the locked banner could not see a lock either. The register
   and schema getters also closed over values captured once at setup, so a
   register that arrived after mount never reached the URL.
2. The Credentials section of the user settings dialog uses em-dashes in its
   intro, in every app that shows it (pipelinq and dossiq among them). The
   Conduction voice bans them. Neither intro had a Dutch translation.

## What changes

- `useObjectLock` reads register, schema, slug and id with `toValue`, which
  takes a plain value, a ref or a getter.
- `acquire()`, `release()` and the unload beacon send nothing until register,
  schema slug and object id are all known.
- `CnDetailPage` passes getters that read the props when the lock is used, not
  when the page mounts.
- The two CnCredentials intros are rewritten without em-dashes, in short
  sentences, with English and Dutch catalogue entries.

## Tests

- `tests/components/CnDetailPageLockUrl.spec.js` mounts `CnDetailPage` with the
  REAL composable. Every other detail-page lock spec mocks it, which is how
  this shipped.
- `src/composables/__tests__/useObjectLock.endpoints.spec.js` adds getter
  inputs and the unknown-target cases.
- `tests/components/CnCredentialsCopy.spec.js` pins the intro copy to the
  voice and to the Dutch catalogue.
