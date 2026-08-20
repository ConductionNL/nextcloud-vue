<!--
  CnIntegrationWidget — tabbed, app-faithful integration widget for
  OpenRegister object detail pages and dashboards.

  Supersedes the generic Phase E pair (CnIntegrationCard /
  CnIntegrationWidgetGrid) which rendered one one-size surface that
  erased each integrated app's visual identity. This widget gives every
  integration its own tab (app icon + label + accent), composing the
  existing bespoke per-leaf content component (`provider.tab`), PLUS a
  single-integration mode for manifest multi-placement.

  TWO MODES
  ---------
  - Tabbed (default): a tab strip with one tab per integration available
    for `surface` (optionally narrowed by `include`), sorted by `.order`.
    The active tab renders that leaf's content. Unavailable integrations
    still get a tab; clicking shows an NcEmptyContent set-up state.
  - Single (`:only="deck"`): NO tab strip — just one integration's
    content under a compact header (app icon + label). This is what an
    app manifest places several times on one detail page (ADR-024).

  AVAILABILITY (Phase J-B)
  ------------------------
  Per-integration availability is sourced, in order:
    1. descriptor `available` (boolean) when the descriptor carries it,
    2. else the OCS capability
       `openregister.integrations.providers[].available`
       (getCapabilities()), distinguishing missing-app from
       not-configured via a `reason` field when present,
    3. else `isAppInstalled(requiredApp)` (OC.appswebroots / capabilities).
  When unavailable, the leaf renders NcEmptyContent: app icon, a
  "{App} not available" / "not configured" name, a short description, and
  an NcButton linking to the leaf's setup docs
  (`https://openregister.conduction.nl/docs/Integrations/{id}/`).

  DESCRIPTOR CONTRACT (filled by the per-app waves)
  -------------------------------------------------
  In addition to the registry's existing fields, the widget reads:
    - icon        (MDI name string) — the app icon, rendered via CnIcon.
    - accentColor (hex) — per-app brand tint for the active tab / header.
    - appName     (string) — backing-app display name for empty copy
                  (defaults to `label`).
    - docsUrl     (string) — setup-docs link (defaults to the
                  openregister.conduction.nl path derived from `id`).
    - surfaces    (string[]) — optional surface allowlist (eligible
                  everywhere when omitted).
  These are normalised in `src/integrations/registry.js`; the per-app
  fidelity waves refine accentColor/appName per leaf.

  MANIFEST PLACEMENT (ADR-024)
  ----------------------------
  An app manifest references this component by name and passes config as
  props, e.g. to place two single-integration widgets on a detail page:

    "widgets": [
      { "component": "CnIntegrationWidget",
        "props": { "only": "deck",     "surface": "detail-page" } },
      { "component": "CnIntegrationWidget",
        "props": { "only": "calendar", "surface": "detail-page" } }
    ]

  The host wires `register` / `schema` / `objectId` from the object
  context. Omit `only` (and optionally pass `include`) for the tabbed
  surface.

  See ADR-019 (registry), ADR-022 (sidebar tab contract), ADR-024
  (manifest widget placement), ADR-004 (component composition).

  @example
  Tabbed, all detail-page integrations:
  <CnIntegrationWidget
    register="decidesk"
    schema="meeting"
    object-id="obj-1" />

  @example
  Single-integration, manifest-placeable:
  <CnIntegrationWidget
    only="deck"
    register="decidesk"
    schema="meeting"
    object-id="obj-1" />
