<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-tabs-widget">
		<CnTabs
			:aria-label="stripLabel"
			:moreLabel="moreLabel"
			:variant="stripVariant"
			:overflowInNavEnd="isBoard"
			class="cn-tabs-widget__tabs"
			@update:activeIndex="onTabChange">
			<!-- One Actions menu for the whole widget, bound to whichever child
			     is showing. This is the point of the component: six tabbed
			     widgets used to mean six card headers stacked down the page. -->
			<template #nav-end>
				<!-- The open panel's header link ("All sales invoices"): a panel
				     draws no card header, so the link its widget declares is
				     drawn here, and changes with the tab. -->
				<component
					:is="activeHeaderLinkTarget.tag"
					v-if="activeHeaderLinkTarget.tag"
					class="cn-tabs-widget__header-link"
					data-testid="cn-tabs-widget-header-link"
					v-bind="activeHeaderLinkTarget.attrs">
					{{ cnTranslate(activeHeaderLink.label) }}
				</component>
				<CnActionsMenu
					v-if="showActions || menuTabs.length"
					:showRefresh="showActions && showRefresh"
					:showRequestFeature="showActions && showRequestFeature"
					:showDocumentation="showActions && showDocumentation"
					:showReportBug="showActions"
					:documentationUrl="documentationUrl"
					:widgetId="activeWidgetId"
					:title="activeTitle"
					:variant="isBoard ? 'secondary' : undefined"
					:surface="`widget:${activeWidgetId}`"
					refreshChannel="cn:widget:refresh"
					testidBase="cn-tabs-widget">
					<!-- Board look: the tabs that are not in the strip, at the
					     top of the menu, in place of a "More" button. -->
					<template v-if="menuTabs.length" #lead-items>
						<NcActionButton
							v-for="entry in menuTabs"
							:key="entry.key"
							:disabled="entry.pending || null"
							:closeAfterClick="true"
							data-testid="cn-tabs-widget-menu-tab"
							@click="openMenuTab(entry)">
							{{ menuTabLabel(entry) }}
						</NcActionButton>
						<NcActionSeparator v-if="showActions" />
					</template>
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
					<template v-if="showActions && activePanelActions.length" #action-items>
						<NcActionButton
							v-for="action in activePanelActions"
							:key="action.key"
							:closeAfterClick="true"
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
				:title="entry.label"
				:count="entry.count"
				:countLabel="entry.unreadLabel"
				:overflow="entry.overflow"
				:disabled="entry.pending"
				lazy
				@click="activeIndex = index">
				<template #title>
					<span class="cn-tabs-widget__title">
						<CnIcon
							v-if="entry.icon && !isBoard"
							:name="entry.icon"
							:size="18"
							class="cn-tabs-widget__title-icon" />
						{{ entry.label }}
						<NcLoadingIcon
							v-if="entry.pending"
							:size="14"
							:name="loadingLabel"
							data-testid="cn-tabs-widget-pending" />
					</span>
				</template>

				<!-- A stack (`widgetIds`): every widget is a titled card; the
				     first joins the open tab, the next ones stand below it. -->
				<div
					v-if="entry.widget && entry.isStack"
					class="cn-tabs-widget__stack"
					:class="{ 'cn-tabs-widget__stack--grid': !!entry.grid }"
					data-testid="cn-tabs-widget-stack">
					<div class="cn-tabs-widget__stack-first" :style="spanStyle(entry.grid, 0)">
						<CnDetailWidgetHost
							:widget="entry.widget"
							chrome="card"
							:showCardTitle="true"
							:showActions="false"
							:availableWidgets="availableWidgets"
							:objectId="objectId"
							:object="objectData"
							:objectType="objectType"
							:schemaObject="schemaObject"
							:register="register"
							:schema="schema"
							:store="store"
							:surface="surface"
							:integrationContext="integrationContext"
							:cnRegistry="cnRegistry"
							@geoSaved="onGeoSaved"
							@openIntegration="onOpenIntegration"
							@selectObject="onSelectObject" />
					</div>
					<div
						v-for="(child, childIndex) in entry.stack"
						:key="`${entry.key}-${child.id}`"
						class="cn-tabs-widget__stack-item"
						:style="spanStyle(entry.grid, childIndex + 1)"
						:data-testid="`cn-tabs-widget-stack-${child.id}`">
						<CnDetailWidgetHost
							:widget="child"
							chrome="card"
							:showCardTitle="true"
							:showHeaderLink="true"
							:showActions="false"
							:availableWidgets="availableWidgets"
							:objectId="objectId"
							:object="objectData"
							:objectType="objectType"
							:schemaObject="schemaObject"
							:register="register"
							:schema="schema"
							:store="store"
							:surface="surface"
							:integrationContext="integrationContext"
							:cnRegistry="cnRegistry"
							@geoSaved="onGeoSaved"
							@openIntegration="onOpenIntegration"
							@selectObject="onSelectObject" />
					</div>
				</div>
				<template v-else-if="entry.widget">
					<!-- A single widget with a title of its own heads its panel
					     (DqZaakDocumenten); a title the tab already shows is not
					     repeated. -->
					<div
						v-if="panelHeading(entry)"
						class="cn-tabs-widget__panel-heading"
						:class="{ 'cn-tabs-widget__panel-heading--actions': panelHeaderActions(entry).length > 0 }"
						data-testid="cn-tabs-widget-panel-heading">
						<div class="cn-tabs-widget__panel-heading-text">
							<h2 class="cn-tabs-widget__panel-title">
								{{ panelHeading(entry).title }}
							</h2>
							<span v-if="panelHeading(entry).subtitle" class="cn-tabs-widget__panel-subtitle">{{ panelHeading(entry).subtitle }}</span>
						</div>
						<CnWidgetHeaderActionButtons v-if="panelHeaderActions(entry).length > 0" :actions="panelHeaderActions(entry)" />
					</div>
					<!-- The widget's manifest `headerActions` with no heading to
					     sit in: a row of their own above the panel's content. -->
					<div
						v-else-if="panelHeaderActions(entry).length > 0"
						class="cn-tabs-widget__panel-actions"
						data-testid="cn-tabs-widget-panel-actions">
						<CnWidgetHeaderActionButtons :actions="panelHeaderActions(entry)" />
					</div>
					<CnDetailWidgetHost
						:widget="entry.widget"
						chrome="bare"
						:availableWidgets="availableWidgets"
						:objectId="objectId"
						:object="objectData"
						:objectType="objectType"
						:schemaObject="schemaObject"
						:register="register"
						:schema="schema"
						:store="store"
						:surface="surface"
						:integrationContext="integrationContext"
						:cnRegistry="cnRegistry"
						@geoSaved="onGeoSaved"
						@openIntegration="onOpenIntegration"
						@selectObject="onSelectObject" />
				</template>
				<CnEmptyContent v-else :name="missingLabel(entry)" />
			</CnTab>
		</CnTabs>
	</div>
