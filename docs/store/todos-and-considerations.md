# Store: TODOs and Considerations

A single reference for planned store work and open design questions. Derived from the comparison of the legacy single-type object store with the current multi-type store and plugins.

---

## 1. Mass delete (TODO)

**Status:** To implement

**Goal:** Add a mass-delete feature that calls the delete API for each object in parallel using `Promise.all`, so bulk deletes stay fast.

**Implementation notes:**

- Add a store action, e.g. `deleteObjects(type, ids)` (or `massDeleteObjects`), that:
  - Accepts a type slug and an array of object IDs.
  - Runs `deleteObject(type, id)` (or equivalent API call) for each ID via `Promise.all`.
  - Returns a result shape (e.g. `{ successfulIds: [], failedIds: [] }`) so the UI can show partial success/failure.
- Optionally refresh the collection for that type after a successful batch (or let the caller call `fetchCollection`).
- Ensure errors (e.g. per-request failures) are handled so one failure doesn’t break the whole batch; collect successes and failures.

**Documentation:**

- Document the new action in:
  - `docs/store/object-store.md` (CRUD / actions table).
  - `docs/architecture/store.md` (if that doc lists store actions).
- Mention usage from `CnMassDeleteDialog` (e.g. “use `store.deleteObjects(type, ids)` or equivalent after confirmation”).

---

## 2. getTags for files (TODO)

**Status:** To implement

**Context:** The legacy store had `getTags()` calling `GET /apps/openregister/api/tags`. Tags are used in the files context (e.g. when uploading or labelling files).

**Goal:** Add a way to fetch the tags list so file upload/management UI can use it.

**Implementation notes:**

- Treat tags as part of the **files** concern.
- Add either:
  - A `getTags` (or `fetchTags`) action on the **files plugin**, or
  - A small dedicated “tags” helper/store used by the files plugin and file-related components.
- Prefer the files plugin if tags are only used for file labels/tags; otherwise a small shared helper is fine.
- Document the new API in the files plugin section of the store docs and, if relevant, in component docs (e.g. file upload / CnFormDialog tags widget).

---

## 3. Filter and facet param building (consider later)

**Status:** Under consideration

**Context (from comparison):**

- Legacy store built PHP-style query params (e.g. `@self[field][]=value`, `@self[field][gte]=value`) inside `refreshObjectList`.
- Current store accepts a generic `params` object and uses `buildQueryString(params)` (URLSearchParams), so bracket-style keys are not built in.

**Open points:**

- Is it useful for the **store** (or a shared util) to offer:
  - Helpers to build `@self[field][op]=value` (and similar) from a structured filter object?
  - Or should each app/composable build these params and pass them to `fetchCollection(type, params)`?
- Same question for **facet** params: legacy had `buildFacetConfiguration`, `addFacetParamsToUrl`, `updateActiveFacet`. Current design relies on schema + app/composable to pass `_facets` (or similar) in `params`.

**Suggestion:** Leave as-is for now. Revisit only if multiple apps need the same filter/facet encoding logic; then consider a small util or optional store helpers. Put this at the bottom of the backlog as “consider if needed.”

---

## 4. Facet discovery and facet-only requests (consider later)

**Status:** Under consideration

**Context:**

- Legacy had dedicated `getFacetableFields` and `getFacets` (e.g. with `_limit=0`) for discovery and facets-only requests.
- Current design returns facets in the same response as the collection when `_facets` (or schema-driven `_facets=extend`) is used.

**Open points:**

- Do we need a dedicated “facets only” or “facetable fields only” request (e.g. for sidebar or setup)?
- Or is “facets in collection response” enough for all current use cases?

**Suggestion:** Treat as optional enhancement. If a clear use case appears (e.g. loading facets before the first list load), add a small helper or store action (e.g. `fetchFacets(type, params)` with `_limit=0`). Otherwise leave as-is. Keep this as a low-priority consideration.

---

## 5. Auto-load sub-resources when setting the active object (consider later)

**Status:** Deeper design question

**Context (from comparison, Section 6):**

- Legacy store had a single “active” object (`objectItem`). When you called `setObjectItem(objectItem)`, the store **automatically** fetched audit trails, contracts, uses, used, and files for that object.
- Current store has no single “active” object; sub-resources are loaded explicitly via plugin actions (e.g. `fetchAuditTrails(type, objectId)`), typically when a detail view is opened.

**Open points to think about:**

- **Is auto-load on “set object” a good practice?**
  - Pros: One call sets context and loads everything; simpler for simple detail pages.
  - Cons: May load data the user never sees; harder to control loading order and error handling; mixes “set current” with “fetch”; less clear data flow.
- **Who should own “load all related data for this object”?**
  - Store (like legacy): one “load detail” action that fetches object + all sub-resources.
  - Composable (e.g. `useDetailView`): when opening a detail view, call `fetchObject` then the plugin fetch actions as needed.
  - Component: page decides which sub-resources to load and when (e.g. tabs).
- **Single “active” object vs. cache-only:**
  - Legacy had one `objectItem` that drove related data.
  - Current has `objects[type][id]` cache and no global “active” item; the “active” object is whatever the detail route/component is showing.

**Suggestion:** Do not replicate legacy “set object → auto-load all” in the new store for now. Prefer explicit loading in composables or components. Revisit only if we see repeated “load object + audit + files + relations” patterns and want a single “loadDetail(type, id)” helper (store or composable) that orchestrates existing fetch actions. Document this as a design consideration for a later, deeper pass.

---

## Summary

| Item | Priority | Action |
|------|----------|--------|
| Mass delete (`deleteObjects` + docs) | High | Implement and document |
| getTags (files) | Medium | Add to files plugin (or shared helper) and document |
| Filter/facet param building (Section 3–4) | Low | Consider only if needed; keep at bottom of backlog |
| Auto-load on set object (Section 6) | Design | Think through pros/cons; prefer explicit loading for now |
