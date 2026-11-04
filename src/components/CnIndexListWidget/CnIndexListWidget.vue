<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-index-list-widget" data-testid="cn-index-list-widget">
		<CnIndexPage
			v-if="ready"
			ref="page"
			v-bind="{ ...indexProps, ...panelMenuProps, ...rowRouteProps }"
			:register="content.register || ''"
			:schema="content.schema || null"
			:filter="resolvedFilter"
			:title="listTitle"
			:showTitle="false"
			:routeState="false"
			:buildiqButton="false"
			@rowClick="onRowClick" />
	</div>
</template>

<script>
import CnIndexPage from '../CnIndexPage/CnIndexPage.vue'
import { openRowTarget } from '../../utils/linkNavigation.js'
import { PANEL_ACTION_SINK } from '../../utils/panelActions.js'
import { resolveFilterTokens } from '../../utils/resolveFilterTokens.js'

/**
 * The keys of `content` the widget sets itself, so they are not passed on as
 * they stand.
 */
const OWN_KEYS = ['register', 'schema', 'filter', 'title', 'showTitle', 'routeState', 'buildiqButton', 'rowRoute']

/**
 * The entries of the list's Actions menu a tab strip takes over, each with the
 * list's own key that turns it off.
 */
const PANEL_MENU_ITEMS = [
	['import', 'showMassImport'],
	['export', 'showMassExport'],
	['copy-selected', 'showMassCopy'],
	['delete-selected', 'showMassDelete'],
]

/**
 * CnIndexListWidget — a list page's list inside a detail page: the records of
 * another schema that point at this one, with the list's own toolbar (lenses
 * with counts, search, the view switch, filters, selection and the pager).
 *
 * `content` takes the keys a `type: "index"` page takes in its `config`
 * (`register`, `schema`, `columns`, `lenses`, `viewModes`, `search`,
 * `selectable`, `actions`, `emptyText`, ...), plus `filter` with the
 * `@objectId` / `@object.<field>` tokens of this record: the base filter every
 * lens and search narrows further. The list writes nothing to the address;
 * the address belongs to the detail page (PqEvenement's Aanmeldingen tab).
 *
 * @spec openspec/changes/index-list-widget/specs/index-list-widget/spec.md
 */
