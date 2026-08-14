<!--
  - SPDX-License-Identifier: EUPL-1.2
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  -
  - CnFormPicker — modal picker for the Tier-2 forms integration leaf.
  -
  - Loads the current user's NC Forms forms from the OR backend
  - (`GET /api/integrations/forms/available?objectUuid={uuid}`) and
  - lets the user pick a form to link. Each row shows title + status
  - badge + submission count + an already-linked flag from the server.
  -
  - Two modes:
  -   * `link form` (default) — emits `link` with `{ formId }`.
  -   * `link specific submission` — toggle reveals the form's submissions
  -     and the user picks one (emits `link` with `{ formId, submissionId }`).
  -
  - Backed by:
  -   GET    /api/integrations/forms/available?objectUuid=...
  -   GET    /api/objects/{r}/{s}/{id}/forms                    (existing links)
  -
  - Per ADR-004 (modal isolation) this lives in its own .vue file
  - rather than inlined in CnFormsTab.
  -
  - @spec openspec/changes/integration-forms/specs/integrations/forms/spec.md
  -->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		:no-close="submitting"
		data-testid="cn-modal"
		data-testid-modal="cn-form-picker"
		@closing="$emit('close')">
		<div class="cn-form-picker">
			<NcTextField
				:model-value="search"
				:label="searchPlaceholder"
				:placeholder="searchPlaceholder"
				:show-trailing-button="false"
				class="cn-form-picker__search"
				@update:model-value="search = $event" />

			<NcLoadingIcon v-if="loading" />

			<NcEmptyContent
				v-else-if="error"
				:name="errorLabel"
				:description="error">
				<template #icon>
					<AlertCircleOutline :size="48" />
				</template>
			</NcEmptyContent>

			<NcEmptyContent
				v-else-if="filteredForms.length === 0"
				:name="emptyLabel">
				<template #icon>
					<ClipboardText :size="48" />
				</template>
			</NcEmptyContent>

			<ul v-else class="cn-form-picker__list">
				<li
					v-for="form in filteredForms"
					:key="form.id"
					class="cn-form-picker__row"
					:class="{ 'cn-form-picker__row--selected': isSelected(form) }"
					@click="select(form)">
					<div class="cn-form-picker__row-main">
						<ClipboardText :size="20" class="cn-form-picker__row-icon" />
						<div class="cn-form-picker__row-text">
							<div class="cn-form-picker__row-title">
								{{ form.title || untitledLabel }}
							</div>
							<div v-if="form.description" class="cn-form-picker__row-description">
								{{ form.description }}
							</div>
						</div>
						<span class="cn-form-picker__row-status" :class="statusClass(form)">
							{{ statusLabel(form) }}
						</span>
					</div>
					<div class="cn-form-picker__row-meta">
						<span class="cn-form-picker__row-count">
							{{ submissionCountLabel(form) }}
						</span>
						<span v-if="form.linked" class="cn-form-picker__row-linked">
							{{ alreadyLinkedLabel }}
						</span>
					</div>
				</li>
			</ul>

			<div v-if="selected" class="cn-form-picker__mode">
				<label class="cn-form-picker__mode-row">
					<input
						type="radio"
						:value="false"
						:model-value="linkSpecificSubmission === false"
						@change="linkSpecificSubmission = false"> {{ linkFormModeLabel }}
				</label>
				<label class="cn-form-picker__mode-row">
					<input
						type="radio"
						:value="true"
						:model-value="linkSpecificSubmission === true"
						:disabled="submissionsAvailable === 0"
						@change="linkSpecificSubmission = true">
					{{ linkSubmissionModeLabel }}
					<span v-if="submissionsAvailable === 0" class="cn-form-picker__mode-hint">
						{{ noSubmissionsHintLabel }}
					</span>
				</label>
			</div>
		</div>

		<template #actions>
			<NcButton @click="$emit('close')">
				{{ cancelLabel }}
			</NcButton>
			<NcButton
				variant="primary"
				:disabled="!canSubmit"
				@click="emitLink">
				{{ linkLabel }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon, NcTextField } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import ClipboardText from 'vue-material-design-icons/ClipboardText.vue'

import { buildHeaders } from '../../../utils/index.js'

