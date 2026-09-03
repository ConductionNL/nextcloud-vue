<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-detail-widget-host" :class="`cn-detail-widget-host--${chrome}`">
		<!-- `type: 'data'` — the schema-driven data widget. Always keeps its own
		     chrome, including in bare mode: its header carries the Save button
		     for inline edits, and CnWidgetWrapper's actions live INSIDE the
		     header, so hiding the header would hide Save. See the docblock. -->
		<!-- `requiredApp` names another Nextcloud app this widget leans on. When
		     that app is absent the widget renders its NORMAL chrome plus a
		     set-up state, and asks its backend NOTHING.

		     It renders rather than hides on purpose. A hidden widget leaves a
		     hole a reader cannot interpret, and the alternative — letting the
		     query run — is worse: an aggregation over an absent app's register
		     404s and the tile shows `0`, which is exactly what a real zero
		     shows. dossiq's hours tile did that on every install without
		     humaniq, and looked correct doing it. -->
		<CnWidgetWrapper
			v-if="missingApp"
			:title="isBare ? '' : widgetTitle"
			:show-title="!isBare"
			title-icon-position="left"
			:show-refresh="false"
			:show-request-feature="false">
			<template v-if="widget && widget.icon" #title-icon>
				<CnIcon :name="widget.icon" :size="20" />
			</template>
			<NcEmptyContent :name="missingAppName" :description="missingAppDescription">
				<template #icon>
					<CnIcon :name="(widget && widget.icon) || 'PuzzleOutline'" :size="44" />
				</template>
			</NcEmptyContent>
		</CnWidgetWrapper>

		<CnObjectDataWidget
			v-else-if="isData && schemaObject"
			:title="resolvedTitle"
			:icon="widget.icon || null"
			:schema="schemaObject"
			:object-data="object"
			:object-type="objectType"
			:store="store"
			:overrides="content.overrides || {}"
			:include="content.include || null"
			:exclude="content.exclude || []"
			:hide-empty="content.hideEmpty === true || hideEmpty"
			:columns="content.columns || 3"
			:editable="content.editable !== false" />

		<!-- `type: 'related'` — resolves this object's relations and links into
		     integrations. Honours bare mode via its own `bare` prop. -->
		<CnRelatedObjectsWidget
			v-else-if="isRelated"
			:title="resolvedTitle"
			:bare="isBare"
			:object-type="objectType"
			:object-id="objectId"
			:object-data="object"
			:register="register"
			:schema="schema"
			:store="store"
			:include-groups="content.groups || []"
			:hide-single-tab-title="content.hideSingleTabTitle !== false"
			:show-total-count="content.showTotalCount !== false"
			@open-integration="onOpenIntegration" />

		<!-- `type: 'object-geo'` — view/edit the object's `@self.geo` on a map. -->
		<CnObjectGeoWidget
			v-else-if="isGeo"
			:title="resolvedTitle"
			:object-id="objectId"
			:object-data="object"
			:register="register"
			:schema="schema"
			:editable="content.editable !== false"
			:address-search="content.addressSearch === true"
			:basemap="content.basemap || 'standard'"
			:allow-basemap-switch="content.allowBasemapSwitch === true"
			:fit-control="content.fitControl !== false"
			:locate-control="content.locateControl !== false"
			:fullscreen-control="content.fullscreenControl !== false"
			:height="content.height || '360px'"
			:default-zoom="content.defaultZoom || 7"
			@saved="onGeoSaved" />

		<!-- Mount-mode integration leaf (openregister#2127): a bare host-owned
		     element the leaf mounts its own framework into. -->
		<CnLeafMountHost
			v-else-if="isMountIntegration"
			:provider="integrationProvider"
			:mount-props="integrationMountProps" />

		<!-- Integration leaf, component mode. In BARE mode this renders the
		     provider's `tab` (its bare content) rather than its `widget` (which
		     draws its own card). That pairing is not an invention here:
		     CnIntegrationWidget already renders `provider.tab` inside its own
		     tab panels for exactly this reason. -->
		<component
			:is="integrationComponent"
			v-else-if="isIntegration && integrationComponent"
			v-bind="integrationProps" />

		<!-- Content-only catalog widgets (object-list / table / files) render
		     bare tables. On a card surface they get the titled wrapper (ADR-062:
		     every body widget has chrome and its manifest title); inside a tab
		     the strip supplies both, so they render as-is.

		     The `cn-detail-page__*` classes here and below keep their old names
		     although the markup moved out of CnDetailPage: src/css/detail-page.css
		     targets them, and so may consumer app CSS. Renaming them to match this
		     component would be a silent visual regression across the fleet. -->
		<CnWidgetWrapper
			v-else-if="renderer && isContentOnly && !isBare"
			:title="widget.title || ''"
			title-icon-position="left"
			:show-refresh="false"
			:show-request-feature="false"
			class="cn-detail-page__catalog-card">
			<template v-if="widget.icon" #title-icon>
				<CnIcon :name="widget.icon" :size="20" />
			</template>
			<template v-if="catalogAddEnabled" #action-items>
				<NcActionButton @click="invokeCatalogAdd">
					<template #icon>
						<Plus :size="20" />
					</template>
					{{ addLabel }}
				</NcActionButton>
			</template>
			<component
				:is="renderer"
				ref="renderer"
				v-bind="rendererProps" />
		</CnWidgetWrapper>

		<!-- Registry "card" widgets (stat / gauge / delta) render bare tile
		     content, so on a card surface they need the same titled wrapper the
		     dashboard gives them (ADR-062: a lone stat must not read as uncarded
		     floating text). `card-fit` centres the tile and drops the inner
		     scrollbar. -->
		<CnWidgetWrapper
			v-else-if="renderer && isCard && !isBare"
			:title="widget.title || content.title || ''"
			:show-title="effectiveShowCardTitle"
			title-icon-position="left"
			flush
			:show-refresh="false"
			:show-request-feature="false"
			class="cn-detail-page__card-fit">
			<template v-if="widget.icon" #title-icon>
				<CnIcon :name="widget.icon" :size="20" />
			</template>
			<component :is="renderer" :content="content" v-bind="content" />
		</CnWidgetWrapper>

		<!-- Every other content-driven catalog widget, and every bare-mode
		     catalog widget. These self-fetch from OpenRegister. The object
		     context is forwarded too (the same shape CnWidgetGrid merges on the
		     v2 widgets[] path) so object-aware widgets receive it; widgets that
		     declare none of those props ignore them. `content` spreads LAST so
		     explicit widget config still wins. -->
		<component
			:is="renderer"
			v-else-if="renderer"
			ref="renderer"
			v-bind="rendererProps" />

		<!-- No renderer resolves: render nothing, which is what CnDetailPage has
		     always done here. Surfacing an "unknown widget" box instead would be
		     more honest, but this is the SLOT FALLBACK for every detail page in
		     the fleet, so an app that declares a custom widget and omits its
		     `#widget-<id>` slot would start showing a placeholder where it shows
		     nothing today. That is its own change, not a side effect of this one. -->
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcActionButton, NcEmptyContent } from '@nextcloud/vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import CnIcon from '../CnIcon/CnIcon.vue'
import CnLeafMountHost from '../CnLeafMountHost/CnLeafMountHost.vue'
import CnObjectDataWidget from '../CnObjectDataWidget/CnObjectDataWidget.vue'
import CnObjectGeoWidget from '../CnObjectGeoWidget/CnObjectGeoWidget.vue'
import CnRelatedObjectsWidget from '../CnRelatedObjectsWidget/CnRelatedObjectsWidget.vue'
import { CnWidgetWrapper } from '../CnWidgetWrapper/index.js'
import { isAppInstalled } from '../../utils/appInstalled.js'
import { getWidgetTypeEntry } from '../CnWidgetGrid/dashboardWidgetRegistry.js'
import { useIntegrationRegistry } from '../../composables/useIntegrationRegistry.js'
import {
	isCardWidgetDef,
	isContentOnlyWidgetDef,
	isDataWidgetDef,
	isGeoWidgetDef,
	isIntegrationWidgetDef,
	isRelatedWidgetDef,
	resolveRegistryRenderer,
	widgetContentOf,
	widgetTitleOf,
} from '../../utils/widgetDispatch.js'

