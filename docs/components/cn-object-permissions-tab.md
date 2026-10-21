# CnObjectPermissionsTab

A read-only answer to **who holds which right on one object, where each grant came from, and who held it on a past date**. It renders what OpenRegister reports and computes none of it.

Its sibling `CnObjectAccessTab` *manages* grants (scope, shares, links). This tab *explains* them: one row per rule, each with the holder OpenRegister named and the source it reported.

## What it guarantees

- **One row per rule.** A deny is its own row, listed beside the grant it removes. The tab never decides that a deny beats a grant: a second evaluator of an access question eventually disagrees with the first, and that disagreement is a disclosure.
- **A failed read says so.** Each source that could not be read is named ("This list is incomplete, not empty"). It never falls back to an empty table.
- **A 403 is an answer.** A reader who may open the object but may not review its grants is told exactly that.
- **Ends and areas are printed, not judged.** `until` and `scopedTo` render as written; whether an expired grant still answers is OpenRegister's call.
- **"Unanswered" is its own state** on the history read: a date the trail does not reach is never reported as "nobody held anything".

## Usage

As a sidebar tab, declare the built-in widget type `object-permissions`:

```json
{
  "id": "access",
  "label": "Access",
  "icon": "ShieldAccountOutline",
  "widgets": [
    {
      "type": "object-permissions",
      "props": {
        "fieldRules": { "typeField": "caseType", "typeSchema": "caseType", "declarationField": "fieldRoleRules" }
      }
    }
  ]
}
```

`objectId`, `register`, `schema` and `apiBase` come from the sidebar. Standalone:

```vue
<CnObjectPermissionsTab
  :object-id="uuid"
  register="my-register"
  schema="my-schema" />
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `objectId` | `String` | `''` | Object uuid. |
| `register` | `String` | `''` | Register slug or uuid. |
| `schema` | `String` | `''` | Schema slug or uuid. |
| `apiBase` | `String` | `/apps/openregister/api` | API root. |
| `historyEnabled` | `Boolean` | `true` | Offer "Who held a right on a date" when the history read answers. |
| `fieldRules` | `Object` | `null` | `{ typeField, typeSchema, declarationField? }`: where per-role field rules are declared. The object's `typeField` references a `typeSchema` object in the same register; its `declarationField` (default `fieldRoleRules`) lists `{ field, rule, groups, heldBy, reason }`, with `rule` either `'hidden'` or `'readOnly'`. `null` leaves the section out. |
| `title` | `String` | `''` | Heading; empty uses "Who holds which right". |
| `sourceLabels` | `Object` | `{}` | Overrides the label per source key (`share`, `role`, `group`, `object`, `schema`, `register`, `deny`, `staged-deny`, `default-open`, `none`, `inherited`). |

## Endpoints

```
GET {apiBase}/objects/{register}/{schema}/{id}/permissions            (preferred; 403 = may not review)
GET {apiBase}/objects/{register}/{schema}/{id}/permissions/history?at=
GET {apiBase}/permissions                                             (catalogue + deny mode)
GET {apiBase}/scopes?register=&schema=                                (the reader's own verdict)
```

When the object's own set answers 404 (an older OpenRegister), the tab falls back to:

```
GET {apiBase}/objects/{register}/{schema}/{id}/shares
GET {apiBase}/permissions/compare-roles?register=
GET {apiBase}/permissions/deny-preview?register=&schema=
```

The read helpers live in `src/utils/objectPermissions.js`.
