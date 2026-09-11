<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-tabs-widget">
		<CnTabs
			:aria-label="stripLabel"
			class="cn-tabs-widget__tabs"
			@update:active-index="onTabChange">
			<!-- One Actions menu for the whole widget, bound to whichever child
			     is showing. This is the point of the component: six tabbed
			     widgets used to mean six card headers stacked down the page. -->
			<template #nav-end>
				<CnActionsMenu
					:show-refresh="showRefresh"
					:show-request-feature="showRequestFeature"
					:show-documentation="showDocumentation"
					:documentation-url="documentationUrl"
					:widget-id="activeWidgetId"
					:title="activeTitle"
					:surface="`widget:${activeWidgetId}`"
					refresh-channel="cn:widget:refresh"
					testid-base="cn-tabs-widget">
					<!-- The open panel's own items, below the built-in trio.
					     A panel draws no header, so these would otherwise have
					     nowhere to go: the data widget's Metadata and full edit
					     dialog vanished outright when the panel stopped drawing
					     a card. They are rendered here rather than rebuilt here
					     because `run` closes over the widget that published it,
					     which is what keeps the dialog's per-widget config and
					     the widget's own save path. See utils/panelActions.js.

					     Only the ACTIVE panel's items. `lazy` keeps a visited
					     tab mounted, so several panels publish at once and an
					     unfiltered list would offer actions for a sheet nobody
					     is looking at. -->
					<template v-if="activePanelActions.length" #action-items>
						<NcActionButton
							v-for="action in activePanelActions"
							:key="action.key"
							:close-after-click="true"
							@click="action.run()">
							<template #icon>
								<CnIcon :name="action.icon" :size="20" />
							</template>
							{{ action.label }}
						</NcActionButton>
					</template>
				</CnActionsMenu>
			</template>

			<CnTab
				v-for="(entry, index) in resolvedTabs"
				:key="entry.key"
				:active="index === activeIndex"
				lazy
				@click="activeIndex = index">
				<template #title>
					<span class="cn-tabs-widget__title">
						<CnIcon
							v-if="entry.icon"
							:name="entry.icon"
							:size="18"
							class="cn-tabs-widget__title-icon" />
						{{ entry.label }}
					</span>
				</template>

				<CnDetailWidgetHost
					v-if="entry.widget"
					:widget="entry.widget"
					chrome="bare"
					:object-id="objectId"
					:object="objectData"
					:object-type="objectType"
					:schema-object="schemaObject"
					:register="register"
					:schema="schema"
					:store="store"
					:surface="surface"
					:integration-context="integrationContext"
					:cn-registry="cnRegistry"
					@geo-saved="onGeoSaved"
					@open-integration="onOpenIntegration" />
				<NcEmptyContent v-else :name="missingLabel(entry)" />
			</CnTab>
		</CnTabs>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcActionButton, NcEmptyContent } from '@nextcloud/vue'
import CnIcon from '../CnIcon/CnIcon.vue'
import CnDetailWidgetHost from '../CnDetailWidgetHost/CnDetailWidgetHost.vue'
import { CnActionsMenu } from '../CnActionsMenu/index.js'
import CnTabs from '../CnTabs/CnTabs.vue'
import CnTab from '../CnTabs/CnTab.vue'
import { widgetTitleOf } from '../../utils/widgetDispatch.js'
import { PANEL_ACTION_SINK } from '../../utils/panelActions.js'

