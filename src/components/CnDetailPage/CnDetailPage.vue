<!--
  CnDetailPage — Generic detail/overview page.

  The detail page equivalent of CnDashboardPage. Assembles a complete entity detail
  view from card-based sections, matching the dashboard visual style (rounded cards
  with headers). Uses a fixed declarative layout (no drag-and-drop).

  Features:
  - Header with back button, title, subtitle, and action buttons
  - Card-based content area (via default slot with CnDetailCard components)
  - Optional 12-column CSS grid layout mode (via layout + widgets props)
  - Optional right sidebar (CnObjectSidebar) for files, notes, tags, tasks, audit trail
  - Loading and error states
  - Edit mode toggle

  A simpler alternative to CnIndexPage for detail, stats, and overview pages.
  No multi-object table, no CRUD dialogs — just a clean layout with:
  - Header (title, description, icon, action buttons)
  - Loading / error / empty states
  - Statistics table section
  - Content sections via slots
-->
<template>
	<div class="cn-detail-page" data-testid="cn-detail-page" :style="{ maxWidth: maxWidth }">
		<!-- Header -->
		<div class="cn-detail-page__header" data-testid="cn-detail-page-header">
			<!-- Header (left block) — overridable via #header slot. Default
			     renders the icon + title + description. The right-hand
			     #actions slot remains separate so headerComponent and
			     actionsComponent can be replaced independently. -->
			<slot
				name="header"
				:title="title"
				:description="description"
				:icon="icon"
				:icon-size="iconSize">
				<div class="cn-detail-page__header-left">
					<slot name="icon">
						<CnIcon
							v-if="icon"
							:name="icon"
							:size="iconSize"
							class="cn-detail-page__icon" />
					</slot>
					<div class="cn-detail-page__header-text">
						<h2 v-if="title" class="cn-detail-page__title">
							{{ title }}
						</h2>
						<p v-if="description" class="cn-detail-page__description">
							{{ description }}
						</p>
					</div>
				</div>
			</slot>
			<div class="cn-detail-page__header-actions">
				<slot name="actions" />
			</div>
		</div>

		<!-- Locked-by-other banner. Renders only when an `_lockState`
		     was wired by `setup()` AND a remote lock is active.
		     Suppressed when the lock is held by the current user. -->
		<CnLockedBanner
			v-if="_lockState && _lockState.locked.value && !_lockState.lockedByMe.value"
			:locked-by="_lockState.lockedBy.value"
			:expires-at="_lockState.expiresAt.value" />

		<!-- Loading state -->
		<div v-if="loading" class="cn-detail-page__loading">
			<NcLoadingIcon :size="32" />
			<span>{{ loadingLabel }}</span>
		</div>

		<!-- Error state -->
		<div v-else-if="error" class="cn-detail-page__error">
			<slot name="error">
				<NcEmptyContent :name="errorMessage">
					<template #icon>
						<AlertCircleOutline :size="48" />
					</template>
					<template #action>
						<NcButton v-if="onRetry" type="primary" @click="onRetry">
							<template #icon>
								<Refresh :size="20" />
							</template>
							{{ retryLabel }}
						</NcButton>
						<slot name="error-actions" />
					</template>
				</NcEmptyContent>
			</slot>
		</div>

		<!-- Empty state -->
		<div v-else-if="empty" class="cn-detail-page__empty">
			<slot name="empty">
				<NcEmptyContent :name="emptyLabel">
					<template #icon>
						<InformationOutline :size="48" />
					</template>
					<template #action>
						<slot name="empty-actions" />
					</template>
				</NcEmptyContent>
			</slot>
		</div>

		<!-- Main content -->
		<div v-else class="cn-detail-page__body">
			<!-- Grid layout mode -->
			<div v-if="hasGridLayout" class="cn-detail-page__content cn-detail-page__content--grid">
				<section
					v-for="item in sortedLayout"
					:key="item.id"
					:style="widgetGridStyle(item)"
					class="cn-detail-page__grid-item"
					:aria-labelledby="item.showTitle !== false && findWidget(item) ? `widget-title-${item.id}` : undefined">
					<h3
						v-if="item.showTitle !== false && findWidget(item)"
						:id="`widget-title-${item.id}`"
						class="cn-detail-page__widget-title">
						{{ findWidget(item).title }}
					</h3>
					<slot
						:name="`widget-${item.widgetId}`"
						:item="item"
						:widget="findWidget(item)">
						<!-- Fallback for `type: 'integration'` widget defs:
						     render the registry widget on the detail-page
						     surface. A consumer-supplied #widget-<id> slot
						     still overrides this. -->
						<component
							:is="resolveIntegrationWidget(item)"
							v-if="isIntegrationWidget(item) && resolveIntegrationWidget(item)"
							v-bind="getIntegrationProps(item)" />
					</slot>
				</section>
			</div>

			<!-- Statistics table -->
			<div v-if="hasStats" class="cn-detail-page__stats">
				<slot name="stats-header">
					<h3 v-if="statsTitle" class="cn-detail-page__section-title">
						{{ statsTitle }}
					</h3>
				</slot>
				<table class="cn-detail-page__stats-table">
					<thead v-if="statsColumns.length > 0">
						<tr>
							<th v-for="col in statsColumns" :key="col.key" :class="col.align ? 'cn-detail-page__stats-cell--' + col.align : ''">
								{{ col.label }}
							</th>
						</tr>
					</thead>
					<tbody>
						<slot name="stats-rows">
							<tr v-for="(row, index) in statsRows" :key="index" :class="{ 'cn-detail-page__stats-row--sub': row.indent }">
								<td v-for="col in statsColumns" :key="col.key" :class="[row.indent ? 'cn-detail-page__stats-cell--indented' : '', col.align ? 'cn-detail-page__stats-cell--' + col.align : '']">
									{{ row[col.key] !== undefined ? row[col.key] : '-' }}
								</td>
							</tr>
						</slot>
					</tbody>
				</table>
			</div>

			<!-- Default vertical stacking mode -->
			<div v-else class="cn-detail-page__content">
				<!-- Schema-driven auto-body: fires when the manifest passed
				     register+schema+objectId, the object resolved, and no
				     consumer-supplied slot content is present. Renders the
				     data + metadata widgets stacked so a `type: "detail"`
				     manifest page is meaningful without per-app code. The
				     consumer's slot below short-circuits the auto-body
				     when present. -->
				<div v-if="shouldRenderAutoBody" class="cn-detail-page__auto-body">
					<CnObjectDataWidget
						v-if="currentSchema"
						:schema="currentSchema"
						:object-data="currentObject"
						:object-type="resolvedObjectType"
						:store="effectiveObjectStore" />
					<CnObjectMetadataWidget :object-data="currentObject" />
				</div>

				<!-- Default content -->
				<div v-else class="cn-detail-page__content">
					<slot />
				</div>

				<!-- Sections slot — additional content below stats -->
				<div v-if="$slots.sections" class="cn-detail-page__sections">
					<slot name="sections" />
				</div>
			</div>

			<!-- Footer -->
			<div v-if="$slots.footer" class="cn-detail-page__footer">
				<slot name="footer" />
			</div>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcEmptyContent, NcLoadingIcon } from '@nextcloud/vue'
