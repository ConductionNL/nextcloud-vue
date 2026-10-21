<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div v-if="loaded" class="cn-attention-flag" data-testid="cn-attention-flag">
		<p
			v-if="raised"
			class="cn-attention-flag__line"
			data-testid="cn-attention-flag-raised">
			<span class="cn-attention-flag__lead">{{ label('raisedLead') }}</span>
			<span class="cn-attention-flag__muted">{{ flagReason }}</span>
		</p>

		<ul
			v-if="markers.length > 0"
			class="cn-attention-flag__list"
			data-testid="cn-attention-flag-markers">
			<li
				v-for="marker in markers"
				:key="marker.marker"
				:data-testid="`cn-attention-flag-marker-${marker.marker}`"
				:data-tab="marker.tab">
				<span class="cn-attention-flag__lead">{{ marker.panelLabel }}</span>
				<span class="cn-attention-flag__muted">{{ marker.reason }}</span>
			</li>
		</ul>

		<p
			v-if="assessment"
			class="cn-attention-flag__line"
			data-testid="cn-attention-flag-assessment">
			<span class="cn-attention-flag__lead">{{ label('assessmentLead') }}</span>
			<span class="cn-attention-flag__lead" :data-level="assessment.level">{{ assessment.levelLabel }}</span>
			<span class="cn-attention-flag__muted">{{ assessment.ground }}</span>
			<span
				v-if="assessment.dueForReview"
				class="cn-attention-flag__due"
				data-testid="cn-attention-flag-review-due">{{ label('reviewDue') }}</span>
		</p>

		<template v-if="behindButton && !composing">
			<h4 class="cn-attention-flag__heading" data-testid="cn-attention-flag-heading">
				{{ reasonLabel }}
			</h4>
			<p class="cn-attention-flag__hint" data-testid="cn-attention-flag-hint">
				{{ raised ? label('hintClear') : label('hintRaise') }}
			</p>
			<NcButton
				variant="secondary"
				wide
				data-testid="cn-attention-flag-compose"
				@click="composing = true">
				<template #icon>
					<FlagOutline :size="20" />
				</template>
				{{ raised ? label('clear') : label('raise') }}
			</NcButton>
		</template>

		<div v-else class="cn-attention-flag__act">
			<NcTextField
				:modelValue="reason"
				:label="reasonLabel"
				data-testid="cn-attention-flag-reason"
				@update:modelValue="onReason" />
			<NcButton
				variant="tertiary"
				:disabled="busy || reason.trim() === ''"
				:data-testid="raised ? 'cn-attention-flag-clear' : 'cn-attention-flag-raise'"
				@click="submit">
				{{ raised ? label('clear') : label('raise') }}
			</NcButton>
		</div>

		<p
			v-if="refusal"
			class="cn-attention-flag__refusal"
			role="alert"
			data-testid="cn-attention-flag-refusal">
			{{ refusal }}
		</p>

		<ol
			v-if="history.length > 0"
			class="cn-attention-flag__list"
			data-testid="cn-attention-flag-history">
			<li
				v-for="(row, index) in history"
				:key="`${row.moment}-${index}`"
				:data-act="row.act">
				<span class="cn-attention-flag__lead">{{ row.act === 'cleared' ? label('cleared') : label('raised') }}</span>
				<span class="cn-attention-flag__muted">{{ row.reason }}</span>
			</li>
		</ol>
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { emit } from '@nextcloud/event-bus'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcTextField } from '@nextcloud/vue'
import FlagOutline from 'vue-material-design-icons/FlagOutline.vue'
import { interpolateUrlTokens } from '../../composables/useEndpointSource.js'
import { dispatchObjectsChanged } from '../../utils/objectSignals.js'
import { readPath } from '../../utils/readPath.js'

/**
 * The default words, keyed as `content.labels` overrides them.
 *
 * @return {object} The labels.
 */
function defaultLabels() {
	return {
		raisedLead: t('nextcloud-vue', 'Flagged as needing attention:'),
		assessmentLead: t('nextcloud-vue', 'Assessed risk:'),
		reviewDue: t('nextcloud-vue', 'Due for review'),
		reasonRaise: t('nextcloud-vue', 'Why this needs attention'),
		reasonClear: t('nextcloud-vue', 'Why it no longer needs attention'),
		hintRaise: t('nextcloud-vue', 'Flag it with a reason, so it stands out to everyone who works on it.'),
		hintClear: t('nextcloud-vue', 'Clear the flag with a reason once it no longer needs attention.'),
		raise: t('nextcloud-vue', 'Flag for attention'),
		clear: t('nextcloud-vue', 'Clear the flag'),
		raised: t('nextcloud-vue', 'Raised'),
		cleared: t('nextcloud-vue', 'Cleared'),
		failed: t('nextcloud-vue', 'This did not work. Try again.'),
	}
}

/** The assessed levels a record may carry, with their default words. */
const LEVELS = {
	low: 'Low',
	medium: 'Medium',
	high: 'High',
	critical: 'Critical',
}