-->
<template>
	<div class="cn-integration-widget" :data-surface="surface" :data-mode="mode">
		<!-- SINGLE MODE: one integration, no tab strip. -->
		<template v-if="mode === 'single'">
			<div v-if="singleProvider" class="cn-integration-widget__single">
				<header class="cn-integration-widget__header" :style="accentStyle(singleProvider)">
					<CnIcon
						v-if="singleProvider.icon"
						:name="singleProvider.icon"
						:size="20"
						class="cn-integration-widget__header-icon" />
					<span class="cn-integration-widget__header-label">{{ singleProvider.label }}</span>
					<div class="cn-integration-widget__header-actions">
						<CnActionsMenu
							:documentation-url="documentationUrl"
							:widget-id="resolvedWidgetId"
							:title="singleProvider.label"
							:surface="`widget:${resolvedWidgetId}`"
							testid-base="cn-integration-widget" />
					</div>
				</header>
				<div class="cn-integration-widget__panel">
					<CnIntegrationWidgetEmpty
						v-if="!isAvailable(singleProvider)"
						:provider="singleProvider"
						:reason="unavailableReason(singleProvider)" />
					<component
						:is="singleProvider.tab"
						v-else
						v-bind="leafProps(singleProvider)" />
				</div>
			</div>
			<NcEmptyContent v-else :name="unknownLeafLabel" />
		</template>

		<!-- TABBED MODE: tab strip + active panel. -->
		<template v-else>
			<NcEmptyContent
				v-if="visibleProviders.length === 0"
				:name="noIntegrationsLabel" />
			<template v-else>
				<div class="cn-integration-widget__tabbar">
					<div
						class="cn-integration-widget__tabs"
						role="tablist"
						:aria-label="tabListLabel">
						<button
							v-for="(provider, idx) in visibleProviders"
							:id="tabId(provider)"
							:key="provider.id"
							type="button"
							role="tab"
							class="cn-integration-widget__tab"
							:class="{ 'cn-integration-widget__tab--active': provider.id === activeId }"
							:style="tabAccentStyle(provider)"
							:aria-selected="provider.id === activeId ? 'true' : 'false'"
							:tabindex="provider.id === activeId ? 0 : -1"
							:aria-controls="panelId(provider)"
							:data-testid="`cn-integration-widget-tab-${provider.id}`"
							@click="selectTab(provider.id)"
							@keydown="onTabKeydown($event, idx)">
							<CnIcon
								v-if="provider.icon"
								:name="provider.icon"
								:size="18"
								class="cn-integration-widget__tab-icon" />
							<span class="cn-integration-widget__tab-label">{{ provider.label }}</span>
						</button>
					</div>
					<div class="cn-integration-widget__header-actions">
						<CnActionsMenu
							:documentation-url="documentationUrl"
							:widget-id="resolvedWidgetId"
							:title="headerTitle"
							:surface="`widget:${resolvedWidgetId}`"
							testid-base="cn-integration-widget" />
					</div>
				</div>

				<div
					v-if="activeProvider"
					:id="panelId(activeProvider)"
					class="cn-integration-widget__panel"
					role="tabpanel"
					:aria-labelledby="tabId(activeProvider)"
					tabindex="0">
					<CnIntegrationWidgetEmpty
						v-if="!isAvailable(activeProvider)"
						:provider="activeProvider"
						:reason="unavailableReason(activeProvider)" />
					<component
						:is="activeProvider.tab"
						v-else
						v-bind="leafProps(activeProvider)" />
				</div>
			</template>
		</template>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcEmptyContent } from '@nextcloud/vue'
import CnIcon from '../CnIcon/CnIcon.vue'
import CnIntegrationWidgetEmpty from './CnIntegrationWidgetEmpty.vue'
import { CnActionsMenu } from '../CnActionsMenu/index.js'
import { useIntegrationRegistry } from '../../composables/useIntegrationRegistry.js'
import { isAppInstalled } from '../../utils/appInstalled.js'
import { resolveProviderAvailability } from './availability.js'
import { registerIntegrationIcons } from '../../integrations/icons.js'

// Ensure every descriptor's MDI icon resolves through CnIcon regardless
// of what the host app registered at bootstrap — otherwise tabs fall
// back to the generic HelpCircleOutline glyph. Idempotent.
registerIntegrationIcons()

const VALID_SURFACES = ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity']

/**
 * CnIntegrationWidget — tabbed integration widget + single-integration
 * mode. See the file-level docblock for the contract.
 */
