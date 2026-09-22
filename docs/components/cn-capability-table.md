import GeneratedRef from './_generated/CnCapabilityTable.md'

# CnCapabilityTable

A capability comparison your app supplies as JSON, rendered as a searchable
table. Readers arrive at it two ways. One is shopping for a feature, the
sellable bundle they can name in a tender. The other is checking a single
capability they know they need. The grouping toggle serves the first, the
search box serves the second, and both run over the same rows.

**Wraps**: NcTextField, NcButton, NcEmptyContent

## When to use

Inside `<CnFeaturesAndRoadmapView>`, by passing that view a
`capabilityComparison` document. The view then grows a third stop on its
header toggle and mounts this table there. Mount it directly when you want the
comparison on a page of your own.

## The document

Everything the table renders comes from one object. `systems`, `areas` and
`capabilities` are the shape the fleet already ships. The rest is optional, and
a document without any of it renders the table your app renders today.

```json
{
  "systems": [
    { "key": "dossiq", "name": "Dossiq", "isSelf": true },
    { "key": "opencase", "name": "OpenCase" }
  ],
  "areas": [
    { "key": "intake", "name": "Intake", "name_nl": "Intake" }
  ],
  "features": [
    { "key": "case-types", "name": "Case types", "name_nl": "Zaaktypen" }
  ],
  "providers": [
    { "key": "dossiq", "name": "Dossiq", "kind": "self" },
    { "key": "openregister", "name": "OpenRegister", "kind": "app" },
    { "key": "nextcloud", "name": "Nextcloud", "kind": "platform" }
  ],
  "capabilities": [
    {
      "id": "1.1",
      "area": "intake",
      "name": "Citizen web form per case type",
      "name_nl": "Webformulier voor burgers per zaaktype",
      "dossiq": "partial",
      "opencase": "no",
      "provider": "openregister",
      "providerHow": "ledger-change",
      "feature": "case-types",
      "featureConfidence": "high"
    }
  ]
}
```

| Field | Where | What it does |
|-------|-------|--------------|
| `provider` | row | Key into `providers`. Renders the provided-by column. |
| `providerHow` | row | Free text naming the mechanism. Rendered under the provider name, as given. |
| `feature` | row | Key into `features`. Turns on feature grouping. |
| `featureConfidence` | row | `low` marks the row as a judgement, with a hint a screen reader reads. |
| `features` | document | Labels for the feature keys. Optional: an unlabelled key shows raw. |
| `providers` | document | Labels and kinds for the provider keys. `kind` is `self`, `app` or `platform`. |

## No row ever disappears

This is the rule the table is built around, because a silently dropped row
reads exactly like a row nobody wrote.

- A `provider` key that `providers` does not declare renders as the raw key.
- A `kind` outside the three renders the name with no kind word beside it.
- An `area` or `feature` key the document never declares gets a group of its
  own, headed by the raw key.
- A row with no `feature` lands under "Not yet mapped to a feature".
- A rating outside `yes`, `partial` and `no` counts and renders as `Unknown`.

## Usage

```vue
<CnCapabilityTable :comparison="comparison" />
```

Pass `groupBy` to lock the grouping and hide the toggle, `searchable` to turn
the search box off when your host already filters the rows, and `locale` to
override the reader's Nextcloud language when picking `name` or `name_nl`.

```vue
<CnCapabilityTable
  :comparison="comparison"
  groupBy="area"
  :searchable="false"
  locale="nl" />
```

## Accessibility

- The search box carries a real label through `NcTextField`'s `label` prop, not
  a placeholder standing in for one.
- The result count sits in a `role="status"` region, so a screen reader hears
  the new count after the reader stops typing.
- Each group stays a real `<table>` with a `<caption>`, `scope="col"` headers
  and a `scope="row"` header per row, before and after a filter.
- The grouping toggle marks its state with `aria-pressed`, and the provider
  kind is a word beside the name rather than a colour on its own.

## Reference

<GeneratedRef />

- Implementation: [src/components/CnCapabilityTable/CnCapabilityTable.vue](../../src/components/CnCapabilityTable/CnCapabilityTable.vue)
- Pure logic: [src/utils/capabilityComparison.js](../../src/utils/capabilityComparison.js)
