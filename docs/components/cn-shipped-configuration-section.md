---
sidebar_position: 12
---

# CnShippedConfigurationSection

What an app shipped, what this instance changed, and what it authored. One row per seeded object with the set and version it came from, its state in words (Shipped, unchanged; Shipped, changed here; Shipped, removed here; Yours), and the newer version offered per object. Taking a newer version over a local change says so on the button ("Take 1.1 and lose your change"). For every app that seeds objects.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `endpoint` | String | required | The app path of the shipped ledger, e.g. `/apps/<app>/api/starter/shipped` |
| `schemas` | Array | `[]` | The schemas to show, `[{ slug, label }]`. With more than one, a picker switches between them. Labels go through the host's `cnTranslate` |
| `countUrl` | String | `''` | An app path that counts a schema's objects, `{schema}` filled in, read with `_limit=1` for its `total`. With it, an empty ledger beside a register that holds objects says so instead of "Nothing has been seeded yet." |
| `description` | String | `''` | A line above the table |

## The endpoint

- `GET {endpoint}/{schema}` answers `{ items: [{ targetObject, title, state, set, setVersion, latestVersion, updateAvailable }] }`, `state` being `shipped`, `changed`, `local` or `removed`.
- `POST {endpoint}/{schema}/{targetObject}/adopt` takes `{ set, acceptLocalChangeLoss }` and refuses with `{ reason }`, which the section shows.

A failed read empties the table and says so: rows left beside an error would read as the current state.

## Example

```vue
<CnShippedConfigurationSection
	endpoint="/apps/myapp/api/starter/shipped"
	:schemas="[{ slug: 'caseType', label: 'Case types' }, { slug: 'roleType', label: 'Roles' }]"
	countUrl="/apps/openregister/api/objects/myapp/{schema}" />
```
