<!--
  - SPDX-License-Identifier: EUPL-1.2
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  -
  - CnFormCreate — modal that creates a new NC Forms form and links it
  - to the parent OR object in one shot.
  -
  - Two fields:
  -   * `title`       (required) — the form's display title;
  -   * `description` (optional) — the form's description.
  -
  - Per the Tier-2 spec, the form is created with the NC Forms default
  - shape (private access, anonymous=false, expires=0). A starter
  - question set is out of scope for v1 — the user follows up by
  - editing the form in NC Forms after creation.
  -
  - Per ADR-004 (modal isolation) this lives in its own .vue file.
  -
  - @spec openspec/changes/integration-forms/specs/integrations/forms/spec.md
  -->
<template>
	<NcDialog
		:name="dialogTitle"
		size="small"
		:no-close="submitting"
		data-testid="cn-modal"
		data-testid-modal="cn-form-create"
		@closing="$emit('close')">
		<div class="cn-form-create">
			<NcTextField
				:value="title"
				:label="titleLabel"
				:placeholder="titlePlaceholder"
				:show-trailing-button="false"
				:required="true"
				:error="titleError !== ''"
				:helper-text="titleError"
				class="cn-form-create__field"
				data-testid="cn-form-create-title"
				@update:value="onTitleChange" />
			<NcTextArea
				:value="description"
				:label="descriptionLabel"
				:placeholder="descriptionPlaceholder"
				class="cn-form-create__field"
				rows="3"
				data-testid="cn-form-create-description"
				@update:value="description = $event" />

			<!-- TODO(v2): Starter question set. Out of scope for Tier-2 v1 —
			     spec carries this as a follow-up; surfacing here so the
			     intent isn't lost. -->

			<div v-if="submitError" class="cn-form-create__error" role="alert">
				{{ submitError }}
			</div>
		</div>

		<template #actions>
			<NcButton :disabled="submitting" @click="$emit('close')">
				{{ cancelLabel }}
			</NcButton>
			<NcButton
				variant="primary"
				:disabled="!canSubmit || submitting"
				@click="submit">
				<template v-if="submitting" #icon>
					<NcLoadingIcon :size="20" />
				</template>
				{{ submitting ? creatingLabel : createLabel }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcLoadingIcon, NcTextArea, NcTextField } from '@nextcloud/vue'

/**
 * CnFormCreate — modal that creates+links an NC Forms form in one POST.
 *
 * Emits `create` with `{ title, description }` once the form fields
 * validate. The parent is responsible for the HTTP round-trip and
 * closing the modal on success — this component just owns the form
 * field state and the local validation.
 *
 * Basic usage:
 * ```vue
 * <CnFormCreate
 *   v-on:create="onCreate"
 *   v-on:close="showCreate = false" />
 * ```
 */
export default {
	name: 'CnFormCreate',

	components: {
		NcButton,
		NcDialog,
		NcLoadingIcon,
		NcTextArea,
		NcTextField,
	},

	props: {
		/** Optional external "in flight" flag the parent can pass to disable the button while it POSTs. */
		submitting: { type: Boolean, default: false },
		/** Optional external error string the parent can pass to render the failure inline. */
		submitError: { type: String, default: '' },

		// --- Pre-translated labels ---
		dialogTitle: { type: String, default: () => t('nextcloud-vue', 'Create new form') },
		titleLabel: { type: String, default: () => t('nextcloud-vue', 'Title') },
		titlePlaceholder: { type: String, default: () => t('nextcloud-vue', 'My new form') },
		descriptionLabel: { type: String, default: () => t('nextcloud-vue', 'Description') },
		descriptionPlaceholder: { type: String, default: () => t('nextcloud-vue', 'What is this form for?') },
		cancelLabel: { type: String, default: () => t('nextcloud-vue', 'Cancel') },
		createLabel: { type: String, default: () => t('nextcloud-vue', 'Create + link') },
		creatingLabel: { type: String, default: () => t('nextcloud-vue', 'Creating…') },
		titleRequiredLabel: { type: String, default: () => t('nextcloud-vue', 'Title is required') },
	},

	emits: ['create', 'close'],

	data() {
		return {
			title: '',
			description: '',
			titleTouched: false,
		}
	},

	computed: {
		canSubmit() {
			return this.title.trim().length > 0
		},

		titleError() {
			if (!this.titleTouched) {
				return ''
			}
			if (this.title.trim() === '') {
				return this.titleRequiredLabel
			}
			return ''
		},
	},

	methods: {
		onTitleChange(value) {
			this.title = value
			this.titleTouched = true
		},

		submit() {
			if (!this.canSubmit) {
				this.titleTouched = true
				return
			}
			this.$emit('create', {
				title: this.title.trim(),
				description: this.description.trim(),
			})
		},
	},
}
</script>

<style scoped>
.cn-form-create {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-form-create__field {
	width: 100%;
}

.cn-form-create__error {
	color: var(--color-error);
	font-size: 0.9em;
}
</style>