export default {
	name: 'CnIntegrationWidget',

	components: { NcEmptyContent, CnIcon, CnIntegrationWidgetEmpty, CnActionsMenu },

	props: {
		/**
		 * Optional registry override (used in tests so registrations
		 * don't leak across cases). Defaults to the singleton.
		 */
		registry: {
			type: Object,
			default: null,
		},
		/**
		 * OpenRegister register id — a slug/uuid string, or the register
		 * OBJECT a detail page injects. Accepts both for the same reason
		 * `schema` does; see below.
		 */
		register: { type: [String, Object], default: '' },
		/**
		 * OpenRegister schema — a slug/uuid string, or the schema OBJECT the
		 * detail-page widget grid injects.
		 *
		 * This used to be `type: String`, and a detail page handed it the
		 * resolved object instead. Vue reported the mismatch as a dev-only
		 * warning ("Expected String with value \"[object Object]\", got
		 * Object") and then passed the object through unchanged, so the leaf
		 * built `/apps/openregister/api/schemas/[object Object]` and got a 404
		 * — an unreadable URL rather than a named failure, and silent in
		 * production where the warning is compiled out.
		 *
		 * `CnAuditTrailWidget` already accepted both shapes and collapsed the
		 * object to its slug; this mirrors that so the two widgets cannot
		 * disagree about what a detail page may hand them.
		 */
		schema: { type: [String, Object], default: '' },
		/** Parent object id. Forwarded to each leaf. */
		objectId: { type: [String, Number], default: '' },
		/**
		 * Single-integration mode: render ONLY this leaf id with no tab
		 * strip. The manifest multi-placement entry point (ADR-024).
		 */
		only: { type: String, default: '' },
		/**
		 * Rendering surface — filters integrations by `surfaces.includes()`
		 * when a descriptor declares a `surfaces` allowlist.
		 */
		surface: {
			type: String,
			default: 'detail-page',
			validator: (s) => VALID_SURFACES.includes(s),
		},
		/**
		 * Explicit allowlist of leaf ids to show as tabs. When omitted,
		 * all registered integrations eligible for `surface` are shown.
		 *
		 * @type {string[]|null}
		 */
		include: { type: Array, default: null },
		/** Base API URL forwarded to each leaf content component. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Optional object type forwarded to each leaf content component. */
		objectType: { type: String, default: '' },
		/**
		 * Documentation link target for the header's shared Actions menu.
		 * When non-empty a "Documentation" item opens it in a new tab;
		 * empty (the default) hides the item.
		 *
		 * @type {string}
		 */
		documentationUrl: { type: String, default: '' },
		/**
		 * Stable id carried on the Actions-menu refresh / request-feature
		 * payloads and surface string. When empty the header title is
		 * slugified as a fallback (see `resolvedWidgetId`).
		 *
		 * @type {string}
		 */
		widgetId: { type: String, default: '' },
	},

	setup(props) {
		const { integrations } = useIntegrationRegistry(props.registry || undefined)
		return { registryIntegrations: integrations }
	},

	data() {
		return {
			/** Currently selected tab id (tabbed mode only). */
			activeId: '',
		}
	},

	computed: {
		/** 'single' when `only` is set, else 'tabbed'. */
		mode() {
			return this.only ? 'single' : 'tabbed'
		},

		/**
		 * The register SLUG. A register object collapses to its slug/name/id,
		 * mirroring `CnAuditTrailWidget.resolvedRegister`.
		 *
		 * @return {string}
		 */
		resolvedRegister() {
			const r = this.register || ''
			return typeof r === 'string' ? r : (r && (r.slug || r.name || r.id)) || ''
		},

		/**
		 * The schema SLUG. A schema object collapses to its slug/name/id.
		 *
		 * Leaves interpolate this straight into an OpenRegister URL, so an
		 * object reaching them produces `/api/schemas/[object Object]` and a
		 * 404 that names nothing. Collapsing here means every leaf receives
		 * the string it already documents, and a caller that hands over the
		 * whole schema object — which the detail-page widget grid does — is
		 * served rather than silently broken.
		 *
		 * @return {string}
		 */
		resolvedSchema() {
			const s = this.schema || ''
			return typeof s === 'string' ? s : (s && (s.slug || s.name || s.id)) || ''
		},

		/**
		 * The provider for single mode (resolved from `only`), or null
		 * when the id is unknown / not eligible for the surface.
		 *
		 * @return {object|null}
		 */
		singleProvider() {
			if (!this.only) {
				return null
			}
			const all = this.registryIntegrations || []
			for (const provider of all) {
				if (provider.id === this.only && this.eligibleForSurface(provider)) {
					return provider
				}
			}
			return null
		},

		/**
		 * Integrations shown as tabs: eligible for the surface, narrowed
		 * by `include` when set, sorted by the registry's `order` (the
		 * snapshot is already order-sorted, so we preserve that).
		 *
		 * @return {object[]}
		 */
		visibleProviders() {
			const include = Array.isArray(this.include) ? this.include : null
			return (this.registryIntegrations || []).filter((provider) => {
				if (!this.eligibleForSurface(provider)) {
					return false
				}
				if (include !== null && !include.includes(provider.id)) {
					return false
				}
				return true
			})
		},

		/**
		 * The currently active provider in tabbed mode.
		 *
		 * @return {object|null}
		 */
		activeProvider() {
			const list = this.visibleProviders
			for (const provider of list) {
				if (provider.id === this.activeId) {
					return provider
				}
			}
			return list.length > 0 ? list[0] : null
		},

		noIntegrationsLabel() {
			return t('nextcloud-vue', 'No integrations available yet.')
		},

		unknownLeafLabel() {
			return t('nextcloud-vue', 'This integration is not available.')
		},

		tabListLabel() {
			return t('nextcloud-vue', 'Integrations')
		},

		/**
		 * Label shown by the active header — the single-mode provider's
		 * label, else the active tab's label, else the generic tab-list
		 * label. Fed to the shared Actions menu as its `title`.
		 *
		 * @return {string}
		 */
		headerTitle() {
			if (this.mode === 'single') {
				return this.singleProvider ? this.singleProvider.label : this.unknownLeafLabel
			}
			return this.activeProvider ? this.activeProvider.label : this.tabListLabel
		},

		/**
		 * Stable widget id for the Actions menu: the explicit `widgetId`
		 * prop when set, else a slugified `headerTitle` (lowercase,
		 * non-alphanumerics → '-'), falling back to 'integration'.
		 *
		 * @return {string}
		 */
		resolvedWidgetId() {
			if (this.widgetId) {
				return this.widgetId
			}
			const slug = String(this.headerTitle || '')
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-+|-+$/g, '')
			return slug || 'integration'
		},
	},

	watch: {
		/**
		 * Keep the active tab valid when the provider set changes (late
		 * registration, surface/include change). Re-anchor to the first
		 * provider if the current active id disappears.
		 */
		visibleProviders: {
			immediate: true,
			handler(list) {
				if (this.mode !== 'tabbed') {
					return
				}
				const ids = (list || []).map((p) => p.id)
				if (ids.length === 0) {
					this.activeId = ''
					return
				}
				if (!ids.includes(this.activeId)) {
					this.activeId = ids[0]
				}
			},
		},
	},

	methods: {
		t,

		/**
		 * Whether a provider is eligible for the current surface. A
		 * descriptor with a `surfaces` allowlist must include it; without
		 * one, every provider is eligible (matches CnIntegrationWidgetGrid).
		 *
		 * @param {object} provider Normalised registry entry.
		 * @return {boolean}
		 */
		eligibleForSurface(provider) {
			const surfaces = provider.surfaces
			if (Array.isArray(surfaces) && surfaces.length > 0) {
				return surfaces.includes(this.surface)
			}
			return true
		},

		/**
		 * Resolve whether the backing app for a provider is available +
		 * configured. See file docblock for the source order.
		 *
		 * @param {object} provider Normalised registry entry.
		 * @return {boolean}
		 */
		isAvailable(provider) {
			return resolveProviderAvailability(provider, { isAppInstalled }).available
		},

		/**
		 * The unavailable reason ('missing-app' | 'not-configured' |
		 * 'unknown') for empty-state copy.
		 *
		 * @param {object} provider Normalised registry entry.
		 * @return {string}
		 */
		unavailableReason(provider) {
			return resolveProviderAvailability(provider, { isAppInstalled }).reason
		},

		/**
		 * Props forwarded to a leaf's content component. Matches the
		 * shared shape consumed by the bespoke `Cn<X>Tab` components.
		 *
		 * @param {object} provider Normalised registry entry.
		 * @return {object}
		 */
		leafProps(provider) {
			return {
				integrationId: provider.id,
				register: this.resolvedRegister,
				schema: this.resolvedSchema,
				objectId: this.objectId !== '' && this.objectId !== null && this.objectId !== undefined
					? String(this.objectId)
					: '',
				objectType: this.objectType,
				apiBase: this.apiBase,
				surface: this.surface,
			}
		},

		selectTab(id) {
			this.activeId = id
		},

		/**
		 * Roving-tabindex keyboard nav per the ARIA tablist pattern:
		 * Left/Right move + activate, Home/End jump to the ends.
		 *
		 * @param {KeyboardEvent} event Key event.
		 * @param {number} index Index of the focused tab.
		 * @return {void}
		 */
		onTabKeydown(event, index) {
			const list = this.visibleProviders
			if (list.length === 0) {
				return
			}
			let next = -1
			if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
				next = (index + 1) % list.length
			} else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
				next = (index - 1 + list.length) % list.length
			} else if (event.key === 'Home') {
				next = 0
			} else if (event.key === 'End') {
				next = list.length - 1
			}
			if (next === -1) {
				return
			}
			event.preventDefault()
			const provider = list[next]
			this.activeId = provider.id
			this.$nextTick(() => {
				const el = this.$el && this.$el.querySelector(`#${this.tabId(provider)}`)
				if (el && typeof el.focus === 'function') {
					el.focus()
				}
			})
		},

		tabId(provider) {
			return `cn-iw-tab-${provider.id}`
		},

		panelId(provider) {
			return `cn-iw-panel-${provider.id}`
		},

		/**
		 * Accent tint for the active tab — a left border + subtle bg in
		 * the app's brand colour. Inactive tabs get no accent var.
		 *
		 * @param {object} provider Normalised registry entry.
		 * @return {object} Style object.
		 */
		tabAccentStyle(provider) {
			if (provider.id !== this.activeId || !provider.accentColor) {
				return {}
			}
			return { '--cn-iw-accent': provider.accentColor }
		},

		/**
		 * Accent tint for the single-mode header.
		 *
		 * @param {object} provider Normalised registry entry.
		 * @return {object} Style object.
		 */
		accentStyle(provider) {
			if (!provider.accentColor) {
				return {}
			}
			return { '--cn-iw-accent': provider.accentColor }
		},
	},
}
</script>