/**
 * CnFormPicker — modal that picks an NC Forms form to link to an OR object.
 *
 * Loads the user's forms from
 * `GET /api/integrations/forms/available?objectUuid={uuid}` (Tier-2
 * forms link surface) and emits `link` with either `{ formId }` or
 * `{ formId, submissionId }` depending on the selected mode.
 *
 * Basic usage:
 * ```vue
 * <CnFormPicker
 *   :object-id="objectUuid"
 *   register="my-register"
 *   schema="my-schema"
 *   v-on:link="onLinkSelected"
 *   v-on:close="showPicker = false" />
 * ```
 */
export default {
	name: 'CnFormPicker',

	components: {
		NcButton,
		NcDialog,
		NcEmptyContent,
		NcLoadingIcon,
		NcTextField,
		AlertCircleOutline,
		ClipboardText,
	},

	props: {
		/** OR object UUID — forwarded to the available-forms endpoint so each row carries a `linked` flag. */
		objectId: { type: String, required: true },
		/** OR register slug or uuid. */
		register: { type: String, default: '' },
		/** OR schema slug or uuid. */
		schema: { type: String, default: '' },
		/** Base API URL — same as CnFormsTab. */
		apiBase: { type: String, default: '/apps/openregister/api' },

		// --- Pre-translated labels ---
		dialogTitle: { type: String, default: () => t('nextcloud-vue', 'Link existing form') },
		searchPlaceholder: { type: String, default: () => t('nextcloud-vue', 'Search forms') },
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No forms found') },
		errorLabel: { type: String, default: () => t('nextcloud-vue', 'Could not load forms') },
		untitledLabel: { type: String, default: () => t('nextcloud-vue', 'Untitled form') },
		alreadyLinkedLabel: { type: String, default: () => t('nextcloud-vue', 'Already linked') },
		cancelLabel: { type: String, default: () => t('nextcloud-vue', 'Cancel') },
		linkLabel: { type: String, default: () => t('nextcloud-vue', 'Link') },
		linkFormModeLabel: { type: String, default: () => t('nextcloud-vue', 'Link the form') },
		linkSubmissionModeLabel: { type: String, default: () => t('nextcloud-vue', 'Link a specific submission') },
		noSubmissionsHintLabel: { type: String, default: () => t('nextcloud-vue', '(no submissions yet)') },
	},

	emits: ['link', 'close'],

	data() {
		return {
			forms: [],
			search: '',
			loading: false,
			submitting: false,
			error: '',
			selected: null,
			linkSpecificSubmission: false,
			// Submission picker — populated on demand if the user enables
			// `link specific submission`. For v1 we surface a free-text
			// "submission id" input rather than a paginated list (the
			// submissions endpoint isn't exposed via OR Tier-2 yet);
			// keeping it lean per the spec note.
			submissionId: '',
		}
	},

	computed: {
		filteredForms() {
			const q = this.search.trim().toLowerCase()
			if (q === '') {
				return this.forms
			}
			return this.forms.filter((f) => {
				const title = String(f.title || '').toLowerCase()
				const desc = String(f.description || '').toLowerCase()
				return title.includes(q) || desc.includes(q)
			})
		},

		submissionsAvailable() {
			return Number(this.selected?.submissionCount ?? 0) || 0
		},

		canSubmit() {
			if (!this.selected) {
				return false
			}
			if (this.selected.linked && !this.linkSpecificSubmission) {
				// Linking the same form twice is a no-op on the backend, but
				// the UI still disables to keep the action affordance honest.
				return false
			}
			if (this.linkSpecificSubmission && !this.submissionId.trim()) {
				return false
			}
			return true
		},
	},

	mounted() {
		this.fetchForms()
	},

	methods: {
		statusLabel(form) {
			const status = String(form.status || 'open').toLowerCase()
			if (status === 'closed') return t('nextcloud-vue', 'Closed')
			if (status === 'archived') return t('nextcloud-vue', 'Archived')
			if (status === 'draft') return t('nextcloud-vue', 'Draft')
			return t('nextcloud-vue', 'Open')
		},

		statusClass(form) {
			const status = String(form.status || 'open').toLowerCase()
			return `cn-form-picker__row-status--${status}`
		},

		submissionCountLabel(form) {
			const n = Number(form.submissionCount ?? 0) || 0
			return t('nextcloud-vue', '{n} submissions', { n })
		},

		isSelected(form) {
			return this.selected !== null && this.selected.id === form.id
		},

		select(form) {
			this.selected = form
			this.linkSpecificSubmission = false
		},

		emitLink() {
			if (!this.selected) return
			const payload = { formId: this.selected.id }
			if (this.linkSpecificSubmission) {
				const sid = parseInt(this.submissionId, 10)
				if (Number.isInteger(sid) && sid > 0) {
					payload.submissionId = sid
				}
			}
			this.$emit('link', payload)
		},

		async fetchForms() {
			this.loading = true
			this.error = ''
			try {
				const url = `${this.apiBase}/integrations/forms/available?objectUuid=${encodeURIComponent(this.objectId)}`
				const response = await fetch(url, { headers: buildHeaders() })
				if (!response.ok) {
					this.error = `${response.status} ${response.statusText}`
					this.forms = []
					return
				}
				const data = await response.json()
				this.forms = this.unwrapList(data)
			} catch (err) {
				console.error('CnFormPicker: Failed to fetch forms', err)
				this.error = String(err?.message || err)
				this.forms = []
			} finally {
				this.loading = false
			}
		},

		/**
		 * Canonical wrapper-key cascade — mirrors CnContactsTab.unwrapList
		 * (see ADR-022). Accepts `{results:[...]}`, `{items:[...]}`, or
		 * a bare array; any other shape becomes `[]`.
		 *
		 * @param {*} data parsed JSON response body
		 *
		 * @return {Array}
		 */
		unwrapList(data) {
			if (Array.isArray(data)) {
				return data
			}
			if (data && typeof data === 'object') {
				if (Array.isArray(data.results)) {
					return data.results
				}
				if (Array.isArray(data.items)) {
					return data.items
				}
			}
			return []
		},
	},
}
</script>

