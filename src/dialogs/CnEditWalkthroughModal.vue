<!--
  CnEditWalkthroughModal — edit the working manifest's guided walkthrough (ADR-043).

  Mutates the passed `working` manifest copy ONLY (never the base): toggle the
  walkthrough on/off, set the primary tour's trigger, and add, remove, relabel
  the coachmark `steps[]` (title, body, task, optional target selector). Persists
  via the shared useManifestEditor (manifestModalDoneMixin). Isolated NcDialog per
  ADR-004. Edits the first tour (the common "getting started" case); a tour with
  no target shows a centred coachmark.
-->
<template>
	<NcDialog size="normal" :name="t('nextcloud-vue', 'Edit walkthrough')" @closing="$emit('close')">
		<p class="cn-edit-walkthrough__intro">
			{{ t('nextcloud-vue', 'A walkthrough is a guided tour that spotlights parts of the app and explains each step. It runs on a user\'s first visit and can be replayed from settings.') }}
		</p>

		<NcCheckboxRadioSwitch :checked.sync="walkthrough.enabled">
			{{ t('nextcloud-vue', 'Show the walkthrough') }}
		</NcCheckboxRadioSwitch>

		<NcTextField class="cn-edit-walkthrough__field"
			:label="t('nextcloud-vue', 'Tour title')"
			:value.sync="tour.title" />

		<label class="cn-edit-walkthrough__trigger">
			<span>{{ t('nextcloud-vue', 'When it runs') }}</span>
			<NcSelect v-model="tour.trigger"
				:options="triggerOptions"
				:clearable="false"
				:reduce="o => o.id"
				label="label"
				:input-label="t('nextcloud-vue', 'Trigger')" />
		</label>

		<h3 class="cn-edit-walkthrough__steps-title">
			{{ t('nextcloud-vue', 'Steps') }}
		</h3>
		<p v-if="steps.length === 0" class="cn-edit-walkthrough__empty">
			{{ t('nextcloud-vue', 'No steps yet. Add a step to build the tour.') }}
		</p>

		<ul class="cn-edit-walkthrough__list">
			<li v-for="(step, index) in steps" :key="step.id" class="cn-edit-walkthrough__step">
				<div class="cn-edit-walkthrough__row">
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
				<NcTextArea :label="t('nextcloud-vue', 'Body')"
					:value.sync="step.body" />
				<NcTextField :label="t('nextcloud-vue', 'Task (the one action for this step)')"
					:value.sync="step.task" />
				<NcTextField :label="t('nextcloud-vue', 'Target (optional CSS selector to spotlight; blank = centred)')"
					:value="targetRef(step)"
					@update:value="setTarget(step, $event)" />
			</li>
		</ul>

		<template #actions>
			<NcButton type="secondary" @click="add">
				<template #icon>
					<Plus :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Add step') }}
			</NcButton>
			<NcButton type="primary" :disabled="saving" @click="onDone">
				<template #icon>
					<NcLoadingIcon v-if="saving" :size="20" />
					<ContentSaveOutline v-else :size="20" />
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
	name: 'CnEditWalkthroughModal',

	components: { NcDialog, NcButton, NcLoadingIcon, NcTextField, NcTextArea, NcCheckboxRadioSwitch, NcSelect, Plus, Delete },

	mixins: [manifestModalDoneMixin],

	props: {
		/**
		 * The working manifest copy whose `walkthrough` block is edited in place.
		 *
		 * @type {object|null}
		 */
		working: {
			type: Object,
			default: null,
		},
	},

	computed: {
		/** The working manifest's walkthrough block. */
		walkthrough() {
			return (this.working && this.working.walkthrough) ? this.working.walkthrough : { enabled: true, tours: [] }
		},
		/** The primary (first) tour. */
		tour() {
			return this.walkthrough.tours[0] || { id: 'getting-started', title: '', trigger: 'first-visit', steps: [] }
		},
		/** The primary tour's steps. */
		steps() {
			return this.tour.steps
		},
		/** Selectable triggers. */
		triggerOptions() {
			return [
				{ id: 'first-visit', label: t('nextcloud-vue', 'On a user\'s first visit') },
				{ id: 'version-bump', label: t('nextcloud-vue', 'After an app upgrade') },
			]
		},
	},

	created() {
		// Lazily create the walkthrough block + primary tour reactively. New
		// properties on the working manifest must go through $set, or Vue 2 won't
		// track later mutations (added steps wouldn't render).
		if (!this.working) return
		if (!this.working.walkthrough || typeof this.working.walkthrough !== 'object') {
			this.$set(this.working, 'walkthrough', { enabled: true, tours: [] })
		}
		if (!Array.isArray(this.working.walkthrough.tours)) {
			this.$set(this.working.walkthrough, 'tours', [])
		}
		if (this.working.walkthrough.tours.length === 0) {
			// eslint-disable-next-line vue/no-mutating-props
			this.working.walkthrough.tours.push({ id: 'getting-started', title: '', trigger: 'first-visit', steps: [] })
		}
		if (!Array.isArray(this.working.walkthrough.tours[0].steps)) {
			this.$set(this.working.walkthrough.tours[0], 'steps', [])
		}
	},

	methods: {
		t,
		/** Append a new blank step. */
		add() {
			this.steps.push({ id: `wt-${this.steps.length + 1}`, title: '', body: '', task: '' })
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
		 * Read a step's target CSS selector (empty string when unset).
		 *
		 * @param {object} step The step.
		 * @return {string} The target selector.
		 */
		targetRef(step) {
			if (!step.target) return ''
			// `selector` is what CnWalkthrough resolves for kind:"selector";
			// fall back to the older `ref` for steps authored before that.
			return step.target.selector || step.target.ref || ''
		},
		/**
		 * Set a step's target as a CSS selector (cleared when blank).
		 *
		 * @param {object} step The step to mutate.
		 * @param {string} value The CSS selector.
		 */
		setTarget(step, value) {
			const v = (value || '').trim()
			if (v === '') {
				this.$delete(step, 'target')
			} else {
				// CnWalkthrough's resolveTarget reads `target.selector` for
				// kind:"selector" (not `ref`), so store it under selector.
				this.$set(step, 'target', { kind: 'selector', selector: v })
			}
		},
	},
}
</script>

<style scoped>
.cn-edit-walkthrough__intro,
.cn-edit-walkthrough__empty {
	color: var(--color-text-maxcontrast);
	margin-bottom: 12px;
}

.cn-edit-walkthrough__field,
.cn-edit-walkthrough__trigger {
	display: block;
	margin-bottom: 12px;
}

.cn-edit-walkthrough__trigger {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-edit-walkthrough__steps-title {
	margin-bottom: 8px;
}

.cn-edit-walkthrough__list {
	list-style: none;
	padding: 0;
	margin: 0;
}

.cn-edit-walkthrough__step {
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	padding: 12px;
	margin-bottom: 12px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-edit-walkthrough__row {
	display: flex;
	align-items: flex-end;
	gap: 8px;
}
</style>
