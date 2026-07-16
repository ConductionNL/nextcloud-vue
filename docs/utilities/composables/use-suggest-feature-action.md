# useSuggestFeatureAction

Helper for adding a "Suggest feature" action to widgets / pages that have
declared a `specRef`. Returns an `NcActions` descriptor `{label, icon, action,
specRef}` when `useSpecRef()` resolves a non-empty slug, or `null` when no
specRef is in scope so consumers can `v-if` cleanly.

## Parameters

| Param | Type | Notes |
|---|---|---|
| `vm` | Object (Vue component instance) | The current component (typically `this`). Walked by the internal `useSpecRef(vm)` call to resolve the active slug. |
| `onOpenModal` | Function `(slug: string) => void` | Callback invoked when the user clicks the action item. Receives the resolved slug; the consumer is responsible for actually mounting `CnSuggestFeatureModal` (typically by toggling a data flag). |

Returns: `{label, icon, action, specRef} | null` — descriptor when a specRef is
in scope, `null` otherwise.

## Usage

```js
import { useSuggestFeatureAction } from '@conduction/nextcloud-vue'

export default {
  specRef: 'catalog-management',
  data() {
    return { showSuggestModal: false, suggestSlug: null }
  },
  computed: {
    suggestAction() {
      return useSuggestFeatureAction(this, (slug) => {
        this.suggestSlug = slug
        this.showSuggestModal = true
      })
    },
  },
}
```

```vue
<template>
  <NcActions>
    <NcActionButton v-if="suggestAction" @click="suggestAction.action">
      {{ suggestAction.label }}
    </NcActionButton>
  </NcActions>
</template>
```

## Reference

- Spec: `openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md`
  → Requirement "useSuggestFeatureAction helper"
- Implementation: [src/composables/useSuggestFeatureAction.js](../../../src/composables/useSuggestFeatureAction.js)
- Related composable: [useSpecRef](./use-spec-ref.md)
