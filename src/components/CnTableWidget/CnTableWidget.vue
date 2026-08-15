<!--
  CnTableWidget — DEPRECATED. Its features (card title, "View all" footer, row
  `limit`, `register`+`schemaId` self-fetch, `rowClickRoute`, `borderless`) have
  been folded into CnDataTable, so there is now a single table component. This
  thin shim forwards every prop to CnDataTable for backwards compatibility and
  warns once. Migrate to `<CnDataTable>` directly.
-->
<template>
	<CnDataTable
		:title="title"
		:rows="rows || []"
		:columns="columns"
		:register="register"
		:schema-id="schemaId"
		:limit="limit"
		:view-all-route="viewAllRoute"
		:view-all-label="viewAllLabel"
		:row-click-route="rowClickRoute"
		:empty-text="emptyText"
		:borderless="borderless" />
</template>

<script>
import CnDataTable from '../CnDataTable/CnDataTable.vue'

/** Warn only once per session, not per instance. */
let deprecationWarned = false

/**
 * CnTableWidget — DEPRECATED shim over CnDataTable.
 *
 * Use `CnDataTable` directly — it now supports `title`, `viewAllRoute`, `limit`,
 * `register`+`schemaId` self-fetch, `rowClickRoute`, and `borderless`. This shim
 * forwards all props for backwards compatibility and is slated for removal.
 */
export default {
	name: 'CnTableWidget',

	components: { CnDataTable },

	props: {
		/** Widget title shown in the header. */
		title: { type: String, default: '' },
		/** Drop the card chrome so the table sits flush inside another card. */
		borderless: { type: Boolean, default: false },
		/**
		 * External row data. When provided, no API calls are made.
		 * @type {object[]}
		 */
		rows: { type: Array, default: null },
		/**
		 * Column definitions for the table.
		 * @type {Array<{ key: string, label: string, sortable: boolean }>}
		 */
		columns: { type: Array, default: () => [] },
		/**
		 * OpenRegister register id for self-fetch mode.
		 * @type {string|number}
		 */
		register: { type: [String, Number], default: null },
		/**
		 * OpenRegister schema id for self-fetch mode.
		 * @type {string|number}
		 */
		schemaId: { type: [String, Number], default: null },
		/** Max rows to display before the "View all" link appears. */
		limit: { type: Number, default: 0 },
		/**
		 * vue-router route for the "View all" link.
		 * @type {object}
		 */
		viewAllRoute: { type: Object, default: null },
		/**
		 * Function returning a route object for row-click navigation.
		 * @type {Function}
		 */
		rowClickRoute: { type: Function, default: null },
		/** Pre-translated "View all" label. */
		viewAllLabel: { type: String, default: undefined },
		/** Pre-translated empty-state text. */
		emptyText: { type: String, default: undefined },
	},

	created() {
		if (!deprecationWarned) {
			deprecationWarned = true
			// eslint-disable-next-line no-console
			console.warn(
				'[nextcloud-vue] CnTableWidget is deprecated and will be removed. '
				+ 'Use <CnDataTable> directly — it now supports title, viewAllRoute, '
				+ 'limit, register+schemaId self-fetch, rowClickRoute, and borderless.',
			)
		}
	},
}
</script>
