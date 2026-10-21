<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-decision-list" data-testid="cn-decision-list">
		<NcLoadingIcon v-if="loading" :size="24" />
		<NcEmptyContent v-else-if="error"
			:name="text(content.errorTitle) || t('nextcloud-vue', 'This list could not be read')"
			:description="error"
			data-testid="cn-decision-list-error">
			<template #action>
				<NcButton data-testid="cn-decision-list-retry" @click="load">
					{{ t('nextcloud-vue', 'Try again') }}
				</NcButton>
			</template>
		</NcEmptyContent>
		<p v-else-if="rows.length === 0" class="cn-decision-list__empty" data-testid="cn-decision-list-empty">
			{{ text(content.emptyText) || t('nextcloud-vue', 'Nothing to decide right now.') }}
		</p>
		<ul v-else class="cn-decision-list__rows">
			<li v-for="row in rows"
				:key="row.id"
				class="cn-decision-list__row"
				:data-testid="`cn-decision-list-row-${row.id}`">
				<p class="cn-decision-list__title">
					{{ row.title }}
				</p>
				<p v-if="row.meta" class="cn-decision-list__meta">
					{{ row.meta }}
				</p>
				<div class="cn-decision-list__fields">
					<NcSelect :modelValue="answerOption(row.id)"
						:options="answerOptions"
						:inputLabel="text(content.answerLabel) || t('nextcloud-vue', 'Your answer')"
						:clearable="false"
						:data-testid="`cn-decision-list-answer-${row.id}`"
						@update:modelValue="(v) => patch(row.id, { answer: v ? v.id : '' })" />
					<NcTextField v-if="reasonConfig"
						:modelValue="draft(row.id).reason"
						:label="text(reasonConfig.label) || t('nextcloud-vue', 'Why?')"
						:data-testid="`cn-decision-list-reason-${row.id}`"
						@update:modelValue="(v) => patch(row.id, { reason: String(v ?? '') })" />
					<template v-for="field in extraFields(row.id)" :key="field.field">
						<NcDateTimePickerNative v-if="field.type === 'date'"
							:modelValue="draft(row.id).extra[field.field] || null"
							type="date"
							:label="text(field.label) || field.field"
							:data-testid="`cn-decision-list-${field.field}-${row.id}`"
							@update:modelValue="(v) => setExtra(row.id, field.field, v)" />
						<NcTextField v-else
							:modelValue="draft(row.id).extra[field.field] || ''"
							:label="text(field.label) || field.field"
							:data-testid="`cn-decision-list-${field.field}-${row.id}`"
							@update:modelValue="(v) => setExtra(row.id, field.field, v)" />
					</template>
				</div>
				<p v-if="refusals[row.id]" class="cn-decision-list__refusal" role="alert">
					{{ refusals[row.id] }}
				</p>
				<NcButton :disabled="!canSubmit(row.id)"
					:data-testid="`cn-decision-list-submit-${row.id}`"
					@click="submit(row)">
					{{ text(submitConfig.label) || t('nextcloud-vue', 'Record this decision') }}
				</NcButton>
			</li>
		</ul>
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcDateTimePickerNative, NcEmptyContent, NcLoadingIcon, NcSelect, NcTextField } from '@nextcloud/vue'
import { fetchEndpointSource } from '../../composables/useEndpointSource.js'
import { fillTemplate } from '../../utils/fillTemplate.js'
import { readPath } from '../../utils/readPath.js'

/**
 * A date picker value as `YYYY-MM-DD`, or the value as a string.
 *
 * @param {unknown} value The value.
 * @return {string}
 */
function dateValue(value) {
	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		const pad = (n) => String(n).padStart(2, '0')
		return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
	}
	return value === null || value === undefined ? '' : String(value)
}

