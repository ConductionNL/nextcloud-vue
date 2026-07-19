<!--
  CnVersionHistory — object version-history + field-by-field diff
  viewer for the integration registry.

  Lists an OpenRegister object's audit-trail entries (timestamp, user,
  semantic version, action) newest-first, and lets the user open a
  structural diff for one entry, or "compare" two checked entries.
  OpenRegister only stores a per-field `changed` delta per entry (no
  full before/after snapshot), so a multi-entry compare is
  reconstructed by folding the range's deltas (`foldAuditTrailEntries`)
  before diffing (`computeObjectDiff`) — see the `version-diff-viewer`
  openspec change's design notes.
-->
<template>
	<CnDetailCard :title="resolvedTitle" :icon="FileCompare" :collapsible="collapsible">
		<NcLoadingIcon v-if="loading && entries.length === 0" />
		<div v-else-if="entries.length === 0" class="cn-version-history__empty">
			{{ noEntriesLabel }}
		</div>
		<div v-else-if="activeDiff === null" class="cn-version-history__list">
			<ul class="cn-version-history__rows">
				<li
					v-for="entry in entries"
					:key="entry.id"
					class="cn-version-history__row">
					<NcCheckboxRadioSwitch
						:model-value="isSelected(entry.id)"
						:disabled="isSelected(entry.id) === false && selectedIds.length >= 2"
						:aria-label="selectForCompareLabel"
						@update:checked="toggleSelected(entry.id, $event)" />
					<button class="cn-version-history__row-main" type="button" @click="openSingleDiff(entry)">
						<span class="cn-version-history__version">{{ entry.version || fallbackVersionLabel }}</span>
						<span class="cn-version-history__action">{{ entry.action || '' }}</span>
						<span class="cn-version-history__when">{{ formatWhen(entry) }}</span>
						<span class="cn-version-history__user">{{ formatUser(entry) }}</span>
					</button>
				</li>
			</ul>
			<div class="cn-version-history__toolbar">
				<NcButton
					:disabled="selectedIds.length !== 2"
					variant="secondary"
					@click="openCompareDiff">
					<template #icon>
						<Compare :size="18" />
					</template>
					{{ compareLabel }}
				</NcButton>
				<NcButton
					v-if="hasMore"
					variant="tertiary"
					:disabled="loadingMore"
					@click="loadMore">
					{{ loadMoreLabel }}
				</NcButton>
			</div>
		</div>
		<div v-else class="cn-version-history__diff">
			<div class="cn-version-history__diff-toolbar">
				<NcButton variant="tertiary" @click="closeDiff">
					{{ backLabel }}
				</NcButton>
				<NcCheckboxRadioSwitch :model-value="showAllFields" @update:model-value="showAllFields = $event">
					{{ showAllFieldsLabel }}
				</NcCheckboxRadioSwitch>
			</div>
			<table v-if="visibleDiffRows.length > 0" class="cn-version-history__diff-table">
				<thead>
					<tr>
						<th>{{ fieldLabel }}</th>
						<th>{{ oldValueLabel }}</th>
						<th>{{ newValueLabel }}</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="row in visibleDiffRows" :key="row.path" :class="rowClass(row.type)">
						<td class="cn-version-history__diff-field">
							{{ row.path }}
						</td>
						<td class="cn-version-history__diff-value">
							<component :is="valueCellTag(row)" v-bind="valueCellProps(row)">
								<template v-if="isNestedValue(row) === true">
									<div
										v-for="line in nestedLines(row, 'old')"
										:key="line.path"
										:class="lineClass(line.type)">
										{{ line.text }}
									</div>
								</template>
								<template v-else>
									{{ formatScalar(row.oldValue) }}
								</template>
							</component>
						</td>
						<td class="cn-version-history__diff-value">
							<component :is="valueCellTag(row)" v-bind="valueCellProps(row)">
								<template v-if="isNestedValue(row) === true">
									<div
										v-for="line in nestedLines(row, 'new')"
										:key="line.path"
										:class="lineClass(line.type)">
										{{ line.text }}
									</div>
								</template>
								<template v-else>
									{{ formatScalar(row.newValue) }}
								</template>
							</component>
						</td>
					</tr>
				</tbody>
			</table>
			<div v-else class="cn-version-history__diff-empty">
				{{ noChangesLabel }}
			</div>
		</div>
	</CnDetailCard>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcLoadingIcon, NcButton, NcCheckboxRadioSwitch } from '@nextcloud/vue'
