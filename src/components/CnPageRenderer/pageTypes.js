import { defineAsyncComponent } from 'vue'

/**
 * Default mapping from manifest `pages[].type` value to the Vue
 * component the renderer mounts.
 *
 * The library ships built-in types here; consumers and downstream
 * library extensions can add their own by passing a merged map to
 * `CnAppRoot` (or `CnPageRenderer`) via the `pageTypes` prop.
 *
 * Each entry is wrapped in `defineAsyncComponent` so that apps using
 * only a subset of types do not pay the bundle cost for the others
 * (notably `dashboard` which depends on GridStack).
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
	index: defineAsyncComponent(() => import('../CnIndexPage/CnIndexPage.vue')),
	detail: defineAsyncComponent(() => import('../CnDetailPage/CnDetailPage.vue')),
	dashboard: defineAsyncComponent(() => import('../CnDashboardPage/CnDashboardPage.vue')),
}
