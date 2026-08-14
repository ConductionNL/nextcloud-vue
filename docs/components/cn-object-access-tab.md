# CnObjectAccessTab

Manage **who can reach one object**: its visibility scope, and the users, groups, email invitations and public links granted on it. This is the UI for OpenRegister's per-object grant primitive (`object-level-sharing-and-private-scope`).

## Not to be confused with CnSharesTab / CnShareCreate

Three similarly-named things exist, and they are genuinely different:

| Component | Shares what | Backed by |
|---|---|---|
| **CnObjectAccessTab** (this) | the **object** | a share on the object's **folder** |
| `CnSharesTab` | files attached to the object | the `shares` integration leaf |
| `CnShareCreate` | one **file** inside the object's folder | core `IShare` on that file |

The distinction is enforced server-side, not just by convention: OpenRegister deliberately does **not** treat a file share as an object grant, so attaching a document to an object and sharing that document never hands over the object's own data.

## Two deliberate absences

**There is no "can re-share" control.** OpenRegister strips core's `PERMISSION_SHARE` (16) from every object grant. Because a grant *is* a share on the object's folder, leaving that bit set would let the recipient pass the object on through core's Files UI — producing a perfectly valid object grant created by somebody who was never allowed to create one. A checkbox that is silently cleared would be worse than no checkbox.

**Revoking needs no "may take a moment" copy.** The grant resolver reads through core's shares at decision time and memoises for a single request only, so the next request already denies.

## Read-only mode

A `403` from either endpoint renders the tab read-only rather than as an error. A caller may legitimately be able to *see* an object without being allowed to manage its sharing — every write endpoint is owner-or-admin — and that is not a failure worth alarming about.

## Usage

```js
import { CnObjectAccessTab } from '@conduction/nextcloud-vue'
```

```vue
<CnObjectAccessTab
  :object-id="objectUuid"
  register="mydash"
  schema="dashboard"
  @granted="onGranted"
  @revoked="onRevoked"
  @scope-changed="onScopeChanged" />
```

As a detail-page tab, register it the same way as any other sidebar tab and pass the object context through.

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `objectId` | `String` | — (required) | Object uuid. |
| `register` | `String` | — (required) | Register slug or uuid. |
| `schema` | `String` | — (required) | Schema slug or uuid. |
| `apiBase` | `String` | `/apps/openregister/api` | API root. |
| `emptyLabel` | `String` | translated | Empty-state text. |

## Events

| Event | Payload | When |
|---|---|---|
| `granted` | the created grant | after a successful share |
| `revoked` | the removed grant | after a successful revoke |
| `scope-changed` | `'private'` \| `'organisation'` | after the scope switch is persisted |

## Endpoints

All of these are owner-or-admin server-side:

```
GET    {apiBase}/objects/{register}/{schema}/{id}/scope
PUT    {apiBase}/objects/{register}/{schema}/{id}/scope        { scope }
GET    {apiBase}/objects/{register}/{schema}/{id}/shares
POST   {apiBase}/objects/{register}/{schema}/{id}/shares       { shareType, shareWith, permissions }
DELETE {apiBase}/objects/{register}/{schema}/{id}/shares/{shareId}
POST   {apiBase}/objects/{register}/{schema}/{id}/links        { password?, expiration? }
POST   {apiBase}/objects/{register}/{schema}/{id}/invitations  { email, password?, expiration? }
```

Requests go through `buildHeaders()` and `prefixUrl()` so the CSRF token and the `/index.php` prefix are handled — a raw `fetch` would be rejected on every write.
