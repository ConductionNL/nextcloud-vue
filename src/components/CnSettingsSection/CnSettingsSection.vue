<template>
	<NcSettingsSection
		:name="name"
		:description="description"
		:doc-url="docUrl"
		v-bind="$attrs">
		<!-- Action buttons positioned top-right -->
		<div v-if="$slots.actions" class="cn-settings-section__actions">
			<slot name="actions" />
		</div>

		<!-- Section Description (optional detailed description box) -->
		<div v-if="$slots.description || detailedDescription" class="cn-settings-section__description">
			<slot name="description">
				<p v-if="detailedDescription" class="cn-settings-section__description-text">
					{{ detailedDescription }}
				</p>
			</slot>
		</div>

		<!-- Main Content -->
		<div class="cn-settings-section__content">
			<slot />
		</div>

		<!-- Loading State -->
		<div v-if="loading" class="cn-settings-section__loading">
			<NcLoadingIcon :size="32" />
			<p>{{ loadingMessage }}</p>
		</div>

		<!-- Error State -->
		<div v-if="error && !loading" class="cn-settings-section__error">
			<p class="cn-settings-section__error-message">
				{{ errorMessage }}
			</p>
			<NcButton v-if="onRetry" type="primary" @click="onRetry">
				<template #icon>
					<Refresh :size="20" />
				</template>
				{{ retryButtonText }}
			</NcButton>
		</div>

		<!-- Empty State -->
		<div v-if="empty && !loading && !error" class="cn-settings-section__empty">
			<slot name="empty">
				<div class="cn-settings-section__empty-content">
					<InformationOutline :size="48" />
					<p>{{ emptyMessage }}</p>
				</div>
			</slot>
		</div>

		<!-- Footer Actions -->
		<div v-if="$slots.footer" class="cn-settings-section__footer">
			<slot name="footer" />
		</div>
	</NcSettingsSection>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcSettingsSection, NcLoadingIcon, NcButton } from '@nextcloud/vue'
import Refresh from 'vue-material-design-icons/Refresh.vue'
import InformationOutline from 'vue-material-design-icons/InformationOutline.vue'

/**
 * CnSettingsSection - Admin settings section wrapper with consistent layout.
 *
 * Wraps NcSettingsSection with action buttons (top-right), loading/error/empty
 * states, and a footer slot. Use this as the container for each section on an
 * admin settings page.
 *
 * Extracted from OpenRegister's SettingsSection. Designed for reuse across all
 * Conduction Nextcloud apps.
 *
 * @example Basic usage
 * <CnSettingsSection name="Cache Management" description="Manage application caches">
 *   <template #actions>
 *     <NcButton @click="clearCache">Clear Cache</NcButton>
 *   </template>
 *   <p>Cache hit rate: 94%</p>
 * </CnSettingsSection>
 *
 * @example With loading and error states
 * <CnSettingsSection
 *   name="Statistics"
 *   :loading="isLoading"
 *   loading-message="Loading statistics..."
 *   :error="hasError"
 *   error-message="Failed to load statistics"
 *   :on-retry="loadStats">
 *   <StatsTable :data="stats" />
 * </CnSettingsSection>
 *
 * @example With empty state
 * <CnSettingsSection name="API Tokens" :empty="tokens.length === 0" empty-message="No tokens configured">
 *   <TokenList :tokens="tokens" />
 * </CnSettingsSection>
 */
export default {
	name: 'CnSettingsSection',

	components: {
		NcSettingsSection,
		NcLoadingIcon,
		NcButton,
		Refresh,
		InformationOutline,
	},

	inheritAttrs: false,

	props: {
		/** Section name/title */
		name: {
			type: String,
			required: true,
		},
		/** Brief section description (shown under title by NcSettingsSection) */
		description: {
			type: String,
			default: '',
		},
		/** Detailed description shown in a separate block below the title */
		detailedDescription: {
			type: String,
			default: '',
		},
		/** Documentation URL (shows info icon next to title) */
		docUrl: {
			type: String,
			default: '',
		},
		/** Whether the section is in a loading state */
		loading: {
			type: Boolean,
			default: false,
		},
		/** Message shown during loading */
		loadingMessage: {
			type: String,
			default: () => t('nextcloud-vue', 'Loading...'),
		},
		/** Whether the section is in an error state */
		error: {
			type: Boolean,
			default: false,
		},
		/** Message shown when in error state */
		errorMessage: {
			type: String,
			default: () => t('nextcloud-vue', 'An error occurred'),
		},
		/** Callback function for retry button (shown in error state). If null, no retry button is shown. */
		onRetry: {
			type: Function,
			default: null,
		},
		/** Text for the retry button */
		retryButtonText: {
			type: String,
			default: () => t('nextcloud-vue', 'Retry'),
		},
		/** Whether the section has no data to show */
		empty: {
			type: Boolean,
			default: false,
		},
		/** Message shown when section is empty */
		emptyMessage: {
			type: String,
			default: () => t('nextcloud-vue', 'No data available'),
		},
	},
}
</script>

<style scoped>
.cn-settings-section__actions {
	display: flex;
	gap: 0.5rem;
	align-items: center;
	justify-content: flex-end;
	float: right;
	margin-top: -66px;
	margin-bottom: 26px;
	position: relative;
	z-index: 10;
}

.cn-settings-section__content {
	clear: both;
}

.cn-settings-section__description-text {
	color: var(--color-text-maxcontrast);
	margin-bottom: 16px;
}

.cn-settings-section__loading {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 40px 20px;
	gap: 16px;
}

.cn-settings-section__loading p {
	color: var(--color-text-maxcontrast);
	font-size: 14px;
}

.cn-settings-section__error {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 32px 20px;
	gap: 16px;
	background: var(--color-error-light);
	border: 1px solid var(--color-error);
	border-radius: var(--border-radius-large);
}

.cn-settings-section__error-message {
	color: var(--color-error);
	font-weight: 500;
	margin: 0;
}

.cn-settings-section__empty {
	padding: 40px 20px;
}

.cn-settings-section__empty-content {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16px;
	color: var(--color-text-maxcontrast);
}

.cn-settings-section__empty-content p {
	margin: 0;
	font-size: 14px;
}

.cn-settings-section__footer {
	margin-top: 24px;
	padding-top: 24px;
	border-top: 1px solid var(--color-border);
}

@media (max-width: 768px) {
	.cn-settings-section__actions {
		position: static;
		margin-top: 0;
		margin-bottom: 1rem;
		float: none;
		flex-direction: column;
		align-items: stretch;
	}
}
</style>
