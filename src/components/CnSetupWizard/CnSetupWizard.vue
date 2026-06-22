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
		@step-change="onStepChange"
		@submit="onSubmit"
		@close="onClose">
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
					<div class="cn-setup-step__nav">
						<NcButton v-if="!scope.isFirst" @click="scope.back">{{ backLabel }}</NcButton>
						<NcButton type="primary" @click="scope.isLast ? scope.submit() : scope.next()">
							{{ scope.isLast ? submitLabel : nextLabel }}
						</NcButton>
					</div>
				</template>

				<!-- choice -->
				<template v-else-if="step.type === 'choice'">
					<NcSelect
						:input-label="step.title || step.id"
						:options="step.options || []"
						:multiple="step.multiple === true"
						label="label"
						:value="choiceModel[step.id]"
						@input="(v) => onChoice(step, v)" />
					<NcNoteCard v-if="stepError[step.id]" type="error">{{ stepError[step.id] }}</NcNoteCard>
					<div class="cn-setup-step__nav">
						<NcButton v-if="!scope.isFirst" @click="scope.back">{{ backLabel }}</NcButton>
						<NcButton
							type="primary"
							:disabled="saving[step.id] || !hasChoice(step)"
							@click="saveChoiceAndAdvance(step, scope)">
							<template v-if="saving[step.id]" #icon>
								<NcLoadingIcon :size="20" />
							</template>
							{{ scope.isLast ? submitLabel : nextLabel }}
						</NcButton>
					</div>
				</template>

				<!-- config-fields -->
				<template v-else-if="step.type === 'config-fields'">
					<div
						v-for="field in fieldsFor(step)"
						:key="field.key"
						class="cn-setup-field">
						<NcCheckboxRadioSwitch
							v-if="field.widget === 'checkbox'"
							:checked="!!configModel[field.key]"
							@update:checked="(v) => $set(configModel, field.key, v)">
							{{ field.label }}
						</NcCheckboxRadioSwitch>
						<NcSelect
							v-else-if="field.widget === 'select'"
							:input-label="field.label"
							:options="field.enum || []"
							:value="configModel[field.key]"
							@input="(v) => $set(configModel, field.key, v)" />
						<NcTextField
							v-else
							:label="field.label"
							:type="field.widget === 'number' ? 'number' : 'text'"
							:value="configModel[field.key] != null ? String(configModel[field.key]) : ''"
							@update:value="(v) => $set(configModel, field.key, v)" />
					</div>
					<NcNoteCard v-if="stepError[step.id]" type="error">{{ stepError[step.id] }}</NcNoteCard>
					<div class="cn-setup-step__nav">
						<NcButton v-if="!scope.isFirst" @click="scope.back">{{ backLabel }}</NcButton>
						<NcButton
							type="primary"
							:disabled="saving[step.id]"
							@click="saveFieldsAndAdvance(step, scope)">
							<template v-if="saving[step.id]" #icon>
								<NcLoadingIcon :size="20" />
							</template>
							{{ scope.isLast ? submitLabel : nextLabel }}
						</NcButton>
					</div>
				</template>

				<!-- run-action -->
				<template v-else-if="step.type === 'run-action'">
					<NcNoteCard v-if="step.body" type="info">{{ step.body }}</NcNoteCard>
					<NcNoteCard
						v-if="actionResult[step.id]"
						:type="actionResult[step.id].success ? 'success' : 'error'">
						{{ actionResult[step.id].message }}
					</NcNoteCard>
					<div class="cn-setup-step__nav">
						<NcButton v-if="!scope.isFirst" @click="scope.back">{{ backLabel }}</NcButton>
						<NcButton :disabled="running[step.id]" @click="runAction(step)">
							<template v-if="running[step.id]" #icon>
								<NcLoadingIcon :size="20" />
							</template>
							{{ runLabel }}
						</NcButton>
						<NcButton type="primary" @click="scope.isLast ? scope.submit() : scope.next()">
							{{ scope.isLast ? submitLabel : nextLabel }}
						</NcButton>
					</div>
				</template>

				<!-- summary -->
				<template v-else-if="step.type === 'summary'">
					<ul class="cn-setup-summary">
						<li
							v-for="s in setupSteps.filter(x => x.type !== 'summary')"
							:key="s.id"
							class="cn-setup-summary__item"
							:class="{ 'cn-setup-summary__item--done': isStepDone(s.id) }">
							<span class="cn-setup-summary__mark">{{ isStepDone(s.id) ? '✓' : '○' }}</span>
							{{ s.title || s.id }}
						</li>
					</ul>
					<div class="cn-setup-step__nav">
						<NcButton v-if="!scope.isFirst" @click="scope.back">{{ backLabel }}</NcButton>
						<NcButton type="primary" @click="scope.submit()">{{ submitLabel }}</NcButton>
					</div>
				</template>
			</div>
		</template>
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
	},

	emits: ['complete', 'close', 'step-change', 'action-result'],

	data() {
		return {
			choiceModel: {},
			configModel: {},
			saving: {},
			running: {},
			actionResult: {},
			stepError: {},
			localDone: {},
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
	},

	methods: {
		stepSlot(step) {
			return 'step-' + step.id
		},
		hasCustomSlot(id) {
			return !!this.$scopedSlots['step-' + id] || !!this.$slots['step-' + id]
		},
		fieldsFor(step) {
			if (step.schema && typeof step.schema === 'object') {
				return fieldsFromSchema(step.schema)
			}
			// Fallback: a plain text field per declared config key.
			return (step.configKeys || []).map((key) => ({ key, label: key, widget: 'text' }))
		},
		choiceValue(step) {
			return this.choiceModel[step.id]
		},
		hasChoice(step) {
			const v = this.choiceModel[step.id]
			if (step.multiple === true) {
				return Array.isArray(v) && v.length > 0
			}
			return v != null && v !== ''
		},
		onChoice(step, value) {
			this.$set(this.choiceModel, step.id, value)
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
		async saveChoiceAndAdvance(step, scope) {
			this.$set(this.stepError, step.id, '')
			this.$set(this.saving, step.id, true)
			try {
				const raw = this.choiceModel[step.id]
				const value = step.multiple === true
					? (raw || []).map((o) => (o && o.value !== undefined ? o.value : o))
					: (raw && raw.value !== undefined ? raw.value : raw)
				await this.saveConfig({ [step.configKey]: value })
				this.$set(this.localDone, step.id, true)
				scope.isLast ? scope.submit() : scope.next()
			} catch (err) {
				this.$set(this.stepError, step.id, this.errorMessage(err))
			} finally {
				this.$set(this.saving, step.id, false)
			}
		},
		async saveFieldsAndAdvance(step, scope) {
			this.$set(this.stepError, step.id, '')
			this.$set(this.saving, step.id, true)
			try {
				const patch = {}
				for (const field of this.fieldsFor(step)) {
					patch[field.key] = this.configModel[field.key]
				}
				await this.saveConfig(patch)
				this.$set(this.localDone, step.id, true)
				scope.isLast ? scope.submit() : scope.next()
			} catch (err) {
				this.$set(this.stepError, step.id, this.errorMessage(err))
			} finally {
				this.$set(this.saving, step.id, false)
			}
		},
		async runAction(step) {
			this.$set(this.running, step.id, true)
			this.$set(this.actionResult, step.id, null)
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
				this.$set(this.actionResult, step.id, result)
				if (result.success) {
					this.$set(this.localDone, step.id, true)
				}
				/**
				 * @event action-result Emitted when a `run-action` step finishes.
				 * @type {{ stepId: string, action: string, success: boolean, message: string }}
				 */
				this.$emit('action-result', { stepId: step.id, action: step.action, ...result })
			} catch (err) {
				this.$set(this.actionResult, step.id, { success: false, message: this.errorMessage(err) })
				this.$emit('action-result', { stepId: step.id, action: step.action, success: false, message: this.errorMessage(err) })
			} finally {
				this.$set(this.running, step.id, false)
			}
		},
		isStepDone(id) {
			return this.localDone[id] === true || (this.actionResult[id] && this.actionResult[id].success)
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
</style>
