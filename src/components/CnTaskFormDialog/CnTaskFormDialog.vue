<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<NcDialog
		v-if="blocked"
		:name="resolvedTitle"
		size="normal"
		@closing="$emit('close')">
		<NcNoteCard type="error" data-testid="cn-task-form-error">
			{{ blockedMessage }}
		</NcNoteCard>
		<template #actions>
			<NcButton @click="$emit('close')">
				{{ closeLabel }}
			</NcButton>
			<NcButton variant="primary" :disabled="true">
				{{ confirmLabel }}
			</NcButton>
		</template>
	</NcDialog>
	<NcDialog
		v-else-if="loadingTask || loadFailed"
		:name="resolvedTitle"
		size="normal"
		@closing="$emit('close')">
		<NcLoadingIcon v-if="loadingTask" :name="t('nextcloud-vue', 'Loading …')" />
		<NcNoteCard v-else type="error" data-testid="cn-task-form-load-error">
			{{ loadErrorMessage }}
		</NcNoteCard>
	</NcDialog>
	<CnFormDialog
		v-else
		ref="formDialog"
		:schema="schema"
		:fields="manualFields"
		:item="subject"
		:includeFields="includeFields"
		:fieldOverrides="fieldOverrides"
		:dialogTitle="resolvedTitle"
		:confirmLabel="confirmLabel"
		:confirmDisabled="requiredBroken"
		:recoverDraft="false"
		@confirm="onConfirm"
		@close="$emit('close')">
		<template #before-fields>
			<!-- One disabled row per declared field the schema no longer offers. -->
			<div
				v-for="field in brokenFields"
				:key="field.field"
				class="cn-task-form__broken"
				data-testid="cn-task-form-broken-row">
				<NcTextField
					modelValue=""
					:label="brokenLabel(field)"
					:disabled="true"
					:helperText="brokenReason(field)" />
			</div>
		</template>
		<template #after-fields>
			<NcTextField
				v-model="comment"
				class="cn-task-form__comment"
				:label="t('nextcloud-vue', 'Comment (optional)')" />
		</template>
	</CnFormDialog>
</template>

<script>
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcDialog, NcLoadingIcon, NcNoteCard, NcTextField } from '@nextcloud/vue'
import CnFormDialog from '../CnFormDialog/CnFormDialog.vue'

/** Refusal kinds that name no field to mark. */
const FIELDLESS_KINDS = ['checklist', 'unresolvable', 'no-subject']

/**
 * CnTaskFormDialog — completes an OpenRegister task with the form it asks for.
 *
 * Reads `GET /api/flow-tasks/{uuid}` (or takes the answer as `task`), loads the
 * subject schema and object, and scopes `CnFormDialog` to the declared,
 * renderable fields in the declared order, each required exactly when the
 * declaration says so. A declared field the schema no longer offers shows as a
 * disabled row with the server's reason; Confirm is disabled while such a field
 * is required. An unresolvable or unavailable form shows the server's error and
 * no form. Confirm posts `{ outcome, comment, data }` to
 * `/api/flow-tasks/{uuid}/complete`; a 400 keeps the dialog open with every
 * typed value and marks the fields it names. With `submit` false it emits
 * `confirm` instead and the parent reports back through `setResult()`.
 *
 * ```vue
 * <CnTaskFormDialog taskUuid="…" outcome="approved" @completed="reload" @close="open = false" />
 * ```
 */
