<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-task-form-widget" data-testid="cn-task-form-widget">
		<p v-if="descriptionText" class="cn-task-form-widget__description" data-testid="cn-task-form-widget-description">
			{{ descriptionText }}
		</p>
		<CnCardNotices
			v-if="notices.length > 0"
			:notices="notices"
			@noticeDismiss="onDismiss" />
		<template v-if="form">
			<CnTaskFormFields
				:form="form"
				:values="values"
				:errors="errors"
				idPrefix="cn-task-form-widget-field"
				@answer="onAnswer" />
			<p v-if="helpText" class="cn-task-form-widget__help" data-testid="cn-task-form-widget-help">
				{{ helpText }}
			</p>
			<div class="cn-task-form-widget__actions">
				<NcButton
					v-if="draftUrl"
					variant="secondary"
					:disabled="busy"
					data-testid="cn-task-form-widget-draft"
					@click="saveDraft">
					{{ draftLabel }}
				</NcButton>
				<NcButton
					variant="primary"
					:disabled="busy"
					data-testid="cn-task-form-widget-complete"
					@click="complete">
					{{ completeLabel }}
				</NcButton>
			</div>
		</template>
		<p v-else class="cn-task-form-widget__empty" data-testid="cn-task-form-widget-empty">
			{{ emptyLabel }}
		</p>
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { emit } from '@nextcloud/event-bus'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton } from '@nextcloud/vue'
import CnTaskFormFields from '../CnTaskFormFields/CnTaskFormFields.vue'
import { formatBoardDate, formatTimeOfDay } from '../../utils/boardDate.js'
import { parseAxiosError } from '../../utils/errors.js'
import { fillTemplate } from '../../utils/fillTemplate.js'
import { taskForm } from '../../utils/flowTask.js'
import { readPath } from '../../utils/readPath.js'
import { CnCardNotices } from '../CnCardNotices/index.js'

const FLOW_TASKS_URL = '/apps/openregister/api/flow-tasks'

/**
 * Whether an answer is empty: `0` and `false` are answers.
 *
 * @param {unknown} value The answer.
 * @return {boolean}
 */
function isEmpty(value) {
	return value === undefined || value === null || (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0)
}

/**
 * CnTaskFormWidget (widget type `task-form`): the form of the flow task the
 * page shows, as a card (board DqTaak "Vraag uit de flow"): the question,
 * the fields with a required field's refusal under it, a help line, and
 * "Save as provisional" plus "Complete". A draft the server kept is put back
 * with a notice saying how much of it came back.
 *
 * Content-only: the detail host draws the titled card around it. The task is
 * the page's record (`objectData`).
 */
