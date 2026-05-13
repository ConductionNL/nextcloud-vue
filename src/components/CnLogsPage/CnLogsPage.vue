<!--
  CnLogsPage — Read-only audit-trail / activity-log surface.

  Wraps CnDataTable with timestamp / actor / action columns and
  pagination + filtering. Reads its data source from `config`:
    - { register, schema } → fetched via the OpenRegister object store
    - { source: '/api/url' } → fetched via axios.get(source)

  Mounted by CnPageRenderer when a manifest page declares
  `type: "logs"`. Honours `headerComponent`, `actionsComponent`, and
  the generic `slots` map from `pages[]` (forwarded by the renderer
  through scoped slots; this component just exposes `#header`,
  `#actions`, and `#row-actions` slots which the renderer fills).

  Backwards-compat: when neither `register+schema` nor `source` is
  set, the component renders an empty-state with a console warning
  rather than throwing — this keeps a misconfigured manifest from
  breaking the app shell.
-->
<template>
	<div class="cn-logs-page" data-testid="cn-logs-page">
		<!-- Header — overridable via #header slot (renderer fills via headerComponent or slots.header) -->
		<slot
			name="header"
			:title="title"
			:description="description"
			:icon="icon">
			<CnPageHeader
				v-if="showTitle && title"
				:title="title"
				:description="description"
				:icon="icon" />
		</slot>

		<!-- Actions slot — for refresh/export buttons (renderer fills via actionsComponent or slots.actions) -->
		<div v-if="$slots.actions || $scopedSlots.actions" class="cn-logs-page__actions">
			<slot name="actions" />
		</div>

		<!-- Body -->
		<div class="cn-logs-page__body">
			<!-- Loading state -->
			<div v-if="loading" class="cn-logs-page__loading">
				<NcLoadingIcon :size="32" />
			</div>

			<!-- Empty state — overridable via #empty slot -->
			<div v-else-if="rows.length === 0" class="cn-logs-page__empty">
				<slot name="empty">
					<NcEmptyContent :name="emptyText">
						<template #icon>
							<HistoryIcon :size="64" />
						</template>
					</NcEmptyContent>
				</slot>
			</div>

			<!-- Table -->
			<CnDataTable
				v-else
				:columns="resolvedColumns"
				:rows="rows"
				:row-key="rowKey"
				:empty-text="emptyText">
				<template
					v-for="col in slotColumns"
					#[`column-${col}`]="{ row, value }">
					<slot :name="'column-' + col" :row="row" :value="value" />
				</template>
				<template v-if="$scopedSlots['row-actions']" #row-actions="{ row }">
					<slot name="row-actions" :row="row" />
				</template>
			</CnDataTable>

			<!-- Error state -->
			<div v-if="error" class="cn-logs-page__error">
				<slot name="error" :error="error">
					<NcEmptyContent :name="errorText">
						<template #icon>
							<AlertCircleOutline :size="64" />
						</template>
					</NcEmptyContent>
				</slot>
			</div>
		</div>
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { NcEmptyContent, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import HistoryIcon from 'vue-material-design-icons/History.vue'
import { useObjectStore } from '../../store/index.js'
import { CnDataTable } from '../CnDataTable/index.js'
import { CnPageHeader } from '../CnPageHeader/index.js'

/**
 * CnLogsPage — Read-only audit-trail / activity-log page.
 *
 * Renders a CnDataTable with default columns of `timestamp / actor /
 * action / target / details`. The columns are overridable via the
 * `columns` prop (manifest: `pages[].config.columns`).
 *
 * Two data-fetch modes:
 *  - `register` + `schema`: fetched via `useObjectStore` as a regular
 *    OpenRegister collection. The store registers the type as
 *    `${register}-${schema}` per existing convention.
 *  - `source`: a custom URL fetched via `axios.get(source)`. The
 *    response shape may be either `{ results: [...] }` or a bare
 *    array; the component handles both. This escape hatch supports
 *    apps whose log surface is not OR-backed (e.g. a flat file).
 *
 * Slots:
 *  - `#header` — Replaces the default CnPageHeader.
 *  - `#actions` — Renders a right-aligned action area (refresh,
 *    export, etc.). The CnPageRenderer wires this from
 *    `pages[].actionsComponent` when present.
 *  - `#empty` — Replaces the empty-state block.
 *  - `#error` — Replaces the error block. Scope: `{ error }`.
 *  - `#row-actions` — Per-row action menu in the table. Scope:
 *    `{ row }`.
 *  - `#column-<key>` — Per-column custom cell renderer. Scope:
 *    `{ row, value }`.
 *
 * Props are intentionally permissive — every default has a sensible
 * fallback, so a manifest entry as small as
 * `{ type: "logs", config: { source: "/api/logs" } }` renders.
 */
export default {
	name: 'CnLogsPage',

	components: {
		NcEmptyContent,
		NcLoadingIcon,
		HistoryIcon,
		AlertCircleOutline,
		CnDataTable,
		CnPageHeader,
	},

	props: {
		/** Page title. Defaults to "Activity log" so a bare manifest entry still renders meaningfully. */
		title: {
			type: String,
			default: () => t('nextcloud-vue', 'Activity log'),
		},

		/** Description shown under the title when `showTitle` is set. */
		description: {
			type: String,
			default: '',
		},

		/** Whether to render the inline page header. Default false to mirror CnIndexPage. */
		showTitle: {
			type: Boolean,
			default: false,
		},

		/** MDI icon name for the header. */
		icon: {
			type: String,
			default: '',
		},

		/** OpenRegister register slug. Required (with `schema`) for store-backed mode. */
		register: {
			type: String,
			default: '',
		},

		/** OpenRegister schema slug. Required (with `register`) for store-backed mode. */
		schema: {
			type: String,
			default: '',
		},

		/** Custom log source URL — used when `register`+`schema` is not set. */
		source: {
			type: String,
			default: '',
		},

		/**
		 * Column definitions for the table. When omitted, the component
		 * uses a sensible default of `[timestamp, actor, action, target, details]`.
		 * Pass either an array of strings (treated as keys + auto-labels)
		 * OR an array of `{ key, label, sortable, width }` objects.
		 *
		 * @type {Array<string|{key: string, label: string}>}
		 */
		columns: {
			type: Array,
			default: () => [],
		},

		/** Row identifier property. Defaults to `id` (matches OR + most custom log shapes). */
		rowKey: {
			type: String,
			default: 'id',
		},

		/** Text shown when there are no log entries. */
		emptyText: {
			type: String,
			default: () => t('nextcloud-vue', 'No log entries to show'),
		},

		/** Text shown when the fetch fails. */
		errorText: {
			type: String,
			default: () => t('nextcloud-vue', 'Could not load log entries'),
		},

		/**
		 * Override the object store. Useful when the consuming app calls
		 * `createObjectStore` with a custom ID. When null, the default
		 * `useObjectStore()` is used. The component skips store wiring
		 * entirely when in `source` mode.
		 *
		 * @type {object|null}
		 */
		store: {
			type: Object,
			default: null,
		},
	},

	emits: ['action'],

	data() {
		return {
			localRows: [],
			loading: false,
			error: null,
		}
	},

	computed: {
		/** Resolved object-type slug for the store: `${register}-${schema}`. */
		objectType() {
			if (this.register && this.schema) {
				return `${this.register}-${this.schema}`
			}
			return ''
		},

		/** Whether the component should fetch via the object store. */
		usesStore() {
			return !!this.objectType
		},

		/** Whether the component should fetch via axios. */
		usesSource() {
			return !this.usesStore && !!this.source
		},

		/** Effective object store instance. */
		objectStore() {
			if (!this.usesStore) return null
			return this.store || useObjectStore()
		},

		/** Rows to render: store-backed collection or local rows from axios. */
		rows() {
			if (this.usesStore && this.objectStore) {
				return this.objectStore.collections?.[this.objectType] ?? []
			}
			return this.localRows
		},

		/**
		 * Resolved columns. A consumer-provided list wins; otherwise we
		 * use the conventional log columns. String entries are expanded
		 * to `{ key, label }` objects.
		 */
		resolvedColumns() {
			const cols = this.columns.length > 0
				? this.columns
				: [
						{ key: 'timestamp', label: t('nextcloud-vue', 'Timestamp'), sortable: true },
						{ key: 'actor', label: t('nextcloud-vue', 'Actor'), sortable: true },
						{ key: 'action', label: t('nextcloud-vue', 'Action'), sortable: true },
						{ key: 'target', label: t('nextcloud-vue', 'Target') },
						{ key: 'details', label: t('nextcloud-vue', 'Details') },
					]
			return cols.map((c) => (typeof c === 'string' ? { key: c, label: this.humanise(c) } : c))
		},

		/** Column slot names that the parent has provided (for pass-through). */
		slotColumns() {
			return Object.keys(this.$scopedSlots || {})
				.filter((name) => name.startsWith('column-'))
				.map((name) => name.replace('column-', ''))
		},
	},

	watch: {
		register() { this.fetch() },
		schema() { this.fetch() },
		source() { this.fetch() },
	},

	mounted() {
		this.fetch()
	},

	methods: {
		/**
		 * Capitalise + space a snake_case / camelCase key for a default column label.
		 *
		 * @param {string} key
		 */
		humanise(key) {
			const spaced = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase()
			return spaced.charAt(0).toUpperCase() + spaced.slice(1)
		},

		/**
		 * Fetch log entries from the resolved data source.
		 *
		 * Falls through silently when neither mode is configured — the
		 * empty-state covers that case.
		 */
		async fetch() {
			if (this.usesStore && this.objectStore) {
				this.loading = true
				this.error = null
				try {
					if (typeof this.objectStore.registerObjectType === 'function') {
						// (slug, schemaId, registerId, slugs) — slugs go into the id
						// slots because OR's REST accepts kebab slugs there, and into
						// the 4th-arg slug hints for live-updates. Passing
						// `{register, schema}` as the second arg breaks fetch URLs.
						this.objectStore.registerObjectType(
							this.objectType,
							this.schema,
							this.register,
							{ registerSlug: this.register, schemaSlug: this.schema },
						)
					}
					if (typeof this.objectStore.fetchCollection === 'function') {
						await this.objectStore.fetchCollection(this.objectType)
					}
				} catch (err) {
					this.error = err
				} finally {
					this.loading = false
				}
				return
			}
			if (this.usesSource) {
				this.loading = true
				this.error = null
				try {
					const response = await axios.get(this.source)
					const body = response?.data
					if (Array.isArray(body)) {
						this.localRows = body
					} else if (body && Array.isArray(body.results)) {
						this.localRows = body.results
					} else if (body && Array.isArray(body.entries)) {
						this.localRows = body.entries
					} else {
						this.localRows = []
					}
				} catch (err) {
					this.error = err
					this.localRows = []
				} finally {
					this.loading = false
				}
				return
			}
			// Misconfigured — surface a console warning so a developer notices.

			console.warn('[CnLogsPage] Neither register+schema nor source configured; rendering empty state.')
		},

		/**
		 * Re-fetch from the source. Exposed so refresh buttons in
		 * actionsComponent can call `$parent.refresh()`.
		 *
		 * @public
		 */
		refresh() {
			this.fetch()
		},
	},
}
</script>

<style scoped>
.cn-logs-page {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.cn-logs-page__actions {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
}

.cn-logs-page__loading,
.cn-logs-page__empty,
.cn-logs-page__error {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 200px;
}
</style>
