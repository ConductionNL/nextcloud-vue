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
					testid-base="cn-tabs-widget" />
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
import { NcEmptyContent } from '@nextcloud/vue'
import CnIcon from '../CnIcon/CnIcon.vue'
import CnDetailWidgetHost from '../CnDetailWidgetHost/CnDetailWidgetHost.vue'
import { CnActionsMenu } from '../CnActionsMenu/index.js'
import CnTabs from '../CnTabs/CnTabs.vue'
import CnTab from '../CnTabs/CnTab.vue'
import { widgetTitleOf } from '../../utils/widgetDispatch.js'

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
		NcEmptyContent,
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
		}
	},

	computed: {
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
/* The strip IS the card's top edge. There is no title bar above it: the open
   tab names the panel, so a title row would say the same thing twice and cost
   a row of height on a card that is mostly content. Hence padding 0 here, with
   the inset moved onto the bar and the panel below. */
.cn-tabs-widget {
	background-color: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	overflow: hidden;
	padding: 0;
}

/* The bar carries its own inset so the first tab clears the card's rounded
   corner instead of colliding with it. */
.cn-tabs-widget__tabs :deep(.cn-tabs__bar) {
	padding: 8px 8px 0;
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