import FileCompare from 'vue-material-design-icons/FileCompare.vue'
import Compare from 'vue-material-design-icons/Compare.vue'
import CnDetailCard from '../CnDetailCard/CnDetailCard.vue'
import { buildHeaders } from '../../utils/index.js'
import { computeObjectDiff } from '../../utils/computeObjectDiff.js'
import { foldAuditTrailEntries } from '../../utils/auditTrailDiff.js'

/**
 * A single row rendered in the top-level diff table.
 *
 * @typedef {object} FieldDiffRow
 * @property {string} path Field name.
 * @property {'added'|'removed'|'changed'|'unchanged'} type Classification.
 * @property {*} oldValue Value before.
 * @property {*} newValue Value after.
 */

/**
 * Classify one top-level field between two folded states, reusing
 * `computeObjectDiff` to decide equality (so nested objects/arrays are
 * compared structurally, not by reference).
 *
 * @param {string} key Field name.
 * @param {object} oldState Folded "before" state.
 * @param {object} newState Folded "after" state.
 * @return {FieldDiffRow} The classified row.
 */
function classifyField(key, oldState, newState) {
	const oldMissing = Object.prototype.hasOwnProperty.call(oldState, key) === false
	const newMissing = Object.prototype.hasOwnProperty.call(newState, key) === false
	const oldValue = oldState[key]
	const newValue = newState[key]

	if (oldMissing === true && newMissing === false) {
		return { path: key, type: 'added', oldValue: undefined, newValue }
	}
	if (oldMissing === false && newMissing === true) {
		return { path: key, type: 'removed', oldValue, newValue: undefined }
	}
	const nested = computeObjectDiff(oldValue, newValue)
	const isChanged = nested.some((entry) => entry.type !== 'unchanged')
	return { path: key, type: isChanged ? 'changed' : 'unchanged', oldValue, newValue }
}

/**
 * Build the top-level field-by-field diff table for a folded
 * before/after state pair.
 *
 * @param {object} oldState Folded "before" state.
 * @param {object} newState Folded "after" state.
 * @return {FieldDiffRow[]} One row per touched field, sorted by field name.
 */
function buildFieldRows(oldState, newState) {
	const keys = Array.from(new Set([...Object.keys(oldState), ...Object.keys(newState)])).sort()
	return keys.map((key) => classifyField(key, oldState, newState))
}

/**
 * CnVersionHistory — object version-history list plus field-by-field
 * diff viewer, rendered by the integration registry on sidebar-tab
 * and dashboard/detail-widget surfaces alike.
 *
 * Basic usage
 * ```vue
 * <CnVersionHistory
 *   :register="registerId"
 *   :schema="schemaId"
 *   :object-id="objectId"
 *   surface="detail-page" />
 * ```
 */