<style scoped>
.cn-integration-widget {
	width: 100%;
	display: flex;
	flex-direction: column;
	min-height: 0;
}

.cn-integration-widget__tabbar {
	display: flex;
	align-items: flex-end;
	gap: 8px;
	border-bottom: 1px solid var(--color-border);
	margin-bottom: 12px;
}

.cn-integration-widget__tabs {
	display: flex;
	flex-wrap: wrap;
	gap: 2px;
	flex: 1;
	min-width: 0;
}

.cn-integration-widget__tab {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 8px 12px;
	background: transparent;
	border: none;
	border-bottom: 2px solid transparent;
	border-radius: var(--border-radius) var(--border-radius) 0 0;
	color: var(--color-text-maxcontrast);
	font-size: 0.95em;
	cursor: pointer;
}

.cn-integration-widget__tab:hover {
	background: var(--color-background-hover);
	color: var(--color-main-text);
}

.cn-integration-widget__tab:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: -2px;
}

.cn-integration-widget__tab--active {
	color: var(--color-main-text);
	font-weight: 600;
	border-bottom-color: var(--cn-iw-accent, var(--color-primary-element));
}

.cn-integration-widget__tab-icon {
	color: var(--cn-iw-accent, currentColor);
	flex-shrink: 0;
}

.cn-integration-widget__tab-label {
	white-space: nowrap;
}

.cn-integration-widget__header {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 4px;
	margin-bottom: 8px;
	border-bottom: 2px solid var(--cn-iw-accent, var(--color-border));
}

.cn-integration-widget__header-icon {
	color: var(--cn-iw-accent, var(--color-main-text));
	flex-shrink: 0;
}

.cn-integration-widget__header-label {
	font-weight: 600;
	color: var(--color-main-text);
}

.cn-integration-widget__header-actions {
	margin-inline-start: auto;
	flex-shrink: 0;
}

.cn-integration-widget__panel {
	flex: 1;
	min-height: 0;
}

.cn-integration-widget__panel:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: -2px;
}
</style>
