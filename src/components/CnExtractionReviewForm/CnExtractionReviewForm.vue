<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<form class="cn-extraction-review"
		data-testid="cn-extraction-review"
		@submit.prevent="save">
		<div v-for="field in fields"
			:key="field.key"
			class="cn-extraction-review__field"
			:data-testid="`cn-extraction-field-${field.key}`">
			<label :for="inputId(field)">{{ text(field.label) }}</label>
			<input :id="inputId(field)"
				v-model="values[field.key]"
				:type="inputType(field)"
				:step="field.type === 'money' ? '0.01' : undefined"
				:required="field.required === true"
				:aria-describedby="note(field) ? noteId(field) : undefined">
			<p v-if="note(field)"
				:id="noteId(field)"
				class="cn-extraction-review__note"
				:class="{ 'cn-extraction-review__note--check': needsCheck(field) }">
				{{ note(field) }}
			</p>
		</div>

		<p v-if="refusal"
			class="cn-extraction-review__error"
			role="alert">
			{{ refusal }}
		</p>

		<div class="cn-extraction-review__actions">
			<NcButton v-if="requestEndpoint && requestEndpoint.url"
				variant="tertiary"
				:disabled="busy"
				data-testid="cn-extraction-request"
				@click="requestAgain">
				{{ t('nextcloud-vue', 'Read the document again') }}
			</NcButton>
			<NcButton variant="primary"
				type="submit"
				:disabled="!canSave"
				data-testid="cn-extraction-save"
				@click="save">
				{{ t('nextcloud-vue', 'Save') }}
			</NcButton>
		</div>
	</form>
</template>

<script>
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton } from '@nextcloud/vue'
import { interpolateUrlTokens } from '../../utils/interpolateUrlTokens.js'

let formCounter = 0

/**
 * Read a dotted path from an object.
 *
 * @param {object} source The object.
 * @param {string} path The path, e.g. `extraction.confidence`.
 * @return {unknown} The value, or undefined.
 */
function readPath(source, path) {
	if (!path) {
		return undefined
	}
	return String(path).split('.').reduce((value, key) => (value && typeof value === 'object' ? value[key] : undefined), source)
}

/**
 * CnExtractionReviewForm — review what a machine read from a document.
 *
 * Shows each configured field of an extraction draft with its value and,
 * when the draft carries one, the confidence of the reading in words. Fields
 * under the threshold say "Check this value"; fields an operator changed
 * before say "Corrected by hand". Save sends only the fields that changed to
 * the confirm endpoint, which records the human correction on the server.
 * An optional request endpoint asks for the document to be read again.
 *
 * Example:
 * ```vue
 * <CnExtractionReviewForm
 *   :object="draft"
 *   :fields="[{ key: 'invoiceNumber', label: 'Invoice number', required: true }]"
 *   :draft-source="{ confidencePath: 'fieldConfidence', correctedPath: 'humanCorrected' }"
 *   :confirm-endpoint="{ url: '/apps/shillinq/api/v1/extraction/drafts/@objectId?schema=Receipt' }"
 *   @saved="reload" />
 * ```
 */
