<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-bulk-job" data-testid="bulk-job-progress">
		<p class="cn-bulk-job__state" data-testid="bulk-job-state">
			{{ stateSentence }}
		</p>

		<NcProgressBar
			v-if="showsProgress"
			:value="percentage"
			size="medium"
			data-testid="bulk-job-bar" />

		<div v-if="hasOutcomes" class="cn-bulk-job__counts">
			<NcButton
				v-for="entry in outcomeTabs"
				:key="entry.outcome"
				:variant="entry.outcome === openOutcome ? 'primary' : 'tertiary'"
				:aria-pressed="entry.outcome === openOutcome ? 'true' : 'false'"
				:data-testid="`bulk-job-count-${entry.outcome}`"
				@click="open(entry.outcome)">
				{{ entry.label }}
			</NcButton>
		</div>

		<div v-if="openOutcome" class="cn-bulk-job__rows" data-testid="bulk-job-rows">
			<NcLoadingIcon v-if="loadingRows" :size="24" />

			<p v-else-if="pageRows.length === 0" class="cn-bulk-job__empty">
				{{ label('empty') }}
			</p>

			<ul v-else class="cn-bulk-job__list">
				<li v-for="row in pageRows" :key="row.id" class="cn-bulk-job__row">
					<span class="cn-bulk-job__item">{{ rowName(row) }}</span>
					<span class="cn-bulk-job__reason">{{ row.reason || label('noReason') }}</span>
				</li>
			</ul>

			<NcButton
				v-if="moreRows"
				variant="tertiary"
				data-testid="bulk-job-more"
				@click="loadMore">
				{{ label('more') }}
			</NcButton>
		</div>

		<NcNoteCard v-if="error" type="error">
			{{ error }}
		</NcNoteCard>

		<div class="cn-bulk-job__actions">
			<NcButton
				v-if="isPreviewed"
				variant="primary"
				:disabled="busy"
				data-testid="bulk-job-commit"
				@click="commit">
				{{ label('commit', { total: totalCount }) }}
			</NcButton>

			<NcButton
				v-if="isRunning"
				:disabled="busy"
				data-testid="bulk-job-cancel"
				@click="cancel">
				{{ label('cancel') }}
			</NcButton>

			<NcButton
				v-if="canRetry"
				:disabled="busy"
				data-testid="bulk-job-retry"
				@click="retry">
				{{ label('retry', { count: retryCount }) }}
			</NcButton>

			<NcButton
				v-if="canDownload"
				variant="tertiary"
				:href="reportUrl"
				data-testid="bulk-job-download">
				{{ label('download') }}
			</NcButton>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon, NcNoteCard, NcProgressBar } from '@nextcloud/vue'
import {
	bulkJobReportUrl,
	cancelBulkJob,
	commitBulkJob,
	fetchBulkJob,
	fetchBulkJobMembers,
	isBulkJobFinished,
	retryBulkJob,
} from '../../utils/bulkJobApi.js'

/** Every outcome a row can have, in the order they are offered. */
const ALL_OUTCOMES = ['applied', 'skipped', 'refused', 'failed']

/**
 * The library's own wording, for a host that passes no `labels`. Each is a
 * template; `{total}`, `{processed}` and `{count}` are filled in.
 *
 * @return {object} Label key => translated template.
 */
function defaultLabels() {
	return {
		statePreviewed: t('nextcloud-vue', 'Nothing has been written yet. This is what would happen to {total} items.'),
		stateRunning: t('nextcloud-vue', 'Running. {processed} of {total} items done.'),
		stateCancelling: t('nextcloud-vue', 'Stopping after the item it is on.'),
		stateCancelled: t('nextcloud-vue', 'Stopped. {processed} of {total} items were done first.'),
		stateFailed: t('nextcloud-vue', 'The act stopped on an error after {processed} of {total} items.'),
		stateCompleted: t('nextcloud-vue', 'Finished. {processed} of {total} items done.'),
		countApplied: t('nextcloud-vue', '{count} changed'),
		countSkipped: t('nextcloud-vue', '{count} skipped'),
		countRefused: t('nextcloud-vue', '{count} you may not write'),
		countFailed: t('nextcloud-vue', '{count} failed'),
		empty: t('nextcloud-vue', 'No items with this outcome.'),
		noReason: t('nextcloud-vue', 'No reason recorded.'),
		more: t('nextcloud-vue', 'Show more'),
		commit: t('nextcloud-vue', 'Apply to {total} items'),
		cancel: t('nextcloud-vue', 'Stop this act'),
		retry: t('nextcloud-vue', 'Run the items it did not reach'),
		download: t('nextcloud-vue', 'Download the report'),
		pollFailed: t('nextcloud-vue', 'The act is still running, but its progress could not be read.'),
		rowsFailed: t('nextcloud-vue', 'The items with this outcome could not be read.'),
		moreFailed: t('nextcloud-vue', 'The rest of the list could not be read.'),
		commitFailed: t('nextcloud-vue', 'The act could not be started.'),
		cancelFailed: t('nextcloud-vue', 'The act could not be stopped.'),
		retryFailed: t('nextcloud-vue', 'The rest of the items could not be run.'),
	}
}

