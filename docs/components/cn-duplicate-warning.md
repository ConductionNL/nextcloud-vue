# CnDuplicateWarning

"This may already exist", shown before a record is filed. It renders OpenRegister's scored matches (`{ uuid, score, matchedOn }`) and never scores anything itself, so the warning cannot drift from the check that refuses the write. Each row shows the matched record's title and a meta line, linked to its page, then what it matched on and how strongly. A match the user may not read is reported as "A record you may not open", without disclosing it.

Under a `warn` policy anyone may file it anyway. Under `block` only a user who `mayOverride` may, and they must say why; everyone else is told to open the record it matches. dossiq's case intake is the first consumer; pipelinq contacts share it.

## Usage

```vue
<CnDuplicateWarning
  :matches="matches"
  :records="readableCases"
  policy="block"
  :may-override="isCoordinator"
  row-title="{title}"
  row-meta="{identifier}"
  record-url="/apps/dossiq/cases/{uuid}"
  :field-labels="{ requester: 'Requester', title: 'Subject', caseType: 'Case type' }"
  headline="{count} open cases look like this one."
  @file="save"
  @close="cancel" />
```

From code, for example a create override, use [`openDuplicateWarning`](../utilities/open-duplicate-warning.md): it mounts the warning and resolves with `{ reason, over }` or `null`. [`duplicateAffordances`](../utilities/duplicate-affordances.md) decides what it offers, and [`candidateWithoutBlanks`](../utilities/candidate-without-blanks.md) builds the candidate for the check.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `matches` | Array | `[]` | The scored matches: `{ uuid, score, matchedOn }` |
| `records` | Array | `[]` | The matched records the user may read, matched by `id`, `uuid` or `@self.id` |
| `policy` | String | `'warn'` | `warn` or `block`; anything else reads as `warn` |
| `mayOverride` | Boolean | `false` | Whether this user may file over a block (and must say why) |
| `rowTitle` | String | `'{title}'` | A record's title, a template |
| `rowMeta` | String | `'{identifier}'` | A record's meta line, a template |
| `recordUrl` | String | `''` | A record's page, a template with `{uuid}`; empty draws no link |
| `fieldLabels` | Object | `{}` | Words for the matched fields, through the app's translate |
| `title` | String | `''` | The dialog title; defaults to "This may already exist" |
| `headline` | String | `''` | The note's sentence with `{count}`; defaults to "%n existing record(s) look like this one." |
| `blockedText` | String | `''` | The sentence under a block the user may not pass |
| `reasonLabel` | String | `''` | The reason field's label; defaults to "Why file it anyway" |
| `continueLabel` | String | `''` | The continue button's label; defaults to "File it anyway" |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `file` | `{ reason, over }` | The user files it anyway; `over` lists the matched uuids |
| `close` | | The user went back without filing |