/**
 * CnDecisionListWidget — the `decision-list` widget: a worklist where each
 * row takes one answer from a closed set, a reason, and any fields that
 * answer needs, recorded per row (board DqMijnWerk "archival reviews": a
 * verdict, why, and a new date when retained). The row leaves the list once
 * its answer lands, so the user keeps their place. A failed read shows an
 * error with a retry, never an empty list; a refusal stays on its row in the
 * server's words. hermiq approvals, learniq review queues and integriq
 * approvals use the same widget.
 *
 * `content`:
 * - `source`: an endpointSource for the rows (`responsePath`), or `itemsPath`
 *   to read them out of the response.
 * - `idField` (default `id`), `title` and `meta`: templates filled from a row.
 * - `answers`: `[{ value, label, fields? }]`; `fields` are `[{ field, type?:
 *   "date"|"text", label?, required? }]` that answer asks for.
 * - `reason`: `{ label?, required?, field? }`, required by default and sent
 *   as `field` (default `reason`); `false` drops it.
 * - `submit`: `{ label?, request: { method?, url, body? } }`: `url` and `body`
 *   templates filled from the row; the answer goes as `answerField` (default
 *   `answer`), with the reason and the answer's fields.
 * - `emptyText`, `errorTitle`, `answerLabel`: texts.
 *
 * Texts go through the host translate.
 */
