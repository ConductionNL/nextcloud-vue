<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<CnDialog
		:name="text(title) || t('nextcloud-vue', 'This may already exist')"
		width="form"
		data-testid="cn-duplicate-warning"
		@closing="close">
		<div class="cn-duplicate-warning">
			<NcNoteCard :type="affordances.blocked ? 'error' : 'warning'" data-testid="cn-duplicate-warning-note">
				{{ headlineText }}
			</NcNoteCard>

			<ul class="cn-duplicate-warning__matches">
				<li v-for="row in rows"
					:key="row.uuid"
					class="cn-duplicate-warning__match"
					data-testid="cn-duplicate-warning-match">
					<a v-if="row.href" :href="row.href" class="cn-duplicate-warning__title">{{ row.title }}</a>
					<span v-else class="cn-duplicate-warning__title">{{ row.title }}</span>
					<span v-if="row.meta" class="cn-duplicate-warning__meta">{{ row.meta }}</span>
					<span class="cn-duplicate-warning__meta">{{ row.matchedOn }} ({{ row.percentage }}%)</span>
				</li>
			</ul>

			<NcTextField v-if="affordances.needsReason"
				:label="text(reasonLabel) || t('nextcloud-vue', 'Why file it anyway')"
				:modelValue="reason"
				data-testid="cn-duplicate-warning-reason"
				@update:modelValue="reason = $event" />

			<p v-if="affordances.blocked && !affordances.mayContinue"
				class="cn-duplicate-warning__hint"
				data-testid="cn-duplicate-warning-blocked">
				{{ text(blockedText) || t('nextcloud-vue', 'This cannot be filed twice. Open the one it matches, or ask a coordinator.') }}
			</p>
		</div>

		<template #actions>
			<NcButton variant="tertiary" data-testid="cn-duplicate-warning-cancel" @click="close">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton v-if="affordances.mayContinue"
				variant="primary"
				:disabled="!canFile"
				data-testid="cn-duplicate-warning-continue"
				@click="fileAnyway">
				{{ text(continueLabel) || t('nextcloud-vue', 'File it anyway') }}
			</NcButton>
		</template>
	</CnDialog>
</template>

<script>
import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcNoteCard, NcTextField } from '@nextcloud/vue'
import { duplicateAffordances } from '../../utils/duplicateWarning.js'
import { fillTemplate } from '../../utils/fillTemplate.js'
import { CnDialog } from '../CnDialog/index.js'

/**
 * CnDuplicateWarning — "this may already exist", before a record is filed.
 * It renders OpenRegister's scored matches (`{ uuid, score, matchedOn }`),
 * never scoring anything itself, with each matched record's title, a meta
 * line, what it matched on and how strongly. Under a `warn` policy anyone may
 * file it anyway; under `block` only a user who `mayOverride`, and they say
 * why. A match the user may not read is reported without disclosing it.
 * dossiq's case intake is the first consumer; pipelinq contacts share it.
 *
 * Open it in a template, or from code with `openDuplicateWarning(props)`,
 * which resolves with `{ reason, over }` or null.
 *
 * ```vue
 * <CnDuplicateWarning
 *   :matches="matches"
 *   :records="readableCases"
 *   policy="block"
 *   :may-override="isCoordinator"
 *   record-url="/apps/dossiq/cases/{uuid}"
 *   :field-labels="{ requester: 'Requester', title: 'Subject' }"
 *   @file="save"
 *   @close="cancel" />
 * ```
 */
