<template>
	<NcDialog
		:name="dialogTitle"
		size="large"
		:can-close="true"
		@closing="$emit('close')">
		<div class="cn-suggest-feature-modal" data-testid="cn-modal" data-testid-modal="cn-suggest-feature-modal">
			<NcNoteCard type="info" class="cn-suggest-feature-modal__intro">
				<strong>{{ introTitle }}</strong>
				<p class="cn-suggest-feature-modal__intro-body">
					{{ introBody }}
				</p>
			</NcNoteCard>

			<NcTextField
				v-model="form.title"
				:label="titleLabel"
				:maxlength="200"
				:error="titleError !== ''"
				:helper-text="titleError || titleHelper"
				required />

			<NcTextArea
				v-model="form.problem"
				:label="problemLabel"
				:maxlength="4000"
				:error="problemError !== ''"
				:helper-text="problemError || problemHelper"
				required
				:rows="4" />

			<NcTextArea
				v-model="form.proposedSolution"
				:label="proposedSolutionLabel"
				:maxlength="4000"
				:error="proposedSolutionError !== ''"
				:helper-text="proposedSolutionError || proposedSolutionHelper"
				required
				:rows="4" />

			<NcTextArea
				v-model="form.whoBenefits"
				:label="whoBenefitsLabel"
				:maxlength="2000"
				:error="whoBenefitsError !== ''"
				:helper-text="whoBenefitsError || whoBenefitsHelper"
				required
				:rows="3" />

			<NcSelect
				v-model="form.priorityToYou"
				:label="priorityLabel"
				:options="priorityOptions"
				:input-label="priorityLabel"
				:placeholder="priorityHelper"
				:clearable="false" />

			<NcTextArea
				v-model="form.anythingElse"
				:label="anythingElseLabel"
				:maxlength="4000"
				:helper-text="anythingElseHelper"
				:rows="3" />

			<NcNoteCard type="info" class="cn-suggest-feature-modal__github-info">
				<strong>{{ githubInfoTitle }}</strong>
				<p class="cn-suggest-feature-modal__github-info-body">
					{{ githubInfoBody }}
				</p>
			</NcNoteCard>
		</div>

		<template #actions>
			<NcButton @click="$emit('close')">
				{{ cancelLabel }}
			</NcButton>
			<NcButton
				:disabled="!canSubmit || !conductionSubmitEnabled"
				:title="conductionSubmitEnabled ? '' : conductionDisabledTooltip"
				@click="submitToConduction">
				{{ conductionSubmitLabel }}
			</NcButton>
			<NcButton
				type="primary"
				:disabled="!canSubmit"
				@click="submitToGithub">
				<template #icon>
					<OpenInNew :size="20" />
				</template>
				{{ githubSubmitLabel }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * SuggestFeatureModal — proposal-grade feature-request dialog. Five
 * structured user-written fields (`title`, `problem`, `proposedSolution`,
 * `whoBenefits`, `priorityToYou`) plus one optional context field
 * (`anythingElse`), mirroring the canonical
 * `.github/ISSUE_TEMPLATE/feature-request.yml` Issue Form. Each field's
 * answer flows directly into the OpenSpec proposal that gets scaffolded
 * once a maintainer applies the `ready-to-build` label.
 *
 * Two submission paths:
 *
 *   - **Submit on GitHub (primary)**: builds a deep-link URL to the
 *     consuming repo's Issue Form with every structured field + the
 *     auto-detected context (`app`, `page`, `surface`, `object`,
 *     `spec-ref`) pre-filled. Opens in a new tab; user reviews +
 *     submits on github.com under their own account. No app PAT, no
 *     proxy, no server-side write path.
 *
 *   - **Send to Conduction (secondary)**: emits `submit-conduction`
 *     with the full structured payload. Parent forwards to the Pipelinq
 *     Contactmoment intake (Path B). Disabled until the parent opts in
 *     via `conduction-submit-enabled`.
 *
 * Top of dialog: an intro NcNoteCard explaining that better-written
 * requests have a higher chance of landing on the roadmap. The cue
 * raises the average quality of submissions without rejecting anything.
 *
 * Spec: features-roadmap-component — Requirement "SuggestFeatureModal".
 */
import { translate as t } from '@nextcloud/l10n'
import {
	NcDialog, NcButton, NcTextField, NcTextArea, NcSelect, NcNoteCard,
} from '@nextcloud/vue'
import OpenInNew from 'vue-material-design-icons/OpenInNew.vue'

const ISSUE_FORM_TEMPLATE = 'feature-request.yml'

export default {
	name: 'CnSuggestFeatureModal',

	components: {
		NcDialog,
		NcButton,
		NcTextField,
		NcTextArea,
		NcSelect,
		NcNoteCard,
		OpenInNew,
	},

	props: {
		/**
		 * `<owner>/<repo>` of the app's GitHub repository. Used to build
		 * the Issue Form deep-link URL.
		 */
		repo: {
			type: String,
			required: true,
		},
		/**
		 * Optional kebab-case capability slug. When set, becomes the
		 * `spec-ref` query parameter so GitHub pre-fills the matching form
		 * field — links the suggestion to an existing capability.
		 * @type {string|null}
		 */
		specRef: {
			type: String,
			default: null,
		},
		/**
		 * Optional auto-captured context. Each non-empty value becomes a
		 * matching query parameter on the deep-link so GitHub's Issue
		 * Form renders with the field pre-filled. Mirrors the field ids
		 * declared in `.github/ISSUE_TEMPLATE/feature-request.yml`.
		 * @type {string}
		 */
		app: { type: String, default: '' },
		/**
		 * Manifest page id + route the user was viewing when the modal
		 * opened. Auto-filled by `CnFeaturesAndRoadmapView`.
		 * @type {string}
		 */
		page: { type: String, default: '' },
		/**
		 * Open modal name, active widget id, or sidebar tab at suggestion
		 * time. Auto-filled when available.
		 * @type {string}
		 */
		surface: { type: String, default: '' },
		/**
		 * Register · Schema · UUID of the object the page was viewing,
		 * if any. Auto-filled when available.
		 * @type {string}
		 */
		object: { type: String, default: '' },
		/**
		 * Opt-in switch for the Path B "Send to Conduction" button. When
		 * `false` (default) the button is rendered disabled with a
		 * tooltip — appropriate while the Pipelinq Contactmoment intake
		 * endpoint isn't wired. Set to `true` from apps that have
		 * implemented the Path B endpoint.
		 */
		conductionSubmitEnabled: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['submit-conduction', 'close'],

	data() {
		return {
			form: {
				title: '',
				problem: '',
				proposedSolution: '',
				whoBenefits: '',
				priorityToYou: '',
				anythingElse: '',
			},
		}
	},

	computed: {
		// ── Field validators ─────────────────────────────────────────
		titleError() {
			const len = this.form.title.trim().length
			if (len === 0) return ''
			if (len < 3) return t('nextcloud-vue', 'Title must be at least 3 characters.')
			if (len > 200) return t('nextcloud-vue', 'Title must be at most 200 characters.')
			return ''
		},
		problemError() {
			const len = this.form.problem.trim().length
			if (len === 0) return ''
			if (len < 10) return t('nextcloud-vue', 'Tell us a bit more — at least 10 characters.')
			return ''
		},
		proposedSolutionError() {
			const len = this.form.proposedSolution.trim().length
			if (len === 0) return ''
			if (len < 10) return t('nextcloud-vue', 'Tell us a bit more — at least 10 characters.')
			return ''
		},
		whoBenefitsError() {
			const len = this.form.whoBenefits.trim().length
			if (len === 0) return ''
			if (len < 5) return t('nextcloud-vue', 'Tell us a bit more — at least 5 characters.')
			return ''
		},
		canSubmit() {
			return this.form.title.trim().length >= 3
				&& this.form.title.trim().length <= 200
				&& this.form.problem.trim().length >= 10
				&& this.form.proposedSolution.trim().length >= 10
				&& this.form.whoBenefits.trim().length >= 5
				&& this.form.priorityToYou !== '' && this.form.priorityToYou !== null
		},

		// ── Deep-link builder ────────────────────────────────────────
		/**
		 * Build the GitHub Issue Form deep-link. Each query parameter
		 * matches an `id:` from `.github/ISSUE_TEMPLATE/feature-request.yml`.
		 *
		 * @return {string} Absolute github.com URL safe to pass to window.open.
		 */
		githubIssueUrl() {
			const params = new URLSearchParams()
			params.set('template', ISSUE_FORM_TEMPLATE)
			params.set('title', `[FEATURE] ${this.form.title.trim()}`)
			params.set('problem', this.form.problem.trim())
			params.set('proposed-solution', this.form.proposedSolution.trim())
			params.set('who-benefits', this.form.whoBenefits.trim())
			if (this.priorityValue) params.set('priority-to-you', this.priorityValue)
			if (this.form.anythingElse.trim()) params.set('context', this.form.anythingElse.trim())
			if (this.app) params.set('app', this.app)
			if (this.page) params.set('page', this.page)
			if (this.surface) params.set('surface', this.surface)
			if (this.object) params.set('object', this.object)
			if (this.specRef) params.set('spec-ref', this.specRef)
			return `https://github.com/${this.repo}/issues/new?${params.toString()}`
		},
		priorityValue() {
			const v = this.form.priorityToYou
			if (v === null || v === '') return ''
			// Handle both raw-string and {label,value} option shapes from NcSelect.
			return typeof v === 'object' ? (v.label || v.value || '') : v
		},
		priorityOptions() {
			return [
				t('nextcloud-vue', 'Nice to have'),
				t('nextcloud-vue', 'Would use weekly'),
				t('nextcloud-vue', 'Would use daily'),
				t('nextcloud-vue', 'Blocking me right now'),
			]
		},

		// ── Localised labels ─────────────────────────────────────────
		dialogTitle() { return t('nextcloud-vue', 'Suggest a feature') },
		introTitle() { return t('nextcloud-vue', 'Help us land this faster.') },
		introBody() {
			return t(
				'nextcloud-vue',
				'We read every feature request. The clearer the problem and the more concrete the solution, the better the chance we add it to the roadmap and ship it. The fields below mirror the OpenSpec proposal we write internally, so good answers here become a draft proposal directly.',
			)
		},

		titleLabel() { return t('nextcloud-vue', 'Title') },
		titleHelper() { return t('nextcloud-vue', 'A short summary in one sentence. Example: "Filter contacts by last interaction date".') },

		problemLabel() { return t('nextcloud-vue', 'Problem') },
		problemHelper() { return t('nextcloud-vue', 'What can you not do today? What is the friction? Write from your own perspective. Required.') },

		proposedSolutionLabel() { return t('nextcloud-vue', 'Proposed solution') },
		proposedSolutionHelper() { return t('nextcloud-vue', 'How would you like it to work? Sketches, references, examples welcome. "I am not sure" is also a valid answer. Required.') },

		whoBenefitsLabel() { return t('nextcloud-vue', 'Who benefits') },
		whoBenefitsHelper() { return t('nextcloud-vue', 'Which role or workflow does this serve? Be specific. Required.') },

		priorityLabel() { return t('nextcloud-vue', 'How important is this to you?') },
		priorityHelper() { return t('nextcloud-vue', 'Honest self-assessment helps us prioritise.') },

		anythingElseLabel() { return t('nextcloud-vue', 'Anything else?') },
		anythingElseHelper() { return t('nextcloud-vue', 'Edge cases, alternatives you considered, things to avoid, related capabilities. Optional.') },

		cancelLabel() { return t('nextcloud-vue', 'Cancel') },
		githubSubmitLabel() { return t('nextcloud-vue', 'Continue on GitHub') },
		conductionSubmitLabel() { return t('nextcloud-vue', 'Send to Conduction') },
		conductionDisabledTooltip() { return t('nextcloud-vue', 'Coming soon. Contact Conduction for early access.') },
		githubInfoTitle() { return t('nextcloud-vue', 'Why continue on GitHub?') },
		githubInfoBody() { return t('nextcloud-vue', 'Posting on GitHub uses your own account. You get credit when the feature ships, see live comments and status, and the maintainers can ping you for follow-up. No GitHub account? Use "Send to Conduction". We file it for you, no public exposure.') },
	},

	methods: {
		/**
		 * Path A: open the pre-filled GitHub Issue Form in a new tab.
		 * Fully client-side — no server proxy, no app PAT, the issue
		 * gets posted under the user's own GitHub identity once they
		 * submit on github.com.
		 *
		 * @return {void}
		 */
		submitToGithub() {
			if (!this.canSubmit) return
			window.open(this.githubIssueUrl, '_blank', 'noopener,noreferrer')
			this.$emit('close')
		},
		/**
		 * Path B: hand the form payload + context to the parent. The
		 * parent decides what to do — typically POSTs to a Pipelinq
		 * Contactmoment endpoint that surfaces the request inside the
		 * Conduction CRM without exposing it publicly.
		 *
		 * @return {void}
		 */
		submitToConduction() {
			if (!this.canSubmit || !this.conductionSubmitEnabled) return
			/**
			 * Emitted when the user picks the Conduction (Path B)
			 * submission instead of GitHub. Parent must wire the actual
			 * intake endpoint; the modal just collects + forwards. Payload
			 * mirrors the Issue Form fields 1:1.
			 *
			 * @event submit-conduction
			 * @type {{title: string, problem: string, proposedSolution: string, whoBenefits: string, priorityToYou: string, anythingElse: string, repo: string, specRef: string|null, app: string, page: string, surface: string, object: string}}
			 */
			this.$emit('submit-conduction', {
				title: this.form.title.trim(),
				problem: this.form.problem.trim(),
				proposedSolution: this.form.proposedSolution.trim(),
				whoBenefits: this.form.whoBenefits.trim(),
				priorityToYou: this.priorityValue,
				anythingElse: this.form.anythingElse.trim(),
				repo: this.repo,
				specRef: this.specRef,
				app: this.app,
				page: this.page,
				surface: this.surface,
				object: this.object,
			})
			this.$emit('close')
		},
	},
}
</script>

<style scoped>
.cn-suggest-feature-modal {
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 8px 0;
}

.cn-suggest-feature-modal__intro,
.cn-suggest-feature-modal__github-info {
	margin: 0;
}

.cn-suggest-feature-modal__intro-body,
.cn-suggest-feature-modal__github-info-body {
	margin: 6px 0 0 0;
	line-height: 1.45;
}
</style>
