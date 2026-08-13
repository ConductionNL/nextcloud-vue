<!--
  CnFormPage — Manifest-driven runtime form.

  Renders a flat field set + submit button declared in
  `pages[].config` for `type: "form"` pages. Closes the gap that
  forces every consumer's runtime-form route (public surveys, "request
  a quote" pages, ticket-create routes when no detail-page round-trip
  is needed) onto `type: "custom"`.

  manifest-form-logic adds three declarative capabilities on top of the
  flat field set (all additive — a manifest with no `steps` and no
  `field.visibleWhen` / `field.validation` renders byte-for-byte as
  before):

    - `steps` prop: ordered `{ id, title, description?, fields[] }`
      wizard groups (`fields[]` are KEY REFERENCES into the `fields`
      prop). An accessible step indicator + Back/Next/Submit footer
      renders when `steps` is non-empty; a step whose fields are ALL
      hidden by conditions is skipped in both navigation directions.
    - `field.visibleWhen`: the shared manifest visibility predicate.
      LOCAL-mode conditions (no `endpoint`/`source`) are evaluated
      SYNCHRONOUSLY against the live `formData`, in field declaration
      order (a hidden field reads as `undefined` for every later
      field's condition — cascading hides). `endpoint`/`source`
      conditions are resolved ONCE at mount (fail-safe: hidden on
      error) and never re-evaluated on keystrokes.
    - `field.validation`: `{ required, min, max, pattern, message }`,
      enforced via `validateFieldValue()` before Next/Submit advances.
      Errors render through `NcInputField`-family `error`/`helperText`
      props (via `cnRenderFormField`) or an adjacent `role="alert"`
      element for widgets without native error props.

    DECISION (spec-fixed): a field hidden by its `visibleWhen` is
    EXCLUDED from validation AND from the dispatched payload — the
    payload always equals what the user saw and confirmed — but its
    draft value is RETAINED in component state, so toggling the
    condition back restores it.

  Submit dispatch picks one of two paths based on which prop is set:

    - `submitEndpoint` — `axios[method](url, effectivePayload)`. URL
      `:param` segments are resolved against `$route.params`.
    - `submitHandler` — looks the name up in the customComponents
      registry and calls the resolved value with
      `(effectivePayload, $route, $router)`.

  Field rendering is delegated to `cnRenderFormField` from
  `@conduction/nextcloud-vue/composables` so the same input set
  CnSettingsPage uses (boolean, number, string, password, enum, json)
  is available without duplication. `widget: "textarea"` overrides
  the default string input.

  Slots (mirrors CnSettingsPage):
    - `#header`   — overrides CnPageHeader. Scope `{ title, description }`.
    - `#actions`  — right-aligned actions area.
    - `#field-<key>` — replaces the input for a specific field.
      Scope `{ field, value, onInput, error }`.
    - `#submit`   — replaces the submit button. Scope
      `{ submitting, dirty, submit }`.

  Events:
    - `@input`  — `{ key, value }` on every field change.
    - `@step`   — `{ from, to }` on step navigation.
    - `@submit` — the effective payload (visible fields only) after
      successful submit.
    - `@error`  — error object after failed submit.

  Spec: REQ-MFPT-* (manifest-form-page-type), REQ-MFL-* (manifest-form-logic).
-->
<template>
	<div class="cn-form-page" :data-mode="mode" data-testid="cn-form-page">
		<!--
			@slot header
			@description Replaces the default `CnPageHeader`. Receives `{ title, description }` as scoped props
			so a custom header can mirror the manifest-supplied labels.
		-->
		<slot
			name="header"
			:title="title"
			:description="description">
			<CnPageHeader
				v-if="title"
				:title="title"
				:description="description" />
		</slot>

		<div v-if="$slots.actions || $slots.actions" class="cn-form-page__actions">
			<!-- @slot actions Action buttons (back, cancel, …) rendered above the form. -->
			<slot name="actions" />
		</div>

		<!-- Success banner -->
		<div v-if="submitted" class="cn-form-page__success">
			{{ resolveLabel(successMessage) }}
		</div>

		<!-- Form body -->
		<form
			v-if="!submitted || mode !== 'public'"
			class="cn-form-page__form"
			@submit.prevent="submit">
			<!-- Step indicator — only rendered when `steps` is non-empty. -->
			<nav
				v-if="hasSteps"
				:aria-label="t('nextcloud-vue', 'Form steps')"
				class="cn-form-page__steps-nav">
				<ol class="cn-form-page__steps">
					<li
						v-for="(step, index) in steps"
						:key="step.id"
						class="cn-form-page__step"
						:class="{
							'cn-form-page__step--current': index === currentStepIndex,
							'cn-form-page__step--done': index < currentStepIndex,
						}"
						:aria-current="index === currentStepIndex ? 'step' : null">
						<span v-if="index < currentStepIndex" class="cn-form-page__step-check" aria-hidden="true">✓</span>
						{{ resolveLabel(step.title) }}
					</li>
				</ol>
			</nav>

			<p v-if="hasSteps && currentStepDescription" class="cn-form-page__step-description">
				{{ resolveLabel(currentStepDescription) }}
			</p>

			<div
				v-for="field in visibleCurrentStepFields"
				:key="field.key"
				:ref="`field-${field.key}`"
				class="cn-form-page__field"
				:data-field-key="field.key"
				:aria-describedby="fieldErrors[field.key] && !fieldHasNativeErrorSupport(field) ? `cn-form-page__field-error-${field.key}` : null">
				<!--
					@slot field-${field.key}
					@description Per-field override slot. Replaces the auto-rendered input for one specific field.
					Scoped props: `{ field, value, onInput, error }` — `onInput(v)` updates the field via `updateField`.
				-->
				<slot
					:name="`field-${field.key}`"
					:field="field"
					:value="formData[field.key]"
					:on-input="(v) => updateField(field.key, v)"
					:error="fieldErrors[field.key] || null">
					<component
						:is="resolveFieldRender(field).tag"
						v-if="resolveFieldRender(field)"
						v-bind="resolveFieldRender(field).props"
						v-on="resolveFieldRender(field).listeners">
						<!-- NcCheckboxRadioSwitch puts its label in the slot -->
						<template
							v-if="resolveFieldRender(field).kind === 'boolean'">
							{{ resolveFieldRender(field).labelText }}
						</template>
					</component>
				</slot>
				<p
					v-if="fieldErrors[field.key] && !fieldHasNativeErrorSupport(field)"
					:id="`cn-form-page__field-error-${field.key}`"
					class="cn-form-page__field-error"
					role="alert">
					{{ fieldErrors[field.key] }}
				</p>
				<small
					v-if="field.help"
					class="cn-form-page__field-help">
					{{ resolveLabel(field.help) }}
				</small>
			</div>

			<!-- Error -->
			<p v-if="lastError" class="cn-form-page__error">
				{{ lastError }}
			</p>

			<div class="cn-form-page__submit">
				<NcButton
					v-if="hasSteps && !isFirstStep"
					variant="secondary"
					type="button"
					@click="back">
					{{ t('nextcloud-vue', 'Back') }}
				</NcButton>
				<NcButton
					v-if="hasSteps && !isLastStep"
					variant="primary"
					type="button"
					@click="next">
					{{ t('nextcloud-vue', 'Next') }}
				</NcButton>
				<!-- @slot submit Replaces the default submit button. -->
				<!-- @binding {boolean} submitting Whether a submit is in flight. -->
				<!-- @binding {boolean} dirty Whether the form has unsaved changes. -->
				<!-- @binding {Function} submit Call to submit the form programmatically. -->
				<slot
					v-if="!hasSteps || isLastStep"
					name="submit"
					:submitting="submitting"
					:dirty="dirty"
					:submit="submit">
					<!--
						`type`, not `native-type` — @nextcloud/vue 9's NcButton declares
						its native HTML button-type prop as `type` (`ButtonType = 'submit'
						| 'reset' | 'button'`, default `'button'`) and has no `nativeType`
						prop at all. `native-type` therefore fell through as an inert
						attribute and every button silently rendered as the component's
						default `type="button"` — including THIS one. A `type="button"`
						button inside a `<form>` does NOT fire the form's native `submit`
						event on click, so `<form @submit.prevent="submit">` above never
						ran: clicking "Submit" did nothing, silently, in a real browser.
						Jest's own local NcButton stub (`tests/components/CnFormPage.spec.js`)
						never bound `:type` either, so its plain `<button>` defaulted to
						the OPPOSITE — the HTML spec's implicit `type="submit"` for a
						type-less button in a form — which is why every jest submit test
						passed while the real component was broken.
					-->
					<NcButton
						variant="primary"
						type="submit"
						:disabled="submitting">
						<template #icon>
							<NcLoadingIcon v-if="submitting" :size="20" />
							<Send v-else :size="20" />
						</template>
						{{ resolveLabel(submitLabel) }}
					</NcButton>
				</slot>
			</div>
		</form>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import axios from '@nextcloud/axios'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import Send from 'vue-material-design-icons/Send.vue'
