<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-journey" data-testid="cn-journey">
		<NcNoteCard v-if="shapeErrors.length > 0" type="error" data-testid="cn-journey-shape-error">
			<p v-for="err in shapeErrors" :key="err.stepId">
				{{ t('nextcloud-vue', 'This journey cannot be shown: step {id}. {message}', { id: err.stepId, message: err.message }) }}
			</p>
		</NcNoteCard>

		<div v-else-if="loading" class="cn-journey__loading">
			<NcLoadingIcon :size="32" />
		</div>

		<div v-else-if="submitted"
			class="cn-journey__done"
			role="status"
			data-testid="cn-journey-done">
			{{ journey.successMessage || t('nextcloud-vue', 'Thank you!') }}
		</div>

		<template v-else>
			<CnProcessSteps
				:steps="progress"
				:current="currentId"
				@select="onSelect" />

			<section v-if="currentStep"
				:key="currentStep.id"
				class="cn-journey__step"
				:aria-labelledby="`cn-journey-title-${currentStep.id}`">
				<h2 :id="`cn-journey-title-${currentStep.id}`" class="cn-journey__title" tabindex="-1">
					{{ currentStep.title }}
				</h2>

				<CnFormPage
					v-if="currentStep.type === 'form'"
					:key="currentStep.id"
					mode="edit"
					:fields="currentStep.form ? currentStep.form.fields : []"
					:steps="currentStep.form && currentStep.form.steps ? currentStep.form.steps : []"
					:initialValue="answers[currentStep.id] || {}"
					:submitLabel="isLastBeforeReview ? t('nextcloud-vue', 'Review') : t('nextcloud-vue', 'Next')"
					submitHandler="journeyStep"
					:customComponents="stepHandlers">
					<template #actions>
						<NcButton
							v-if="history.length > 0"
							type="button"
							variant="tertiary"
							data-testid="cn-journey-back"
							@click="back">
							{{ t('nextcloud-vue', 'Back') }}
						</NcButton>
					</template>
				</CnFormPage>

				<div v-else-if="currentStep.type === 'review'" class="cn-journey__review" data-testid="cn-journey-review">
					<section v-for="group in reviewGroups" :key="group.step.id" class="cn-journey__review-group">
						<div class="cn-journey__review-head">
							<h3>{{ group.step.title }}</h3>
							<NcButton
								type="button"
								variant="tertiary"
								:data-testid="`cn-journey-change-${group.step.id}`"
								@click="goTo(group.step.id)">
								{{ t('nextcloud-vue', 'Change') }}
							</NcButton>
						</div>
						<dl class="cn-journey__review-rows">
							<div v-for="row in group.rows" :key="row.key" class="cn-journey__review-row">
								<dt>{{ row.label }}</dt>
								<dd>
									<CnJourneyReviewList
										v-if="row.list"
										:items="row.value"
										:columns="row.list.columns"
										:headingOptions="row.list.headingOptions"
										:write="row.list.write"
										@change="({ index }) => goTo(group.step.id, { fieldKey: row.key, index })"
										@unfileable="(indexes) => setUnfileable(row.key, indexes)" />
									<template v-else>
										{{ row.text }}
									</template>
								</dd>
							</div>
						</dl>
					</section>

					<p v-if="blocked"
						id="cn-journey-blocked"
						class="cn-journey__blocked"
						role="alert">
						{{ t('nextcloud-vue', 'Some items cannot be filed. Change them to continue.') }}
					</p>
					<NcNoteCard v-if="submitError" type="error">
						{{ submitError }}
					</NcNoteCard>
					<div class="cn-journey__actions">
						<NcButton
							v-if="history.length > 0"
							type="button"
							variant="secondary"
							@click="back">
							{{ t('nextcloud-vue', 'Back') }}
						</NcButton>
						<NcButton
							type="button"
							variant="primary"
							data-testid="cn-journey-submit"
							:disabled="blocked || submitting"
							:aria-describedby="blocked ? 'cn-journey-blocked' : null"
							@click="submit">
							{{ submitLabel || t('nextcloud-vue', 'Submit') }}
						</NcButton>
					</div>
				</div>
			</section>
		</template>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import { createJourneyRunStore } from '../../store/journeyRun.js'
import { findRepeatingWrite } from '../../utils/journeyRepeatingWrite.js'
import { CnFormPage } from '../CnFormPage/index.js'
import { CnJourneyReviewList } from '../CnJourneyReviewList/index.js'
import { CnProcessSteps } from '../CnProcessSteps/index.js'
import { journeyLeaves, journeyShapeErrors } from './journeyModel.js'
import { evaluateJourneyCondition, pickBranchTarget } from './useJourneyBranching.js'