/**
 * CnTabsWidget — a widget that holds other widgets, one per tab.
 *
 * A detail page that carries notes, files, related records, sub-records, mail
 * and appointments renders six cards, each with its own header and its own
 * Actions menu, stacked down the page. All six say roughly the same thing about
 * one record, and only one of them is being read at a time. This widget puts
 * them behind a tab strip instead.
 *
 * ## What the tabs take over
 *
 * The strip owns the title and the card. A child renders through
 * `CnDetailWidgetHost` with `chrome="bare"`, so it draws no header and no
 * border of its own, and its content fills the panel exactly as it would have
 * filled its card. The tab label is what the widget's card header used to say.
 *
 * The Actions menu moves OUT of the panels and into the bar, beside the strip
 * rather than inside it, and rebinds to whichever child is showing. So there is
 * one menu, and it always acts on what you are looking at.
 *
 * ## Configuring it
 *
 * `content.tabs[]` names the children and their labels, so a deployment can
 * relabel or reorder tabs, or drop one, without touching code:
 *
 * ```js
 * content: {
 *   tabs: [
 *     { widgetId: 'case-notes', label: 'Notes', icon: 'NoteTextOutline' },
 *     { widgetId: 'case-files', label: 'Files and attachments' },
 *   ],
 * }
 * ```
 *
 * `label` and `icon` are optional and fall back to the child widget's own
 * title and icon, so the common case is a list of `widgetId`s.
 *
 * ## Panels are lazy, and stay mounted
 *
 * Each panel is a `CnTab` with `lazy`, so a child only mounts when its tab is
 * first opened. Six eager panels that each fetch on `mounted()` would fire six
 * requests on page load to answer five questions nobody asked. Once opened, a
 * panel stays mounted, so switching back never refetches.
 *
 * ## A named tab whose widget is missing
 *
 * The tab still renders, and its panel says which widget id did not resolve.
 * Dropping the tab would be worse: `content.tabs[]` is hand-authored config,
 * and a typo that silently removes a tab is a typo nobody finds.
 */
