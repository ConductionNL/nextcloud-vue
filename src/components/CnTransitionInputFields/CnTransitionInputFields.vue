<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div
		class="cn-transition-input-fields"
		:class="{ 'cn-transition-input-fields--columns': columns === 2 }">
		<template v-if="summaryShown">
			<div v-if="summary.card"
				class="cn-transition-input-fields__card cn-transition-input-fields__wide"
				:data-testid="summaryTestid('card')">
				<component :is="summary.card.icon"
					v-if="summary.card.icon"
					:size="20"
					class="cn-transition-input-fields__card-icon" />
				<span class="cn-transition-input-fields__card-text">
					<strong>{{ contextText(summary.card.title) }}</strong>
					<span class="cn-transition-input-fields__muted">{{ cardMeta }}</span>
				</span>
				<span v-if="contextText(summary.card.badge)" class="cn-transition-input-fields__badge">
					{{ contextText(summary.card.badge) }}
				</span>
			</div>
			<section v-if="Array.isArray(summary.facts) && summary.facts.length > 0"
				class="cn-transition-input-fields__wide"
				:data-testid="summaryTestid('facts')">
				<h3 v-if="summary.title" class="cn-transition-input-fields__section-title">
					{{ summary.title }}
				</h3>
				<dl class="cn-transition-input-fields__facts">
					<div v-for="fact in summary.facts" :key="fact.path || fact.label">
						<dt>{{ fact.label }}</dt>
						<dd>{{ contextText(fact.path) || fact.fallback || '' }}</dd>
					</div>
				</dl>
			</section>
		</template>

		<template v-for="field in shownFields" :key="field.key">
			<div
				class="cn-transition-input__field"
				:class="{
					'cn-transition-input__field--refused': isRefused(field.key),
					'cn-transition-input-fields__wide': field.input.wide === true,
				}"
				:data-testid="`cn-transition-input-${field.key}`">
				<!-- A template fills another input; it is never sent itself. -->
				<CnTemplateSelect v-if="field.widget === 'template'"
					:url="field.input.url || ''"
					:schema="field.input.schema || ''"
					:params="field.input.params || {}"
					:mapOption="field.input.mapOption"
					:inputLabel="field.label"
					:placeholder="field.input.placeholder || ''"
					:data-testid="field.input.testid || `cn-transition-input-template-${field.key}`"
					@apply="applyTemplate(field, $event)" />

				<!-- An input that declares its choices is picked from them. -->
				<NcSelect v-else-if="field.widget === 'select'"
					:modelValue="selectedOption(field)"
					:options="field.options"
					label="label"
					:inputLabel="labelOf(field)"
					:clearable="!field.required"
					:disabled="disabled"
					:data-testid="field.input.testid || `cn-transition-input-select-${field.key}`"
					@update:modelValue="setValue(field.key, $event && $event.value !== undefined ? $event.value : '')" />

				<!-- An input that points at another record is picked, never typed. -->
				<div v-else-if="field.widget === 'reference'" class="cn-transition-input__reference">
					<label class="cn-transition-input__label">{{ labelOf(field) }}</label>
					<CnResourceSelect
						:register="field.referenceRegister"
						:schema="String(field.reference.schema)"
						:labelField="(field.picker && field.picker.labelField) || field.reference.labelField || 'name'"
						:filter="(field.picker && field.picker.filter) || {}"
						:exclude="excludedIds(field)"
						:allowCreate="false"
						:preload="true"
						:inputLabel="labelOf(field)"
						:modelValue="String(modelValue[field.key] ?? '')"
						:data-testid="`cn-transition-input-picker-${field.key}`"
						@update:modelValue="setValue(field.key, $event)" />
				</div>

				<!-- An object input: its sub-properties, one field at a time. -->
				<fieldset v-else-if="field.widget === 'object'" class="cn-transition-input__object">
					<legend>{{ labelOf(field) }}</legend>
					<div v-for="sub in field.subFields"
						:key="sub.key"
						class="cn-transition-input__subfield"
						:data-testid="`cn-transition-input-${field.key}-${sub.key}`">
						<NcTextArea v-if="sub.widget === 'textarea'"
							:modelValue="String(subValue(field.key, sub.key) ?? '')"
							:label="subLabel(sub)"
							rows="3"
							@update:modelValue="setSubValue(field.key, sub.key, $event)" />
						<NcCheckboxRadioSwitch v-else-if="sub.widget === 'checkbox'"
							:modelValue="subValue(field.key, sub.key) === true"
							type="switch"
							@update:modelValue="setSubValue(field.key, sub.key, $event === true)">
							{{ subLabel(sub) }}
						</NcCheckboxRadioSwitch>
						<NcTextField v-else
							:modelValue="String(subValue(field.key, sub.key) ?? '')"
							:type="sub.widget === 'number' ? 'number' : 'text'"
							:label="subLabel(sub)"
							@update:modelValue="setSubValue(field.key, sub.key, $event)" />
						<p v-if="isSubRefused(field.key, sub.key)"
							class="cn-transition-input__field-error"
							:data-testid="`cn-transition-input-error-${field.key}.${sub.key}`">
							{{ t('nextcloud-vue', 'This value was not accepted.') }}
						</p>
					</div>
				</fieldset>

				<NcCheckboxRadioSwitch v-else-if="field.widget === 'checkbox'"
					:modelValue="modelValue[field.key] === true"
					type="switch"
					:disabled="disabled"
					@update:modelValue="setValue(field.key, $event === true)">
					{{ labelOf(field) }}
				</NcCheckboxRadioSwitch>

				<template v-else>
					<!-- A label drawn above the field, as a form board draws it,
					     is tied to the field by its id. -->
					<label v-if="field.input.labelOutside === true"
						class="cn-transition-input-fields__label"
						:for="inputId(field)">{{ labelOf(field) }}</label>
					<NcTextArea v-if="field.widget === 'textarea'"
						:id="inputId(field)"
						:modelValue="String(modelValue[field.key] ?? '')"
						:label="labelOf(field)"
						:labelOutside="field.input.labelOutside === true"
						:helperText="field.description || ''"
						:rows="field.input.rows || 4"
						:disabled="disabled"
						resize="vertical"
						:data-testid="field.input.testid || null"
						@update:modelValue="setValue(field.key, $event)" />
					<NcTextField v-else
						:id="inputId(field)"
						:modelValue="String(modelValue[field.key] ?? '')"
						:type="textType(field)"
						:label="labelOf(field)"
						:labelOutside="field.input.labelOutside === true"
						:helperText="field.description || ''"
						:disabled="disabled"
						:data-testid="field.input.testid || null"
						@update:modelValue="setValue(field.key, $event)" />
					<span v-if="field.input.note" class="cn-transition-input-fields__muted">
						{{ field.input.note }}
					</span>
				</template>

				<p v-if="isRefused(field.key)"
					class="cn-transition-input__field-error"
					:data-testid="`cn-transition-input-error-${field.key}`">
					{{ refusalFor(field) }}
				</p>
			</div>

			<!-- What the input means once filled in, such as the day a paused
			     term comes back. Shown only once it can be worked out. -->
			<div v-if="field.previewText"
				:key="`${field.key}-preview`"
				class="cn-transition-input-fields__preview cn-transition-input-fields__wide"
				:data-testid="field.input.preview.testid || `cn-transition-input-preview-${field.key}`">
				<span class="cn-transition-input-fields__label">{{ field.input.preview.label }}</span>
				<span :data-testid="`${field.input.preview.testid || `cn-transition-input-preview-${field.key}`}-value`">{{ field.previewText }}</span>
				<span v-if="field.input.preview.note" class="cn-transition-input-fields__muted">
					{{ field.input.preview.note }}
				</span>
			</div>
		</template>

		<!-- A tinted box with the act's own icon (DqArchiveren "Daarna alleen
		     lezen", a lock), drawn here rather than as a note card: a note
		     card on the tinted card of a chosen act disappears into it. -->
		<div v-if="notice && notice.text"
			class="cn-transition-input-fields__notice cn-transition-input-fields__wide"
			:class="`cn-transition-input-fields__notice--${notice.type || 'info'}`"
			role="note"
			data-testid="cn-transition-input-fields-notice">
			<CnIcon :name="notice.icon || 'InformationOutline'" :size="20" class="cn-transition-input-fields__notice-icon" />
			<span class="cn-transition-input-fields__notice-text">
				<strong v-if="notice.heading">{{ notice.heading }}</strong>
				<span>{{ notice.text }}</span>
			</span>
		</div>

		<!-- A key the refusal names that this form never offered is not a
		     field anybody can correct here. Saying so beats saying nothing:
		     the request sent something the action does not accept. -->
		<p v-for="key in unofferedRefusals"
			:key="`unoffered-${key}`"
			class="cn-transition-input__field-error"
			:data-testid="`cn-transition-input-error-${key}`">
			{{ t('nextcloud-vue', 'This action does not accept the field "{field}".', { field: key }) }}
		</p>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcCheckboxRadioSwitch, NcSelect, NcTextArea, NcTextField } from '@nextcloud/vue'
