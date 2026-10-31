---
kind: code
---

# Proposal: api-call-delete

## Summary

A manifest `api-call` action could send POST, PUT, PATCH and GET, not DELETE. An action that undoes a POST on the same address therefore needed an app handler, and a handler on a detail page is called without the object id. pipelinq's Unlock (change `platform-record-lock`) is the first: OpenRegister unfreezes with `DELETE .../{id}/freeze`. An `api-call` with `method: "DELETE"` now sends DELETE, with the resolved payload as the request data.

## Scope

- `src/utils/actionsDispatcher.js`: `executeApiCall` maps DELETE to `axios.delete(url, { data })`.
- `src/schemas/app-manifest-v2.schema.json` 2.169.0: `DELETE` in the action `method` enum.
- `docs/utilities/dispatch-action.md`.
