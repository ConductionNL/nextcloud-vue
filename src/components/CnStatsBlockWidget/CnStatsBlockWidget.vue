<!--
  CnStatsBlockWidget — Manifest-driven stats block.

  Thin wrapper around CnStatsBlock that pulls its count from a
  `dataSource` block on a dashboard widget definition. The
  dispatcher in CnDashboardPage mounts this when
  `widgetDef.type === 'stats-block'`.

  Static usage (no data fetching) is intentionally NOT supported —
  use CnStatsBlock directly when you already have a count number.
-->
<template>
	<CnStatsBlock
		:title="title"
		:count="resolvedCount"
		:count-label="countLabel"
		:loading="loading"
		:variant="variant"
		:show-zero-count="showZeroCount"
		:horizontal="horizontal"
		:clickable="!!route"
		:route="route" />
</template>

<script>
import CnStatsBlock from '../CnStatsBlock/CnStatsBlock.vue'
import { useDataSource } from '../../composables/useDataSource.js'

/**
 * CnStatsBlockWidget — Stats-block dashboard widget.
 *
 * Reads a `dataSource` block (manifest shorthand or raw GraphQL)
 * and forwards the resolved count to CnStatsBlock. Loading state
 * propagates through; resolution errors fall back to count = 0
 * with an empty-state label so the dashboard doesn't blank.
 *
 * Manifest example (decidesk dashboard):
 * ```json
 * {
 *   "id": "minutes-in-review",
 *   "type": "stats-block",
 *   "title": "Notulen ter goedkeuring",
 *   "iconClass": "icon-file",
 *   "props": { "countLabel": "notulen", "variant": "warning" },
 *   "dataSource": {
 *     "register": "decidesk",
 *     "schema": "minutes",
 *     "filter": { "lifecycle": "review" },
 *     "aggregate": "count"
 *   }
 * }
 * ```
 */
export default {
	name: 'CnStatsBlockWidget',

	components: { CnStatsBlock },

	props: {
		/**
		 * Manifest dataSource block. See `useDataSource`. Required —
		 * a stats-block widget without a data source has no count
		 * to render.
		 *
		 * @type {{
		 *   register?: string,
		 *   schema?: string,
		 *   filter?: object,
		 *   aggregate?: 'count',
		 *   graphql?: { query: string, variables?: object, selectors: object }
		 * }}
		 */
		dataSource: {
			type: Object,
			required: true,
		},

		/** Block title (manifest `widgetDef.title`). */
		title: {
			type: String,
			default: '',
		},

		/** Label displayed next to the count. */
		countLabel: {
			type: String,
			default: '',
		},

		/** Color variant: default | primary | success | warning | error. */
		variant: {
			type: String,
			default: 'default',
		},

		/** Whether to show 0 as a real count instead of the empty label. */
		showZeroCount: {
			type: Boolean,
			default: true,
		},

		/** Use horizontal layout (icon left, content right). */
		horizontal: {
			type: Boolean,
			default: false,
		},

		/**
		 * Vue-router location to navigate to on click. When set, the
		 * inner CnStatsBlock renders as a `<router-link>`.
		 * @type {object|null}
		 */
		route: {
			type: Object,
			default: null,
		},
	},

	setup(props) {
		const { data, loading, error } = useDataSource(() => props.dataSource)
		return { dsData: data, loading, error }
	},

	computed: {
		resolvedCount() {
			const value = this.dsData?.count
			if (typeof value === 'number') return value
			if (typeof value === 'string') {
				const parsed = Number(value)
				return Number.isFinite(parsed) ? parsed : 0
			}
			return 0
		},
	},
}
</script>