export default {
	name: 'CnDuplicateWarning',

	components: { CnDialog, NcButton, NcNoteCard, NcTextField },

	inject: {
		/** The host app's translate (CnAppRoot `cnTranslate`). */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The scored matches, as OpenRegister answered: `{ uuid, score, matchedOn }`.
		 *
		 * @type {Array<object>}
		 */
		matches: {
			type: Array,
			default: () => [],
		},

		/**
		 * The matched records the user may read, matched by `id`, `uuid` or `@self.id`.
		 *
		 * @type {Array<object>}
		 */
		records: {
			type: Array,
			default: () => [],
		},

		/** `warn` lets anyone file it anyway; `block` only a user who `mayOverride`. */
		policy: {
			type: String,
			default: 'warn',
		},

		/** Whether this user may file over a block (and must say why). */
		mayOverride: {
			type: Boolean,
			default: false,
		},

		/** A record's title, a template filled from it. */
		rowTitle: {
			type: String,
			default: '{title}',
		},

		/** A record's meta line, a template filled from it. */
		rowMeta: {
			type: String,
			default: '{identifier}',
		},

		/** A record's page, a template with `{uuid}`; empty draws no link. */
		recordUrl: {
			type: String,
			default: '',
		},

		/**
		 * Words for the matched fields (`{ requester: "Requester" }`), through the host translate.
		 *
		 * @type {object}
		 */
		fieldLabels: {
			type: Object,
			default: () => ({}),
		},

		/** The dialog title; defaults to "This may already exist". */
		title: {
			type: String,
			default: '',
		},

		/** The note's sentence, `{count}` filled; defaults to "%n existing record looks like this one.". */
		headline: {
			type: String,
			default: '',
		},

		/** The sentence under a block the user may not pass. */
		blockedText: {
			type: String,
			default: '',
		},

		/** The reason field's label. */
		reasonLabel: {
			type: String,
			default: '',
		},

		/** The continue button's label; defaults to "File it anyway". */
		continueLabel: {
			type: String,
			default: '',
		},
	},

	emits: ['close', 'file'],

	data() {
		return {
			reason: '',
		}
	},

	computed: {
		/**
		 * What to draw and offer.
		 *
		 * @spec openspec/changes/duplicate-warning/specs/duplicate-warning/spec.md#requirement-a-generic-duplicate-warning
		 * @return {{show: boolean, blocked: boolean, mayContinue: boolean, needsReason: boolean}}
		 */
		affordances() {
			return duplicateAffordances({ matches: this.matches, policy: this.policy, mayOverride: this.mayOverride })
		},

		/** @return {boolean} Whether "file it anyway" may be pressed. */
		canFile() {
			return this.affordances.mayContinue && (!this.affordances.needsReason || this.reason.trim() !== '')
		},

		/** @return {string} The note's sentence. */
		headlineText() {
			const count = this.matches.length
			if (this.headline) {
				return fillTemplate(this.cnTranslate(this.headline), { count })
			}
			return n('nextcloud-vue', '%n existing record looks like this one.', '%n existing records look like this one.', count)
		},

		/**
		 * One row per match: the readable record's title and meta and link, or
		 * a neutral name for one the user may not read.
		 *
		 * @spec openspec/changes/duplicate-warning/specs/duplicate-warning/spec.md#requirement-a-generic-duplicate-warning
		 * @return {Array<object>}
		 */
		rows() {
			return this.matches.map((match) => {
				const uuid = String((match && match.uuid) || '')
				const record = this.records.find((row) => String((row && (row.id || row.uuid || (row['@self'] && row['@self'].id))) || '') === uuid)
				const fields = Array.isArray(match && match.matchedOn) ? match.matchedOn : []
				const score = Number(match && match.score)
				return {
					uuid,
					title: record ? (fillTemplate(this.rowTitle, record).trim() || uuid) : t('nextcloud-vue', 'A record you may not open'),
					meta: record ? fillTemplate(this.rowMeta, record).trim() : '',
					href: record && this.recordUrl ? generateUrl(fillTemplate(this.recordUrl, { uuid: encodeURIComponent(uuid) })) : '',
					matchedOn: fields.length
						? fields.map((field) => (this.fieldLabels[field] ? this.cnTranslate(this.fieldLabels[field]) : field)).join(', ')
						: t('nextcloud-vue', 'Matched on the score, not on a single field'),
					percentage: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score * 100))) : 0,
				}
			})
		},
	},

	methods: {
		t,

		/**
		 * A prop text through the host translate.
		 *
		 * @param {string} value The text.
		 * @return {string}
		 */
		text(value) {
			return value ? this.cnTranslate(value) : ''
		},

		/** File it over the warning, carrying the reason and what it was filed over. */
		fileAnyway() {
			if (!this.canFile) {
				return
			}
			/** @event file The user files it anyway. Payload: `{ reason, over }`, `over` the matched uuids. */
			this.$emit('file', { reason: this.reason.trim(), over: this.matches.map((m) => String((m && m.uuid) || '')).filter(Boolean) })
		},

		/** Go back without filing. */
		close() {
			/** @event close The user went back without filing. */
			this.$emit('close')
		},
	},
}
</script>

<style scoped>
.cn-duplicate-warning {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-duplicate-warning__matches {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-duplicate-warning__match {
	display: flex;
	flex-wrap: wrap;
	gap: 4px 12px;
	padding: 8px 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 8px);
}

.cn-duplicate-warning__title {
	font-weight: 600;
}

.cn-duplicate-warning__meta,
.cn-duplicate-warning__hint {
	color: var(--color-text-maxcontrast);
}

.cn-duplicate-warning__hint {
	margin: 0;
}
</style>
