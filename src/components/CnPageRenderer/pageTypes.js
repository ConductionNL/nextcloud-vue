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
	form: defineAsyncComponent(() => import('../CnFormPage/CnFormPage.vue').then(m => m.default)),
	map: defineAsyncComponent(() => import('../CnMapPage/CnMapPage.vue').then(m => m.default)),
	roadmap: defineAsyncComponent(() => import('../CnFeaturesAndRoadmapPage/CnFeaturesAndRoadmapPage.vue').then(m => m.default)),
	reports: defineAsyncComponent(() => import('../CnReportsPage/CnReportsPage.vue').then(m => m.default)),
	search: defineAsyncComponent(() => import('../CnSearchPage/CnSearchPage.vue').then(m => m.default)),
	wiki: defineAsyncComponent(() => import('../CnWikiPage/CnWikiPage.vue').then(m => m.default)),
	// A flow list USED TO need its own page type. A flow lives in
	// OpenRegister's native flow store, not a register/schema pair, so the
	// object-backed index had nothing to bind to — and every app adopting flows
	// copied ~270 lines of identical wrapper differing only in an app-id
	// string, which is how three apps ended up with the same dead `@rowClick`
	// listener (CnIndexPage emits `row-click`).
	//
	// Named index sources removed that constraint: `type: "index"` with
	// `config.entitySource: "flows"` lists them, so only the EDITOR still needs a
	// page type of its own.
	//
	// The flow EDITOR. `flow` opens one flow; the LIST is now an ordinary
	// `type: "index"` with `config.entitySource: "flows"`, so a flow surface needs no
	// custom page and no page type of its own for the list half.
	flow: defineAsyncComponent(() => import('../CnFlowsPage/CnFlowEditorPage.vue').then(m => m.default)),

	// DEPRECATED, kept so the fleet can migrate without a flag day. `flows`
	// predates named index sources and `flow-detail` is the old name for
	// `flow`. Both still resolve; remove them once no manifest names them.
	flows: defineAsyncComponent(() => import('../CnFlowsPage/CnFlowsPage.vue').then(m => m.default)),
	'flow-detail': defineAsyncComponent(() => import('../CnFlowsPage/CnFlowEditorPage.vue').then(m => m.default)),
}
