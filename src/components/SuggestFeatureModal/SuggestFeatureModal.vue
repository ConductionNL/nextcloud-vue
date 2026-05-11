<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		:can-close="!submitting"
		@closing="$emit('close')">
		<div class="cn-suggest-feature-modal">
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

			<NcNoteCard v-if="inlineError !== ''" type="error">
				{{ inlineError }}
			</NcNoteCard>
		</div>

		<template #actions>
			<NcButton @click="$emit('close')">
				{{ cancelLabel }}
			</NcButton>
			<NcButton
				type="primary"
				:disabled="!canSubmit || submitting"
				@click="submit">
				<template v-if="submitting" #icon>
					<NcLoadingIcon :size="20" />
				</template>
				{{ submitLabel }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * SuggestFeatureModal — feature-request submission dialog. Posts to the
 * OpenRegister `github-issue-proxy` POST endpoint with CSRF token. Live
 * preview pane uses the same `marked` + `DOMPurify` pipeline as
 * `RoadmapItem`, sharing the exported `SAFE_MARKDOWN_DOMPURIFY_CONFIG`.
 *
 * Spec: features-roadmap-component — Requirement "SuggestFeatureModal".
 */
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { translate as t } from '@nextcloud/l10n'
import {
	NcDialog, NcButton, NcTextField, NcTextArea,
	NcNoteCard, NcLoadingIcon, NcCheckboxRadioSwitch,
} from '@nextcloud/vue'
import DOMPurify from 'dompurify'

import { cnRenderMarkdown } from '../../composables/cnRenderMarkdown.js'
import { SAFE_MARKDOWN_DOMPURIFY_CONFIG } from '../../utils/safeMarkdownDompurifyConfig.js'

export default {
	name: 'SuggestFeatureModal',

	components: {
		NcDialog, NcButton, NcTextField, NcTextArea,
		NcNoteCard, NcLoadingIcon, NcCheckboxRadioSwitch,
	},

	props: {
		/**
		 * `<owner>/<repo>` to post the new issue to.
		 */
		repo: {
			type: String,
			required: true,
		},
		/**
		 * Optional kebab-case capability slug. When non-null, becomes the
		 * `specRef` field in the POST body so the issue gets a `specRef:<slug>`
		 * label and the body suffix on the GitHub side.
		 */
		specRef: {
			type: String,
			default: null,
		},
	},

	emits: ['submitted', 'close'],

	data() {
		return {
			form: { title: '', body: '' },
			showPreview: false,
			submitting: false,
			inlineError: '',
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
		dialogTitle() { return t('nextcloud-vue', 'Suggest a feature') },
		titleLabel() { return t('nextcloud-vue', 'Title') },
		titleHelper() { return t('nextcloud-vue', 'A short summary of what you would like built.') },
		bodyLabel() { return t('nextcloud-vue', 'Description') },
		bodyHelper() { return t('nextcloud-vue', 'Markdown is supported. The submission will be filed as a GitHub issue.') },
		previewLabel() { return t('nextcloud-vue', 'Show markdown preview') },
		submitLabel() { return t('nextcloud-vue', 'Submit') },
		cancelLabel() { return t('nextcloud-vue', 'Cancel') },
	},

	methods: {
		async submit() {
			if (!this.canSubmit || this.submitting) return
			this.submitting = true
			this.inlineError = ''
			try {
				const url = generateUrl('/apps/openregister/api/github/issues')
				const payload = {
					repo: this.repo,
					title: this.form.title.trim(),
					body: this.form.body.trim(),
				}
				if (this.specRef !== null && this.specRef !== '') {
					payload.specRef = this.specRef
				}
				const response = await axios.post(url, payload)
				this.$emit('submitted', response.data)
				this.$emit('close')
			} catch (e) {
				const status = e?.response?.status
				const code = e?.response?.data?.error
				const retryAfter = e?.response?.data?.retry_after
				if (status === 429 && (code === 'rate_limited' || retryAfter)) {
					this.inlineError = t('nextcloud-vue', 'Submitting too fast — please wait {seconds}s and try again.', { seconds: retryAfter || 60 })
				} else if (code === 'github_pat_not_configured') {
					this.inlineError = t('nextcloud-vue', 'GitHub submissions are not configured on this server. Ask your administrator.')
				} else if (code === 'title_invalid_length' || code === 'body_invalid_length') {
					this.inlineError = t('nextcloud-vue', 'Server rejected the submission — title or body length out of range.')
				} else {
					this.inlineError = t('nextcloud-vue', 'Could not submit — please retry. If the issue persists, file it directly on GitHub.')
				}
			} finally {
				this.submitting = false
			}
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
</style>
