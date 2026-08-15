<template>
	<NcDialog
		:name="dialogTitle"
		size="large"
		:open="dialogOpen"
		:no-close="loading || !cancellable"
		data-testid="cn-modal"
		data-testid-modal="cn-wizard-dialog"
		@update:open="dialogOpen = $event"
		@closing="onClose">
		<!-- Result phase: rendered after a successful `submit()`. -->
		<div v-if="result !== null"
			class="cn-wizard-dialog__result"
			data-testid-phase="result">
			<NcNoteCard v-if="result.success" type="success">
				{{ result.message || successText }}
			</NcNoteCard>
			<NcNoteCard v-else-if="result.error" type="error">
				{{ result.error }}
			</NcNoteCard>
			<!-- @slot result-extra Optional extra content (e.g. batch
			     progress poller, summary table) rendered below the
			     success/error banner. Scope: { result }. -->
			<slot name="result-extra" :result="result" />
		</div>

		<!-- Wizard phase: progress bar + current step body. -->
		<div v-else
			class="cn-wizard-dialog__wizard"
			data-testid-phase="form">
			<!-- Progress indicator. Click jumps back to a completed
			     step when allowJumpBack is true. -->
			<ol class="cn-wizard-dialog__progress" role="tablist">
				<li v-for="(step, idx) in steps"
					:key="step.id"
					class="cn-wizard-dialog__progress-item"
					:class="{
						'cn-wizard-dialog__progress-item--active': idx === currentIndex,
						'cn-wizard-dialog__progress-item--done': idx < currentIndex,
						'cn-wizard-dialog__progress-item--clickable': allowJumpBack && idx < currentIndex,
					}"
					role="tab"
					:aria-selected="idx === currentIndex"
					@click="allowJumpBack && idx < currentIndex ? jumpTo(step.id) : null">
					<span class="cn-wizard-dialog__progress-dot">
						<span v-if="idx < currentIndex" class="cn-wizard-dialog__progress-check" aria-hidden="true">✓</span>
						<span v-else>{{ idx + 1 }}</span>
					</span>
					<span class="cn-wizard-dialog__progress-label">{{ step.label }}</span>
					<span v-if="idx < steps.length - 1"
						class="cn-wizard-dialog__progress-connector"
						:class="{ 'cn-wizard-dialog__progress-connector--done': idx < currentIndex }"
						aria-hidden="true" />
				</li>
			</ol>

			<!-- Validation error from the current step's validate() result. -->
			<NcNoteCard v-if="validationError" type="error">
				{{ validationError }}
			</NcNoteCard>

			<!-- Current step body — a dynamic slot named by step id. -->
			<div class="cn-wizard-dialog__step-body" :data-step-id="currentStep.id">
				<!-- @slot step-{id} Per-step body. Scope: { next,
				     back, jumpTo, submit, currentStep, stepIndex,
				     totalSteps, stepData, setStepData, isFirst,
				     isLast }. -->
				<slot
					:name="'step-' + currentStep.id"
					:next="next"
					:back="back"
					:jump-to="jumpTo"
					:submit="submit"
					:current-step="currentStep"
					:step-index="currentIndex"
					:total-steps="steps.length"
					:step-data="stepData"
					:set-step-data="setStepData"
					:is-first="isFirst"
					:is-last="isLast" />
			</div>
		</div>

		<template #actions>
			<!-- Result phase actions: just Close. -->
			<NcButton v-if="result !== null" @click="onClose">
				{{ closeLabel }}
			</NcButton>

			<!-- Wizard phase actions: Cancel + Back + Next/Submit. -->
			<template v-else>
				<NcButton v-if="cancellable" @click="onClose">
					{{ cancelLabel }}
				</NcButton>
				<NcButton v-if="!isFirst"
					:disabled="loading"
					@click="back">
					{{ backLabel }}
				</NcButton>
				<NcButton variant="primary"
					:disabled="loading"
					@click="isLast ? submit() : next()">
					<template #icon>
						<NcLoadingIcon v-if="loading" :size="20" />
					</template>
					{{ isLast ? submitLabel : nextLabel }}
				</NcButton>
			</template>
		</template>
	</NcDialog>
</template>

<script>
import { NcDialog, NcButton, NcNoteCard, NcLoadingIcon } from '@nextcloud/vue'