export default {
	name: 'CnTaskFormWidget',

	components: { CnCardNotices, CnTaskFormFields, NcButton },

	inject: {
		/** The host app's translate function. */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The widget config:
		 *
		 * - `description` — a template filled from the task, the question above
		 *   the fields; default the task form's `description`.
		 * - `help` — a muted line under the fields.
		 * - `completeUrl` — where Complete posts `{ outcome: "done", data }`;
		 *   `{id}` is the task uuid. Default the engine's flow-task route.
		 * - `draft` — `{ url, method? }`: GET answers `{ values, savedAt }` (a kept
		 *   draft), and "Save as provisional" sends `{ values }` (`method`, default
		 *   POST); `{id}` is the task uuid. Without it there is no draft button.
		 * - `draftLabel`, `completeLabel`, `successMessage`, `draftSavedText`,
		 *   `restoredText` (`{count}`, `{total}`, `{date}`), `emptyText`.
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** The page's record: the flow task. */
		objectData: {
			type: Object,
			default: null,
		},

		/** The record id, used when the task carries no uuid. */
		objectId: {
			type: [String, Number],
			default: null,
		},
	},

	data() {
		return {
			/** The answers so far, keyed by field. */
			answers: {},
			/** The message under a field, keyed by field. */
			errors: {},
			/** The card's notices: the restored draft, a refusal, a saved draft. */
			notices: [],
			busy: false,
		}
	},

	computed: {
		/**
		 * @return {object|null} The task's form.
		 *
		 * @spec openspec/changes/task-form-widget/specs/task-form-widget/spec.md#requirement-a-flow-tasks-form-is-a-card-of-its-own
		 */
		form() {
			return taskForm(this.objectData)
		},

		/**
		 * @return {string} The task uuid.
		 *
		 * @spec openspec/changes/task-form-widget/specs/task-form-widget/spec.md#requirement-a-flow-tasks-form-is-a-card-of-its-own
		 */
		taskId() {
			return String(this.objectData?.uuid || this.objectData?.id || this.objectId || '')
		},

		/**
		 * @return {object} The answers drawn: the task's stored data under what was typed.
		 *
		 * @spec openspec/changes/task-form-widget/specs/task-form-widget/spec.md#requirement-a-flow-tasks-form-is-a-card-of-its-own
		 */
		values() {
			const stored = this.objectData && typeof this.objectData.data === 'object' && this.objectData.data !== null ? this.objectData.data : {}
			return { ...stored, ...this.answers }
		},

		/**
		 * @return {string} The question above the fields.
		 *
		 * @spec openspec/changes/task-form-widget/specs/task-form-widget/spec.md#requirement-a-flow-tasks-form-is-a-card-of-its-own
		 */
		descriptionText() {
			const template = this.content?.description
			if (typeof template === 'string' && template !== '') {
				return fillTemplate(this.translate(template), this.objectData || {})
			}
			const own = readPath(this.objectData || {}, 'form.description')
			return typeof own === 'string' ? own : ''
		},

		/**
		 * @return {string} The help line.
		 *
		 * @spec openspec/changes/task-form-widget/specs/task-form-widget/spec.md#requirement-a-flow-tasks-form-is-a-card-of-its-own
		 */
		helpText() {
			return this.textOf('help', '')
		},

		/**
		 * @return {string} The draft route, `{id}` filled, or ''.
		 *
		 * @spec openspec/changes/task-form-widget/specs/task-form-widget/spec.md#requirement-a-task-form-can-be-saved-as-provisional-and-comes-back
		 */
		draftUrl() {
			const url = this.content?.draft?.url
			return typeof url === 'string' && url !== '' && this.taskId !== '' ? url.replace('{id}', encodeURIComponent(this.taskId)) : ''
		},

		/**
		 * @return {string}
		 *
		 * @spec openspec/changes/task-form-widget/specs/task-form-widget/spec.md#requirement-a-task-form-can-be-saved-as-provisional-and-comes-back
		 */
		draftLabel() {
			return this.textOf('draftLabel', t('nextcloud-vue', 'Save as provisional'))
		},

		/**
		 * @return {string}
		 *
		 * @spec openspec/changes/task-form-widget/specs/task-form-widget/spec.md#requirement-a-flow-tasks-form-is-a-card-of-its-own
		 */
		completeLabel() {
			return this.textOf('completeLabel', t('nextcloud-vue', 'Complete'))
		},

		/**
		 * @return {string}
		 *
		 * @spec openspec/changes/task-form-widget/specs/task-form-widget/spec.md#requirement-a-flow-tasks-form-is-a-card-of-its-own
		 */
		emptyLabel() {
			return this.textOf('emptyText', t('nextcloud-vue', 'This task asks nothing to fill in.'))
		},
	},

	watch: {
		draftUrl: {
			immediate: true,
			/** @spec openspec/changes/task-form-widget/specs/task-form-widget/spec.md#requirement-a-task-form-can-be-saved-as-provisional-and-comes-back */
			handler(url) {
				if (url) {
					this.loadDraft()
				}
			},
		},
	},

	methods: {
		/**
		 * @param {string} text A host text.
		 * @return {string} It translated.
		 * @spec openspec/changes/task-form-widget/specs/task-form-widget/spec.md#requirement-a-flow-tasks-form-is-a-card-of-its-own
		 */
		translate(text) {
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : text
		},

		/**
		 * @param {string} key A content key.
		 * @param {string} fallback The library's words.
		 * @return {string} The content's text, translated, else the fallback.
		 * @spec openspec/changes/task-form-widget/specs/task-form-widget/spec.md#requirement-a-flow-tasks-form-is-a-card-of-its-own
		 */
		textOf(key, fallback) {
			const text = this.content?.[key]
			return typeof text === 'string' && text !== '' ? this.translate(text) : fallback
		},

		/**
		 * @param {{field: string, value: unknown}} answer One answer typed.
		 * @spec openspec/changes/task-form-widget/specs/task-form-widget/spec.md#requirement-a-flow-tasks-form-is-a-card-of-its-own
		 */
		onAnswer({ field, value }) {
			this.answers = { ...this.answers, [field]: value }
			if (this.errors[field]) {
				const { [field]: _, ...rest } = this.errors
				this.errors = rest
			}
		},

		/**
		 * @param {object} notice The closed notice.
		 * @spec openspec/changes/task-form-widget/specs/task-form-widget/spec.md#requirement-a-flow-tasks-form-is-a-card-of-its-own
		 */
		onDismiss(notice) {
			this.notices = this.notices.filter((entry) => entry !== notice)
		},

		/**
		 * Read the draft the server kept and put it back, saying how much came back.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/task-form-widget/specs/task-form-widget/spec.md#requirement-a-task-form-can-be-saved-as-provisional-and-comes-back
		 */
		async loadDraft() {
			try {
				const { data } = await axios.get(generateUrl(this.draftUrl))
				const kept = data && typeof data.values === 'object' && data.values !== null ? data.values : null
				const count = kept ? Object.keys(kept).filter((key) => !isEmpty(kept[key])).length : 0
				if (!kept || count === 0) {
					return
				}
				this.answers = { ...kept, ...this.answers }
				const total = Array.isArray(this.form?.fields) ? this.form.fields.length : count
				const savedAt = data.savedAt ? new Date(data.savedAt) : null
				const date = savedAt && !Number.isNaN(savedAt.getTime()) ? `${formatBoardDate(savedAt)} ${formatTimeOfDay(savedAt)}` : ''
				const template = this.textOf('restoredText', t('nextcloud-vue', 'Unsaved input restored: {count} of {total} fields from your previous visit, {date}. Check them and save.'))
				this.notices = [{
					id: 'draft-restored',
					variant: 'info',
					role: 'status',
					text: template.replace('{count}', String(count)).replace('{total}', String(total)).replace('{date}', date),
				}]
			} catch {
				// No draft kept, or the route is not there: the form starts empty.
			}
		},

		/**
		 * Save what was typed as provisional, required fields left open.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/task-form-widget/specs/task-form-widget/spec.md#requirement-a-task-form-can-be-saved-as-provisional-and-comes-back
		 */
		async saveDraft() {
			this.busy = true
			try {
				const method = String(this.content?.draft?.method || 'post').toLowerCase() === 'put' ? 'put' : 'post'
				await axios[method](generateUrl(this.draftUrl), { values: this.values })
				this.notices = [{ id: 'draft-saved', variant: 'success', role: 'status', text: this.textOf('draftSavedText', t('nextcloud-vue', 'Saved as provisional.')), dismissible: true }]
			} catch (error) {
				this.refused(error)
			} finally {
				this.busy = false
			}
		},

		/**
		 * Complete the task with the answers. A required field left empty is
		 * refused under that field before anything is sent.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/task-form-widget/specs/task-form-widget/spec.md#requirement-a-flow-tasks-form-is-a-card-of-its-own
		 */
		async complete() {
			const missing = (Array.isArray(this.form?.fields) ? this.form.fields : [])
				.filter((field) => field && field.required === true && field.renderable !== false && isEmpty(this.values[field.field]))
			if (missing.length > 0) {
				this.errors = Object.fromEntries(missing.map((field) => [field.field, t('nextcloud-vue', 'Completing was refused: fill in {field}.', { field: field.label || field.field })]))
				return
			}
			this.busy = true
			try {
				const route = typeof this.content?.completeUrl === 'string' && this.content.completeUrl !== ''
					? this.content.completeUrl.replace('{id}', encodeURIComponent(this.taskId))
					: `${FLOW_TASKS_URL}/${encodeURIComponent(this.taskId)}/complete`
				await axios.post(generateUrl(route), { outcome: 'done', data: this.values })
				this.notices = [{ id: 'completed', variant: 'success', role: 'status', text: this.textOf('successMessage', t('nextcloud-vue', 'Task completed.')) }]
				emit('cn:page:refresh', { source: 'task-form', id: this.taskId })
			} catch (error) {
				this.refused(error)
			} finally {
				this.busy = false
			}
		},

		/**
		 * A refusal in the server's words, in the card.
		 *
		 * @param {unknown} error The caught error.
		 * @spec openspec/changes/task-form-widget/specs/task-form-widget/spec.md#requirement-a-flow-tasks-form-is-a-card-of-its-own
		 */
		refused(error) {
			const { message } = parseAxiosError(error)
			this.notices = [{ id: 'refused', variant: 'error', role: 'alert', text: message || t('nextcloud-vue', 'This could not be done. Try again.'), dismissible: true }]
		},
	},
}
</script>

<style scoped>
.cn-task-form-widget {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-task-form-widget__description,
.cn-task-form-widget__help,
.cn-task-form-widget__empty {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-task-form-widget__help {
	font-size: 13px;
}

.cn-task-form-widget__actions {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: 8px;
}
</style>
