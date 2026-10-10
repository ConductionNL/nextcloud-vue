<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  CnIndexPageWidgets — the widgets an index page draws around its list
  (screens-index-stat-row): the KPI tiles above it (`statRow`, an auto-fit row)
  and the cards beside it (`sidePanel`, a column). Each entry is a dashboard
  widget definition `{ id, type, title?, content, headerLink? }`, resolved like
  a dashboard widget: the app's registry, then the dashboard catalog, then the
  built-in widgets. Internal to CnIndexPage.
-->
<template>
	<component
		:is="variant === 'stat-row' ? 'CnKpiGrid' : 'aside'"
		v-if="entries.length > 0"
		:columns="variant === 'stat-row' ? 'auto' : undefined"
		class="cn-index-page-widgets"
		:class="['cn-index-page-widgets--' + variant]"
		:data-testid="'cn-index-page-' + variant">
		<div
			v-for="entry in entries"
			:key="entry.id"
			class="cn-index-page-widgets__cell"
			:data-testid="'cn-index-page-widget-' + entry.id">
			<CnWidgetWrapper
				:widgetId="entry.id"
				:title="entry.title"
				:showTitle="variant === 'side-panel' && entry.title !== ''"
				:showActions="false"
				:showRefresh="false"
				:headerLink="entry.headerLink"
				:flush="variant === 'stat-row'">
				<component
					:is="entry.renderer"
					:widgetId="entry.id"
					:content="entry.content"
					v-bind="entry.content" />
			</CnWidgetWrapper>
		</div>
	</component>
</template>

<script>
import CnKpiGrid from '../CnKpiGrid/CnKpiGrid.vue'
import CnWidgetWrapper from '../CnWidgetWrapper/CnWidgetWrapper.vue'
import { canonicalWidgetType } from '../../utils/widgetTypeAliases.js'
import { BUILT_IN_WIDGETS } from '../CnWidgetGrid/builtInWidgets.js'
import { getWidgetTypeEntry } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

// Populate the dashboard catalog (stat, table, people, …): an index page
// may be the first surface that resolves a widget type.
import '../CnWidgetGrid/registerDashboardWidgets.js'

export default {
	name: 'CnIndexPageWidgets',

	components: {
		CnKpiGrid,
		CnWidgetWrapper,
	},

	inject: {
		/** Consumer widget registry provided by CnAppRoot (custom over built-in). */
		cnRegistry: { default: () => ({}) },
		/** Host translate function provided by CnAppRoot. */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * Widget definitions `{ id, type, title?, content?, headerLink? }`.
		 * An entry without an id or with a type no layer resolves is skipped.
		 */
		widgets: {
			type: Array,
			default: () => [],
		},

		/** Where the widgets sit: `stat-row` above the list, `side-panel` beside it. */
		variant: {
			type: String,
			default: 'stat-row',
			validator: (v) => ['stat-row', 'side-panel'].includes(v),
		},
	},

	computed: {
		/**
		 * The renderable entries, in the listed order.
		 *
		 * @spec openspec/changes/screens-index-stat-row/specs/index-page/spec.md#requirement-an-index-page-can-draw-a-stat-row-above-the-list
		 * @return {Array<{id: string, title: string, content: object, headerLink: (object|null), renderer: object}>}
		 */
		entries() {
			const list = Array.isArray(this.widgets) ? this.widgets : []
			const out = []
			for (const def of list) {
				if (!def || typeof def.id !== 'string' || def.id === '' || typeof def.type !== 'string') {
					continue
				}
				const renderer = this.resolveRenderer(def.type)
				if (!renderer) {
					if (process.env.NODE_ENV !== 'production') {
						// eslint-disable-next-line no-console
						console.warn(`[CnIndexPage] ${this.variant} widget "${def.id}" has type "${def.type}", which no widget registry resolves; skipped.`)
					}
					continue
				}
				const translate = typeof this.cnTranslate === 'function' ? this.cnTranslate : (key) => key
				out.push({
					id: def.id,
					title: typeof def.title === 'string' && def.title !== '' ? translate(def.title) : '',
					content: (def.content && typeof def.content === 'object') ? def.content : {},
					headerLink: (def.headerLink && typeof def.headerLink === 'object') ? def.headerLink : null,
					renderer,
				})
			}
			return out
		},
	},

	methods: {
		/**
		 * Resolve a widget type: the consumer registry, then the dashboard
		 * catalog (the type as written, then its alias), then the built-ins.
		 *
		 * @param {string} type The widget type.
		 * @return {object|null} The component, or null.
		 */
		resolveRenderer(type) {
			const consumer = (this.cnRegistry || {})[type]
			if (consumer) {
				return consumer.component ?? consumer
			}
			const entry = getWidgetTypeEntry(type) || getWidgetTypeEntry(canonicalWidgetType(type))
			if (entry && entry.renderer) {
				return entry.renderer
			}
			return BUILT_IN_WIDGETS[type] || BUILT_IN_WIDGETS[canonicalWidgetType(type)] || null
		},
	},
}
</script>

<style scoped>
.cn-index-page-widgets--stat-row {
	margin-bottom: var(--cn-board-section-gap, 20px);
}

.cn-index-page-widgets__cell {
	display: flex;
	min-width: 0;
}

.cn-index-page-widgets__cell > * {
	flex: 1 1 auto;
	min-width: 0;
}

/* The side panel column (DqTeamwachtrij: 300px, 16px between cards). Its
   place beside the toolbar and the list is set by CnIndexPage
   (`cn-index-page--with-side-panel`, index-page.css). */
.cn-index-page-widgets--side-panel {
	display: flex;
	flex-direction: column;
	gap: 16px;
	min-width: 0;
}
</style>