export default {
	name: 'CnTabsWidget',

	components: {
		CnActionsMenu,
		CnDetailWidgetHost,
		CnIcon,
		CnTab,
		CnTabs,
		NcActionButton,
		NcEmptyContent,
	},

	/**
	 * Offer the panels a way to put their own menu items in the strip's menu.
	 *
	 * Re-provided one level down by `CnDetailWidgetHost`, which knows the id to
	 * key by; see utils/panelActions.js for why the items travel up instead of
	 * being rebuilt here.
	 *
	 * @return {object} The provided sink.
	 */
	provide() {
		return {
			[PANEL_ACTION_SINK]: {
				/**
				 * Publish a panel's items, under one SOURCE.
				 *
				 * A panel has two possible publishers: the host, for an action
				 * the host itself would have drawn (the catalog Add), and the
				 * widget inside it, for its own menu items. Keyed by source so
				 * the two coexist; a single slot per widget meant whichever
				 * published last silently replaced the other.
				 *
				 * Replaces the map rather than mutating it so the computed that
				 * reads it re-evaluates on any change.
				 *
				 * @param {string} id The publishing widget's id.
				 * @param {object[]} items Its PanelAction descriptors.
				 * @param {string} [source] Who is publishing: `host` or `widget`.
				 * @return {void}
				 */
				set: (id, items, source = 'widget') => {
					if (!id) { return }
					const forId = { ...(this.panelActionsByWidget[id] || {}), [source]: items }
					this.panelActionsByWidget = { ...this.panelActionsByWidget, [id]: forId }
				},

				/**
				 * Withdraw one source's items, on unmount or when that
				 * publisher's own menu comes back. The other source's items
				 * stay.
				 *
				 * @param {string} id The publishing widget's id.
				 * @param {string} [source] Who is withdrawing.
				 * @return {void}
				 */
				clear: (id, source = 'widget') => {
					const forId = this.panelActionsByWidget[id]
					if (!forId || !(source in forId)) { return }
					const { [source]: _removed, ...keptSources } = forId
					if (Object.keys(keptSources).length) {
						this.panelActionsByWidget = { ...this.panelActionsByWidget, [id]: keptSources }
						return
					}
					const { [id]: _gone, ...rest } = this.panelActionsByWidget
					this.panelActionsByWidget = rest
				},
			},
		}
	},

	props: {
		/**
		 * The widget's config: `{ tabs, ariaLabel }`.
		 *
		 * `tabs[]` entries are `{ widgetId, label?, icon? }`. `label` and `icon`
		 * fall back to the referenced widget's own title and icon.
		 *
		 * @type {{ tabs?: Array<{widgetId: string, label?: string, icon?: string}>, ariaLabel?: string }}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * Every widget definition available on the surface, for `content.tabs[]`
		 * to reference by id.
		 *
		 * The surface passes its whole list rather than the resolved children
		 * because a tab may name a widget that does not exist, and this component
		 * has to be able to say so.
		 *
		 * @type {object[]}
		 */
		availableWidgets: {
			type: Array,
			default: () => [],
		},

		/** The bound record's id. */
		objectId: {
			type: [String, Number],
			default: '',
		},

		/** The loaded record, or null while it is still being fetched. */
		objectData: {
			type: Object,
			default: null,
		},

		/** The resolved object-type slug. */
		objectType: {
			type: String,
			default: '',
		},

		/** The resolved JSON Schema object, needed by a `data` child. */
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

		/** Rendering surface forwarded to integration children (AD-19). */
		surface: {
			type: String,
			default: 'detail-page',
		},

		/** Object context forwarded to integration children. */
		integrationContext: {
			type: Object,
			default: null,
		},

		/** The consumer's component registry, for custom child widget types. */
		cnRegistry: {
			type: Object,
			default: () => ({}),
		},

		/** Show the Refresh entry in the hoisted Actions menu. */
		showRefresh: {
			type: Boolean,
			default: true,
		},

		/** Show the Request-a-feature entry in the hoisted Actions menu. */
		showRequestFeature: {
			type: Boolean,
			default: true,
		},

		/** Show the Documentation entry in the hoisted Actions menu. */
		showDocumentation: {
			type: Boolean,
			default: true,
		},

		/** Documentation URL for the hoisted Actions menu. */
		documentationUrl: {
			type: String,
			default: '',
		},
	},

	emits: ['geo-saved', 'open-integration'],

	data() {
		return {
			activeIndex: 0,
			// Items published by the panels, keyed by widget id. Keyed rather
			// than a flat list because `lazy` keeps a visited tab mounted, so
			// more than one panel publishes at a time.
			panelActionsByWidget: {},
		}
	},

	computed: {
		/**
		 * The open panel's own menu items, or an empty list.
		 *
		 * @return {object[]} PanelAction descriptors for the active tab.
		 */
		activePanelActions() {
			const forId = this.panelActionsByWidget[this.activeWidgetId]
			if (!forId) { return [] }
			// Host first, then the widget's own: the catalog Add is about the
			// panel as a whole, the widget's items about what is in it.
			return [...(forId.host || []), ...(forId.widget || [])]
		},

		/**
		 * The configured tabs, each paired with the widget definition it names.
		 *
		 * @return {object[]} `{ key, widgetId, label, icon, widget }` per tab.
		 */
		resolvedTabs() {
			const tabs = Array.isArray(this.content?.tabs) ? this.content.tabs : []
			return tabs.map((tab, index) => {
				const widgetId = typeof tab === 'string' ? tab : tab?.widgetId
				const widget = this.availableWidgets.find((w) => w && w.id === widgetId) || null
				return {
					key: `${widgetId || 'tab'}-${index}`,
					widgetId,
					label: (tab && tab.label) || widgetTitleOf(widget) || widgetId || '',
					icon: (tab && tab.icon) || widget?.icon || '',
					widget,
				}
			})
		},

		/**
		 * The tab currently showing.
		 *
		 * @return {object|null} The resolved tab, or null when there are none.
		 */
		activeTab() {
			return this.resolvedTabs[this.activeIndex] || null
		},

		/**
		 * The active child's id, so the hoisted Refresh reaches THAT child's
		 * fetch over `cn:widget:refresh` rather than a sibling's.
		 *
		 * @return {string} The active widget id.
		 */
		activeWidgetId() {
			return this.activeTab?.widgetId || ''
		},

		/**
		 * The active child's label, so the Actions menu names what it acts on.
		 *
		 * @return {string} The active tab's label.
		 */
		activeTitle() {
			return this.activeTab?.label || ''
		},

		/**
		 * Accessible name for the tab strip.
		 *
		 * @return {string} The aria-label.
		 */
		stripLabel() {
			return this.content?.ariaLabel || t('nextcloud-vue', 'Details')
		},
	},

	methods: {
		/**
		 * Re-emit a geo child's save so the surface can reload the record.
		 *
		 * @param {object} geo The saved geometry.
		 * @return {void}
		 */
		onGeoSaved(geo) {
			/**
			 * @event geo-saved Re-emitted from a geo child that saved a geometry.
			 * @type {object}
			 */
			this.$emit('geo-saved', geo)
		},

		/**
		 * Re-emit a related child's request to open an integration.
		 *
		 * @param {string} integrationId The integration to open.
		 * @return {void}
		 */
		onOpenIntegration(integrationId) {
			/**
			 * @event open-integration Re-emitted from a related child asking to open an integration.
			 * @type {string}
			 */
			this.$emit('open-integration', integrationId)
		},

		/**
		 * Follow the strip's own selection, so keyboard navigation moves the
		 * hoisted Actions menu too.
		 *
		 * @param {number} index The newly selected tab index.
		 * @return {void}
		 */
		onTabChange(index) {
			if (typeof index === 'number' && index >= 0) {
				this.activeIndex = index
			}
		},

		/**
		 * Empty-state text for a tab whose widget id resolves to nothing.
		 *
		 * @param {object} entry The resolved tab.
		 * @return {string} The message.
		 */
		missingLabel(entry) {
			return t('nextcloud-vue', 'No widget found for "{id}"', { id: entry.widgetId || '' })
		},
	},
}
</script>