/**
 * CnAttentionFlagWidget — the `attention-flag` widget: a flag a PERSON raises
 * on a record with a reason, the markers the SYSTEM raised against a part of
 * it, and an assessment the ORGANISATION made, kept apart on one strip.
 *
 * ```json
 * {
 *   "type": "attention-flag",
 *   "content": {
 *     "endpoint": "/apps/myapp/api/item/@objectId/attention",
 *     "raisePath": "/raise",
 *     "clearPath": "/clear",
 *     "markersPath": "attentionMarkers",
 *     "panelLabels": { "item-files": "Files" },
 *     "assessment": { "path": "riskAssessment", "levelMap": { "high": "High" }, "reviewDateField": "reviewDate" },
 *     "behindButton": true
 *   }
 * }
 * ```
 *
 * The endpoint answers `{ raised, flag: { reason }, history: [{ act, reason, moment }] }`
 * on GET, and the same after a POST of `{ reason }` to `raisePath` or
 * `clearPath`. A reason is required in both directions: the button stays
 * disabled without one, and the server's refusal sentence (`error`) is shown
 * as written. Markers and the assessment are read off the record the page
 * already holds. An assessment the reader may not see is absent from the
 * record, so it is absent here rather than blank. A failed read draws
 * nothing. With `behindButton` the strip shows the act as a heading, a hint
 * (`labels.hintRaise` / `labels.hintClear`) and one button, and the reason
 * field opens when that button is pressed. After a raise or a clear the widget emits `object-changed`, says
 * so to every list (`dispatchObjectsChanged`) and asks the page to refresh.
 *
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-record-can-carry-an-attention-flag
 */