export default {
	name: 'CnTaskFormDialog',

	components: { CnFormDialog, NcButton, NcDialog, NcLoadingIcon, NcNoteCard, NcTextField },

	props: {
		/** UUID of the task. Fetched when `task` is not given. */
		taskUuid: {
			type: String,
			default: '',
		},

		/**
		 * The answer of `GET /api/flow-tasks/{uuid}` already fetched; skips the fetch.
		 *
		 * @type {object|null}
		 */
		task: {
			type: Object,
			default: null,
		},

		/** The outcome sent on completion. */
		outcome: {
			type: String,
			default: 'done',
		},

		/** Post to `/complete` on Confirm. With `false`, emit `confirm` and let the parent persist. */
		submit: {
			type: Boolean,
			default: true,
		},

		/** Dialog title. Defaults to the task title. */
		dialogTitle: {
			type: String,
			default: '',
		},

		/** Base URL of the OpenRegister API. */
		apiBase: {
			type: String,
			default: '/apps/openregister/api',
		},
	},

	emits: [
		/**
		 * Emitted with the completed task row after the server accepts the completion.
		 *
		 * @event completed
		 * @type {object}
		 */
		'completed',
		/**
		 * Emitted when the dialog should close.
		 *
		 * @event close
		 */
		'close',
		/**
		 * Emitted on Confirm when `submit` is false. Report back through `setResult()`.
		 *
		 * @event confirm
		 * @type {{outcome: string, comment: string, data: object}}
		 */
		'confirm',
	],

	data() {
		return {
			loadedTask: this.task,
			schema: null,
			subject: null,
			loadingTask: false,
			loadFailed: false,
			comment: '',
		}
	},

	computed: {
		form() {
			return this.loadedTask ? this.loadedTask.form || null : null
		},

		declared() {
			const list = Array.isArray(this.form?.fields) ? [...this.form.fields] : []
			return list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
		},

		renderableFields() {
			return this.declared.filter((f) => f.renderable !== false)
		},

		brokenFields() {
			return this.declared.filter((f) => f.renderable === false)
		},

		requiredBroken() {
			return this.brokenFields.some((f) => f.required === true)
		},

		includeFields() {
			return this.form?.kind === 'fields' && this.schema ? this.renderableFields.map((f) => f.field) : null
		},

		fieldOverrides() {
			const overrides = {}
			for (const f of this.renderableFields) {
				overrides[f.field] = { required: f.required === true, order: f.order ?? 0 }
			}
			return overrides
		},

		/** With no form to render, the dialog is the comment field only. */
		manualFields() {
			return this.includeFields === null ? [] : null
		},

		blocked() {
			const f = this.form
			if (!f) {
				return false
			}
			return f.state === 'unresolvable' || (f.kind === 'external' && f.state === 'unavailable')
		},

		blockedMessage() {
			return this.form?.error || t('nextcloud-vue', 'This task form is not available.')
		},

		loadErrorMessage() {
			return t('nextcloud-vue', 'The task could not be loaded.')
		},

		resolvedTitle() {
			return this.dialogTitle || this.loadedTask?.title || t('nextcloud-vue', 'Complete task')
		},

		confirmLabel() {
			return t('nextcloud-vue', 'Complete')
		},

		closeLabel() {
			return t('nextcloud-vue', 'Close')
		},
	},

	watch: {
		task(next) {
			this.loadedTask = next
			this.loadSubject()
		},
	},

	created() {
		this.load()
	},

	methods: {
		t,

		/** Fetch the task when it was not handed in, then its schema and subject. */
		async load() {
			if (!this.loadedTask && this.taskUuid) {
				this.loadingTask = true
				try {
					const response = await axios.get(generateUrl(`${this.apiBase}/flow-tasks/${encodeURIComponent(this.taskUuid)}`))
					this.loadedTask = response?.data || null
				} catch {
					this.loadFailed = true
				}
				this.loadingTask = false
			}
			await this.loadSubject()
		},

		/** Load the subject schema and object for a `fields` form. */
		async loadSubject() {
			const form = this.form
			const task = this.loadedTask
			if (!form || form.kind !== 'fields' || form.state === 'unresolvable' || !task) {
				return
			}
			this.loadingTask = true
			try {
				const schemaId = form.schema?.id ?? task.schemaId
				const response = await axios.get(generateUrl(`${this.apiBase}/schemas/${schemaId}`))
				this.schema = response?.data || null
			} catch {
				this.loadFailed = true
			}
			if (task.registerId && task.schemaId && task.objectUuid) {
				try {
					const response = await axios.get(generateUrl(`${this.apiBase}/objects/${task.registerId}/${task.schemaId}/${task.objectUuid}`))
					this.subject = response?.data || null
				} catch {
					this.subject = null
				}
			}
			this.loadingTask = false
		},

		/**
		 * The label of a broken row: the field key.
		 *
		 * @param {{field: string}} field The declared field.
		 * @return {string} The label.
		 */
		brokenLabel(field) {
			return field.field
		},

		/**
		 * The text under a broken row: the server's reason, plus who fixes it when the field is required.
		 *
		 * @param {{reason?: string, required?: boolean}} field The declared field.
		 * @return {string} The helper text.
		 */
		brokenReason(field) {
			const reason = field.reason || t('nextcloud-vue', 'This field is not available.')
			return field.required
				? `${reason} ${t('nextcloud-vue', 'Ask the person who set up this step to fix it.')}`
				: reason
		},

		/**
		 * Confirm: hand the values to the parent or complete the task.
		 *
		 * @param {object} formData The values of the rendered fields.
		 */
		async onConfirm(formData) {
			const data = {}
			for (const f of this.renderableFields) {
				if (formData && Object.hasOwn(formData, f.field)) {
					data[f.field] = formData[f.field]
				}
			}
			const payload = { outcome: this.outcome, data }
			if (this.comment !== '') {
				payload.comment = this.comment
			}
			if (!this.submit) {
				this.$emit('confirm', { outcome: this.outcome, comment: this.comment, data })
				return
			}
			const uuid = this.loadedTask?.uuid || this.taskUuid
			try {
				const response = await axios.post(generateUrl(`${this.apiBase}/flow-tasks/${encodeURIComponent(uuid)}/complete`), payload)
				this.$emit('completed', response?.data ?? this.loadedTask)
				this.$refs.formDialog?.setResult({ success: true })
			} catch (e) {
				this.showRefusal(e, data)
			}
		},

		/**
		 * Keep the dialog open and mark what the server refused.
		 *
		 * @param {object} error The axios error.
		 * @param {object} data The submitted values.
		 */
		showRefusal(error, data) {
			const body = error?.response?.status === 400 ? (error.response.data || {}) : null
			const message = body?.error || t('nextcloud-vue', 'The task could not be completed.')
			const named = body && Array.isArray(body.fields) ? body.fields : []
			if (!body || named.length === 0 || FIELDLESS_KINDS.includes(body.kind)) {
				this.$refs.formDialog?.setValidationErrors({}, message)
				return
			}
			const offered = new Set(this.renderableFields.map((f) => f.field))
			const fieldErrors = {}
			const unoffered = []
			for (const key of named) {
				if (!offered.has(key)) {
					unoffered.push(key)
					continue
				}
				const value = data[key]
				const empty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
				fieldErrors[key] = empty
					? t('nextcloud-vue', 'This field is required.')
					: t('nextcloud-vue', 'The server refused this value.')
			}
			const top = unoffered.length > 0
				? `${message} ${t('nextcloud-vue', 'This step does not accept: {fields}.', { fields: unoffered.join(', ') })}`
				: message
			this.$refs.formDialog?.setValidationErrors(fieldErrors, top)
		},

		/**
		 * Report the outcome when `submit` is false.
		 *
		 * @param {{success?: boolean, error?: string}} result The outcome to display.
		 * @public
		 */
		setResult(result) {
			this.$refs.formDialog?.setResult(result)
		},
	},
}
</script>

<style scoped>
.cn-task-form__broken {
	margin-bottom: 12px;
}

.cn-task-form__comment {
	margin-top: 12px;
}
</style>
