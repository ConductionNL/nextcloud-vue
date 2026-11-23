<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-task-form-fields" :data-testid="idPrefix">
		<NcNoteCard
			v-if="blocked && !brokenOnly"
			type="error"
			:data-testid="`${idPrefix}-blocked`">
			{{ blockedMessage }}
		</NcNoteCard>
		<p
			v-else-if="external && !brokenOnly"
			class="cn-task-form-fields__external"
			:data-testid="`${idPrefix}-external`">
			{{ t('nextcloud-vue', 'This task is finished in its own form.') }}
		</p>
		<template v-else>
			<div
				v-for="field in shownFields"
				:key="field.field"
				class="cn-task-form-fields__field"
				:data-testid="field.renderable === false ? `${idPrefix}-broken-row` : null">
				<!-- `widget` (or `type`) `textarea`, `select` (`options` or
				     `enum`) and `date`; anything else is one line of text. -->
				<NcTextArea
					v-if="field.renderable !== false && kindOf(field) === 'textarea'"
					:id="`${idPrefix}-${field.field}`"
					:modelValue="String(values[field.field] ?? '')"
					:label="labelOf(field)"
					:placeholder="field.placeholder || undefined"
					:required="field.required === true"
					:error="!!errorOf(field)"
					:helperText="errorOf(field)"
					:data-testid="`${idPrefix}-${field.field}`"
					@update:modelValue="(value) => $emit('answer', { field: field.field, value })" />
				<NcSelect
					v-else-if="field.renderable !== false && kindOf(field) === 'select'"
					:inputId="`${idPrefix}-${field.field}`"
					:inputLabel="labelOf(field)"
					:options="optionsOf(field)"
					:modelValue="optionsOf(field).find((option) => option.id === values[field.field]) || null"
					:required="field.required === true"
					:data-testid="`${idPrefix}-${field.field}`"
					@update:modelValue="(option) => $emit('answer', { field: field.field, value: option ? option.id : null })" />
				<NcTextField
					v-else-if="field.renderable !== false"
					:id="`${idPrefix}-${field.field}`"
					:modelValue="String(values[field.field] ?? '')"
					:label="labelOf(field)"
					:type="kindOf(field) === 'date' ? 'date' : 'text'"
					:placeholder="field.placeholder || undefined"
					:required="field.required === true"
					:error="!!errorOf(field)"
					:helperText="errorOf(field)"
					:data-testid="`${idPrefix}-${field.field}`"
					@update:modelValue="(value) => $emit('answer', { field: field.field, value })" />
				<NcTextField
					v-else
					modelValue=""
					:label="labelOf(field)"
					:disabled="true"
					:helperText="taskFieldUnavailableReason(field)" />
				<p v-if="field.renderable !== false && kindOf(field) === 'select' && errorOf(field)"
					class="cn-task-form-fields__error"
					:data-testid="`${idPrefix}-${field.field}-error`">
					{{ errorOf(field) }}
				</p>
			</div>
		</template>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcNoteCard, NcSelect, NcTextArea, NcTextField } from '@nextcloud/vue'

/**
 * The text under a declared field the form cannot show: the server's reason,
 * plus who fixes it when the field is required.
 *
 * @param {{reason?: string, required?: boolean}} field The declared field.
 * @return {string} The helper text.
 */
export function taskFieldUnavailableReason(field) {
	const reason = field.reason || t('nextcloud-vue', 'This field is not available.')
	return field.required
		? `${reason} ${t('nextcloud-vue', 'Ask the person who set up this step to fix it.')}`
		: reason
}

/**
 * CnTaskFormFields — the fields of an OpenRegister task form, inline: one
 * input per declared field in the declared order, required when the
 * declaration says so, and a disabled row with the server's reason for a
 * field the schema no longer offers. A form that cannot be rendered
 * (`unresolvable`, or `broken` with no fields) shows the server's sentence; an
 * external form says the task is finished in its own form. The parent holds
 * the answers: each input emits `answer`.
 *
 * CnTaskFormDialog draws its unavailable rows through this component
 * (`brokenOnly`).
 *
 * ```vue
 * <CnTaskFormFields :form="task.form" :values="answers" @answer="({ field, value }) => answers[field] = value" />
 * ```
 *
 * @spec openspec/changes/task-widget-on-the-record/specs/task-widget-on-the-record/spec.md#requirement-a-task-form-renders-inline
 */
