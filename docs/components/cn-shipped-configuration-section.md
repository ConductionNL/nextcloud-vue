---
sidebar_position: 12
---

# CnShippedConfigurationSection

What an app shipped, what this instance changed, and what it authored. One row per seeded object with the set and version it came from, its state in words (Shipped, unchanged; Shipped, changed here; Shipped, removed here; Yours), and the newer version offered per object. Taking a newer version over a local change says so on the button ("Take 1.1 and lose your change"). For every app that seeds objects.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `endpoint` | String | `''` | The app path of the shipped ledger, e.g. `/apps/<app>/api/starter/shipped`. Empty shows no ledger |
| `schemas` | Array | `[]` | The schemas to show, `[{ slug, label }]`. With more than one, a picker switches between them. Labels go through the host's `cnTranslate` |
| `countUrl` | String | `''` | An app path that counts a schema's objects, `{schema}` filled in, read with `_limit=1` for its `total`. With it, an empty ledger beside a register that holds objects says so instead of "Nothing has been seeded yet." |
| `description` | String | `''` | A line above the table |
| `setsUrl` | String | `''` | An app path that lists the loaded sets, `{ sets: [{ id, label }] }`. With it the section lists them above the ledger; labels go through `cnTranslate` |
| `removeSetUrl` | String | `''` | The app path that removes one set, `{id}` filled in. With it each set has a Remove button that asks first |
| `removeSetQuestion` | String | `''` | The question before a removal, `{set}` filled in. Defaults to "Remove the set "{set}"? Its objects move to the trash, where you can restore them. Anything you made yourself stays." |

## The endpoint

- `GET {endpoint}/{schema}` answers `{ items: [{ targetObject, title, state, set, setVersion, latestVersion, updateAvailable }] }`, `state` being `shipped`, `changed`, `local` or `removed`.
- `POST {endpoint}/{schema}/{targetObject}/adopt` takes `{ set, acceptLocalChangeLoss }` and refuses with `{ reason }`, which the section shows.

A failed read empties the table and says so: rows left beside an error would read as the current state.

## Loaded sets

A setup wizard loads example or starter sets. With `setsUrl` the section lists
the loaded ones, and with `removeSetUrl` an admin removes one: the button asks
first, then posts to the path and shows the answer's `message`, as an error
when `success` is not `true`. A refusal shows the server's `message` or
`reason`. The list is read again after a removal. Either part works on its
own, so an app without a ledger passes only `setsUrl` and `removeSetUrl`:

```vue
<CnShippedConfigurationSection
	sets-url="/apps/learniq/api/setup/example-sets"
	remove-set-url="/apps/learniq/api/setup/action/remove-example-set-{id}" />
```

## Example

```vue
<CnShippedConfigurationSection
	endpoint="/apps/myapp/api/starter/shipped"
	:schemas="[{ slug: 'caseType', label: 'Case types' }, { slug: 'roleType', label: 'Roles' }]"
	countUrl="/apps/openregister/api/objects/myapp/{schema}" />
```