import { CnIcon } from '../CnIcon/index.js'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import InformationOutline from 'vue-material-design-icons/InformationOutline.vue'
import { gridLayout } from '../../mixins/gridLayout.js'
import Refresh from 'vue-material-design-icons/Refresh.vue'
import { useObjectSubscription } from '../../composables/useObjectSubscription.js'
import { useObjectLock } from '../../composables/useObjectLock.js'
import { useIntegrationRegistry } from '../../composables/useIntegrationRegistry.js'
import { useObjectStore } from '../../store/index.js'
import CnLockedBanner from '../CnLockedBanner/CnLockedBanner.vue'
import CnObjectDataWidget from '../CnObjectDataWidget/CnObjectDataWidget.vue'
import CnObjectMetadataWidget from '../CnObjectMetadataWidget/CnObjectMetadataWidget.vue'

/** Surfaces understood by the pluggable integration registry (AD-19). */
const INTEGRATION_SURFACES = ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity']

/**
 * CnDetailPage — Generic detail/overview page.
 *
 * Supports two layout modes:
 * 1. **Default (vertical stacking):** Content provided via default slot, cards stack vertically.
 * 2. **Grid layout:** When `layout` and `widgets` props are provided, content renders in a
 *    12-column CSS grid with `#widget-{widgetId}` scoped slots. Same API as CnDashboardPage.
 *
 * Basic usage (vertical stacking)
 *
 * A simpler alternative to CnIndexPage for pages that display detail info,
 * statistics, charts, or card grids — without multi-object tables or CRUD
 * dialogs. Provides a consistent layout with header, loading/error/empty
 * states, a statistics table, and flexible content slots.
 *
 * Basic usage with stats table and content
 * ```vue
 * <CnDetailPage
 *   title="Register Overview"
 *   description="Statistics and schema details"
 *   icon="DatabaseOutline"
 *   :stats-title="'Register Statistics'"
 *   :stats-columns="[
 *     { key: 'type', label: 'Type' },
 *     { key: 'total', label: 'Total' },
 *     { key: 'size', label: 'Size' },
 *   ]"
 *   :stats-rows="[
 *     { type: 'Objects', total: 150, size: '2.4 MB' },
 *     { type: 'Files', total: 42, size: '1.1 MB' },
 *   ]"
 *   :loading="isLoading">
 *   <ChartGrid :data="chartData" />
 *   <SchemaCards :schemas="schemas" />
 * </CnDetailPage>
 * ```
 *
 * Grid layout mode
 * ```vue
 * <CnDetailPage
 *   title="Character Detail"
 *   :layout="[
 *     { id: 1, widgetId: 'info', gridX: 0, gridY: 0, gridWidth: 8 },
 *     { id: 2, widgetId: 'stats', gridX: 8, gridY: 0, gridWidth: 4 },
 *   ]"
 *   :widgets="[
 *     { id: 'info', title: 'Character Info' },
 *     { id: 'stats', title: 'Statistics' },
 *   ]">
 *   <template #widget-info="{ item, widget }">
 *     <CharacterInfoCard :character="character" />
 *   </template>
 *   <template #widget-stats="{ item, widget }">
 *     <StatsCard :stats="character.stats" />
 *   </template>
 * ```
 *
 * With header actions and error handling
 * ```vue
 * <CnDetailPage
 *   title="Schema Details"
 *   :error="hasError"
 *   error-message="Failed to load schema"
 *   :on-retry="loadSchema">
 *   <template #actions>
 *     <NcButton @click="editSchema">Edit</NcButton>
 *   </template>
 *   <DetailContent :schema="schema" />
 * </CnDetailPage>
 * ```
 */