export default {
	name: 'CnIndexListWidget',

	components: { CnIndexPage },

	inject: {
		/** The tab strip's menu channel (CnDetailWidgetHost narrows it to this panel); null outside a tab. */
		panelActionSink: { from: PANEL_ACTION_SINK, default: null },
	},

	props: {
		/** The list config, as a list page's `config`, with a token `filter`. */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** The record this list belongs to, for `@objectId`. */
		objectId: {
			type: [String, Number],
			default: '',
		},

		/** The record, for `@object.<field>`. */
		objectData: {
			type: Object,
			default: null,
		},
	},

	computed: {
		/**
		 * With `content.rowRoute` a row opens its own page: the row links there
		 * and a click on it goes there.
		 *
		 * @spec openspec/changes/notice-list-in-a-tab/specs/index-list-widget/spec.md#requirement-a-list-in-a-detail-page-opens-its-rows-on-their-page
		 * @return {object} The props, empty without a row route.
		 */
		rowRouteProps() {
			if (!this.rowRoute) {
				return {}
			}
			return { rowClickToView: true, viewTo: (row) => this.rowTarget(row) }
		},

		/**
		 * The page a row opens on (`content.rowRoute`, a route name taking the
		 * row's `id`), or '' when rows open nowhere.
		 *
		 * @spec openspec/changes/notice-list-in-a-tab/specs/index-list-widget/spec.md#requirement-a-list-in-a-detail-page-opens-its-rows-on-their-page
		 * @return {string} The route name.
		 */
		rowRoute() {
			const route = this.content && this.content.rowRoute
			return typeof route === 'string' ? route : ''
		},

		/**
		 * In a tab panel the list draws no Actions menu: its entries stand in
		 * the tab strip's menu, beside the tabs (PtMededelingenActies).
		 *
		 * @spec openspec/changes/notice-list-in-a-tab/specs/index-list-widget/spec.md#requirement-a-list-in-a-tab-hands-its-actions-menu-to-the-tab-strip
		 * @return {object} The props, empty outside a tab panel.
		 */
		panelMenuProps() {
			return this.panelActionSink ? { showActionsMenu: false } : {}
		},

		/**
		 * The base filter with this record's tokens filled in.
		 *
		 * @return {object} The filter.
		 */
		resolvedFilter() {
			const filter = this.content && typeof this.content.filter === 'object' && this.content.filter !== null ? this.content.filter : {}
			return resolveFilterTokens(filter, { objectId: String(this.objectId || ''), object: this.objectData || {} })
		},

		/**
		 * Whether every token the filter names has a value: a list filtered on
		 * a record it does not know yet would list every record.
		 *
		 * @return {boolean} True when the list may load.
		 */
		ready() {
			return Object.values(this.resolvedFilter).every((value) => value !== undefined && value !== null && value !== '' && !(typeof value === 'string' && value.startsWith('@')))
		},

		/**
		 * The list's heading for assistive technology: the widget's title, else the schema.
		 *
		 * @return {string} The title.
		 */
		listTitle() {
			return String((this.content && (this.content.title || this.content.schema)) || '')
		},

		/**
		 * Every other content key the index page declares, passed on as given.
		 *
		 * @return {object} The props.
		 */
		indexProps() {
			const props = CnIndexPage.props || {}
			const declared = new Set(Array.isArray(props) ? props : Object.keys(props))
			const out = {}
			for (const [key, value] of Object.entries(this.content || {})) {
				if (!OWN_KEYS.includes(key) && declared.has(key)) {
					out[key] = value
				}
			}
			return out
		},
	},

	/**
	 * Keep the tab strip's menu in step with this list's entries.
	 *
	 * @spec openspec/changes/notice-list-in-a-tab/specs/index-list-widget/spec.md#requirement-a-list-in-a-tab-hands-its-actions-menu-to-the-tab-strip
	 */
	mounted() {
		if (this.panelActionSink) {
			this.watchPanelMenu()
		}
	},

	/**
	 * Take this list's entries back out of the tab strip's menu.
	 *
	 * @spec openspec/changes/notice-list-in-a-tab/specs/index-list-widget/spec.md#requirement-a-list-in-a-tab-hands-its-actions-menu-to-the-tab-strip
	 */
	beforeUnmount() {
		if (this.panelActionSink) {
			this.panelActionSink.clear()
		}
	},

	methods: {
		/**
		 * The location a row opens: `content.rowRoute` with the row's id.
		 *
		 * @spec openspec/changes/notice-list-in-a-tab/specs/index-list-widget/spec.md#requirement-a-list-in-a-detail-page-opens-its-rows-on-their-page
		 * @param {object} row The row.
		 * @return {object|null} The router location, null for a row without an id.
		 */
		rowTarget(row) {
			const self = (row && row['@self']) || {}
			const id = row && (row.id ?? self.id ?? self.uuid ?? row.uuid)
			return id ? { name: this.rowRoute, params: { id: String(id) } } : null
		},

		/**
		 * Open a clicked row on its page, in a new tab for a modified click.
		 *
		 * @spec openspec/changes/notice-list-in-a-tab/specs/index-list-widget/spec.md#requirement-a-list-in-a-detail-page-opens-its-rows-on-their-page
		 * @param {object} row The row.
		 * @param {Event} [event] The click.
		 */
		onRowClick(row, event) {
			if (this.rowRoute) {
				openRowTarget(event, this.rowTarget(row), this.$router)
			}
		},

		/**
		 * Publish the list's menu entries to the tab strip, now and when they change.
		 *
		 * @spec openspec/changes/notice-list-in-a-tab/specs/index-list-widget/spec.md#requirement-a-list-in-a-tab-hands-its-actions-menu-to-the-tab-strip
		 */
		watchPanelMenu() {
			this.$watch(() => this.panelMenuItems(), (items) => this.panelActionSink.set(items), { immediate: true })
		},

		/**
		 * The list's Actions menu entries for the tab strip: Import, Export,
		 * Copy selected and Delete selected, less those the list turns off. Each
		 * runs on the list, so its dialogs and selection stay the list's own.
		 *
		 * @spec openspec/changes/notice-list-in-a-tab/specs/index-list-widget/spec.md#requirement-a-list-in-a-tab-hands-its-actions-menu-to-the-tab-strip
		 * @return {Array<{key: string, label: string, icon: string, disabled: boolean, run: () => void}>}
		 */
		panelMenuItems() {
			const page = this.$refs.page
			if (!page || typeof page.headerMenuEntries !== 'function') {
				return []
			}
			const content = this.content || {}
			const items = PANEL_MENU_ITEMS.filter(([, flag]) => content[flag] !== false).map(([name]) => name)
			return page.headerMenuEntries({ items })
				.filter((entry) => entry && !entry.kind && typeof entry.run === 'function')
				.map((entry) => ({ key: entry.key, label: entry.label, icon: entry.icon, disabled: Boolean(entry.disabled), run: entry.run }))
		},
	},
}
</script>

<style scoped>
/* The list stands in the host card: no page padding of its own. */
.cn-index-list-widget :deep(.cn-index-page) {
	padding: 0;
}
</style>
