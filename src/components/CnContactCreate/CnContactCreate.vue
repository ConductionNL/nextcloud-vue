<!--
  - SPDX-License-Identifier: EUPL-1.2
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  -
  - CnContactCreate — modal dialog for creating a brand-new CardDAV
  - contact + linking it in a single step (Tier-2 of the contacts
  - integration leaf).
  -
  - The dialog itself does NOT perform the create — it emits a `create`
  - event with the form payload. The parent (typically `CnContactsTab`)
  - POSTs `/api/objects/{r}/{s}/{id}/contacts/new` and on success closes
  - the dialog + refreshes the linked-contacts list.
  -
  - Lives in its own .vue file under `components/` to satisfy
  - hydra-gate-modal-isolation (ADR-004 hard rule).
  -
  - @spec openspec/changes/integration-contacts-tier2/specs/integrations/contacts/spec.md
  -->
<template>
	<NcDialog
		:name="title"
		size="normal"
		:can-close="!loading"
		data-testid="cn-modal"
		data-testid-modal="cn-contact-create"
		@closing="$emit('close')">
		<div class="cn-contact-create">
			<NcTextField
				v-model="form.displayName"
				:label="displayNameLabel"
				:input-label="displayNameLabel"
				:error="displayNameError !== ''"
				:helper-text="displayNameError || displayNameHelper"
				:maxlength="255"
				required />

			<NcTextField
				v-model="form.email"
				:label="emailLabel"
				:input-label="emailLabel"
				type="email"
				:error="emailError !== ''"
				:helper-text="emailError || emailHelper"
				:maxlength="255" />

			<NcTextField
				v-model="form.phone"
				:label="phoneLabel"
				:input-label="phoneLabel"
				:maxlength="64" />

			<NcTextField
				v-model="form.org"
				:label="orgLabel"
				:input-label="orgLabel"
				:maxlength="255" />

			<div class="cn-contact-create__role">
				<label for="cn-contact-create-role">{{ roleLabel }}</label>
				<NcSelect
					input-id="cn-contact-create-role"
					:options="roleOptions"
					:value="form.role"
					:clearable="true"
					:taggable="true"
					:input-label="roleLabel"
					@input="form.role = $event" />
			</div>
		</div>

		<template #actions>
			<NcButton @click="$emit('close')">
				{{ cancelLabel }}
			</NcButton>
			<NcButton
				type="primary"
				:disabled="!canSubmit || loading"
				@click="submit">
				<template #icon>
					<NcLoadingIcon v-if="loading" :size="20" />
					<AccountPlus v-else :size="20" />
				</template>
				{{ confirmLabel }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import {
	NcButton,
	NcDialog,
	NcLoadingIcon,
	NcSelect,
	NcTextField,
} from '@nextcloud/vue'
import AccountPlus from 'vue-material-design-icons/AccountPlus.vue'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * CnContactCreate — form dialog for new contact + link in a single step.
 *
 * ```vue
 * <CnContactCreate
 *   v-if="showCreate"
 *   @create="onCreate"
 *   @close="showCreate = false" />
 * ```
 *
 * Emits:
 * - `create` — on submit with `{displayName, email, phone, org, role}`.
 * - `close`  — on cancel / close.
 */
export default {
	name: 'CnContactCreate',

	components: {
		NcButton,
		NcDialog,
		NcLoadingIcon,
		NcSelect,
		NcTextField,
		AccountPlus,
	},

	props: {
		/**
		 * Whether the parent is currently performing the network call.
		 * When true the dialog locks the submit button and prevents
		 * close, so the user can't accidentally double-submit.
		 */
		loading: { type: Boolean, default: false },

		// --- Pre-translated labels (consumer-overridable) ---
		title: { type: String, default: () => t('nextcloud-vue', 'Add new contact') },
		displayNameLabel: { type: String, default: () => t('nextcloud-vue', 'Display name') },
		displayNameHelper: { type: String, default: () => t('nextcloud-vue', 'Required — shown in the contact list.') },
		emailLabel: { type: String, default: () => t('nextcloud-vue', 'Email') },
		emailHelper: { type: String, default: () => t('nextcloud-vue', 'Optional. Used for outgoing mail and reverse lookup.') },
		phoneLabel: { type: String, default: () => t('nextcloud-vue', 'Phone') },
		orgLabel: { type: String, default: () => t('nextcloud-vue', 'Organisation') },
		roleLabel: { type: String, default: () => t('nextcloud-vue', 'Role') },
		cancelLabel: { type: String, default: () => t('nextcloud-vue', 'Cancel') },
		confirmLabel: { type: String, default: () => t('nextcloud-vue', 'Create contact') },
		displayNameRequiredMsg: { type: String, default: () => t('nextcloud-vue', 'Display name is required.') },
		emailInvalidMsg: { type: String, default: () => t('nextcloud-vue', 'Email is not a valid address.') },
		roleOptions: {
			type: Array,
			default: () => [
				{ label: t('nextcloud-vue', 'Applicant'), value: 'applicant' },
				{ label: t('nextcloud-vue', 'Handler'), value: 'handler' },
				{ label: t('nextcloud-vue', 'Advisor'), value: 'advisor' },
				{ label: t('nextcloud-vue', 'Other'), value: 'other' },
			],
		},
	},

	emits: ['create', 'close'],

	data() {
		return {
			form: {
				displayName: '',
				email: '',
				phone: '',
				org: '',
				role: null,
			},
		}
	},

	computed: {
		displayNameError() {
			if (this.form.displayName.trim() === '') {
				return this.displayNameRequiredMsg
			}
			return ''
		},

		emailError() {
			const value = this.form.email.trim()
			if (value === '') return ''
			if (!EMAIL_REGEX.test(value)) return this.emailInvalidMsg
			return ''
		},

		canSubmit() {
			return this.displayNameError === '' && this.emailError === ''
		},
	},

	methods: {
		submit() {
			if (!this.canSubmit) return
			this.$emit('create', {
				displayName: this.form.displayName.trim(),
				email: this.form.email.trim() || null,
				phone: this.form.phone.trim() || null,
				org: this.form.org.trim() || null,
				// NcSelect emits the chosen option object; the API
				// expects the bare role string (or the taggable
				// free-text value).
				role: this.form.role?.value || this.form.role || null,
			})
		},
	},
}
</script>

<style scoped>
.cn-contact-create {
	display: flex;
	flex-direction: column;
	gap: 12px;
	min-height: 260px;
}

.cn-contact-create__role {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-contact-create__role label {
	font-weight: 500;
}
</style>
