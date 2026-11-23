<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<section class="cn-count-tables-report" data-testid="cn-count-tables-report">
		<h3 v-if="title" class="cn-count-tables-report__title">
			{{ translate(title) }}
		</h3>

		<div class="cn-count-tables-report__filters">
			<NcTextField
				v-model="reference"
				:label="objectLabel ? translate(objectLabel) : t('nextcloud-vue', 'Record')"
				data-testid="cn-count-tables-report-object" />
			<NcButton
				:disabled="!canRead"
				data-testid="cn-count-tables-report-show"
				@click="load">
				{{ t('nextcloud-vue', 'Show') }}
			</NcButton>
			<NcButton
				v-if="csvParam && report && !isEmpty"
				:href="csvUrl"
				data-testid="cn-count-tables-report-csv">
				{{ t('nextcloud-vue', 'Download CSV') }}
			</NcButton>
		</div>

		<NcNoteCard
			v-if="refusal"
			type="error"
			data-testid="cn-count-tables-report-refusal">
			{{ refusal }}
		</NcNoteCard>

		<NcLoadingIcon v-if="loading" :size="32" />

		<NcEmptyContent
			v-else-if="report && isEmpty"
			:name="emptyText ? translate(emptyText) : t('nextcloud-vue', 'Nothing to count')" />

		<template v-else-if="report">
			<p
				v-if="totals"
				class="cn-count-tables-report__totals"
				data-testid="cn-count-tables-report-totals">
				{{ totalsText }}
			</p>

			<div class="cn-count-tables-report__lists">
				<table
					v-for="list in tables"
					:key="list.key"
					class="cn-count-tables-report__table"
					:data-testid="'cn-count-tables-report-' + list.key">
					<thead>
						<tr>
							<th scope="col">
								{{ list.label }}
							</th>
							<th scope="col">
								{{ countLabel ? translate(countLabel) : t('nextcloud-vue', 'Count') }}
							</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="row in list.rows" :key="row.name">
							<td>{{ row.name }}</td>
							<td>{{ row.count }}</td>
						</tr>
					</tbody>
				</table>
			</div>

			<p v-if="note" class="cn-count-tables-report__note">
				{{ translate(note) }}
			</p>
		</template>
	</section>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcTextField } from '@nextcloud/vue'

/**
 * The report url for one record: `{id}` in `url` replaced by the encoded id,
 * routed through `generateUrl`, with `csvParam` appended for the CSV form.
 *
 * @param {string} url The url with `{id}`.
 * @param {string} objectId The record id or reference.
 * @param {string} [csvParam] The query that asks for CSV, such as `format=csv`.
 * @return {string} The url.
 */
export function countTablesUrl(url, objectId, csvParam = '') {
	const base = generateUrl(String(url || '').replace('{id}', encodeURIComponent(objectId)))
	if (!csvParam) {
		return base
	}
	return base + (base.includes('?') ? '&' : '?') + csvParam
}

/**
 * CnCountTablesReport: an endpoint report about one record, drawn as
 * name/count tables side by side.
 *
 * The reader names the record (prefilled with `objectId`) and asks for it.
 * The endpoint answers one list per table, each row a name and a `count`,
 * plus the totals the `totals` sentence reads. A refused or failed read
 * shows the server's sentence and no counts, never the last answer. A report
 * whose `emptyField` is zero shows `emptyText`.
 */