import CnResourceSelect from '../CnResourceSelect/CnResourceSelect.vue'
import CnTemplateSelect from '../CnTemplateSelect/CnTemplateSelect.vue'
import { readPath } from '../../utils/readPath.js'
import { applyTemplateText, isInputFilled, prefillFromPick, resolveInputFields } from '../../utils/transitionInputs.js'
import { CnIcon } from '../CnIcon/index.js'

let uid = 0

/**
 * CnTransitionInputFields — the declared inputs of a transition or an act,
 * drawn wherever the host puts them.
 *
 * CnTransitionInputDialog draws them in their own dialog. A host that lists
 * several acts and opens the chosen one's inputs in place (under its card)
 * draws them with this component, so both read the same declarations and
 * decide the same way. The values are a `v-model` object keyed by field;
 * whether they are complete is `inputFieldsComplete(resolveInputFields(...))`.
 *
 * Next to the schema-resolved widgets an input may declare `widget` (`text`,
 * `textarea`, `number`, `date`, `select`, `template`), `optionsSource` (a dot
 * path into `context`), `other`, `helperFrom`, `prefillFrom`, `preview`, `default` and
 * presentation keys; see `resolveInputFields` in `utils/transitionInputs.js`.
 *
 * ```vue
 * <CnTransitionInputFields
 *   v-model="values"
 *   :inputs="act.inputs"
 *   :context="{ pauseReasons }"
 *   :columns="2" />
 * ```
 *
 * @spec openspec/changes/dq-abstract-forms/specs/transition-inputs/spec.md
 */
