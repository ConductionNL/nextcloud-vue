<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		:can-close="true"
		@closing="$emit('close')">
		<div class="cn-suggest-feature-modal" data-testid="cn-modal" data-testid-modal="cn-suggest-feature-modal">
			<NcTextField
				v-model="form.title"
				:label="titleLabel"
				:maxlength="200"
				:error="titleError !== ''"
				:helper-text="titleError || titleHelper"
				required />

			<NcTextArea
				v-model="form.body"
				:label="bodyLabel"
				:maxlength="10000"
				:error="bodyError !== ''"
				:helper-text="bodyError || bodyHelper"
				required
				:rows="6" />

			<div class="cn-suggest-feature-modal__preview-toggle">
				<NcCheckboxRadioSwitch :checked.sync="showPreview" type="switch">
					{{ previewLabel }}
				</NcCheckboxRadioSwitch>
			</div>

			<div v-if="showPreview" class="cn-suggest-feature-modal__preview" v-html="sanitizedPreview" />

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
 * SuggestFeatureModal — feature-request submission dialog. Offers two
 * submission paths:
 *
 *   - **Submit on GitHub (primary)**: builds a deep-link URL to the
 *     consuming repo's `feature-request.yml` Issue Form with the title
 *     pre-filled in the form's `title` field, the body pre-filled in
 *     the form's first textarea (`problem`), and any auto-detected
 *     context (`app`, `page`, `surface`, `object`, `spec-ref`)
 *     pre-filled in their matching form fields. Opens in a new tab.
 *     User reviews + submits on github.com under their own account.
 *     No server-side GitHub configuration needed — this is a pure
 *     client-side hand-off.
 *
 *   - **Send to Conduction (secondary)**: emits `submit-conduction`
 *     with the form payload + context for the parent to handle (Path
 *     B per the user-feedback flywheel strategy). Disabled unless the
 *     parent opts in via `conduction-submit-enabled`. Parents that
 *     have wired the Pipelinq Contactmoment intake enable it.
 *
 * Live preview pane uses the same `marked` + `DOMPurify` pipeline as
 * `RoadmapItem`, sharing the exported `SAFE_MARKDOWN_DOMPURIFY_CONFIG`.
 *
 * Spec: features-roadmap-component — Requirement "SuggestFeatureModal".
 */
import { translate as t } from '@nextcloud/l10n'
import {
	NcDialog, NcButton, NcTextField, NcTextArea,
	NcNoteCard, NcCheckboxRadioSwitch,
} from '@nextcloud/vue'
import OpenInNew from 'vue-material-design-icons/OpenInNew.vue'
import DOMPurify from 'dompurify'

import { cnRenderMarkdown } from '../../composables/cnRenderMarkdown.js'
import { SAFE_MARKDOWN_DOMPURIFY_CONFIG } from '../../utils/safeMarkdownDompurifyConfig.js'

const ISSUE_FORM_TEMPLATE = 'feature-request.yml'

export default {
	name: 'CnSuggestFeatureModal',

	components: {
		NcDialog,
		NcButton,
		NcTextField,
		NcTextArea,
		NcNoteCard,
		NcCheckboxRadioSwitch,
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
		 * matching query parameter on the deep-link, so GitHub's Issue
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
			form: { title: '', body: '' },
			showPreview: false,
		}
	},

	computed: {
		sanitizedPreview() {
			const html = cnRenderMarkdown(this.form.body)
			return DOMPurify.sanitize(html, SAFE_MARKDOWN_DOMPURIFY_CONFIG)
		},
		titleError() {
			const len = this.form.title.trim().length
			if (len === 0) return ''
			if (len < 3) return t('nextcloud-vue', 'Title must be at least 3 characters.')
			if (len > 200) return t('nextcloud-vue', 'Title must be at most 200 characters.')
			return ''
		},
		bodyError() {
			const len = this.form.body.trim().length
			if (len === 0) return ''
			if (len < 10) return t('nextcloud-vue', 'Body must be at least 10 characters.')
			return ''
		},
		canSubmit() {
			return this.form.title.trim().length >= 3
				&& this.form.title.trim().length <= 200
				&& this.form.body.trim().length >= 10
		},
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
			params.set('problem', this.form.body.trim())
			if (this.app) params.set('app', this.app)
			if (this.page) params.set('page', this.page)
			if (this.surface) params.set('surface', this.surface)
			if (this.object) params.set('object', this.object)
			if (this.specRef) params.set('spec-ref', this.specRef)
			return `https://github.com/${this.repo}/issues/new?${params.toString()}`
		},
		dialogTitle() { return t('nextcloud-vue', 'Suggest a feature') },
		titleLabel() { return t('nextcloud-vue', 'Title') },
		titleHelper() { return t('nextcloud-vue', 'A short summary of what you would like built.') },
		bodyLabel() { return t('nextcloud-vue', 'Description') },
		bodyHelper() { return t('nextcloud-vue', 'Markdown is supported. The submission opens a pre-filled GitHub issue on the app repository.') },
		previewLabel() { return t('nextcloud-vue', 'Show markdown preview') },
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
			 * intake endpoint; the modal just collects + forwards.
			 *
			 * @event submit-conduction
			 * @type {{title: string, body: string, repo: string, specRef: string|null, app: string, page: string, surface: string, object: string}}
			 */
			this.$emit('submit-conduction', {
				title: this.form.title.trim(),
				body: this.form.body.trim(),
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
	gap: 12px;
	padding: 8px 0;
}

.cn-suggest-feature-modal__preview-toggle {
	margin-top: 4px;
}

.cn-suggest-feature-modal__preview {
	border: 1px solid var(--color-border);
	border-radius: 4px;
	padding: 12px;
	background: var(--color-background-hover);
	max-height: 240px;
	overflow-y: auto;
}

.cn-suggest-feature-modal__preview :deep(p) { margin: 4px 0; }
.cn-suggest-feature-modal__preview :deep(pre) { background: var(--color-background-dark); padding: 8px; border-radius: 4px; overflow-x: auto; }
.cn-suggest-feature-modal__preview :deep(code) { background: var(--color-background-dark); padding: 2px 4px; border-radius: 3px; }

.cn-suggest-feature-modal__github-info {
	margin-top: 4px;
}

.cn-suggest-feature-modal__github-info-body {
	margin: 6px 0 0 0;
	line-height: 1.45;
}
</style>
