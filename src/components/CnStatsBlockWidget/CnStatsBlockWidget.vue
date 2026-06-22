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
	<div :class="['cn-stats-block-widget', iconClass]">
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
	</div>
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

		/**
		 * Optional CSS class applied to the widget's outermost wrapping
		 * `<div>`. Designed for Nextcloud core icon classes (`icon-link`,
		 * `icon-mail`, `icon-history`, …) that ship with NC and render a
		 * 16×16 glyph via background-image. When empty (the default), the
		 * wrapper carries only the base `cn-stats-block-widget` class and
		 * is visually invisible.
		 *
		 * The wrapping element is a `<div>` with no layout styles of its
		 * own, so the rendered KPI tile keeps the same dimensions and
		 * spacing it had before this prop was added.
		 *
		 * MDI icon names (e.g. `'Database'`) are NOT supported here — that
		 * would require an async dynamic-import. Use `CnStatsBlock`
		 * directly when you need an MDI Vue component icon.
		 */
		iconClass: {
			type: String,
			default: '',
		},
	},

	setup(props) {
		// GraphQL count path is hidden from useDataSource when a plain
		// register+schema source is given — that case is served over REST
		// (fetchRest) against OpenRegister's /value aggregation, which is more
		// robust than the GraphQL count shorthand. Raw `graphql` still flows here.
		const dsForGraphql = () => {
			const ds = props.dataSource
			if (ds && ds.register && ds.schema && !ds.graphql) return null
			return ds
		}
		const { data, loading, error } = useDataSource(dsForGraphql)
		return { dsData: data, loading, error }
	},

	data() {
		return { restCount: null }
	},

	computed: {
		/** Stable signature of a REST-fetchable source (else null). */
		restKey() {
			const ds = this.dataSource || {}
			if (!ds.register || !ds.schema || ds.graphql) return null
			return JSON.stringify({
				register: ds.register, schema: ds.schema,
				metric: ds.metric || (ds.aggregate === 'count' ? 'count' : 'count'),
				field: ds.field || '', filter: ds.filter || {},
			})
		},
		resolvedCount() {
			if (typeof this.restCount === 'number') return this.restCount
			const value = this.dsData?.count
			if (typeof value === 'number') return value
			if (typeof value === 'string') {
				const parsed = Number(value)
				return Number.isFinite(parsed) ? parsed : 0
			}
			return 0
		},
	},

	watch: {
		restKey() { this.fetchRest() },
	},

	mounted() {
		this.fetchRest()
	},

	methods: {
		/**
		 * Fetch the count/value over REST from OpenRegister's /value aggregation
		 * when the source is a plain register+schema block (operator + dynamic
		 * tokens supported). Lazily imports axios/router. No-op for raw GraphQL.
		 *
		 * @return {Promise<void>}
		 */
		async fetchRest() {
			const ds = this.dataSource || {}
			if (!ds.register || !ds.schema || ds.graphql) { this.restCount = null; return }
			try {
				const [{ default: axios }, { generateUrl }, { resolveFilterTokens }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
					import('../../utils/resolveFilterTokens.js'),
				])
				const url = generateUrl(
					'/apps/openregister/api/objects/aggregations/{register}/{schema}/value',
					{ register: ds.register, schema: ds.schema },
				)
				const params = { metric: ds.metric || (ds.aggregate === 'count' ? 'count' : 'count') }
				if (ds.field) params.field = ds.field
				const filter = resolveFilterTokens(ds.filter || {})
				for (const [k, v] of Object.entries(filter)) {
					if (v && typeof v === 'object') {
						for (const [op, ov] of Object.entries(v)) params[`filter[${k}][${op}]`] = ov
					} else if (v !== '' && v !== null && v !== undefined) {
						params[`filter[${k}]`] = v
					}
				}
				const res = await axios.get(url, { params })
				this.restCount = Number(res?.data?.value ?? 0) || 0
			} catch (e) {
				this.restCount = null
			}
		},
	},
}
</script>
