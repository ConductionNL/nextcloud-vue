<template>
	<NcSettingsSection
		v-if="open"
		:name="name"
		:description="shownDescription"
		:docUrl="docUrl"
		data-testid="cn-settings-section"
		:class="{ 'cn-settings-section--wide': wide, 'cn-settings-section--title-actions': actionsInTitle && Boolean($slots.actions) }"
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
			<NcButton v-if="onRetry" variant="primary" @click="onRetry">
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

		<!-- `footerLink`: where the list in this card is managed, at the
		     end of the card (DqVthInstellingen "Leges beheren in shillinq"). -->
		<p v-if="footerHref" class="cn-settings-section__footer-link">
			<a :href="footerHref" data-testid="cn-settings-section-footer-link">{{ footerLink.label }}</a>
		</p>
	</NcSettingsSection>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon, NcSettingsSection } from '@nextcloud/vue'
import InformationOutline from 'vue-material-design-icons/InformationOutline.vue'
import Refresh from 'vue-material-design-icons/Refresh.vue'
import { safeHref } from '../../utils/safeHref.js'

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
 * Basic usage
 * ```vue
 * <CnSettingsSection name="Cache Management" description="Manage application caches">
 *   <template #actions>
 *     <NcButton @click="clearCache">Clear Cache</NcButton>
 *   </template>
 *   <p>Cache hit rate: 94%</p>
 * </CnSettingsSection>
 * ```
 *
 * With loading and error states
 * ```vue
 * <CnSettingsSection
 *   name="Statistics"
 *   :loading="isLoading"
 *   loading-message="Loading statistics..."
 *   :error="hasError"
 *   error-message="Failed to load statistics"
 *   :on-retry="loadStats">
 *   <StatsTable :data="stats" />
 * </CnSettingsSection>
 * ```
 *
 * With empty state
 * ```vue
 * <CnSettingsSection name="API Tokens" :empty="tokens.length === 0" empty-message="No tokens configured">
 *   <TokenList :tokens="tokens" />
 * </CnSettingsSection>
 * ```
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
		/**
		 * Draw the `actions` slot in the title row, beside the heading, as
		 * the boards do, instead of floating it right above the content.
		 *
		 * @spec openspec/changes/settings-section-title-actions/specs/settings-section-title-actions/spec.md#requirement-a-settings-section-can-draw-its-actions-in-its-title-row
		 */
		actionsInTitle: {
			type: Boolean,
			default: false,
		},

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

		/**
		 * Span the whole row of the settings grid instead of one column. Only
		 * the board look draws a grid; elsewhere the section is full width
		 * anyway.
		 *
		 * @spec openspec/changes/screens-chrome-parity/specs/settings-board-look/spec.md#requirement-settings-sections-are-cards-in-a-grid
		 */
		wide: {
			type: Boolean,
			default: false,
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
			default: () => t('nextcloud-vue', 'Loading…'),
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

		/**
		 * A link at the end of the card to where its list is managed:
		 * `{ label, href }`, the label already translated. Drawn only with
		 * both and a safe href.
		 *
		 * @spec openspec/changes/settings-section-footer-link/specs/settings-section-footer-link/spec.md#requirement-a-settings-section-can-end-with-a-link
		 */
		footerLink: {
			type: Object,
			default: null,
		},

		/**
		 * The row this card is opened from, already translated: the card shows
		 * only while the page's hash names its `id` (the row's settings link,
		 * `#<id>`), and says "Opened from the row {row}" under its title in
		 * place of its description (DqInstellingen "Kadaster (BRK) en WOZ").
		 * Empty: the card is always shown.
		 *
		 * @spec openspec/changes/settings-section-opened-from-row/specs/settings-section-opened-from-row/spec.md#requirement-a-settings-card-can-be-opened-from-a-row
		 */
		openedFrom: {
			type: String,
			default: '',
		},
	},

	data() {
		return { hash: typeof window !== 'undefined' ? window.location.hash : '' }
	},

	computed: {
		/** @return {boolean} Whether the card is drawn: always, unless it opens from a row that was not followed. */
		open() {
			if (this.openedFrom === '') {
				return true
			}
			const id = this.$attrs.id
			return typeof id === 'string' && id !== '' && this.hash === `#${id}`
		},

		/** @return {string} The line under the title. */
		shownDescription() {
			return this.openedFrom === ''
				? this.description
				: t('nextcloud-vue', 'Opened from the row {row}', { row: this.openedFrom })
		},

		/** @return {string} The footer link's safe href, or '' for no link. */
		footerHref() {
			const link = this.footerLink
			if (!link || typeof link.label !== 'string' || link.label === '' || typeof link.href !== 'string' || link.href === '') {
				return ''
			}
			const href = safeHref(link.href)
			return href === '#' ? '' : href
		},
	},

	mounted() {
		if (this.openedFrom !== '') {
			window.addEventListener('hashchange', this.onHashChange)
		}
	},

	beforeUnmount() {
		window.removeEventListener('hashchange', this.onHashChange)
	},

	methods: {
		/** Follow the page's hash, which names the card a row opened. */
		onHashChange() {
			this.hash = window.location.hash
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
	position: relative;
	z-index: 10;
}

.cn-settings-section__content {
	clear: both;
}

/* Actions in the title row (`actionsInTitle`): the heading and the actions
   share the first row, everything else runs below across the width. */
.cn-settings-section--title-actions {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	column-gap: 12px;
	align-items: start;
}

.cn-settings-section--title-actions :deep(> *) {
	grid-column: 1 / -1;
}

.cn-settings-section--title-actions :deep(> h2) {
	grid-column: 1;
	grid-row: 1;
}

.cn-settings-section--title-actions > .cn-settings-section__actions {
	grid-column: 2;
	grid-row: 1;
	float: none;
	align-self: center;
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

.cn-settings-section__footer-link {
	margin: 16px 0 0;
	text-align: end;
}

.cn-settings-section__footer-link a {
	color: var(--color-primary-element-text-dark, var(--color-primary-element));
	font-weight: 600;
	text-decoration: underline;
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
