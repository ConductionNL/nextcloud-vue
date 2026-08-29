<!--
  CnPageRenderer — JSON-driven page dispatcher.

  Mounted inside <router-view>, CnPageRenderer reads the manifest, finds
  the page definition whose `id` matches the current route name, and
  renders the appropriate page component by dispatching on `type`.

  Page types are resolved via the `pageTypes` registry. The library
  ships a built-in registry (`defaultPageTypes` — index, detail,
  dashboard) and consumers can extend it by passing a merged map to
  CnAppRoot or CnPageRenderer. The `custom` type is special: it
  resolves `page.component` against the customComponents registry
  rather than the page-types map. Adding a new built-in page type to
  the library is one line in `pageTypes.js` — no change here.

  Each entry in `pageTypes` is wrapped in `defineAsyncComponent` so
  apps using only a subset of types do not pay the bundle cost for
  others (notably the GridStack-backed dashboard).

  Manifest, customComponents, pageTypes, and translate are injected
  from CnAppRoot by default; each can also be passed as props for
  standalone use without CnAppRoot. Props always take precedence
  over inject.

  See REQ-JMR-005 of the json-manifest-renderer specification.
-->
<template>
	<div
		v-if="currentPage"
		:data-page-id="currentPage.id"
		data-testid="cn-page"
		:data-testid-page-id="currentPage.id"
		:class="['cn-page-renderer', { 'cn-page-renderer--no-sidebar': !pageSidebarVisibleValue }]">
		<!-- V2 render path: slot dispatcher via CnWidgetGrid.
		     Body falls back to the typed-primitive dispatch when no
		     widgets[] entries target the `body` slot — apps that just
		     declare `type:"index"` (or any other registered type) with
		     a `config` payload still get the default page component
		     (CnIndexPage, CnDetailPage, etc.) mounted, without having
		     to hand-author a widget entry. An explicit body widget
		     (e.g. an `object-table` widget in `body`) still wins over
		     the default. -->
		<template v-if="isV2Manifest">
			<!-- body slot — widgets first, default typed component otherwise.
			     KNOWN GAP (ConductionNL/hrmq#112 follow-up): a body widget
			     short-circuits the typed component, so a `type: "detail"` page
			     that adopts ADR-036's page-level `widgets[]` never mounts
			     CnDetailPage and loses its header, padding, sidebar and grid
			     discipline. The same applies to `type: "dashboard"` pages and
			     CnDashboardPage.

			     NOTE the direction of the tension: the v2 schema DOCUMENTS
			     page-level `widgets[]` as preferred and calls `config.widgets`
			     legacy, yet only `config.widgets` reaches the typed component.
			     An app following the documented advice gets the worse result.

			     hrmq was the only app with `widgets[]` on detail pages and has
			     since moved its 47 pages onto `config.widgets` (hrmq#115), so
			     nothing in the fleet is currently mis-rendering — but the trap
			     is still armed for the next app that follows the schema's own
			     recommendation.

			     Hosting the grid in the typed component's default slot was tried
			     and REVERTED: the unit suite went green while the live page got
			     worse — the body rendered empty (CnDetailPage gates its default
			     slot against its own auto-body) and its sidebar fired ~20
			     integration endpoints that 404 on an instance without them. The
			     real fix is either to make the typed components accept a body
			     grid as a first-class input, or to settle the schema on one
			     spelling and translate the other here. -->
			<CnWidgetGrid
				v-if="widgetsBySlot.has('body')"
				:widgets="widgetsBySlot.get('body')"
				:editable="bodyEditable"
				slot-name="body" />
			<component
				:is="resolvedComponent"
				v-else-if="resolvedComponent"
				:key="pageRenderKey"
				v-bind="{ ...$attrs, ...resolvedProps }"
				@view="onRowOpen"
				@row-click="onRowOpen"
				@edit-open="onRowOpen"
				@configure="showConfigModal = true">
				<!-- This `<template v-for>` defines dynamic SLOTS, not a
				     rendered list, so the rule's advice is inverted here:
				     `@vue/compiler-sfc` DISCARDS a `:key` on a slot-defining
				     `<template>` (verified — the generated `createSlots` entry
				     carries only `name`) and honours it only on the child.
				     Moving the key up would throw it away. -->
				<!-- eslint-disable vue/no-v-for-template-key-on-child -->
				<template
					v-for="entry in resolvedSlotEntries"
					#[entry.name]="slotProps">
					<component
						:is="entry.component"
						:key="entry.name"
						v-bind="slotProps" />
				</template>
				<!-- eslint-enable vue/no-v-for-template-key-on-child -->
			</component>
			<!-- header-actions slot -->
			<CnWidgetGrid
				v-if="widgetsBySlot.has('header-actions')"
				:widgets="widgetsBySlot.get('header-actions')"
				slot-name="header-actions" />
			<!-- footer slot -->
			<CnWidgetGrid
				v-if="widgetsBySlot.has('footer')"
				:widgets="widgetsBySlot.get('footer')"
				slot-name="footer" />
			<!-- modal slot -->
			<CnWidgetGrid
				v-if="widgetsBySlot.has('modal')"
				:widgets="widgetsBySlot.get('modal')"
				slot-name="modal" />
			<!-- sidebar slot (gated by cnPageSidebarVisible) -->
			<CnWidgetGrid
				v-if="widgetsBySlot.has('sidebar') && pageSidebarVisibleValue"
				:widgets="widgetsBySlot.get('sidebar')"
				slot-name="sidebar" />
			<!-- dynamic tab:* and section:* slots -->
			<template v-for="dynamicSlot in dynamicSlotKeys" :key="dynamicSlot">
				<CnWidgetGrid
					:widgets="widgetsBySlot.get(dynamicSlot)"
					:slot-name="dynamicSlot" />
			</template>
		</template>

		<component
			:is="resolvedComponent"
			v-else-if="resolvedComponent"
			:key="pageRenderKey"
			v-bind="{ ...$attrs, ...resolvedProps }"
			@view="onRowOpen"
			@row-click="onRowOpen"
			@edit-open="onRowOpen"
			@configure="showConfigModal = true">
			<!-- Dynamic slot definition, not a rendered list — see the note on
			     the identical block above. -->
			<!-- eslint-disable vue/no-v-for-template-key-on-child -->
			<template
				v-for="entry in resolvedSlotEntries"
				#[entry.name]="slotProps">
				<component
					:is="entry.component"
					:key="entry.name"
					v-bind="slotProps" />
			</template>
			<!-- eslint-enable vue/no-v-for-template-key-on-child -->
		</component>

		<!-- Builder empty-state. A page with no renderable body — e.g. a
		     freshly-created custom page that has no `component` / body widgets
		     yet — would otherwise render nothing at all, leaving no
		     "Edit with Buildiq" affordance to start adding content. Render the
		     edit button (it self-gates to builder mode via CnAppRoot's
		     `cnOpenBuildAvailable`) plus a neutral prompt, so a new page is
		     always editable. ADR-041. -->
		<div v-if="!hasRenderableBody" class="cn-page-renderer__empty">
			<div class="cn-page-renderer__empty-actions">
				<CnBuildiqEditButton />
			</div>
			<NcEmptyContent :name="tr('This page is empty')"
				:description="tr('Open the Buildiq editor to start adding content to this page.')">
				<template #icon>
					<ShapeOutline :size="20" />
				</template>
			</NcEmptyContent>
		</div>

		<!-- Per-page config editor, opened by an index page's edit-mode cog. -->
		<CnPageConfigModal v-if="showConfigModal && currentPage"
			:page="currentPage"
			@close="showConfigModal = false" />

		<!-- Shared export launcher, opened by a `type:"export"` manifest
		     action (Wave 1, nextcloud-vue#91). Configured from the action's
		     entities[] / formats[] / description; the confirm payload routes
		     to the action's optional `handler` (manifest actions map). -->
		<CnMassExportDialog
			v-if="exportAction"
			ref="exportDialog"
			:entities="exportDialogEntities"
			:formats="exportDialogFormats"
			:description="exportAction.description || ''"
			@confirm="onExportConfirm"
			@close="exportAction = null" />
	</div>
</template>

<script>
import { ref } from 'vue'
import { NcEmptyContent } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import ShapeOutline from 'vue-material-design-icons/ShapeOutline.vue'
import { defaultPageTypes } from './pageTypes.js'
import { useObjectSubscription } from '../../composables/useObjectSubscription.js'
import CnWidgetGrid from '../CnWidgetGrid/CnWidgetGrid.vue'
import CnBuildiqEditButton from '../CnBuildiqEditButton/CnBuildiqEditButton.vue'
import CnPageConfigModal from '../../dialogs/CnPageConfigModal.vue'
import { CnMassExportDialog } from '../CnMassExportDialog/index.js'
import { dispatchAction } from '../../utils/actionsDispatcher.js'
import { resolveRouteSentinels } from '../../utils/resolveRouteSentinels.js'
import { useObjectStore } from '../../store/index.js'

/** Recognised fixed slot names for v2 manifests. */
const KNOWN_SLOTS = new Set(['body', 'sidebar', 'header-actions', 'footer', 'modal'])

/**
 * Test whether a slot name is a recognised v2 slot pattern.
 *
 * @param {string} slotName The slot name to test (e.g. `body`, `tab:overview`).
 * @return {boolean}
 */
function isKnownSlot(slotName) {
	if (!slotName) return false
	if (KNOWN_SLOTS.has(slotName)) return true
	if (/^tab:[^\s]+$/.test(slotName)) return true
	if (/^section:[^\s]+$/.test(slotName)) return true
	return false
}

/**
 * Read-only defaults applied when a type='index' page declares
 * `config.readOnly: true` (REQ-MIPFU-4 of manifest-index-page-followups).
 * Merged UNDER the explicit `config.*` props by `resolvedProps`, so
 * any explicit prop the manifest sets still wins.
 */
const READ_ONLY_DEFAULTS = Object.freeze({
	selectable: false,
	showAdd: false,
	showFormDialog: false,
	showEditAction: false,
	showCopyAction: false,
	showDeleteAction: false,
	showMassImport: false,
	showMassCopy: false,
	showMassDelete: false,
})

export default {
	name: 'CnPageRenderer',

	components: {
		CnWidgetGrid,
		CnPageConfigModal,
		CnBuildiqEditButton,
		CnMassExportDialog,
		NcEmptyContent,
		ShapeOutline,
	},

	inject: {
		cnManifest: { default: null },
		cnCustomComponents: { default: () => ({}) },
		cnTranslate: { default: () => (key) => key },
		cnPageTypes: { default: null },
		cnRegistry: { default: () => ({}) },
		cnOpenModal: { default: null },
		/** ADR-041: true while the in-app editor is editing — makes the body grid draggable. */
		cnEditingBody: { default: false },
	},

	/**
	 * Expose the current page's sidebar-visibility state and
	 * sidebar-component override to descendants (notably
	 * `CnAppRoot` which gates its `#sidebar` slot on
	 * `cnPageSidebarVisible.value` and renders
	 * `cnPageSidebarComponent.value` as the slot's default content).
	 * Each provider is a reactive holder so consumers can `inject`
	 * once and read `.value` whenever they render — Vue 2 reactivity
	 * tracks the mutation site (the watchers below in `data()`).
	 *
	 * `cnPageSidebarVisible` default holder value is `true`, so when
	 * `pages[].sidebar.show` is unset / `true`, behaviour matches
	 * today (slot renders).
	 *
	 * `cnPageSidebarComponent` default holder value is `null`, so
	 * when `pages[].sidebarComponent` is unset, the host App's
	 * `#sidebar` slot renders its consumer-supplied content (or
	 * nothing) — no behaviour change for apps that don't adopt the
	 * field.
	 */
	provide() {
		// `self` is load-bearing: `cnSlotColumns` below is a GETTER, and inside
		// a getter on that object literal `this` is the literal — not the
		// component. The getter is what keeps the provide tracking the active
		// page, and a getter cannot be an arrow function.
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const self = this
		return {
			// Per-page slot→columns override (page.config.slotColumns), read by
			// CnWidgetGrid. A getter so it tracks the active page reactively
			// despite provide() running once.
			get cnSlotColumns() {
				return self.currentPage?.config?.slotColumns ?? null
			},
			cnPageSidebarVisible: this.pageSidebarVisible,
			cnPageSidebarComponent: this.pageSidebarComponent,
			// Loaded object for a type:"detail" page (reactive holder). See
			// data().detailObjectContext. Descendant CnWidgetGrid reads this
			// to feed `objectData` / `schema` / `objectType` to detail widgets.
			cnDetailObjectContext: this.detailObjectContext,
			/**
			 * Bound dispatchAction for the v2 render path. Child widget
			 * components inject `cnDispatchAction` to dispatch manifest
			 * actions. Context is pre-bound with this component's
			 * $router and the injected cnRegistry; a caller may merge
			 * extra context (e.g. CnWidgetObjectTable passes
			 * `{ objectStore, source, row }` for `object-op` actions).
			 * The dispatch result is returned so async `object-op`
			 * dispatches can be awaited.
			 *
			 * @param {object} action The action to dispatch.
			 * @param {object} [extraContext] Extra context merged over the pre-bound one.
			 * @return {*} The dispatchAction return value (a promise for object-op).
			 */
			cnDispatchAction: (action, extraContext = {}) => {
				return dispatchAction(action, {
					router: this.$router ?? null,
					registry: this.cnRegistry,
					handlers: this.effectiveManifest?.actions ?? {},
					openModal: this._cnOpenModal,
					// `type:"export"` opens the shared CnMassExportDialog this
					// component mounts (Wave 1, nextcloud-vue#91).
					openExport: (exportAction) => { this.exportAction = exportAction },
					// The host translate function, so an api-call/agent action's
					// manifest-authored success/error toast localises exactly
					// like the rest of the page chrome. Identity by default.
					translate: (key) => this.tr(key),
					...extraContext,
				})
			},
		}
	},

	/**
	 * Forward listeners + attrs to the dispatched page component (B1).
	 *
	 * `inheritAttrs: false` opts the wrapping `.cn-page-renderer` <div>
	 * out of Vue's default non-prop-attribute fallthrough, so attributes
	 * the host passed to CnPageRenderer land on the dispatched page via
	 * `v-bind="{ ...$attrs, ...resolvedProps }"` instead. `v-on="$listeners"`
	 * does the same for events. Without this, built-in page components
	 * that emit (CnDashboardPage @widget-refresh / @widget-request-feature,
	 * CnIndexPage @create / @edit / @delete) cannot reach the host App.
	 *
	 * Resolved props win over `$attrs` on key collisions because the
	 * spread order is `{ ...$attrs, ...resolvedProps }`.
	 */
	inheritAttrs: false,

	props: {
		/**
		 * Manifest object. When omitted, falls back to the injected
		 * `cnManifest` from a CnAppRoot ancestor. Provide explicitly when
		 * mounting CnPageRenderer outside of CnAppRoot.
		 *
		 * @type {object|null}
		 */
		manifest: {
			type: Object,
			default: null,
		},
		/**
		 * Custom-component registry. Keys are the names referenced by
		 * `page.component` (for `type: "custom"` pages). When omitted,
		 * falls back to the injected `cnCustomComponents`.
		 *
		 * @type {object|null}
		 */
		customComponents: {
			type: Object,
			default: null,
		},
		/**
		 * Translate function. When omitted, falls back to the injected
		 * `cnTranslate`. Currently not used directly by the renderer
		 * itself — exposed as a prop for symmetry and so future page
		 * components rendered by the renderer can `inject('cnTranslate')`
		 * via the consumer's setup.
		 *
		 * @type {Function|null}
		 */
		translate: {
			type: Function,
			default: null,
		},
		/**
		 * Page-type registry. Map of `pages[].type` value → Vue
		 * component to mount. Consumers extend the library defaults by
		 * spreading them: `{ ...defaultPageTypes, report: MyReportPage }`.
		 *
		 * Falls back to the injected `cnPageTypes` and finally to the
		 * library's `defaultPageTypes`. The special `custom` type is
		 * NOT looked up here — it resolves through the customComponents
		 * registry instead.
		 *
		 * @type {object|null}
		 */
		pageTypes: {
			type: Object,
			default: null,
		},
	},

	/**
	 * Live updates for the v2 widget-grid detail path (#222). A
	 * `type:"detail"` page rendered through CnWidgetGrid gets its object
	 * from the `cnDetailObjectContext` holder (see `loadDetailObject`),
	 * NOT from a page component with its own subscription — so the
	 * renderer itself subscribes to `or-object-{id}` for the loaded
	 * object. The plugin's event-driven refetch then lands in
	 * `store.objects[slug][id]`, which the holder reads through
	 * reactively.
	 *
	 * The refs returned here are DRIVEN by `loadDetailObject`:
	 *   - `liveSubType` / `liveSubId` re-scope the subscription on route
	 *     or object change (the composable's epoch guard swaps handles).
	 *   - `liveSubEnabled` gates on (a) a v2 manifest page that actually
	 *     renders widget grids — the typed CnDetailPage dispatch path
	 *     manages its own subscription — and (b) the same
	 *     `config.subscribe: false` opt-out CnIndexPage / CnDetailPage
	 *     honour (manifest-live-updates).
	 *
	 * Laziness: `enabled` starts `false`, so mounting the renderer on
	 * any non-detail page causes zero transport activity (resolving the
	 * default store is inert per the plugin's laziness guarantee).
	 * Unmount and route changes release via the composable's own
	 * lifecycle; the polling fallback is the transport's concern.
	 *
	 * @return {object} Refs exposed on `this` for `loadDetailObject`.
	 */
	setup() {
		const liveSubType = ref('')
		const liveSubId = ref('')
		const liveSubEnabled = ref(false)
		let liveStore = null
		try {
			liveStore = useObjectStore()
		} catch (err) {
			// Pinia not installed (stand-alone / unit-test mounts) — no
			// live updates; loadDetailObject degrades the same way.
			liveStore = null
		}
		if (liveStore) {
			useObjectSubscription(
				liveStore,
				liveSubType,
				liveSubId,
				{ enabled: () => Boolean(liveSubEnabled.value && liveSubType.value && liveSubId.value) },
			)
		}
		return { liveSubType, liveSubId, liveSubEnabled }
	},

	data() {
		// Reactive holders for the per-page sidebar visibility flag and
		// sidebar-component override. Both live on data() so Vue 2
		// reactivity tracks `.value` mutations in the watchers below;
		// `provide()` returns the same references so descendant injects
		// observe each update.
		return {
			pageSidebarVisible: { value: true },
			pageSidebarComponent: { value: null },
			// Whether the per-page config modal (edit-mode cog) is open.
			showConfigModal: false,
			// Reactive holder for the loaded object of a `type:"detail"`
			// page. `null` until the async load resolves (and on non-detail
			// pages). Shape when populated:
			// `{ objectData, schema, objectType, objectId, register, store }`.
			// Published via provide() as `cnDetailObjectContext` and read by
			// descendant CnWidgetGrid instances, which merge it into each
			// body/sidebar widget's props so `data` / `metadata` /
			// `file-manager` widgets receive the object with no per-widget
			// manifest props.
			detailObjectContext: { value: null },
			// The `type:"export"` action currently shown in the shared
			// CnMassExportDialog export launcher (null = dialog closed). Set
			// by the `openExport` bound into the cnDispatchAction context.
			exportAction: null,
		}
	},

	computed: {
		/**
		 * Whether the body slot should be editable (ADR-041). Unwraps the
		 * injected `cnEditingBody`, which CnAppRoot provides as a raw ref.
		 *
		 * @return {boolean}
		 */
		bodyEditable() {
			const e = this.cnEditingBody
			return Boolean(e && typeof e === 'object' && 'value' in e ? e.value : e)
		},
		/**
		 * Convenience accessor on the reactive holder so the template
		 * `v-bind:class` reads a primitive boolean. Vue 2 templates
		 * unwrap `data` references but not arbitrary `{value}`
		 * holders, so this stays explicit.
		 */
		pageSidebarVisibleValue() {
			return this.pageSidebarVisible.value !== false
		},
		/**
		 * Entity options for the export launcher, from the active export
		 * action's `entities[]` (empty hides the picker).
		 *
		 * @return {Array<{id: string, label: string}>}
		 */
		exportDialogEntities() {
			const entities = this.exportAction && this.exportAction.entities
			if (!Array.isArray(entities)) return []
			return entities
				.map((e) => (typeof e === 'string' ? { id: e, label: e } : e))
				.filter((e) => e && e.id)
		},
		/**
		 * Format options for the export launcher, from the active export
		 * action's `formats[]` (bare ids are lifted to `{id, label}`).
		 * `undefined` when the action declares none, so the dialog's
		 * built-in Excel/CSV defaults apply.
		 *
		 * @return {Array<{id: string, label: string}>|undefined}
		 */
		exportDialogFormats() {
			const formats = this.exportAction && this.exportAction.formats
			if (!Array.isArray(formats) || formats.length === 0) return undefined
			return formats
				.map((f) => (typeof f === 'string' ? { id: f, label: f.toUpperCase() } : f))
				.filter((f) => f && f.id)
		},
		/** Effective manifest: explicit prop wins over injected value. */
		effectiveManifest() {
			return this.manifest ?? this.cnManifest
		},
		/**
		 * True when the effective manifest is a v2 manifest.
		 * Detected by `manifest.$schema` containing `app-manifest-v2`.
		 *
		 * @return {boolean}
		 */
		isV2Manifest() {
			const schema = this.effectiveManifest?.$schema
			return typeof schema === 'string' && schema.includes('app-manifest-v2')
		},
		/**
		 * Groups the current page's `widgets[]` by slot value into a
		 * `Map<string, WidgetEntry[]>`. Entries with unrecognised slot
		 * patterns emit `console.warn` and are excluded.
		 *
		 * @return {Map<string, Array>}
		 */
		widgetsBySlot() {
			const page = this.currentPage
			const map = new Map()
			if (!page || !Array.isArray(page.widgets)) return map

			for (const widget of page.widgets) {
				const slot = widget?.slot
				if (!slot || !isKnownSlot(slot)) {
					// eslint-disable-next-line no-console
					console.warn(
						`[CnPageRenderer] Widget "${widget?.widgetKey}" in page "${page.id}" has unrecognised slot "${slot}". Skipping.`,
					)
					continue
				}
				if (!map.has(slot)) {
					map.set(slot, [])
				}
				map.get(slot).push(widget)
			}

			return map
		},
		/**
		 * Dynamic slot keys from widgetsBySlot that are not fixed known
		 * slot names (i.e. `tab:*` and `section:*` patterns).
		 *
		 * @return {string[]}
		 */
		dynamicSlotKeys() {
			const FIXED_SLOTS = ['body', 'sidebar', 'header-actions', 'footer', 'modal']
			const result = []
			for (const key of this.widgetsBySlot.keys()) {
				if (!FIXED_SLOTS.includes(key)) {
					result.push(key)
				}
			}
			return result
		},
		/**
		 * Proxy for the cnOpenModal inject so the provide() closure can
		 * reference `this._cnOpenModal` without binding issues.
		 *
		 * @return {Function|null}
		 */
		_cnOpenModal() {
			return typeof this.cnOpenModal === 'function' ? this.cnOpenModal : null
		},
		/** Effective custom-component registry. */
		effectiveCustomComponents() {
			return this.customComponents ?? this.cnCustomComponents ?? {}
		},
		/**
		 * Effective v2 component registry. Provided by CnAppRoot via the
		 * `registry` prop (kind-tagged entries: `widget`, `modal`, `page`,
		 * `form-field`, `cell-renderer`). Empty when consumers haven't
		 * migrated off the legacy `customComponents` prop yet. ADR-036.
		 *
		 * @return {object}
		 */
		effectiveRegistry() {
			return this.cnRegistry ?? {}
		},
		/**
		 * Effective page-type registry. Prop wins over inject; both
		 * fall back to the library's `defaultPageTypes`. Apps that want
		 * the library defaults plus extras typically construct the prop
		 * value as `{ ...defaultPageTypes, ...myExtras }`.
		 */
		effectivePageTypes() {
			return this.pageTypes ?? this.cnPageTypes ?? defaultPageTypes
		},
		/** Page definition matching the current route name, or null. */
		currentPage() {
			const routeName = this.$route?.name
			if (!routeName) {
				return null
			}
			return this.pageById.get(routeName) ?? null
		},
		/**
		 * `Map<pageId, page>` built once per manifest identity (Vue caches this
		 * computed until `effectiveManifest` changes), replacing per-recompute
		 * linear `pages.find()` — O(n) per navigation on large manifests
		 * (shillinq ships 223 pages). 2026-07-06 audit item 10.
		 */
		pageById() {
			const pages = this.effectiveManifest?.pages
			const index = new Map()
			if (Array.isArray(pages)) {
				for (const page of pages) {
					if (page && typeof page.id === 'string' && !index.has(page.id)) {
						index.set(page.id, page)
					}
				}
			}
			return index
		},
		/**
		 * `Map<"register schema", detailPage>` — the first detail page bound to
		 * each register+schema pair. Backs the index→detail row-click wiring
		 * without re-scanning all pages per index page and per row click.
		 * Memoized on `effectiveManifest`.
		 */
		detailPageByRegisterSchema() {
			const pages = this.effectiveManifest?.pages
			const index = new Map()
			if (Array.isArray(pages)) {
				for (const page of pages) {
					if (!page || page.type !== 'detail') continue
					const cfg = page.config || {}
					const key = `${cfg.register} ${cfg.schema}`
					if (!index.has(key)) index.set(key, page)
				}
			}
			return index
		},
		/**
		 * Remount key for the dispatched page component. Includes the data source
		 * (register + schema) so changing it in the page-config modal remounts the
		 * page: the self-fetch composable binds its object type + schema once at
		 * setup, so without a remount a data-source change would leave the old
		 * columns, create/edit form, and "Add" label in place.
		 *
		 * @return {string} A key of `id:register:schema`.
		 */
		pageRenderKey() {
			const page = this.currentPage
			if (!page) return 'none'
			const cfg = (page.config && typeof page.config === 'object' && !Array.isArray(page.config)) ? page.config : {}
			return [page.id, cfg.register || '', cfg.schema || ''].join(':')
		},
		/**
		 * Component to render for the current page. Looked up in
		 * `effectivePageTypes` for built-in / library / consumer-extended
		 * types; resolved against `effectiveCustomComponents` for
		 * `type: "custom"` pages.
		 *
		 * Async loading is the responsibility of whoever populated the
		 * `pageTypes` map (the library wraps each entry in
		 * `defineAsyncComponent`); the renderer treats any value in the
		 * map as a Vue component.
		 */
		/**
		 * Whether the current page renders any body content — a dispatched page
		 * component (index/detail/dashboard/custom-with-component) or a v2 `body`
		 * widget slot. False for a freshly-created custom page with no component
		 * and no widgets, which drives the builder empty-state (ADR-041) so the
		 * page still exposes the "Edit with Buildiq" affordance.
		 *
		 * @return {boolean}
		 */
		hasRenderableBody() {
			if (this.resolvedComponent) return true
			if (this.isV2Manifest && this.widgetsBySlot && this.widgetsBySlot.has('body')) return true
			return false
		},
		resolvedComponent() {
			const page = this.currentPage
			if (!page) {
				return null
			}
			if (page.type === 'custom') {
				// Two authoring styles for a custom page body:
				//   1. `page.component` — a single registry component name.
				//   2. `page.slots.main` — the body component referenced via
				//      the generic slot map (same field used for header /
				//      actions / sidebar overrides). When `component` is
				//      absent we treat the `main` slot entry as the page body
				//      so a custom page authored purely with `slots` still
				//      renders. The remaining slot entries continue to mount
				//      as named slots inside it via `resolvedSlotEntries`.
				const name = page.component || page.slots?.main
				const resolved = this.resolveCustomComponent(name, 'page')
				if (!resolved) {
					// eslint-disable-next-line no-console
					console.warn(
						`[CnPageRenderer] Custom component "${name}" not found in registry for page id "${page.id}".`,
					)
					return null
				}
				return resolved
			}
			const component = this.effectivePageTypes[page.type]
			if (!component) {
				// eslint-disable-next-line no-console
				console.warn(
					`[CnPageRenderer] Unknown page type "${page.type}" for page id "${page.id}". Add it to the pageTypes registry (e.g. via the pageTypes prop on CnAppRoot or CnPageRenderer).`,
				)
				return null
			}
			return component
		},
		/**
		 * Props forwarded to the dispatched page component. Merges:
		 *
		 *   1. The page's static `config` object — manifest-authored data
		 *      shared across every visit to this route.
		 *   2. The router's `$route.params` — dynamic placeholders captured
		 *      from the URL (e.g. `/meetings/:id/live` → `{ id: '...' }`).
		 *      Without this merge, children that declare a route-derived
		 *      prop (`props: { id: { type: String, required: true } }`)
		 *      receive `undefined` even when the URL clearly contains the
		 *      value, because the generated route definition's `props: true`
		 *      only binds params to `CnPageRenderer` itself, not the
		 *      dispatched child component. Params take precedence over
		 *      `config` collisions so URL truth wins; config keeps acting
		 *      as a default-overrides layer.
		 *
		 * Per-type prop validation lives on the target components.
		 */
		resolvedProps() {
			const page = this.currentPage
			// Normalise to a plain object: an empty `config: {}` round-trips
			// through PHP/JSON as `[]`, and spreading an array would silently
			// contribute no config keys (register/schema/columns) to the page.
			const rawConfig = (page?.config && typeof page.config === 'object' && !Array.isArray(page.config)) ? page.config : {}
			// Clone params — `resolvedProps` MAY add normalised aliases
			// (e.g. `objectId` for type='detail') and we must not mutate
			// the live `$route.params` object.
			const params = { ...(this.$route?.params ?? {}) }
			// `manifest-route-param-sentinel`: substitute every
			// `@route.<param>` string in the config subtree with the
			// matching `$route.params.<param>` value before any other
			// merge. Unresolved sentinels become null (with a one-shot
			// console.warn per pageId+sentinel).
			const pageId = page?.id ?? '<unknown>'
			const config = resolveRouteSentinels(rawConfig, params, pageId)
			// Schema v2 lifts a uniform set of page-level fields out of
			// `config` so every page type can declare them without
			// per-type schema branches. Forward those to the dispatched
			// component so they reach typed props (e.g.
			// CnDetailPage.title, CnDetailPage.widgets). Listed
			// explicitly to keep the prop surface minimal — schema
			// fields not in this list stay private to the renderer.
			const topLevel = {}
			for (const key of ['title', 'description', 'icon', 'widgets', 'actions', 'sidebar']) {
				if (page && page[key] !== undefined) {
					topLevel[key] = page[key]
				}
			}
			// type:"custom" dispatches an app-authored component that usually
			// declares NONE of the lifted fields as props. Vue's attribute
			// fallthrough would then paint them onto the component's root
			// element as plain HTML attributes — `title="Vault"` becomes a
			// browser tooltip hovering over the ENTIRE page, and icon/widgets
			// turn into junk markup. Forward a lifted field to a custom
			// component only when its definition actually declares the prop.
			if (page?.type === 'custom') {
				// A defineAsyncComponent wrapper exposes no `props` until its
				// loader resolves — unwrap the resolved definition when
				// available so a lazily-registered custom page still receives
				// its declared lifted fields. Before resolution the fields
				// are withheld, which is the safe default here: withheld
				// means no stray root attributes, and the async component
				// renders nothing yet anyway.
				const resolved = this.resolvedComponent
				const declared = (resolved?.__asyncResolved ?? resolved)?.props
				const declares = (key) => (Array.isArray(declared)
					? declared.includes(key)
					: Boolean(declared && key in declared))
				for (const key of Object.keys(topLevel)) {
					if (!declares(key)) {
						delete topLevel[key]
					}
				}
			}
			// NOTE on ADR-036 page-level `widgets[]`: it is NOT translated into
			// the typed component's `widgets` + `layout` props here.
			//
			// An earlier cut of this fix did exactly that, and the suite caught
			// why it is wrong: body widgets on the widget-grid path are fed
			// their object context by the live-context HOLDER
			// (`detailObjectContext`, #222) — subscription, re-render on store
			// cache updates, re-scoping when the route object changes. Handing
			// the widgets to the typed component instead silently dropped all
			// of that; `CnPageRendererV2DetailLiveContext` went red on the
			// widget rendering "none" where the holder had been supplying the
			// object.
			//
			// So the widgets keep being rendered by CnWidgetGrid, with the
			// holder intact. The typed component supplies only what was
			// actually missing — its chrome — by hosting the grid in its
			// default slot (see the template).
			// `config.actionToggles` is a typed object sugaring the nine
			// show*/selectable toggles on type='index' pages. Flatten
			// each key into the top-level config namespace UNDER any
			// explicit config.<key> (so explicit wins). Strip the
			// container before forwarding — CnIndexPage has no
			// `actionToggles` prop.
			const isIndex = page?.type === 'index'
			// When an index page has somewhere to open a row, make a row click
			// go there: set `rowClickToView` so the row body emits `row-click`
			// (→ onRowOpen navigates) even though the page is selectable.
			// Selection stays available via the checkbox. An explicit
			// `config.rowClickToView` still wins (merged below).
			//
			// Two ways to have somewhere to open:
			//   1. `config.rowRoute` — an explicit route/page NAME. Needed
			//      whenever the row's detail surface is NOT a `type:"detail"`
			//      page: a `type:"custom"` authoring canvas, a form page, a
			//      page in another register. Without this the key parsed,
			//      validated and did nothing, so a manifest that authored it
			//      shipped an index whose rows were simply dead on click
			//      (observed on hermiq GraphIndex → GraphDetail).
			//   2. A matching `type:"detail"` page (same register + schema).
			if (isIndex) {
				const hasRowRoute = typeof config.rowRoute === 'string' && config.rowRoute !== ''
				const hasDetail = this.detailPageByRegisterSchema.has(`${config.register} ${config.schema}`)
				if (hasRowRoute || hasDetail) {
					topLevel.rowClickToView = true
					// Same signal, second consequence: a record with a detail page
					// is edited THERE, not in a modal launched from the table. The
					// modal renders the schema's flat scalars only, so on a record
					// that composes anything — a case type's statuses, results,
					// roles and properties — it is not merely a duplicate surface
					// but one that cannot express the record. An explicit
					// `config.editOpensDetail` still wins (merged below).
					topLevel.editOpensDetail = true
				}
			}
			let normalizedConfig = config
			if (isIndex && config.actionToggles && typeof config.actionToggles === 'object' && !Array.isArray(config.actionToggles)) {
				const { actionToggles, ...rest } = config
				normalizedConfig = { ...actionToggles, ...rest }
			}
			// Type='detail' object-context mapping. The manifest declares
			// `config.schema` and `:id` route param; CnDetailPage's
			// sidebar gating needs `objectType` + `objectId` props (see
			// CnDetailPage.syncSidebarState — `objectSidebarState.active`
			// stays false without them, so the host's mounted
			// CnObjectSidebar never renders). Bridge the names here so
			// every consumer doesn't have to duplicate the alias in its
			// own customComponents wrapper. Only fills when the typed
			// prop is unset, so `config.objectType` or
			// `params.objectId` still wins.
			const isDetail = page?.type === 'detail'
			if (isDetail) {
				// The other half of the index rule above: a schema-bound detail
				// page gets its own Edit affordance. Set unconditionally for
				// schema-bound detail pages — the index stops offering the modal
				// for exactly this set of pages, so a detail page that did not
				// gain the button would leave its records with no edit surface at
				// all. `config.showEditAction` still wins (merged below).
				if (typeof normalizedConfig.schema === 'string' && normalizedConfig.schema.length > 0) {
					topLevel.showEditAction = true
				}
				if (normalizedConfig.objectType === undefined && typeof normalizedConfig.schema === 'string' && normalizedConfig.schema.length > 0) {
					normalizedConfig = { ...normalizedConfig, objectType: normalizedConfig.schema }
				}
				if (params.objectId === undefined && typeof params.id === 'string' && params.id.length > 0) {
					params.objectId = params.id
				}
			}
			// `config.readOnly:true` shorthand on type='index' (REQ-MIPFU-4):
			// expand to the nine read-only flags MERGED UNDER `config.*`
			// so explicit `config.showAdd:true` still wins. Strip the
			// `readOnly` key before forwarding — CnIndexPage has no
			// `readOnly` prop.
			if (isIndex && normalizedConfig.readOnly === true) {
				const { readOnly, ...rest } = normalizedConfig
				return { ...topLevel, ...READ_ONLY_DEFAULTS, ...rest, ...params }
			}
			// `config.createOverride` can be declared in the JSON manifest as a
			// STRING naming an async create handler the consumer registered in
			// its customComponents registry (functions are valid registry
			// values). Resolve it to the function so CnIndexPage's per-schema
			// create-override hook fires from a purely declarative page. A
			// non-string value (an actual function passed programmatically) is
			// left untouched. Unresolved names are dropped with a one-shot warn.
			if (isIndex && typeof normalizedConfig.createOverride === 'string') {
				const name = normalizedConfig.createOverride
				const fn = this.resolveCreateOverride(name)
				const { createOverride, ...rest } = normalizedConfig
				if (typeof fn === 'function') {
					normalizedConfig = { ...rest, createOverride: fn }
				} else {
					console.warn(`[CnPageRenderer] config.createOverride "${name}" did not resolve to a registered function; dropping it.`)
					normalizedConfig = rest
				}
			}
			// Precedence (highest wins): route params > config > top-level
			// page fields. URL truth trumps everything; config trumps
			// top-level so per-route config still beats the page default.
			return { ...topLevel, ...normalizedConfig, ...params }
		},
		/**
		 * Resolved `{ register, schema, objectId, slug }` for a
		 * `type:"detail"` page, or `null` for any other page (or when the
		 * triple is incomplete). `objectId` comes from the resolved
		 * `config.idParam` (a `@route.*` sentinel like `"@route.id"`),
		 * falling back to `config.objectId`, the `:objectId` route param,
		 * then the `:id` route param. `slug` is the `${register}-${schema}`
		 * object-type key registered in the store (matches the convention
		 * used by `autoRegisterCustomTypes` and CnIndexPage self-fetch).
		 *
		 * Drives `loadDetailObject` (watched below). Kept separate from
		 * `resolvedProps` so the (potentially async) object load only runs
		 * for detail pages and only re-runs when the triple changes.
		 *
		 * @return {{register: string, schema: string, objectId: string, slug: string}|null}
		 */
		detailLoadContext() {
			const page = this.currentPage
			if (!page || page.type !== 'detail') {
				return null
			}
			const params = { ...(this.$route?.params ?? {}) }
			const config = resolveRouteSentinels(page.config ?? {}, params, page.id ?? '<unknown>')
			const register = config.register
			const schema = config.schema
			const objectId = config.idParam || config.objectId || params.objectId || params.id
			if (typeof register !== 'string' || register.length === 0
				|| typeof schema !== 'string' || schema.length === 0
				|| typeof objectId !== 'string' || objectId.length === 0) {
				return null
			}
			return { register, schema, objectId, slug: `${register}-${schema}` }
		},
		/**
		 * Combined slot-override map for the dispatched page component.
		 * Sources:
		 *   1. `page.slots` — generic { slotName: registryName } map.
		 *   2. `page.headerComponent` — sugar for `slots.header`.
		 *   3. `page.actionsComponent` — sugar for `slots.actions`.
		 *
		 * Sugar fields take precedence when both are set so that the
		 * legacy fields remain meaningful in mixed manifests. Returned
		 * as an array of `{ name, component }` entries to make the
		 * `<template v-for>` + dynamic-slot-name pattern work in Vue 2.
		 */
		resolvedSlotEntries() {
			const page = this.currentPage
			if (!page) return []
			const map = { ...(page.slots ?? {}) }
			// For a custom page that has no explicit `component`, `slots.main`
			// is promoted to the page BODY by `resolvedComponent`, so drop it
			// here — otherwise it would also try to mount as a (non-existent)
			// `main` named slot inside itself.
			if (page.type === 'custom' && !page.component && map.main) {
				delete map.main
			}
			if (page.headerComponent) map.header = page.headerComponent
			if (page.actionsComponent) map.actions = page.actionsComponent
			const entries = []
			for (const [name, registryName] of Object.entries(map)) {
				const component = this.resolveRegistryName(registryName, name)
				if (component) entries.push({ name, component })
			}
			return entries
		},
		/**
		 * Per-page sidebar visibility flag derived from the page
		 * entry's top-level `sidebar.show` field (sibling of `config`).
		 * Defaults to `true` when unset. Watched below to push the
		 * value into the reactive `pageSidebarVisible` holder shared
		 * via provide/inject with `CnAppRoot`.
		 */
		currentPageSidebarVisible() {
			const page = this.currentPage
			if (!page || !page.sidebar || typeof page.sidebar !== 'object') {
				return true
			}
			return page.sidebar.show !== false
		},
		/**
		 * Per-page sidebar component derived from the page entry's
		 * top-level `sidebarComponent` field (sibling of `config`).
		 * The string is resolved against the effective
		 * `customComponents` registry — same registry as
		 * `headerComponent`, `actionsComponent`, `cardComponent`, and
		 * `slots.*`. Returns `null` when the field is unset, the
		 * registry name is missing, or resolution fails (a
		 * `console.warn` is logged in the missing-name case so
		 * manifest authors notice misconfiguration). Watched below to
		 * push the value into the reactive `pageSidebarComponent`
		 * holder shared via provide/inject with `CnAppRoot`.
		 *
		 * @return {object|null} The resolved Vue component, or null.
		 */
		currentPageSidebarComponent() {
			const page = this.currentPage
			if (!page || typeof page.sidebarComponent !== 'string' || page.sidebarComponent.length === 0) {
				return null
			}
			const name = page.sidebarComponent
			const resolved = this.resolveCustomComponent(name, 'page')
			if (!resolved) {
				// eslint-disable-next-line no-console
				console.warn(
					`[CnPageRenderer] Sidebar component "${name}" referenced by page id "${page.id}" not found in registry or customComponents.`,
				)
				return null
			}
			return resolved
		},
		/**
		 * @deprecated Use `resolvedSlotEntries` for general slot
		 * resolution. Retained for compatibility with code that read the
		 * computed directly.
		 */
		headerOverride() {
			return this.resolvedSlotEntries.find((e) => e.name === 'header')?.component ?? null
		},
		/**
		 * @deprecated See `headerOverride`.
		 */
		actionsOverride() {
			return this.resolvedSlotEntries.find((e) => e.name === 'actions')?.component ?? null
		},
	},

	watch: {
		/**
		 * Auto-register object types for `type:"custom"` pages whose
		 * manifest config declares `register` + `schema` (single type)
		 * and/or `types: [{ name, register, schema }, ...]` (multi-type).
		 *
		 * For `type:"index"` and `type:"detail"` pages, the underlying
		 * CnIndexPage / CnDetailPage components self-register when
		 * mounted with `register` + `schema` props — so the renderer
		 * does nothing extra for those. Custom components have no such
		 * guarantee: they are bespoke per-app Vue components and would
		 * each have to remember to call `registerObjectType` in their
		 * own `mounted()` hook. Mirroring index/detail's zero-config
		 * behaviour for the manifest-driven custom case (declared
		 * `register` + `schema`) keeps the manifest the single source
		 * of truth and removes a per-component landmine.
		 *
		 * Runs `immediate: true` so first mount registers before the
		 * custom component's mounted() hook fires; re-runs on route
		 * change in case the same CnPageRenderer instance is reused
		 * for a different `type:"custom"` page.
		 *
		 * Defensive: every step is wrapped — a Pinia-not-installed
		 * test harness, a missing store method, or a thrown error
		 * inside `registerObjectType` all degrade to a single
		 * `console.warn` so the page still mounts.
		 *
		 * See issue ConductionNL/nextcloud-vue#341.
		 */
		currentPage: {
			immediate: true,
			handler() {
				this.autoRegisterCustomTypes()
			},
		},
		currentPageSidebarVisible: {
			immediate: true,
			handler(visible) {
				// Mutate the shared holder's `.value` so descendant
				// injects (notably CnAppRoot) re-render the slot gate.
				this.pageSidebarVisible.value = visible
				// When BOTH visibility is off AND a sidebar component
				// was declared, the sidebarComponent is dead config.
				// Log once at watcher flush time so manifest authors
				// notice the misconfiguration. Visibility wins — the
				// component holder still carries the resolved value
				// for downstream consumers that inspect it directly.
				if (visible === false && this.currentPage?.sidebarComponent) {
					// eslint-disable-next-line no-console
					console.warn(
						`[CnPageRenderer] Page id "${this.currentPage.id}" declares both sidebar.show: false and sidebarComponent "${this.currentPage.sidebarComponent}". Visibility wins; the sidebarComponent will not render.`,
					)
				}
			},
		},
		currentPageSidebarComponent: {
			immediate: true,
			handler(component) {
				// Mutate the shared holder's `.value` so descendant
				// injects (notably CnAppRoot) re-render the slot
				// default content with the resolved component.
				this.pageSidebarComponent.value = component
			},
		},
		/**
		 * Load (and reload on change) the object backing a `type:"detail"`
		 * page so its body/sidebar widgets can render it. Runs
		 * `immediate: true` so the first paint kicks the fetch; re-runs
		 * whenever the register/schema/objectId triple changes (e.g.
		 * navigating between two detail routes on the same renderer).
		 * Clears the context on non-detail pages.
		 */
		detailLoadContext: {
			immediate: true,
			deep: true,
			handler() {
				this.loadDetailObject()
			},
		},
	},

	created() {
		// Surface the page id in Vue devtools and stack traces. The base
		// component name `CnPageRenderer` becomes `CnPageRenderer:<id>`
		// for the lifetime of this instance.
		if (this.currentPage) {
			this.$options.name = `CnPageRenderer:${this.currentPage.id}`
		} else if (this.$route) {
			// Router is present but no page matches — warn so developers notice misconfigured routes.
			// eslint-disable-next-line no-console
			console.warn(
				`[CnPageRenderer] No page found for $route.name = "${this.$route.name}". The renderer will mount nothing.`,
			)
		}
	},

	methods: {
		/**
		 * Resolve a UI string through the consumer's translate function
		 * (`translate` prop, else injected `cnTranslate`), falling back to the
		 * English source key. Used for the builder empty-state copy.
		 *
		 * @param {string} key The English source string.
		 * @return {string} The translated (or source) string.
		 */
		tr(key) {
			const fn = this.translate || this.cnTranslate
			return typeof fn === 'function' ? fn(key) : key
		},

		/**
		 * Route the export launcher's confirm payload (`{ format, entity? }`)
		 * to the export action's `handler` (resolved against the manifest
		 * actions map — the same registry `type:"handler"` actions use). The
		 * handler does the actual download (e.g. an app's ExportService) and
		 * its resolved/rejected promise drives the dialog's result phase. A
		 * missing handler surfaces as a dialog error (never a silent success).
		 *
		 * @param {{format: string, entity?: string}} payload The dialog's confirm payload.
		 * @return {Promise<void>}
		 */
		async onExportConfirm(payload) {
			const action = this.exportAction
			const dialog = this.$refs.exportDialog
			const setResult = (result) => {
				if (dialog && typeof dialog.setResult === 'function') dialog.setResult(result)
			}
			const handlers = this.effectiveManifest?.actions ?? {}
			const fn = action && action.handler && handlers[action.handler]
			if (typeof fn !== 'function') {
				// eslint-disable-next-line no-console
				console.warn(`[CnPageRenderer] export action "${action && action.id}" has no resolvable handler "${action && action.handler}" in the manifest actions map.`)
				setResult({ error: t('nextcloud-vue', 'No export handler is configured') })
				return
			}
			try {
				await fn(payload, action)
				setResult({ success: true })
			} catch (e) {
				setResult({ error: (e && e.message) || t('nextcloud-vue', 'Export failed') })
			}
		},

		/**
		 * Open a row's detail page. Bound to an index page's `@view` (the
		 * built-in eye action) and `@row-click`, this is what makes "View"
		 * navigate for manifest-driven index pages — `CnIndexPage` only emits
		 * the event, so without this the action is a no-op. Resolves the
		 * matching `type: 'detail'` page (same `register` + `schema` as the
		 * current index page) and pushes to it with the row's id as the `:id`
		 * route param (CnPageRenderer maps `params.id` → `objectId`). No-ops
		 * when there is no detail page, no router, or no resolvable id.
		 *
		 * @param {object} row The clicked / viewed row object.
		 * @return {void}
		 */
		onRowOpen(row) {
			const page = this.currentPage
			const router = this.$router
			if (!page || page.type !== 'index' || !router || !row || typeof row !== 'object') {
				return
			}
			const cfg = page.config || {}
			// `config.rowRoute` names the target explicitly and WINS: it is the
			// only way to reach a detail surface that is not a `type:"detail"`
			// page (an authoring canvas, a form page), and an author who named
			// a route meant that route.
			const rowRoute = (typeof cfg.rowRoute === 'string' && cfg.rowRoute !== '') ? cfg.rowRoute : null
			const detail = this.detailPageByRegisterSchema.get(`${cfg.register} ${cfg.schema}`)
			const target = rowRoute ?? detail?.id ?? null
			if (!target) return
			const self = row['@self'] || {}
			const id = row.id ?? self.id ?? self.uuid ?? row.uuid
			if (id === undefined || id === null || id === '') return
			// A name the router does not have makes every row click a no-op that
			// looks exactly like a broken table, so name the mistake instead of
			// letting push() reject into a silent catch. Feature-detected: only
			// some router versions can be asked.
			if (this.routeNameIsKnown(target) === false) {
				// eslint-disable-next-line no-console
				console.warn(`[CnPageRenderer] Index page "${page.id}" opens rows on route "${target}", which the router does not have. Row clicks will do nothing.`)
				return
			}
			router.push({ name: target, params: { id: String(id) } }).catch(() => {})
		},

		/**
		 * Whether the router has a route by this name.
		 *
		 * Returns `true` when the router cannot be asked (an older router, or a
		 * test double), so an unanswerable question never blocks navigation.
		 *
		 * @param {string} name The route name.
		 * @return {boolean} False only when the router positively lacks it.
		 */
		routeNameIsKnown(name) {
			const router = this.$router
			if (!router) return false
			if (typeof router.hasRoute === 'function') {
				return router.hasRoute(name)
			}
			if (typeof router.getRoutes === 'function') {
				const routes = router.getRoutes() || []
				return routes.some((route) => route && route.name === name)
			}
			return true
		},

		/**
		 * Resolve a custom-component reference (page.component,
		 * page.headerComponent, page.actionsComponent, page.sidebarComponent,
		 * slot overrides, etc.) by name. Source precedence (ADR-036):
		 *
		 *   1. The v2 `registry` prop. When `requireKind` is set, only entries
		 *      with a matching `kind` field are considered; otherwise any
		 *      entry whose `component` is set wins. Each entry's `component`
		 *      field is the Vue component to render.
		 *   2. Legacy `customComponents` map (`{ name: Component }`). Used
		 *      until consumers complete the registry migration.
		 *
		 * Returns `null` when neither source has the name.
		 *
		 * @param {string} name The component name referenced by the manifest.
		 * @param {string|null} [requireKind] Optional kind discriminator —
		 *   `'page'` for page dispatch (page.component, page.sidebarComponent).
		 *   Omit for slot/actions/section/header lookups where any kind with
		 *   a `component` field is acceptable (widget, modal, form-field,
		 *   cell-renderer, custom kinds…).
		 *
		 * @return {object|null} The resolved Vue component, or null.
		 */
		resolveCustomComponent(name, requireKind = null) {
			if (typeof name !== 'string' || name === '') {
				return null
			}

			const registryEntry = this.effectiveRegistry[name]
			if (registryEntry !== undefined
				&& registryEntry !== null
				&& registryEntry.component
				&& (requireKind === null || registryEntry.kind === requireKind)
			) {
				return registryEntry.component
			}

			const legacy = this.effectiveCustomComponents[name]
			if (legacy) {
				return legacy
			}

			return null
		},

		/**
		 * Resolve a named create-override handler for CnIndexPage's
		 * `createOverride` prop (see `resolvedProps`). Unlike components, a
		 * create-override is a plain async function, so it is looked up across
		 * both registries by value shape:
		 *   1. v2 registry (`cnRegistry`) — a `kind:'create-override'` entry
		 *      exposing the function as `.handler` (or `.fn`), or a directly
		 *      function-valued entry.
		 *   2. legacy customComponents — a function-valued entry.
		 *
		 * @param {string} name The registered handler name from `config.createOverride`.
		 * @return {?Function} The async create handler, or null if unresolved.
		 */
		resolveCreateOverride(name) {
			if (typeof name !== 'string' || name === '') {
				return null
			}
			const entry = this.effectiveRegistry[name]
			if (typeof entry === 'function') {
				return entry
			}
			if (entry && typeof entry === 'object') {
				if (typeof entry.handler === 'function') return entry.handler
				if (typeof entry.fn === 'function') return entry.fn
			}
			const legacy = this.effectiveCustomComponents[name]
			return typeof legacy === 'function' ? legacy : null
		},

		/**
		 * Load the object + schema backing a `type:"detail"` page and
		 * publish them on the reactive `detailObjectContext` holder so
		 * descendant CnWidgetGrid instances can feed `objectData` /
		 * `schema` / `objectType` to the body/sidebar widgets.
		 *
		 * Steps (all defensive — a Pinia-less test harness, a missing
		 * store method, or a failed fetch each degrade to leaving the
		 * context null, so the page still mounts):
		 *   1. Resolve `detailLoadContext` (null → clear + return).
		 *   2. Register the `${register}-${schema}` object type (idempotent).
		 *   3. Publish `{ objectData, schema, objectType, objectId,
		 *      register, store }` — with `objectData` / `schema` as
		 *      READ-THROUGH getters over the store cache (see below).
		 *   4. Re-scope the live `or-object-{id}` subscription (see setup()).
		 *   5. Fetch schema + object in parallel to warm the cache.
		 *
		 * Read-through holder (#222): `objectData` and `schema` are
		 * accessors over `store.objects[slug][id]` / `store.schemas[slug]`
		 * rather than stashed copies, so when the live-updates plugin's
		 * event-driven refetch replaces the cache entry, every consumer
		 * reading the holder during render (CnWidgetGrid's
		 * `detailContextProps`, `resolveObjectTokenContext` callers)
		 * re-renders with the fresh object — the holder never freezes a
		 * snapshot. The external contract is unchanged: same keys, same
		 * `{ value }` holder shape. Vue's observer preserves the accessors
		 * and makes top-level writes to `objectData` / `schema` silent
		 * no-ops (accessor without setter), so a consumer cannot clobber
		 * the live view; all shipped widgets copy before mutating.
		 *
		 * The holder is published before the fetches so widgets that only
		 * need objectId / register (e.g. file-manager) render without
		 * waiting for the object body; the getters go non-null the moment
		 * the fetches populate the cache — no re-publish needed.
		 */
		async loadDetailObject() {
			const ctx = this.detailLoadContext
			if (!ctx) {
				// Not a detail page (or incomplete triple): clear the holder
				// and close the live-subscription gate — the composable in
				// setup() releases any held subscription when it sees the
				// scope go invalid (the renderer persists across routes).
				this.liveSubEnabled = false
				this.liveSubType = ''
				this.liveSubId = ''
				this.detailObjectContext.value = null
				return
			}

			let store = null
			try {
				store = useObjectStore()
			} catch (err) {
				// Pinia not installed (unit tests). Publish the ids so
				// id-only widgets still work; skip the object fetch and
				// leave the live subscription disabled.
				this.liveSubEnabled = false
				this.detailObjectContext.value = {
					objectData: null,
					schema: null,
					objectType: ctx.slug,
					objectId: ctx.objectId,
					register: ctx.register,
					store: null,
				}
				return
			}

			// Register the object type (idempotent — registerObjectType
			// replaces the entry each call). Must precede the subscription
			// re-scope below: the plugin's subscribe() rejects unregistered
			// types.
			try {
				if (typeof store.registerObjectType === 'function') {
					store.registerObjectType(ctx.slug, ctx.schema, ctx.register)
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.warn(`[CnPageRenderer] Failed to register object type "${ctx.slug}" for detail page "${this.currentPage?.id}":`, err)
			}

			// Publish the read-through holder (see method docblock). The ids
			// are available immediately; the getters resolve once the cache
			// fills.
			this.detailObjectContext.value = {
				get objectData() {
					return store.getObject?.(ctx.slug, ctx.objectId) ?? null
				},
				// Explicit no-op setters keep a consumer's stray write harmless.
				// Under Vue 2 the getter-only accessor was enough: `defineReactive`
				// replaced each property with its own get/set pair that delegated
				// reads to the original getter, so an assignment was swallowed.
				// Vue 3 leaves the accessor on the target and its `set` trap
				// forwards to `Reflect.set`, which returns false for a
				// setter-less accessor — and a `set` trap returning false throws
				// `TypeError: 'set' on proxy: trap returned falsish` in strict
				// mode. That would turn a benign mistake in a consumer app into a
				// crash, so the swallow is now written out rather than implied.
				set objectData(_ignored) {},
				get schema() {
					return store.getSchema?.(ctx.slug) ?? null
				},
				set schema(_ignored) {},
				objectType: ctx.slug,
				objectId: ctx.objectId,
				register: ctx.register,
				store,
			}

			// Re-scope the live subscription (see setup()). Gated to the v2
			// widget-grid path — CnWidgetGrid (the holder's only render-time
			// consumer surface) mounts only for v2 manifests with widget
			// entries; the typed CnDetailPage dispatch path manages its own
			// subscription. `config.subscribe: false` opts out, mirroring
			// CnIndexPage / CnDetailPage (manifest-live-updates).
			const subscribeOptOut = this.currentPage?.config?.subscribe === false
			const rendersWidgetGrids = this.isV2Manifest && this.widgetsBySlot.size > 0
			this.liveSubType = ctx.slug
			this.liveSubId = ctx.objectId
			this.liveSubEnabled = !subscribeOptOut && rendersWidgetGrids

			// Warm the cache: fetch schema + object, tolerating either
			// failing. No re-publish afterwards — the holder's getters read
			// the cache these fetches populate, so there is nothing to
			// clobber if the user navigated away mid-fetch either.
			const tasks = []
			if (typeof store.fetchSchema === 'function') {
				tasks.push(store.fetchSchema(ctx.slug).catch(() => null))
			} else {
				tasks.push(Promise.resolve(null))
			}
			if (typeof store.fetchObject === 'function') {
				tasks.push(store.fetchObject(ctx.slug, ctx.objectId).catch(() => null))
			} else {
				tasks.push(Promise.resolve(null))
			}
			await Promise.all(tasks)
		},
		/**
		 * Auto-register object types declared on the current
		 * `type:"custom"` page's `config`. No-op for any other page
		 * type (index/detail self-register inside the page component
		 * itself; dashboard/form/map have no such concept).
		 *
		 * Recognised config shapes:
		 *
		 *   1. Single type — `config.register` + `config.schema` are
		 *      both non-empty strings. Registered under slug
		 *      `${register}-${schema}` to match the convention used by
		 *      CnIndexPage.setup (self-fetch mode) and CnLogsPage.
		 *
		 *   2. Multi-type — `config.types: [{ name, register, schema }]`.
		 *      Each entry is registered under its own `name` slug so a
		 *      single custom page (e.g. a Kanban board with multiple
		 *      object kinds) can hydrate several object types in one
		 *      manifest declaration.
		 *
		 * Both shapes may co-exist; the single-type pair is registered
		 * first, then each `types[]` entry. Entries with missing /
		 * non-string `name` / `register` / `schema` are skipped with a
		 * single warning. All work is wrapped in try/catch so a broken
		 * Pinia setup or a thrown `registerObjectType` never blocks
		 * the page from mounting.
		 */
		autoRegisterCustomTypes() {
			const page = this.currentPage
			if (!page || page.type !== 'custom') return
			const config = page.config
			if (!config || typeof config !== 'object') return

			let store = null
			try {
				store = useObjectStore()
			} catch (err) {
				// Pinia not installed (common in unit tests). Silently
				// skip — the custom component can still register itself
				// at mount time if/when it has its own store.
				return
			}
			if (!store || typeof store.registerObjectType !== 'function') {
				return
			}

			// Single-type shape: config.register + config.schema.
			const reg = config.register
			const schema = config.schema
			const hasSingle = typeof reg === 'string' && reg.length > 0
				&& typeof schema === 'string' && schema.length > 0
			if (hasSingle) {
				const slug = `${reg}-${schema}`
				try {
					store.registerObjectType(slug, schema, reg)
				} catch (err) {
					// eslint-disable-next-line no-console
					console.warn(
						`[CnPageRenderer] Failed to auto-register object type "${slug}" for custom page id "${page.id}":`,
						err,
					)
				}
			} else if (
				(typeof reg === 'string' && reg.length > 0)
				|| (typeof schema === 'string' && schema.length > 0)
			) {
				// One half of the pair is set but not the other —
				// likely a manifest typo. Warn but keep going so
				// types[] (below) still gets a chance.
				// eslint-disable-next-line no-console
				console.warn(
					`[CnPageRenderer] Custom page id "${page.id}" declares only one of config.register / config.schema; auto-registration skipped. Set both (or use config.types[]) to opt in.`,
				)
			}

			// Multi-type shape: config.types: [{ name, register, schema }, ...].
			const types = config.types
			if (Array.isArray(types)) {
				for (const entry of types) {
					if (!entry || typeof entry !== 'object') continue
					const name = entry.name
					const r = entry.register
					const s = entry.schema
					if (
						typeof name !== 'string' || name.length === 0
						|| typeof r !== 'string' || r.length === 0
						|| typeof s !== 'string' || s.length === 0
					) {
						// eslint-disable-next-line no-console
						console.warn(
							`[CnPageRenderer] Skipping invalid entry in config.types on custom page id "${page.id}" — each entry needs non-empty name, register, and schema.`,
						)
						continue
					}
					try {
						store.registerObjectType(name, s, r)
					} catch (err) {
						// eslint-disable-next-line no-console
						console.warn(
							`[CnPageRenderer] Failed to auto-register object type "${name}" for custom page id "${page.id}":`,
							err,
						)
					}
				}
			}
		},
		/**
		 * Resolve a registry component name. Logs a single console.warn
		 * naming the slot if the name is not in the registry.
		 *
		 * @param {string} registryName Name of the component to look up
		 *   in `effectiveCustomComponents`.
		 * @param {string} slotName Slot the component would have filled
		 *   (used only for the warning message).
		 * @return {object|null}
		 */
		resolveRegistryName(registryName, slotName) {
			const resolved = this.resolveCustomComponent(registryName)
			if (!resolved) {
				// eslint-disable-next-line no-console
				console.warn(
					`[CnPageRenderer] Slot-override component "${registryName}" referenced by page id "${this.currentPage.id}" (slot "${slotName}") not found in registry.`,
				)
				return null
			}
			return resolved
		},
	},
}
</script>

<style>
.cn-page-renderer {
	display: contents;
}

/*
 * Toggle-clearance padding lives PER-COMPONENT on each page's HEADER
 * element (CnPageHeader, CnDashboardPage, CnDetailPage,
 * CnFeaturesAndRoadmapView, etc.). Earlier attempts at an abstract
 * fix here — first via `.cn-page-renderer > *` (PR #355, lost to
 * scoped-style specificity + shorthand overrides), then via a
 * `.cn-page-renderer__viewport` wrapper (PR #359, narrowed body
 * content unintentionally) — were rejected in favour of per-header
 * rules so body content keeps its full width.
 *
 * Custom pages MUST add `padding-inline-start: 56px` to their HEADER
 * element to clear the navigation toggle. See `docs/getting-started.md`.
 */

/*
 * Hook class applied when the current page's manifest entry has
 * `sidebar.show: false`. The library does not ship visual rules
 * here — consumer apps with style-driven sidebar layouts (e.g. CSS
 * grid where the host shell sibling sidebar is a grid track) can
 * target this class to collapse / hide the sibling element.
 *
 * The programmatic counterpart is the `cnPageSidebarVisible`
 * inject — `CnAppRoot` reads it to gate `<slot name="sidebar" />`.
 */
.cn-page-renderer--no-sidebar {
	/* intentionally empty — consumer-styled */
}

/* Builder empty-state: keep the edit button top-right (mirrors a page
   header's actions area) above a centred empty prompt. */
.cn-page-renderer__empty {
	padding-inline-start: 56px;
}

.cn-page-renderer__empty-actions {
	display: flex;
	justify-content: flex-end;
	padding: 8px 8px 0;
}
</style>