export default {
	name: 'CnTransitionInputFields',

	components: {
		CnIcon,
		CnResourceSelect,
		CnTemplateSelect,
		NcCheckboxRadioSwitch,
		NcSelect,
		NcTextArea,
		NcTextField,
	},

	props: {
		/**
		 * The declared inputs: `[{ field, required, label, widget, options,
		 * optionsSource, optionValue, optionLabel, other, helperFrom, prefillFrom, preview,
		 * default, description, note, labelOutside, id, wide, testid, rows,
		 * placeholder }]`, plus for a `template` input `url`, `schema`,
		 * `params`, `mapOption` and `applyTo`.
		 *
		 * @type {Array<object>}
		 */
		inputs: {
			type: Array,
			default: () => [],
		},

		/**
		 * The values, keyed by field.
		 *
		 * @type {object}
		 */
		modelValue: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * The object's JSON Schema, which labels and types the inputs that
		 * declare no widget of their own.
		 *
		 * @type {object|null}
		 */
		schema: {
			type: Object,
			default: null,
		},

		/**
		 * The record the action runs on: `picker.excludeSelf` leaves its id
		 * out, and an object input is merged over its present value.
		 *
		 * @type {object|null}
		 */
		currentObject: {
			type: Object,
			default: null,
		},

		/**
		 * Register slug the reference pickers look in when the schema property
		 * names none of its own.
		 *
		 * @type {string}
		 */
		register: {
			type: String,
			default: '',
		},

		/**
		 * What `optionsSource` and the summary paths read, such as the case
		 * type's choices and the record shown in the summary.
		 *
		 * @type {object}
		 */
		context: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * The input keys a refusal named. Each one this form offers is marked
		 * on its own field; each one it does not is reported as a key the
		 * action does not accept.
		 *
		 * @type {string[]}
		 */
		fieldErrors: {
			type: Array,
			default: () => [],
		},

		/**
		 * Whether the inputs are locked, such as while the action posts.
		 *
		 * @type {boolean}
		 */
		disabled: {
			type: Boolean,
			default: false,
		},

		/**
		 * 1 stacks the inputs; 2 sets them side by side, with `wide` inputs,
		 * previews, the summary and the notice across both columns.
		 *
		 * @type {number}
		 */
		columns: {
			type: Number,
			default: 1,
		},

		/**
		 * Whether a required input's label carries a ` *` marker.
		 *
		 * @type {boolean}
		 */
		markRequired: {
			type: Boolean,
			default: true,
		},

		/**
		 * A read-only block above the inputs about what the action works on:
		 * `{ when, card: { icon, title, meta: [], badge }, title, facts:
		 * [{ label, path, fallback }], testid }`. `when`, `title`, `meta`,
		 * `badge` and each fact's `path` are dot paths into `context`; the
		 * block is shown only when `when` resolves.
		 *
		 * @type {object|null}
		 */
		summary: {
			type: Object,
			default: null,
		},

		/**
		 * A note under the inputs: `{ type, heading, text, icon? }`. `type` is
		 * info (the default), warning or error; `icon` names a CnIcon.
		 *
		 * @type {object|null}
		 */
		notice: {
			type: Object,
			default: null,
		},
	},

	emits: ['update:modelValue'],

	data() {
		uid += 1
		return {
			uid,
			// The values with every change made since the host last passed
			// them in, so two changes in one tick both survive.
			latest: { ...this.modelValue },
		}
	},

	computed: {
		/** Every declared input, resolved against the schema and the context. */
		fields() {
			return resolveInputFields(this.inputs, {
				schema: this.schema,
				register: this.register,
				context: this.context,
				values: this.modelValue,
			})
		},

		/** The inputs that are asked now. */
		shownFields() {
			return this.fields.filter((field) => !field.hidden)
		},

		/** Whether the summary block shows. */
		summaryShown() {
			if (!this.summary || typeof this.summary !== 'object') {
				return false
			}
			return !this.summary.when || Boolean(readPath(this.context, this.summary.when))
		},

		/** The summary card's second line. */
		cardMeta() {
			const meta = Array.isArray(this.summary?.card?.meta) ? this.summary.card.meta : []
			return meta.map((path) => this.contextText(path)).filter(Boolean).join(' · ')
		},

		/** The refusal's field keys, normalised to strings. */
		refusedKeys() {
			if (!Array.isArray(this.fieldErrors)) {
				return []
			}
			return this.fieldErrors.filter((key) => typeof key === 'string' && key !== '')
		},

		/** The refused keys this form offers no field for. */
		unofferedRefusals() {
			const offered = this.fields.map((field) => field.key)
			return this.refusedKeys.filter((key) => !offered.includes(key))
		},
	},

	watch: {
		modelValue(values) {
			this.latest = { ...values }
		},
	},

	methods: {
		t,

		/**
		 * A context value as text, '' when absent.
		 *
		 * @param {string} path Dot path into the context.
		 * @return {string}
		 */
		contextText(path) {
			if (!path) {
				return ''
			}
			const value = readPath(this.context, path)
			return value === null || value === undefined ? '' : String(value)
		},

		/**
		 * The test id of one part of the summary.
		 *
		 * @param {string} part `card` or `facts`.
		 * @return {string}
		 */
		summaryTestid(part) {
			return `${this.summary.testid || 'cn-transition-input-summary'}-${part}`
		},

		/**
		 * The field's label, with the required marker when asked for.
		 *
		 * @param {object} field The descriptor.
		 * @return {string}
		 */
		labelOf(field) {
			return this.markRequired && field.required ? `${field.label} *` : field.label
		},

		/**
		 * Label of a sub-field, with the required marker.
		 *
		 * @param {object} sub The sub-field descriptor.
		 * @return {string}
		 */
		subLabel(sub) {
			return this.markRequired && sub.required ? `${sub.label} *` : sub.label
		},

		/**
		 * The element id of a text input: the declared one, or one unique to
		 * this form.
		 *
		 * @param {object} field The descriptor.
		 * @return {string}
		 */
		inputId(field) {
			return field.input.id || `cn-transition-input-${this.uid}-${field.key}`
		},

		/**
		 * The native input type of a one-line input.
		 *
		 * @param {object} field The descriptor.
		 * @return {string}
		 */
		textType(field) {
			return field.widget === 'number' || field.widget === 'date' ? field.widget : 'text'
		},

		/**
		 * The option a picker currently holds, or null.
		 *
		 * @param {object} field The select descriptor.
		 * @return {{value: string, label: string}|null}
		 */
		selectedOption(field) {
			const value = this.modelValue[field.key]
			return field.options.find((option) => option.value === String(value ?? '')) || null
		},

		/**
		 * Ids a reference picker must not offer: the current record, when the
		 * input's `picker.excludeSelf` says so.
		 *
		 * @param {object} field The reference descriptor.
		 * @return {string[]}
		 */
		excludedIds(field) {
			if (!field.picker || field.picker.excludeSelf !== true || !this.currentObject) {
				return []
			}
			const self = this.currentObject
			return [self.id, self.uuid, self['@self'] && self['@self'].id].filter((id) => id !== undefined && id !== null).map(String)
		},

		/**
		 * Whether the refusal named this field.
		 *
		 * @param {string} key The field key.
		 * @return {boolean}
		 */
		isRefused(key) {
			return this.refusedKeys.includes(key)
		},

		/**
		 * What to say beside a refused field. An empty one is a missing input;
		 * a filled one was refused for what is in it. The kind is decided here
		 * rather than read out of the refusal's sentence, which may be reworded.
		 *
		 * @param {object} field The descriptor.
		 * @return {string}
		 */
		refusalFor(field) {
			return isInputFilled(field, this.modelValue)
				? t('nextcloud-vue', 'This value was not accepted.')
				: t('nextcloud-vue', 'This field is required.')
		},

		/**
		 * Whether a refusal named `<input>.<sub>`.
		 *
		 * @param {string} key The input key.
		 * @param {string} sub The sub-field key.
		 * @return {boolean}
		 */
		isSubRefused(key, sub) {
			return this.refusedKeys.includes(`${key}.${sub}`)
		},

		/**
		 * A typed sub-value.
		 *
		 * @param {string} key The input key.
		 * @param {string} sub The sub-field key.
		 * @return {unknown}
		 */
		subValue(key, sub) {
			const group = this.modelValue[key]
			return group && typeof group === 'object' ? group[sub] : undefined
		},

		/**
		 * Store one sub-value, keeping the rest of the object input's values.
		 *
		 * @param {string} key The input key.
		 * @param {string} sub The sub-field key.
		 * @param {unknown} value The new value.
		 */
		setSubValue(key, sub, value) {
			const group = this.latest[key] && typeof this.latest[key] === 'object' ? this.latest[key] : {}
			this.setValue(key, { ...group, [sub]: value })
		},

		/**
		 * Store one input's value.
		 *
		 * @param {string} key The field key.
		 * @param {unknown} value The new value.
		 */
		setValue(key, value) {
			this.latest = { ...this.latest, [key]: value, ...prefillFromPick(this.fields, key, value) }
			/**
			 * @event update:modelValue The values with this one changed.
			 * @type {object}
			 */
			this.$emit('update:modelValue', this.latest)
		},

		/**
		 * Put a chosen template's text into the input it fills, unless that
		 * input already holds text.
		 *
		 * @param {object} field The template descriptor.
		 * @param {object|null} option The chosen template.
		 */
		applyTemplate(field, option) {
			const next = applyTemplateText(this.latest, field.input.applyTo, option)
			if (next !== this.latest) {
				this.latest = next
				/** @event update:modelValue The values with the template's text filled in. */
				this.$emit('update:modelValue', next)
			}
		},
	},
}
</script>