<style scoped>
/* The panel is the card; the strip is not inside it. There is no title bar
   above the tabs either: the open tab names the panel, so a title row would
   say the same thing twice and cost a row of height on a card that is mostly
   content.

   The card chrome used to wrap the strip as well, which drew a border and a
   pair of rounded corners ABOVE the tabs and boxed them in. Folder tabs are
   drawn as the edge of the sheet they open, so a second edge around them
   reads as a header the widget does not have. Border, radius and background
   now live on the panel below, and the strip sits bare on the page. */
/* The class is doubled on purpose, and the four properties below are RESET
   rather than simply omitted.

   Nextcloud serves every enabled app's assets on every page, each app bundles
   this library's compiled CSS, and the Vue scope id is derived from the file
   PATH, so `data-v-1dbd6122` is byte-identical across library versions. An app
   still on an older release therefore ships a rule with exactly this selector
   and the OLD declarations, and it lands on the pages of an app already on the
   new one. Measured on a dossiq case page: three stale copies of the pre-fix
   rule, one from hermiq's `companion.css` (its companion bundle loads on every
   page by design) and two inline from other apps' bundles. Same specificity,
   so source order decided, and the card border came back around the strip.

   Dropping a declaration cannot beat a rule that sets it, so `border` and the
   rest are explicitly zeroed. Doubling the class takes this selector to
   (0,3,0) against the stale (0,2,0), which wins on specificity rather than on
   `!important` or on load order this library does not control. The same
   technique, for the same reason, is used on `.cn-tabs__nav .cn-tabs__nav-item`
   in CnTabs to beat Nextcloud's own button margin. */
.cn-tabs-widget.cn-tabs-widget {
	background-color: transparent;
	border: 0;
	border-radius: 0;
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	overflow: visible;
	padding: 0;
}

/* No inset, so the first tab starts at the panel's own left edge. The 8px
   here was there to clear the card's rounded top corner; that corner is gone
   from the strip now, and the inset it existed for left the first tab floating
   8px inside the sheet it opens. The bar's bottom rule closes the panel either
   way: padding sits inside the border box, so it never shortened the rule. */
.cn-tabs-widget__tabs :deep(.cn-tabs__bar) {
	padding: 0;
}

.cn-tabs-widget__tabs {
	display: flex;
	flex-direction: column;
	min-height: 0;
}

/* The panel area is the scroll region, so the strip stays put while a long
   child scrolls under it.

   `padding-top: 0` overrides CnTabs' own 12px: the open tab is drawn joined to
   the panel, and a gap under it breaks that join, leaving the tab floating
   above content it is supposed to be attached to. */
.cn-tabs-widget__tabs :deep(.cn-tabs__content) {
	background-color: var(--color-main-background);
	/* Three sides only: the bar's own bottom rule is this sheet's top edge, and
	   the open tab erases the slice of it directly above the panel so the two
	   read as one surface. A border-top here would put a second line under that
	   tab which the tab cannot paint over. */
	border: 1px solid var(--color-border);
	border-top: none;
	/* Bottom corners only. Rounding the top would curl the sheet away from the
	   tab that is supposed to be joined to it. */
	border-radius: 0 0 var(--border-radius-large) var(--border-radius-large);
	flex: 1 1 auto;
	min-height: 0;
	overflow: auto;
	padding: 0 12px 12px;
}

.cn-tabs-widget__tabs :deep(.cn-tab) {
	height: 100%;
}

.cn-tabs-widget__title {
	align-items: center;
	display: inline-flex;
	gap: 6px;
}

.cn-tabs-widget__title-icon {
	flex: 0 0 auto;
}
</style>