/**
 * CnBulkJobProgress — what a bulk act did, row by row: a sentence saying
 * where the job is, a progress bar, one openable count per outcome with a
 * paged list of the rows and the reason each one gave, and the commit, stop,
 * retry and download buttons.
 *
 * SKIPPED AND REFUSED STAY SEPARATE. Skipped is "the act does not apply to
 * this row"; refused is "you may not write this row". Collapsing them hides a
 * permission problem inside a business outcome.
 *
 * Two sources:
 * - `source: 'openregister'` (default) follows an OpenRegister bulk job. It
 *   re-reads `/api/bulk-jobs/{id}` every `pollInterval` ms while the job runs,
 *   pages its members `pageSize` at a time, and commits, cancels and retries
 *   there. The host keeps the create call. Closing the page stops the reading,
 *   not the act.
 * - `source: 'local'` draws a run the host drives itself: it passes `job`
 *   and `rows` and handles the `commit`, `cancel` and `retry` events. Nothing
 *   is fetched.
 *
 * Every string is a template in `labels`, so a host says "cases" or "secrets"
 * in its own translated words.
 *
 * ```vue
 * <CnBulkJobProgress
 *   :job="job"
 *   :labels="{ commit: t('myapp', 'Apply to {total} cases') }"
 *   @update:job="job = $event"
 *   @finished="reload" />
 * ```
 *
 * @spec openspec/changes/dq-abstract-forms/specs/bulk-job-progress/spec.md
 */