export default {
	name: 'CnDetailPage',

	components: {
		NcButton,
		NcEmptyContent,
		NcLoadingIcon,
		CnIcon,
		AlertCircleOutline,
		InformationOutline,
		Refresh,
		CnLockedBanner,
		CnObjectDataWidget,
		CnObjectMetadataWidget,
	},

	mixins: [gridLayout],

	inject: {
		objectSidebarState: { default: null },
		/**
		 * Reactive AI context holder provided by CnAppRoot. This page
		 * component writes pageKind, objectUuid, registerSlug, schemaSlug
		 * in created() and watches for changes. Resets on beforeDestroy().
		 */
		cnAiContext: { default: null },
	},

	setup(props) {
		// Pluggable integration registry — used to resolve `type:
		// 'integration'` widgets in the grid layout to their Vue
		// component (AD-19 surface fallback). Always wired; cheap when
		// no integration widgets are configured.
		const { resolveWidget } = useIntegrationRegistry()
		const registryExposed = { resolveRegistryWidget: resolveWidget }

		// Auto-subscribe + reactive lock state for the current object.
		// Both are no-ops when objectStore is null (no Pinia active),
		// when subscribe is false (read-only / archive views), or when
		// objectType / objectId aren't yet known. Using composables in
		// setup() keeps the lifecycle bound to the component scope —
		// `tryOnScopeDispose` releases the subscription on unmount.
		if (!props.objectStore || !props.subscribe) {
			return { ...registryExposed, _lockState: null }
		}
		// Resolve the effective object-type slug the same way `computed.resolvedObjectType`
		// does — the explicit `objectType` prop wins, else fuse `register` + `schema`.
		// The composables take getter functions so the resolution stays reactive when
		// `register` / `schema` / `objectType` change at runtime.
		const resolveType = () => props.objectType || (props.register && props.schema ? `${props.register}-${props.schema}` : '')
		const subscription = useObjectSubscription(
			props.objectStore,
			resolveType,
			() => props.objectId,
			{ enabled: () => Boolean(resolveType() && props.objectId) },
		)
		const sidebarReg = props.sidebarProps?.register || props.resolvedSidebar?.register || props.register || ''
		const sidebarSchema = props.sidebarProps?.schema || props.resolvedSidebar?.schema || props.schema || ''
		const lock = useObjectLock(
			props.objectStore,
			() => sidebarReg,
			() => resolveType() || sidebarSchema,
			() => props.objectId,
		)
		return {
			...registryExposed,
			_subscriptionStatus: subscription.status,
			_lockState: lock,
		}
	},

	props: {
		/** Page title */
		title: {
			type: String,
			default: '',
		},
		/** Page description (shown below title) */
		description: {
			type: String,
			default: '',
		},
		/** Optional MDI icon name (rendered via CnIcon) */
		icon: {
			type: String,
			default: '',
		},
		/** Icon size in pixels */
		iconSize: {
			type: Number,
			default: 28,
		},
		/** Whether the page is in a loading state */
		loading: {
			type: Boolean,
			default: false,
		},
		/** Message shown during loading */
		loadingLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Loading...'),
		},
		/**
		 * Sidebar configuration. Accepts EITHER form:
		 *
		 *   - **Boolean (legacy, deprecated):** `true` activates the
		 *     external sidebar, `false` deactivates. The first time this
		 *     form is observed per component instance a one-shot
		 *     `console.warn` is logged pointing at the migration path.
		 *     Continues to work in v1.x for back-compat.
		 *
		 *   - **Object (preferred):** mirrors `CnIndexPage.sidebar` plus
		 *     the detail-specific fields previously on `sidebarProps`:
		 *     ```ts
		 *     {
		 *       show?: boolean,        // default true; false suppresses sidebar
		 *       enabled?: boolean,     // default true; false bypasses external sidebar
		 *       register?: string,
		 *       schema?: string,
		 *       hiddenTabs?: string[],
		 *       title?: string,
		 *       subtitle?: string,
		 *       tabs?: Array<TabDef>,  // see manifest-abstract-sidebar
		 *     }
		 *     ```
		 *     When BOTH `sidebar` (Object) and `sidebarProps` are set
		 *     with overlapping fields, the Object form wins and a
		 *     `console.warn` lists the conflicting fields once per
		 *     component instance.
		 *
		 * @type {Boolean|Object}
		 */
		sidebar: {
			type: [Boolean, Object],
			default: false,
		},
		/** Whether the sidebar is open (expanded) */
		sidebarOpen: {
			type: Boolean,
			default: true,
		},
		/** The registered object type slug for the sidebar */
		objectType: {
			type: String,
			default: '',
		},
		/** The object ID to display in the sidebar */
		objectId: {
			type: [String, Number],
			default: '',
		},
		/** Subtitle shown in the sidebar header */
		subtitle: {
			type: String,
			default: '',
		},
		/** Additional sidebar configuration (register, schema, hiddenTabs, title, subtitle) */
		sidebarProps: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * Rendering surface forwarded to integration widgets in the
		 * grid layout (widget defs with `type === 'integration'`).
		 * Drives the AD-19 surface fallback. Defaults to
		 * `'detail-page'` — the surface this page represents.
		 *
		 * @type {'user-dashboard'|'app-dashboard'|'detail-page'|'single-entity'}
		 */
		surface: {
			type: String,
			default: 'detail-page',
			validator: (value) => INTEGRATION_SURFACES.includes(value),
		},
		/**
		 * Object context forwarded to integration widgets:
		 * `{ register, schema, objectId }`. When omitted it is derived
		 * from `sidebarProps.register` / `sidebarProps.schema` (or
		 * `objectType`) and `objectId`, so `CnFilesCard` etc. can
		 * fetch the right object's sub-resources without extra wiring.
		 *
		 * @type {object|null}
		 */
		integrationContext: {
			type: Object,
			default: null,
		},
		/** Whether the page is in an error state */
		error: {
			type: Boolean,
			default: false,
		},
		/** Error message shown in error state */
		errorMessage: {
			type: String,
			default: () => t('nextcloud-vue', 'An error occurred'),
		},
		/** Callback for retry button in error state. If null, no retry button is shown. */
		onRetry: {
			type: Function,
			default: null,
		},
		/** Label for the retry button */
		retryLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Retry'),
		},
		/** Whether the page has no data to show */
		empty: {
			type: Boolean,
			default: false,
		},
		/** Message shown when page is empty */
		emptyLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'No data available'),
		},
		/** Title shown above the statistics table */
		statsTitle: {
			type: String,
			default: '',
		},
		/**
		 * Column definitions for the statistics table.
		 * Each column: `{ key: string, label: string, align?: 'left'|'center'|'right' }`
		 * @type {Array<{ key: string, label: string, align: string }>}
		 */
		statsColumns: {
			type: Array,
			default: () => [],
		},
		/**
		 * Row data for the statistics table. Each row is an object keyed by
		 * column keys. Set `indent: true` on a row for sub-row styling.
		 *
		 * @type {Array<object>}
		 */
		statsRows: {
			type: Array,
			default: () => [],
		},
		/** Maximum width of the page content */
		maxWidth: {
			type: String,
			default: '1200px',
		},
		/**
		 * Whether to auto-subscribe to live updates for this object.
		 * Defaults to true. When `useObjectStore` and `objectType` +
		 * `objectId` are both available, the page calls
		 * `objectStore.subscribe(objectType, objectId)` on mount and
		 * unsubscribes on unmount via `tryOnScopeDispose`. Set
		 * `false` for read-only / archive views.
		 *
		 * @type {boolean}
		 */
		subscribe: {
			type: Boolean,
			default: true,
		},
		/**
		 * Optional explicit Pinia store instance to subscribe / lock
		 * against. When omitted, the page resolves `useObjectStore()`
		 * lazily so consumer apps that haven't activated Pinia yet
		 * (e.g. tests) don't crash.
		 *
		 * @type {object|null}
		 */
		objectStore: {
			type: Object,
			default: null,
		},
		/**
		 * OpenRegister register slug. Pair with `schema` to opt into the
		 * schema-driven mode: the page fuses the two into an internal
		 * `${register}-${schema}` object-type slug, registers it on the
		 * store, fetches the object identified by `objectId`, and auto-
		 * renders `CnObjectDataWidget` + `CnObjectMetadataWidget` when no
		 * default-slot content is supplied. Compatible with the existing
		 * `objectType` prop — `objectType` wins on collision, so legacy
		 * direct mounts are unaffected.
		 *
		 * @type {string}
		 */
		register: {
			type: String,
			default: '',
		},
		/**
		 * OpenRegister schema slug. See `register` for the schema-driven
		 * contract.
		 *
		 * @type {string}
		 */
		schema: {
			type: String,
			default: '',
		},
		/**
		 * Tab definitions forwarded to the host App's `CnObjectSidebar`
		 * via the injected `objectSidebarState`. Each entry follows the
		 * `CnObjectSidebar` tab shape (see that component for the exact
		 * fields). When empty (default) the sidebar falls back to its
		 * own default tab set. The actual `<CnObjectSidebar>` is rendered
		 * at `NcContent` level by `CnAppRoot` (ADR-017 — external sidebar
		 * pattern); this page only publishes the tabs.
		 *
		 * @type {Array<object>}
		 */
		sidebarTabs: {
			type: Array,
			default: () => [],
		},
	},

	computed: {
		/**
		 * Effective object-type slug, used for subscription, lock, store
		 * registration, fetch, and sidebar state. Explicit `objectType`
		 * prop wins (existing direct-mount call sites stay untouched);
		 * otherwise `${register}-${schema}` fuses the schema-driven props
		 * the manifest renderer passes. Returns `''` when neither path
		 * yields a slug — the schema-driven gates downstream key off that.
		 */
		resolvedObjectType() {
			if (this.objectType) {
				return this.objectType
			}
			if (this.register && this.schema) {
				return `${this.register}-${this.schema}`
			}
			return ''
		},
		/**
		 * True when this mount is wired for the manifest's schema-driven
		 * contract: `register`, `schema`, and `objectId` are all set, so
		 * the page should fetch the object + schema, register the type
		 * on the store, and render the auto-body widgets when no slot
		 * content is supplied. Legacy direct mounts (which pass an
		 * explicit `objectType` instead) return `false` here and skip
		 * the fetch path entirely.
		 */
		hasSchemaDrivenFetch() {
			return Boolean(this.register && this.schema && this.objectId)
		},
		/**
		 * Pinia store instance used for the schema-driven fetch.
		 * Mirrors `CnLogsPage.objectStore`: explicit `objectStore` prop
		 * wins; otherwise falls back to the library's default
		 * `useObjectStore()`. The composable is invoked lazily inside a
		 * computed so test mounts that never activate Pinia don't crash.
		 *
		 * @return {object|null} The resolved store, or null when the page
		 *   is not in schema-driven mode (no need to touch Pinia at all).
		 */
		effectiveObjectStore() {
			if (this.objectStore) {
				return this.objectStore
			}
			if (!this.hasSchemaDrivenFetch) {
				return null
			}
			try {
				return useObjectStore()
			} catch (err) {
				// Pinia not active in this consumer — fall back to no-op
				// and let the page render as if no store-driven content
				// were available. Real consumers (CnAppRoot-hosted apps)
				// always have Pinia active, so this branch only protects
				// stand-alone test mounts.
				// eslint-disable-next-line no-console
				console.warn('[CnDetailPage] useObjectStore() unavailable; schema-driven mode disabled.', err)
				return null
			}
		},
		/**
		 * The fetched OR object for the schema-driven mode. Read straight
		 * from the store's normalised `objects[type][id]` cache so any
		 * other component fetching the same object (sidebar widgets,
		 * locked-banner) shares state with no second request.
		 *
		 * @return {object|null}
		 */
		currentObject() {
			const store = this.effectiveObjectStore
			if (!store) return null
			const type = this.resolvedObjectType
			if (!type || !this.objectId) return null
			return store.objects?.[type]?.[this.objectId] ?? null
		},
		/**
		 * The fetched JSON Schema for the schema-driven mode. Read from
		 * the store's `schemas[type]` cache populated by `fetchSchema`.
		 * Required to render `CnObjectDataWidget` (which takes a schema
		 * Object, not a slug).
		 *
		 * @return {object|null}
		 */
		currentSchema() {
			const store = this.effectiveObjectStore
			if (!store) return null
			const type = this.resolvedObjectType
			if (!type) return null
			return store.schemas?.[type] ?? null
		},
		/**
		 * True when no consumer-supplied default slot content is
		 * present. Treats whitespace-only / empty vnodes as no content
		 * so a stray newline in the template doesn't accidentally
		 * suppress the auto-body.
		 */
		hasDefaultSlotContent() {
			const nodes = this.$slots.default
			if (!nodes || !nodes.length) return false
			return nodes.some(vnode => !(vnode.text !== undefined && vnode.text.trim() === ''))
		},
		/**
		 * True when the auto-body (CnObjectDataWidget + CnObjectMetadataWidget)
		 * should render. Conditions: schema-driven mount, the object has
		 * loaded, no consumer slot wins, and the grid-layout mode is not
		 * active (grid mode owns the body when present).
		 */
		shouldRenderAutoBody() {
			return this.hasSchemaDrivenFetch
				&& this.currentObject
				&& !this.hasDefaultSlotContent
				&& !this.hasGridLayout
		},
		/**
		 * Whether the sidebar is rendered externally (via objectSidebarState inject)
		 * rather than inline. When external, CnDetailPage only manages state —
		 * the parent App renders the actual NcAppSidebar.
		 */
		hasExternalSidebar() {
			return !!this.objectSidebarState
		},
		/**
		 * Normalised sidebar config object regardless of input shape.
		 *
		 *   - Boolean `true`  → `{ show: true, enabled: true }`
		 *   - Boolean `false` → `{ show: false, enabled: false }`
		 *   - Object          → fields passed through; `show` and
		 *     `enabled` default to `true` when omitted.
		 *
		 * Centralising the normalisation here keeps `syncSidebarState`
		 * and the deprecation/conflict-warning logic single-sourced.
		 */
		resolvedSidebar() {
			const cfg = this.sidebar
			if (typeof cfg === 'boolean') {
				return { show: cfg, enabled: cfg }
			}
			if (cfg && typeof cfg === 'object') {
				return {
					show: cfg.show !== false,
					enabled: cfg.enabled !== false,
					...cfg,
				}
			}
			return { show: false, enabled: false }
		},
		/**
		 * True when the sidebar should be wired into the external
		 * `objectSidebarState` channel. Both `show` and `enabled`
		 * must be non-`false` (defaults are `true`); either can
		 * suppress the sidebar declaratively.
		 */
		sidebarActive() {
			const r = this.resolvedSidebar
			return r.show !== false && r.enabled !== false
		},
		hasStats() {
			return this.statsColumns.length > 0 && (this.statsRows.length > 0 || !!this.$slots['stats-rows'])
		},
	},

	watch: {
		sidebar: {
			immediate: true,
			handler() { this.syncSidebarState() },
		},
		title() { this.syncSidebarState() },
		subtitle() { this.syncSidebarState() },
		objectType() { this.syncSidebarState() },
		// Schema-driven props feed both the sidebar state (via
		// resolvedObjectType) and the auto-fetch path. Re-sync + re-fetch
		// whenever any of the three move so the page stays consistent if
		// a parent component swaps the active object.
		register() {
			this.syncSidebarState()
			this.pushAiContext()
			this.fetchObjectIfNeeded()
		},
		schema() {
			this.syncSidebarState()
			this.pushAiContext()
			this.fetchObjectIfNeeded()
		},
		objectId() {
			this.syncSidebarState()
			this.pushAiContext()
			this.fetchObjectIfNeeded()
		},
		sidebarTabs: {
			deep: true,
			handler() { this.syncSidebarState() },
		},
		sidebarProps: {
			deep: true,
			handler() { this.syncSidebarState() },
		},
	},

	created() {
		this.pushAiContext()
	},

	mounted() {
		// Kick the schema-driven fetch once the component has mounted —
		// `effectiveObjectStore` relies on a live Pinia context, which
		// is guaranteed by mounted() but not by created().
		this.fetchObjectIfNeeded()
	},

	beforeDestroy() {
		if (this.hasExternalSidebar) {
			this.objectSidebarState.active = false
			// Clear manifest-driven tabs so the next mount starts fresh
			// rather than inheriting the previous page's tab strip.
			this.objectSidebarState.tabs = undefined
		}
		// Reset AI context fields so stale detail context doesn't leak
		if (this.cnAiContext) {
			this.cnAiContext.pageKind = 'custom'
			this.cnAiContext.objectUuid = undefined
			this.cnAiContext.registerSlug = undefined
			this.cnAiContext.schemaSlug = undefined
		}
	},

	methods: {
		/**
		 * Schema-driven fetch entry point — no-op outside the
		 * `register`+`schema`+`objectId` mode. Registers the type on
		 * the store with the canonical 4-arg signature (matches what
		 * `CnIndexPage` does), then fetches the object and its schema
		 * in parallel. Errors land on `this._fetchError` (exposed via
		 * the `error` template gate); the loading flag is intentionally
		 * left to the store's own per-type `loading[type]` so it
		 * cooperates with parallel fetches from sibling components.
		 *
		 * Called from `mounted()` and from the `register` / `schema` /
		 * `objectId` watchers — every prop change re-runs in one
		 * place so the request lifecycle stays predictable.
		 */
		async fetchObjectIfNeeded() {
			if (!this.hasSchemaDrivenFetch) return
			const store = this.effectiveObjectStore
			if (!store) return
			const type = this.resolvedObjectType
			// (slug, schemaId, registerId, slugs) — same shape as the
			// CnIndexPage / CnLogsPage fix. Passing the slug strings into
			// the positional id slots is intentional (OR's REST accepts
			// either numeric ids or kebab slugs there), and the 4th-arg
			// hints feed the live-updates transport.
			if (typeof store.registerObjectType === 'function') {
				store.registerObjectType(
					type,
					this.schema,
					this.register,
					{ registerSlug: this.register, schemaSlug: this.schema },
				)
			}
			try {
				const tasks = []
				if (typeof store.fetchObject === 'function') {
					tasks.push(store.fetchObject(type, this.objectId))
				}
				if (typeof store.fetchSchema === 'function') {
					tasks.push(store.fetchSchema(type))
				}
				await Promise.all(tasks)
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnDetailPage] schema-driven fetch failed:', err)
			}
		},
		/**
		 * Whether a grid-layout item resolves to an integration-typed
		 * widget — `def.type === 'integration'` with a string
		 * `integrationId`. Used by the grid template to render the
		 * registry widget as the slot fallback.
		 *
		 * @param {object} item Layout item
		 * @return {boolean} true when the matching widget def is an integration widget
		 */
		isIntegrationWidget(item) {
			const def = this.findWidget(item)
			return Boolean(def) && def.type === 'integration' && typeof def.integrationId === 'string'
		},

		/**
		 * Resolve the Vue component for an integration widget, applying
		 * the AD-19 surface fallback. Null when the integration isn't
		 * registered (the grid section simply renders nothing extra).
		 *
		 * @param {object} item Layout item
		 * @return {object|null} Vue component, or null.
		 */
		resolveIntegrationWidget(item) {
			const def = this.findWidget(item)
			if (!def || typeof def.integrationId !== 'string') {
				return null
			}
			return this.resolveRegistryWidget(def.integrationId, this.surface)
		},

		/**
		 * Props passed to an integration widget: surface, object
		 * context (explicit `integrationContext` prop, else derived
		 * from the sidebar config + objectId), and per-widget `props`.
		 *
		 * @param {object} item Layout item
		 * @return {object} Props object for the widget component.
		 */
		getIntegrationProps(item) {
			const def = this.findWidget(item)
			const resolved = this.resolvedSidebar || {}
			const derivedContext = {
				register: resolved.register || this.sidebarProps?.register || this.register || '',
				schema: resolved.schema || this.schema || this.resolvedObjectType || this.sidebarProps?.schema || '',
				objectId: this.objectId ? String(this.objectId) : '',
			}
			return {
				surface: this.surface,
				...(this.integrationContext || derivedContext),
				...(def?.props || {}),
			}
		},

		/**
		 * Push pageKind + objectUuid + register/schema context into the
		 * reactive cnAiContext holder so the AI Chat Companion knows
		 * what object the user is viewing.
		 */
		pushAiContext() {
			if (!this.cnAiContext) return
			const resolved = this.resolvedSidebar || {}
			this.cnAiContext.pageKind = 'detail'
			this.cnAiContext.objectUuid = this.objectId ? String(this.objectId) : undefined
			this.cnAiContext.registerSlug = resolved.register || this.register || this.sidebarProps?.register || undefined
			this.cnAiContext.schemaSlug = resolved.schema || this.schema || this.resolvedObjectType || this.sidebarProps?.schema || undefined
		},

		/**
		 * Pushes the resolved sidebar config into the
		 * `objectSidebarState` provide/inject channel for the host
		 * App's mounted `<CnObjectSidebar>` to consume.
		 *
		 * Object form fields take precedence over `sidebarProps` for
		 * any field they declare; `sidebarProps` continues to fill
		 * fields the Object form omits, preserving back-compat.
		 *
		 * Suppression (`show: false` or `enabled: false`) clears
		 * `tabs` so a hidden detail page does not leak prior tab
		 * state to the next mount.
		 */
		syncSidebarState() {
			if (!this.hasExternalSidebar) return
			this.warnIfDeprecatedSidebarShape()
			const r = this.resolvedSidebar
			if (this.sidebarActive && this.resolvedObjectType && this.objectId) {
				const merged = this.mergeSidebarSources(r)
				this.objectSidebarState.active = true
				this.objectSidebarState.open = this.sidebarOpen
				this.objectSidebarState.objectType = this.resolvedObjectType
				this.objectSidebarState.objectId = this.objectId
				this.objectSidebarState.title = merged.title || this.title || ''
				this.objectSidebarState.subtitle = merged.subtitle || this.subtitle || ''
				this.objectSidebarState.register = merged.register || this.register || ''
				this.objectSidebarState.schema = merged.schema || this.schema || ''
				this.objectSidebarState.hiddenTabs = merged.hiddenTabs || []
				// Manifest-driven open-enum tabs (forwarded to the host
				// app's mounted CnObjectSidebar via inject). When the
				// top-level `sidebarTabs` prop is non-empty it provides
				// the tabs (manifest pattern); otherwise the merged
				// `sidebar.tabs` / `sidebarProps.tabs` legacy paths win.
				// Falls back to `undefined` so the host's CnObjectSidebar
				// renders its built-in tab set.
				this.objectSidebarState.tabs = (this.sidebarTabs && this.sidebarTabs.length > 0)
					? this.sidebarTabs
					: merged.tabs
			} else {
				this.objectSidebarState.active = false
				this.objectSidebarState.tabs = undefined
			}
		},
		/**
		 * Merge the Object-form `sidebar` fields with the legacy
		 * `sidebarProps` fields. Object form wins on conflict; first
		 * conflict per instance fires a one-shot console.warn naming
		 * the conflicting fields.
		 *
		 * @param {object} resolved Pre-normalised sidebar config object.
		 * @return {object} Merged config — Object form fields override
		 *   sidebarProps fields where both are set.
		 */
		mergeSidebarSources(resolved) {
			const objectForm = (this.sidebar && typeof this.sidebar === 'object') ? this.sidebar : null
			const props = this.sidebarProps || {}
			const merged = {
				title: objectForm?.title ?? props.title,
				subtitle: objectForm?.subtitle ?? props.subtitle,
				register: objectForm?.register ?? props.register,
				schema: objectForm?.schema ?? props.schema,
				hiddenTabs: objectForm?.hiddenTabs ?? props.hiddenTabs,
				tabs: objectForm?.tabs ?? props.tabs,
			}
			if (objectForm && !this.__sidebarConflictWarned) {
				const overlap = ['title', 'subtitle', 'register', 'schema', 'hiddenTabs', 'tabs']
					.filter((field) => objectForm[field] !== undefined && props[field] !== undefined)
				if (overlap.length > 0) {
					// eslint-disable-next-line no-console
					console.warn(
						`[CnDetailPage] :sidebar (Object) and :sidebarProps both set ${overlap.join(', ')}; the :sidebar values win. Move all fields to :sidebar to silence this warning.`,
					)
					this.__sidebarConflictWarned = true
				}
			}
			// Re-anchor `resolved` for the contract — callers expect
			// the returned object to reflect the normalised shape.
			return { ...resolved, ...merged }
		},
		/**
		 * Log a one-shot deprecation warning when the legacy Boolean
		 * form of the `sidebar` prop is observed. Tracked via a
		 * non-reactive instance flag so subsequent renders/toggles
		 * don't spam the console.
		 */
		warnIfDeprecatedSidebarShape() {
			if (typeof this.sidebar !== 'boolean') return
			if (this.__sidebarBooleanWarned) return
			this.__sidebarBooleanWarned = true
			// eslint-disable-next-line no-console
			console.warn(
				'[CnDetailPage] :sidebar=Boolean is deprecated; pass an Object — see docs/components/cn-detail-page.md for the new shape.',
			)
		},
	},
}
</script>

<!-- Styles in css/detail-page.css -->
