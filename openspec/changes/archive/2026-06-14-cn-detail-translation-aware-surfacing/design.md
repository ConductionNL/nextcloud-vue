# Design: CnDetail Translation-Aware Surfacing

## Reuse analysis

- `CnDetailGrid` and `CnDetailPage` are the canonical detail
  surfaces — every consumer app already routes the
  detail-of-an-object case through one of these. Wiring the badge
  here covers ~all surfaces with zero per-app migration.
- The `cn-` CSS prefix, Nextcloud CSS variables, and `@nextcloud/l10n`
  `translate` import are the established conventions for new
  components. `CnTranslatedBadge` follows them byte-for-byte.
- `Intl.DisplayNames` is the standard Web API for BCP-47 → display
  name conversion. Available in every browser the library
  supports; no polyfill required.
- The new spec capability composes with the sibling
  `i18n-language-negotiation-getters` change — apps wire the
  language read (via getter) AND surface the result (via badge) in
  the same migration pass.

## CnTranslatedBadge contract

```vue
<!-- src/components/CnTranslatedBadge/CnTranslatedBadge.vue -->
<template>
    <span
        v-if="visible"
        class="cn-translated-badge"
        :title="hoverTitle"
        data-testid="cn-translated-badge">
        <span class="cn-translated-badge__icon" aria-hidden="true">⇄</span>
        <span class="cn-translated-badge__label">
            {{ t('nextcloud-vue', '(translated from {language})', { language: sourceDisplayName }) }}
        </span>
    </span>
</template>
```

Props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `object` | `Object\|null` | `null` | The OR object. Reads `_translationMeta`. |
| `localeNameFormatter` | `Function\|null` | `null` | Custom BCP-47 → display name function. Receives BCP-47 string, returns display name. Falls back to `Intl.DisplayNames` then raw string. |

Computeds:

- `visible` — `true` iff
  `object && object._translationMeta && typeof
  object._translationMeta.translatedFrom === 'string' &&
  object._translationMeta.translatedFrom.length > 0`.
- `sourceDisplayName` — `localeNameFormatter(bcp47)` if provided,
  else `new Intl.DisplayNames([navigator.language || 'en'],
  { type: 'language' }).of(bcp47)` if available, else the raw
  BCP-47 string.
- `hoverTitle` — `translatedAt` ISO string formatted as a locale
  date-time if available, else empty.

## Wiring into CnDetailGrid

Add an optional `:object` prop and a new header slot. Backwards
compatible: existing consumers don't pass `:object` and see no
change.

```vue
<template>
    <div class="cn-detail-grid" :class="rootClasses" :style="rootStyles">
        <div v-if="object && !$scopedSlots.header" class="cn-detail-grid__translation-header">
            <CnTranslatedBadge :object="object" />
        </div>
        <slot name="header" :object="object" />
        <!-- existing items render … -->
    </div>
</template>
```

Props added:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `object` | `Object\|null` | `null` | When set, the grid renders a `CnTranslatedBadge` above the items when `_translationMeta.translatedFrom` is set. |

The badge auto-hides via its own `v-if="visible"` — `CnDetailGrid`
doesn't need to inspect `_translationMeta`; it just hands the
object to the badge.

## Wiring into CnDetailPage

The page already resolves an object via `objectType` + `objectId`
through the bound store's `getObject(type, id)` getter. We add a
computed `resolvedObject` and render the badge in the header
text block, between the title and description.

```vue
<div class="cn-detail-page__header-text">
    <h2 v-if="title" class="cn-detail-page__title">
        {{ title }}
    </h2>
    <slot name="translation-badge" :object="resolvedObject">
        <CnTranslatedBadge v-if="resolvedObject" :object="resolvedObject" />
    </slot>
    <p v-if="description" class="cn-detail-page__description">
        {{ description }}
    </p>
</div>
```

`resolvedObject` is computed from the existing
`objectType`/`objectId` props and the bound store's
`getObject(type, id)` getter. When either prop is empty or the
object isn't in the store cache, `resolvedObject` is `null` and
the badge renders nothing — same auto-hide path.

A new `#translation-badge` slot exposes the same scoped binding
(`:object`) so consumers can replace the default badge with their
own component (e.g. a richer modal trigger).

## Backwards compatibility

- `CnDetailGrid`: existing consumers don't pass `:object` —
  `object === null`, the new `cn-detail-grid__translation-header`
  block doesn't render, **zero visual change**.
- `CnDetailPage`: existing consumers without an `objectType` +
  `objectId` resolve to `resolvedObject === null` — badge doesn't
  render. Consumers WITH `objectType` + `objectId` but whose object
  isn't translated also see no badge. The only visible change is on
  surfaces showing translated content, which is the explicit goal.

## CSS contract

```css
.cn-translated-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--default-grid-baseline, 4px);
    padding: calc(0.5 * var(--default-grid-baseline, 4px)) calc(2 * var(--default-grid-baseline, 4px));
    border-radius: var(--border-radius-pill, 999px);
    background: var(--color-background-hover);
    color: var(--color-text-maxcontrast);
    font-size: 0.75em;
    font-weight: 500;
    line-height: 1;
}

.cn-translated-badge__icon {
    font-size: 0.9em;
}
```

Only Nextcloud CSS variables; no `--nldesign-*` direct references.
Contrast checked against the `--color-background-hover` surface
under both light and dark themes.

## Test strategy

- `src/components/CnTranslatedBadge/__tests__/CnTranslatedBadge.spec.js`
  — 5+ test cases:
  1. No object → renders nothing.
  2. Object without `_translationMeta` → renders nothing.
  3. Object with `_translationMeta.translatedFrom === null` →
     renders nothing.
  4. Object with `_translationMeta.translatedFrom === 'nl'` →
     renders badge containing the source language token.
  5. `localeNameFormatter` prop is honoured when provided.
  6. `translatedAt` flows into the `title` attribute.
- `tests/components/CnDetailGrid.spec.js` extended (or new
  `CnDetailGridTranslation.spec.js`) covering the
  `object`-passed-and-translated case + auto-hide.
- `tests/components/CnDetailPageTranslationBadge.spec.js` —
  covers the slot override + default-render-when-translated path
  via a mock store stub.