/**
 * CnWizardDialog — Multi-step modal with per-step slots,
 * back/next navigation, optional per-step validation, and a single
 * result phase.
 *
 * Each step is declared in the `steps[]` prop (`{ id, label,
 * optional?, icon? }`) and rendered via a `#step-{id}` named slot
 * with the navigation API exposed through the slot scope. The
 * wizard owns the progress indicator, the back/next chrome, the
 * loading lifecycle, and the result-phase banner — the consumer
 * owns the per-step body + the data collection logic.
 *
 * Per-step validation is opt-in via the `validate` prop:
 *
 * ```js
 * async function validate(stepId, stepData) {
 *   if (stepId === 'audience' && !stepData.cohort) {
 *     return 'Pick a cohort first.'
 *   }
 *   return true
 * }
 * ```
 *
 * Returning `true` (or any truthy non-string) advances; returning a
 * string surfaces it as an error banner above the step body and
 * blocks the navigation.
 *
 * The result phase is entered by the consumer calling
 * `setResult({ success?, message?, error? })` after `@submit` fires.
 *
 * Use [`CnFormDialog`](../CnFormDialog/) for single-step forms.
 * Use [`CnExportWizard`](../CnExportWizard/) for the specific
 * scope+format+delivery export-trigger shape.
 *
 * ```vue
 * <CnWizardDialog
 *   ref="wizard"
 *   dialog-title="Bulk enrol"
 *   :steps="[
 *     { id: 'audience', label: 'Audience' },
 *     { id: 'course',   label: 'Course'   },
 *     { id: 'confirm',  label: 'Confirm'  },
 *   ]"
 *   :validate="validateStep"
 *   @submit="onSubmit"
 *   @close="show = false">
 *   <template #step-audience="{ next, stepData, setStepData }">
 *     <CohortPicker :value="stepData.cohort" @input="v => setStepData({ cohort: v })" />
 *   </template>
 *   <template #step-course="{ next, back, stepData, setStepData }">
 *     <CoursePicker :value="stepData.course" @input="v => setStepData({ course: v })" />
 *   </template>
 *   <template #step-confirm="{ back, submit, stepData }">
 *     <p>Enrol {{ stepData.audience.cohort.size }} learners into {{ stepData.course.course.name }}?</p>
 *   </template>
 * </CnWizardDialog>
 * ```
 */