<style scoped>
.cn-transition-input-fields {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-transition-input-fields--columns {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	align-items: start;
}

.cn-transition-input-fields--columns .cn-transition-input-fields__wide {
	grid-column: 1 / -1;
}

.cn-transition-input__field,
.cn-transition-input-fields__preview {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-transition-input__label {
	display: block;
	margin-bottom: 4px;
}

.cn-transition-input-fields__label {
	font-size: 14px;
	font-weight: 600;
}

.cn-transition-input-fields__muted {
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-transition-input__field-error {
	margin: 4px 0 0;
	font-size: 0.9em;
	color: var(--color-error-text, var(--color-error));
}

.cn-transition-input__field--refused {
	border-inline-start: 2px solid var(--color-error);
	padding-inline-start: 8px;
}

.cn-transition-input__object {
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	padding: 8px 12px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-transition-input-fields__card {
	display: flex;
	align-items: center;
	gap: 14px;
	padding: 14px 16px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 8px);
}

.cn-transition-input-fields__card-icon {
	color: var(--color-primary-element);
}

.cn-transition-input-fields__card-text {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.cn-transition-input-fields__badge {
	padding: 3px 10px;
	border-radius: 12px;
	background: var(--color-success-light, var(--color-background-dark));
	color: var(--color-success-text);
	font-size: 13px;
	font-weight: 600;
}

.cn-transition-input-fields__section-title {
	margin: 0 0 8px;
	font-size: 14px;
	font-weight: 600;
}

.cn-transition-input-fields__facts {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 0 24px;
	margin: 0;
}

.cn-transition-input-fields__facts > div {
	padding: 10px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-transition-input-fields__facts dt,
.cn-transition-input-fields__facts dd {
	display: block;
	width: auto;
	padding: 0;
	text-align: start;
	white-space: normal;
}

.cn-transition-input-fields__facts dt {
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-transition-input-fields__facts dd {
	margin: 2px 0 0;
	font-size: 15px;
	font-weight: 600;
}

.cn-transition-input-fields__notice {
	display: flex;
	gap: 12px;
	align-items: flex-start;
	padding: 14px 16px;
	border-radius: var(--border-radius-large, 8px);
	background: var(--color-primary-element-light);
	color: var(--color-main-text);
}

.cn-transition-input-fields__notice--warning {
	background: var(--color-warning-element-light, var(--color-background-dark));
}

.cn-transition-input-fields__notice--error {
	background: var(--color-error-element-light, var(--color-background-dark));
}

.cn-transition-input-fields__notice-icon {
	flex: none;
	color: var(--color-primary-element-light-text, var(--color-primary-element));
}

.cn-transition-input-fields__notice-text {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-transition-input-fields__notice-text strong {
	color: var(--color-primary-element-light-text, var(--color-main-text));
}
</style>