export default {
	name: 'CnDecisionListWidget',

	components: { NcButton, NcDateTimePickerNative, NcEmptyContent, NcLoadingIcon, NcSelect, NcTextField },

	inject: {
		/** The host app's translate (CnAppRoot `cnTranslate`). */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The widget's configuration (see the component docs).
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
	},

	emits: ['decided'],

	data() {
		return {
			loading: true,
			error: '',
			items: [],
			drafts: {},
			refusals: {},
			busy: {},
		}
	},

	computed: {
		/** @return {Array<{value: string, label: string, fields?: Array<object>}>} The answers with a value. */
		answers() {
			return (Array.isArray(this.content.answers) ? this.content.answers : []).filter((a) => a && a.value !== undefined && a.value !== '')
		},

		/** @return {Array<{id: string, label: string}>} The answers as select options. */
		answerOptions() {
			return this.answers.map((a) => ({ id: String(a.value), label: this.text(a.label) || String(a.value) }))
		},

		/** @return {object|null} The reason config, null when dropped. */
		reasonConfig() {
			if (this.content.reason === false) {
				return null
			}
			return this.content.reason && typeof this.content.reason === 'object' ? this.content.reason : {}
		},

		/** @return {object} The submit config. */
		submitConfig() {
			return this.content.submit && typeof this.content.submit === 'object' ? this.content.submit : {}
		},

		/**
		 * The rows: id, title and meta filled from each item.
		 *
		 * @spec openspec/changes/decision-list-widget/specs/decision-list-widget/spec.md#requirement-a-worklist-of-per-row-decisions
		 * @return {Array<{id: string, title: string, meta: string, item: object}>}
		 */
		rows() {
			const idField = this.content.idField || 'id'
			return this.items.map((item) => {
				const id = String(readPath(item, idField) ?? '')
				return {
					id,
					title: (this.content.title ? fillTemplate(this.cnTranslate(this.content.title), item).trim() : '') || String(item.title || id),
					meta: this.content.meta ? fillTemplate(this.cnTranslate(this.content.meta), item).trim() : '',
					item,
				}
			}).filter((row) => row.id !== '')
		},
	},

	mounted() {
		this.load()
	},

	methods: {
		t,

		/**
		 * A config text through the host translate.
		 *
		 * @param {unknown} value The text.
		 * @return {string}
		 */
		text(value) {
			return typeof value === 'string' && value !== '' ? this.cnTranslate(value) : ''
		},

		/**
		 * Read the rows; a failure is an error with a retry, never an empty list.
		 *
		 * @spec openspec/changes/decision-list-widget/specs/decision-list-widget/spec.md#requirement-a-worklist-of-per-row-decisions
		 * @return {Promise<void>}
		 */
		async load() {
			this.loading = true
			this.error = ''
			try {
				const data = await fetchEndpointSource(this.content.source, {}, { force: true })
				const list = this.content.itemsPath ? readPath(data, this.content.itemsPath) : data
				this.items = Array.isArray(list) ? list.filter((item) => item && typeof item === 'object') : []
			} catch (failure) {
				const body = failure && failure.response && failure.response.data
				this.error = String((body && (body.message || body.error)) || (failure && failure.message) || failure)
			} finally {
				this.loading = false
			}
		},

		/**
		 * A row's draft.
		 *
		 * @param {string} id The row id.
		 * @return {{answer: string, reason: string, extra: object}}
		 */
		draft(id) {
			return this.drafts[id] || { answer: '', reason: '', extra: {} }
		},

		/**
		 * Change a row's draft.
		 *
		 * @param {string} id The row id.
		 * @param {object} change The fields to change.
		 */
		patch(id, change) {
			this.drafts = { ...this.drafts, [id]: { ...this.draft(id), ...change } }
		},

		/**
		 * Set one of an answer's fields on a row.
		 *
		 * @param {string} id The row id.
		 * @param {string} field The field.
		 * @param {unknown} value The value.
		 */
		setExtra(id, field, value) {
			this.patch(id, { extra: { ...this.draft(id).extra, [field]: dateValue(value) } })
		},

		/**
		 * @param {string} id The row id.
		 * @return {object|null} The chosen answer as a select option.
		 */
		answerOption(id) {
			return this.answerOptions.find((o) => o.id === this.draft(id).answer) || null
		},

		/**
		 * The fields the chosen answer asks for.
		 *
		 * @param {string} id The row id.
		 * @return {Array<object>}
		 */
		extraFields(id) {
			const answer = this.answers.find((a) => String(a.value) === this.draft(id).answer)
			return answer && Array.isArray(answer.fields) ? answer.fields.filter((f) => f && f.field) : []
		},

		/**
		 * Whether a row may be sent: an answer, a needed reason, its required fields.
		 *
		 * @spec openspec/changes/decision-list-widget/specs/decision-list-widget/spec.md#requirement-a-worklist-of-per-row-decisions
		 * @param {string} id The row id.
		 * @return {boolean}
		 */
		canSubmit(id) {
			const draft = this.draft(id)
			if (this.busy[id] || !this.answerOptions.some((o) => o.id === draft.answer)) {
				return false
			}
			if (this.reasonConfig && this.reasonConfig.required !== false && draft.reason.trim() === '') {
				return false
			}
			return this.extraFields(id).every((f) => f.required === false || String(draft.extra[f.field] || '').trim() !== '')
		},

		/**
		 * Record one row's decision and take it off the list.
		 *
		 * @spec openspec/changes/decision-list-widget/specs/decision-list-widget/spec.md#requirement-a-worklist-of-per-row-decisions
		 * @param {{id: string, item: object}} row The row.
		 * @return {Promise<void>}
		 */
		async submit(row) {
			if (!this.canSubmit(row.id)) {
				return
			}
			const draft = this.draft(row.id)
			const request = this.submitConfig.request || {}
			const body = {}
			for (const [key, value] of Object.entries(request.body || {})) {
				body[key] = typeof value === 'string' ? fillTemplate(value, row.item) : value
			}
			body[this.content.answerField || 'answer'] = draft.answer
			if (this.reasonConfig) {
				body[this.reasonConfig.field || 'reason'] = draft.reason.trim()
			}
			for (const field of this.extraFields(row.id)) {
				if (String(draft.extra[field.field] || '') !== '') {
					body[field.field] = draft.extra[field.field]
				}
			}
			this.busy = { ...this.busy, [row.id]: true }
			this.refusals = { ...this.refusals, [row.id]: '' }
			try {
				if (request.url) {
					const url = fillTemplate(request.url, row.item)
					const method = String(request.method || 'POST').toLowerCase()
					await axios[['post', 'put', 'patch'].includes(method) ? method : 'post'](/^https?:\/\//i.test(url) ? url : generateUrl(url), body)
				}
				this.items = this.items.filter((item) => item !== row.item)
				/** @event decided A row's decision landed. Payload: `{ id, item, body }`. */
				this.$emit('decided', { id: row.id, item: row.item, body })
			} catch (failure) {
				const data = failure && failure.response && failure.response.data
				this.refusals = { ...this.refusals, [row.id]: String((data && (data.message || data.error)) || t('nextcloud-vue', 'This decision was not recorded.')) }
			} finally {
				this.busy = { ...this.busy, [row.id]: false }
			}
		},
	},
}
</script>

<style scoped>
.cn-decision-list__empty,
.cn-decision-list__meta {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-decision-list__rows {
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-decision-list__row {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding-block: 10px;
	border-block-end: 1px solid var(--color-border);
}

.cn-decision-list__title {
	margin: 0;
	font-weight: 600;
}

.cn-decision-list__fields {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
	gap: 8px;
}

.cn-decision-list__refusal {
	margin: 0;
	color: var(--color-error-text, var(--color-error));
}
</style>