export default {
	name: 'CnExtractionReviewForm',

	components: { NcButton },

	inject: {
		cnTranslate: { default: null },
	},

	props: {
		/** The draft record. */
		object: {
			type: Object,
			default: () => ({}),
		},

		/** The draft's id for `@objectId`; defaults to `object.id`. */
		objectId: {
			type: [String, Number],
			default: '',
		},

		/** The schema of the draft, available as `@config.schema` in urls. */
		schema: {
			type: String,
			default: '',
		},

		/**
		 * The fields to review: `[{ key, label, type?, required?, minorUnits? }]`.
		 * `type` is `text` (default), `number`, `date` or `money`; money with
		 * `minorUnits` is stored in cents and shown in units.
		 */
		fields: {
			type: Array,
			required: true,
		},

		/** Where the draft keeps its readings: `{ confidencePath, correctedPath }`. */
		draftSource: {
			type: Object,
			default: () => ({ confidencePath: 'fieldConfidence', correctedPath: 'humanCorrected' }),
		},

		/** Confidence (0 to 1) under which a field asks to be checked. */
		threshold: {
			type: Number,
			default: 0.8,
		},

		/** `{ url, method? }` that records the corrections (default `PUT`). */
		confirmEndpoint: {
			type: Object,
			required: true,
		},

		/** Optional `{ url, method?, body? }` that asks for the document to be read again. */
		requestEndpoint: {
			type: Object,
			default: null,
		},
	},

	emits: ['saved', 'requested'],

	data() {
		formCounter += 1
		return {
			formId: `cn-extraction-review-${formCounter}`,
			values: {},
			busy: false,
			refusal: '',
		}
	},

	computed: {
		tokenCtx() {
			return {
				objectId: this.objectId !== '' ? this.objectId : (this.object && this.object.id),
				object: this.object || {},
				config: { schema: this.schema },
			}
		},

		changes() {
			const changed = {}
			for (const field of this.fields) {
				const value = this.toStored(field, this.values[field.key])
				if (value !== this.toStored(field, this.shown(field))) {
					changed[field.key] = value
				}
			}
			return changed
		},

		canSave() {
			return !this.busy && this.fields.every((field) => field.required !== true || String(this.values[field.key] ?? '').trim() !== '')
		},
	},

	watch: {
		object: {
			immediate: true,
			handler() {
				this.reset()
			},
		},
	},

	methods: {
		t,

		text(value) {
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(value) : value
		},

		reset() {
			const values = {}
			for (const field of this.fields) {
				values[field.key] = this.shown(field)
			}
			this.values = values
		},

		inputId(field) {
			return `${this.formId}-${field.key}`
		},

		noteId(field) {
			return `${this.inputId(field)}-note`
		},

		inputType(field) {
			if (field.type === 'date') {
				return 'date'
			}
			return field.type === 'number' || field.type === 'money' ? 'number' : 'text'
		},

		/**
		 * The stored value as the input shows it.
		 *
		 * @param {object} field The field configuration.
		 * @return {string} The input value.
		 */
		shown(field) {
			const value = this.object ? this.object[field.key] : undefined
			if (value === null || value === undefined) {
				return ''
			}
			if (field.type === 'money' && field.minorUnits) {
				return String(Number(value) / 100)
			}
			return String(value)
		},

		/**
		 * The input value as the record stores it.
		 *
		 * @param {object} field The field configuration.
		 * @param {string|number} value The input value.
		 * @return {string|number|null} The stored value.
		 */
		toStored(field, value) {
			const raw = String(value ?? '').trim()
			if (field.type === 'money' || field.type === 'number') {
				if (raw === '') {
					return null
				}
				const number = Number(raw)
				return field.type === 'money' && field.minorUnits ? Math.round(number * 100) : number
			}
			return raw
		},

		confidence(field) {
			const value = readPath(this.object, this.draftSource && this.draftSource.confidencePath)
			const score = value && typeof value === 'object' ? value[field.key] : undefined
			return typeof score === 'number' && Number.isFinite(score) ? score : null
		},

		corrected(field) {
			const list = readPath(this.object, this.draftSource && this.draftSource.correctedPath)
			return Array.isArray(list) && list.includes(field.key)
		},

		needsCheck(field) {
			const score = this.confidence(field)
			return score !== null && score < this.threshold && !this.corrected(field)
		},

		note(field) {
			if (this.corrected(field)) {
				return t('nextcloud-vue', 'Corrected by hand')
			}
			const score = this.confidence(field)
			if (score === null) {
				return ''
			}
			const percent = Math.round(score * 100)
			if (score < this.threshold) {
				return t('nextcloud-vue', 'Read with {percent}% certainty. Check this value.', { percent })
			}
			return t('nextcloud-vue', 'Read with {percent}% certainty', { percent })
		},

		url(endpoint) {
			const url = interpolateUrlTokens(endpoint.url, this.tokenCtx)
			return /^https?:\/\//i.test(url) ? url : generateUrl(url)
		},

		method(endpoint, fallback) {
			const method = String(endpoint.method || fallback).toLowerCase()
			return ['post', 'put', 'patch'].includes(method) ? method : fallback.toLowerCase()
		},

		refusalOf(failure) {
			const data = failure && failure.response && failure.response.data
			return String((data && (data.message || data.error)) || t('nextcloud-vue', 'The changes could not be saved.'))
		},

		async save() {
			if (!this.canSave) {
				return
			}
			this.busy = true
			this.refusal = ''
			try {
				const { data } = await axios[this.method(this.confirmEndpoint, 'PUT')](this.url(this.confirmEndpoint), this.changes)
				/**
				 * @event saved The corrections were recorded. Payload: the saved record.
				 */
				this.$emit('saved', (data && data.record) || data || {})
			} catch (failure) {
				this.refusal = this.refusalOf(failure)
			} finally {
				this.busy = false
			}
		},

		async requestAgain() {
			this.busy = true
			this.refusal = ''
			try {
				const body = {}
				for (const [key, value] of Object.entries(this.requestEndpoint.body || {})) {
					body[key] = typeof value === 'string' ? interpolateUrlTokens(value, this.tokenCtx) : value
				}
				await axios[this.method(this.requestEndpoint, 'POST')](this.url(this.requestEndpoint), body)
				/**
				 * @event requested The document was sent to be read again.
				 */
				this.$emit('requested')
			} catch (failure) {
				this.refusal = this.refusalOf(failure)
			} finally {
				this.busy = false
			}
		},
	},
}
</script>

<style scoped>
.cn-extraction-review {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-extraction-review__field {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-extraction-review__field input {
	min-height: var(--default-clickable-area);
}

.cn-extraction-review__note {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-extraction-review__note--check {
	color: var(--color-warning-text);
	font-weight: bold;
}

.cn-extraction-review__error {
	margin: 0;
	color: var(--color-error-text);
}

.cn-extraction-review__actions {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: 8px;
}
</style>
