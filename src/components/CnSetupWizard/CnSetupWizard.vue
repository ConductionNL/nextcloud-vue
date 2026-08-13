<!-- SPDX-License-Identifier: EUPL-1.2 -->
<!-- SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl> -->
<template>
	<CnWizardDialog
		ref="wizard"
		:steps="wizardSteps"
		:dialog-title="dialogTitle"
		:submit-label="submitLabel"
		:cancel-label="cancelLabel"
		:next-label="nextLabel"
		:back-label="backLabel"
		:success-text="successText"
		:validate="validateStep"
		:cancellable="cancellable"
		:initial-step="initialStepId"
		@step-change="onStepChange"
		@submit="onSubmit"
		@close="onClose">
		<!-- This `<template v-for>` defines dynamic SLOTS, not a rendered list.
		     `@vue/compiler-sfc` DISCARDS a `:key` on a slot-defining
		     `<template>` (verified against the generated `createSlots` call)
		     and honours it only on the child, so the rule's advice is inverted
		     here — moving the key up would throw it away. -->
		<!-- eslint-disable vue/no-v-for-template-key-on-child -->
		<template v-for="step in setupSteps" #[stepSlot(step)]="scope">
			<div :key="step.id" class="cn-setup-step" :data-step-type="step.type">
				<!-- @slot step-{id} Override a step's body (for `component` steps or
				     any bespoke step). Scope: the CnWizardDialog step scope plus
				     `{ step, runAction, saveConfig }`. -->
				<slot
					v-if="hasCustomSlot(step.id)"
					:name="stepSlot(step)"
					v-bind="scope"
					:step="step"
					:run-action="() => runAction(step)"
					:save-config="(patch) => saveConfig(patch)" />

				<!-- info -->
				<template v-else-if="step.type === 'info'">
					<NcNoteCard type="info" :heading="step.title">
						{{ step.body || '' }}
					</NcNoteCard>
				</template>

				<!-- choice -->
				<template v-else-if="step.type === 'choice'">
					<NcNoteCard v-if="step.body" type="info">
						{{ step.body }}
					</NcNoteCard>
					<NcSelect
						:input-label="step.title || step.id"
						:options="optionsFor(step)"
						:multiple="step.multiple === true"
						:disabled="isChoiceDisabled(step)"
						label="label"
						:model-value="choiceModel[step.id]"
						@update:model-value="(v) => onChoice(step, v)" />
					<NcNoteCard v-if="isChoiceDisabled(step)" type="warning">
						{{ dependsOnHint(step) }}
					</NcNoteCard>
				</template>

				<!-- config-fields -->
				<template v-else-if="step.type === 'config-fields'">
					<div
						v-for="field in fieldsFor(step)"
						:key="field.key"
						class="cn-setup-field">
						<NcCheckboxRadioSwitch
							v-if="field.widget === 'checkbox'"
							:model-value="!!configModel[field.key]"
							@update:model-value="(v) => configModel[field.key] = v">
							{{ field.label }}
						</NcCheckboxRadioSwitch>
						<NcSelect
							v-else-if="field.widget === 'select'"
							:input-label="field.label"
							:options="field.enum || []"
							:model-value="configModel[field.key]"
							@update:model-value="(v) => configModel[field.key] = v" />
						<NcTextField
							v-else
							:label="field.label"
							:type="field.widget === 'number' ? 'number' : 'text'"
							:model-value="configModel[field.key] != null ? String(configModel[field.key]) : ''"
							@update:model-value="(v) => configModel[field.key] = v" />
					</div>
				</template>

				<!-- run-action -->
				<template v-else-if="step.type === 'run-action'">
					<NcNoteCard v-if="step.body" type="info">
						{{ step.body }}
					</NcNoteCard>
					<NcNoteCard
						v-if="actionResult[step.id]"
						:type="actionResult[step.id].success ? 'success' : 'error'">
						{{ actionResult[step.id].message }}
					</NcNoteCard>
					<div class="cn-setup-step__nav">
						<NcButton variant="primary" :disabled="running[step.id]" @click="runAction(step)">
							<template v-if="running[step.id]" #icon>
								<NcLoadingIcon :size="20" />
							</template>
							{{ runLabel }}
						</NcButton>
					</div>
				</template>

				<!-- summary -->
				<template v-else-if="step.type === 'summary'">
					<NcNoteCard v-if="step.body" type="info">
						{{ step.body }}
					</NcNoteCard>
					<ul class="cn-setup-summary">
						<li
							v-for="item in summaryItems"
							:key="item.id"
							class="cn-setup-summary__item"
							:class="{ 'cn-setup-summary__item--done': item.done }">
							<span class="cn-setup-summary__mark">{{ item.done ? '✓' : '○' }}</span>
							<span class="cn-setup-summary__label">{{ item.title }}</span>
							<span v-if="item.value" class="cn-setup-summary__value">{{ item.value }}</span>
						</li>
					</ul>
				</template>
			</div>
		</template>
		<!-- eslint-enable vue/no-v-for-template-key-on-child -->
	</CnWizardDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcNoteCard, NcSelect, NcTextField, NcCheckboxRadioSwitch, NcLoadingIcon } from '@nextcloud/vue'
