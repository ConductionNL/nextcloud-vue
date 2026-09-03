CnDetailPage is the generic detail/overview page with stats, cards, and flexible content slots.

Full example with header, stats, and data card:

```vue
<template>
  <div style="height: 500px; overflow: auto; background: var(--color-main-background); border: 1px solid var(--color-border); border-radius: 8px;">
    <CnDetailPage
      :object="contact"
      :schema="schema"
      :loading="false"
      title="Jane Smith"
      description="Active contact">
      <template #header-actions>
        <NcButton @click="last = 'edit'">Edit</NcButton>
      </template>
      <template #default>
        <CnDetailCard title="Contact information">
          <CnDetailGrid :items="[
            { label: 'Email', value: contact.email },
            { label: 'Phone', value: contact.phone },
            { label: 'Company', value: contact.company },
            { label: 'Status', value: contact.status },
          ]" layout="horizontal" />
        </CnDetailCard>
      </template>
      <template #sidebar>
        <CnObjectMetadataWidget
          :object-data="contact"
          :include="['id', 'created', 'updated']" />
      </template>
    </CnDetailPage>
  </div>
</template>
<script>
export default {
  data() {
    return {
      last: '',
      contact: {
        id: 1,
        uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        email: 'jane@example.com',
        phone: '+31 6 12 34 56 78',
        company: 'Acme Corp',
        status: 'active',
        created: '2024-01-10T09:00:00Z',
        updated: '2024-03-15T14:30:00Z',
      },
      schema: {
        properties: {
          email: { type: 'string', title: 'Email' },
          phone: { type: 'string', title: 'Phone' },
          company: { type: 'string', title: 'Company' },
          status: { type: 'string', title: 'Status', enum: ['active', 'inactive'] },
        },
      },
    }
  },
}
</script>
```

With icon, subtitle, and stats table:

```vue
<template>
  <div style="height: 400px; overflow: auto; background: var(--color-main-background); border: 1px solid var(--color-border); border-radius: 8px;">
    <CnDetailPage
      title="Register Overview"
      description="Statistics and schema details"
      icon="DatabaseOutline"
      :icon-size="32"
      :stats-title="'Register statistics'"
      :stats-columns="[
        { key: 'type', label: 'Type' },
        { key: 'total', label: 'Total' },
        { key: 'size', label: 'Size' },
      ]"
      :stats-rows="[
        { type: 'Objects', total: 150, size: '2.4 MB' },
        { type: 'Files', total: 42, size: '1.1 MB' },
      ]"
      :max-width="'960px'"
      :loading="isLoading">
      <div style="padding: 16px; color: var(--color-text-light);">Chart placeholder</div>
    </CnDetailPage>
  </div>
</template>
<script>
export default {
  data() {
    return { isLoading: false }
  },
}
</script>
```

With error state and retry:

```vue
<template>
  <div style="height: 300px; overflow: auto; background: var(--color-main-background); border: 1px solid var(--color-border); border-radius: 8px;">
    <CnDetailPage
      title="Schema details"
      :error="hasError"
      error-message="Failed to load schema"
      :on-retry="loadSchema"
      retry-label="Try again">
      <template #error>
        <div>Custom error layout</div>
      </template>
      <template #actions>
        <NcButton @click="editSchema">Edit</NcButton>
      </template>
    </CnDetailPage>
  </div>
</template>
<script>
export default {
  data() {
    return { hasError: true }
  },
  methods: {
    loadSchema() { this.hasError = false },
    editSchema() {},
  },
}
</script>
```

With empty state and loading label:

```vue
<template>
  <div style="height: 300px; overflow: auto; background: var(--color-main-background); border: 1px solid var(--color-border); border-radius: 8px;">
    <CnDetailPage
      title="Audit log"
      :empty="noData"
      empty-label="No audit entries yet"
      loading-label="Fetching audit log..."
      :loading="fetching" />
  </div>
</template>
<script>
export default {
  data() {
    return { noData: true, fetching: false }
  },
}
</script>
```

With sidebar integration:

