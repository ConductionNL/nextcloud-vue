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
	<div class="cn-detail-page" :style="{ maxWidth: maxWidth }">
		<!-- Header -->
		<div class="cn-detail-page__header">
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
				<!-- Default content -->
				<div class="cn-detail-page__content">
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
import CnLockedBanner from '../CnLockedBanner/CnLockedBanner.vue'

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
		const subscription = useObjectSubscription(
			props.objectStore,
			() => props.objectType,
			() => props.objectId,
			{ enabled: () => Boolean(props.objectType && props.objectId) },
		)
		const sidebarReg = props.sidebarProps?.register || props.resolvedSidebar?.register || ''
		const sidebarSchema = props.sidebarProps?.schema || props.resolvedSidebar?.schema || ''
		const lock = useObjectLock(
			props.objectStore,
			() => sidebarReg,
			() => props.objectType || sidebarSchema,
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
		 * Object context forwarded to integration widgets — an object
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
	},

	computed: {
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
		objectId() {
			this.syncSidebarState()
			this.pushAiContext()
		},
		sidebarProps: {
			deep: true,
			handler() { this.syncSidebarState() },
		},
	},

	created() {
		this.pushAiContext()
	},

	beforeDestroy() {
		if (this.hasExternalSidebar) {
			this.objectSidebarState.active = false
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
				register: resolved.register || this.sidebarProps?.register || '',
				schema: resolved.schema || this.objectType || this.sidebarProps?.schema || '',
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
			this.cnAiContext.registerSlug = resolved.register || this.sidebarProps?.register || undefined
			this.cnAiContext.schemaSlug = resolved.schema || this.objectType || this.sidebarProps?.schema || undefined
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
			if (this.sidebarActive && this.objectType && this.objectId) {
				const merged = this.mergeSidebarSources(r)
				this.objectSidebarState.active = true
				this.objectSidebarState.open = this.sidebarOpen
				this.objectSidebarState.objectType = this.objectType
				this.objectSidebarState.objectId = this.objectId
				this.objectSidebarState.title = merged.title || this.title || ''
				this.objectSidebarState.subtitle = merged.subtitle || this.subtitle || ''
				this.objectSidebarState.register = merged.register || ''
				this.objectSidebarState.schema = merged.schema || ''
				this.objectSidebarState.hiddenTabs = merged.hiddenTabs || []
				// Manifest-driven open-enum tabs (forwarded to the host
				// app's mounted CnObjectSidebar via inject). Undefined when
				// not set so the consumer's CnObjectSidebar falls back to
				// the built-in tab set.
				this.objectSidebarState.tabs = merged.tabs
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