import { CnPageHeader } from '../CnPageHeader/index.js'
import { cnRenderFormField } from '../../composables/cnFormFieldRenderer.js'
import { evaluateVisibleWhen, evaluateVisibleWhenLocal } from '../../utils/visibleWhen.js'
import { validateFieldValue } from '../../utils/formValidation.js'

const ALLOWED_METHODS = ['POST', 'PUT', 'PATCH']

/**
 * Resolve `:param` segments in a URL string against `$route.params`.
 * Mirrors the `:id` substitution Vue Router performs on its own
 * routes; reused here because the manifest declares the URL as a
 * static string and we want the runtime to fill the slot.
 *
 * @param {string} url URL template, e.g. `/api/survey/:token`.
 * @param {object} params $route.params.
 * @return {string}
 */
function resolveParams(url, params) {
	if (!url || !params) return url
	return String(url).replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (match, name) => {
		const value = params[name]
		return value === undefined || value === null ? match : encodeURIComponent(String(value))
	})
}

/**
 * @event submit Fired after a successful submit. Payload: the effective payload (visible fields only; hidden-by-condition field keys excluded).
 * @event error Fired when submit fails. Payload: the thrown error / rejected reason.
 * @event input Fired on every field-level update; payload is `{ key, value }`.
 * @event step Fired on step navigation (Next/Back); payload is `{ from, to }` (step indices).
 *
 * @slot header Replaces the default `CnPageHeader`. Scoped props: `{ title, description }`.
 * @slot actions Optional slot for action buttons rendered above the form. Hidden when empty.
 * @slot field-${field.key} Per-field override slot. Replaces the auto-rendered input for one specific field. Scoped props: `{ field, value, onInput, error }`.
 * @slot submit Replaces the default submit button. Scoped props: `{ submitting, dirty, submit }`.
 */
