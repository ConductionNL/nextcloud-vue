<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<CnDialog
		:look="look"
		:width="width"
		defaultWidth="form"
		:eyebrow="eyebrow"
		:subtitle="subtitle"
		:name="dialogTitle"
		size="normal"
		:noClose="loading"
		@closing="$emit('close')">
		<div class="cn-party-add" data-testid="cn-party-add-dialog">
			<fieldset v-if="canCreate" class="cn-party-add__mode">
				<legend class="cn-party-add__legend">
					{{ t('nextcloud-vue', 'Who') }}
				</legend>
				<NcCheckboxRadioSwitch
					v-model="mode"
					type="radio"
					:name="`${idPrefix}-mode`"
					value="existing"
					:disabled="loading"
					data-testid="cn-party-add-mode-existing">
					{{ t('nextcloud-vue', 'Someone already known') }}
				</NcCheckboxRadioSwitch>
				<NcCheckboxRadioSwitch
					v-model="mode"
					type="radio"
					:name="`${idPrefix}-mode`"
					value="new"
					:disabled="loading"
					data-testid="cn-party-add-mode-new">
					{{ createLabel }}
				</NcCheckboxRadioSwitch>
			</fieldset>

			<CnPartyPicker
				v-if="mode === 'existing'"
				v-model="partyUuid"
				:sources="sources"
				:inputLabel="t('nextcloud-vue', 'Person')"
				labelOutside
				:disabled="loading"
				data-testid="cn-party-add-picker" />

			<template v-else>
				<NcTextField
					v-for="field in createFields"
					:key="field.key"
					:modelValue="values[field.key] || ''"
					:label="field.label"
					:type="inputType(field)"
					:required="field.required === true"
					:disabled="loading"
					:data-testid="`cn-party-add-field-${field.key}`"
					@update:modelValue="setValue(field.key, $event)" />
			</template>

			<NcSelect
				:modelValue="roleOption"
				:options="roleOptions"
				label="label"
				:clearable="false"
				:inputLabel="t('nextcloud-vue', 'Role')"
				:disabled="loading"
				data-testid="cn-party-add-role"
				@update:modelValue="role = $event ? $event.key : ''" />

			<NcCheckboxRadioSwitch
				v-if="allowPrimary"
				v-model="primary"
				type="checkbox"
				:disabled="loading"
				data-testid="cn-party-add-primary">
				{{ primaryLabel }}
			</NcCheckboxRadioSwitch>

			<NcNoteCard v-if="error" type="error" data-testid="cn-party-add-error">
				{{ error }}
			</NcNoteCard>
		</div>

		<template #actions>
			<NcButton :disabled="loading" data-testid="cn-party-add-cancel" @click="$emit('close')">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				variant="primary"
				:disabled="loading || !complete"
				data-testid="cn-party-add-confirm"
				@click="confirm">
				<template #icon>
					<NcLoadingIcon v-if="loading" :size="20" :name="t('nextcloud-vue', 'Loading …')" />
				</template>
				{{ confirmLabel }}
			</NcButton>
		</template>
	</CnDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcCheckboxRadioSwitch, NcLoadingIcon, NcNoteCard, NcSelect, NcTextField } from '@nextcloud/vue'
import CnDialog from '../components/CnDialog/CnDialog.vue'
import CnPartyPicker from '../components/CnPartyPicker/CnPartyPicker.vue'
import { dialogBoardMixin } from '../mixins/dialogBoard.js'

let uid = 0

/**
 * CnPartyAddDialog — give a party a role on a record: pick somebody already
 * known (CnPartyPicker over `sources`), or describe a new person with the
 * `create.fields` the host declares (no identifier needed: a name and an
 * address are enough). Then a role from `roles`, and optionally "make this the
 * primary party".
 *
 * The dialog writes nothing. `confirm` emits `{ mode, partyUuid, values, role,
 * primary }`; the host creates the person when `mode` is `new`, links the
 * party, then closes the dialog or calls `fail(message)` to show the refusal
 * (a 403 when the reader may not update the record) and let them try again.
 *
 * @spec openspec/changes/object-parties-manage/specs/record-widgets/spec.md#requirement-the-parties-widget-can-add-and-remove-parties
 */