/**
 * CnDetailWidgetHost — renders ONE detail-page widget definition.
 *
 * This is the dispatch that used to be a ~230-line `v-if` chain inside
 * `CnDetailPage`'s grid slot. It moved out when a second surface needed it:
 * `CnTabsWidget` renders the same widget definitions inside tab panels, and
 * two copies of "which renderer does this type get" is the kind of thing that
 * drifts silently. A type added to one and not the other renders correctly on
 * the page and blank in a tab, with nothing in the console either way.
 *
 * ## The two chrome modes
 *
 * `chrome="card"` is the detail-page grid: every widget gets a titled card,
 * because ADR-062 rule 5 says every body widget carries chrome and its manifest
 * title.
 *
 * `chrome="bare"` is a tab panel. The tab strip already shows the title and
 * draws the card, so a second title inside the panel reads as a heading nested
 * in its own heading. Bare mode therefore drops the wrapper and, for
 * integration leaves, renders the provider's `tab` (bare content) instead of
 * its `widget` (which draws its own card). That pairing is not new: it is
 * exactly what `CnIntegrationWidget` already does inside its own panels.
 *
 * ## What bare mode deliberately does NOT strip
 *
 * The `data` widget keeps its chrome in both modes. `CnWidgetWrapper` renders
 * its actions INSIDE the header, and `CnObjectDataWidget` puts its **Save**
 * button there, so suppressing the header to remove a duplicate title would
 * also remove the only way to commit an inline edit. A silently unsaveable
 * form is a worse outcome than a doubled title, so the title stays.
 *
 * ```vue
 * <CnDetailWidgetHost
 *   :widget="def"
 *   :object-id="id"
 *   :object="record"
 *   register="dossiq"
 *   schema="case"
 *   chrome="bare" />
 * ```
 */