export default {
	name: 'CnFormPage',

	components: {
		CnPageHeader,
		NcButton,
		NcLoadingIcon,
		Send,
	},

	inject: {
		/**
		 * Custom-component registry from CnAppRoot. Used to resolve the
		 * `submitHandler` name to a concrete function. Defaults to an
		 * empty object when the page is mounted standalone.
		 *
		 * @type {object}
		 */
		cnCustomComponents: { default: () => ({}) },
	},

	props: {
		/** Form fields. Each MUST conform to the `formField` $def. */
		fields: {
			type: Array,
			default: () => [],
		},
		/**
		 * Multi-step wizard groups: `Array<{id, title, description?,
		 * fields: string[]}>`. `fields[]` entries are KEY REFERENCES into
		 * the `fields` prop (single source of truth — no field
		 * duplication). Empty (the default) renders today's single-step
		 * form unchanged: no step indicator, no Next/Back.
		 */
		steps: {
			type: Array,
			default: () => [],
		},
		/**
		 * Registered submit handler name. Resolves against the
		 * `cnCustomComponents` registry (or `customComponents` prop).
		 * Mutually exclusive with `submitEndpoint` at the validator
		 * level; the component itself prefers `submitEndpoint` when both
		 * are set so a stale manifest doesn't crash.
		 */
		submitHandler: {
			type: String,
			default: '',
		},
		/**
		 * URL the form data is dispatched to. `:paramName` segments are
		 * resolved against `$route.params` at submit time.
		 */
		submitEndpoint: {
			type: String,
			default: '',
		},
		/** HTTP method for endpoint mode. POST | PUT | PATCH. */
		submitMethod: {
			type: String,
			default: 'POST',
			validator: (v) => typeof v === 'string' && ALLOWED_METHODS.includes(v.toUpperCase()),
		},
		/**
		 * Form mode. `public` shows the success banner and hides the
		 * form on submit; `edit` and `create` keep the form mounted so
		 * the consumer can route away.
		 */
		mode: {
			type: String,
			default: 'public',
			validator: (v) => ['edit', 'create', 'public'].includes(v),
		},
		/** i18n key for the submit button label. */
		submitLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Submit'),
		},
		/** i18n key for the success banner. */
		successMessage: {
			type: String,
			default: () => t('nextcloud-vue', 'Thank you!'),
		},
		/** Pre-filled form state. Consumed by `mode: "edit"`. */
		initialValue: {
			type: Object,
			default: () => ({}),
		},
		/** Page title. Forwarded to CnPageHeader. */
		title: {
			type: String,
			default: '',
		},
		/** Page description. Forwarded to CnPageHeader. */
		description: {
			type: String,
			default: '',
		},
		/**
		 * Optional translation function. When provided, applied to
		 * field labels, success messages, `validation.message`, etc.
		 * Defaults to identity.
		 *
		 * @type {Function|null}
		 */
		translate: {
			type: Function,
			default: null,
		},
		/**
		 * Optional explicit custom-component registry. When set, takes
		 * precedence over the injected `cnCustomComponents`. Mirrors
		 * the resolution order in CnPageRenderer / CnSettingsPage.
		 *
		 * @type {object|null}
		 */
		customComponents: {
			type: Object,
			default: null,
		},
	},

	/**
	 * Events:
	 * @event submit
	 * @description Fired after a successful submit (handler returned, or endpoint POST/PUT/PATCH succeeded).
	 *   Payload is the effective payload — `formData` with hidden-by-condition field keys removed.
	 *
	 * @event error
	 * @description Fired when submit fails (handler threw, or endpoint returned a non-2xx response).
	 *   Payload is the thrown error / rejected reason.
	 *
	 * @event input
	 * @description Fired on every field-level update; payload is `{ key, value }`.
	 *
	 * @event step
	 * @description Fired on Next/Back step navigation; payload is `{ from, to }` (step indices).
	 */
	emits: ['submit', 'error', 'input', 'step'],

	data() {
		return {
			formData: this.cloneInitial(),
			submitting: false,
			submitted: false,
			lastError: null,
			/** Current wizard step index (unused when `steps` is empty). */
			currentStepIndex: 0,
			/** Per-field validation error messages, keyed by field.key. */
			fieldErrors: {},
			/**
			 * Cache of resolved `endpoint`/`source` visibleWhen outcomes,
			 * keyed by field.key. Resolved ONCE in `mounted()` — see the
			 * module docblock. `undefined` (not yet resolved) reads as
			 * hidden, mirroring CnBannerWidget's fail-safe/pending posture.
			 */
			remoteVisibility: {},
		}
	},

	computed: {
		/** Whether any field has changed since mount. */
		dirty() {
			return JSON.stringify(this.formData) !== JSON.stringify(this.cloneInitial())
		},
		/**
		 * Effective custom-component registry. Explicit prop wins over
		 * the injected value (mirrors CnPageRenderer's resolution).
		 *
		 * @return {object}
		 */
		effectiveCustomComponents() {
			return this.customComponents ?? this.cnCustomComponents ?? {}
		},
		/** Whether `steps` declares at least one entry. */
		hasSteps() {
			return Array.isArray(this.steps) && this.steps.length > 0
		},
		/** `config.fields[].key` → field object lookup. */
		fieldsByKey() {
			const map = {}
			this.fields.forEach((f) => {
				if (f && typeof f.key === 'string') map[f.key] = f
			})
			return map
		},
		/**
		 * Single-pass, declaration-order visibility cascade over `fields`
		 * (REQ-MFL-9). LOCAL-mode conditions evaluate synchronously
		 * against the effective (visibility-filtered) data built up as we
		 * go — a hidden field reads as `undefined` for every LATER
		 * field's condition. `endpoint`/`source` conditions read from the
		 * `remoteVisibility` cache resolved once at mount.
		 *
		 * @return {object} `{ [fieldKey]: boolean }`
		 */
		effectiveVisibility() {
			const result = {}
			const effectiveData = {}
			this.fields.forEach((field) => {
				if (!field || typeof field.key !== 'string') return
				const cond = field.visibleWhen
				let visible = true
				if (cond && (cond.endpoint || cond.source)) {
					visible = this.remoteVisibility[field.key] === true
				} else if (cond) {
					visible = evaluateVisibleWhenLocal(cond, effectiveData)
				}
				result[field.key] = visible
				effectiveData[field.key] = visible ? this.formData[field.key] : undefined
			})
			return result
		},
		/** Fields for the current step (or the full flat list when stepless). */
		currentStepFields() {
			if (this.hasSteps) {
				return this.stepFields(this.steps[this.currentStepIndex])
			}
			return this.fields
		},
		/** `currentStepFields` filtered to those currently visible. */
		visibleCurrentStepFields() {
			return this.currentStepFields.filter((f) => f && this.isFieldVisible(f.key))
		},
		/** Current step's optional description (stepless ⇒ ''). */
		currentStepDescription() {
			if (!this.hasSteps) return ''
			const step = this.steps[this.currentStepIndex]
			return step && step.description ? step.description : ''
		},
		/** Indices of steps that are NOT fully hidden by conditions. */
		visibleStepIndices() {
			if (!this.hasSteps) return []
			return this.steps.map((_, i) => i).filter((i) => !this.isStepHidden(this.steps[i]))
		},
		/** Whether the current step is the first non-fully-hidden step. */
		isFirstStep() {
			if (!this.hasSteps) return true
			const list = this.visibleStepIndices
			return list.length === 0 || this.currentStepIndex === list[0]
		},
		/** Whether the current step is the last non-fully-hidden step. */
		isLastStep() {
			if (!this.hasSteps) return true
			const list = this.visibleStepIndices
			return list.length === 0 || this.currentStepIndex === list[list.length - 1]
		},
		/**
		 * The dispatched payload (REQ-MFL-10): `formData` with every
		 * hidden-by-condition declared field key removed. Keys not
		 * declared in `fields` (e.g. an `id` carried by `initialValue`
		 * for `mode: "edit"`) pass through untouched.
		 *
		 * @return {object}
		 */
		effectivePayload() {
			const payload = { ...this.formData }
			this.fields.forEach((field) => {
				if (field && typeof field.key === 'string' && !this.isFieldVisible(field.key)) {
					delete payload[field.key]
				}
			})
			return payload
		},
	},

	watch: {
		initialValue: {
			deep: true,
			handler() {
				this.formData = this.cloneInitial()
			},
		},
	},

	mounted() {
		this.resolveRemoteVisibility()
	},

	methods: {
		cloneInitial() {
			try {
				return JSON.parse(JSON.stringify(this.initialValue || {}))
			} catch (_e) {
				return {}
			}
		},

		resolveLabel(key) {
			if (!key) return ''
			const fn = typeof this.translate === 'function' ? this.translate : (k) => k
			return fn(key)
		},

		/**
		 * Resolve render bindings for a field by delegating to the
		 * shared `cnRenderFormField` helper. Memoised inline so the
		 * template can call it once per field per render without
		 * re-allocating bindings on unrelated re-renders.
		 *
		 * @param {object} field The formField shape to render.
		 * @return {object|null}
		 */
		resolveFieldRender(field) {
			return cnRenderFormField({
				field,
				value: this.formData[field.key],
				onInput: (next) => this.updateField(field.key, next),
				t: typeof this.translate === 'function' ? this.translate : null,
				error: this.fieldErrors[field.key] || null,
			})
		},

		/**
		 * Whether the resolved input for `field` surfaces its error via
		 * native `NcInputField`-family props (so CnFormPage should NOT
		 * also render the adjacent `role="alert"` paragraph). A
		 * `#field-<key>` slot override always reports `false` — the
		 * consumer's custom markup gets the standard fallback alert too.
		 *
		 * @param {object} field The formField shape to check.
		 * @return {boolean}
		 */
		fieldHasNativeErrorSupport(field) {
			if (this.$slots[`field-${field.key}`] || this.$slots[`field-${field.key}`]) return false
			const render = this.resolveFieldRender(field)
			if (!render) return false
			if (['string', 'number', 'password', 'fallback'].includes(render.kind)) return true
			if (render.kind === 'string-textarea') return render.tag !== 'textarea'
			return false
		},

		/**
		 * Resolve the field objects (in step order) for a given step
		 * entry, dropping any key that no longer matches a declared field.
		 *
		 * @param {{id: string, fields: string[]}} step The step entry.
		 * @return {Array<object>}
		 */
		stepFields(step) {
			if (!step || !Array.isArray(step.fields)) return []
			return step.fields.map((key) => this.fieldsByKey[key]).filter(Boolean)
		},

		/**
		 * Whether every field belonging to `step` is currently hidden by
		 * its `visibleWhen` condition (REQ-MFL-6: such a step is skipped
		 * by Next/Back in both directions).
		 *
		 * @param {object} step The step entry.
		 * @return {boolean}
		 */
		isStepHidden(step) {
			const flds = this.stepFields(step)
			return flds.length > 0 && flds.every((f) => !this.isFieldVisible(f.key))
		},

		/**
		 * Whether `key`'s field is currently visible per the
		 * `effectiveVisibility` cascade.
		 *
		 * @param {string} key The field key.
		 * @return {boolean}
		 */
		isFieldVisible(key) {
			return this.effectiveVisibility[key] !== false
		},

		/**
		 * Resolve `endpoint` / `source` visibleWhen conditions once at
		 * mount into `remoteVisibility` (fail-safe: any error hides the
		 * field). Never re-run on formData changes — see REQ-MFL-9.
		 *
		 * @return {Promise<void>}
		 */
		async resolveRemoteVisibility() {
			const remoteFields = this.fields.filter(
				(f) => f && f.visibleWhen && (f.visibleWhen.endpoint || f.visibleWhen.source),
			)
			await Promise.all(remoteFields.map(async (field) => {
				const result = await evaluateVisibleWhen(field.visibleWhen, { object: this.formData })
				this.remoteVisibility[field.key] = result
			}))
		},

		/**
		 * Validate the VISIBLE fields in `fieldsList` via
		 * `validateFieldValue`, populating / clearing `fieldErrors` as it
		 * goes. Hidden fields are skipped entirely (REQ-MFL-10) and any
		 * stale error for them is cleared.
		 *
		 * @param {Array<object>} fieldsList The fields to validate.
		 * @return {string|null} The first invalid field's key, or `null` when all pass.
		 */
		validateVisibleFields(fieldsList) {
			let firstInvalidKey = null
			fieldsList.forEach((field) => {
				if (!field || typeof field.key !== 'string') return
				if (!this.isFieldVisible(field.key)) {
					delete this.fieldErrors[field.key]
					return
				}
				const message = validateFieldValue(field, this.formData[field.key], this.resolveLabel)
				if (message) {
					this.fieldErrors[field.key] = message
					if (!firstInvalidKey) firstInvalidKey = field.key
				} else {
					delete this.fieldErrors[field.key]
				}
			})
			return firstInvalidKey
		},

		/**
		 * Move focus to the first invalid field's rendered input, after
		 * the DOM reflects the current step / error state.
		 *
		 * @param {string} key The field key whose input should receive focus.
		 */
		focusField(key) {
			this.$nextTick(() => {
				const refEntry = this.$refs[`field-${key}`]
				const node = Array.isArray(refEntry) ? refEntry[0] : refEntry
				if (!node || typeof node.querySelector !== 'function') return
				const input = node.querySelector('input, textarea, select, [tabindex]')
				if (input && typeof input.focus === 'function') input.focus()
			})
		},

		/**
		 * Advance to the next non-fully-hidden step, in EITHER direction.
		 * Returns -1 when there is none (caller treats that as a no-op).
		 *
		 * @param {number} fromIndex The step index to search from.
		 * @param {1|-1} direction `1` for Next, `-1` for Back.
		 * @return {number}
		 */
		nextVisibleStepIndex(fromIndex, direction) {
			let idx = fromIndex + direction
			while (idx >= 0 && idx < this.steps.length) {
				if (!this.isStepHidden(this.steps[idx])) return idx
				idx += direction
			}
			return -1
		},

		/**
		 * Next button handler: validates the current step's visible
		 * fields before advancing (REQ-MFL-7); a failing field blocks
		 * navigation and moves focus to it.
		 */
		next() {
			const fieldsList = this.stepFields(this.steps[this.currentStepIndex])
			const firstInvalidKey = this.validateVisibleFields(fieldsList)
			if (firstInvalidKey) {
				this.focusField(firstInvalidKey)
				return
			}
			const targetIndex = this.nextVisibleStepIndex(this.currentStepIndex, 1)
			if (targetIndex !== -1) {
				const from = this.currentStepIndex
				this.currentStepIndex = targetIndex
				/**
				 * @event step Emitted on step navigation (Next / Back).
				 * @type {{ from: number, to: number }} Step indices.
				 */
				this.$emit('step', { from, to: targetIndex })
			}
		},

		/**
		 * Back button handler: NEVER validates (users may retreat with
		 * invalid input) — REQ-MFL-7.
		 */
		back() {
			const targetIndex = this.nextVisibleStepIndex(this.currentStepIndex, -1)
			if (targetIndex !== -1) {
				const from = this.currentStepIndex
				this.currentStepIndex = targetIndex
				/**
				 * @event step Emitted on step navigation (Next / Back).
				 * @type {{ from: number, to: number }} Step indices.
				 */
				this.$emit('step', { from, to: targetIndex })
			}
		},

		updateField(key, value) {
			this.formData[key] = value
			delete this.fieldErrors[key]
			/**
			 * Field-level update event.
			 *
			 * @event input
			 * @type {{key: string, value: any}}
			 */
			this.$emit('input', { key, value })
		},

		/**
		 * Dispatch the submit. When `steps` is present and the current
		 * step is not the last (visible) one, a native form submit
		 * (e.g. pressing Enter) is redirected to `next()` instead of
		 * dispatching early. Otherwise validates ALL visible fields
		 * across ALL steps (REQ-MFL-7); on failure, jumps to the
		 * earliest step containing an invalid field. Picks endpoint mode
		 * when `submitEndpoint` is set, otherwise handler mode. When
		 * neither is set, emits `@error` with a clear message rather
		 * than no-op silently.
		 *
		 * @return {Promise<void>}
		 */
		async submit() {
			if (this.hasSteps && !this.isLastStep) {
				this.next()
				return
			}

			const allFieldsList = this.hasSteps
				? this.steps.reduce((acc, step) => acc.concat(this.stepFields(step)), [])
				: this.fields
			const firstInvalidKey = this.validateVisibleFields(allFieldsList)
			if (firstInvalidKey) {
				if (this.hasSteps) {
					const stepIndex = this.steps.findIndex(
						(step) => this.stepFields(step).some((f) => f.key === firstInvalidKey),
					)
					if (stepIndex >= 0) this.currentStepIndex = stepIndex
				}
				this.focusField(firstInvalidKey)
				return
			}

			this.lastError = null
			this.submitting = true
			try {
				if (this.submitEndpoint) {
					await this.submitViaEndpoint()
				} else if (this.submitHandler) {
					await this.submitViaHandler()
				} else {
					throw new Error('CnFormPage: no submit destination configured (set submitHandler or submitEndpoint)')
				}
				this.submitted = true
				/**
				 * Successful submit event. Payload is the effective payload
				 * (visible fields only).
				 *
				 * @event submit
				 * @type {object}
				 */
				this.$emit('submit', this.effectivePayload)
			} catch (err) {
				this.lastError = err && err.message ? err.message : String(err)
				/**
				 * Submit failure event. Payload is the thrown error / rejected reason.
				 *
				 * @event error
				 * @type {Error}
				 */
				this.$emit('error', err)
			} finally {
				this.submitting = false
			}
		},

		async submitViaEndpoint() {
			const method = (this.submitMethod || 'POST').toLowerCase()
			const url = resolveParams(this.submitEndpoint, this.$route?.params || {})
			if (typeof axios[method] !== 'function') {
				throw new Error(`CnFormPage: unsupported HTTP method "${this.submitMethod}"`)
			}
			await axios[method](url, this.effectivePayload)
		},

		async submitViaHandler() {
			const handler = this.effectiveCustomComponents[this.submitHandler]
			if (typeof handler !== 'function') {
				// eslint-disable-next-line no-console
				console.warn(
					`[CnFormPage] handler "${this.submitHandler}" not found in customComponents (or not a function). Did you register it?`,
				)
				throw new Error(`CnFormPage: handler "${this.submitHandler}" not registered`)
			}
			await handler(this.effectivePayload, this.$route, this.$router)
		},
	},
}
</script>