export default {
	name: 'CnVersionHistory',

	components: { CnDetailCard, NcLoadingIcon, NcButton, NcCheckboxRadioSwitch, Compare },

	props: {
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, required: true },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, required: true },
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** Rendering surface — passed for AD-19 surface fallback consumers. */
		surface: {
			type: String,
			default: 'detail-page',
			validator: (value) => ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity'].includes(value),
		},
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Number of history entries to fetch per page. */
		pageSize: { type: Number, default: 20 },
		/** Whether the card collapses. */
		collapsible: { type: Boolean, default: false },
		/** Override the card title (defaults to the translated label). */
		title: { type: String, default: '' },
		/** Pre-translated empty-history label. */
		noEntriesLabel: { type: String, default: () => t('nextcloud-vue', 'No version history yet') },
		/** Pre-translated fallback shown when an entry carries no semantic version. */
		fallbackVersionLabel: { type: String, default: () => t('nextcloud-vue', 'Unversioned change') },
		/** Pre-translated "select for compare" checkbox label. */
		selectForCompareLabel: { type: String, default: () => t('nextcloud-vue', 'Select for compare') },
		/** Pre-translated compare-action label. */
		compareLabel: { type: String, default: () => t('nextcloud-vue', 'Compare selected') },
		/** Pre-translated load-more label. */
		loadMoreLabel: { type: String, default: () => t('nextcloud-vue', 'Load more') },
		/** Pre-translated back-to-list label. */
		backLabel: { type: String, default: () => t('nextcloud-vue', 'Back to history') },
		/** Pre-translated "show all fields" toggle label. */
		showAllFieldsLabel: { type: String, default: () => t('nextcloud-vue', 'Show all fields') },
		/** Pre-translated diff table field-column header. */
		fieldLabel: { type: String, default: () => t('nextcloud-vue', 'Field') },
		/** Pre-translated diff table old-value-column header. */
		oldValueLabel: { type: String, default: () => t('nextcloud-vue', 'Old value') },
		/** Pre-translated diff table new-value-column header. */
		newValueLabel: { type: String, default: () => t('nextcloud-vue', 'New value') },
		/** Pre-translated label shown when a diff has no visible rows. */
		noChangesLabel: { type: String, default: () => t('nextcloud-vue', 'No field changes to show') },
	},

	data() {
		return {
			FileCompare,
			entries: [],
			loading: false,
			loadingMore: false,
			page: 1,
			total: 0,
			selectedIds: [],
			/** `null` = list view; otherwise `{ oldState, newState }` for the open diff. */
			activeDiff: null,
			showAllFields: false,
		}
	},

	computed: {
		resolvedTitle() {
			return this.title || t('nextcloud-vue', 'Version history')
		},
		hasMore() {
			return this.entries.length < this.total
		},
		diffRows() {
			if (this.activeDiff === null) {
				return []
			}
			return buildFieldRows(this.activeDiff.oldState, this.activeDiff.newState)
		},
		visibleDiffRows() {
			if (this.showAllFields === true) {
				return this.diffRows
			}
			return this.diffRows.filter((row) => row.type !== 'unchanged')
		},
	},

	watch: {
		objectId: {
			immediate: true,
			handler(id) {
				if (id) {
					this.resetAndFetch()
				}
			},
		},
	},

	methods: {
		resetAndFetch() {
			this.page = 1
			this.entries = []
			this.selectedIds = []
			this.activeDiff = null
			this.fetchEntries()
		},

		async fetchEntries() {
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			this.loading = this.page === 1
			this.loadingMore = this.page > 1
			try {
				const params = new URLSearchParams()
				params.set('limit', String(this.pageSize))
				params.set('_page', String(this.page))
				params.set('_sort[created]', 'DESC')
				const url = generateUrl(`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/audit-trails`)
				const response = await fetch(`${url}?${params.toString()}`, { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					const results = data.results || data || []
					this.entries = this.page === 1 ? results : [...this.entries, ...results]
					this.total = data.total || this.entries.length
				} else if (this.page === 1) {
					this.entries = []
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnVersionHistory] failed to fetch version history', err)
				if (this.page === 1) {
					this.entries = []
				}
			} finally {
				this.loading = false
				this.loadingMore = false
			}
		},

		loadMore() {
			this.page += 1
			this.fetchEntries()
		},

		isSelected(id) {
			return this.selectedIds.includes(id)
		},

		toggleSelected(id, checked) {
			if (checked === true) {
				if (this.selectedIds.includes(id) === false && this.selectedIds.length < 2) {
					this.selectedIds = [...this.selectedIds, id]
				}
			} else {
				this.selectedIds = this.selectedIds.filter((existing) => existing !== id)
			}
		},

		openSingleDiff(entry) {
			const { oldState, newState } = foldAuditTrailEntries([entry])
			this.showAllFields = false
			this.activeDiff = { oldState, newState }
		},

		openCompareDiff() {
			if (this.selectedIds.length !== 2) {
				return
			}
			// Entries are fetched newest-first; fold oldest-first so the
			// "first old" / "last new" semantics land on the right side.
			const selectedEntries = this.entries.filter((entry) => this.selectedIds.includes(entry.id))
			const chronological = [...selectedEntries].reverse()
			const { oldState, newState } = foldAuditTrailEntries(chronological)
			this.showAllFields = false
			this.activeDiff = { oldState, newState }
		},

		closeDiff() {
			this.activeDiff = null
		},

		isNestedValue(row) {
			const isObj = (v) => v !== null && typeof v === 'object'
			return isObj(row.oldValue) === true || isObj(row.newValue) === true
		},

		/**
		 * Build the per-line nested diff for one side of a table cell
		 * whose value is an object/array, so each nested key can be
		 * individually add/remove/change tinted.
		 *
		 * @param {FieldDiffRow} row The parent field row.
		 * @param {'old'|'new'} side Which side is being rendered (both sides render the same nested diff so add/remove/change context matches on both columns).
		 * @return {Array<{path: string, type: string, text: string}>} Rendered lines.
		 */
		nestedLines(row, side) {
			const base = row.oldValue !== null && typeof row.oldValue === 'object' ? row.oldValue : {}
			const next = row.newValue !== null && typeof row.newValue === 'object' ? row.newValue : {}
			const from = row.type === 'added' ? {} : base
			const to = row.type === 'removed' ? {} : next
			const nested = computeObjectDiff(from, to)
			const visible = this.showAllFields === true ? nested : nested.filter((entry) => entry.type !== 'unchanged')
			return visible.map((entry) => ({
				path: entry.path,
				type: entry.type,
				text: this.formatNestedLine(entry, side),
			}))
		},

		formatNestedLine(entry, side) {
			const label = entry.path === '' ? '·' : entry.path
			if (entry.type === 'changed') {
				const shown = side === 'new' ? entry.newValue : entry.oldValue
				return `${label}: ${this.formatScalar(shown)}`
			}
			const value = entry.type === 'removed' ? entry.oldValue : entry.newValue
			return `${label}: ${this.formatScalar(value)}`
		},

		rowClass(type) {
			return {
				'cn-version-history__diff-row': true,
				[`cn-version-history__diff-row--${type}`]: true,
			}
		},

		lineClass(type) {
			return {
				'cn-version-history__diff-line': true,
				[`cn-version-history__diff-line--${type}`]: true,
			}
		},

		valueCellTag(row) {
			return this.isNestedValue(row) === true ? 'pre' : 'span'
		},

		valueCellProps(row) {
			return this.isNestedValue(row) === true ? { class: 'cn-version-history__diff-json' } : {}
		},

		formatScalar(value) {
			if (value === undefined) {
				return '—'
			}
			if (value === null) {
				return 'null'
			}
			if (typeof value === 'object') {
				try {
					return JSON.stringify(value)
				} catch {
					return String(value)
				}
			}
			return String(value)
		},

		formatUser(entry) {
			return entry.userName || entry.user || t('nextcloud-vue', 'System')
		},

		formatWhen(entry) {
			const raw = entry.created || entry.creationDateTime || entry.timestamp
			if (raw === undefined || raw === null) {
				return ''
			}
			const d = new Date(raw)
			if (Number.isNaN(d.getTime()) === true) {
				return String(raw)
			}
			return d.toLocaleString()
		},
	},
}
</script>