export default {
	name: 'CnTaskFormFields',

	components: { NcNoteCard, NcSelect, NcTextArea, NcTextField },

	props: {
		/**
		 * The form as the engine describes it: `{ kind, state, error, fields }`,
		 * each field `{ field, label?, required, renderable, reason, order }`.
		 *
		 * @type {object}
		 */
		form: {
			type: Object,
			required: true,
		},

		/**
		 * The answers so far, keyed by field. Read only: the component emits
		 * `answer` and the parent writes.
		 *
		 * @type {object}
		 */
		values: {
			type: Object,
			default: () => ({}),
		},

		/** Prefix of the input ids and test ids, so two forms on one page stay apart. */
		idPrefix: {
			type: String,
			default: 'cn-task-form-fields',
		},

		/**
		 * A message under a field, keyed by field ("Completing was refused:
		 * fill in Report."), e.g. a required field left empty.
		 *
		 * @spec openspec/changes/task-form-widget/specs/task-form-widget/spec.md#requirement-a-task-form-field-can-be-a-text-area-a-date-or-a-choice
		 */
		errors: {
			type: Object,
			default: () => ({}),
		},

		/** Draw only the declared fields the form cannot show (CnTaskFormDialog's rows). */
		brokenOnly: {
			type: Boolean,
			default: false,
		},
	},

	emits: [
		/**
		 * One answer typed.
		 *
		 * @event answer
		 * @type {{field: string, value: string}}
		 */
		'answer',
	],

	computed: {
		/** @return {Array<object>} The declared fields in declared order. */
		fields() {
			const list = Array.isArray(this.form?.fields) ? [...this.form.fields] : []
			return list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
		},

		/** @return {Array<object>} The fields drawn: all, or only the unavailable ones. */
		shownFields() {
			return this.brokenOnly ? this.fields.filter((field) => field.renderable === false) : this.fields
		},

		/** @return {boolean} Whether the form is finished elsewhere. */
		external() {
			return this.form?.kind === 'external' && this.form?.state !== 'unavailable'
		},

		/**
		 * Whether the form cannot be rendered at all: its declaration is gone,
		 * an external form is unavailable, or a broken form has no fields left.
		 *
		 * @return {boolean}
		 */
		blocked() {
			const state = String(this.form?.state ?? '')
			return state === 'unresolvable'
				|| (this.form?.kind === 'external' && state === 'unavailable')
				|| (state === 'broken' && this.fields.length === 0)
		},

		/** @return {string} The server's sentence, or a plain one. */
		blockedMessage() {
			return String(this.form?.error ?? '').trim() || t('nextcloud-vue', 'This task form is not available.')
		},
	},

	methods: {
		t,
		taskFieldUnavailableReason,

		/**
		 * @param {{field: string, label?: string}} field The declared field.
		 * @return {string} Its label: the declared one, else the field key.
		 */
		labelOf(field) {
			return field.label || field.field
		},

		/**
		 * @param {{widget?: string, type?: string}} field The declared field.
		 * @return {string} `textarea`, `select`, `date` or `text`.
		 * @spec openspec/changes/task-form-widget/specs/task-form-widget/spec.md#requirement-a-task-form-field-can-be-a-text-area-a-date-or-a-choice
		 */
		kindOf(field) {
			const kind = String(field.widget || field.type || '')
			if (kind === 'textarea' || kind === 'date') {
				return kind
			}
			return kind === 'select' || this.optionsOf(field).length > 0 ? 'select' : 'text'
		},

		/**
		 * The choices of a field: `options` (`[{ value, label }]` or strings),
		 * else `enum`, as NcSelect options `{ id, label }`.
		 *
		 * @param {{options?: Array, enum?: Array}} field The declared field.
		 * @return {Array<{id: string, label: string}>}
		 * @spec openspec/changes/task-form-widget/specs/task-form-widget/spec.md#requirement-a-task-form-field-can-be-a-text-area-a-date-or-a-choice
		 */
		optionsOf(field) {
			const list = Array.isArray(field.options) ? field.options : (Array.isArray(field.enum) ? field.enum : [])
			return list
				.map((option) => (option && typeof option === 'object' ? { id: String(option.value ?? ''), label: String(option.label ?? option.value ?? '') } : { id: String(option), label: String(option) }))
				.filter((option) => option.id !== '')
		},

		/**
		 * @param {{field: string}} field The declared field.
		 * @return {string} Its message from `errors`, or ''.
		 * @spec openspec/changes/task-form-widget/specs/task-form-widget/spec.md#requirement-a-task-form-field-can-be-a-text-area-a-date-or-a-choice
		 */
		errorOf(field) {
			const message = this.errors && this.errors[field.field]
			return typeof message === 'string' ? message : ''
		},
	},
}
</script>

<style scoped>
.cn-task-form-fields {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-task-form-fields__error {
	margin: 4px 0 0;
	color: var(--color-text-error, var(--color-error));
	font-size: 13px;
}

.cn-task-form-fields__external {
	margin: 0;
	color: var(--color-text-maxcontrast);
}
</style>
