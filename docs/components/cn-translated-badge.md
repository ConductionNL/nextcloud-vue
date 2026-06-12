---
sidebar_position: 5
---

# CnTranslatedBadge

A stateless presentational chip that surfaces OpenRegister's
`_translationMeta.translatedFrom` field on detail surfaces. Lets the
end-user see *"(translated from {sourceLanguage})"* on objects whose
projection is a translation rather than the canonical source row.

Pairs with the language-negotiation getters on `createObjectStore`
(see [`i18n-language-negotiation-getters`](../composables/use-object-store.md)).
Apps that wire `languageGetter` receive translated bytes from OR; the
badge tells the user that those bytes are a translation projection.

The badge **auto-hides** when:

- `object` is null
- `object._translationMeta` is missing
- `object._translationMeta.translatedFrom` is null, undefined, or an
  empty string

So consumers can default-mount it with no visual cost on source rows.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `object` | `Object\|null` | `null` | The OR object whose `_translationMeta` is surfaced. |
| `localeNameFormatter` | `Function\|null` | `null` | Optional BCP-47 → display name function (`(bcp47) => string`). Falls back to `Intl.DisplayNames` then to the raw BCP-47 string. |

## Default rendering

When `_translationMeta.translatedFrom === 'nl'` and the user's
browser language is English the badge renders as:

```html
<span class="cn-translated-badge" title="Translated at 6/1/2026, 10:00:00 AM">
  <span class="cn-translated-badge__icon" aria-hidden="true">⇄</span>
  <span class="cn-translated-badge__label">(translated from Dutch)</span>
</span>
```

The `title` attribute exposes `translatedAt` so users can spot a
stale projection (a translation older than the most recent source
edit).

## Usage

### Standalone

```vue
<template>
    <CnTranslatedBadge :object="object" />
</template>

<script>
import { CnTranslatedBadge } from '@conduction/nextcloud-vue'

export default {
    components: { CnTranslatedBadge },
    props: { object: { type: Object, default: null } },
}
</script>
```

### Inside CnDetailGrid

The grid renders the badge automatically when `:object` is passed:

```vue
<CnDetailGrid
    :object="store.getObject('case', $route.params.id)"
    :items="[
        { label: 'ID', value: object.id },
        { label: 'Status', value: object.status },
    ]" />
```

### Inside CnDetailPage

The page resolves the badge target from `objectType` + `objectId` and
renders it between the title and description automatically. Override
with the `#translation-badge` slot:

```vue
<CnDetailPage
    :title="object.title"
    :object-type="'case'"
    :object-id="$route.params.id"
    :object-store="store">
    <template #translation-badge="{ object }">
        <MyRicherBadge :object="object" />
    </template>
</CnDetailPage>
```

### Custom locale labels

When `Intl.DisplayNames` returns labels you'd rather not use (or
isn't available in the runtime), inject your own formatter:

```vue
<CnTranslatedBadge
    :object="object"
    :locale-name-formatter="(bcp47) => myLanguageLabels[bcp47] || bcp47" />
```

## CSS contract

The badge uses Nextcloud CSS variables for both colour and shape — no
direct `--nldesign-*` references — so nldesign theming overrides flow
through transparently.

| CSS variable | Use |
|--------------|-----|
| `--color-background-hover` | chip surface |
| `--color-text-maxcontrast` | chip text |
| `--border-radius-pill` | pill shape (falls back to `999px`) |
| `--default-grid-baseline` | spacing |

## See also

- [`CnDetailGrid`](./cn-detail-grid.md) — auto-renders the badge above
  the items when `:object` is passed.
- [`CnDetailPage`](./cn-detail-page.md) — auto-renders the badge in
  the header between title and description.
- [`docs/composables/use-object-store.md`](../composables/use-object-store.md)
  — sibling `languageGetter` / `targetLanguageGetter` primitive.
- `openspec/changes/cn-detail-translation-aware-surfacing/` — the
  change introducing the badge.
- OR `openspec/changes/i18n-source-of-truth/` — the server-side
  contract whose `_translationMeta` block this component surfaces.
