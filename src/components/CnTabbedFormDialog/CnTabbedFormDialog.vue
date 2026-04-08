<template>
	<NcDialog
		:name="resolvedTitle"
		:size="size"
		:can-close="!loading"
		@closing="$emit('close')">
		<!-- Result phase (standard mode, not create-another) -->
		<div v-if="result !== null && !createAnother" class="cn-tabbed-form-dialog__result">
			<NcNoteCard v-if="result.success" type="success">
				{{ resolvedSuccessText }}
			</NcNoteCard>
			<NcNoteCard v-if="result.error" type="error">
				{{ result.error }}
			</NcNoteCard>
		</div>

		<!-- Form phase (or create-another mode where form stays visible) -->
		<div v-if="createAnother || result === null" class="cn-tabbed-form-dialog__form">
			<!-- Inline notifications for create-another mode -->
			<NcNoteCard v-if="createAnother && result && result.success" type="success">
				{{ resolvedSuccessText }}
			</NcNoteCard>
			<NcNoteCard v-if="result && result.error" type="error">
				{{ result.error }}
			</NcNoteCard>

			<!-- Optional content above tabs (e.g. metadata grid, detail cards) -->
			<slot name="above-tabs" :loading="loading" />

			<!-- Tabs -->
			<div class="cn-tabbed-form-dialog__tabs tabContainer">
				<BTabs
					v-model="activeTab"
					content-class="mt-3"
					justified
					@input="$emit('update:activeTab', $event)">
					<BTab
						v-for="tab in tabs"
						:key="tab.id"
						:disabled="tab.disabled">
						<template #title>
							<component :is="tab.icon" v-if="tab.icon" :size="16" />
							<span>{{ tab.title }}</span>
						</template>
						<div class="cn-tabbed-form-dialog__tab-content form-editor">
							<slot :name="'tab-' + tab.id" :loading="loading" />
						</div>
					</BTab>
				</BTabs>
			</div>

			<!-- Optional content below tabs (e.g. shared settings across all tabs) -->
			<slot name="below-tabs" :loading="loading" />
		</div>

		<template #actions>
			<!-- Create another checkbox (only in create mode) -->
			<NcCheckboxRadioSwitch
				v-if="showCreateAnother && isCreateMode"
				class="cn-tabbed-form-dialog__create-another"
				:disabled="loading"
				:checked.sync="createAnother">
				{{ createAnotherLabel }}
			</NcCheckboxRadioSwitch>

			<!-- Extra actions before Cancel -->
			<slot name="actions-left"
				:loading="loading"
				:is-create-mode="isCreateMode"
				:result="result" />

			<!-- Cancel / Close button -->
			<NcButton @click="handleClose">
				<template #icon>
					<Cancel :size="20" />
				</template>
				{{ result !== null && !createAnother ? closeLabel : cancelLabel }}
			</NcButton>

			<!-- Extra actions after primary -->
			<slot name="actions-right"
				:loading="loading"
				:is-create-mode="isCreateMode"
				:result="result" />

			<!-- Primary action button (Save / Create) -->
			<NcButton
				v-if="createAnother || result === null"
				type="primary"
				:disabled="loading || disableSave"
				@click="executeConfirm">
				<template #icon>
					<NcLoadingIcon v-if="loading" :size="20" />
					<slot v-else-if="$slots['confirm-icon']" name="confirm-icon" />
					<Plus v-else-if="isCreateMode" :size="20" />
					<ContentSaveOutline v-else :size="20" />
				</template>
				{{ resolvedConfirmLabel }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import {
	NcButton,
	NcDialog,
	NcLoadingIcon,
	NcNoteCard,
	NcCheckboxRadioSwitch,
} from '@nextcloud/vue'
import { BTabs, BTab } from 'bootstrap-vue'

import Cancel from 'vue-material-design-icons/Cancel.vue'
import ContentSaveOutline from 'vue-material-design-icons/ContentSaveOutline.vue'
import Plus from 'vue-material-design-icons/Plus.vue'

export default {
	name: 'CnTabbedFormDialog',
	components: {
		NcDialog,
		NcButton,
		NcLoadingIcon,
		NcNoteCard,
		NcCheckboxRadioSwitch,
		BTabs,
		BTab,
		Cancel,
		ContentSaveOutline,
		Plus,
	},
	props: {
		/**
		 * Array of tab definitions. Each tab must have at least an `id` and `title`.
		 * The optional `icon` field should be a Vue component reference (e.g. an imported MDI icon).
		 * The optional `disabled` field prevents tab selection.
		 *
		 * @type {Array<{ id: string, title: string, icon?: object, disabled?: boolean }>}
		 */
		tabs: {
			type: Array,
			required: true,
			validator: (tabs) => tabs.length > 0 && tabs.every(t => t.id && t.title),
		},
		/**
		 * Existing item for edit mode. Pass null or undefined for create mode.
		 * The component only checks for truthiness to determine create vs edit mode.
		 *
		 * @type {object|null}
		 */
		item: {
			type: Object,
			default: null,
		},
		/**
		 * Custom dialog title. When provided, overrides the auto-generated
		 * "Create {entityName}" / "Edit {entityName}" title.
		 *
		 * @type {string}
		 */
		dialogTitle: {
			type: String,
			default: '',
		},
		/**
		 * Entity name used in auto-generated titles and success messages.
		 * For example, "Organisation" produces "Create Organisation" and
		 * "Organisation saved successfully".
		 *
		 * @type {string}
		 */
		entityName: {
			type: String,
			default: 'Item',
		},
		/**
		 * NcDialog size. One of 'small', 'normal', 'large', 'full'.
		 *
		 * @type {string}
		 */
		size: {
			type: String,
			default: 'large',
		},
		/**
		 * Whether to show the "Create Another" checkbox in create mode.
		 * When checked and a save succeeds, the form stays open and a reset
		 * event is emitted so the parent can clear form data.
		 *
		 * @type {boolean}
		 */
		showCreateAnother: {
			type: Boolean,
			default: false,
		},
		/**
		 * Whether the primary save/create button is disabled.
		 * The parent controls validation externally.
		 *
		 * @type {boolean}
		 */
		disableSave: {
			type: Boolean,
			default: false,
		},
		/**
		 * Custom success message shown in the result NcNoteCard.
		 * Defaults to "{entityName} saved successfully".
		 *
		 * @type {string}
		 */
		successText: {
			type: String,
			default: '',
		},
		/**
		 * Cancel button label.
		 *
		 * @type {string}
		 */
		cancelLabel: {
			type: String,
			default: 'Cancel',
		},
		/**
		 * Close button label shown in the result phase.
		 *
		 * @type {string}
		 */
		closeLabel: {
			type: String,
			default: 'Close',
		},
		/**
		 * Primary confirm button label. Defaults to "Create" in create mode
		 * or "Save" in edit mode.
		 *
		 * @type {string}
		 */
		confirmLabel: {
			type: String,
			default: '',
		},
		/**
		 * Label for the "Create Another" checkbox.
		 *
		 * @type {string}
		 */
		createAnotherLabel: {
			type: String,
			default: 'Create another',
		},
	},
	data() {
		return {
			/** @type {number} Current active tab index */
			activeTab: 0,
			/** @type {boolean} Whether the "create another" checkbox is checked */
			createAnother: false,
			/** @type {boolean} Whether an API operation is in progress */
			loading: false,
			/**
			 * Result of the last operation.
			 * null = form phase, { success: true } = success, { error: 'msg' } = error
			 *
			 * @type {{ success?: boolean, error?: string }|null}
			 */
			result: null,
			/** @type {number|null} Timeout ID for auto-close after success */
			closeTimeout: null,
			/** @type {number|null} Timeout ID for clearing success in create-another mode */
			successClearTimeout: null,
		}
	},
	computed: {
		/**
		 * Whether the dialog is in create mode (no existing item).
		 *
		 * @return {boolean}
		 */
		isCreateMode() {
			return !this.item
		},
		/**
		 * Resolved dialog title. Uses dialogTitle prop if provided,
		 * otherwise auto-generates from entityName and mode.
		 *
		 * @return {string}
		 */
		resolvedTitle() {
			if (this.dialogTitle) {
				return this.dialogTitle
			}
			return this.isCreateMode
				? `Create ${this.entityName}`
				: `Edit ${this.entityName}`
		},
		/**
		 * Resolved success text for NcNoteCard.
		 *
		 * @return {string}
		 */
		resolvedSuccessText() {
			if (this.successText) {
				return this.successText
			}
			return `${this.entityName} saved successfully`
		},
		/**
		 * Resolved primary button label.
		 *
		 * @return {string}
		 */
		resolvedConfirmLabel() {
			if (this.confirmLabel) {
				return this.confirmLabel
			}
			return this.isCreateMode ? 'Create' : 'Save'
		},
	},
	beforeDestroy() {
		clearTimeout(this.closeTimeout)
		clearTimeout(this.successClearTimeout)
	},
	methods: {
		/**
		 * Set the result of the save operation. Call this from the parent
		 * after the API call completes.
		 *
		 * When success is true and create-another is not checked, the dialog
		 * auto-closes after 2 seconds. When create-another is checked,
		 * the success message shows inline for 2 seconds, then clears and
		 * emits the `reset` event.
		 *
		 * @param {{ success?: boolean, error?: string }} resultData - Result data to pass to the dialog
		 * @public
		 */
		setResult(resultData) {
			this.loading = false
			this.result = resultData

			if (resultData.success) {
				if (this.createAnother) {
					// Create-another mode: show success briefly, then reset
					this.successClearTimeout = setTimeout(() => {
						this.result = null
						this.activeTab = 0
						/**
						 * Emitted after a successful save in create-another mode.
						 * The parent should clear its form data.
						 *
						 * @event reset
						 */
						this.$emit('reset')
					}, 2000)
				} else {
					// Standard mode: auto-close after 2 seconds
					this.closeTimeout = setTimeout(() => {
						/**
						 * Emitted when the dialog should be closed.
						 *
						 * @event close
						 */
						this.$emit('close')
					}, 2000)
				}
			}
		},

		/**
		 * Reset the dialog to its initial form state.
		 * Clears any result, resets loading, and returns to the first tab.
		 *
		 * @public
		 */
		resetDialog() {
			clearTimeout(this.closeTimeout)
			clearTimeout(this.successClearTimeout)
			this.result = null
			this.loading = false
			this.activeTab = 0
		},

		/**
		 * Handle the primary action button click.
		 * Sets loading state and emits the confirm event.
		 *
		 * @private
		 */
		executeConfirm() {
			this.loading = true
			this.result = null
			/**
			 * Emitted when the user clicks Save/Create.
			 * The parent should perform the API call and then call setResult().
			 *
			 * @event confirm
			 */
			this.$emit('confirm')
		},

		/**
		 * Handle close button click. Clears timeouts and emits close.
		 *
		 * @private
		 */
		handleClose() {
			clearTimeout(this.closeTimeout)
			clearTimeout(this.successClearTimeout)
			this.result = null
			this.loading = false
			this.createAnother = false
			this.activeTab = 0
			this.$emit('close')
		},
	},
}
</script>

<style scoped>
/* Result phase container */
.cn-tabbed-form-dialog__result {
	padding: 16px 0;
}

/* Form phase container */
.cn-tabbed-form-dialog__form {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

/* Tabs wrapper */
.cn-tabbed-form-dialog__tabs {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

/* Tab content area — also uses .form-editor for compatibility */
.cn-tabbed-form-dialog__tab-content {
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 16px 0;
}

/* Create another checkbox — push to the left in actions area */
.cn-tabbed-form-dialog__create-another {
	margin-right: auto;
}

/* Bootstrap-Vue tab container styling */
.tabContainer > * ul > li {
	display: flex;
	flex: 1;
}

.tabContainer > * ul > li:hover {
	background-color: var(--color-background-hover);
}

.tabContainer > * ul > li > a {
	flex: 1;
	text-align: center;
}

.tabContainer > * ul > li > .active {
	background: transparent !important;
	color: var(--color-main-text) !important;
	border-bottom: var(--default-grid-baseline) solid var(--color-primary-element) !important;
}

.tabContainer > * ul[role="tablist"] {
	display: flex;
	margin: 10px 8px 0 8px;
	justify-content: space-between;
	border-bottom: 1px solid var(--color-border);
}

.tabContainer > * ul[role="tablist"] > * a[role="tab"] {
	padding-inline-start: 10px;
	padding-inline-end: 10px;
	padding-block-start: 10px;
	padding-block-end: 10px;
}

.tabContainer > * div[role="tabpanel"] {
	margin-block-start: var(--OR-margin-10);
}

:deep(.nav-tabs) {
	border-bottom: 1px solid var(--color-border);
	margin-bottom: 15px;
	display: flex;
}

:deep(.nav-tabs .nav-item) {
	display: flex;
	flex: 1;
}

:deep(.nav-tabs .nav-link) {
	flex: 1;
	text-align: center;
	border: none;
	border-bottom: 2px solid transparent;
	color: var(--color-text-maxcontrast);
	padding: 8px 16px;
	display: flex;
	align-items: center;
	gap: 8px;
	justify-content: center;
}

:deep(.nav-tabs .nav-link.active) {
	color: var(--color-main-text);
	border-bottom: 2px solid var(--color-primary);
	background-color: transparent;
}

:deep(.nav-tabs .nav-link:hover) {
	border-bottom: 2px solid var(--color-border);
}

:deep(.nav-tabs .nav-link.disabled) {
	cursor: not-allowed;
	opacity: 0.5;
	color: var(--color-text-maxcontrast);
	pointer-events: auto;
}
:deep(.nav-tabs .nav-link.disabled *) {
    cursor: not-allowed;
}

:deep(.nav-tabs .nav-link.disabled:hover) {
	border-bottom: 2px solid transparent;
}

:deep(.tab-content) {
	padding: 16px;
	background-color: var(--color-main-background);
}
</style>
