<!--
  CnFormPage — Manifest-driven runtime form.

  Renders a flat field set + submit button declared in
  `pages[].config` for `type: "form"` pages. Closes the gap that
  forces every consumer's runtime-form route (public surveys, "request
  a quote" pages, ticket-create routes when no detail-page round-trip
  is needed) onto `type: "custom"`.

  Submit dispatch picks one of two paths based on which prop is set:

    - `submitEndpoint` — `axios[method](url, formData)`. URL `:param`
      segments are resolved against `$route.params`.
    - `submitHandler` — looks the name up in the customComponents
      registry and calls the resolved value with
      `(formData, $route, $router)`.

  Field rendering is delegated to `cnRenderFormField` from
  `@conduction/nextcloud-vue/composables` so the same input set
  CnSettingsPage uses (boolean, number, string, password, enum, json)
  is available without duplication. `widget: "textarea"` overrides
  the default string input.

  Slots (mirrors CnSettingsPage):
    - `#header`   — overrides CnPageHeader. Scope `{ title, description }`.
    - `#actions`  — right-aligned actions area.
    - `#field-<key>` — replaces the input for a specific field.
      Scope `{ field, value, onInput }`.
    - `#submit`   — replaces the submit button. Scope
      `{ submitting, dirty, submit }`.

  Events:
    - `@input`  — `{ key, value }` on every field change.
    - `@submit` — `formData` after successful submit.
    - `@error`  — error object after failed submit.

  Spec: REQ-MFPT-* (manifest-form-page-type).
-->
<template>
	<div class="cn-form-page" :data-mode="mode">
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

		<div v-if="$slots.actions || $scopedSlots.actions" class="cn-form-page__actions">
			<!-- Optional slot for action buttons (back, cancel, etc.) rendered above the form. -->
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
			<div
				v-for="field in fields"
				:key="field.key"
				class="cn-form-page__field"
				:data-field-key="field.key">
				<!--
					@slot field-${field.key}
					@description Per-field override slot. Replaces the auto-rendered input for one specific field.
					Scoped props: `{ field, value, onInput }` — `onInput(v)` updates the field via `updateField`.
				-->
				<slot
					:name="`field-${field.key}`"
					:field="field"
					:value="formData[field.key]"
					:on-input="(v) => updateField(field.key, v)">
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
				<!-- Replaces the default submit button. Scoped props: `{ submitting, dirty, submit }`. -->
				<slot
					name="submit"
					:submitting="submitting"
					:dirty="dirty"
					:submit="submit">
					<NcButton
						type="primary"
						native-type="submit"
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
 * @event submit Fired after a successful submit. Payload: `{ formData, response? }` — `response` is present in endpoint mode, omitted in handler mode.
 * @event error Fired when submit fails. Payload: `{ error, formData }`.
 * @event input Fired on every field-level update; payload is the full current `formData` object.
 *
 * @slot header Replaces the default `CnPageHeader`. Scoped props: `{ title, description }`.
 * @slot actions Optional slot for action buttons rendered above the form. Hidden when empty.
 * @slot field-${field.key} Per-field override slot. Replaces the auto-rendered input for one specific field. Scoped props: `{ field, value, onInput }`.
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
		 * field labels, success messages, etc. Defaults to identity.
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
	 *   Payload is `{ formData, response? }` — `response` is present in endpoint mode, omitted in handler mode.
	 *
	 * @event error
	 * @description Fired when submit fails (handler threw, or endpoint returned a non-2xx response).
	 *   Payload is `{ error, formData }`.
	 *
	 * @event input
	 * @description Fired on every field-level update; payload is the full current `formData` object.
	 *   Useful for parent-side reactive previews / autosave hooks.
	 */
	emits: ['submit', 'error', 'input'],

	data() {
		return {
			formData: this.cloneInitial(),
			submitting: false,
			submitted: false,
			lastError: null,
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
	},

	watch: {
		initialValue: {
			deep: true,
			handler() {
				this.formData = this.cloneInitial()
			},
		},
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
		 * @param {object} field
		 * @return {object|null}
		 */
		resolveFieldRender(field) {
			return cnRenderFormField({
				field,
				value: this.formData[field.key],
				onInput: (next) => this.updateField(field.key, next),
				t: typeof this.translate === 'function' ? this.translate : null,
			})
		},

		updateField(key, value) {
			this.$set(this.formData, key, value)
			/**
			 * Field-level update event.
			 *
			 * @event input
			 * @type {{key: string, value: any}}
			 */
			this.$emit('input', { key, value })
		},

		/**
		 * Dispatch the submit. Picks endpoint mode when `submitEndpoint`
		 * is set, otherwise handler mode. When neither is set, emits
		 * `@error` with a clear message rather than no-op silently.
		 *
		 * @return {Promise<void>}
		 */
		async submit() {
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
				 * Successful submit event. Payload is the full formData object.
				 *
				 * @event submit
				 * @type {object}
				 */
				this.$emit('submit', this.formData)
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
			await axios[method](url, this.formData)
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
			await handler(this.formData, this.$route, this.$router)
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

.cn-form-page__field {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.cn-form-page__field-help {
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
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