export default {
	name: 'CnCountTablesReport',

	components: { NcButton, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcTextField },

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/** The report endpoint, with `{id}` where the record goes. */
		url: {
			type: String,
			required: true,
		},

		/** The record to prefill. */
		objectId: {
			type: String,
			default: '',
		},

		/**
		 * The tables: `{ key, label, nameField }`, one per list in the answer
		 * at `key`, each row named by its `nameField`.
		 */
		lists: {
			type: Array,
			default: () => [],
		},

		/**
		 * The sentence above the tables, with `{field}` tokens read from the
		 * answer (through the app's translate).
		 */
		totals: {
			type: String,
			default: '',
		},

		/** The answer field whose zero means there is nothing to count. */
		emptyField: {
			type: String,
			default: '',
		},

		/** The query that asks the endpoint for CSV; empty hides the download. */
		csvParam: {
			type: String,
			default: '',
		},

		/** Shown when there is nothing to count (through the app's translate). */
		emptyText: {
			type: String,
			default: '',
		},

		/** The heading (through the app's translate). */
		title: {
			type: String,
			default: '',
		},

		/** The record field's label (through the app's translate). */
		objectLabel: {
			type: String,
			default: '',
		},

		/** The count column's heading (through the app's translate). */
		countLabel: {
			type: String,
			default: '',
		},

		/** A closing sentence under the tables (through the app's translate). */
		note: {
			type: String,
			default: '',
		},
	},

	data() {
		return {
			reference: this.objectId,
			report: null,
			loading: false,
			refusal: '',
		}
	},

	computed: {
		/** @return {boolean} Whether a record is named. */
		canRead() {
			return this.reference.trim() !== ''
		},

		/** @return {string} The CSV url of the named record. */
		csvUrl() {
			return countTablesUrl(this.url, this.reference.trim(), this.csvParam)
		},

		/** @return {boolean} Whether the answer has nothing to count. */
		isEmpty() {
			if (!this.report) {
				return false
			}
			if (this.emptyField) {
				return Number(this.report[this.emptyField] || 0) === 0
			}
			return this.tables.every((list) => list.rows.length === 0)
		},

		/** @return {string} The totals sentence with its tokens filled. */
		totalsText() {
			return this.translate(this.totals).replace(/\{(\w+)\}/g, (match, field) => {
				const value = this.report?.[field]
				return value === undefined || value === null ? match : String(value)
			})
		},

		/** @return {Array<{key: string, label: string, rows: Array<{name: string, count: number}>}>} The tables. */
		tables() {
			return this.lists.map((list) => ({
				key: list.key,
				label: this.translate(list.label || list.key),
				rows: (Array.isArray(this.report?.[list.key]) ? this.report[list.key] : [])
					.map((row) => ({ name: String(row?.[list.nameField || 'name'] ?? ''), count: Number(row?.count || 0) })),
			}))
		},
	},

	methods: {
		t,

		/**
		 * A host string through the app's translate.
		 *
		 * @param {string} text The source text.
		 * @return {string} The translated text.
		 */
		translate(text) {
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : text
		},

		/**
		 * Read the report for the named record.
		 *
		 * @return {Promise<void>}
		 */
		async load() {
			this.loading = true
			this.refusal = ''
			try {
				const { default: axios } = await import('@nextcloud/axios')
				const { data } = await axios.get(countTablesUrl(this.url, this.reference.trim()))
				this.report = data && typeof data === 'object' ? data : {}
			} catch (error) {
				this.report = null
				this.refusal = error?.response?.data?.message || t('nextcloud-vue', 'The report could not be read.')
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-count-tables-report {
	display: flex;
	flex-direction: column;
	gap: 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	background: var(--color-main-background);
	padding: 20px 22px;
}

.cn-count-tables-report__title {
	margin: 0;
	font-size: 17px;
	font-weight: 700;
}

.cn-count-tables-report__filters {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	gap: 12px;
}

.cn-count-tables-report__lists {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
	gap: 24px;
	width: 100%;
}

.cn-count-tables-report__table {
	border-collapse: collapse;
	width: 100%;
	align-self: start;
}

.cn-count-tables-report__table th,
.cn-count-tables-report__table td {
	border-bottom: 1px solid var(--color-border);
	padding: 8px;
	text-align: start;
	overflow-wrap: anywhere;
}

.cn-count-tables-report__totals,
.cn-count-tables-report__note {
	margin: 0;
	color: var(--color-text-maxcontrast);
}
</style>