</template>

<script>
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import { NcActionButton, NcActionSeparator, NcLoadingIcon } from '@nextcloud/vue'
import CnDetailWidgetHost from '../CnDetailWidgetHost/CnDetailWidgetHost.vue'
import CnEmptyContent from '../CnEmptyContent/CnEmptyContent.vue'
import CnIcon from '../CnIcon/CnIcon.vue'
import CnTab from '../CnTabs/CnTab.vue'
import CnTabs from '../CnTabs/CnTabs.vue'
import CnWidgetHeaderActionButtons from '../CnWidgetWrapper/CnWidgetHeaderActionButtons.vue'
import { normalizeLook } from '../../composables/useLook.js'
import { dispatchAction } from '../../utils/actionsDispatcher.js'
import { headerLinkTarget, resolveHeaderLink, widgetHeaderLink } from '../../utils/contentHeaderLink.js'
import { resolveTabCount } from '../../utils/detailActionModel.js'
import { detailWidgetVisible } from '../../utils/detailWidgetVisibility.js'
import { fetchListTotal } from '../../utils/fetchFilterCounts.js'
import { isActivityWidget } from '../../utils/headerMeta.js'
import { PANEL_ACTION_SINK } from '../../utils/panelActions.js'
import { setSubResourceRead } from '../../utils/recordInteractions.js'
import { evaluateVisibleWhen, evaluateVisibleWhenLocal, evaluateWorkspaceCondition, isLocallyDecidableVisibleWhen, isWorkspaceCondition, readVisibleWhenValue } from '../../utils/visibleWhen.js'
import { widgetTitleOf } from '../../utils/widgetDispatch.js'
import { resolveWidgetHeaderActions } from '../../utils/widgetHeaderActions.js'
import { CnActionsMenu } from '../CnActionsMenu/index.js'

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
		CnWidgetHeaderActionButtons,
		NcActionButton,
		NcActionSeparator,
		CnEmptyContent,
		NcLoadingIcon,
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
					// `activePanelActions` spreads what is stored, so a
					// non-array becomes one menu item per character.
					if (!id || !Array.isArray(items)) {
						return
					}
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
					if (!forId || !(source in forId)) {
						return
					}
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

	inject: {
		/** The app's look, provided by CnAppRoot or CnPageRenderer (`nextcloud` or `board`). */
		cnLook: { default: 'nextcloud' },
		/** The tab list's name under the board look, provided by CnDetailPage (`config.tabsLabel`). */
		cnDetailTabsLabel: { default: null },
		/**
		 * The records the detail page's `visibilityContext` names, keyed
		 * by name (a case's case type), provided by CnDetailPage. A tab's
		 * `visibleWhen` reads them as `@context.<name>`. Null on any other page.
		 */
		cnDetailVisibilityRows: { default: null },
		/**
		 * The page's workspace bag (CnDashboardPage provides it), which a
		 * page control such as a chips filter writes. A widget in a stack is
		 * left out while its workspace `visibleWhen` does not hold. Null off a
		 * dashboard.
		 */
		cnWorkspaceContext: { default: null },
		/**
		 * The host's translate (CnAppRoot provides `cnTranslate`), so a tab
		 * label written in the manifest reads in the user's language.
		 */
		cnTranslate: { default: () => (key) => key },
		/** The page's action dispatcher (CnPageRenderer), for a panel widget's `headerActions`. */
		cnDispatchAction: { default: null },
		/**
		 * CnDetailPage's report of the open body tab, so its side column can
		 * follow the tab (a side entry's `tabs`). Null on any other page.
		 */
		cnDetailReportTab: { default: null },
	},

	props: {
		/**
		 * The widget's config: `{ tabs, ariaLabel }`.
		 *
		 * `tabs[]` entries are `{ widgetId, label?, icon?, count?, countField?, overflow? }`.
		 * `label` and `icon` fall back to the referenced widget's own title and
		 * icon. `count` is a number shown after the label; `countField` reads
		 * it off the record instead (a list counts its items). `countFrom`
		 * counts a list on the server: `"widget"` counts the child widget's
		 * own list (`content.register`, `schema`, `filter`, tokens such as
		 * `@objectId` resolved), an object `{ register, schema, filter? }`
		 * names the list, and `{ endpoint, field? }` counts the list (or reads
		 * the number) an endpoint answers with, `@objectId` resolved; `count`
		 * and `countField` win over it. `overflow: true`
		 * lists the tab under "More".
		 *
		 * A tab with `widgetIds` can lay them out in a grid instead of one under
		 * the other: `columns: 4` gives each a quarter of the row, and
		 * `layout: [{ widgetId, gridWidth }]` sets a width (of 12) per widget, as
		 * the page grid does. Widgets wrap onto the next row.
		 *
		 * A tab with `default: true` is the one the strip opens on, unless a
		 * route hash names another tab or the marked tab sits under "More".
		 *
		 * `maxVisibleTabs` caps the strip: later tabs go under "More" (in the
		 * board look: into the Actions menu, with History kept in the strip).
		 * `hideEmpty: true` moves a tab whose count is 0 there too.
		 * `moreLabel` names that menu. `variant: "segmented"` draws the strip
		 * as a pill switch (CnTabs' segmented variant); `line` is the default.
		 *
		 * @type {{ tabs?: Array<{widgetId?: string, widgetIds?: string[], label?: string, icon?: string, count?: number, countField?: string, countFrom?: ('widget'|{register: string, schema: string, filter?: object}|{endpoint: string, field?: string}), overflow?: boolean, default?: boolean, columns?: number, layout?: Array<{widgetId: string, gridWidth: number}>}>, ariaLabel?: string, maxVisibleTabs?: number, hideEmpty?: boolean, moreLabel?: string, variant?: ('line'|'segmented') }}
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

		/**
		 * Whether the strip draws its Actions menu at all. `false` drops the
		 * whole menu, the open panel's own items included, for a board that
		 * draws none. Manifest: `content.showActions` on the tabs widget.
		 *
		 * @spec openspec/changes/tabs-widget-actions-off/specs/tabs-widget-actions-off/spec.md#requirement-a-manifest-can-turn-off-the-tab-strips-actions-menu
		 */
		showActions: {
			type: Boolean,
			default: true,
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

	emits: ['geo-saved', 'open-integration', 'select-object'],

	data() {
		return {
			activeIndex: 0,
			// Key of the tab showing, so it stays the active one when a tab
			// before it appears or disappears.
			activeKey: '',
			// Result of each tab's SOURCE-mode `visibleWhen`, by the tab's index
			// in `content.tabs`. A missing entry means the count is pending.
			sourceVisibility: {},
			// Bumped per evaluation round, so a slow answer from an earlier round is dropped.
			visibilitySeq: 0,
			// Totals counted for tabs with `countFrom`, by position in `content.tabs`.
			widgetCounts: {},
			// Read-state parts this page has marked read since it opened
			// (`badgeSource: 'readState'`), so their counts go without a reload.
			readCleared: {},
			countSeq: 0,
			// Tab id named by the route hash that has not appeared yet (still pending).
			hashTargetId: '',
			// Items published by the panels, keyed by widget id. Keyed rather
			// than a flat list because `lazy` keeps a visited tab mounted, so
			// more than one panel publishes at a time.
			panelActionsByWidget: {},
		}
	},

	computed: {
		/**
		 * What a tab's `visibleWhen` reads: the record, with the records the
		 * detail page's `visibilityContext` names under `@context.<name>`. Null while
		 * the record, or one of those records, is not there yet.
		 *
		 * @return {object|null}
		 * @spec openspec/changes/detail-widgets-visible-when/specs/detail-widgets-visible-when/spec.md#requirement-a-detail-page-can-load-records-a-condition-names
		 */
		conditionData() {
			if (!this.objectData) {
				return null
			}
			const holder = this.cnDetailVisibilityRows
			if (!holder) {
				return this.objectData
			}
			const rows = holder.value
			if (!rows) {
				return null
			}
			return { ...this.objectData, '@context': rows }
		},

		/**
		 * The open panel's own menu items, or an empty list.
		 *
		 * @return {object[]} PanelAction descriptors for the active tab.
		 */
		activePanelActions() {
			const forId = this.panelActionsByWidget[this.activeWidgetId]
			if (!forId) {
				return []
			}
			// Host first, then the widget's own: the catalog Add is about the
			// panel as a whole, the widget's items about what is in it.
			return [...(forId.host || []), ...(forId.widget || [])]
		},

		/**
		 * The tabs the board look lists at the top of the Actions menu: the
		 * overflow tabs, less the one that is open (it is in the strip).
		 * Empty outside the board look, where CnTabs draws "More".
		 *
		 * @return {object[]} Resolved tabs, in strip order.
		 * @spec openspec/changes/board-tabs-overflow-in-actions/specs/board-tabs-overflow-in-actions/spec.md#requirement-board-tabs-list-their-overflow-in-the-actions-menu
		 */
		menuTabs() {
			if (!this.isBoard) {
				return []
			}
			return this.resolvedTabs.filter((entry, index) => entry.overflow && index !== this.activeIndex)
		},

		/**
		 * The configured tabs, each paired with the widget definition it names.
		 *
		 * A tab goes under the strip's "More" menu when it says `overflow`, when
		 * `content.hideEmpty` is set and its count is 0, or when
		 * `content.maxVisibleTabs` places are already taken. `count` is a
		 * literal, or read off the record through `countField`. In the board
		 * look those tabs are listed in the Actions menu instead, and the
		 * activity (History) tab always stays in the strip.
		 *
		 * @return {object[]} `{ key, widgetId, label, icon, widget, count, overflow }` per tab.
		 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-tab-counts-and-overflow
		 * @spec openspec/changes/board-tabs-overflow-in-actions/specs/board-tabs-overflow-in-actions/spec.md#requirement-board-tabs-list-their-overflow-in-the-actions-menu
		 */
		resolvedTabs() {
			const authored = Array.isArray(this.content?.tabs) ? this.content.tabs : []
			// The board look: the activity is the History tab and the last tab,
			// whatever its place in the manifest. `index` stays the position in
			// `content.tabs`, which the source-mode conditions are keyed on.
			const isActivityTab = (tab) => {
				const id = this.tabWidgetIds(tab)[0]
				return isActivityWidget(this.availableWidgets.find((w) => w && w.id === id))
			}
			const ordered = authored.map((tab, index) => ({ tab, index }))
			if (this.isBoard) {
				ordered.sort((a, b) => (Number(isActivityTab(a.tab)) - Number(isActivityTab(b.tab))) || (a.index - b.index))
			}
			const tabs = ordered.map(({ tab }) => tab)
			const originalIndex = ordered.map(({ index }) => index)
			const max = Number(this.content?.maxVisibleTabs)
			const hideEmpty = this.content?.hideEmpty === true
			// The board keeps its History tab in the strip, so it holds one of
			// the `maxVisibleTabs` places from the start.
			const pinActivity = this.isBoard && tabs.some((tab, position) => isActivityTab(tab) && this.tabVisibility(tab, originalIndex[position]) !== 'hidden')
			// How many tabs have taken a place in the strip so far. A tab that
			// is already going under "More" does not use one up.
			let placed = pinActivity ? 1 : 0
			const resolved = []
			const usedKeys = new Set()
			tabs.forEach((tab, position) => {
				const index = originalIndex[position]
				// A tab whose condition is false is absent, not empty.
				const visibility = this.tabVisibility(tab, index)
				if (visibility === 'hidden') {
					return
				}
				// A stack (`widgetIds`) resolves every id; one that names no
				// widget is skipped. The first that resolves is the panel's.
				const ids = this.tabWidgetIds(tab)
				const named = ids.length > 1
					? ids.map((id) => this.availableWidgets.find((w) => w && w.id === id) || null).filter(Boolean)
					: []
				const widgets = named.filter((w) => !this.hiddenByWorkspace(w) && !this.hiddenByRecord(w))
				const widget = ids.length > 1
					? (widgets[0] || null)
					: (this.availableWidgets.find((w) => w && w.id === ids[0]) || null)
				const widgetId = widget ? widget.id : ids[0]
				const declared = resolveTabCount(typeof tab === 'object' ? tab : null, this.countObject)
				const counted = this.widgetCounts[index]
				const count = declared === null && typeof counted === 'number' ? counted : declared
				const pinned = pinActivity && isActivityTab(tab)
				let overflow = !pinned && ((tab && tab.overflow === true) || (hideEmpty && count === 0))
				if (!overflow && !pinned) {
					if (Number.isFinite(max) && max > 0 && placed >= max) {
						overflow = true
					} else {
						placed += 1
					}
				}
				// Keyed on the tab's own id, else its place in `content.tabs`:
				// never on the widget the panel starts with, which changes when
				// a stack's first card turns visible and would remount the panel.
				const ownId = tab && typeof tab === 'object' && typeof tab.id === 'string' ? tab.id : ''
				const key = ownId !== '' && !usedKeys.has(ownId) ? ownId : `tab-${index}`
				usedKeys.add(key)
				resolved.push({
					key,
					id: (tab && typeof tab === 'object' && tab.id) || widgetId || '',
					widgetId,
					label: this.tabLabel(tab, widget, widgetId),
					icon: (tab && tab.icon) || widget?.icon || '',
					widget,
					stack: widgets.slice(1),
					// A stack of two or more widgets stays a stack of titled cards
					// when conditions leave one of them showing (DqSociaalDomein
					// "De melding"): the record decides which cards show, not
					// whether the panel is a card.
					isStack: named.length > 1,
					grid: this.stackGrid(tab, widgets),
					count,
					unreadKey: this.unreadKeyOf(tab, widgetId),
					unreadLabel: this.unreadLabelOf(tab, widgetId),
					overflow,
					pending: visibility === 'pending',
					opensFirst: Boolean(tab && typeof tab === 'object' && tab.default === true),
				})
			})
			return resolved
		},

		/**
		 * Whether the tabs badge what is new on each part of the record and
		 * mark that part read when it is opened (`content.badgeSource: 'readState'`).
		 *
		 * @return {boolean}
		 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-opening-a-tab-marks-its-part-read
		 */
		readStateBadges() {
			return this.content?.badgeSource === 'readState'
		},

		/**
		 * The record the tab counts read: the record itself, less the
		 * read-state parts this page has already marked read.
		 *
		 * @return {object|null}
		 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-opening-a-tab-marks-its-part-read
		 */
		countObject() {
			const record = this.objectData
			const counts = record && record['@self'] && record['@self'].unreadCounts
			if (!counts || typeof counts !== 'object' || Object.keys(this.readCleared).length === 0) {
				return record
			}
			const left = { ...counts }
			for (const key of Object.keys(this.readCleared)) {
				left[key] = 0
			}
			return { ...record, '@self': { ...record['@self'], unreadCounts: left } }
		},

		/** @return {string} The keys of the tabs in the strip, to notice one appearing or going. */
		visibleKeys() {
			return this.resolvedTabs.map((tab) => tab.key).join('|')
		},

		/** @return {string} Accessible name of a pending tab's spinner. */
		loadingLabel() {
			return t('nextcloud-vue', 'Loading …')
		},

		/**
		 * The lists the tabs count (`countFrom`), serialised, to count again
		 * when they change.
		 *
		 * @return {string} The key.
		 */
		countSourcesKey() {
			const tabs = Array.isArray(this.content?.tabs) ? this.content.tabs : []
			return JSON.stringify(tabs.map((tab) => this.countSourceOf(tab)))
		},

		/** @return {string} The source-mode conditions, serialised, to re-evaluate when they change. */
		sourceConditionsKey() {
			const tabs = Array.isArray(this.content?.tabs) ? this.content.tabs : []
			return JSON.stringify(tabs.map((tab) => (tab && typeof tab === 'object' && tab.visibleWhen && !isLocallyDecidableVisibleWhen(tab.visibleWhen)) ? tab.visibleWhen : null))
		},

		/**
		 * Name of the menu that holds the tabs that are not in the strip.
		 *
		 * @return {string|undefined} The configured label, or undefined for the default.
		 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-tab-counts-and-overflow
		 */
		moreLabel() {
			const label = this.content?.moreLabel
			return typeof label === 'string' && label !== '' ? label : undefined
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
		 * The header link the open tab's widget declares (`headerLink` on the
		 * definition, or in its content), or null. For a stack, the first
		 * widget's.
		 *
		 * @spec openspec/changes/tabs-widget-header-link/specs/tabs-widget-header-link/spec.md#requirement-the-tab-strip-draws-the-open-panels-header-link
		 * @return {object|null}
		 */
		activeHeaderLink() {
			return resolveHeaderLink(widgetHeaderLink(this.activeTab?.widget), { objectId: this.objectId, object: this.objectData })
		},

		/**
		 * How to draw the open panel's header link: a router link for a
		 * route, an anchor for an href, nothing otherwise.
		 *
		 * @spec openspec/changes/tabs-widget-header-link/specs/tabs-widget-header-link/spec.md#requirement-the-tab-strip-draws-the-open-panels-header-link
		 * @return {{tag: string, attrs: object}}
		 */
		activeHeaderLinkTarget() {
			return headerLinkTarget(this.activeHeaderLink, Boolean(this.$router))
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
		 * The strip's look: `segmented` when the content asks for it, else
		 * CnTabs' default `line`. An unknown value falls back to `line`.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-a-tabs-widget-renders-a-segmented-strip
		 * @return {('line'|'segmented')} The CnTabs variant.
		 */
		stripVariant() {
			return this.content?.variant === 'segmented' ? 'segmented' : 'line'
		},

		/**
		 * Accessible name for the tab strip.
		 *
		 * @return {string} The aria-label.
		 */
		stripLabel() {
			const named = this.isBoard && this.cnDetailTabsLabel ? this.cnDetailTabsLabel.value : ''
			return this.content?.ariaLabel || named || t('nextcloud-vue', 'Details')
		},

		/**
		 * Whether the strip is drawn in the board look.
		 *
		 * @return {boolean} True in the board look.
		 * @spec openspec/changes/screens-detail-page-parity/specs/detail-page-board-look/spec.md#requirement-folder-tabs-take-the-board-strip
		 */
		isBoard() {
			return normalizeLook(this.cnLook) === 'board'
		},
	},

	watch: {
		activeIndex(index) {
			this.activeKey = this.resolvedTabs[index]?.key || ''
		},

		// The open tab's part of the record is now seen: on opening a tab, and
		// when the record arrives with something new on the open one.
		'activeTab.key': function() {
			this.markActiveTabRead()
		},

		'activeTab.unreadLabel': {
			immediate: true,
			handler() {
				this.markActiveTabRead()
			},
		},

		// Tell the detail page which tab is open (side cards per tab).
		'activeTab.id': {
			immediate: true,
			handler(id) {
				if (typeof this.cnDetailReportTab === 'function') {
					this.cnDetailReportTab(id || '')
				}
			},
		},

		// A tab appeared or went. Keep the same tab active; when it is the active
		// tab that went, the first visible one takes over and the hash follows.
		visibleKeys() {
			if (this.hashTargetId !== '') {
				const arrived = this.resolvedTabs.findIndex((tab) => tab.id === this.hashTargetId && !tab.pending)
				if (arrived >= 0) {
					this.activeIndex = arrived
					this.hashTargetId = ''
					return
				}
				if (!this.resolvedTabs.some((tab) => tab.id === this.hashTargetId)) {
					this.hashTargetId = ''
				}
			}
			const stay = this.resolvedTabs.findIndex((tab) => tab.key === this.activeKey)
			if (stay >= 0) {
				if (stay !== this.activeIndex) {
					this.activeIndex = stay
				}
				return
			}
			const first = this.resolvedTabs.findIndex((tab) => !tab.overflow && !tab.pending)
			this.activeIndex = first >= 0 ? first : 0
			this.activeKey = this.resolvedTabs[this.activeIndex]?.key || ''
			this.syncHash()
		},

		objectId() {
			this.sourceVisibility = {}
			this.refreshSourceVisibility()
			this.widgetCounts = {}
			this.refreshWidgetCounts()
		},

		countSourcesKey() {
			this.refreshWidgetCounts()
		},

		sourceConditionsKey() {
			this.refreshSourceVisibility()
		},
	},

	/**
	 * Open on the tab marked `default: true`, else on the first tab that is in
	 * the strip. Tab 0 is not enough: when tab 0 sits under "More" the strip
	 * would open on a tab the author chose to tuck away.
	 *
	 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-tab-counts-and-overflow
	 */
	created() {
		// A route hash naming a tab opens that tab. One naming a hidden tab is
		// ignored, without an error; one naming a tab still pending is honoured
		// once its condition answers.
		const wanted = this.currentHash()
		const named = wanted === '' ? -1 : this.resolvedTabs.findIndex((tab) => tab.id === wanted)
		if (named >= 0 && !this.resolvedTabs[named].pending) {
			this.activeIndex = named
		} else {
			if (named >= 0) {
				this.hashTargetId = wanted
			}
			const marked = this.resolvedTabs.findIndex((tab) => tab.opensFirst && !tab.overflow && !tab.pending)
			const first = this.resolvedTabs.findIndex((tab) => !tab.overflow && !tab.pending)
			const fallback = marked >= 0 ? marked : first >= 0 ? first : this.resolvedTabs.findIndex((tab) => !tab.overflow)
			if (fallback > 0) {
				this.activeIndex = fallback
			}
		}
		this.activeKey = this.resolvedTabs[this.activeIndex]?.key || ''
		this.refreshSourceVisibility()
		this.refreshWidgetCounts()
	},

	mounted() {
		this._onRefresh = () => {
			this.refreshSourceVisibility()
			this.refreshWidgetCounts()
		}
		subscribe('cn:page:refresh', this._onRefresh)
		subscribe('cn:widget:refresh', this._onRefresh)
		// A hash that changes on an open page (a header link `{ tab }`) opens that tab.
		this._onHashChange = () => this.openTabById(decodeURIComponent(window.location.hash.replace(/^#/, '')))
		window.addEventListener('hashchange', this._onHashChange)
	},

	beforeUnmount() {
		unsubscribe('cn:page:refresh', this._onRefresh)
		unsubscribe('cn:widget:refresh', this._onRefresh)
		window.removeEventListener('hashchange', this._onHashChange)
	},

	methods: {
		/**
		 * Open the tab with this id; one still pending opens once it appears,
		 * and an unknown or hidden id changes nothing.
		 *
		 * @spec openspec/changes/header-link-switches-tab/specs/header-link/spec.md#requirement-a-header-link-can-open-another-tab-of-the-page
		 * @param {string} id The tab id.
		 * @return {void}
		 */
		openTabById(id) {
			if (!id) {
				return
			}
			const index = this.resolvedTabs.findIndex((tab) => tab.id === id)
			if (index < 0) {
				return
			}
			if (this.resolvedTabs[index].pending) {
				this.hashTargetId = id
				return
			}
			this.activeIndex = index
		},

		/**
		 * The read-state part a tab counts: `unreadKey`, else its id, else its widget id.
		 *
		 * @param {object|string} tab The tab declaration.
		 * @param {string} widgetId The tab's widget id.
		 * @return {string} The part, or ''.
		 */
		unreadKeyOf(tab, widgetId) {
			const own = tab && typeof tab === 'object' ? tab : {}
			return String(own.unreadKey || own.id || widgetId || '')
		},

		/**
		 * What a screen reader hears after a tab's name when its part holds
		 * something unseen ("3 new"), under `badgeSource: 'readState'`. The count
		 * pill alone is a bare number.
		 *
		 * @param {object|string} tab The tab declaration.
		 * @param {string} widgetId The tab's widget id.
		 * @return {string} The label, or '' when nothing is new.
		 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-opening-a-tab-marks-its-part-read
		 */
		unreadLabelOf(tab, widgetId) {
			if (!this.readStateBadges || (tab && typeof tab === 'object' && (typeof tab.count === 'number' || tab.countField))) {
				return ''
			}
			const key = this.unreadKeyOf(tab, widgetId)
			const counts = this.countObject && this.countObject['@self'] && this.countObject['@self'].unreadCounts
			const count = counts && key ? Number(counts[key]) : 0
			if (!Number.isFinite(count) || count < 1) {
				return ''
			}
			return n('nextcloud-vue', '{count} new', '{count} new', count, { count })
		},

		/**
		 * Mark the open tab's part of the record read (`PUT .../read-state`
		 * with `subResource`), once, and drop its count. A refused write keeps
		 * the count: an unseen part that stays marked is the safe direction.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-opening-a-tab-marks-its-part-read
		 */
		async markActiveTabRead() {
			const tab = this.activeTab
			if (!this.readStateBadges || !tab || !tab.unreadLabel || !this.objectId) {
				return
			}
			const key = tab.unreadKey
			if (this.readCleared[key]) {
				return
			}
			const outcome = await setSubResourceRead(String(this.register || ''), String(this.schema || ''), String(this.objectId), key)
			if (outcome && outcome.ok) {
				this.readCleared = { ...this.readCleared, [key]: true }
			}
		},

		/**
		 * Whether a page control hides a widget of a stack right now: its
		 * `visibleWhen` (on the widget, its content or its props) is a
		 * workspace condition that does not hold. Off a dashboard there is no
		 * workspace, and nothing is hidden. Other conditions are not looked at
		 * here.
		 *
		 * @param {object} widget The widget definition.
		 * @return {boolean} True when the widget must not draw.
		 * @spec openspec/changes/tabs-stack-follows-page-controls/specs/tabs-widget/spec.md#requirement-a-widget-in-a-tab-stack-follows-the-page-controls
		 */
		hiddenByWorkspace(widget) {
			const cond = widget.visibleWhen || widget.content?.visibleWhen || widget.props?.visibleWhen || null
			if (!isWorkspaceCondition(cond)) {
				return false
			}
			const bag = this.cnWorkspaceContext
			if (!bag || typeof bag !== 'object') {
				return false
			}
			return !evaluateWorkspaceCondition(cond, 'value' in bag ? bag.value : bag)
		},

		/**
		 * Whether the record hides a widget of a stack on a detail page: its
		 * own `visibleWhen` reads a field of the record or of a record the
		 * page's `visibilityContext` names (`@context.<name>`), and does not
		 * hold, as a grid widget's would not. Hidden while those records
		 * load. Off a detail page (no record), and for a condition that needs
		 * a request, nothing is hidden here.
		 *
		 * @param {object} widget The widget definition.
		 * @return {boolean} True when the widget must not draw.
		 * @spec openspec/changes/tab-stack-child-visible-when/specs/tab-stack-child-visible-when/spec.md#requirement-a-widget-in-a-tab-stack-on-a-detail-page-follows-its-own-condition
		 */
		hiddenByRecord(widget) {
			const cond = widget.visibleWhen
			if (!this.objectData || !cond || typeof cond !== 'object' || isWorkspaceCondition(cond) || !isLocallyDecidableVisibleWhen(cond)) {
				return false
			}
			return !detailWidgetVisible(widget, this.conditionData)
		},

		/**
		 * The grid a stack lays its widgets out in, as one column span (of 12)
		 * per widget in order, or null for the plain vertical stack. A tab says
		 * `columns: 4` (every widget spans a quarter of the row) and/or
		 * `layout: [{ widgetId, gridWidth }]`, the page grid's width key per
		 * widget (of 12; a widget it does not name takes the `columns` share, or
		 * the whole row). Widgets wrap onto the next row. A widget `layout`
		 * places that ends up alone in its row (its partner hidden for this
		 * record) takes the whole row. Heights follow the content.
		 *
		 * @param {object|string} tab The `content.tabs[]` entry.
		 * @param {Array<object>} widgets The widgets of the stack, in order.
		 * @return {number[]|null} The column span of each widget, or null.
		 */
		stackGrid(tab, widgets) {
			if (!tab || typeof tab !== 'object' || widgets.length < 2) {
				return null
			}
			const clamp = (value) => Math.min(12, Math.max(1, Math.floor(Number(value))))
			const columns = Number(tab.columns)
			const share = Number.isFinite(columns) && columns >= 1 ? clamp(12 / Math.min(12, Math.floor(columns))) : 12
			const placed = new Map((Array.isArray(tab.layout) ? tab.layout : [])
				.filter((entry) => entry && typeof entry.widgetId === 'string' && Number.isFinite(Number(entry.gridWidth)))
				.map((entry) => [entry.widgetId, clamp(entry.gridWidth)]))
			if (placed.size === 0 && share === 12) {
				return null
			}
			const spans = widgets.map((widget) => placed.get(widget.id) ?? share)
			// A widget `layout` sets beside a partner fills its row when it is
			// alone there: the partner is hidden for this record, and half a
			// row with nothing beside it is a hole, not a layout.
			const rows = []
			let used = 12
			spans.forEach((span, index) => {
				if (used + span > 12) {
					rows.push([])
					used = 0
				}
				rows[rows.length - 1].push(index)
				used += span
			})
			rows.forEach((row) => {
				if (row.length === 1 && placed.has(widgets[row[0]].id)) {
					spans[row[0]] = 12
				}
			})
			return spans
		},

		/**
		 * The inline column span of one widget of a gridded stack.
		 *
		 * @param {number[]|null} grid The spans of the stack, or null.
		 * @param {number} index The widget's position in the stack.
		 * @return {object|undefined} The style, or undefined without a grid.
		 */
		spanStyle(grid, index) {
			return grid ? { gridColumn: `span ${grid[index] || 12}` } : undefined
		},

		/**
		 * The widget ids a tab names: `widgetIds` (a stack) when it holds at
		 * least one id, else `widgetId`, or the bare string.
		 *
		 * @param {object|string} tab The `content.tabs[]` entry.
		 * @return {string[]} The ids, at least one entry (possibly undefined).
		 * @spec openspec/changes/screens-relation-pages/specs/relation-pages/spec.md#requirement-a-tab-can-hold-a-stack-of-widgets
		 */
		tabWidgetIds(tab) {
			if (typeof tab === 'string') {
				return [tab]
			}
			if (tab && Array.isArray(tab.widgetIds)) {
				const ids = tab.widgetIds.filter((id) => typeof id === 'string' && id !== '')
				if (ids.length) {
					return ids
				}
			}
			return [tab?.widgetId]
		},

		/**
		 * A single widget's manifest `headerActions`, for its panel's heading
		 * row: gated on the record, dispatched through the page's dispatcher.
		 *
		 * @param {object} entry A resolved tab.
		 * @return {Array<object>} The buttons.
		 * @spec openspec/changes/widget-header-actions/specs/widget-header-actions/spec.md#requirement-the-card-that-titles-a-widget-draws-its-header-actions
		 */
		panelHeaderActions(entry) {
			const translate = typeof this.cnTranslate === 'function' ? this.cnTranslate : (key) => key
			return resolveWidgetHeaderActions(entry && entry.widget, {
				object: this.objectData || {},
				objectId: this.objectId,
				translate,
				dispatch: (action) => (typeof this.cnDispatchAction === 'function'
					? this.cnDispatchAction(action)
					: dispatchAction(action, { router: this.$router || null })),
			})
		},

		/**
		 * The title row a single widget's panel draws: the widget's own title
		 * and its description, through the app's translate. None when the
		 * widget has no title or no description, or the tab already shows the
		 * title: a title alone names what the tab already names, so the
		 * widget stays bare in its panel.
		 *
		 * @param {object} entry A resolved tab.
		 * @return {{title: string, subtitle: string}|null} The heading, or null.
		 */
		panelHeading(entry) {
			const widget = entry && entry.widget
			const raw = widgetTitleOf(widget)
			if (!raw) {
				return null
			}
			const translate = typeof this.cnTranslate === 'function' ? this.cnTranslate : (key) => key
			const title = translate(raw)
			if (title === entry.label) {
				return null
			}
			if (!widget || typeof widget.description !== 'string' || widget.description === '') {
				return null
			}
			return { title, subtitle: translate(widget.description) }
		},

		/**
		 * The label a tab shows: the authored `label`, else (board look) History
		 * for the activity widget, else the child widget's title, else its id.
		 * A manifest label or title goes through the host's translate; the
		 * library's own History is translated by the library catalogue.
		 *
		 * @param {object|string} tab The `content.tabs[]` entry.
		 * @param {object|null} widget The widget definition it names.
		 * @param {string} widgetId The widget id.
		 * @return {string} The label.
		 * @spec openspec/changes/screens-detail-labels-parity/specs/detail-labels-board-look/spec.md#requirement-detail-labels-read-in-the-users-language
		 */
		tabLabel(tab, widget, widgetId) {
			const translate = typeof this.cnTranslate === 'function' ? this.cnTranslate : (key) => key
			if (tab && typeof tab.label === 'string' && tab.label !== '') {
				return translate(tab.label)
			}
			if (this.isBoard && isActivityWidget(widget)) {
				return t('nextcloud-vue', 'History')
			}
			const title = widgetTitleOf(widget)
			return title ? translate(title) : (widgetId || '')
		},

		/**
		 * Whether a tab shows: `visible`, `hidden`, or `pending` while its
		 * condition cannot be decided yet (object not loaded, count not back).
		 *
		 * @param {string|object} tab   The tab entry.
		 * @param {number}        index Its index in `content.tabs`.
		 * @return {('visible'|'hidden'|'pending')} The state.
		 * @spec openspec/changes/tabs-widget-visible-if/tasks.md#task-2
		 */
		tabVisibility(tab, index) {
			const cond = tab && typeof tab === 'object' ? tab.visibleWhen : null
			if (!cond) {
				return 'visible'
			}
			if (isLocallyDecidableVisibleWhen(cond)) {
				const data = this.conditionData
				if (!data) {
					return 'pending'
				}
				return evaluateVisibleWhenLocal(cond, data) ? 'visible' : 'hidden'
			}
			const answer = this.sourceVisibility[index]
			if (answer === undefined) {
				return 'pending'
			}
			return answer ? 'visible' : 'hidden'
		},

		/**
		 * Count the rows behind each source-mode condition: once on mount, when
		 * the record changes, and after a refresh a write triggers. A tab keeps
		 * its last answer while the new one is on its way, so the strip does
		 * not jump.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/tabs-widget-visible-if/tasks.md#task-2
		 */
		async refreshSourceVisibility() {
			const tabs = Array.isArray(this.content?.tabs) ? this.content.tabs : []
			const seq = ++this.visibilitySeq
			const ctx = { objectId: this.objectId, object: this.conditionData || this.objectData || undefined }
			await Promise.all(tabs.map(async (tab, index) => {
				const cond = tab && typeof tab === 'object' ? tab.visibleWhen : null
				if (!cond || isLocallyDecidableVisibleWhen(cond)) {
					return
				}
				const answer = await evaluateVisibleWhen(cond, ctx)
				if (seq === this.visibilitySeq) {
					this.sourceVisibility = { ...this.sourceVisibility, [index]: answer }
				}
			}))
		},

		/**
		 * The list a tab counts (`countFrom`): `"widget"` counts the child
		 * widget's own list (its `content.register`, `content.schema` and
		 * `content.filter`); an object `{ register, schema, filter? }` names
		 * the list itself. Null for a tab that does not ask, or a child with
		 * no list.
		 *
		 * @param {object|string} tab The `content.tabs[]` entry.
		 * @return {{register: string, schema: string, filter: object}|{endpoint: string, field: string}|null} The list, or the endpoint to count.
		 * @spec openspec/changes/screens-tab-counts-parity/specs/tab-counts/spec.md#requirement-a-tab-can-count-its-list
		 */
		countSourceOf(tab) {
			const from = tab && typeof tab === 'object' ? tab.countFrom : null
			let source = null
			if (from === 'widget') {
				// A stack counts its first widget that has a list: flat
				// (`content.register`) or a dashboard table's `content.source`.
				const lists = this.tabWidgetIds(tab)
					.map((id) => this.availableWidgets.find((w) => w && w.id === id))
					.map((w) => (w && w.content && typeof w.content === 'object' ? w.content : null))
					.map((content) => (content && content.source && typeof content.source === 'object' && content.source.register ? content.source : content))
					.filter((content) => content && content.register && content.schema)
				source = lists.length ? lists[0] : null
			} else if (from && typeof from === 'object') {
				if (typeof from.endpoint === 'string' && from.endpoint !== '') {
					return { endpoint: from.endpoint, field: typeof from.field === 'string' ? from.field : '' }
				}
				source = from
			}
			if (!source || typeof source.register !== 'string' || source.register === '' || typeof source.schema !== 'string' || source.schema === '') {
				return null
			}
			const filter = source.filter && typeof source.filter === 'object' && !Array.isArray(source.filter) ? source.filter : {}
			return { register: source.register, schema: source.schema, filter }
		},

		/**
		 * Count the list behind every tab with `countFrom`: once on mount,
		 * when the record changes and after a refresh. A tab keeps its last
		 * total while the new one is on its way; a failed count shows none.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/screens-tab-counts-parity/specs/tab-counts/spec.md#requirement-a-tab-can-count-its-list
		 */
		async refreshWidgetCounts() {
			const tabs = Array.isArray(this.content?.tabs) ? this.content.tabs : []
			const seq = ++this.countSeq
			const ctx = { objectId: this.objectId, object: this.objectData || undefined }
			await Promise.all(tabs.map(async (tab, index) => {
				const source = this.countSourceOf(tab)
				if (!source) {
					return
				}
				const total = source.endpoint
					? await this.countEndpoint(source, ctx)
					: await fetchListTotal(source.register, source.schema, source.filter, ctx).catch(() => null)
				if (seq === this.countSeq) {
					this.widgetCounts = { ...this.widgetCounts, [index]: total }
				}
			}))
		},

		/**
		 * Count what an endpoint answers: the list at `field` (or the body),
		 * or the number there. Null when the request fails or nothing countable
		 * comes back.
		 *
		 * @param {{endpoint: string, field: string}} source The endpoint and the path to read.
		 * @param {object} ctx The record context its tokens resolve against.
		 * @return {Promise<number|null>} The count.
		 * @spec openspec/changes/screens-tab-counts-parity/specs/tab-counts/spec.md#requirement-a-tab-can-count-its-list
		 */
		async countEndpoint(source, ctx) {
			try {
				const value = await readVisibleWhenValue({ endpoint: source.endpoint, field: source.field }, ctx)
				if (Array.isArray(value)) {
					return value.length
				}
				const number = Number(value)
				return value !== null && value !== '' && Number.isFinite(number) ? number : null
			} catch {
				return null
			}
		},

		/** @return {string} The route hash without its `#`, or ''. */
		currentHash() {
			const fromRoute = this.$route && typeof this.$route.hash === 'string' ? this.$route.hash : ''
			const raw = fromRoute !== '' ? fromRoute : (typeof window !== 'undefined' && window.location ? window.location.hash : '')
			return typeof raw === 'string' ? raw.replace(/^#/, '') : ''
		},

		/**
		 * After the active tab went, point a deep link's hash at the tab now showing.
		 *
		 * @return {void}
		 */
		syncHash() {
			const id = this.activeTab?.id
			const route = this.$route
			if (!id || !route || !route.hash || !this.$router || typeof this.$router.replace !== 'function') {
				return
			}
			this.$router.replace({ hash: `#${id}`, query: route.query })
		},

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
		 * Re-emit a related child's object click; the page opens the object.
		 *
		 * @param {object} raw The clicked object.
		 * @return {void}
		 */
		onSelectObject(raw) {
			/**
			 * @event select-object Re-emitted from a related child whose object row was clicked. Payload is the raw object.
			 * @type {object}
			 */
			this.$emit('select-object', raw)
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
		 * Open a tab picked from the Actions menu, then move focus to it in
		 * the strip, so a keyboard user lands on the tab they chose.
		 *
		 * @param {object} entry The resolved tab.
		 * @return {void}
		 * @spec openspec/changes/board-tabs-overflow-in-actions/specs/board-tabs-overflow-in-actions/spec.md#requirement-board-tabs-list-their-overflow-in-the-actions-menu
		 */
		openMenuTab(entry) {
			const index = this.resolvedTabs.indexOf(entry)
			if (index < 0) {
				return
			}
			this.activeIndex = index
			this.$nextTick(() => {
				const button = this.$el?.querySelector?.('[role="tab"][aria-selected="true"]')
				if (button && typeof button.focus === 'function') {
					button.focus()
				}
			})
		},

		/**
		 * A menu tab's text: its label, and its count when it has one.
		 *
		 * @param {object} entry The resolved tab.
		 * @return {string} The menu label.
		 */
		menuTabLabel(entry) {
			const hasCount = entry.count !== null && entry.count !== undefined && entry.count !== ''
			return hasCount ? `${entry.label} (${entry.count})` : entry.label
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
/* A stack (`widgetIds`): the panel's widget, then cards 20px apart. */
.cn-tabs-widget__panel-heading {
	display: flex;
	flex-direction: column;
	gap: 4px;
	margin-bottom: 16px;
}

.cn-tabs-widget__panel-heading--actions {
	flex-direction: row;
	flex-wrap: wrap;
	align-items: flex-start;
	justify-content: space-between;
	gap: 10px 16px;
}

.cn-tabs-widget__panel-heading-text {
	display: flex;
	flex: 1 1 260px;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
}

.cn-tabs-widget__panel-actions {
	display: flex;
	justify-content: flex-end;
	margin-bottom: 16px;
}

.cn-tabs-widget__panel-title {
	margin: 0;
	font-size: 17px;
	font-weight: 700;
}

.cn-tabs-widget__panel-subtitle {
	font-size: 14px;
	color: var(--color-text-maxcontrast);
}

.cn-tabs-widget__stack {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

/* A gridded stack (`columns` / `layout` on the tab): 12 columns, widgets wrap
   onto the next row, a row's cards as tall as the tallest. Narrow, it is the
   plain stack again. */
.cn-tabs-widget__stack--grid {
	display: grid;
	grid-template-columns: repeat(12, minmax(0, 1fr));
	align-items: stretch;
}

.cn-tabs-widget__stack--grid > * {
	min-width: 0;
}

@media (max-width: 700px) {
	.cn-tabs-widget__stack--grid {
		grid-template-columns: minmax(0, 1fr);
	}

	.cn-tabs-widget__stack--grid > * {
		grid-column: auto !important;
	}
}

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
   8px inside the sheet it opens.

   The bar's own bottom rule is switched off and redrawn as a pseudo-element
   that stops one corner radius short of the right edge. CnTabs draws its rule
   across the bar's whole width, which is the sheet's top edge everywhere
   except at the far right, where the panel's top-right corner curves away
   below it: the rule ran straight on to the widget's edge and read as a
   border sticking out past a rounded corner (Ruben, 2026-09-13). Ending it
   where the curve begins makes the rule and the curve one continuous edge. */
.cn-tabs-widget__tabs :deep(.cn-tabs__bar) {
	border-bottom: none;
	padding: 0;
	position: relative;
}

.cn-tabs-widget__tabs :deep(.cn-tabs__bar::after) {
	border-bottom: 1px solid var(--color-border);
	content: '';
	inset-block-end: 0;
	inset-inline: 0 var(--border-radius-large);
	pointer-events: none;
	position: absolute;
}

/* The open tab erases the slice of the rule directly above the panel with its
   own background-coloured bottom edge, which only works if it paints ABOVE the
   pseudo-element: a positioned pseudo-element otherwise paints over every
   in-flow sibling, rule included. */
.cn-tabs-widget__tabs :deep(.cn-tabs__nav-item--active) {
	position: relative;
	z-index: 1;
}

.cn-tabs-widget__tabs {
	display: flex;
	flex-direction: column;
	/* Grow to the widget's height, so the panel fills the grid cell the
	   layout gave it. Without this the strip plus the open panel took only
	   the height of the panel's content, and a cell of nine rows ended in
	   130px of nothing under a sheet that stopped short of its own card. */
	flex: 1 1 auto;
	min-height: 0;
}

/* The panel area is the scroll region, so the strip stays put while a long
   child scrolls under it.

   Padded on all four sides. The top was once zeroed to protect the join with
   the open tab, but padding sits inside the painted box — only a margin would
   have opened that gap, and a zero top put every panel's content against the
   strip. */
.cn-tabs-widget__tabs :deep(.cn-tabs__content) {
	background-color: var(--color-main-background);
	/* Three sides only: the bar's rule (redrawn above, stopping at the corner)
	   is this sheet's top edge, and the open tab erases the slice of it
	   directly above the panel so the two read as one surface. A border-top
	   here would put a second line under that tab which the tab cannot paint
	   over. */
	border: 1px solid var(--color-border);
	border-top: none;
	/* Three rounded corners. The top-left stays square because the first tab
	   is drawn joined to the panel there, and a curve under it would curl the
	   sheet away from that tab. The top-right has no tab above it: the strip
	   ends where the last tab ends and the Actions menu floats free, so a
	   square corner there read as a sheet cut off, not as a tab's edge. */
	border-radius: 0 var(--border-radius-large) var(--border-radius-large) var(--border-radius-large);
	flex: 1 1 auto;
	min-height: 0;
	overflow: auto;
	padding: 12px;
}

.cn-tabs-widget__tabs :deep(.cn-tab) {
	height: 100%;
}

/* A list widget's footer Add bleeds through its card's 16px content padding
   (margin 0 -16px -16px). The panel of a tab pads 12px, so on a tab that
   holds the list directly the footer stuck out 4px on the right and at the
   bottom and made the panel scroll. It bleeds exactly the panel's padding. */
.cn-tabs-widget__tabs :deep(.cn-tabs__content > .cn-tab > .cn-detail-widget-host--bare .cn-object-list-widget__add) {
	margin: auto -12px -12px;
}

/* The open panel's header link, beside the strip. Same look and theme hooks
   as a card header link (CnWidgetWrapper). */
.cn-tabs-widget__header-link {
	align-self: center;
	padding: 0 calc(1 * var(--default-grid-baseline));
	color: var(--color-primary-element);
	font-size: var(--cn-widget-header-link-size, 14px);
	font-weight: var(--cn-widget-header-link-weight, 600);
	text-decoration: none;
	white-space: nowrap;
}

.cn-tabs-widget__header-link:hover,
.cn-tabs-widget__header-link:focus-visible {
	text-decoration: underline;
}

.cn-tabs-widget__header-link:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
	border-radius: var(--border-radius-small, 4px);
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