<style scoped>
.cn-version-history__empty {
	color: var(--color-text-maxcontrast);
	text-align: center;
	padding: 12px 0;
}

.cn-version-history__rows {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-version-history__row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-version-history__row:last-child {
	border-bottom: none;
}

.cn-version-history__row-main {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	align-items: baseline;
	flex: 1 1 auto;
	background: none;
	border: none;
	cursor: pointer;
	text-align: left;
	font: inherit;
	color: inherit;
	padding: 4px;
	border-radius: var(--border-radius);
}

.cn-version-history__row-main:hover {
	background-color: var(--color-background-hover);
}

.cn-version-history__version {
	font-weight: bold;
	color: var(--color-main-text);
}

.cn-version-history__action {
	color: var(--color-text-maxcontrast);
}

.cn-version-history__when {
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
	white-space: nowrap;
}

.cn-version-history__user {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
}

.cn-version-history__toolbar {
	display: flex;
	gap: 8px;
	margin-top: 8px;
	flex-wrap: wrap;
}

.cn-version-history__diff-toolbar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 8px;
	margin-bottom: 8px;
	flex-wrap: wrap;
}

.cn-version-history__diff-table {
	width: 100%;
	border-collapse: collapse;
}

.cn-version-history__diff-table th,
.cn-version-history__diff-table td {
	border-bottom: 1px solid var(--color-border);
	padding: 6px 8px;
	text-align: left;
	vertical-align: top;
}

.cn-version-history__diff-field {
	font-weight: 500;
	color: var(--color-main-text);
	white-space: nowrap;
}

.cn-version-history__diff-json {
	margin: 0;
	white-space: pre-wrap;
	word-break: break-word;
	font-family: monospace;
	font-size: 12px;
}

.cn-version-history__diff-row--added .cn-version-history__diff-field {
	color: var(--color-success);
}

.cn-version-history__diff-row--removed .cn-version-history__diff-field {
	color: var(--color-error);
}

.cn-version-history__diff-row--changed .cn-version-history__diff-field {
	color: var(--color-warning);
}

.cn-version-history__diff-line--added {
	background-color: color-mix(in srgb, var(--color-success) 15%, transparent);
	color: var(--color-success);
}

.cn-version-history__diff-line--removed {
	background-color: color-mix(in srgb, var(--color-error) 15%, transparent);
	color: var(--color-error);
	text-decoration: line-through;
}

.cn-version-history__diff-line--changed {
	background-color: color-mix(in srgb, var(--color-warning) 15%, transparent);
	color: var(--color-warning);
}

.cn-version-history__diff-line--unchanged {
	color: var(--color-text-maxcontrast);
}

.cn-version-history__diff-empty {
	color: var(--color-text-maxcontrast);
	text-align: center;
	padding: 12px 0;
}
</style>
