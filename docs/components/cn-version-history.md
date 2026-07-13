import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnVersionHistory.md'

# CnVersionHistory

Object version-history list plus field-by-field diff viewer for the [pluggable integration registry](../../guides/integrations.md). Fetches an OpenRegister object's audit-trail entries (query-time storage strategy, same endpoint as `CnAuditTrailTab`) and renders them inside a `CnDetailCard`, newest-first. Selecting one entry — or checking two and pressing "Compare selected" — opens a structural diff table (field | old value | new value), changed-only by default with a "Show all fields" toggle. Registered as its own `version-history` integration, additive alongside the existing `audit-trail` integration.

**Wraps**: CnDetailCard

## Try it

<Playground component="CnVersionHistory" />

## Usage

```vue
<CnVersionHistory
  :register="registerId"
  :schema="schemaId"
  :object-id="objectId"
  surface="detail-page" />
```

## Design notes: diffs are built from audit-trail deltas, not full snapshots

OpenRegister does not store a full before/after object snapshot per version — `AuditTrailMapper::createAuditTrail()` persists only a per-field `changed` delta (`{field: {old, new}}`) at write time. So:

- A single history entry's diff is exactly its own `changed` map.
- Comparing two checked entries folds every entry's `changed` map between them (`foldAuditTrailEntries`, `src/utils/auditTrailDiff.js`) into a synthetic before/after state, then diffs that with `computeObjectDiff` (`src/utils/computeObjectDiff.js`) — the same generic, nested-aware diff utility used for the single-entry case.
- A field that was never touched anywhere in the selected range is invisible to the diff — there is no baseline snapshot to compare it against. This is a backend data-shape limitation, not a viewer limitation.
- "Show all fields" reveals `unchanged` rows: at the top level that only applies to fields OpenRegister reported as touched, but nested inside an already-changed object/array field it also reveals unchanged sibling keys (`computeObjectDiff` is fully general — a future host with real full snapshots gets true full-field toggling for free).

Pass pre-translated labels when your app handles i18n:

```vue
<CnVersionHistory
  :register="reg"
  :schema="schema"
  :object-id="id"
  :no-entries-label="t('myapp', 'No version history yet')"
  :compare-label="t('myapp', 'Compare selected')"
  :show-all-fields-label="t('myapp', 'Show all fields')" />
```

## Display props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | String | `''` | Override the card title (defaults to the translated label). |
| `pageSize` (`page-size`) | Number | `20` | Number of history entries fetched per page. |
| `collapsible` | Boolean | `false` | Whether the card collapses. |
| `apiBase` (`api-base`) | String | `'/apps/openregister/api'` | Base API URL. |
| `noEntriesLabel` (`no-entries-label`) | String | `t('nextcloud-vue', 'No version history yet')` | Pre-translated empty-history label. |
| `fallbackVersionLabel` (`fallback-version-label`) | String | `t('nextcloud-vue', 'Unversioned change')` | Shown when an entry carries no semantic version. |
| `selectForCompareLabel` (`select-for-compare-label`) | String | `t('nextcloud-vue', 'Select for compare')` | Accessible label for the row-select checkbox. |
| `compareLabel` (`compare-label`) | String | `t('nextcloud-vue', 'Compare selected')` | Label for the compare-action button. |
| `loadMoreLabel` (`load-more-label`) | String | `t('nextcloud-vue', 'Load more')` | Label for the pagination load-more button. |
| `backLabel` (`back-label`) | String | `t('nextcloud-vue', 'Back to history')` | Label for the diff view's back-to-list button. |
| `showAllFieldsLabel` (`show-all-fields-label`) | String | `t('nextcloud-vue', 'Show all fields')` | Label for the changed-only/show-all toggle. |
| `fieldLabel` (`field-label`) | String | `t('nextcloud-vue', 'Field')` | Diff table field-column header. |
| `oldValueLabel` (`old-value-label`) | String | `t('nextcloud-vue', 'Old value')` | Diff table old-value-column header. |
| `newValueLabel` (`new-value-label`) | String | `t('nextcloud-vue', 'New value')` | Diff table new-value-column header. |
| `noChangesLabel` (`no-changes-label`) | String | `t('nextcloud-vue', 'No field changes to show')` | Shown when a diff has no visible rows. |

## Reference

<GeneratedRef />