export default {
	name: 'CnWizardDialog',
	components: { NcDialog, NcButton, NcNoteCard, NcLoadingIcon },
	props: {
		/**
		 * Step declarations. Order is significant — the wizard
		 * navigates linearly between adjacent steps unless the
		 * consumer calls `jumpTo()` from a slot scope.
		 *
		 * @type {Array<{ id: string, label: string, optional?: boolean, icon?: string }>}
		 */
		steps: {
			type: Array,
			required: true,
			validator: (v) => Array.isArray(v) && v.length > 0
				&& v.every((s) => s && typeof s.id === 'string' && typeof s.label === 'string'),
		},
		/**
		 * Dialog title shown in the NcDialog header.
		 *
		 * @type {string}
		 */
		dialogTitle: {
			type: String,
			default: 'Wizard',
		},
		/**
		 * Step id to start on. Defaults to the first step in `steps[]`.
		 *
		 * @type {string}
		 */
		initialStep: {
			type: String,
			default: '',
		},
		/**
		 * Per-step validator. Async function returning `true` to
		 * advance, a string to surface as an error banner + block
		 * navigation, or `false` to block silently. Called from
		 * `next()` and `submit()`. When omitted, navigation always
		 * proceeds.
		 *
		 * @type {(stepId: string, stepData: object) => Promise<boolean|string>}
		 */
		validate: {
			type: Function,
			default: null,
		},
		/**
		 * Whether the progress indicator allows jumping back to a
		 * completed step via click. Forward jumps are NEVER allowed
		 * via the progress indicator (consumer-side `jumpTo` is
		 * unrestricted).
		 *
		 * @type {boolean}
		 */
		allowJumpBack: {
			type: Boolean,
			default: true,
		},
		/**
		 * Seed values for `stepData` (the cross-step object passed
		 * to every slot scope). Useful for prefilling on edit-style
		 * wizards.
		 *
		 * @type {object}
		 */
		defaults: {
			type: Object,
			default: () => ({}),
		},
		/** Cancel-button label (wizard phase). */
		cancelLabel: { type: String, default: 'Cancel' },
		/** Back-button label. */
		backLabel: { type: String, default: 'Back' },
		/** Next-button label (intermediate steps). */
		nextLabel: { type: String, default: 'Next' },
		/** Submit-button label (last step). */
		submitLabel: { type: String, default: 'Submit' },
		/** Close-button label (result phase). */
		closeLabel: { type: String, default: 'Close' },
		/** Success banner default text when result.message is empty. */
		successText: { type: String, default: 'Done.' },
		/**
		 * Whether the dialog can be dismissed (Cancel button, ESC, backdrop
		 * click) before reaching the result phase. `false` hides Cancel and
		 * disables all other close affordances — use for a step that must
		 * be completed, not merely skipped. The result-phase Close button is
		 * unaffected (a completed wizard is always dismissible).
		 *
		 * @type {boolean}
		 */
		cancellable: {
			type: Boolean,
			default: true,
		},
	},
	emits: ['close', 'step-change', 'submit'],
	data() {
		const initialIndex = this.resolveInitialIndex()
		return {
			currentIndex: initialIndex,
			stepData: { ...this.defaults },
			loading: false,
			result: null,
			validationError: '',
			/**
			 * Drives NcDialog's `open` prop directly. NcDialog's own `open`
			 * prop defaults to `true` and is NOT self-managing on close — its
			 * internal `showModal` flag resets back to `true` ~300ms after
			 * any close (animation bookkeeping for next time it's reopened
			 * via the prop), so without an explicit `false` here the dialog
			 * reopens itself right after Cancel/ESC/backdrop-click.
			 */
			dialogOpen: true,
		}
	},
	computed: {
		/**
		 * The currently-active step object from `steps[]`.
		 *
		 * @return {object} The current step definition.
		 */
		currentStep() {
			return this.steps[this.currentIndex] || this.steps[0]
		},
		/**
		 * Whether the current step is the first one.
		 *
		 * @return {boolean} True when on the first step.
		 */
		isFirst() {
			return this.currentIndex === 0
		},
		/**
		 * Whether the current step is the last one (drives the
		 * Next → Submit label flip).
		 *
		 * @return {boolean} True when on the last step.
		 */
		isLast() {
			return this.currentIndex === this.steps.length - 1
		},
	},
	methods: {
		/**
		 * Resolve the index of `initialStep` (falling back to 0 when
		 * unset / not found).
		 *
		 * @return {number} Step index in the range [0, steps.length).
		 */
		resolveInitialIndex() {
			if (!this.initialStep) return 0
			const idx = this.steps.findIndex((s) => s.id === this.initialStep)
			return idx >= 0 ? idx : 0
		},
		/**
		 * Merge a partial step-data object onto the shared state.
		 * Each slot scope receives this so consumers can write their
		 * step's data without owning a `data()` block in their slot
		 * component.
		 *
		 * @param {object} partial Fields to merge.
		 * @return {void}
		 */
		setStepData(partial) {
			this.stepData = { ...this.stepData, ...partial }
		},
		/**
		 * Run the consumer's `validate` prop (if provided) for the
		 * current step. Returns true on pass; sets `validationError`
		 * and returns false on fail.
		 *
		 * @return {Promise<boolean>} Whether validation passed.
		 */
		async runValidation() {
			this.validationError = ''
			if (typeof this.validate !== 'function') return true
			try {
				const outcome = await this.validate(this.currentStep.id, this.stepData)
				if (outcome === true) return true
				if (typeof outcome === 'string') {
					this.validationError = outcome
					return false
				}
				return Boolean(outcome)
			} catch (e) {
				this.validationError = e && e.message ? e.message : 'Validation failed.'
				return false
			}
		},
		/**
		 * Advance to the next step after validation. Emits
		 * `@step-change` with the new step id.
		 *
		 * @return {Promise<void>}
		 */
		async next() {
			if (this.isLast) {
				return this.submit()
			}
			const ok = await this.runValidation()
			if (!ok) return
			this.currentIndex += 1
			/**
			 * @event step-change Emitted on every step navigation
			 *   (next / back / jumpTo / submit).
			 * @type {{ stepId: string, stepIndex: number, direction: 'next'|'back'|'jump' }}
			 */
			this.$emit('step-change', {
				stepId: this.currentStep.id,
				stepIndex: this.currentIndex,
				direction: 'next',
			})
		},
		/**
		 * Step back to the previous step. No validation runs on
		 * back navigation — consumers can reach back without
		 * losing the current step's draft.
		 *
		 * @return {void}
		 */
		back() {
			if (this.isFirst) return
			this.validationError = ''
			this.currentIndex -= 1
			this.$emit('step-change', {
				stepId: this.currentStep.id,
				stepIndex: this.currentIndex,
				direction: 'back',
			})
		},
		/**
		 * Jump to an arbitrary step by id. Validation is skipped
		 * (the consumer is responsible for re-running it before
		 * `submit()` if it matters).
		 *
		 * @param {string} stepId Target step id.
		 * @return {void}
		 */
		jumpTo(stepId) {
			const idx = this.steps.findIndex((s) => s.id === stepId)
			if (idx < 0) return
			this.validationError = ''
			this.currentIndex = idx
			this.$emit('step-change', {
				stepId: this.currentStep.id,
				stepIndex: this.currentIndex,
				direction: 'jump',
			})
		},
		/**
		 * Submit the wizard. Runs the current step's validation;
		 * on pass flips `loading` on and emits `@submit` with the
		 * accumulated `stepData`. The parent is responsible for
		 * calling `setResult()` to flip into the result phase.
		 *
		 * @return {Promise<void>}
		 */
		async submit() {
			const ok = await this.runValidation()
			if (!ok) return
			this.loading = true
			/**
			 * @event submit Emitted when the user reaches the final
			 *   step and clicks Submit (or `submit()` is called
			 *   programmatically from a slot scope). Payload is the
			 *   accumulated `stepData`.
			 * @type {object}
			 */
			this.$emit('submit', { ...this.stepData })
		},
		/**
		 * Public method called by the parent to switch the wizard
		 * into the result phase.
		 *
		 * @param {object} result `{ success?, message?, error? }`.
		 * @return {void}
		 */
		setResult(result) {
			this.result = result || { success: true }
			this.loading = false
		},

		/**
		 * Public method for a NON-terminal submit failure: stops the
		 * loading spinner and surfaces `message` as the error banner above
		 * the (still-editable) current step, WITHOUT entering the result
		 * phase — so the user can correct the input and resubmit. Use this
		 * instead of `setResult({ error })` when the failure is recoverable
		 * (e.g. a taken slug, a validation conflict).
		 *
		 * @param {string} message The error to show above the step body.
		 * @return {void}
		 */
		setError(message) {
			this.loading = false
			this.validationError = message || ''
		},
		/**
		 * Close-button handler. Resets local state so the next open
		 * starts fresh and emits `@close`.
		 *
		 * @return {void}
		 */
		onClose() {
			this.result = null
			this.loading = false
			this.validationError = ''
			this.currentIndex = this.resolveInitialIndex()
			this.stepData = { ...this.defaults }
			this.dialogOpen = false
			/**
			 * @event close Emitted when the dialog should close.
			 */
			this.$emit('close')
		},
	},
}
</script>

