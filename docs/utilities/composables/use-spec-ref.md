# useSpecRef

Resolve the context-aware capability slug (`specRef`) for the current Vue
component. Reads from:

1. The nearest ancestor component's `$options.specRef` (Options API) or
   `defineOptions({ specRef: '...' })` (Composition API)
2. The active Vue Router route's `meta.specRef` (fallback)
3. `null` when neither source provides a value

The slug convention is kebab-case, identical to ADR-008 `@spec` PHPDoc
annotations on the backend.

## Parameters

| Param | Type | Notes |
|---|---|---|
| `vm` | Object (Vue component instance) | The current component — typically `this` in an Options API method, or `getCurrentInstance().proxy` in Composition API. The function walks `vm.$parent` up the tree, then falls back to `vm.$route.meta.specRef`. |

Returns: `string | null` — the resolved kebab-case slug, or `null` when no
source supplies a value.

## Usage

```js
import { useSpecRef } from '@conduction/nextcloud-vue'

export default {
  specRef: 'catalog-management',  // Options API declaration
  mounted() {
    this.activeSlug = useSpecRef(this)  // -> 'catalog-management'
  },
}
```

## Reference

- Spec: `openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md`
  → Requirement "useSpecRef composable"
- Implementation: [src/composables/useSpecRef.js](../../../src/composables/useSpecRef.js)
- Related helper: [useSuggestFeatureAction](./use-suggest-feature-action.md)
