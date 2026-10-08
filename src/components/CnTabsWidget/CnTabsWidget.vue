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
			class="cn-tabs-widget__tabs"
			@update:activeIndex="onTabChange">
			<!-- One Actions menu for the whole widget, bound to whichever child
			     is showing. This is the point of the component: six tabbed
			     widgets used to mean six card headers stacked down the page. -->
			<template #nav-end>
				<CnActionsMenu
					:showRefresh="showRefresh"
					:showRequestFeature="showRequestFeature"
					:showDocumentation="showDocumentation"
					:documentationUrl="documentationUrl"
					:widgetId="activeWidgetId"
					:title="activeTitle"
					:surface="`widget:${activeWidgetId}`"
					refreshChannel="cn:widget:refresh"
					testidBase="cn-tabs-widget">
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
				:overflow="entry.overflow"
				:disabled="entry.pending"
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
						<NcLoadingIcon
							v-if="entry.pending"
							:size="14"
							:name="loadingLabel"
							data-testid="cn-tabs-widget-pending" />
					</span>
				</template>

				<CnDetailWidgetHost
					v-if="entry.widget"
					:widget="entry.widget"
					chrome="bare"
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
				<CnEmptyContent v-else :name="missingLabel(entry)" />
			</CnTab>
		</CnTabs>
	</div>
</template>

<script>
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import { translate as t } from '@nextcloud/l10n'
import { NcActionButton, NcLoadingIcon } from '@nextcloud/vue'
import CnDetailWidgetHost from '../CnDetailWidgetHost/CnDetailWidgetHost.vue'
import CnEmptyContent from '../CnEmptyContent/CnEmptyContent.vue'
import CnIcon from '../CnIcon/CnIcon.vue'
import CnTab from '../CnTabs/CnTab.vue'
import CnTabs from '../CnTabs/CnTabs.vue'
import { resolveTabCount } from '../../utils/detailActionModel.js'
import { PANEL_ACTION_SINK } from '../../utils/panelActions.js'
import { evaluateVisibleWhen, evaluateVisibleWhenLocal, isLocallyDecidableVisibleWhen } from '../../utils/visibleWhen.js'
import { widgetTitleOf } from '../../utils/widgetDispatch.js'
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
		NcActionButton,
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

	props: {
		/**
		 * The widget's config: `{ tabs, ariaLabel }`.
		 *
		 * `tabs[]` entries are `{ widgetId, label?, icon?, count?, countField?, overflow? }`.
		 * `label` and `icon` fall back to the referenced widget's own title and
		 * icon. `count` is a number shown after the label; `countField` reads
		 * it off the record instead (a list counts its items). `overflow: true`
		 * lists the tab under "More".
		 *
		 * `maxVisibleTabs` caps the strip: later tabs go under "More".
		 * `hideEmpty: true` moves a tab whose count is 0 there too.
		 * `moreLabel` names that menu. `variant: "segmented"` draws the strip
		 * as a pill switch (CnTabs' segmented variant); `line` is the default.
		 *
		 * @type {{ tabs?: Array<{widgetId: string, label?: string, icon?: string, count?: number, countField?: string, overflow?: boolean}>, ariaLabel?: string, maxVisibleTabs?: number, hideEmpty?: boolean, moreLabel?: string, variant?: ('line'|'segmented') }}
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
		 * The configured tabs, each paired with the widget definition it names.
		 *
		 * A tab goes under the strip's "More" menu when it says `overflow`, when
		 * `content.hideEmpty` is set and its count is 0, or when
		 * `content.maxVisibleTabs` places are already taken. `count` is a
		 * literal, or read off the record through `countField`.
		 *
		 * @return {object[]} `{ key, widgetId, label, icon, widget, count, overflow }` per tab.
		 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-tab-counts-and-overflow
		 */
		resolvedTabs() {
			const tabs = Array.isArray(this.content?.tabs) ? this.content.tabs : []
			const max = Number(this.content?.maxVisibleTabs)
			const hideEmpty = this.content?.hideEmpty === true
			// How many tabs have taken a place in the strip so far. A tab that
			// is already going under "More" does not use one up.
			let placed = 0
			const resolved = []
			tabs.forEach((tab, index) => {
				// A tab whose condition is false is absent, not empty.
				const visibility = this.tabVisibility(tab, index)
				if (visibility === 'hidden') {
					return
				}
				const widgetId = typeof tab === 'string' ? tab : tab?.widgetId
				const widget = this.availableWidgets.find((w) => w && w.id === widgetId) || null
				const count = resolveTabCount(typeof tab === 'object' ? tab : null, this.objectData)
				let overflow = (tab && tab.overflow === true) || (hideEmpty && count === 0)
				if (!overflow) {
					if (Number.isFinite(max) && max > 0 && placed >= max) {
						overflow = true
					} else {
						placed += 1
					}
				}
				resolved.push({
					key: `${widgetId || 'tab'}-${index}`,
					id: (tab && typeof tab === 'object' && tab.id) || widgetId || '',
					widgetId,
					label: (tab && tab.label) || widgetTitleOf(widget) || widgetId || '',
					icon: (tab && tab.icon) || widget?.icon || '',
					widget,
					count,
					overflow,
					pending: visibility === 'pending',
				})
			})
			return resolved
		},

		/** @return {string} The keys of the tabs in the strip, to notice one appearing or going. */
		visibleKeys() {
			return this.resolvedTabs.map((tab) => tab.key).join('|')
		},

		/** @return {string} Accessible name of a pending tab's spinner. */
		loadingLabel() {
			return t('nextcloud-vue', 'Loading …')
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
			return this.content?.ariaLabel || t('nextcloud-vue', 'Details')
		},
	},

	watch: {
		activeIndex(index) {
			this.activeKey = this.resolvedTabs[index]?.key || ''
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
		},

		sourceConditionsKey() {
			this.refreshSourceVisibility()
		},
	},

	/**
	 * Open on the first tab that is in the strip. Tab 0 is the default, and
	 * when tab 0 sits under "More" the strip would open on a tab the author
	 * chose to tuck away.
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
			const first = this.resolvedTabs.findIndex((tab) => !tab.overflow && !tab.pending)
			const fallback = first >= 0 ? first : this.resolvedTabs.findIndex((tab) => !tab.overflow)
			if (fallback > 0) {
				this.activeIndex = fallback
			}
		}
		this.activeKey = this.resolvedTabs[this.activeIndex]?.key || ''
		this.refreshSourceVisibility()
	},

	mounted() {
		this._onRefresh = () => this.refreshSourceVisibility()
		subscribe('cn:page:refresh', this._onRefresh)
		subscribe('cn:widget:refresh', this._onRefresh)
	},

	beforeUnmount() {
		unsubscribe('cn:page:refresh', this._onRefresh)
		unsubscribe('cn:widget:refresh', this._onRefresh)
	},

	methods: {
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
				if (!this.objectData) {
					return 'pending'
				}
				return evaluateVisibleWhenLocal(cond, this.objectData) ? 'visible' : 'hidden'
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
			const ctx = { objectId: this.objectId, object: this.objectData || undefined }
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

.cn-tabs-widget__title {
	align-items: center;
	display: inline-flex;
	gap: 6px;
}

.cn-tabs-widget__title-icon {
	flex: 0 0 auto;
}
</style>