<style scoped>
.cn-wizard-dialog__progress {
	display: flex;
	align-items: flex-start;
	justify-content: center;
	gap: 0;
	padding: 8px 0 4px;
	margin: 0 0 20px;
	list-style: none;
}

.cn-wizard-dialog__progress-item {
	position: relative;
	flex: 1 1 0;
	min-width: 0;
	max-width: 180px;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
	text-align: center;
	color: var(--color-text-maxcontrast);
	font-size: 0.8125rem;
}

.cn-wizard-dialog__progress-item--clickable {
	cursor: pointer;
}

/* Marker circle */
.cn-wizard-dialog__progress-dot {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 34px;
	height: 34px;
	border-radius: 50%;
	border: 2px solid var(--color-border-dark);
	background: var(--color-main-background);
	color: var(--color-text-maxcontrast);
	font-size: 14px;
	font-weight: 600;
	transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
	z-index: 1;
}

.cn-wizard-dialog__progress-check {
	font-size: 16px;
	line-height: 1;
}

.cn-wizard-dialog__progress-label {
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* Connector line between this marker and the next, centered on the marker. */
.cn-wizard-dialog__progress-connector {
	position: absolute;
	top: 17px;
	left: calc(50% + 21px);
	right: calc(-50% + 21px);
	height: 2px;
	background: var(--color-border-dark);
}

.cn-wizard-dialog__progress-connector--done {
	background: var(--color-primary-element);
}

/* States */
.cn-wizard-dialog__progress-item--active .cn-wizard-dialog__progress-dot {
	border-color: var(--color-primary-element);
	background: var(--color-primary-element);
	color: var(--color-primary-element-text, #fff);
}

.cn-wizard-dialog__progress-item--active .cn-wizard-dialog__progress-label {
	color: var(--color-main-text);
	font-weight: 600;
}

.cn-wizard-dialog__progress-item--done .cn-wizard-dialog__progress-dot {
	border-color: var(--color-primary-element);
	background: var(--color-primary-element);
	color: var(--color-primary-element-text, #fff);
}

.cn-wizard-dialog__progress-item--done .cn-wizard-dialog__progress-label {
	color: var(--color-main-text);
}

.cn-wizard-dialog__progress-item--clickable:hover .cn-wizard-dialog__progress-label {
	color: var(--color-primary-element);
}

.cn-wizard-dialog__step-body {
	min-height: 200px;
}

.cn-wizard-dialog__result {
	display: flex;
	flex-direction: column;
	gap: 12px;
}
</style>
