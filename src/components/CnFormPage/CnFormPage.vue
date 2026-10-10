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
  is available without duplication, plus the form-only `file` type
  (CnFileField, whose value is the picked file as a `data:` URL).
  `widget: "textarea"` overrides the default string input.

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

		<!-- A draft this form was left in: offered, never applied. -->
		<NcNoteCard
			v-if="draftOffer !== null"
			type="info"
			data-testid="cn-form-page-draft-offer">
			{{ t('nextcloud-vue', 'You have unsaved changes from an earlier visit.') }}
			<div class="cn-form-page__draft-actions">
				<NcButton data-testid="cn-form-page-draft-restore" @click="restoreDraft">
					{{ t('nextcloud-vue', 'Restore') }}
				</NcButton>
				<NcButton data-testid="cn-form-page-draft-discard" @click="discardDraft">
					{{ t('nextcloud-vue', 'Discard') }}
				</NcButton>
			</div>
		</NcNoteCard>

		<!-- Form body -->
		<form
			v-if="!submitted || mode !== 'public'"
			class="cn-form-page__form"
			@submit.prevent="submit">
			<!-- Spam protection: a field no person sees or reaches. A filled one
			     means a bot; the submit then sends nothing (see `honeypot`). -->
			<div v-if="honeypot" class="cn-form-page__honeypot" aria-hidden="true">
				<label :for="`cn-form-page-hp-${honeypot}`">{{ t('nextcloud-vue', 'Leave this field empty') }}</label>
				<input
					:id="`cn-form-page-hp-${honeypot}`"
					v-model="honeypotValue"
					:name="honeypot"
					type="text"
					tabindex="-1"
					autocomplete="off"
					data-testid="cn-form-page-honeypot">
			</div>
			<!-- Paste to fill: only where it may be used (see smartPasteAvailable). -->
			<div v-if="smartPasteAvailable" class="cn-form-page__smart-paste">
				<NcButton type="button" data-testid="cn-form-page-smart-paste" @click="smartPasteOpen = true">
					{{ t('nextcloud-vue', 'Paste to fill') }}
				</NcButton>
				<NcButton
					v-if="hasSuggestions"
					type="button"
					variant="tertiary"
					data-testid="cn-form-page-accept-all"
					@click="acceptAllSuggestions">
					{{ t('nextcloud-vue', 'Accept all') }}
				</NcButton>
			</div>
			<p
				class="cn-form-page__smart-paste-notice"
				aria-live="polite"
				data-testid="cn-form-page-smart-paste-notice">
				{{ smartPasteNotice }}
			</p>

			<!-- Board look: every error of a failed submit, linked to its control. -->
			<CnFormErrorSummary
				v-if="isBoardLook && summaryItems.length > 0"
				ref="errorSummary"
				:errors="summaryItems"
				@focusField="focusField" />

			<!-- Board look: the same stepper as CnWizardDialog. -->
			<CnStepper
				v-if="hasSteps && isBoardLook"
				:steps="boardSteps"
				:currentIndex="currentStepIndex"
				look="board"
				:ariaLabel="t('nextcloud-vue', 'Form steps')" />

			<!-- Step indicator — only rendered when `steps` is non-empty. -->
			<nav
				v-if="hasSteps && !isBoardLook"
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

			<!-- A public board look form says what "optional" means. -->
			<p v-if="showsOptionalNotice"
				class="cn-form-page__optional-notice"
				data-testid="cn-form-page-optional-notice">
				{{ optionalNoticeLabel }}
			</p>

			<div
				v-for="field in visibleCurrentStepFields"
				:key="field.key"
				:ref="`field-${field.key}`"
				class="cn-form-page__field"
				:class="{
					'cn-form-field--half': isBoardLook && field.width === 'half',
					'cn-form-field--invalid': isBoardLook && !!fieldErrors[field.key],
				}"
				:data-field-key="field.key"
				:aria-describedby="fieldErrors[field.key] && !fieldHasNativeErrorSupport(field) ? `cn-form-page__field-error-${field.key}` : null">
				<CnFormField
					v-if="showsBoardHead(field)"
					:controlId="controlIdFor(field)"
					:text="resolveLabel(field.label) || field.key"
					:optional="!isFieldRequired(field)"
					:optionalLabel="optionalLabel"
					:error="fieldErrors[field.key] || ''"
					:errorId="errorIdFor(field)" />
				<!--
					@slot field-${field.key}
					@description Per-field override slot. Replaces the auto-rendered input for one specific field.
					Scoped props: `{ field, value, onInput, error }` — `onInput(v)` updates the field via `updateField`.
				-->
				<slot
					:name="`field-${field.key}`"
					:field="field"
					:value="formData[field.key]"
					:onInput="(v) => updateField(field.key, v)"
					:error="fieldErrors[field.key] || null">
					<component
						:is="resolveFieldRender(field).tag"
						v-if="resolveFieldRender(field)"
						v-cn-select-aria="selectAria(field)"
						v-bind="fieldProps(field)"
						v-on="resolveFieldRender(field).listeners">
						<!-- NcCheckboxRadioSwitch puts its label in the slot -->
						<template
							v-if="resolveFieldRender(field).kind === 'boolean'">
							{{ resolveFieldRender(field).labelText }}
						</template>
					</component>
				</slot>
				<p
					v-if="fieldErrors[field.key] && !fieldHasNativeErrorSupport(field) && !showsBoardHead(field)"
					:id="`cn-form-page__field-error-${field.key}`"
					class="cn-form-page__field-error"
					role="alert">
					{{ fieldErrors[field.key] }}
				</p>
				<span v-if="suggestions[field.key]" class="cn-form-page__suggested" data-testid="cn-form-page-suggested">
					<span class="cn-form-page__suggested-tag">{{ t('nextcloud-vue', 'Suggested') }}</span>
					<NcButton
						type="button"
						variant="tertiary"
						:aria-label="t('nextcloud-vue', 'Accept suggestion for {field}', { field: resolveLabel(field.label) || field.key })"
						@click="acceptSuggestion(field.key)">
						{{ t('nextcloud-vue', 'Accept') }}
					</NcButton>
				</span>
				<small
					v-if="field.help"
					:id="helpIdFor(field)"
					class="cn-form-page__field-help">
					{{ resolveLabel(field.help) }}
				</small>
				<small
					v-if="assignedFrom[field.key]"
					class="cn-form-page__field-assigned"
					aria-live="polite"
					data-testid="cn-form-page-assigned">
					{{ t('nextcloud-vue', 'Filled in from {field}', { field: assignedFrom[field.key] }) }}
				</small>
				<small
					v-if="calculating[field.key]"
					class="cn-form-page__field-calculating"
					role="status"
					data-testid="cn-form-page-calculating">
					{{ t('nextcloud-vue', 'Calculating') }}
				</small>
				<small
					v-if="calcErrors[field.key]"
					class="cn-form-page__field-error"
					role="alert"
					data-testid="cn-form-page-calc-error">
					{{ calcErrors[field.key] }}
				</small>
			</div>

			<!-- Error -->
			<p v-if="lastError" class="cn-form-page__error">
				{{ lastError }}
			</p>

			<!-- Conditions the host reports as unmet; with blockSubmit they hold the submit. -->
			<NcNoteCard
				v-if="unmetConditions.length > 0"
				type="warning"
				class="cn-form-page__unmet"
				data-testid="cn-form-page-unmet">
				<ul id="cn-form-page-unmet-list">
					<li v-for="(condition, index) in unmetConditions" :key="index">
						{{ condition.message }}
					</li>
				</ul>
			</NcNoteCard>

			<div class="cn-form-page__submit" :class="{ 'cn-form-page__footer': isBoardLook }">
				<!-- Board look: Cancel on the first step, at the left edge of the card. -->
				<NcButton
					v-if="isBoardLook && canCancel && (!hasSteps || isFirstStep)"
					variant="secondary"
					type="button"
					data-testid="cn-form-page-cancel"
					@click="cancel">
					{{ t('nextcloud-vue', 'Cancel') }}
				</NcButton>
				<NcButton
					v-if="hasSteps && !isFirstStep"
					variant="secondary"
					type="button"
					data-testid="cn-form-page-back"
					@click="back">
					<template v-if="isBoardLook" #icon>
						<ChevronLeft :size="20" />
					</template>
					{{ isBoardLook ? t('nextcloud-vue', 'Previous') : t('nextcloud-vue', 'Back') }}
				</NcButton>
				<NcButton
					v-if="hasSteps && !isLastStep"
					class="cn-form-page__primary"
					variant="primary"
					type="button"
					:alignment="isBoardLook ? 'center-reverse' : 'center'"
					data-testid="cn-form-page-next"
					@click="next">
					<template v-if="isBoardLook" #icon>
						<ChevronRight :size="20" />
					</template>
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
						class="cn-form-page__primary"
						variant="primary"
						type="submit"
						:disabled="submitting || submitBlocked"
						:title="blockedReason || null"
						:aria-describedby="submitBlocked ? 'cn-form-page-unmet-list' : null">
						<template #icon>
							<NcLoadingIcon v-if="submitting" :size="20" />
							<Send v-else :size="20" />
						</template>
						{{ resolveLabel(submitLabel) }}
					</NcButton>
				</slot>
			</div>
			<!-- Local draft indicator: Saving, then Saved; one polite announcement per change. -->
			<p
				v-if="recoverDraft"
				class="cn-form-page__draft-state"
				aria-live="polite"
				data-testid="cn-form-page-draft-state">
				{{ draftIndicatorLabel }}
			</p>
		</form>
		<CnSmartPasteDialog
			v-if="smartPasteOpen"
			:hint="smartPaste && smartPaste.hint ? resolveLabel(smartPaste.hint) : ''"
			:busy="smartPasteBusy"
			:error="smartPasteError"
			@fill="onSmartPasteFill"
			@close="smartPasteOpen = false" />
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import ChevronLeft from 'vue-material-design-icons/ChevronLeft.vue'
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue'
import Send from 'vue-material-design-icons/Send.vue'
import CnSmartPasteDialog from '../../dialogs/CnSmartPasteDialog.vue'
import CnFormErrorSummary from '../CnFormErrorSummary/CnFormErrorSummary.vue'
import CnFormField from '../CnFormField/CnFormField.vue'
import CnStepper from '../CnStepper/CnStepper.vue'
import { cnRenderFormField } from '../../composables/cnFormFieldRenderer.js'
import { draftIndicatorText, draftKey, formDraftMixin, readDraft } from '../../composables/useFormDraft.js'
import { normalizeLook } from '../../composables/useLook.js'
import { cnSelectAria } from '../../directives/cnSelectAria.js'
import { loadCurrentUserProfile } from '../../utils/currentUserProfile.js'
import { computeAssignments, resolveFieldDefaults } from '../../utils/formAssign.js'
import { validateFieldValue } from '../../utils/formValidation.js'
import { serverErrorMessage } from '../../utils/serverErrorMessage.js'
import { evaluateVisibleWhen, evaluateVisibleWhenLocal } from '../../utils/visibleWhen.js'
import { CnPageHeader } from '../CnPageHeader/index.js'

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
	if (!url || !params) {
		return url
	}
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

	directives: { cnSelectAria },

	components: {
		CnFormErrorSummary,
		CnFormField,
		ChevronLeft,
		ChevronRight,
		CnPageHeader,
		CnSmartPasteDialog,
		CnStepper,
		NcButton,
		NcLoadingIcon,
		NcNoteCard,
		Send,
	},

	mixins: [formDraftMixin()],

	inject: {
		/**
		 * Custom-component registry from CnAppRoot. Used to resolve the
		 * `submitHandler` name to a concrete function. Defaults to an
		 * empty object when the page is mounted standalone.
		 *
		 * @type {object}
		 */
		cnCustomComponents: { default: () => ({}) },

		/**
		 * The label lookup from CnAppRoot (the manifest's own translations, then
		 * the host's translate). Used when no `translate` prop is given, so a
		 * manifest form page speaks the user's language.
		 *
		 * @type {Function|null}
		 */
		cnTranslate: { default: null },

		/** The app's look (a page with `config.look` re-provides its own). */
		cnLook: { default: 'nextcloud' },
	},

	props: {
		/**
		 * Where Cancel goes (board look). With a route, Cancel navigates there and
		 * emits `cancel`; with only a `cancel` listener it just emits. With neither
		 * the board footer has no Cancel.
		 */
		cancelRoute: {
			type: String,
			default: '',
		},

		/** The word shown as "(optional)" after an optional field's label in the board look. */
		optionalLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'optional'),
		},

		/** The sentence a public board look form shows above its first field. */
		optionalNoticeLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'A field without (optional) must be filled in.'),
		},

		/** Show the optional-fields sentence on a public board look form. Set false to hide it. */
		showOptionalNotice: {
			type: Boolean,
			default: true,
		},

		/**
		 * Keep what the user typed in the browser and offer it back when the
		 * form reopens (local only; nothing reaches the server). Off by default:
		 * a public form can run on a shared kiosk, so a host opts in.
		 */
		recoverDraft: {
			type: Boolean,
			default: false,
		},

		/** The app the draft belongs to; part of the draft's storage key. */
		draftAppId: {
			type: String,
			default: '',
		},

		/** Who is typing; part of the draft's storage key so a shared browser profile never leaks a draft between users. */
		draftUserId: {
			type: String,
			default: '',
		},

		/** Names this form in the draft's storage key (for example the form id), so two forms never share a draft. */
		draftScope: {
			type: String,
			default: 'form',
		},

		/**
		 * Host function that calculates a field: `(fieldKey, answers) => Promise<value>`.
		 * Called for a field declaring `calculate.inputs` when one of those answers
		 * changes, after 400 ms of quiet; the field is read-only. A rejection keeps
		 * the last value and says it could not be calculated. The library knows no
		 * rule language: calculation belongs to the host.
		 *
		 * @type {((fieldKey: string, answers: object) => Promise<unknown>)|null}
		 */
		calculate: {
			type: Function,
			default: null,
		},

		/**
		 * Conditions the host reports as unmet, shown above the submit button.
		 *
		 * @type {Array<{message: string}>}
		 */
		unmetConditions: {
			type: Array,
			default: () => [],
		},

		/** Disable submit while `unmetConditions` is not empty; the first message is the reason. */
		blockSubmit: {
			type: Boolean,
			default: false,
		},

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

		/**
		 * Name of a honeypot field for a form anonymous visitors fill in.
		 * The field is rendered out of sight and out of the tab order; when
		 * it is filled, submit sends nothing and shows the normal success,
		 * so a bot learns nothing. Empty (default): no honeypot.
		 */
		honeypot: {
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

		/**
		 * "Fill from pasted text": `{ enabled, fields, hint?, handler }`. The
		 * handler is a registry entry (a function, or `{ fill, available }`)
		 * that proposes values for the allowed `fields`. Never shown in
		 * `public` mode, when the handler is missing, or when it reports
		 * unavailable.
		 *
		 * @type {{enabled: boolean, fields: string[], hint?: string, handler: string}|null}
		 */
		smartPaste: {
			type: Object,
			default: null,
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
		 * @type {((key: string) => string)|null}
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
	 *
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
	emits: ['submit', 'error', 'input', 'step', 'cancel'],

	data() {
		return {
			formData: this.initialWithDefaults(),
			/** The values the form opened with (initial values plus defaults), to tell a changed form from a fresh one. */
			baseline: JSON.stringify(this.initialWithDefaults()),
			/** Fields the user edited by hand: their `assign` rules stop until reset. */
			handEdited: {},
			/** Field key -> label of the answer a rule filled it in from. */
			assignedFrom: {},
			/** Field keys being calculated now. */
			calculating: {},
			/** Field key -> sentence when the last calculation failed. */
			calcErrors: {},
			/** The signed-in user's profile (`displayName`, `email`) for `@me.*` defaults. */
			meProfile: {},
			/** Smart paste: the handler said it is available (resolved at mount). */
			smartPasteAvailable: false,
			smartPasteOpen: false,
			smartPasteBusy: false,
			smartPasteError: '',
			smartPasteNotice: '',
			/** Keys of fields filled by smart paste and not yet accepted or edited. */
			suggestions: {},
			submitting: false,
			submitted: false,
			lastError: null,
			/** Current wizard step index (unused when `steps` is empty). */
			currentStepIndex: 0,
			/** Keys of the fields the last failed validation flagged, in form order (the error summary). */
			summaryKeys: [],
			/** Per-field validation error messages, keyed by field.key. */
			fieldErrors: {},
			/** What a bot typed into the honeypot field; stays empty for a person. */
			honeypotValue: '',
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
		/** @return {Array<{id: string, label: string}>} The steps in the stepper's shape. */
		boardSteps() {
			return this.steps.map((step) => ({ id: step.id, label: this.resolveLabel(step.title) }))
		},

		/** @return {boolean} Whether the page has somewhere to cancel to. */
		canCancel() {
			const listener = this.$.vnode && this.$.vnode.props && this.$.vnode.props.onCancel
			return this.cancelRoute !== '' || !!listener
		},

		/** @return {boolean} Whether the board look is active. */
		isBoardLook() {
			return normalizeLook(this.cnLook) === 'board'
		},

		/** @return {Array<{key: string, message: string, controlId: string}>} The errors the summary lists. */
		summaryItems() {
			return this.summaryKeys
				.filter((key) => this.fieldErrors[key])
				.map((key) => ({ key, message: this.fieldErrors[key], controlId: this.controlIdFor({ key }) }))
		},

		/** @return {boolean} Whether the public form says what "optional" means. */
		showsOptionalNotice() {
			return this.isBoardLook
				&& this.mode === 'public'
				&& this.showOptionalNotice
				&& this.fields.some((f) => this.isFieldRequired(f))
		},

		/** Whether the host's unmet conditions hold the submit. */
		submitBlocked() {
			return this.blockSubmit === true && this.unmetConditions.length > 0
		},

		/** The reason shown for a held submit: the first unmet message. */
		blockedReason() {
			return this.submitBlocked ? String(this.unmetConditions[0].message || '') : ''
		},

		/** Whether any field has changed since mount. */
		dirty() {
			return JSON.stringify(this.formData) !== this.baseline
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

		/** The translator for manifest labels: the `translate` prop, else the injected `cnTranslate`, else identity. */
		labelTranslator() {
			if (typeof this.translate === 'function') {
				return this.translate
			}
			return typeof this.cnTranslate === 'function' ? this.cnTranslate : (k) => k
		},

		/** Whether any field still carries a smart-paste suggestion mark. */
		hasSuggestions() {
			return Object.keys(this.suggestions).length > 0
		},

		/** Whether `steps` declares at least one entry. */
		hasSteps() {
			return Array.isArray(this.steps) && this.steps.length > 0
		},

		/** `config.fields[].key` → field object lookup. */
		fieldsByKey() {
			const map = {}
			this.fields.forEach((f) => {
				if (f && typeof f.key === 'string') {
					map[f.key] = f
				}
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
				if (!field || typeof field.key !== 'string') {
					return
				}
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
			if (!this.hasSteps) {
				return ''
			}
			const step = this.steps[this.currentStepIndex]
			return step && step.description ? step.description : ''
		},

		/** Indices of steps that are NOT fully hidden by conditions. */
		visibleStepIndices() {
			if (!this.hasSteps) {
				return []
			}
			return this.steps.map((_, i) => i).filter((i) => !this.isStepHidden(this.steps[i]))
		},

		/** Whether the current step is the first non-fully-hidden step. */
		isFirstStep() {
			if (!this.hasSteps) {
				return true
			}
			const list = this.visibleStepIndices
			return list.length === 0 || this.currentStepIndex === list[0]
		},

		/** Whether the current step is the last non-fully-hidden step. */
		isLastStep() {
			if (!this.hasSteps) {
				return true
			}
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

		/**
		 * Where this form's local draft lives, or '' when recovery is off.
		 *
		 * @return {string} The storage key.
		 */
		formDraftKey() {
			if (this.recoverDraft !== true) {
				return ''
			}
			return draftKey({ appId: this.draftAppId, schema: this.draftScope, objectId: 'new', userId: this.draftUserId })
		},

		/**
		 * What the draft indicator announces: Saving, then Saved with a relative time.
		 * After a failed submit it says the draft is kept on this device instead,
		 * so it cannot be read as the server save that just failed.
		 *
		 * @return {string} The text, or '' before anything is typed.
		 * @spec openspec/changes/cell-labels-and-draft-indicator/specs/cell-labels-and-draft-indicator/spec.md#requirement-the-draft-indicator-never-reads-as-a-server-save-after-a-failed-save
		 */
		draftIndicatorLabel() {
			return draftIndicatorText(this.draftState, this.draftSavedAt, Date.now(), { saveFailed: Boolean(this.lastError) })
		},
	},

	watch: {
		// Keep the local draft in step with what is typed. Only a form that differs
		// from its initial values counts as typed-in, and nothing is written while
		// an earlier draft is being offered (the user has not chosen yet).
		formData: {
			deep: true,
			handler(values) {
				if (!this.formDraftKey || this.draftOffer !== null || !this.dirty) {
					return
				}
				this.scheduleDraftWrite(this.formDraftKey, values)
			},
		},

		initialValue: {
			deep: true,
			handler() {
				// A reset: the rules may fill in again.
				this.formData = this.initialWithDefaults()
				this.baseline = JSON.stringify(this.formData)
				this.handEdited = {}
				this.assignedFrom = {}
				this.runAssignments(null)
			},
		},
	},

	created() {
		// Pending calculation timers, per field (not reactive).
		this.calcTimers = {}
		// Offered, never applied: a form that fills itself is indistinguishable
		// from one the server prefilled.
		if (this.formDraftKey) {
			this.draftOffer = readDraft(this.formDraftKey)
		}
	},

	mounted() {
		this.resolveRemoteVisibility()
		this.resolveSmartPaste()
		this.runAssignments(null)
		this.loadProfileDefaults()
	},

	beforeUnmount() {
		Object.values(this.calcTimers).forEach((timer) => clearTimeout(timer))
	},

	methods: {
		t,

		/**
		 * The registered smart-paste handler as `{ fill, available }`, or null.
		 * A bare function is a `fill` with no availability check.
		 *
		 * @return {{fill: Function, available: Function|null}|null} The handler.
		 */
		smartPasteHandler() {
			const name = this.smartPaste && this.smartPaste.handler
			const entry = name ? this.effectiveCustomComponents[name] : null
			if (typeof entry === 'function') {
				return { fill: entry, available: null }
			}
			if (entry && typeof entry.fill === 'function') {
				return { fill: entry.fill, available: typeof entry.available === 'function' ? entry.available : null }
			}
			return null
		},

		/**
		 * Decide once, at mount, whether "Paste to fill" shows: enabled, not a
		 * public form, a handler that resolves and does not report unavailable.
		 * Anything else leaves the form exactly as before.
		 *
		 * @return {Promise<void>}
		 */
		async resolveSmartPaste() {
			this.smartPasteAvailable = false
			if (!this.smartPaste || this.smartPaste.enabled !== true || this.mode === 'public') {
				return
			}
			const handler = this.smartPasteHandler()
			if (!handler) {
				// eslint-disable-next-line no-console
				console.warn(`[CnFormPage] smartPaste handler "${this.smartPaste.handler}" is not registered; hiding "Paste to fill".`)
				return
			}
			try {
				this.smartPasteAvailable = handler.available ? (await handler.available()) === true : true
			} catch {
				// eslint-disable-next-line no-console
				console.warn('[CnFormPage] smartPaste availability check failed; hiding "Paste to fill".')
				this.smartPasteAvailable = false
			}
		},

		/**
		 * The allowed fields as the handler sees them: key, label, type and
		 * allowed options. Never a value.
		 *
		 * @return {Array<{key: string, label: string, type: string, options: string[]|null}>} The descriptors.
		 */
		smartPasteFields() {
			const allowed = new Set(Array.isArray(this.smartPaste?.fields) ? this.smartPaste.fields : [])
			return this.fields
				.filter((f) => f && allowed.has(f.key))
				.map((f) => ({
					key: f.key,
					label: this.resolveLabel(f.label) || f.key,
					type: f.type || 'string',
					options: f.type === 'enum' ? this.enumValues(f) : null,
				}))
		},

		/**
		 * The allowed values of an enum field.
		 *
		 * @param {object} field The field.
		 * @return {string[]} The values.
		 */
		enumValues(field) {
			const raw = Array.isArray(field.enum) ? field.enum : (Array.isArray(field.options) ? field.options : [])
			return raw.map((o) => (o && typeof o === 'object' ? o.value : o)).filter((v) => v !== undefined && v !== null).map(String)
		},

		/**
		 * Coerce a proposed value to the field's type.
		 *
		 * @param {object} field The field.
		 * @param {unknown} value The proposed value.
		 * @return {{ok: boolean, value?: unknown}} The coerced value, or not ok.
		 */
		coerceProposal(field, value) {
			switch (field.type || 'string') {
				case 'number': {
					const n = typeof value === 'number' ? value : (typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN)
					return Number.isFinite(n) ? { ok: true, value: n } : { ok: false }
				}
				case 'boolean':
					if (value === true || value === 'true') {
						return { ok: true, value: true }
					}
					if (value === false || value === 'false') {
						return { ok: true, value: false }
					}
					return { ok: false }
				case 'enum':
					return this.enumValues(field).includes(String(value)) ? { ok: true, value: String(value) } : { ok: false }
				case 'string':
					return typeof value === 'string' || typeof value === 'number' ? { ok: true, value: String(value) } : { ok: false }
				default:
					return { ok: false }
			}
		},

		/**
		 * Whether a field holds nothing the user typed.
		 *
		 * @param {unknown} value The field value.
		 * @return {boolean} True when empty.
		 */
		isEmptyField(value) {
			return value === undefined || value === null || value === '' || value === false || (Array.isArray(value) && value.length === 0)
		},

		/**
		 * Run the handler on the pasted text and land its proposals: only
		 * allowed, visible fields that are empty (or all of them when
		 * "Replace what I typed" is ticked), only values that fit the type and
		 * pass the field's validation. Each landed field is marked as a
		 * suggestion. Nothing is submitted.
		 *
		 * @param {{text: string, replace: boolean}} request The dialog's request.
		 * @return {Promise<void>}
		 */
		async onSmartPasteFill({ text, replace }) {
			const handler = this.smartPasteHandler()
			if (!handler) {
				return
			}
			this.smartPasteBusy = true
			this.smartPasteError = ''
			let values
			try {
				const answer = await handler.fill(text, this.smartPasteFields())
				values = answer && typeof answer.values === 'object' && answer.values !== null ? answer.values : {}
			} catch (err) {
				this.smartPasteError = (err && err.message) || t('nextcloud-vue', 'The text could not be read.')
				this.smartPasteBusy = false
				return
			}
			const allowed = new Set(Array.isArray(this.smartPaste?.fields) ? this.smartPaste.fields : [])
			let filled = 0
			let skipped = 0
			const marks = { ...this.suggestions }
			for (const [key, proposed] of Object.entries(values)) {
				const field = this.fields.find((f) => f && f.key === key)
				if (!field || !allowed.has(key) || !this.isFieldVisible(key)) {
					continue
				}
				if (!replace && !this.isEmptyField(this.formData[key])) {
					continue
				}
				const coerced = this.coerceProposal(field, proposed)
				if (!coerced.ok || validateFieldValue(field, coerced.value, this.resolveLabel) !== null) {
					skipped += 1
					continue
				}
				this.updateField(key, coerced.value)
				marks[key] = true
				filled += 1
			}
			this.suggestions = { ...this.suggestions, ...marks }
			this.smartPasteNotice = skipped > 0
				? t('nextcloud-vue', '{filled} fields filled, {skipped} skipped', { filled, skipped })
				: t('nextcloud-vue', '{filled} fields filled', { filled })
			this.smartPasteBusy = false
			this.smartPasteOpen = false
		},

		/**
		 * Accept one suggestion (clears its mark, keeps the value).
		 *
		 * @param {string} key The field key.
		 */
		acceptSuggestion(key) {
			this.suggestions = Object.fromEntries(Object.entries(this.suggestions).filter(([k]) => k !== key))
		},

		/** Accept every suggestion. */
		acceptAllSuggestions() {
			this.suggestions = {}
		},

		/**
		 * Take the offered local draft into the form.
		 *
		 * @return {void}
		 */
		restoreDraft() {
			if (this.draftOffer === null) {
				return
			}
			this.formData = { ...this.formData, ...this.draftOffer.values }
			this.draftOffer = null
		},

		/**
		 * Decline the offered local draft and forget it.
		 *
		 * @return {void}
		 */
		discardDraft() {
			this.forgetDraft(this.formDraftKey)
		},

		cloneInitial() {
			try {
				return JSON.parse(JSON.stringify(this.initialValue || {}))
			} catch {
				return {}
			}
		},

		/**
		 * Whether a field must be filled in (`validation.required`, or `required`).
		 *
		 * @param {object} field The formField shape.
		 * @return {boolean} True for a required field.
		 */
		isFieldRequired(field) {
			return !!(field && ((field.validation && field.validation.required) || field.required === true))
		},

		/**
		 * Whether the board look draws this field's head (label above the control,
		 * error between). A boolean keeps its inline label, and a `#field-<key>`
		 * override keeps its own markup.
		 *
		 * @param {object} field The formField shape.
		 * @return {boolean} True when the head is drawn.
		 */
		showsBoardHead(field) {
			if (!this.isBoardLook || this.$slots[`field-${field.key}`]) {
				return false
			}
			const render = this.resolveFieldRender(field)
			return !!render && render.kind !== 'boolean'
		},

		controlIdFor(field) {
			return `cn-form-page__field-${field.key}`
		},

		errorIdFor(field) {
			return `cn-form-page__field-error-${field.key}`
		},

		helpIdFor(field) {
			return `cn-form-page__field-help-${field.key}`
		},

		/**
		 * The bindings of a field's control: the renderer's props, plus in the
		 * board look the outside label, an id for the label's `for`, and the error
		 * moved above the control. For a text control, in both looks, an invalid
		 * value is `aria-invalid` and `aria-describedby` lists the error before
		 * the hint; `aria-required` is set in the board look.
		 *
		 * @param {object} field The formField shape.
		 * @return {object} The props to bind.
		 */
		fieldProps(field) {
			const render = this.resolveFieldRender(field)
			const props = { ...render.props }
			const head = this.showsBoardHead(field)
			const textControl = ['string', 'number', 'password', 'fallback', 'string-textarea'].includes(render.kind)
			const error = this.fieldErrors[field.key]
			if (head) {
				props.id = this.controlIdFor(field)
				if (render.kind === 'enum') {
					props.labelOutside = true
					delete props.inputLabel
				} else if (textControl) {
					props.labelOutside = true
				}
				delete props.error
				delete props.helperText
			}
			if (textControl) {
				const ids = []
				if (error && (head || !this.fieldHasNativeErrorSupport(field))) {
					ids.push(this.errorIdFor(field))
				}
				if (field.help) {
					ids.push(this.helpIdFor(field))
				}
				if (ids.length > 0) {
					props['aria-describedby'] = ids.join(' ')
				}
				if (error) {
					props['aria-invalid'] = 'true'
				}
				if (head && this.isFieldRequired(field)) {
					props['aria-required'] = 'true'
				}
			}
			return props
		},

		/**
		 * The accessibility attributes of an enum field's NcSelect. NcSelect
		 * forwards no attributes to its input, so these go through
		 * `v-cn-select-aria` onto the combobox input instead of `fieldProps`.
		 * The error element exists for an enum in both looks (NcSelect has no
		 * native error text), so an invalid value lists it before the hint.
		 *
		 * @param {object} field The formField shape.
		 * @return {object|null} The attributes, or null for any other control.
		 */
		selectAria(field) {
			const render = this.resolveFieldRender(field)
			if (!render || render.kind !== 'enum') {
				return null
			}
			const ids = []
			if (this.fieldErrors[field.key]) {
				ids.push(this.errorIdFor(field))
			}
			if (field.help) {
				ids.push(this.helpIdFor(field))
			}
			return {
				'aria-invalid': this.fieldErrors[field.key] ? 'true' : null,
				'aria-describedby': ids.length > 0 ? ids.join(' ') : null,
				'aria-required': this.showsBoardHead(field) && this.isFieldRequired(field) ? 'true' : null,
			}
		},

		/**
		 * Cancel (board look footer): go to `cancelRoute` when set, and tell the
		 * host.
		 */
		cancel() {
			if (this.cancelRoute !== '' && this.$router && typeof this.$router.push === 'function') {
				this.$router.push(this.cancelRoute)
			}
			/**
			 * @event cancel Emitted when the user presses Cancel in the board look.
			 */
			this.$emit('cancel')
		},

		resolveLabel(key) {
			if (!key) {
				return ''
			}
			return this.labelTranslator(key)
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
			const rendered = cnRenderFormField({
				field,
				value: this.formData[field.key],
				onInput: (next) => this.updateField(field.key, next),
				t: this.labelTranslator,
				error: this.fieldErrors[field.key] || null,
			})
			// A calculated field is the host's to set: shown, not editable.
			if (rendered && field.calculate && Array.isArray(field.calculate.inputs)) {
				rendered.props = { ...rendered.props, readonly: true, disabled: rendered.kind === 'enum' || rendered.kind === 'boolean' }
			}
			return rendered
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
			if (this.$slots[`field-${field.key}`] || this.$slots[`field-${field.key}`]) {
				return false
			}
			const render = this.resolveFieldRender(field)
			if (!render) {
				return false
			}
			if (['string', 'number', 'password', 'fallback'].includes(render.kind)) {
				return true
			}
			if (render.kind === 'string-textarea') {
				return render.tag !== 'textarea'
			}
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
			if (!step || !Array.isArray(step.fields)) {
				return []
			}
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
			const remoteFields = this.fields.filter((f) => f && f.visibleWhen && (f.visibleWhen.endpoint || f.visibleWhen.source))
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
			const invalidKeys = []
			fieldsList.forEach((field) => {
				if (!field || typeof field.key !== 'string') {
					return
				}
				if (!this.isFieldVisible(field.key)) {
					delete this.fieldErrors[field.key]
					return
				}
				const message = validateFieldValue(field, this.formData[field.key], this.resolveLabel)
				if (message) {
					this.fieldErrors[field.key] = message
					invalidKeys.push(field.key)
					if (!firstInvalidKey) {
						firstInvalidKey = field.key
					}
				} else {
					delete this.fieldErrors[field.key]
				}
			})
			this.summaryKeys = invalidKeys
			return firstInvalidKey
		},

		/**
		 * After a failed Next or submit: the board look moves focus to the error
		 * summary, which links to every control; the Nextcloud look focuses the
		 * first invalid field, as before.
		 *
		 * @param {string} firstInvalidKey The first invalid field's key.
		 */
		focusFirstError(firstInvalidKey) {
			if (!this.isBoardLook) {
				this.focusField(firstInvalidKey)
				return
			}
			this.$nextTick(() => {
				if (this.$refs.errorSummary && typeof this.$refs.errorSummary.focus === 'function') {
					this.$refs.errorSummary.focus()
				} else {
					this.focusField(firstInvalidKey)
				}
			})
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
				if (!node || typeof node.querySelector !== 'function') {
					return
				}
				const input = node.querySelector('input, textarea, select, [tabindex]')
				if (input && typeof input.focus === 'function') {
					input.focus()
				}
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
				if (!this.isStepHidden(this.steps[idx])) {
					return idx
				}
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
				this.focusFirstError(firstInvalidKey)
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
			// A hand edit: this field's rules stop until the form is reset.
			this.handEdited[key] = true
			delete this.assignedFrom[key]
			delete this.fieldErrors[key]
			// Editing a suggested field accepts it.
			if (this.suggestions[key]) {
				this.suggestions = Object.fromEntries(Object.entries(this.suggestions).filter(([k]) => k !== key))
			}
			/**
			 * Field-level update event.
			 *
			 * @event input
			 * @type {{key: string, value: unknown}}
			 */
			this.$emit('input', { key, value })
			this.runAssignments([key])
		},

		/**
		 * The initial values with the fields' defaults filled in underneath
		 * (a default never replaces an initial value). Tokens resolve once, here.
		 *
		 * @return {object} The values the form opens with.
		 */
		initialWithDefaults() {
			const initial = this.cloneInitial()
			return { ...resolveFieldDefaults(this.fields, initial, { me: this.meProfile || {} }), ...initial }
		},

		/**
		 * Fill in fields from other answers (`assign` rules). `changed` names the
		 * answers that just changed; `null` is the pass at open, over empty fields.
		 *
		 * @param {string[]|null} changed Keys that changed.
		 */
		runAssignments(changed) {
			const { values, from } = computeAssignments({
				fields: this.fields,
				answers: this.formData,
				changed,
				edited: Object.keys(this.handEdited),
				ctx: { me: this.meProfile, object: this.formData },
			})
			const keys = Object.keys(values)
			for (const key of keys) {
				this.formData[key] = values[key]
				delete this.fieldErrors[key]
				const source = this.fieldsByKey[from[key]]
				this.assignedFrom[key] = source ? this.resolveLabel(source.label || source.key) : from[key]
				this.$emit('input', { key, value: values[key] })
			}
			if (changed === null && keys.length > 0) {
				// Filled in on open: not something the person changed.
				this.baseline = JSON.stringify(this.formData)
			}
			this.scheduleCalculations([...(changed || []), ...keys])
		},

		/**
		 * Ask the host to recalculate the fields that read the changed answers,
		 * once the person has stopped typing for 400 ms.
		 *
		 * @param {string[]} changed Keys that changed.
		 */
		scheduleCalculations(changed) {
			if (typeof this.calculate !== 'function' || changed.length === 0) {
				return
			}
			for (const field of this.fields) {
				const inputs = field && field.calculate && Array.isArray(field.calculate.inputs) ? field.calculate.inputs : []
				if (!inputs.some((k) => changed.includes(k))) {
					continue
				}
				clearTimeout(this.calcTimers[field.key])
				this.calcTimers[field.key] = setTimeout(() => this.runCalculation(field.key), 400)
			}
		},

		/**
		 * Run the host's calculation for one field and write the answer.
		 *
		 * @param {string} key The field to calculate.
		 * @return {Promise<void>}
		 */
		async runCalculation(key) {
			this.calculating[key] = true
			delete this.calcErrors[key]
			try {
				const value = await this.calculate(key, { ...this.formData })
				this.formData[key] = value
				this.$emit('input', { key, value })
			} catch {
				this.calcErrors[key] = t('nextcloud-vue', 'Could not calculate')
			} finally {
				delete this.calculating[key]
			}
		},

		/**
		 * Fill in `@me.*` defaults the sync resolver could not: the e-mail comes
		 * from the user's profile, asked for once and only when a default needs it.
		 *
		 * @return {Promise<void>}
		 */
		async loadProfileDefaults() {
			const needs = this.fields.filter((f) => f && typeof f.default === 'string' && /^@me\.(email|displayName)$/.test(f.default) && (this.formData[f.key] === undefined || this.formData[f.key] === null || this.formData[f.key] === ''))
			if (needs.length === 0) {
				return
			}
			this.meProfile = await loadCurrentUserProfile()
			if (!this.meProfile.email && !this.meProfile.displayName) {
				return
			}
			const have = this.formData
			const filled = resolveFieldDefaults(needs, have, { me: this.meProfile })
			for (const [key, value] of Object.entries(filled)) {
				if (!this.handEdited[key]) {
					this.formData[key] = value
				}
			}
			this.baseline = JSON.stringify(this.formData)
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
			if (this.submitBlocked) {
				return
			}

			const allFieldsList = this.hasSteps
				? this.steps.reduce((acc, step) => acc.concat(this.stepFields(step)), [])
				: this.fields
			const firstInvalidKey = this.validateVisibleFields(allFieldsList)
			if (firstInvalidKey) {
				if (this.hasSteps) {
					const stepIndex = this.steps.findIndex((step) => this.stepFields(step).some((f) => f.key === firstInvalidKey))
					if (stepIndex >= 0) {
						this.currentStepIndex = stepIndex
					}
				}
				this.focusFirstError(firstInvalidKey)
				return
			}

			this.lastError = null
			if (this.honeypot && this.honeypotValue !== '') {
				// A bot filled the field no person sees: send nothing, look done.
				this.submitted = true
				return
			}
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
				// Once it is on the server, the local copy protects nothing.
				this.forgetDraft(this.formDraftKey)
				/**
				 * Successful submit event. Payload is the effective payload
				 * (visible fields only).
				 *
				 * @event submit
				 * @type {object}
				 */
				this.$emit('submit', this.effectivePayload)
			} catch (err) {
				// The server's own sentence, when it sent one. An axios message
				// describes the transport ("Request failed with status code 400")
				// and leaves the user to guess which field it meant.
				this.lastError = serverErrorMessage(err)
				// A refusal that names its fields (`findings[]`, as OpenRegister's
				// form destination check answers 422) is marked on each field.
				this.showServerFindings(err)
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

		/**
		 * Put each finding of a refused submit on its field.
		 *
		 * Reads `response.data.findings[]`, each `{ field?, property, message }`,
		 * and marks the field whose key is the finding's `field`, or else its
		 * `property`. Findings on no field of this form stay in the general
		 * error above the form. Nothing happens for an answer without findings.
		 *
		 * @param {object} err The rejected request.
		 * @return {void}
		 */
		showServerFindings(err) {
			const findings = err?.response?.data?.findings
			if (!Array.isArray(findings) || findings.length === 0) {
				return
			}
			const keys = new Set(this.fields.map((f) => f && f.key))
			const marked = []
			for (const finding of findings) {
				const key = finding && (finding.field || finding.property)
				if (!key || !keys.has(key) || this.fieldErrors[key]) {
					continue
				}
				this.fieldErrors[key] = String(finding.message || t('nextcloud-vue', 'This answer was refused.'))
				marked.push(key)
			}
			if (marked.length === 0) {
				return
			}
			this.summaryKeys = this.fields.map((f) => f.key).filter((key) => marked.includes(key))
			if (this.hasSteps) {
				const stepIndex = this.steps.findIndex((step) => this.stepFields(step).some((f) => f.key === this.summaryKeys[0]))
				if (stepIndex >= 0) {
					this.currentStepIndex = stepIndex
				}
			}
			this.focusFirstError(this.summaryKeys[0])
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
				console.warn(`[CnFormPage] handler "${this.submitHandler}" not found in customComponents (or not a function). Did you register it?`)
				throw new Error(`CnFormPage: handler "${this.submitHandler}" not registered`)
			}
			await handler(this.effectivePayload, this.$route, this.$router)
		},
	},
}
</script>

<style>
.cn-form-page__honeypot {
	position: absolute;
	left: -10000px;
	width: 1px;
	height: 1px;
	overflow: hidden;
}

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

.cn-form-page__draft-state {
	margin: 8px 0 0;
	min-height: 1.2em;
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
}

.cn-form-page__draft-actions {
	display: flex;
	gap: 8px;
	margin-top: 8px;
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

.cn-form-page__smart-paste {
	display: flex;
	gap: 8px;
	margin-bottom: 12px;
}

.cn-form-page__smart-paste-notice {
	margin: 0 0 8px;
	color: var(--color-text-maxcontrast);
}

.cn-form-page__smart-paste-notice:empty {
	display: none;
}

.cn-form-page__suggested {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	margin-top: 4px;
}

.cn-form-page__suggested-tag {
	padding: 2px 8px;
	border-radius: var(--border-radius-pill, 999px);
	background: var(--color-primary-element-light);
	color: var(--color-primary-element-light-text);
	font-size: 12px;
}
</style>
