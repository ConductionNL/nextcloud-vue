<!--
  CnShareCreate — create-share dialog for the `shares` integration leaf.

  Shares are CREATED, not picked: NC core `IShare` has no "link an
  existing share to this object" concept — a share is minted on a file
  inside the object's folder. So unlike the polls/talk/email leaves
  there is NO companion picker; this dialog is the only write surface.

  Form fields:
    - File        (NcSelect, sourced from
                   `/api/integrations/shares/files/{register}/{schema}/{id}`)
    - Share type  (radio: User / Group / Public link / Email)
    - Recipient   (cascades on type:
                     user/group → NcSelect of matching principals
                     email      → NcTextField with validation
                     public     → none)
    - Permissions (checkboxes: Read=1 / Update=2 / Create=4 / Delete=8 / Share=16)
    - Password    (optional, public/email types only)
    - Expiration  (optional datetime-local)

  On submit, emits `create` with
  `{ fileId, shareType, shareWith, permissions, password?, expiration? }`.
  The parent (CnSharesTab) POSTs to
  `/api/objects/{register}/{schema}/{id}/shares`.

  ADR-004: lives in its own .vue file under `src/components/CnShareCreate/`.

  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		:can-close="true"
		data-testid="cn-share-create"
		@closing="onClose">
		<form class="cn-share-create" @submit.prevent="submit">
			<NcNoteCard v-if="error" type="error" class="cn-share-create__error">
				{{ error }}
			</NcNoteCard>

			<div class="cn-share-create__field">
				<label class="cn-share-create__label">{{ t('nextcloud-vue', 'File') }}</label>
				<NcSelect
					v-model="selectedFile"
					:options="fileOptions"
					:loading="filesLoading"
					:placeholder="t('nextcloud-vue', 'Select a file to share')"
					label="label"
					:clearable="false"
					data-testid="cn-share-create-file" />
			</div>

			<fieldset class="cn-share-create__type">
				<legend>{{ t('nextcloud-vue', 'Share type') }}</legend>
				<label
					v-for="option in shareTypeOptions"
					:key="option.value"
					class="cn-share-create__type-option">
					<input
						v-model="shareType"
						type="radio"
						:value="option.value">
					<span>{{ option.label }}</span>
				</label>
			</fieldset>

			<div v-if="needsPrincipal" class="cn-share-create__field">
				<label class="cn-share-create__label">{{ recipientLabel }}</label>
				<NcSelect
					v-model="selectedPrincipal"
					:options="principalOptions"
					:loading="principalsLoading"
					:placeholder="recipientPlaceholder"
					label="label"
					:clearable="false"
					data-testid="cn-share-create-principal"
					@search="onPrincipalSearch" />
			</div>

			<div v-else-if="needsEmail" class="cn-share-create__field">
				<NcTextField
					v-model="email"
					type="email"
					:label="t('nextcloud-vue', 'Email address')"
					:error="emailTouched && !emailValid"
					:helper-text="emailTouched && !emailValid ? t('nextcloud-vue', 'Enter a valid email address') : ''"
					data-testid="cn-share-create-email"
					@blur="emailTouched = true" />
			</div>

			<fieldset class="cn-share-create__permissions">
				<legend>{{ t('nextcloud-vue', 'Permissions') }}</legend>
				<label
					v-for="perm in permissionOptions"
					:key="perm.value"
					class="cn-share-create__perm-option">
					<NcCheckboxRadioSwitch
						:checked="hasPermission(perm.value)"
						@update:checked="togglePermission(perm.value, $event)">
						{{ perm.label }}
					</NcCheckboxRadioSwitch>
				</label>
			</fieldset>

			<div v-if="supportsPassword" class="cn-share-create__field">
				<NcTextField
					v-model="password"
					type="password"
					:label="t('nextcloud-vue', 'Password (optional)')"
					data-testid="cn-share-create-password" />
			</div>

			<label class="cn-share-create__field">
				<span class="cn-share-create__label">{{ t('nextcloud-vue', 'Expiration (optional)') }}</span>
				<input
					v-model="expiration"
					type="datetime-local"
					class="cn-share-create__datetime"
					data-testid="cn-share-create-expiration">
			</label>
		</form>

		<template #actions>
			<NcButton @click="onClose">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				type="primary"
				:disabled="!canSubmit"
				data-testid="cn-share-create-submit"
				@click="submit">
				{{ t('nextcloud-vue', 'Create share') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnShareCreate — create-share dialog. Emits `create` with the form
 * payload; the parent submits to OR.
 *
 * @see ADR-019 (pluggable integrations) and ADR-004 (modal isolation)
 */
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcCheckboxRadioSwitch, NcDialog, NcNoteCard, NcSelect, NcTextField } from '@nextcloud/vue'

// NC core share-type constants (OCP\Share\IShare::TYPE_*).
const SHARE_TYPE_USER = 0
const SHARE_TYPE_GROUP = 1
const SHARE_TYPE_LINK = 3
const SHARE_TYPE_EMAIL = 4

// Permission bitmask (OCP\Constants::PERMISSION_*).
const PERMISSION_READ = 1
const PERMISSION_UPDATE = 2
const PERMISSION_CREATE = 4
const PERMISSION_DELETE = 8
const PERMISSION_SHARE = 16

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default {
	name: 'CnShareCreate',

	components: { NcButton, NcCheckboxRadioSwitch, NcDialog, NcNoteCard, NcSelect, NcTextField },

	props: {
		/** Pre-translated dialog title. */
		dialogTitle: { type: String, default: () => t('nextcloud-vue', 'Share a file') },
		/** Shareable files `[{ fileId, fileName }]` (sourced by the parent). */
		files: { type: Array, default: () => [] },
		/** Whether the file list is loading. */
		filesLoading: { type: Boolean, default: false },
		/** Principal candidates for user/group shares `[{ value, label }]`. */
		principals: { type: Array, default: () => [] },
		/** Whether the principal list is loading. */
		principalsLoading: { type: Boolean, default: false },
	},

	emits: ['close', 'create', 'search-principals'],

	data() {
		return {
			error: '',
			selectedFile: null,
			shareType: SHARE_TYPE_USER,
			selectedPrincipal: null,
			email: '',
			emailTouched: false,
			permissions: PERMISSION_READ,
			password: '',
			expiration: '',
		}
	},

	computed: {
		shareTypeOptions() {
			return [
				{ value: SHARE_TYPE_USER, label: t('nextcloud-vue', 'User') },
				{ value: SHARE_TYPE_GROUP, label: t('nextcloud-vue', 'Group') },
				{ value: SHARE_TYPE_LINK, label: t('nextcloud-vue', 'Public link') },
				{ value: SHARE_TYPE_EMAIL, label: t('nextcloud-vue', 'Email') },
			]
		},

		permissionOptions() {
			return [
				{ value: PERMISSION_READ, label: t('nextcloud-vue', 'Read') },
				{ value: PERMISSION_UPDATE, label: t('nextcloud-vue', 'Update') },
				{ value: PERMISSION_CREATE, label: t('nextcloud-vue', 'Create') },
				{ value: PERMISSION_DELETE, label: t('nextcloud-vue', 'Delete') },
				{ value: PERMISSION_SHARE, label: t('nextcloud-vue', 'Share') },
			]
		},

		fileOptions() {
			return (this.files || []).map((f) => ({
				value: f.fileId ?? f.id,
				label: f.fileName ?? f.name ?? String(f.fileId ?? f.id),
			}))
		},

		principalOptions() {
			return (this.principals || []).map((p) => ({
				value: p.value ?? p.id ?? p.shareWith,
				label: p.label ?? p.displayName ?? p.value ?? p.id,
			}))
		},

		needsPrincipal() {
			return this.shareType === SHARE_TYPE_USER || this.shareType === SHARE_TYPE_GROUP
		},

		needsEmail() {
			return this.shareType === SHARE_TYPE_EMAIL
		},

		supportsPassword() {
			return this.shareType === SHARE_TYPE_LINK || this.shareType === SHARE_TYPE_EMAIL
		},

		recipientLabel() {
			return this.shareType === SHARE_TYPE_GROUP
				? t('nextcloud-vue', 'Group')
				: t('nextcloud-vue', 'User')
		},

		recipientPlaceholder() {
			return this.shareType === SHARE_TYPE_GROUP
				? t('nextcloud-vue', 'Search for a group')
				: t('nextcloud-vue', 'Search for a user')
		},

		emailValid() {
			return EMAIL_RE.test((this.email || '').trim())
		},

		canSubmit() {
			if (!this.selectedFile) {
				return false
			}
			if (this.needsPrincipal) {
				return Boolean(this.selectedPrincipal)
			}
			if (this.needsEmail) {
				return this.emailValid
			}
			// Public link needs no recipient.
			return true
		},
	},

	watch: {
		shareType() {
			// Reset recipient state on type change so a stale principal /
			// email doesn't leak into the next submission.
			this.selectedPrincipal = null
			this.email = ''
			this.emailTouched = false
			if (!this.supportsPassword) {
				this.password = ''
			}
		},
	},

	methods: {
		t,

		/**
		 * Dismiss the dialog.
		 *
		 * @return {void}
		 */
		onClose() {
			/**
			 * @event close Emitted when the dialog should be closed (cancel or close button).
			 */
			this.$emit('close')
		},

		hasPermission(value) {
			return (this.permissions & value) === value
		},

		togglePermission(value, checked) {
			if (checked) {
				this.permissions |= value
			} else {
				this.permissions &= ~value
			}
		},

		onPrincipalSearch(query) {
			/**
			 * @event search-principals Emitted (debounced) as the user types, so the parent can resolve matching users/groups. Payload: `{ shareType, query }`.
			 */
			this.$emit('search-principals', { shareType: this.shareType, query })
		},

		resolveShareWith() {
			if (this.needsPrincipal) {
				return this.selectedPrincipal ? (this.selectedPrincipal.value ?? this.selectedPrincipal) : null
			}
			if (this.needsEmail) {
				return this.email.trim()
			}
			return null
		},

		submit() {
			if (!this.canSubmit) {
				return
			}
			const fileId = this.selectedFile.value ?? this.selectedFile
			const payload = {
				fileId: Number(fileId),
				shareType: this.shareType,
				shareWith: this.resolveShareWith(),
				permissions: this.permissions || PERMISSION_READ,
				password: this.supportsPassword && this.password ? this.password : null,
				expiration: this.expiration ? new Date(this.expiration).toISOString() : null,
			}
			/**
			 * @event create Emitted when the user confirms creation. Payload: the share form data.
			 */
			this.$emit('create', payload)
		},
	},
}
</script>

<style scoped>
.cn-share-create {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
}

.cn-share-create__error {
	margin: 4px 0;
}

.cn-share-create__field {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-share-create__label {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-share-create__type,
.cn-share-create__permissions {
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	padding: 8px 12px;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-share-create__type legend,
.cn-share-create__permissions legend {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
	padding: 0 4px;
}

.cn-share-create__type-option {
	display: flex;
	align-items: center;
	gap: 8px;
	cursor: pointer;
}

.cn-share-create__datetime {
	border-radius: var(--border-radius);
	padding: 6px 8px;
	border: 1px solid var(--color-border);
	background: var(--color-main-background);
	color: var(--color-main-text);
}
</style>