/**
 * CnJourney — the one in-page renderer for an OpenRegister `journey`.
 *
 * A journey is `{ id, title, steps[] }`. A step is `{ id, title, type, ... }`
 * where `type` is `form` (carries `form: { fields, steps? }`, mounted as a
 * `CnFormPage`, so field rendering, `visibleWhen` and validation stay its
 * own) or `review` (every answer so far, grouped by step, with Change). A step
 * with its own `steps[]` is a group, one level deep; `navigable: false` makes
 * the group a heading only. A step or sub-step may carry a `condition`
 * (`visibleWhen`); a step may carry `branch: [{ when, goto }]`. Both are
 * evaluated by the shared `visibleWhen` evaluator and nothing else.
 *
 * Answers are saved to the run as each step completes (through the run store,
 * the only writer), so a run resumes at the recorded step with its answers in
 * this component or in `CnJourneyDialog`. A host supplies mount, chrome and
 * theme only; it does not extend the step, field, validation or branch
 * vocabulary.
 *
 * Example:
 * ```vue
 * <CnJourney :journey="journey" :run-id="$route.query.run" @submitted="done" />
 * ```
 */
export default {
	name: 'CnJourney',

	components: { CnFormPage, CnJourneyReviewList, CnProcessSteps, NcButton, NcLoadingIcon, NcNoteCard },

	props: {
		/**
		 * The journey to render: `{ id, title, steps[], successMessage? }`.
		 *
		 * @type {{id: string, title?: string, steps: Array<object>, successMessage?: string}}
		 */
		journey: {
			type: Object,
			default: () => ({ steps: [] }),
		},

		/** A recorded run to resume. Empty: start a new run on the first completed step. */
		runId: {
			type: String,
			default: '',
		},

		/** A run store to share with another host (for example the dialog). Empty: one is created. */
		store: {
			type: Object,
			default: null,
		},

		/** Run API base for the created store. Empty: OpenRegister's journey-run API. */
		endpoint: {
			type: String,
			default: '',
		},

		/** Label of the final Submit button. Empty: "Submit". */
		submitLabel: {
			type: String,
			default: '',
		},
	},

	emits: ['run-started', 'step', 'submitted'],

	data() {
		const runStore = this.store || createJourneyRunStore({ endpoint: this.endpoint || undefined, journeyId: this.journey.id })
		return {
			runStore,
			loading: false,
			visibility: {},
			history: [],
			currentId: '',
			unfileable: {},
			submitting: false,
			submitted: false,
			submitError: '',
		}
	},

	computed: {
		answers() {
			return this.runStore.state.answers
		},

		merged() {
			return Object.assign({}, ...Object.values(this.answers))
		},

		shapeErrors() {
			return journeyShapeErrors(this.journey)
		},

		allSteps() {
			const all = []
			for (const step of this.journey.steps || []) {
				all.push(step, ...(step.steps || []))
			}
			return all
		},

		visibleSteps() {
			const out = []
			for (const step of this.journey.steps || []) {
				if (!this.isShown(step)) {
					continue
				}
				const original = step.steps || []
				const subs = original.filter((s) => this.isShown(s))
				if (original.length > 0 && subs.length === 0) {
					continue
				}
				out.push({ ...step, steps: subs })
			}
			return out
		},

		leaves() {
			return journeyLeaves(this.visibleSteps)
		},

		progress() {
			return this.visibleSteps.map((step, i) => ({
				id: step.id,
				label: step.title || String(step.id),
				number: i + 1,
				navigable: step.navigable,
				children: step.steps.length > 0 ? step.steps.map((s) => ({ id: s.id, label: s.title || String(s.id) })) : undefined,
			}))
		},

		currentStep() {
			return this.leaves.find((s) => s.id === this.currentId) || this.leaves[0] || null
		},

		isLastBeforeReview() {
			const next = this.leaves[this.leaves.indexOf(this.currentStep) + 1]
			return !!next && next.type === 'review'
		},

		blocked() {
			return Object.values(this.unfileable).some((indexes) => indexes.length > 0)
		},

		reviewGroups() {
			if (!this.currentStep) {
				return []
			}
			const upto = this.leaves.indexOf(this.currentStep)
			return this.leaves.slice(0, upto)
				.filter((s) => s.type === 'form' && this.answers[s.id])
				.map((step) => ({ step, rows: this.rowsFor(step) }))
		},

		stepHandlers() {
			return { journeyStep: (payload) => this.onStepDone(payload) }
		},
	},

	async created() {
		if (this.shapeErrors.length > 0) {
			return
		}
		this.loading = true
		try {
			await this.runStore.resume(this.runId || this.runStore.state.runId)
		} catch {
			// The run could not be loaded; the journey starts clean.
		}
		await this.refreshVisibility(this.merged)
		this.currentId = this.runStore.state.position || ''
		const at = this.leaves.findIndex((s) => s.id === this.currentId)
		this.history = this.leaves.slice(0, Math.max(at, 0)).filter((s) => this.answers[s.id]).map((s) => s.id)
		this.loading = false
	},

	methods: {
		t,

		isShown(step) {
			return step.condition ? this.visibility[step.id] === true : true
		},

		async refreshVisibility(answers) {
			const next = {}
			const onError = (error, cond) => this.runStore.report(error, cond)
			await Promise.all(this.allSteps.filter((s) => s.condition).map(async (s) => {
				next[s.id] = await evaluateJourneyCondition(s.condition, answers, onError)
			}))
			this.visibility = next
		},

		async onStepDone(payload) {
			const step = this.currentStep
			const merged = { ...this.merged, ...payload }
			await this.refreshVisibility(merged)
			const target = await pickBranchTarget(step.branch, merged, (error, cond) => this.runStore.report(error, cond))
			const here = this.leaves.findIndex((s) => s.id === step.id)
			const branched = target !== null ? this.leaves.find((s) => s.id === target) : null
			const next = branched || this.leaves[here + 1]
			const hadRun = this.runStore.state.runId !== null
			await this.runStore.save(step.id, payload, next ? next.id : step.id)
			if (!hadRun) {
				/**
				 * @event run-started Emitted when a new journey run starts. Payload: the run id.
				 * @type {string}
				 */
				this.$emit('run-started', this.runStore.state.runId)
			}
			this.history.push(step.id)
			this.goTo(next ? next.id : step.id, null, true)
		},

		onSelect(id) {
			const leaf = this.leaves.find((s) => s.id === id)
			if (leaf && this.leaves.indexOf(leaf) <= this.leaves.indexOf(this.currentStep)) {
				this.goTo(id)
			}
		},

		back() {
			const previous = this.history[this.history.length - 1]
			if (previous !== undefined) {
				this.history = this.history.slice(0, -1)
				this.goTo(previous, null, true)
			}
		},

		goTo(id, focus, keepHistory = false) {
			const from = this.currentId
			if (!keepHistory && from && from !== id && !this.history.includes(from)) {
				this.history.push(from)
			}
			this.currentId = id
			/**
			 * @event step Emitted when the journey moves to another step.
			 * @type {{from: string, to: string}}
			 */
			/**
			 * @event step Emitted when the journey moves to another step.
			 * @type {{ from: string|null, to: string }}
			 */
			this.$emit('step', { from, to: id })
			this.$nextTick(() => this.focusAfterMove(focus))
		},

		focusAfterMove(focus) {
			const root = this.$el
			if (!root || !root.querySelector) {
				return
			}
			const row = focus ? root.querySelector(`[data-field-key="${focus.fieldKey}"] [data-item-index="${focus.index}"], [data-field-key="${focus.fieldKey}"]`) : null
			const target = row || root.querySelector('.cn-journey__title')
			if (target && typeof target.focus === 'function') {
				target.focus()
			}
		},

		setUnfileable(key, indexes) {
			this.unfileable = { ...this.unfileable, [key]: indexes }
		},

		rowsFor(step) {
			const fields = (step.form && step.form.fields) || []
			const stepAnswers = this.answers[step.id] || {}
			return Object.keys(stepAnswers).map((key) => {
				const field = fields.find((f) => f.key === key) || {}
				const value = stepAnswers[key]
				const label = field.label || field.title || key
				if (Array.isArray(value) && value.length > 0 && value.every((v) => v && typeof v === 'object')) {
					const props = (field.items && field.items.properties) || {}
					const write = findRepeatingWrite(this.allSteps, key)
					const options = write && props[write.targetBy] && Array.isArray(props[write.targetBy].options) ? props[write.targetBy].options : []
					return {
						key,
						label,
						value,
						list: {
							write,
							headingOptions: options,
							columns: Object.keys(props).map((k) => ({ key: k, label: props[k].title || k })),
						},
					}
				}
				return { key, label, value, text: this.formatValue(value, field) }
			})
		},

		formatValue(value, field) {
			if (Array.isArray(value)) {
				return value.length === 0 ? '—' : value.join(', ')
			}
			if (typeof value === 'boolean') {
				return value ? t('nextcloud-vue', 'Yes') : t('nextcloud-vue', 'No')
			}
			if (value === undefined || value === null || value === '') {
				return '—'
			}
			const option = Array.isArray(field.options) ? field.options.find((o) => o && String(o.value) === String(value)) : null
			return option ? option.label : String(value)
		},

		async submit() {
			this.submitting = true
			this.submitError = ''
			try {
				const result = await this.runStore.submit()
				this.submitted = true
				/**
				 * @event submitted Emitted when the run was submitted. Payload: the server's result.
				 * @type {object}
				 */
				this.$emit('submitted', result)
			} catch (error) {
				this.submitError = error && error.message ? error.message : t('nextcloud-vue', 'Submitting failed. Try again.')
			} finally {
				this.submitting = false
			}
		},
	},
}
</script>

<style scoped>
.cn-journey {
	display: flex;
	flex-direction: column;
	gap: 16px;
	color: var(--color-main-text);
}

.cn-journey__review-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.cn-journey__review-rows {
	margin: 0;
}

.cn-journey__review-row {
	display: grid;
	grid-template-columns: minmax(8em, max-content) 1fr;
	gap: 4px 16px;
	padding: 4px 0;
}

.cn-journey__review-row dt {
	color: var(--color-text-maxcontrast);
}

.cn-journey__review-row dd {
	margin: 0;
}

.cn-journey__blocked {
	color: var(--color-error-text);
	font-weight: bold;
}

.cn-journey__actions {
	display: flex;
	gap: 8px;
	margin-top: 16px;
}
</style>