export default {
	name: 'CnBulkJobProgress',

	components: { NcButton, NcLoadingIcon, NcNoteCard, NcProgressBar },

	props: {
		/**
		 * The job as last read: `{ id, state, processed, total, counts:
		 * { applied, skipped, refused, failed } }`. The host owns the first read.
		 */
		job: { type: Object, required: true },

		/** Whether the host is mid-request and the buttons should wait. */
		busy: { type: Boolean, default: false },

		/** `'openregister'` follows an OpenRegister bulk job; `'local'` draws a run the host drives. */
		source: {
			type: String,
			default: 'openregister',
			validator: (value) => ['openregister', 'local'].includes(value),
		},

		/**
		 * The rows of a `local` run: `{ id, label?, outcome, reason? }`, where
		 * `outcome` is applied, skipped, refused or failed.
		 */
		rows: { type: Array, default: () => [] },

		/** The outcomes offered, in order. A run that cannot refuse leaves `refused` out. */
		outcomes: { type: Array, default: () => ALL_OUTCOMES.slice() },

		/** Templates replacing the library wording, keyed as in the docs. */
		labels: { type: Object, default: () => ({}) },

		/** Where the report downloads from; defaults to the OpenRegister report of an `openregister` job. */
		downloadUrl: { type: String, default: '' },

		/** How often a running job is re-read, in ms. */
		pollInterval: { type: Number, default: 2000 },

		/** How many rows one page of an outcome list holds. */
		pageSize: { type: Number, default: 25 },
	},

	emits: ['update:job', 'finished', 'commit', 'cancel', 'retry'],

	data() {
		return {
			openOutcome: '',
			pageRows: [],
			rowTotal: 0,
			loadingRows: false,
			error: '',
			timer: null,
		}
	},

	computed: {
		/** @return {boolean} Whether the run reads nothing from the server. */
		isLocal() {
			return this.source === 'local'
		},

		/** @return {boolean} Whether the job is rehearsed but not yet committed. */
		isPreviewed() {
			return this.job.state === 'previewed'
		},

		/** @return {boolean} Whether the job is still walking rows. */
		isRunning() {
			return ['running', 'cancelling'].includes(String(this.job.state))
		},

		/** @return {number} How many rows the job holds. */
		totalCount() {
			return Number(this.job.total || 0)
		},

		/** @return {number} How many rows the job has done. */
		processedCount() {
			return Number(this.job.processed || 0)
		},

		/**
		 * A job that stopped short can be run again for the rest; a local run
		 * also for the rows that failed. A finished or moving job cannot.
		 *
		 * @return {boolean} Whether running the rest is on offer.
		 */
		canRetry() {
			if (this.isLocal) {
				return isBulkJobFinished(this.job) && this.retryCount > 0
			}
			return ['cancelled', 'failed'].includes(String(this.job.state))
				&& this.processedCount < this.totalCount
		},

		/** @return {number} How many rows a retry would run. */
		retryCount() {
			const unreached = Math.max(0, this.totalCount - this.processedCount)
			return this.isLocal ? unreached + this.counts.failed : unreached
		},

		/** @return {string} Where the report downloads from, '' when there is none. */
		reportUrl() {
			if (this.downloadUrl) {
				return this.downloadUrl
			}
			return this.isLocal ? '' : bulkJobReportUrl(this.job.id)
		},

		/** @return {boolean} Whether the report is worth offering. */
		canDownload() {
			return this.reportUrl !== '' && this.totalCount > 0
		},

		/** @return {boolean} Whether a bar says anything useful. */
		showsProgress() {
			return (this.isRunning || isBulkJobFinished(this.job)) && this.totalCount > 0
		},

		/** @return {number} How far along the job is, as a percentage. */
		percentage() {
			if (this.totalCount === 0) {
				return 0
			}
			return Math.round((this.processedCount / this.totalCount) * 100)
		},

		/**
		 * The job's position in a sentence. `previewed` reads differently on
		 * purpose: it is the only state where nothing has been written.
		 *
		 * @return {string} What is happening.
		 */
		stateSentence() {
			const vars = { processed: this.processedCount, total: this.totalCount }
			switch (String(this.job.state)) {
				case 'previewed':
					return this.label('statePreviewed', vars)
				case 'running':
					return this.label('stateRunning', vars)
				case 'cancelling':
					return this.label('stateCancelling', vars)
				case 'cancelled':
					return this.label('stateCancelled', vars)
				case 'failed':
					return this.label('stateFailed', vars)
				default:
					return this.label('stateCompleted', vars)
			}
		},

		/** @return {object} The four counts, a missing key read as zero. */
		counts() {
			const counts = this.job.counts || {}
			return {
				applied: Number(counts.applied || 0),
				skipped: Number(counts.skipped || 0),
				refused: Number(counts.refused || 0),
				failed: Number(counts.failed || 0),
			}
		},

		/** @return {boolean} Whether any row has an outcome yet. */
		hasOutcomes() {
			return Object.values(this.counts).some((count) => count > 0)
		},

		/**
		 * The offered outcomes as openable counts, zero ones included: a
		 * reader looking for the skip list finds it saying "0", not missing.
		 *
		 * @return {Array<{outcome: string, label: string}>} The tabs.
		 */
		outcomeTabs() {
			const keys = { applied: 'countApplied', skipped: 'countSkipped', refused: 'countRefused', failed: 'countFailed' }
			return (this.outcomes || [])
				.filter((outcome) => ALL_OUTCOMES.includes(outcome))
				.map((outcome) => ({ outcome, label: this.label(keys[outcome], { count: this.counts[outcome] }) }))
		},

		/** @return {boolean} Whether the open outcome has rows past this page. */
		moreRows() {
			return this.pageRows.length < this.rowTotal
		},
	},

	watch: {
		job: {
			immediate: true,
			handler() {
				if (isBulkJobFinished(this.job)) {
					this.stopPolling()
					/**
					 * @event finished The job stopped moving; payload: the finished job.
					 */
					this.$emit('finished', this.job)
					return
				}
				if (this.isRunning && !this.isLocal) {
					this.startPolling()
				}
			},
		},

		rows() {
			if (this.isLocal && this.openOutcome) {
				this.open(this.openOutcome, { reset: true })
			}
		},
	},

	beforeUnmount() {
		this.stopPolling()
	},

	methods: {
		/**
		 * A label from `labels`, else the library's, with its tokens filled.
		 *
		 * @param {string} key The label key.
		 * @param {object} [vars] Token values.
		 * @return {string} The text.
		 */
		label(key, vars = {}) {
			const own = this.labels && this.labels[key]
			const template = typeof own === 'string' && own !== '' ? own : defaultLabels()[key]
			return String(template || '').replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match))
		},

		/**
		 * @param {object} row A row.
		 * @return {string} What the row is called.
		 */
		rowName(row) {
			return String(row.label || row.objectUuid || row.id || '')
		},

		/** Re-read the job's position until it stops moving. */
		startPolling() {
			if (this.timer !== null) {
				return
			}
			this.timer = setInterval(async () => {
				try {
					const job = await fetchBulkJob(this.job.id)
					/**
					 * @event update:job The job as last read or answered by an action, for `v-model:job`.
					 */
					this.$emit('update:job', job)
					if (this.openOutcome) {
						await this.open(this.openOutcome, { reset: true })
					}
				} catch {
					this.stopPolling()
					this.error = this.label('pollFailed')
				}
			}, this.pollInterval)
		},

		/** Stop re-reading. */
		stopPolling() {
			if (this.timer !== null) {
				clearInterval(this.timer)
				this.timer = null
			}
		},

		/**
		 * One page of an outcome's rows.
		 *
		 * @param {string} outcome The outcome.
		 * @param {number} offset Where the page starts.
		 * @return {Promise<{results: Array, total: number}>} The page.
		 */
		async readPage(outcome, offset) {
			if (this.isLocal) {
				const matching = (this.rows || []).filter((row) => row && row.outcome === outcome)
				return { results: matching.slice(offset, offset + this.pageSize), total: matching.length }
			}
			return fetchBulkJobMembers(this.job.id, { outcome, limit: this.pageSize, offset })
		},

		/**
		 * Open one outcome's list, or close it when it is already open.
		 *
		 * @param {string} outcome applied, skipped, refused or failed.
		 * @param {object} [options] How to open it.
		 * @param {boolean} [options.reset] Re-read the open list instead of toggling it.
		 * @return {Promise<void>}
		 */
		async open(outcome, { reset = false } = {}) {
			if (this.openOutcome === outcome && reset === false) {
				this.openOutcome = ''
				this.pageRows = []
				return
			}
			this.openOutcome = outcome
			this.loadingRows = reset === false
			this.error = ''
			try {
				const page = await this.readPage(outcome, 0)
				this.pageRows = page.results
				this.rowTotal = page.total
			} catch {
				this.error = this.label('rowsFailed')
			} finally {
				this.loadingRows = false
			}
		},

		/** Read the next page of the open outcome. */
		async loadMore() {
			this.loadingRows = true
			try {
				const page = await this.readPage(this.openOutcome, this.pageRows.length)
				this.pageRows = this.pageRows.concat(page.results)
				this.rowTotal = page.total
			} catch {
				this.error = this.label('moreFailed')
			} finally {
				this.loadingRows = false
			}
		},

		/**
		 * Run one job call, hand the job it returns up, and say what failed in
		 * the server's own words when it wrote some.
		 *
		 * @param {string} event The event a local run emits instead.
		 * @param {(jobId: (string|number)) => Promise<object>} call The OpenRegister call.
		 * @param {string} failedKey The label for a failure without a server sentence.
		 * @return {Promise<void>}
		 */
		async act(event, call, failedKey) {
			this.error = ''
			if (this.isLocal) {
				if (event === 'commit') {
					/** @event commit A local job (no server id) is committed: the host applies it. */
					this.$emit('commit')
				} else if (event === 'cancel') {
					/** @event cancel A local job is cancelled: the host drops it. */
					this.$emit('cancel')
				} else {
					/** @event retry A local job's failed rows are retried: the host runs them again. */
					this.$emit('retry')
				}
				return
			}
			try {
				this.$emit('update:job', await call(this.job.id))
			} catch (e) {
				this.error = String(e?.response?.data?.error || this.label(failedKey))
			}
		},

		/** Write the act. The only button here that changes a row. */
		commit() {
			return this.act('commit', commitBulkJob, 'commitFailed')
		},

		/** Stop the job before the next row. */
		cancel() {
			return this.act('cancel', cancelBulkJob, 'cancelFailed')
		},

		/** Run the rows a stopped job did not reach. */
		retry() {
			return this.act('retry', retryBulkJob, 'retryFailed')
		},
	},
}
</script>

<style scoped>
.cn-bulk-job {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-bulk-job__state {
	color: var(--color-text-maxcontrast);
}

.cn-bulk-job__counts {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.cn-bulk-job__rows {
	max-height: 260px;
	overflow-y: auto;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	padding: 8px;
}

.cn-bulk-job__list {
	display: flex;
	flex-direction: column;
	gap: 6px;
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-bulk-job__row {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-bulk-job__item {
	font-weight: bold;
	overflow-wrap: anywhere;
}

.cn-bulk-job__reason,
.cn-bulk-job__empty {
	color: var(--color-text-maxcontrast);
}

.cn-bulk-job__actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}
</style>