```vue
<template>
  <div style="height: 300px; overflow: auto; background: var(--color-main-background); border: 1px solid var(--color-border); border-radius: 8px;">
    <CnDetailPage
      title="Lead detail"
      :sidebar="true"
      :sidebar-open="true"
      object-type="pipelinq-lead"
      :object-id="lead.id"
      subtitle="Assigned to Jane"
      :sidebar-props="{ register: 'leads', schema: 'lead', hiddenTabs: ['tasks'] }" />
  </div>
</template>
<script>
export default {
  data() {
    return { lead: { id: 42 } }
  },
}
</script>
```

## Additional props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | String | `''` | Optional MDI icon name rendered in the header via `CnIcon` |
| `iconSize` | Number | `28` | Icon size in pixels |
| `loadingLabel` | String | `'Loading...'` | Message shown below the spinner during loading |
| `sidebarOpen` | Boolean | `true` | Whether the sidebar starts expanded |
| `objectType` | String | `''` | Registered object type slug for the sidebar |
| `objectId` | String\|Number | `''` | Object ID to display in the sidebar |
| `subtitle` | String | `''` | Subtitle shown in the sidebar header |
| `sidebarProps` | Object | `{}` | Extra sidebar configuration (`register`, `schema`, `hiddenTabs`, `title`, `subtitle`) |
| `sidebarTabs` (`sidebar-tabs`) | Array | `[]` | Manifest-driven sidebar-tab descriptors published to the host's `objectSidebarState.tabs`. The hoisted `CnObjectSidebar` (mounted at `NcContent` level by `CnAppRoot` per ADR-017) renders them; the page itself only publishes. Each descriptor mirrors a `pages[].sidebar.tabs[]` entry (`{ id, label, component, props?, integrationKey? }`). When empty, the page emits no tabs and the host falls back to its own discovery (integration registry / schema-derived). |
| `hideEmpty` (`hide-empty`) | Boolean | `false` | Hide valueless fields on the auto-rendered `CnObjectDataWidget` instead of showing them with an em dash. Set from the manifest as `config.hideEmpty` for a **discriminated supertype** — one schema holding several variants (e.g. a `ticket` holding request / complaint / contactmoment), where each object only carries the fields its own variant uses. A widget declaring its own `content.hideEmpty` wins over this page-level default. |
| data-widget `content.editable` | Boolean | `true` | Whether a `type: "data"` widget's auto-rendered `CnObjectDataWidget` exposes its built-in inline edit (the pencil → schema-driven `CnFormDialog`). Set `editable: false` in the widget's `content` to suppress it — e.g. when the page already offers a richer bespoke edit modal via a `headerAction`/`#form-dialog`, so the object is edited in exactly one place. Mirrors the `object-geo` widget's existing `editable` key. |
| `error` | Boolean | `false` | Whether the page is in an error state |
| `errorMessage` | String | `'An error occurred'` | Error message shown in the error state |
| `onRetry` | Function | `null` | Callback for the retry button; when `null` no retry button is shown |
| `retryLabel` | String | `'Retry'` | Label for the retry button |
| `empty` | Boolean | `false` | Whether there is no data to show |
| `emptyLabel` | String | `'No data available'` | Message shown in the empty state |
| `statsTitle` | String | `''` | Title shown above the statistics table |
| `statsColumns` | Array | `[]` | Column definitions for the stats table: `{ key, label, align? }` |
| `statsRows` | Array | `[]` | Row data for the stats table; set `indent: true` for sub-row styling |
| `maxWidth` | String | `'1200px'` | Maximum width of the page content area |
| `subscribe` | Boolean | `true` | When `true` and `objectStore` is provided, auto-subscribes to live updates for `objectType` + `objectId` via `useObjectSubscription`, and renders `CnLockedBanner` when a remote pessimistic lock is active. |
| `objectStore` | Object | `null` | Pinia store instance (typically `useObjectStore()`). Required for `subscribe` to take effect. |
| `sidebarTabs` | Array | `[]` | Tab definitions forwarded to the host App's `CnObjectSidebar` via the injected `objectSidebarState`. Each entry follows the `CnObjectSidebar` tab shape (`{ id, label, icon?, widgets?, component?, order? }`). When empty (default), the sidebar falls back to its own default tab set. The actual `<CnObjectSidebar>` is rendered at `NcContent` level by `CnAppRoot` (ADR-017 — external sidebar pattern); this page only publishes the tabs. |
| `appConfig` (`app-config`) | Object | `{}` | App configuration map provided to descendants on `cnAppConfig` so declarative widget/section config can resolve `@config.<key>` tokens (e.g. a stat widget's reporting currency). A manifest renderer typically seeds it from `loadState(appId, 'config', {})`; empty leaves every token to fall back to its literal default. |
| `createRoute` (`create-route`) | String | `''` | Vue-router route NAME to navigate to after a create-form save (the create archetype: a `type:"detail"` page whose route carries no `:id`). The created object's id is passed as the `id` route param. When empty (the default) the page navigates back in history after a successful create instead. See `isCreateMode`. |
| `createForm` (`create-form`) | String | `'auto'` | Whether this page renders its OWN create form dialog (the create archetype, ADR-062). `'auto'` keeps the heuristic — schema-bound, no object id, and no body of its own (no default slot, no grid layout). `'never'` never renders it: use when the body already owns data entry (e.g. a `CnObjectDataWidget` or a registry component supplies the form), which is what stops two form dialogs stacking on one page. `'always'` renders it even when the page has a body. Either way the dialog is the generic, schema-driven `CnFormDialog`, so it follows the same OpenRegister/schema form rules (`required`, `readOnly`, `enum`/`$ref`, `condition`/`visibleWhen`, min/max/pattern). Set from the manifest as `config.createForm`. |

## Slots

| Slot | Description |
|------|-------------|
| `header` | Replace the left header block (icon + title + description). Scope: `{ title, description, icon, iconSize }` |
| `translation-badge` | Replace the default `CnTranslatedBadge` rendered when the resolved object was translated from another language. Scope: `{ object }` (the resolved object) |
| `icon` | Replace the icon inside the default header |
| `actions` | Action buttons rendered in the right-hand header area |
| `error` | Custom error state content (replaces default `NcEmptyContent`) |
| `empty` | Custom empty state content |
| `stats-header` | Content above the stats table (replaces the default `statsTitle` heading) |
| `stats-rows` | Custom `<tr>` rows inside the stats table body |
| `sections` | Additional content below the main content area |
| `footer` | Footer content rendered below the body |
| `form-dialog` | Replace the built-in create/edit form dialog. Scope: `{ show, item, schema, confirm, close }` — the same slot name and the same scope as `CnIndexPage`'s `form-dialog`, so one replacement component serves both pages. Covers both of this page's dialogs: `item` is the record when editing and `null` (or the route prefill) in create mode. See [Replacing the form dialog](#replacing-the-form-dialog). |
| `widget-{widgetId}` | Widget slot in grid layout mode. Scope: `{ item, widget, objectId, object, objectData, objectType, register, schema }`. A `type: "custom"` widget is mounted by `CnPageRenderer` as `<component v-bind="slotProps" />`, so this scope *is* the widget's prop set — declare `objectId` (and any of the rest) on the component and it arrives. `objectId` comes from the route-fed prop, so it is set on the first render; `object` / `objectData` are `null` until the record's fetch resolves. |

## Replacing the form dialog

`CnDetailPage` renders its create and edit forms with the generic,
schema-driven `CnFormDialog`, and the schema comes from the register. When an
app needs the form to show something the stored schema does not carry, it
replaces the dialog through the `#form-dialog` slot.

This is the same slot name and the same scope as `CnIndexPage`'s
`form-dialog`, on purpose: a replacement written for one page works on the
other unchanged, and there is one contract to learn rather than two.

### Transforming the schema

The common case is not a different dialog but a different *schema*: a picker
whose vocabulary lives in stored configuration rather than in a schema `enum`.
Render the built-in `CnFormDialog` inside the slot and hand it a transformed
copy of the schema.

```vue
<template>
  <CnDetailPage
    title="Decision"
    register="decidiq"
    schema="decision"
    :object-id="id"
    :object-store="store"
    show-edit-action>
    <template #form-dialog="{ show, item, schema, confirm, close }">
      <CnFormDialog
        v-if="show"
        ref="dialog"
        :schema="withDecisionTypes(schema)"
        :item="item"
        @confirm="onConfirm"
        @close="close" />
    </template>
  </CnDetailPage>
</template>

<script>
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'

export default {
  data() {
    return { decisionTypes: [], confirmFn: null }
  },
  async created() {
    // Decision types are stored configuration, not a schema enum, so the
    // schema's enum is deliberately empty and the vocabulary is fetched.
    const { data } = await axios.get(generateUrl('/apps/decidiq/api/v1/decision-types'))
    this.decisionTypes = data.results || []
  },
  methods: {
    // Splice the runtime vocabulary into the enum. Return a COPY: the schema
    // handed to the slot is the store's, and mutating it would change every
    // other surface reading the same schema.
    withDecisionTypes(schema) {
      if (!schema || !schema.properties || !schema.properties.decisionType) return schema
      return {
        ...schema,
        properties: {
          ...schema.properties,
          decisionType: {
            ...schema.properties.decisionType,
            enum: this.decisionTypes.map((t) => t.id),
            'x-enumLabels': this.decisionTypes.map((t) => t.label),
          },
        },
      }
    },
  },
}
</script>
```

### Saving

Call the `confirm` from the slot scope rather than saving in the replacement.
It runs the page's own persistence path, so a create or edit made in the
replacement behaves exactly like one made in the built-in dialog: the same
duplicate-id refusal, the same store-then-axios fallback, the same `created` /
`edited` events, and the same lifecycle reload.

`confirm` resolves to `{ success: true, data }` or `{ error }`. A replacement
that renders its own `CnFormDialog` **must** pass that result to the dialog's
`setResult()`:

```js static
async onConfirm(formData) {
  const result = await this.confirm(formData)
  this.$refs.dialog.setResult(result)
}
```

`CnFormDialog` sets its `loading` flag on submit and only `setResult` clears
it, and `no-close` is bound to `loading`. A replacement that ignores the
result locks its own modal open, on success as well as on failure.

### Notes

- `show` already carries the page's own visibility guards, including the one
  that keeps the edit form shut until the record has loaded. Bind `v-if="show"`
  rather than reimplementing visibility, or a form opened before the fetch
  lands will show blanks that Save would write over the record.
- One slot covers both dialogs. They are mutually exclusive, since create mode
  is by definition a page with no object id; `item` is `null` (or the route
  prefill) in create mode and the record when editing.
- `confirm` and `show` are bound as **props**, not events. `CnPageRenderer`
  mounts a manifest-declared replacement as
  `<component :is="…" v-bind="slotProps" />`, which binds props only, so a
  manifest replacement can declare `props: ['show', 'item', 'schema',
  'confirm', 'close']` and receive the whole contract.
- Passing no slot changes nothing: the built-in dialogs render exactly as
  before.

## Integration props (AD-19)

| Prop | Default | Description |
|---|---|---|
| `surface` | `'detail-page'` | Rendering surface forwarded to integration widgets (`type === 'integration'`) in the grid layout. Drives the AD-19 surface fallback. |
| `integrationContext` (`integration-context`) | `null` | Object context `{ register, schema, objectId }` forwarded to integration widgets. Derived from `sidebarProps` + `objectId` when omitted. |

## Built-in Actions menu

The header carries the shared [CnActionsMenu](./cn-actions-menu.md) overflow (Refresh / Documentation / Request a feature) after any `#actions` slot content. Refresh and Request-a-feature are on by default.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showRefresh` | Boolean | `true` | Show the Refresh item. Emits `@refresh`; default fires the `cn:page:refresh` event-bus channel. |
| `showEditAction` | Boolean | `false` | Show a header **Edit** button opening the record's schema form. Needs `register` + `schema` + `objectId`. Emits `@edited` on save. |
| `editLabel` | String | `''` | Label for the header Edit button. Defaults to a translated "Edit". |
| `showRequestFeature` | Boolean | `true` | Show the Request-a-feature item. Opens CnSuggestFeatureModal with `surface: "detail:<id>"`. |
| `documentationUrl` | String | `''` | When set, adds a **Documentation** entry opening the link in a new tab. Empty hides it. |
| `documentationLabel` | String | `t('Documentation')` | Pre-translated Documentation label. |
| `pageId` | String | `''` | Stable id for the menu surface + `@refresh`/`@request-feature` payloads; falls back to a slugified `title`. |
| `specRef` | String | `''` | Forwarded to the feature-request modal so the issue links to the spec capability. |
| `refreshing` | Boolean | `false` | While true, the Refresh item is disabled and shows a loading spinner for as long as this stays true (reflects the real refresh time). |
| `refreshLabel` | String | `t('Refresh')` | Pre-translated Refresh label. |
| `requestFeatureLabel` | String | `t('Request a feature')` | Pre-translated Request-a-feature label. |
| `actionsMenuLabel` | String | `t('Actions')` | Pre-translated overflow-menu trigger label. |

| Slot | Description |
|------|-------------|
| `action-items` | Extra `NcActionButton`-family items appended inside the overflow menu, after the built-in trio. |

## Action handlers (manifest-actions-dispatch)

CnDetailPage consumes the same `actions[].handler` contract as CnIndexPage. When a CnIndexPage is nested INSIDE a detail page, the `cnCustomComponents` registry inject continues to come from the surrounding `CnAppRoot` — no extra wiring is needed at the detail-page level. See [CnIndexPage.md → Action handlers](../CnIndexPage/CnIndexPage.md#action-handlers-manifest-actions-dispatch) for the reserved-keyword table, the registry resolution semantics, and the manifest declaration example.

### Additional props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showRelatedObjects` | Boolean | `true` | Whether to render the Related section beneath the data widget. Set `false` on pages that surface relations elsewhere (e.g. the sidebar) to drop the section. |
| `lifecycleActions` | Object \| null | `null` | Declarative status-gated transition buttons in the page header, driven by the object's `x-openregister-lifecycle`. `{ field: 'status' }` fetches allowed transitions from OpenRegister's `/available-actions`; an explicit `{ transitions: [...] }` is filtered client-side by current state. Emits `@transitioned`. See [CnLifecycleActions](../CnLifecycleActions/CnLifecycleActions.md) / docs `cn-lifecycle-actions.md`. |
| `relatedCollections` | Array | `[]` | Declarative related-object list sections below the body; each `{ title?, register, schema, filter?, columns?, sort?, limit?, rowRoute? }` renders a `CnObjectListWidget` scoped to this object via `@objectId`. Emits `@related-row-click`. See docs `cn-related-collections.md`. |
| `summaryAggregates` | Array | `[]` | Declarative cross-schema count/sum/avg chips in the header; each `{ label, register, schema, metric?, field?, filter?, format? }` scoped to this object. See docs `cn-summary-aggregates.md`. |
| `relationLinks` | Array | `[]` | Declarative relation-link actions; each `{ label?, register, schema, fkField, labelField?, allowCreate?, title?, selectLabel? }` opens a search-and-link modal that patches a FK on this object. Emits `@relation-linked`. See docs `cn-relation-link-modal.md`. |
| `bodyWidgets` | Array | `[]` | Declarative IN-BODY sections; each `{ id?, component, title?, props?, placement?, colSpan? }` renders a registered host-app component as a titled body section (NOT the sidebar) with token-resolved props (`@objectId` / `@object.<field>` / `@workspace.<key>`) and the object context provided on `cnSectionContext`. `placement` = `before-body`/`after-data`/`after-related`/`end`. No sidebar tab required. See docs `cn-body-sections.md`. |

## Header actions menu

The page header's overflow menu carries Refresh plus the mandatory trio Request a feature / Report a bug / Documentation.

| Prop | Type | Default | Description |
|---|---|---|---|
| `showReportBug` | Boolean | `true` | Whether the Report-a-bug entry renders in the page-header menu. |
| `showDocumentation` | Boolean | `true` | Whether the Documentation entry renders. Its target is resolved by the shared menu from the app-wide documentation base plus this page's id, so leaving it on costs the host nothing. |
