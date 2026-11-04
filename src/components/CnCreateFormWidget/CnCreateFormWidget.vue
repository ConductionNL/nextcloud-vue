<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<CnFormWidgetBase
		v-bind="rootAttrs"
		blockClass="cn-create-form-widget"
		:fields="formFields"
		:model="form"
		:canSubmit="canSubmit"
		:submitting="saving"
		:submitLabel="submitLabel"
		:submittingLabel="savingLabel"
		:errorMessage="errorMessage"
		@update:field="onFieldUpdate"
		@submit="onSubmit">
		<template v-for="field in slotFields" #[`field-${field.key}`] :key="field.key">
			<CnResourceSelect
				v-if="field.type === 'reference'"
				:register="field.register || register"
				:schema="field.schema"
				:labelField="field.labelField || 'name'"
				:modelValue="form[field.key]"
				:inputLabel="field.label"
				:preload="true"
				:clearable="false"
				:allowCreate="false"
				@update:modelValue="(id) => onFieldUpdate({ key: field.key, value: id || '' })" />
			<NcTextField
				v-else-if="field.type === 'date' || field.type === 'number'"
				:modelValue="form[field.key]"
				:type="field.type"
				:label="field.label"
				:step="field.type === 'number' ? (field.step || 'any') : undefined"
				:min="field.min"
				:max="field.max"
				:data-testid="`cn-create-form-input-${field.key}`"
				@update:modelValue="(v) => onFieldUpdate({ key: field.key, value: v })" />
			<NcCheckboxRadioSwitch
				v-else-if="field.type === 'checkbox'"
				:modelValue="form[field.key] === true"
				:data-testid="`cn-create-form-checkbox-${field.key}`"
				@update:modelValue="(v) => onFieldUpdate({ key: field.key, value: v })">
				{{ field.label }}
			</NcCheckboxRadioSwitch>
			<a
				v-if="linkHref(field)"
				class="cn-create-form-widget__link"
				:href="linkHref(field)"
				target="_blank"
				rel="noopener noreferrer"
				:data-testid="`cn-create-form-link-${field.key}`">
				{{ field.linkLabel }}
			</a>
		</template>

		<template #actions>
			<span v-if="timerConfig && timerStartedAt !== null"
				class="cn-create-form-widget__elapsed"
				role="timer"
				data-testid="cn-create-form-elapsed">{{ elapsedText }}</span>
			<NcButton
				v-if="timerConfig"
				data-testid="cn-create-form-timer"
				@click="toggleTimer">
				{{ timerStartedAt === null ? timerStartLabel : timerStopLabel }}
			</NcButton>
			<NcButton
				variant="primary"
				:wide="content.wideSubmit !== false"
				:disabled="saving || !canSubmit"
				data-testid="cn-create-form-submit"
				@click="onSubmit">
				<template v-if="content.submitIcon" #icon>
					<CnIcon :name="content.submitIcon" :size="20" />
				</template>
				{{ saving ? savingLabel : submitLabel }}
			</NcButton>
		</template>
	</CnFormWidgetBase>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcCheckboxRadioSwitch, NcTextField } from '@nextcloud/vue'
import { camelize } from 'vue'
import CnFormWidgetBase from '../CnFormWidgetBase/CnFormWidgetBase.vue'
import CnIcon from '../CnIcon/CnIcon.vue'
import CnResourceSelect from '../CnResourceSelect/CnResourceSelect.vue'
import { useObjectStore } from '../../store/index.js'
import { isOptionsFrom, loadOptionsFrom } from '../../utils/optionsFrom.js'
import { resolveDeepTokens, resolveFilterValue } from '../../utils/resolveFilterTokens.js'

/**
 * CnCreateFormWidget — the `create-form` dashboard widget: a card that creates
 * one OpenRegister object from the fields its manifest declares (PqLoyaliteit
 * "Aanmelding loyaliteit").
 *
 * `content`: `{ register, schema, fields, values?, submitLabel?, submitIcon?,
 * successMessage?, wideSubmit? }`. Each field is `{ key, label, type?, required?,
 * default?, optionsFrom?, schema?, labelField?, link? }`:
 *
 * - `type`: `text` (default), `select` (options from `optionsFrom`, the shape a
 *   page filter takes), `reference` (a search over `schema`, labelled by
 *   `labelField`) or `checkbox`. A required checkbox must be ticked, any other
 *   required field filled, before the create is allowed.
 * - `default` seeds the field and may be a `@workspace.<key>` token, so a page
 *   filter preselects it.
 * - `link` (`{ label, from: { field, path } }`, on a checkbox or reference
 *   field) draws a link under it to the value at `path` of the option chosen in
 *   the select `field`, such as a programme's terms (`optionsFrom.keepFields`
 *   keeps that value on the option).
 *
 * `values` are written with every create, after token resolution (`@now`,
 * `@workspace.<key>`). After a create the fields return to their defaults.
 *
 * @spec openspec/changes/create-form-widget/specs/create-form-widget/spec.md#requirement-a-dashboard-card-can-create-an-object-from-declared-fields
 */
