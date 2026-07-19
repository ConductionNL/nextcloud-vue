<!--
  CnEditSetupModal — edit the working manifest's first-run setup wizard (ADR-042).

  Mutates the passed `working` manifest copy ONLY (never the base): toggle the
  wizard on/off and add, remove, relabel and re-type the `setup.steps[]` a user
  must complete before the app opens. Persistence is owned by the shared
  useManifestEditor (manifestModalDoneMixin). Isolated NcModal per ADR-004.
-->
<template>
	<NcDialog size="normal" :name="t('nextcloud-vue', 'Edit setup wizard')" @closing="$emit('close')">
		<div class="cn-edit-setup">
			<p class="cn-edit-setup__intro">
				{{ t('nextcloud-vue', 'A setup wizard runs the first time a user opens the app. Required steps must be completed before the app opens.') }}
			</p>

			<NcCheckboxRadioSwitch :checked.sync="setup.enabled">
				{{ t('nextcloud-vue', 'Show the setup wizard') }}
			</NcCheckboxRadioSwitch>

			<p v-if="steps.length === 0" class="cn-edit-setup__empty">
				{{ t('nextcloud-vue', 'No steps yet. Add a step to build the wizard.') }}
			</p>

			<ul class="cn-edit-setup__list">
				<li v-for="(step, index) in steps" :key="step.id" class="cn-edit-setup__step">
					<div class="cn-edit-setup__row">
						<NcTextField :label="t('nextcloud-vue', 'Step title')"
							:value.sync="step.title" />
						<NcButton type="tertiary"
							:aria-label="t('nextcloud-vue', 'Remove step')"
							@click="remove(index)">
							<template #icon>
								<Delete :size="20" />
							</template>
						</NcButton>
					</div>
					<label class="cn-edit-setup__type">
						<span>{{ t('nextcloud-vue', 'Type') }}</span>
						<NcSelect v-model="step.type"
							:options="typeOptions"
							:clearable="false"
							:reduce="o => o.id"
							label="label"
							:input-label="t('nextcloud-vue', 'Step type')" />
					</label>
					<NcTextArea :label="t('nextcloud-vue', 'Body')"
						:value.sync="step.body" />
					<NcTextField v-if="step.type === 'config-fields'"
						:label="t('nextcloud-vue', 'Fields to ask for (comma-separated keys, e.g. store_name, contact_email)')"
						:model-value="configKeysText(step)"
						@update:model-value="(v) => setConfigKeys(step, v)" />
					<NcCheckboxRadioSwitch :checked.sync="step.required">
						{{ t('nextcloud-vue', 'Required (must be completed to enter the app)') }}
					</NcCheckboxRadioSwitch>
				</li>
			</ul>
		</div>

		<template #actions>
			<NcButton type="secondary" @click="add">
				<template #icon>
					<Plus :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Add step') }}
			</NcButton>
			<NcButton type="primary" :disabled="saving" @click="onDone">
				<template v-if="saving" #icon>
					<NcLoadingIcon :size="20" />
				</template>
				{{ saving ? t('nextcloud-vue', 'Saving…') : t('nextcloud-vue', 'Done') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { NcDialog, NcButton, NcLoadingIcon, NcTextField, NcTextArea, NcCheckboxRadioSwitch, NcSelect } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import Plus from 'vue-material-design-icons/Plus.vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import manifestModalDoneMixin from '../mixins/manifestModalDoneMixin.js'

export default {
	name: 'CnEditSetupModal',

	components: { NcDialog, NcButton, NcLoadingIcon, NcTextField, NcTextArea, NcCheckboxRadioSwitch, NcSelect, Plus, Delete },

	mixins: [manifestModalDoneMixin],

	props: {
		/**
		 * The working manifest copy whose `setup` block is edited in place.
		 *
		 * @type {object|null}
		 */
		working: {
			type: Object,
			default: null,
		},
	},

	computed: {
		/** The working manifest's setup block. */
		setup() {
			return (this.working && this.working.setup) ? this.working.setup : { enabled: true, steps: [] }
		},
		/** The setup steps array. */
		steps() {
			return this.setup.steps
		},
		/** Selectable step types. */
		typeOptions() {
			return [
				{ id: 'info', label: t('nextcloud-vue', 'Info (a welcome message)') },
				{ id: 'config-fields', label: t('nextcloud-vue', 'Config fields (fill in settings)') },
				{ id: 'choice', label: t('nextcloud-vue', 'Choice (pick from options)') },
				{ id: 'run-action', label: t('nextcloud-vue', 'Run action (call an endpoint)') },
				{ id: 'summary', label: t('nextcloud-vue', 'Summary (recap)') },
			]
		},
	},

	created() {
		// Lazily create the setup block reactively. Assigning a brand-new
		// property on the working manifest must go through $set, or Vue 2 won't
		// track later mutations (added steps wouldn't render).
		if (!this.working) return
		if (!this.working.setup || typeof this.working.setup !== 'object') {
			this.$set(this.working, 'setup', { enabled: true, steps: [] })
		}
		if (!Array.isArray(this.working.setup.steps)) {
			this.$set(this.working.setup, 'steps', [])
		}
	},

	methods: {
		t,
		/** Append a new blank step. */
		add() {
			this.steps.push({ id: `step-${this.steps.length + 1}`, type: 'info', title: '', body: '', required: false })
		},
		/**
		 * Remove the step at index.
		 *
		 * @param {number} index The step index to remove.
		 */
		remove(index) {
			this.steps.splice(index, 1)
		},
		/**
		 * The comma-separated config keys for a config-fields step.
		 *
		 * @param {object} step The step.
		 * @return {string} The keys joined with ", ".
		 */
		configKeysText(step) {
			return Array.isArray(step.configKeys) ? step.configKeys.join(', ') : ''
		},
		/**
		 * Store the config keys (the fields the wizard collects) for a step.
		 * The wizard renders a text field per key and saves them to app config.
		 *
		 * @param {object} step The step to mutate.
		 * @param {string} value The comma-separated keys.
		 */
		setConfigKeys(step, value) {
			const keys = (value || '').split(',').map((k) => k.trim()).filter((k) => k !== '')
			if (keys.length === 0) {
				this.$delete(step, 'configKeys')
			} else {
				this.$set(step, 'configKeys', keys)
			}
		},
	},
}
</script>

<style scoped>
.cn-edit-setup {
	padding: 20px;
}

.cn-edit-setup__intro,
.cn-edit-setup__empty {
	color: var(--color-text-maxcontrast);
	margin-bottom: 12px;
}

.cn-edit-setup__list {
	list-style: none;
	padding: 0;
	margin: 0;
}

.cn-edit-setup__step {
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	padding: 12px;
	margin-bottom: 12px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-edit-setup__row {
	display: flex;
	align-items: flex-end;
	gap: 8px;
}

.cn-edit-setup__type {
	display: flex;
	flex-direction: column;
	gap: 4px;
}
</style>