export default {
	name: 'CnPartyAddDialog',

	components: { CnDialog, CnPartyPicker, NcButton, NcCheckboxRadioSwitch, NcLoadingIcon, NcNoteCard, NcSelect, NcTextField },

	mixins: [dialogBoardMixin],

	props: {
		/** The dialog's title ("Add contact person"). */
		dialogTitle: {
			type: String,
			default: () => t('nextcloud-vue', 'Add a party'),
		},

		/** The roles to choose from, `[{ key, label }]`, already in the reader's words. */
		roles: {
			type: Array,
			default: () => [],
		},

		/** CnPartyPicker sources for somebody already known. */
		sources: {
			type: Array,
			default: () => [],
		},

		/**
		 * The fields of a new person, `[{ key, label, type? (text, email, integer), required? }]`,
		 * labels already translated. None: only existing parties can be picked.
		 */
		createFields: {
			type: Array,
			default: () => [],
		},

		/** The choice that opens the new-person fields. */
		createLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Someone new'),
		},

		/** Offer "make this the primary party". */
		allowPrimary: {
			type: Boolean,
			default: false,
		},

		/** The primary choice's words ("Main contact"). */
		primaryLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Primary party'),
		},

		/** The confirm button's words. */
		confirmLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Add'),
		},
	},

	emits: ['close', 'confirm'],

	data() {
		uid += 1
		return {
			idPrefix: `cn-party-add-${uid}`,
			mode: 'existing',
			partyUuid: null,
			values: {},
			role: this.roles.length === 1 ? this.roles[0].key : '',
			primary: false,
			loading: false,
			error: '',
		}
	},

	computed: {
		/** @return {boolean} Whether a new person can be described here. */
		canCreate() {
			return this.createFields.length > 0
		},

		/** @return {Array<{key: string, label: string}>} The role choices. */
		roleOptions() {
			return this.roles.filter((role) => role && role.key).map((role) => ({ key: role.key, label: role.label || role.key }))
		},

		/** @return {object|null} The chosen role's option. */
		roleOption() {
			return this.roleOptions.find((option) => option.key === this.role) || null
		},

		/** @return {boolean} Whether the choice is complete enough to send. */
		complete() {
			if (this.role === '') {
				return false
			}
			if (this.mode === 'existing') {
				return Boolean(this.partyUuid)
			}
			return this.createFields.every((field) => field.required !== true || String(this.values[field.key] || '').trim() !== '')
		},
	},

	methods: {
		t,

		/**
		 * The input type of a new-person field.
		 *
		 * @param {{type?: string}} field The field.
		 * @return {string} `email`, `number` or `text`.
		 */
		inputType(field) {
			if (field.type === 'email') {
				return 'email'
			}
			return field.type === 'integer' ? 'number' : 'text'
		},

		/**
		 * Set one new-person field.
		 *
		 * @param {string} key The field key.
		 * @param {string} value The value.
		 * @return {void}
		 */
		setValue(key, value) {
			this.values = { ...this.values, [key]: value }
		},

		/** @return {void} Hand the choice to the host. */
		confirm() {
			if (!this.complete) {
				return
			}
			this.loading = true
			this.error = ''
			this.$emit('confirm', {
				mode: this.mode,
				partyUuid: this.mode === 'existing' ? String(this.partyUuid) : null,
				values: this.mode === 'new' ? { ...this.values } : {},
				role: this.role,
				primary: this.allowPrimary && this.primary === true,
			})
		},

		/**
		 * The host could not write: show why and let the reader try again.
		 *
		 * @param {string} message The refusal.
		 * @return {void}
		 */
		fail(message) {
			this.loading = false
			this.error = message || t('nextcloud-vue', 'The party could not be added.')
		},
	},
}
</script>

<style scoped>
.cn-party-add {
	display: flex;
	flex-direction: column;
	gap: calc(var(--default-grid-baseline, 4px) * 3);
}

.cn-party-add__mode {
	display: flex;
	flex-direction: column;
	margin: 0;
	padding: 0;
	border: 0;
}

.cn-party-add__legend {
	margin-bottom: var(--default-grid-baseline, 4px);
	font-weight: 600;
}
</style>