export default {
	name: 'CnAttentionFlagWidget',

	components: { FlagOutline, NcButton, NcTextField },

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The configuration: `endpoint` (tokens `@objectId`, `@object.<field>`),
		 * `raisePath` (default `/raise`), `clearPath` (default `/clear`),
		 * `labels` (overrides of the default words), `markersPath`,
		 * `panelLabels` (marker tab id to label) and `assessment`
		 * (`{ path, levelMap?, levelField?, groundField?, reviewDateField? }`)
		 * and `behindButton` (the reason field opens from a button).
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** The record's id, bound by the detail-page host. */
		objectId: {
			type: [String, Number],
			default: '',
		},

		/** The loaded record, or null while it is fetched. */
		objectData: {
			type: Object,
			default: null,
		},

		/** The record's register, for the changed-objects signal. */
		register: {
			type: [String, Object],
			default: '',
		},

		/** The record's schema, for the changed-objects signal. */
		schema: {
			type: [String, Object],
			default: '',
		},
	},

	emits: ['object-changed'],

	data() {
		return {
			loaded: false,
			busy: false,
			raised: false,
			flag: {},
			history: [],
			reason: '',
			refusal: '',
			composing: false,
		}
	},

	computed: {
		/**
		 * The flag endpoint with its tokens filled, or '' while a token is not known.
		 *
		 * @return {string}
		 */
		endpoint() {
			const raw = typeof this.content?.endpoint === 'string' ? this.content.endpoint : ''
			if (raw === '' || !this.objectId) {
				return ''
			}
			return interpolateUrlTokens(raw, { objectId: this.objectId, object: this.objectData || {} })
		},

		/** @return {boolean} Whether the reason field waits behind a button. */
		behindButton() {
			return this.content?.behindButton === true
		},

		/** @return {string} What the raise or clear was for, in the flag's own words. */
		flagReason() {
			return String(this.flag?.reason ?? '')
		},

		/** @return {string} The label over the reason field, naming the act it is for. */
		reasonLabel() {
			return this.raised ? this.label('reasonClear') : this.label('reasonRaise')
		},

		/**
		 * The markers on the record, each naming the part it points at.
		 *
		 * @return {Array<{marker: string, tab: string, reason: string, panelLabel: string}>}
		 */
		markers() {
			const path = this.content?.markersPath
			if (typeof path !== 'string' || path === '' || !this.objectData) {
				return []
			}
			const raw = readPath(this.objectData, path)
			if (!Array.isArray(raw)) {
				return []
			}
			const panelLabels = this.content?.panelLabels && typeof this.content.panelLabels === 'object' ? this.content.panelLabels : {}
			return raw
				.filter((marker) => marker && String(marker.marker ?? '') !== '')
				.map((marker) => {
					const tab = String(marker.tab ?? '')
					return {
						marker: String(marker.marker),
						tab,
						reason: String(marker.reason ?? ''),
						panelLabel: this.cnTranslate(panelLabels[tab] || tab),
					}
				})
		},

		/**
		 * The assessment, or null when the record carries none or the reader
		 * may not see it (OpenRegister leaves the property out).
		 *
		 * @return {{level: string, levelLabel: string, ground: string, dueForReview: boolean}|null}
		 */
		assessment() {
			const config = this.content?.assessment
			if (!config || typeof config !== 'object' || typeof config.path !== 'string' || !this.objectData) {
				return null
			}
			const stored = readPath(this.objectData, config.path)
			if (!stored || typeof stored !== 'object') {
				return null
			}
			const level = String(stored[config.levelField || 'level'] ?? '')
			if (level === '') {
				return null
			}
			const levelMap = config.levelMap && typeof config.levelMap === 'object' ? config.levelMap : {}
			const word = levelMap[level] || LEVELS[level]
			return {
				level,
				levelLabel: word ? this.cnTranslate(word) : level,
				ground: String(stored[config.groundField || 'ground'] ?? ''),
				dueForReview: hasPassed(String(stored[config.reviewDateField || 'reviewDate'] ?? '')),
			}
		},
	},

	watch: {
		endpoint: {
			immediate: true,
			handler() {
				this.load()
			},
		},
	},

	methods: {
		/**
		 * A label: the content's own (through the host translate), else the default.
		 *
		 * @param {string} key The label key.
		 * @return {string} The text.
		 */
		label(key) {
			const own = this.content?.labels && typeof this.content.labels[key] === 'string' ? this.content.labels[key] : ''
			return own !== '' ? this.cnTranslate(own) : defaultLabels()[key]
		},

		/**
		 * Read where the flag stands. A failure draws nothing: an instance that
		 * does not carry the endpoint answers 404, and nothing else depends on it.
		 *
		 * @return {Promise<void>}
		 */
		async load() {
			if (this.endpoint === '') {
				this.loaded = false
				return
			}
			try {
				const response = await axios.get(generateUrl(this.endpoint))
				this.apply(response?.data)
				this.loaded = true
			} catch {
				this.loaded = false
			}
		},

		/**
		 * Take the answer of a read or an act.
		 *
		 * @param {object} state What the endpoint answered.
		 * @return {void}
		 */
		apply(state) {
			this.raised = state?.raised === true
			this.flag = state?.flag ?? {}
			this.history = Array.isArray(state?.history) ? state.history : []
		},

		/**
		 * Keep the typed reason, so the button knows whether there is one.
		 *
		 * @param {string} value The field's value.
		 * @return {void}
		 */
		onReason(value) {
			this.reason = String(value ?? '')
		},

		/**
		 * Raise the flag, or clear it, with the reason that was written.
		 *
		 * @return {Promise<void>}
		 */
		async submit() {
			const reason = this.reason.trim()
			if (reason === '' || this.endpoint === '') {
				return
			}
			const tail = this.raised ? (this.content?.clearPath || '/clear') : (this.content?.raisePath || '/raise')
			this.busy = true
			this.refusal = ''
			try {
				const response = await axios.post(generateUrl(this.endpoint + tail), { reason })
				this.apply(response?.data)
				this.reason = ''
				this.composing = false
				this.announce()
			} catch (error) {
				const said = String(error?.response?.data?.error ?? error?.response?.data?.message ?? '')
				this.refusal = said !== '' ? said : this.label('failed')
			} finally {
				this.busy = false
			}
		},

		/**
		 * Say the record changed: to the host, to every list showing it, and
		 * to the page so it reads the record again.
		 *
		 * @return {void}
		 */
		announce() {
			const id = String(this.objectId || '')
			/** @event object-changed The flag was raised or cleared: `{ register, schema, id }` of the record. */
			this.$emit('object-changed', { register: this.register, schema: this.schema, id })
			dispatchObjectsChanged({ register: typeof this.register === 'string' ? this.register : '', schema: typeof this.schema === 'string' ? this.schema : '', id })
			emit('cn:page:refresh')
		},
	},
}

/**
 * Whether a date lies before today. The date named is the last day the
 * assessment is still good for, so a review date of today is not yet due.
 *
 * @param {string} date The date.
 * @return {boolean} True when it has passed.
 */
function hasPassed(date) {
	if (date === '') {
		return false
	}
	const moment = new Date(date)
	if (Number.isNaN(moment.getTime())) {
		return false
	}
	return moment.toISOString().slice(0, 10) < new Date().toISOString().slice(0, 10)
}
</script>

<style scoped>
.cn-attention-flag {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 4px 0;
}

.cn-attention-flag__line,
.cn-attention-flag__act {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
	margin: 0;
}

.cn-attention-flag__list {
	display: flex;
	flex-direction: column;
	gap: 2px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-attention-flag__list li {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.cn-attention-flag__lead {
	font-weight: bold;
}

.cn-attention-flag__heading {
	margin: 0;
	font-size: 14px;
	font-weight: bold;
}

.cn-attention-flag__hint {
	margin: 0 0 8px;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-attention-flag__muted {
	color: var(--color-text-maxcontrast);
}

.cn-attention-flag__due {
	color: var(--color-warning-text, var(--color-main-text));
}

.cn-attention-flag__refusal {
	margin: 0;
	color: var(--color-error-text, var(--color-error));
}
</style>
