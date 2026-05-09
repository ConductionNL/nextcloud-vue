import { defineAsyncComponent } from 'vue'

/**
 * Default mapping from manifest `pages[].type` value to the Vue
 * component the renderer mounts.
 *
 * The library ships built-in types here; consumers and downstream
 * library extensions can add their own by passing a merged map to
 * `CnAppRoot` (or `CnPageRenderer`) via the `pageTypes` prop.
 *
 * Each entry uses `defineAsyncComponent` with an explicit
 * `.then(m => m.default)` unwrap. The unwrap is load-bearing: rollup's
 * `inlineDynamicImports: true` flattens every `import()` call into a
 * `Promise.resolve().then(() => namespace)` where `namespace` is a
 * frozen `Object.freeze({__proto__: null, default: <component>})`.
 * Vue 2's async-component resolution against that frozen wrapper trips
 * `Cannot add property _Ctor, object is not extensible` when downstream
 * `Vue.extend()` (e.g. via Vue Router or `<component :is>`) tries to
 * attach its internal `_Ctor` cache. Pre-unwrapping the `default`
 * property yields the raw, extensible component options object —
 * which Vue can then mutate freely.
 *
 * Keeping `defineAsyncComponent` (rather than collapsing to static
 * imports) preserves the test-environment hack of NOT loading
 * `CnDashboardPage` → `CnDashboardGrid` → `gridstack` at module-load
 * time; gridstack ships ESM that Jest's default transform refuses
 * unless explicitly allowlisted. Async imports keep that load
 * deferred to actual render.
 *
 * The special `custom` type is NOT registered here — CnPageRenderer
 * handles it inline, resolving `page.component` against the
 * customComponents registry rather than this map.
 *
 * @example Extending with an app-specific page type
 *
 *   import { defaultPageTypes } from '@conduction/nextcloud-vue'
 *   import MyReportPage from './views/MyReportPage.vue'
 *
 *   const pageTypes = { ...defaultPageTypes, report: MyReportPage }
 *
 *   <CnAppRoot :manifest="manifest" app-id="myapp" :page-types="pageTypes" />
 *
 * @example Adding a built-in page type to the library
 *
 *   Add a new entry to this map and export the component from the
 *   `src/components/index.js` barrel. No change to CnPageRenderer.vue.
 */
export const defaultPageTypes = {
	index: defineAsyncComponent(() => import('../CnIndexPage/CnIndexPage.vue').then(m => m.default)),
	detail: defineAsyncComponent(() => import('../CnDetailPage/CnDetailPage.vue').then(m => m.default)),
	dashboard: defineAsyncComponent(() => import('../CnDashboardPage/CnDashboardPage.vue').then(m => m.default)),
	logs: defineAsyncComponent(() => import('../CnLogsPage/CnLogsPage.vue').then(m => m.default)),
	settings: defineAsyncComponent(() => import('../CnSettingsPage/CnSettingsPage.vue').then(m => m.default)),
	chat: defineAsyncComponent(() => import('../CnChatPage/CnChatPage.vue').then(m => m.default)),
	files: defineAsyncComponent(() => import('../CnFilesPage/CnFilesPage.vue').then(m => m.default)),
}
