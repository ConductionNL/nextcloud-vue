<template>
	<NcDialog
		:name="dialogTitle"
		size="large"
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

			<NcNoteCard type="info" class="cn-suggest-feature-modal__forge-info">
				<strong>{{ forgeInfoTitle }}</strong>
				<p class="cn-suggest-feature-modal__forge-info-body">
					{{ forgeInfoBody }}
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
				variant="primary"
				:disabled="!canSubmit"
				@click="submitToForge">
				<template #icon>
					<OpenInNew :size="20" />
				</template>
				{{ forgeSubmitLabel }}
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
 * (`anythingElse`). Each field's answer flows into the proposal that gets
 * scaffolded once a maintainer triages the request.
 *
 * Two submission paths:
 *
 *   - **Continue on the forge (primary)**: builds a pre-filled "new issue"
 *     deep-link on the consuming repo's forge and opens it in a new tab;
 *     the user reviews + submits under their own account. No app token, no
 *     proxy, no server-side write path. The target forge is configurable
 *     via the `forge` prop — Codeberg (Forgejo) by default, GitHub or a
 *     self-hosted Forgejo/Gitea by switching `forge.type` (+ `baseUrl`).
 *     See `utils/forge.js` for how each forge type is deep-linked.
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
import { DEFAULT_FORGE, buildFeatureRequestUrl, forgeDisplayName } from '../../utils/forge.js'

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
		 * `<owner>/<repo>` of the app's repository on the forge. Used to
		 * build the "new issue" deep-link URL.
		 */
		repo: {
			type: String,
			required: true,
		},
		/**
		 * Optional kebab-case capability slug linking the suggestion to an
		 * existing capability. On GitHub it pre-fills the form's spec-ref
		 * field; on Forgejo/Gitea it's recorded in the issue body's context
		 * block.
		 * @type {string|null}
		 */
		specRef: {
			type: String,
			default: null,
		},
		/**
		 * Optional auto-captured context. Each non-empty value is carried
		 * into the deep-link — as a form field on GitHub, or in the issue
		 * body's context block on Forgejo/Gitea/Codeberg.
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
		/**
		 * Target forge for the primary "Continue on …" deep-link. `type`
		 * selects how the issue is pre-filled (`codeberg`/`forgejo`/`gitea`
		 * assemble a Markdown `body`; `github` uses per-field Issue-Form
		 * query params). `baseUrl` overrides the host — required for
		 * self-hosted `forgejo`/`gitea`, optional for `codeberg`/`github`.
		 * Defaults to Codeberg, the fleet's current source of truth.
		 * @type {{type: 'codeberg'|'forgejo'|'gitea'|'github', baseUrl?: string}}
		 */
		forge: {
			type: Object,
			default: () => ({ ...DEFAULT_FORGE }),
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
		 * Build the forge "new issue" deep-link from the structured fields
		 * + auto-captured context. The shape is forge-specific (see
		 * `utils/forge.js`): GitHub gets per-field Issue-Form query params,
		 * Forgejo/Gitea/Codeberg get an assembled Markdown body.
		 *
		 * @return {string} Absolute URL safe to pass to window.open.
		 */
		issueUrl() {
			return buildFeatureRequestUrl(this.forge, this.repo, {
				title: this.form.title.trim(),
				problem: this.form.problem.trim(),
				proposedSolution: this.form.proposedSolution.trim(),
				whoBenefits: this.form.whoBenefits.trim(),
				priorityToYou: this.priorityValue,
				anythingElse: this.form.anythingElse.trim(),
				context: {
					app: this.app,
					page: this.page,
					surface: this.surface,
					object: this.object,
					specRef: this.specRef,
				},
			})
		},
		/**
		 * Display name of the configured forge (proper noun, not
		 * translated) — interpolated into the primary button + info copy.
		 *
		 * @return {string}
		 */
		forgeName() {
			return forgeDisplayName(this.forge && this.forge.type)
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
				'We read every feature request. The clearer the problem and the more concrete the solution, the better the chance we add it to the roadmap and ship it.',
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
		forgeSubmitLabel() { return t('nextcloud-vue', 'Continue on {forge}', { forge: this.forgeName }) },
		conductionSubmitLabel() { return t('nextcloud-vue', 'Send to Conduction') },
		conductionDisabledTooltip() { return t('nextcloud-vue', 'Coming soon. Contact Conduction for early access.') },
		forgeInfoTitle() { return t('nextcloud-vue', 'Why continue on {forge}?', { forge: this.forgeName }) },
		forgeInfoBody() { return t('nextcloud-vue', 'Posting on {forge} uses your own account. You get credit when the feature ships, see live comments and status, and the maintainers can ping you for follow-up. No {forge} account? Use "Send to Conduction". We file it for you, no public exposure.', { forge: this.forgeName }) },
	},

	methods: {
		/**
		 * Path A: open the pre-filled "new issue" form on the configured
		 * forge in a new tab. Fully client-side — no server proxy, no app
		 * token; the issue gets posted under the user's own forge identity
		 * once they submit.
		 *
		 * @return {void}
		 */
		submitToForge() {
			if (!this.canSubmit) return
			window.open(this.issueUrl, '_blank', 'noopener,noreferrer')
			/**
			 * @event close Emitted when the dialog should be closed (cancel, close button, or after a submit hand-off).
			 */
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
			 * submission instead of the forge deep-link. Parent must wire
			 * the actual intake endpoint; the modal just collects +
			 * forwards. Payload carries all six structured fields + context.
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
.cn-suggest-feature-modal__forge-info {
	margin: 0;
}

.cn-suggest-feature-modal__intro-body,
.cn-suggest-feature-modal__forge-info-body {
	margin: 6px 0 0 0;
	line-height: 1.45;
}
</style>
