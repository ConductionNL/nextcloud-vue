<!--
  CnTableWidget — Data table widget with card wrapper and dual data sourcing.

  Wraps CnDataTable in a card container with a title header, optional "View all"
  footer link, and loading/empty states. Supports two data modes:
  1. External: `rows` prop provided (no API calls)
  2. Self-fetch: `register` + `schemaId` provided (fetches from OpenRegister API)

  Used in dashboard and detail page grid layouts for displaying related data tables.
-->
<template>
	<div class="cn-table-widget">
		<!-- Header -->
		<div v-if="title" class="cn-table-widget__header">
			<h3 class="cn-table-widget__title">
				{{ title }}
			</h3>
			<span v-if="totalCount > 0" class="cn-table-widget__count">
				{{ totalCount }}
			</span>
		</div>

		<!-- Loading state -->
		<NcLoadingIcon v-if="isLoading" class="cn-table-widget__loading" :size="32" />

		<!-- Empty state -->
		<p v-else-if="displayRows.length === 0" class="cn-table-widget__empty">
			{{ emptyText }}
		</p>

		<!-- Data table -->
		<CnDataTable
			v-else
			:rows="displayRows"
			:columns="columns"
			:loading="false"
			:selectable="false"
			@row-click="onRowClick" />

		<!-- Footer with view all link -->
		<div
			v-if="viewAllRoute && totalCount > limitedCount"
			class="cn-table-widget__footer">
			<a
				class="cn-table-widget__view-all"
				@click.prevent="$router.push(viewAllRoute)">
				{{ viewAllLabel }}
			</a>
		</div>
	</div>
</template>

<script>
import { NcLoadingIcon } from '@nextcloud/vue'
import CnDataTable from '../CnDataTable/CnDataTable.vue'

/**
 * CnTableWidget — Data table widget with card wrapper and dual data sourcing.
 *
 * @example External data mode
 * <CnTableWidget
 *   title="Related Skills"
 *   :rows="skillRows"
 *   :columns="skillColumns"
 *   :view-all-route="{ name: 'Skills' }" />
 *
 * @example Self-fetch mode
 * <CnTableWidget
 *   title="Documents"
 *   register="9"
 *   schema-id="42"
 *   :limit="5" />
 */
export default {
	name: 'CnTableWidget',

	components: {
		NcLoadingIcon,
		CnDataTable,
	},

	props: {
		/** Widget title shown in the header. */
		title: {
			type: String,
			default: '',
		},
		/**
		 * External row data. When provided, no API calls are made.
		 *
		 * @type {object[]}
		 */
		rows: {
			type: Array,
			default: null,
		},
		/**
		 * Column definitions for CnDataTable.
		 *
		 * @type {{ key: string, label: string, sortable?: boolean }[]}
		 */
		columns: {
			type: Array,
			default: () => [],
		},
		/**
		 * OpenRegister register ID for self-fetch mode.
		 *
		 * @type {string|number}
		 */
		register: {
			type: [String, Number],
			default: null,
		},
		/**
		 * OpenRegister schema ID for self-fetch mode.
		 *
		 * @type {string|number}
		 */
		schemaId: {
			type: [String, Number],
			default: null,
		},
		/**
		 * Maximum number of rows to display. When total exceeds this,
		 * a "View all" link appears.
		 *
		 * @type {number}
		 */
		limit: {
			type: Number,
			default: 0,
		},
		/**
		 * Vue Router route for the "View all" link.
		 *
		 * @type {object}
		 */
		viewAllRoute: {
			type: Object,
			default: null,
		},
		/**
		 * Function that returns a route object for row click navigation.
		 * Receives the row data as argument.
		 *
		 * @type {Function}
		 */
		rowClickRoute: {
			type: Function,
			default: null,
		},
		/** Pre-translated "View all" label. */
		viewAllLabel: {
			type: String,
			default: 'View all',
		},
		/** Pre-translated empty state text. */
		emptyText: {
			type: String,
			default: 'No data available',
		},
	},

	data() {
		return {
			fetchedRows: [],
			loading: false,
		}
	},

	computed: {
		/**
		 * Whether data is currently loading.
		 *
		 * @returns {boolean}
		 */
		isLoading() {
			return this.loading
		},

		/**
		 * All rows (external or fetched).
		 *
		 * @returns {object[]}
		 */
		allRows() {
			return this.rows || this.fetchedRows
		},

		/**
		 * Rows limited to the configured limit.
		 *
		 * @returns {object[]}
		 */
		displayRows() {
			if (this.limit > 0) {
				return this.allRows.slice(0, this.limit)
			}
			return this.allRows
		},

		/**
		 * Total count of all rows (before limiting).
		 *
		 * @returns {number}
		 */
		totalCount() {
			return this.allRows.length
		},

		/**
		 * Count of displayed rows (after limiting).
		 *
		 * @returns {number}
		 */
		limitedCount() {
			return this.displayRows.length
		},
	},

	mounted() {
		if (this.rows === null && this.register && this.schemaId) {
			this.fetchData()
		}
	},

	methods: {
		/**
		 * Fetch data from the OpenRegister API.
		 *
		 * @returns {Promise<void>}
		 */
		async fetchData() {
			this.loading = true
			try {
				const url = `/index.php/apps/openregister/api/objects/${this.register}/${this.schemaId}`
				const response = await fetch(url, {
					headers: {
						'Content-Type': 'application/json',
						'OCS-APIREQUEST': 'true',
					},
				})
				if (response.ok) {
					const data = await response.json()
					this.fetchedRows = data.results || data || []
				}
			} catch (error) {
				console.error('CnTableWidget: Failed to fetch data', error)
			} finally {
				this.loading = false
			}
		},

		/**
		 * Handle row click events. Navigates if rowClickRoute is configured.
		 *
		 * @param {object} row - The clicked row data.
		 */
		onRowClick(row) {
			if (this.rowClickRoute) {
				const route = this.rowClickRoute(row)
				if (route) {
					this.$router.push(route)
				}
			}
		},
	},
}
</script>

<style scoped>
.cn-table-widget {
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 16px);
	overflow: hidden;
}

.cn-table-widget__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	border-bottom: 1px solid var(--color-border);
}

.cn-table-widget__title {
	margin: 0;
	font-size: 14px;
	font-weight: 600;
}

.cn-table-widget__count {
	font-size: 12px;
	color: var(--color-text-maxcontrast);
	background: var(--color-background-dark);
	padding: 2px 8px;
	border-radius: 10px;
}

.cn-table-widget__loading {
	padding: 32px 0;
	display: flex;
	justify-content: center;
}

.cn-table-widget__empty {
	padding: 24px 16px;
	text-align: center;
	color: var(--color-text-maxcontrast);
	font-size: 14px;
	margin: 0;
}

.cn-table-widget__footer {
	padding: 8px 16px;
	border-top: 1px solid var(--color-border);
	text-align: center;
}

.cn-table-widget__view-all {
	font-size: 13px;
	color: var(--color-primary-element);
	cursor: pointer;
	text-decoration: none;
}

.cn-table-widget__view-all:hover {
	text-decoration: underline;
}
</style>