export default {
	name: 'CnCreateFormWidget',

	components: { CnFormWidgetBase, CnIcon, CnResourceSelect, NcButton, NcCheckboxRadioSwitch, NcTextField },

	inject: {
		/** Page-level workspace context from CnDashboardPage, for `@workspace.<key>` defaults. */
		cnWorkspaceContext: { default: null },
		/** The host app's translate function. */
		cnTranslate: { default: () => (key) => key },
	},

	// A dashboard binds the widget's `content` keys as attributes too; they must
	// not reach CnFormWidgetBase's own props.
	inheritAttrs: false,

	props: {
		/**
		 * The widget config, see the component description.
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** The record of a detail page, for `@objectId` in `values`. */
		objectId: {
			type: [String, Number],
			default: null,
		},

		/** The record of a detail page, for `@object.<field>` in `values`. */
		objectData: {
			type: Object,
			default: null,
		},
	},

	emits: ['saved'],

	data() {
		return {
			form: {},
			optionsByField: {},
			saving: false,
			errorMessage: '',
			timerStartedAt: null,
			timerNow: 0,
		}
	},

	computed: {
		rootAttrs() {
			const own = new Set(Object.keys(CnFormWidgetBase.props || {}))
			return Object.fromEntries(Object.entries(this.$attrs).filter(([key]) => !own.has(camelize(key))))
		},

		register() {
			return this.content.register || ''
		},

		schema() {
			return this.content.schema || ''
		},

		fields() {
			return (Array.isArray(this.content.fields) ? this.content.fields : [])
				.filter((field) => field && typeof field.key === 'string' && field.key !== '')
				.map((field) => ({
					...field,
					type: field.type || 'text',
					label: this.copy(field.label || ''),
					linkLabel: this.copy(field.link?.label || ''),
				}))
		},

		/** The descriptors CnFormWidgetBase draws; reference and checkbox fields come from slots. */
		formFields() {
			return this.fields.map((field) => (field.type === 'select'
				? { key: field.key, type: 'select', label: field.label, options: this.selectOptions(field) }
				: { key: field.key, type: field.type === 'text' ? 'text' : 'custom', label: field.type === 'checkbox' ? '' : field.label }))
		},

		/** The fields drawn through a `field-<key>` slot. */
		slotFields() {
			return this.fields.filter((field) => ['reference', 'checkbox', 'date', 'number'].includes(field.type))
		},

		workspace() {
			const c = this.cnWorkspaceContext
			const bag = c && typeof c === 'object' && 'value' in c ? c.value : c
			return bag && typeof bag === 'object' ? bag : {}
		},

		/** The defaults, `@workspace.<key>` resolved; recomputed when a page filter changes. */
		defaults() {
			const out = {}
			for (const field of this.fields) {
				const raw = field.default !== undefined ? field.default : (field.type === 'checkbox' ? false : '')
				const value = resolveFilterValue(raw, { workspace: this.workspace })
				out[field.key] = typeof value === 'string' && value.startsWith('@') ? '' : value
			}
			return out
		},

		canSubmit() {
			return this.fields.every((field) => {
				if (field.required !== true) {
					return true
				}
				const value = this.form[field.key]
				return field.type === 'checkbox' ? value === true : value !== undefined && value !== null && value !== ''
			})
		},

		submitLabel() {
			return this.copy(this.content.submitLabel) || t('nextcloud-vue', 'Create')
		},

		savingLabel() {
			return t('nextcloud-vue', 'Creating…')
		},

		/** `content.timer` when it names a field of this form, else null. */
		timerConfig() {
			const timer = this.content.timer
			return timer && this.fields.some((field) => field.key === timer.field) ? timer : null
		},

		timerStartLabel() {
			return this.copy(this.timerConfig?.startLabel) || t('nextcloud-vue', 'Start timer')
		},

		timerStopLabel() {
			return this.copy(this.timerConfig?.stopLabel) || t('nextcloud-vue', 'Stop timer')
		},

		/** The running timer as h:mm:ss. */
		elapsedText() {
			const seconds = Math.max(0, Math.floor((this.timerNow - this.timerStartedAt) / 1000))
			const minutes = String(Math.floor(seconds / 60) % 60).padStart(2, '0')
			return `${Math.floor(seconds / 3600)}:${minutes}:${String(seconds % 60).padStart(2, '0')}`
		},

		typeSlug() {
			return `${this.register}-${this.schema}`
		},
	},

	watch: {
		defaults: {
			immediate: true,
			handler(next, previous) {
				for (const [key, value] of Object.entries(next)) {
					// A default that moved (the page filter changed) follows into
					// a field the reader left at the previous default.
					if (this.form[key] === undefined || (previous && this.form[key] === previous[key])) {
						this.form = { ...this.form, [key]: value }
					}
				}
			},
		},
	},

	mounted() {
		this.loadOptions()
	},

	beforeUnmount() {
		clearInterval(this.timerInterval)
	},

	methods: {
		/**
		 * Start the timer, or stop it and write the time into its field: hours
		 * with two decimals, minutes with `unit: "minutes"`, never less than the
		 * smallest step so a short run does not read as nothing.
		 *
		 * @spec openspec/changes/create-form-date-number-timer/specs/create-form-date-number-timer/spec.md#requirement-a-timer-fills-a-field
		 * @return {void}
		 */
		toggleTimer() {
			if (this.timerStartedAt === null) {
				this.timerStartedAt = Date.now()
				this.timerNow = this.timerStartedAt
				this.timerInterval = setInterval(() => {
					this.timerNow = Date.now()
				}, 1000)
				return
			}
			clearInterval(this.timerInterval)
			const milliseconds = Date.now() - this.timerStartedAt
			this.timerStartedAt = null
			const value = this.timerConfig.unit === 'minutes'
				? Math.max(1, Math.round(milliseconds / 60000))
				: Math.max(0.01, Math.round(milliseconds / 36000) / 100)
			this.onFieldUpdate({ key: this.timerConfig.field, value: String(value) })
		},

		/**
		 * A manifest string through the host's translate, else the library's.
		 *
		 * @param {string} key The string.
		 * @return {string}
		 */
		copy(key) {
			if (typeof key !== 'string' || key === '') {
				return key
			}
			const host = typeof this.cnTranslate === 'function' ? this.cnTranslate(key) : key
			return typeof host === 'string' && host !== '' ? host : key
		},

		/**
		 * @param {object} field A select field.
		 * @return {Array<{value: (string|number), label: string}>}
		 */
		selectOptions(field) {
			return (this.optionsByField[field.key] || []).map((o) => ({ value: o.id, label: o.label }))
		},

		/**
		 * The href of a field's link: the value at `link.from.path` of the option
		 * chosen in the select `link.from.field`.
		 *
		 * @param {object} field The field.
		 * @return {string} The href, or '' when there is none.
		 */
		linkHref(field) {
			const from = field.link?.from
			if (!from || !from.field || !from.path) {
				return ''
			}
			const chosen = (this.optionsByField[from.field] || []).find((o) => String(o.id) === String(this.form[from.field]))
			const href = chosen?.data?.[from.path]
			return typeof href === 'string' && /^https?:\/\//i.test(href) ? href : ''
		},

		async loadOptions() {
			const ctx = { workspace: this.workspace }
			await Promise.all(this.fields
				.filter((field) => field.type === 'select' && isOptionsFrom(field.optionsFrom))
				.map(async (field) => {
					let options
					try {
						options = await loadOptionsFrom(field.optionsFrom, ctx)
					} catch {
						options = []
					}
					this.optionsByField = { ...this.optionsByField, [field.key]: options }
					if ((this.form[field.key] === '' || this.form[field.key] === undefined) && options.length > 0) {
						this.form = { ...this.form, [field.key]: options[0].id }
					}
				}))
		},

		onFieldUpdate({ key, value }) {
			this.form = { ...this.form, [key]: value }
			this.errorMessage = ''
		},

		/**
		 * Create the object from the fields and the declared `values`.
		 *
		 * @return {Promise<void>}
		 */
		async onSubmit() {
			if (!this.canSubmit || this.saving) {
				return
			}
			const store = (() => {
				try {
					return useObjectStore()
				} catch {
					return null
				}
			})()
			if (!store || !this.register || !this.schema) {
				this.errorMessage = this.copy(this.content.errorMessage) || t('nextcloud-vue', 'Could not create the item')
				return
			}
			this.saving = true
			this.errorMessage = ''
			try {
				const values = resolveDeepTokens(this.content.values || {}, { workspace: this.workspace, objectId: this.objectId, object: this.objectData })
				const payload = { ...values }
				for (const field of this.fields) {
					const value = this.form[field.key]
					payload[field.key] = field.type === 'number' && value !== '' && value !== null && value !== undefined ? Number(value) : value
				}
				if (typeof store.registerObjectType === 'function' && !store.objectTypeRegistry?.[this.typeSlug]) {
					store.registerObjectType(this.typeSlug, this.schema, this.register)
				}
				const result = await store.saveObject(this.typeSlug, payload)
				if (!result) {
					this.errorMessage = this.copy(this.content.errorMessage) || t('nextcloud-vue', 'Could not create the item')
					return
				}
				this.form = { ...this.form, ...this.defaults }
				/**
				 * @event saved The object was created. Payload: what the store answered.
				 */
				this.$emit('saved', result)
			} catch {
				this.errorMessage = this.copy(this.content.errorMessage) || t('nextcloud-vue', 'Could not create the item')
			} finally {
				this.saving = false
			}
		},
	},
}
</script>

<style scoped>
.cn-create-form-widget__link {
	display: inline-block;
	margin-top: 8px;
	color: var(--color-primary-element);
	font-weight: 600;
	text-decoration: underline;
}

.cn-create-form-widget__elapsed {
	align-self: center;
	font-variant-numeric: tabular-nums;
}
</style>