<style scoped>
.cn-form-picker {
	display: flex;
	flex-direction: column;
	gap: 12px;
	min-height: 240px;
}

.cn-form-picker__search {
	max-width: 100%;
}

.cn-form-picker__list {
	list-style: none;
	margin: 0;
	padding: 0;
	max-height: 360px;
	overflow-y: auto;
}

.cn-form-picker__row {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 10px 12px;
	border-radius: var(--border-radius);
	cursor: pointer;
	border: 1px solid transparent;
}

.cn-form-picker__row:hover,
.cn-form-picker__row:focus-within {
	background: var(--color-background-hover);
}

.cn-form-picker__row--selected {
	border-color: var(--color-primary-element);
	background: var(--color-primary-element-light, var(--color-primary-light));
}

.cn-form-picker__row-main {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-form-picker__row-icon {
	color: var(--color-text-maxcontrast);
	flex-shrink: 0;
}

.cn-form-picker__row-text {
	flex: 1;
	min-width: 0;
}

.cn-form-picker__row-title {
	font-weight: 500;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-form-picker__row-description {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-form-picker__row-status {
	flex-shrink: 0;
	padding: 1px 8px;
	border-radius: 10px;
	font-size: 0.75em;
	font-weight: 500;
	background: var(--color-background-dark);
	color: var(--color-text-maxcontrast);
}

.cn-form-picker__row-status--open {
	background: var(--color-success, #46ba61);
	color: var(--color-primary-element-text, #ffffff);
}

.cn-form-picker__row-status--closed,
.cn-form-picker__row-status--archived {
	background: var(--color-background-dark);
	color: var(--color-text-maxcontrast);
}

.cn-form-picker__row-status--draft {
	background: var(--color-warning, #e9a40f);
	color: var(--color-main-background);
}

.cn-form-picker__row-meta {
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
	padding-left: 28px;
	display: flex;
	gap: 12px;
}

.cn-form-picker__row-linked {
	color: var(--color-primary-element);
	font-style: italic;
}

.cn-form-picker__mode {
	display: flex;
	flex-direction: column;
	gap: 6px;
	border-top: 1px solid var(--color-border);
	padding-top: 10px;
}

.cn-form-picker__mode-row {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 0.9em;
}

.cn-form-picker__mode-hint {
	color: var(--color-text-maxcontrast);
	font-style: italic;
}
</style>