import CnWizardDialog from '../CnWizardDialog/CnWizardDialog.vue'
import { fieldsFromSchema } from '../../utils/schema.js'

/**
 * CnSetupWizard — abstract, manifest-driven first-time setup wizard (ADR-042).
 *
 * Wraps {@link CnWizardDialog} and renders a `manifest.setup.steps[]` array by
 * each step's `type`: `info` (note), `config-fields` (fields from a JSON Schema
 * via `fieldsFromSchema`, the same field shapes the admin pages use), `choice`
 * (`NcSelect` persisting to an app-config key), `run-action` (POST a privileged
 * server action), `summary` (recap), and `component` (a parent-provided
 * `#step-<id>` slot). It NEVER writes OpenRegister objects from the browser —
 * all persistence goes through the per-app setup contract
 * (`POST /apps/{appId}/api/setup/config` and `/api/setup/action/{actionId}`).
 *
 * Mount it gated by `CnAppRoot`'s setup phase, or open it on demand from
 * `CnAdminSettingsShell`.
 *
 * ```vue
 * <CnSetupWizard
 *   :app-id="'procest'"
 *   :steps="manifest.setup.steps"
 *   @complete="onSetupComplete"
 *   @close="showWizard = false" />
 * ```
 */
export default {
	name: 'CnSetupWizard',

	components: {
		CnWizardDialog,
		NcButton,
		NcNoteCard,
		NcSelect,
		NcTextField,
		NcCheckboxRadioSwitch,
		NcLoadingIcon,
	},

	inject: {
		/**
		 * Consumer translation function, provided by CnAppRoot as
		 * `cnTranslate: this.translate` (bound to the host app's id). Step field
		 * labels come from schema property titles, authored in English as the
		 * canonical source; the visible label is resolved through this function
		 * so it follows the user's language. Defaults to identity when used
		 * standalone (no CnAppRoot ancestor).
		 */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/** The Nextcloud app id; used to build the `/apps/{appId}/api/setup/*` URLs. */
		appId: {
			type: String,
			required: true,
		},
		/** The `manifest.setup.steps` array to render. */
		steps: {
			type: Array,
			default: () => [],
		},
		/** Dialog title. */
		dialogTitle: {
			type: String,
			default: () => t('nextcloud-vue', 'Set up this app'),
		},
		/** Final-step submit button label. */
		submitLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Finish'),
		},
		/** Cancel button label. */
		cancelLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Cancel'),
		},
		/** Next button label. */
		nextLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Next'),
		},
		/** Back button label. */
		backLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Back'),
		},
		/** Run-action button label. */
		runLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Run'),
		},
		/** Result-phase success text. */
		successText: {
			type: String,
			default: () => t('nextcloud-vue', 'Setup complete.'),
		},
		/**
		 * Whether the wizard can be dismissed before finishing (Cancel
		 * button, ESC, backdrop click). Pass `false` when a REQUIRED step
		 * is unmet and the host is gating its shell behind this wizard
		 * (ADR-042) — an offered-but-non-functional Cancel would be
		 * misleading. Optional-only setup stays cancellable (default).
		 *
		 * @type {boolean}
		 */
		cancellable: {
			type: Boolean,
			default: true,
		},
		/**
		 * Ids of steps the SERVER already reports as done (e.g.
		 * `useSetupStatus(...).steps` filtered to `done === true`), passed by
		 * the host so a freshly (re)mounted wizard doesn't re-ask something
		 * already persisted in an earlier session — this component's own
		 * `localDone`/`choiceModel` only track the CURRENT session and reset
		 * blank on every mount. Drives both the initial step (`initialStepId`)
		 * and the summary page's done markers.
		 *
		 * @type {Array<string>}
		 */
		completedStepIds: {
			type: Array,
			default: () => [],
		},
	},

	emits: ['complete', 'close', 'step-change', 'action-result'],

	data() {
		return {
			choiceModel: {},
			choiceValues: {},
			configModel: {},
			running: {},
			actionResult: {},
			localDone: {},
			userTouched: {},
		}
	},

	computed: {
		setupSteps() {
			return (this.steps || []).filter((s) => s && s.id && s.type)
		},
		wizardSteps() {
			return this.setupSteps.map((s) => ({
				id: s.id,
				label: s.title || s.id,
				optional: s.required !== true,
			}))
		},
		/**
		 * Recap rows for the `summary` step — one per non-summary step, with
		 * the value the user selected (choice label / config field values) and
		 * a done marker (info steps always done; choice steps done when picked;
		 * run-action steps done when the action succeeded).
		 *
		 * @return {Array<{ id: string, title: string, value: string, done: boolean }>}
		 */
		summaryItems() {
			return this.setupSteps
				.filter((s) => s.type !== 'summary')
				.map((step) => {
					let value = ''
					if (step.type === 'choice') {
						const raw = this.choiceModel[step.id]
						if (Array.isArray(raw)) {
							value = raw.map((o) => (o && o.label ? o.label : o)).join(', ')
						} else if (raw && raw.label) {
							value = raw.label
						} else if (raw != null && raw !== '') {
							value = String(raw)
						}
					} else if (step.type === 'config-fields') {
						value = this.fieldsFor(step)
							.map((f) => `${f.label}: ${this.configModel[f.key] != null ? this.configModel[f.key] : ''}`)
							.join(', ')
					}
					let done
					if (step.type === 'info') {
						done = true
					} else if (step.type === 'choice') {
						done = this.hasChoice(step) || this.isServerDone(step.id)
					} else {
						done = this.isStepDone(step.id)
					}
					return { id: step.id, title: step.title || step.id, value, done }
				})
		},
		/**
		 * Id of the step the wizard should open on when RESUMING: the first
		 * non-`info`/`summary` step not already done, per the CURRENT session's
		 * local state OR the server-reported `completedStepIds` (a prior
		 * session). Falls back to `''` (CnWizardDialog's own first-step default)
		 * on a fresh setup and when every actionable step is already done.
		 *
		 * @return {string}
		 */
		initialStepId() {
			// Fresh setup — nothing done anywhere yet, so there is nothing to
			// resume past. Start at step one so a leading `info`/welcome step is
			// actually seen; resuming is only for returning sessions.
			if (this.completedStepIds.length === 0) {
				return ''
			}
			const actionable = this.setupSteps.filter((s) => s.type !== 'info' && s.type !== 'summary')
			const firstUnmet = actionable.find((s) => {
				if (s.type === 'choice') return !(this.hasChoice(s) || this.isServerDone(s.id))
				return !this.isStepDone(s.id)
			})
			return firstUnmet ? firstUnmet.id : ''
		},
	},

	methods: {
		stepSlot(step) {
			return 'step-' + step.id
		},
		hasCustomSlot(id) {
			return !!this.$slots['step-' + id] || !!this.$slots['step-' + id]
		},
		fieldsFor(step) {
			if (step.schema && typeof step.schema === 'object') {
				return fieldsFromSchema(step.schema, { translate: this.cnTranslate })
			}
			// Fallback: a plain text field per declared config key.
			return (step.configKeys || []).map((key) => ({ key, label: key, widget: 'text' }))
		},
		/**
		 * Options for a `choice` step. When the step declares `dependsOn`
		 * (a parent step's configKey) + `optionsByParent`, the option list
		 * is the entry keyed by the parent's currently-selected value — this
		 * is the country → organisation-type cascade. Otherwise the static
		 * `options` array.
		 *
		 * @param {object} step The choice step definition.
		 * @return {Array} The option list to render.
		 */
		optionsFor(step) {
			if (step.dependsOn && step.optionsByParent) {
				const parentValue = this.choiceValues[step.dependsOn]
				if (parentValue == null || parentValue === '') return []
				return step.optionsByParent[parentValue] || []
			}
			return step.options || []
		},
		isChoiceDisabled(step) {
			if (!step.dependsOn) return false
			const parentValue = this.choiceValues[step.dependsOn]
			return parentValue == null || parentValue === ''
		},
		dependsOnHint(step) {
			const parent = this.setupSteps.find((s) => s.configKey === step.dependsOn)
			const label = parent ? (parent.title || parent.id) : step.dependsOn
			return t('nextcloud-vue', 'Select "{step}" first.', { step: label })
		},
		hasChoice(step) {
			const v = this.choiceModel[step.id]
			if (step.multiple === true) {
				return Array.isArray(v) && v.length > 0
			}
			return v != null && v !== ''
		},
		scalarChoice(step) {
			const raw = this.choiceModel[step.id]
			if (step.multiple === true) {
				return (raw || []).map((o) => (o && o.value !== undefined ? o.value : o))
			}
			return raw && raw.value !== undefined ? raw.value : raw
		},
		onChoice(step, value) {
			this.userTouched[step.id] = true
			this.choiceModel[step.id] = value
			if (step.configKey) {
				this.choiceValues[step.configKey] = this.scalarChoice(step)
			}
			// Reset any dependent child choices when the parent changes.
			for (const child of this.setupSteps) {
				if (child.dependsOn && child.dependsOn === step.configKey) {
					this.choiceModel[child.id] = child.multiple === true ? [] : null
					this.userTouched[child.id] = false
					if (child.configKey) this.choiceValues[child.configKey] = ''
				}
			}
			// Re-apply auto-suggestions for steps that derive a default from this one.
			for (const dep of this.setupSteps) {
				if (dep.suggestFrom && dep.suggestFrom === step.configKey) {
					this.applySuggestion(dep)
				}
			}
		},
		/**
		 * Auto-fill a `choice` step's suggested default from an earlier choice
		 * (its `suggestFrom` configKey → `suggestMap[parentValue]`). No-op once
		 * the user has manually picked here, so a suggestion never clobbers an
		 * explicit choice.
		 *
		 * @param {object} step The dependent choice step.
		 * @return {void}
		 */
		applySuggestion(step) {
			if (this.userTouched[step.id] === true) return
			const parentValue = this.choiceValues[step.suggestFrom]
			if (parentValue == null || parentValue === '') return
			const wanted = (step.suggestMap || {})[parentValue]
			if (wanted == null) return
			const opt = this.optionsFor(step).find((o) => o.value === wanted) || { value: wanted, label: String(wanted) }
			this.choiceModel[step.id] = opt
			if (step.configKey) this.choiceValues[step.configKey] = wanted
		},
		/**
		 * CnWizardDialog `validate` hook — intercepts Next/Submit to persist
		 * the active step before advancing. `choice`/`config-fields` steps
		 * POST their value via the setup contract; required `choice` steps
		 * block advance until a value is picked; required `run-action` steps
		 * block until the action has succeeded. Returns `true` to advance or
		 * an error string to surface above the step and block navigation.
		 *
		 * @param {string} stepId The active step id.
		 * @return {Promise<boolean|string>} True to advance, or an error message.
		 */
		async validateStep(stepId) {
			const step = this.setupSteps.find((s) => s.id === stepId)
			if (!step) return true
			if (step.type === 'choice') {
				if (!this.hasChoice(step)) {
					// Already persisted server-side and the user only back-navigated
					// onto it — `choiceModel` is blank because it's session-local, not
					// because nothing is set. Don't force a re-pick, and don't re-POST.
					if (this.isServerDone(step.id)) {
						return true
					}
					return step.required === true
						? t('nextcloud-vue', 'Please make a selection to continue.')
						: true
				}
				try {
					await this.saveConfig({ [step.configKey]: this.scalarChoice(step) })
					this.localDone[step.id] = true
					return true
				} catch (err) {
					return this.errorMessage(err)
				}
			}
			if (step.type === 'config-fields') {
				try {
					const patch = {}
					for (const field of this.fieldsFor(step)) {
						patch[field.key] = this.configModel[field.key]
					}
					await this.saveConfig(patch)
					this.localDone[step.id] = true
					return true
				} catch (err) {
					return this.errorMessage(err)
				}
			}
			if (step.type === 'run-action' && step.required === true && !this.isStepDone(step.id)) {
				return t('nextcloud-vue', 'Please run this step before continuing.')
			}
			return true
		},
		/**
		 * Persist one or more app-config values via the setup contract.
		 *
		 * @param {object} patch `{ <configKey>: value }` to write.
		 * @return {Promise<void>}
		 */
		async saveConfig(patch) {
			const [{ default: axios }, { generateUrl }] = await Promise.all([
				import('@nextcloud/axios'),
				import('@nextcloud/router'),
			])
			await axios.post(generateUrl(`/apps/${this.appId}/api/setup/config`), patch)
		},
		async runAction(step) {
			this.running[step.id] = true
			this.actionResult[step.id] = null
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const { data } = await axios.post(
					generateUrl(`/apps/${this.appId}/api/setup/action/${step.action}`),
				)
				const result = {
					success: data && data.success !== false,
					message: (data && data.message) || t('nextcloud-vue', 'Done.'),
				}
				this.actionResult[step.id] = result
				if (result.success) {
					this.localDone[step.id] = true
				}
				/**
				 * @event action-result Emitted when a `run-action` step finishes.
				 * @type {{ stepId: string, action: string, success: boolean, message: string }}
				 */
				this.$emit('action-result', { stepId: step.id, action: step.action, ...result })
			} catch (err) {
				this.actionResult[step.id] = { success: false, message: this.errorMessage(err) }
				this.$emit('action-result', { stepId: step.id, action: step.action, success: false, message: this.errorMessage(err) })
			} finally {
				this.running[step.id] = false
			}
		},
		isStepDone(id) {
			return this.isServerDone(id) || this.localDone[id] === true || (this.actionResult[id] && this.actionResult[id].success)
		},
		/**
		 * Whether the server already reported this step done in a prior
		 * session, via the `completedStepIds` prop.
		 *
		 * @param {string} id Step id.
		 * @return {boolean}
		 */
		isServerDone(id) {
			return this.completedStepIds.includes(id)
		},
		onSubmit() {
			if (this.$refs.wizard && this.$refs.wizard.setResult) {
				this.$refs.wizard.setResult({ success: true, message: this.successText })
			}
			/**
			 * @event complete Emitted when the last step is submitted (setup finished).
			 */
			this.$emit('complete')
		},
		onStepChange(payload) {
			// Pre-fill a suggested default when entering a step that derives one.
			const step = this.setupSteps.find((s) => s.id === payload.stepId)
			if (step && step.suggestFrom) {
				this.applySuggestion(step)
			}
			/**
			 * @event step-change Emitted when the active step changes.
			 * @type {{ stepId: string, stepIndex: number, direction: string }}
			 */
			this.$emit('step-change', payload)
		},
		onClose() {
			/**
			 * @event close Emitted when the dialog should close.
			 */
			this.$emit('close')
		},
		errorMessage(err) {
			const data = err && err.response && err.response.data
			if (data && (data.message || data.error)) {
				return data.message || data.error
			}
			return (err && err.message) || t('nextcloud-vue', 'Something went wrong.')
		},
	},
}
</script>

<style scoped>
.cn-setup-step {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-setup-step__nav {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
	margin-top: 8px;
}

.cn-setup-field {
	display: flex;
	flex-direction: column;
}

.cn-setup-summary {
	list-style: none;
	padding: 0;
	margin: 0;
}

.cn-setup-summary__item {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 4px 0;
	color: var(--color-text-maxcontrast);
}

.cn-setup-summary__item--done {
	color: var(--color-main-text);
}

.cn-setup-summary__mark {
	font-weight: bold;
	color: var(--color-success);
}

.cn-setup-summary__label {
	flex: 0 0 auto;
}

.cn-setup-summary__value {
	margin-inline-start: auto;
	font-weight: 600;
	color: var(--color-main-text);
}
</style>
