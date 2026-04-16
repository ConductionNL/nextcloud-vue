<template>
	<CnSettingsSection
		:name="title"
		:description="description"
		:doc-url="docUrl"
		:loading="loading"
		loading-message="Loading version information...">
		<!-- Actions slot -->
		<template #actions>
			<!-- Update Button -->
			<NcButton
				v-if="showUpdateButton"
				:type="updateButtonType"
				:disabled="updateButtonDisabled"
				@click="handleUpdateClick">
				<template #icon>
					<NcLoadingIcon v-if="updating" :size="20" />
					<Check v-else-if="isUpToDate" :size="20" />
					<Update v-else :size="20" />
				</template>
				{{ updateButtonText }}
			</NcButton>

			<!-- Additional Actions (slot) -->
			<slot name="header-actions" />
			<slot name="actions" />
		</template>

		<!-- Main content (only shown when not loading) -->
		<div v-if="!loading" class="cn-version-info">
			<!-- Version card with gray background -->
			<div class="cn-version-info__card">
				<h4>{{ cardTitle }}</h4>
				<div class="cn-version-info__details">
					<!-- Application Name -->
					<div class="cn-version-info__item">
						<span class="cn-version-info__label">{{ labels.appName }}:</span>
						<span class="cn-version-info__value">{{ appName }}</span>
					</div>

					<!-- Version -->
					<div class="cn-version-info__item">
						<span class="cn-version-info__label">{{ labels.version }}:</span>
						<span class="cn-version-info__value">{{ appVersion }}</span>
					</div>

					<!-- Configured Version (if provided) -->
					<div v-if="configuredVersion" class="cn-version-info__item">
						<span class="cn-version-info__label">{{ labels.configuredVersion }}:</span>
						<span class="cn-version-info__value">{{ configuredVersion }}</span>
					</div>

					<!-- Additional items -->
					<div v-for="item in additionalItems" :key="item.label" class="cn-version-info__item">
						<span class="cn-version-info__label">{{ item.label }}:</span>
						<span class="cn-version-info__value" :class="item.statusClass">{{ item.value }}</span>
					</div>

					<!-- Optional additional items slot -->
					<slot name="additional-items" />
				</div>

				<!-- Optional footer slot -->
				<slot name="footer" />
			</div>

			<!-- Optional extra cards slot -->
			<slot name="extra-cards" />
		</div>
	</CnSettingsSection>
</template>

<script>
import { CnSettingsSection } from '../CnSettingsSection/index.js'
import { NcLoadingIcon, NcButton } from '@nextcloud/vue'
import Check from 'vue-material-design-icons/Check.vue'
import Update from 'vue-material-design-icons/Update.vue'

/**
 * CnVersionInfoCard - App version information card for admin settings pages.
 *
 * Displays application name, version, and optional configured version with an
 * update button. Wraps CnSettingsSection for consistent admin settings layout.
 *
 * Every Conduction Nextcloud app should show this as the first section on its
 * admin settings page.
 *
 * @example Basic usage
 * <CnVersionInfoCard app-name="Open Register" app-version="0.2.3" />
 *
 * @example With update button
 * <CnVersionInfoCard
 *   app-name="Open Register"
 *   app-version="0.2.3"
 *   configured-version="0.2.2"
 *   :is-up-to-date="false"
 *   :show-update-button="true"
 *   :updating="isUpdating"
 *   @update="runUpdate" />
 *
 * @example With additional items and actions
 * <CnVersionInfoCard
 *   app-name="Pipelinq"
 *   app-version="0.1.7"
 *   :additional-items="[{ label: 'Database', value: 'Connected', statusClass: 'cn-version-info__status--ok' }]">
 *   <template #actions>
 *     <NcButton @click="clearCache">Clear App Store Cache</NcButton>
 *   </template>
 * </CnVersionInfoCard>
 */
export default {
	name: 'CnVersionInfoCard',

	components: {
		CnSettingsSection,
		NcLoadingIcon,
		NcButton,
		Check,
		Update,
	},

	props: {
		/** Section title */
		title: {
			type: String,
			default: 'Version Information',
		},
		/** Section description */
		description: {
			type: String,
			default: 'Information about the current application installation',
		},
		/** Documentation URL (shows info icon next to title) */
		docUrl: {
			type: String,
			default: '',
		},
		/** Card heading text */
		cardTitle: {
			type: String,
			default: 'Application Information',
		},
		/** Application name to display */
		appName: {
			type: String,
			required: true,
		},
		/** Application version string */
		appVersion: {
			type: String,
			required: true,
		},
		/** Configured version (optional, for apps that track configuration versions separately) */
		configuredVersion: {
			type: String,
			default: '',
		},
		/** Whether the app configuration is up to date */
		isUpToDate: {
			type: Boolean,
			default: true,
		},
		/** Whether to show the update button */
		showUpdateButton: {
			type: Boolean,
			default: false,
		},
		/** Whether an update is currently in progress */
		updating: {
			type: Boolean,
			default: false,
		},
		/**
		 * Additional key-value items to display.
		 * Format: [{ label: 'Label', value: 'Value', statusClass: 'cn-version-info__status--ok' }]
		 */
		additionalItems: {
			type: Array,
			default: () => [],
		},
		/** Whether version info is loading */
		loading: {
			type: Boolean,
			default: false,
		},
		/** Custom labels for the standard fields */
		labels: {
			type: Object,
			default: () => ({
				appName: 'Application Name',
				version: 'Version',
				configuredVersion: 'Configured Version',
			}),
		},
	},

	emits: ['update'],

	computed: {
		/** @return {string} Button type based on update status */
		updateButtonType() {
			if (this.isUpToDate) {
				return 'success'
			}
			return 'error'
		},

		/** @return {boolean} Whether the update button should be disabled */
		updateButtonDisabled() {
			return this.isUpToDate || this.updating
		},

		/** @return {string} Update button label text */
		updateButtonText() {
			if (this.updating) {
				return 'Updating...'
			}
			if (this.isUpToDate) {
				return 'Up to date'
			}
			return 'Update'
		},
	},

	methods: {
		handleUpdateClick() {
			if (!this.updateButtonDisabled) {
				this.$emit('update')
			}
		},
	},
}
</script>

<style scoped>
.cn-version-info__card {
	background: var(--color-background-hover);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	padding: 20px;
	margin-bottom: 20px;
}

.cn-version-info__card h4 {
	margin: 0 0 16px 0;
	font-size: 16px;
	font-weight: 600;
	color: var(--color-main-text);
}

.cn-version-info__details {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-version-info__item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 8px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-version-info__item:last-child {
	border-bottom: none;
}

.cn-version-info__label {
	font-weight: 500;
	color: var(--color-text-maxcontrast);
	font-size: 14px;
}

.cn-version-info__value {
	font-family: 'Courier New', Courier, monospace;
	font-weight: 600;
	color: var(--color-main-text);
	font-size: 14px;
}

/* Status classes for values */
.cn-version-info__status--ok {
	color: var(--color-success);
	font-weight: 600;
}

.cn-version-info__status--warning {
	color: var(--color-warning);
	font-weight: 600;
}

.cn-version-info__status--error {
	color: var(--color-error);
	font-weight: 600;
}

@media (max-width: 768px) {
	.cn-version-info__item {
		flex-direction: column;
		align-items: flex-start;
		gap: 4px;
	}

	.cn-version-info__label {
		font-weight: 600;
	}

	.cn-version-info__value {
		word-break: break-all;
	}
}
</style>