<style>
.cn-form-page {
	display: flex;
	flex-direction: column;
	gap: 1rem;
	padding: 1rem;
	max-width: 720px;
	margin: 0 auto;
	color: var(--color-main-text);
}

.cn-form-page__form {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.cn-form-page__steps-nav {
	width: 100%;
}

.cn-form-page__steps {
	display: flex;
	flex-wrap: wrap;
	gap: 1rem;
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-form-page__step {
	color: var(--color-text-maxcontrast);
	font-weight: normal;
}

.cn-form-page__step--current {
	color: var(--color-main-text);
	font-weight: bold;
}

.cn-form-page__step--done {
	color: var(--color-main-text);
}

.cn-form-page__step-check {
	color: var(--color-primary-element);
	margin-right: 0.25rem;
}

.cn-form-page__step-description {
	color: var(--color-text-maxcontrast);
	margin: 0;
}

.cn-form-page__field {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.cn-form-page__field-help {
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
}

.cn-form-page__field-error {
	color: var(--color-error);
	font-size: 0.85em;
	margin: 0;
}

.cn-form-page__error {
	color: var(--color-error);
	background: var(--color-error-hover, transparent);
	padding: 0.5rem 0.75rem;
	border-radius: var(--border-radius);
}

.cn-form-page__success {
	color: var(--color-success-text, var(--color-main-text));
	background: var(--color-success-hover, transparent);
	padding: 1rem;
	border-radius: var(--border-radius);
	text-align: center;
}

.cn-form-page__actions {
	display: flex;
	justify-content: flex-end;
	gap: 0.5rem;
}

.cn-form-page__submit {
	display: flex;
	justify-content: flex-start;
	gap: 0.5rem;
	margin-top: 0.5rem;
}
</style>