export default {
	name: 'CnDetailWidgetHost',

	components: {
		CnIcon,
		CnLeafMountHost,
		CnObjectDataWidget,
		CnObjectGeoWidget,
		CnRelatedObjectsWidget,
		CnWidgetWrapper,
		NcActionButton,
		NcEmptyContent,
		Plus,
	},

	props: {
		/**
		 * The resolved widget definition: `{ id, type, title, icon, content }`,
		 * plus `integrationId` for `type: 'integration'`.
		 *
		 * Resolved, not a layout item: turning an item into a definition needs
		 * the surface's own widget list, which is the one part the two surfaces
		 * genuinely do differently.
		 *
		 * @type {object}
		 */
		widget: {
			type: Object,
			required: true,
		},
		/**
		 * How much chrome to draw around the widget.
		 * - `'card'` — a titled `CnWidgetWrapper`, the detail-page grid default.
		 * - `'bare'` — no wrapper; the caller owns the title and the card.
		 */
		chrome: {
			type: String,
			default: 'card',
			validator: (v) => ['card', 'bare'].includes(v),
		},
		/** The bound record's id. Present on the first render; `object` is not. */
		objectId: {
			type: [String, Number],
			default: '',
		},
		/** The loaded record, or null while it is still being fetched. */
		object: {
			type: Object,
			default: null,
		},
		/** The resolved object-type slug. */
		objectType: {
			type: String,
			default: '',
		},
		/** The resolved JSON Schema object, needed by the `data` widget. */
		schemaObject: {
			type: Object,
			default: null,
		},
		/** OpenRegister register slug of the surface. */
		register: {
			type: [String, Object],
			default: '',
		},
		/** OpenRegister schema slug of the surface. */
		schema: {
			type: [String, Object],
			default: '',
		},
		/** The effective object store. */
		store: {
			type: Object,
			default: null,
		},
		/** Rendering surface forwarded to integration widgets (AD-19). */
		surface: {
			type: String,
			default: 'detail-page',
		},
		/** Object context forwarded to integration widgets. */
		integrationContext: {
			type: Object,
			default: null,
		},
		/** Hide empty properties in the `data` widget. */
		hideEmpty: {
			type: Boolean,
			default: false,
		},
		/**
		 * Every widget definition on the surface, for a CONTAINER widget to
		 * resolve the children it references by id.
		 *
		 * Only container types receive it (see `rendererProps`). A leaf widget
		 * has no business knowing what else is on the page.
		 *
		 * @type {object[]}
		 */
		availableWidgets: {
			type: Array,
			default: () => [],
		},
		/**
		 * Whether a card widget (stat / gauge / delta) draws the wrapper header.
		 *
		 * A prop, not a computed, because the rule reads the LAYOUT item's
		 * `showTitle` and only the surface holds the layout. Deriving it from the
		 * widget definition alone silently drops `showTitle: false`, which is the
		 * one way a consumer can stop a card printing its title twice: the tile
		 * already draws `content.label` itself.
		 *
		 * Null means "decide from the definition", which is what a surface with
		 * no layout (a tab panel) wants.
		 *
		 * @type {boolean|null}
		 */
		showCardTitle: {
			type: Boolean,
			default: null,
		},
		/**
		 * The consumer's component registry, consulted before the built-in
		 * catalog so a custom widget type overrides a built-in (REQ-MVR-005).
		 *
		 * @type {object}
		 */
		cnRegistry: {
			type: Object,
			default: () => ({}),
		},
	},

	emits: ['geo-saved', 'open-integration'],

	setup() {
		const { resolveWidget, getById } = useIntegrationRegistry()
		return { resolveRegistryWidget: resolveWidget, getRegistryProvider: getById }
	},

	computed: {
		/**
		 * Whether the caller owns the title and card.
		 *
		 * @return {boolean} true in bare mode.
		 */
		isBare() {
			return this.chrome === 'bare'
		},

		/**
		 * The widget's stored config blob.
		 *
		 * @return {object} The `content`, or an empty object.
		 */
		content() {
			return widgetContentOf(this.widget)
		},

		/**
		 * The title to render. Undefined in bare mode so a self-chromed widget
		 * does not repeat what the tab strip already says.
		 *
		 * @return {string|undefined} The title, or undefined.
		 */
		resolvedTitle() {
			return this.isBare ? undefined : widgetTitleOf(this.widget)
		},

		/**
		 * The app this widget leans on, if it declares one.
		 *
		 * Read from the widget definition first and its `content` second, so a
		 * manifest may put it wherever the rest of that widget's config lives.
		 *
		 * @return {string} A Nextcloud app id, or ''.
		 */
		requiredApp() {
			// `widget` is declared required, but CnDetailPage renders a host for
			// a layout item whose widget id resolves to nothing — and there is a
			// test that it must not throw for one. This computed runs in the
			// render path BEFORE the branches that tolerate a missing widget, so
			// it is the one that has to survive it.
			return (this.widget || {}).requiredApp || this.content.requiredApp || ''
		},

		/**
		 * Whether this widget's backing app is declared and absent.
		 *
		 * @return {boolean} true when the widget must render its set-up state.
		 */
		missingApp() {
			return this.requiredApp !== '' && !isAppInstalled(this.requiredApp)
		},

		/**
		 * The widget's title, independent of chrome mode.
		 *
		 * `resolvedTitle` is deliberately undefined in bare mode so a tabbed
		 * widget does not repeat what the strip already says. The set-up state
		 * still needs the name to say WHICH widget is inert.
		 *
		 * @return {string} The manifest title.
		 */
		widgetTitle() {
			return widgetTitleOf(this.widget) || ''
		},

		/**
		 * Headline for the set-up state.
		 *
		 * @return {string} e.g. "Humaniq is not installed".
		 */
		missingAppName() {
			return t('nextcloud-vue', '{app} is not installed', { app: this.requiredAppLabel })
		},

		/**
		 * Body for the set-up state, naming what the reader is NOT seeing.
		 *
		 * @return {string} The description.
		 */
		missingAppDescription() {
			return this.widgetTitle
				? t('nextcloud-vue', '{title} needs the {app} app. Install and enable it to see this.', {
					title: this.widgetTitle,
					app: this.requiredAppLabel,
				})
				: t('nextcloud-vue', 'Install and enable the {app} app to see this.', {
					app: this.requiredAppLabel,
				})
		},

		/**
		 * The app id as a display name — `humaniq` reads as `Humaniq`.
		 *
		 * @return {string} The capitalised app id.
		 */
		requiredAppLabel() {
			return this.requiredApp.charAt(0).toUpperCase() + this.requiredApp.slice(1)
		},

		/** @return {boolean} true for `type: 'data'`. */
		isData() {
			return isDataWidgetDef(this.widget)
		},

		/** @return {boolean} true for `type: 'related'`. */
		isRelated() {
			return isRelatedWidgetDef(this.widget)
		},

		/** @return {boolean} true for `type: 'object-geo'`. */
		isGeo() {
			return isGeoWidgetDef(this.widget)
		},

		/** @return {boolean} true for a registered integration leaf. */
		isIntegration() {
			return isIntegrationWidgetDef(this.widget)
		},

		/** @return {boolean} true for object-list / table / files. */
		isContentOnly() {
			return isContentOnlyWidgetDef(this.widget)
		},

		/** @return {boolean} true when the registry entry declares `card`. */
		isCard() {
			return isCardWidgetDef(this.widget)
		},

		/**
		 * The registered renderer for a content-driven catalog type.
		 *
		 * @return {object|null} The component, or null.
		 */
		renderer() {
			return resolveRegistryRenderer(this.widget, this.cnRegistry)
		},

		/**
		 * The integration descriptor behind an `integration` widget.
		 *
		 * @return {object|null} The provider, or null.
		 */
		integrationProvider() {
			if (!this.isIntegration || typeof this.getRegistryProvider !== 'function') {
				return null
			}
			return this.getRegistryProvider(this.widget.integrationId)
		},

		/**
		 * Whether the integration is a mount-mode leaf (ADR-066), rendered
		 * through CnLeafMountHost rather than as a component.
		 *
		 * @return {boolean} true for a mount-mode leaf.
		 */
		isMountIntegration() {
			const provider = this.integrationProvider
			return Boolean(provider)
				&& provider.renderMode === 'mount'
				&& typeof provider.mount === 'function'
				&& typeof provider.unmount === 'function'
		},

		/**
		 * The component for a component-mode integration leaf. Bare mode takes
		 * the provider's `tab`, which is its content without a card.
		 *
		 * @return {object|null} The component, or null.
		 */
		/**
		 * Whether this render is using a provider's widget as its bare surface.
		 *
		 * @return {boolean} True when bare AND the provider opted in.
		 */
		usesBareWidget() {
			return !!(this.isBare && this.integrationProvider?.bareWidget && this.integrationProvider?.widget)
		},

		integrationComponent() {
			if (!this.isIntegration) return null
			// `bareWidget` lets a provider say its WIDGET is already bare, so a
			// tab panel gets the widget surface instead of the sidebar one.
			// The default below (prefer `tab`) assumes every `widget` draws its
			// own card, which is not true: `notes`' widget is an adapter around
			// CnNotesCard, whose root carries no border, background or padding.
			// Preferring `tab` there swapped an inline compose textarea for the
			// sidebar's collapsed "Add note" button and dressed the panel in
			// sidebar CSS, which is what made the tabbed leaves look like they
			// had lost their styling. Opt-in rather than a blanket switch: the
			// other providers keep today's behaviour until each is checked.
			if (this.usesBareWidget) {
				return this.integrationProvider.widget
			}
			if (this.isBare && this.integrationProvider?.tab) {
				return this.integrationProvider.tab
			}
			if (typeof this.resolveRegistryWidget !== 'function') return null
			return this.resolveRegistryWidget(this.widget.integrationId, this.surface)
		},

		/**
		 * The object context every integration surface is handed.
		 *
		 * @return {object} `{ register, schema, objectId }`.
		 */
		derivedIntegrationContext() {
			return this.integrationContext || {
				register: this.register || '',
				schema: this.schema || this.objectType || '',
				objectId: this.objectId ? String(this.objectId) : '',
			}
		},

		/**
		 * Props for an integration widget or tab.
		 *
		 * The title is forwarded because `CnIntegrationCard`'s `cardTitle` falls
		 * back to the raw `integrationId` without it, so a widget the manifest
		 * calls "Class space" rendered as "talk". It is placed BEFORE `def.props`
		 * so an explicit per-widget prop still wins.
		 *
		 * @return {object} The prop bag.
		 */
		integrationProps() {
			return {
				surface: this.surface,
				title: this.widget?.title || '',
				// A provider opting into `bareWidget` is being rendered where the
				// tab strip already supplies the card and the title, so tell it to
				// drop its own. Without this the panel gets a titled card inside
				// the tabs card, repeating the label the open tab already shows.
				...(this.usesBareWidget ? { chromeless: true } : {}),
				...this.derivedIntegrationContext,
				...(this.widget?.props || {}),
			}
		},

		/**
		 * Props handed to a mount-mode leaf.
		 *
		 * @return {object} The mount prop bag.
		 */
		integrationMountProps() {
			return {
				surface: this.surface,
				...this.derivedIntegrationContext,
				integrationContext: this.derivedIntegrationContext,
				...(this.widget?.props || {}),
			}
		},

		/**
		 * Props for a catalog renderer: its content plus the object context, in
		 * the shape CnWidgetGrid merges on the v2 widgets[] path. `content`
		 * spreads last so explicit widget config still wins.
		 *
		 * @return {object} The prop bag.
		 */
		rendererProps() {
			const base = {
				content: this.content,
				objectId: this.objectId,
				register: this.register,
				schema: this.schema,
				objectData: this.object,
				objectType: this.objectType,
				store: this.store,
			}
			// A container widget renders other widgets, so it needs what a
			// surface knows and a leaf does not: the sibling definitions to
			// resolve its children against, and the context those children will
			// need. Handing this to every widget instead would put objects on
			// the DOM as stringified attributes for the ones that ignore them.
			if (this.isContainer) {
				Object.assign(base, {
					availableWidgets: this.availableWidgets,
					schemaObject: this.schemaObject,
					integrationContext: this.integrationContext,
					cnRegistry: this.cnRegistry,
					surface: this.surface,
				})
			}
			return { ...base, ...this.content }
		},

		/**
		 * Whether the type declares itself a container (registry `container`).
		 *
		 * @return {boolean} true for a widget that renders other widgets.
		 */
		isContainer() {
			if (!this.widget?.type) return false
			const entry = getWidgetTypeEntry(this.widget.type)
			return Boolean(entry && entry.container === true)
		},

		/**
		 * Whether a catalog list widget offers the Add action (ADR-062:
		 * collections carry their create affordance in the card's Actions menu).
		 * Files widgets carry their own upload toolbar, so they are excluded.
		 *
		 * @return {boolean} true when Add should render.
		 */
		catalogAddEnabled() {
			if (!['object-list', 'table'].includes(this.widget?.type)) return false
			return this.content.allowCreate !== false
		},

		/**
		 * The card header rule, with the surface's layout-driven answer winning
		 * when it supplied one.
		 *
		 * @return {boolean} true when the wrapper header renders.
		 */
		effectiveShowCardTitle() {
			if (this.showCardTitle !== null) return this.showCardTitle
			return this.widget?.title !== undefined || this.content.title !== undefined
		},

		/** @return {string} Label for the catalog Add action. */
		addLabel() {
			return t('nextcloud-vue', 'Add')
		},
	},

	methods: {
		/**
		 * Re-emit the geo widget's save so the surface can reload the record.
		 *
		 * @param {object} geo The saved geometry.
		 * @return {void}
		 */
		onGeoSaved(geo) {
			/**
			 * @event geo-saved Emitted when the geo widget saved a geometry.
			 * @type {object}
			 */
			this.$emit('geo-saved', geo)
		},

		/**
		 * Re-emit the related widget's request to open an integration.
		 *
		 * @param {string} integrationId The integration to open.
		 * @return {void}
		 */
		onOpenIntegration(integrationId) {
			/**
			 * @event open-integration Emitted when the related widget asks to open an integration.
			 * @type {string}
			 */
			this.$emit('open-integration', integrationId)
		},

		/**
		 * Delegate to the rendered list widget's own create affordance, so the
		 * card's Add action and the widget's footer button open the same form.
		 *
		 * @return {void}
		 */
		invokeCatalogAdd() {
			const child = this.$refs.renderer
			const target = Array.isArray(child) ? child[0] : child
			if (target && typeof target.openCreate === 'function') {
				target.openCreate()
			}
		},
	},
}
</script>

<style scoped>
.cn-detail-widget-host,
.cn-detail-widget-host > * {
	height: 100%;
}

/* A bare host is a tab panel's body: it fills the panel and lets the panel
   scroll, rather than growing a second scroll region of its own. */
.cn-detail-widget-host--bare {
	min-height: 0;
}
</style>
