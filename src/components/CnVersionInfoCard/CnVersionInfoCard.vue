<template>
	<CnSettingsSection
		:name="title"
		:description="description"
		:docUrl="docUrl"
		:loading="loading"
		:wide="isBoard && wide"
		:loadingMessage="t('nextcloud-vue', 'Loading version information…')">
		<!-- Actions slot (top right). Under the board look the same buttons sit
		     in the footer row of the card instead. -->
		<template v-if="!isBoard" #actions>
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
			<slot name="actions" />
		</template>

		<!-- Main content (only shown when not loading) -->
		<div v-if="!loading" class="cn-version-info" :class="{ 'cn-version-info--board': isBoard, 'cn-version-info--compact': isBoard && compact }">
			<!-- Version card with gray background -->
			<div class="cn-version-info__card">
				<h4>{{ cardTitle }}</h4>
				<div class="cn-version-info__details">
					<!-- Application Name (the board card can leave it to its description: `showAppName`) -->
					<div v-if="!isBoard || (showAppName && !compact)" class="cn-version-info__item" data-testid="cn-version-info-app-name">
						<span class="cn-version-info__label">{{ fieldLabels.appName }}:</span>
						<span class="cn-version-info__value">{{ appName }}</span>
					</div>

					<!-- Version -->
					<div class="cn-version-info__item">
						<span class="cn-version-info__label">{{ fieldLabels.version }}:</span>
						<span class="cn-version-info__value">{{ appVersion }}</span>
					</div>

					<!-- Configured version: when provided, and always in the board look,
					     which draws the row ("Unknown" until the app reports it) with the
					     up-to-date state inline ("0.4.47, bijgewerkt"). -->
					<div v-if="configuredVersion || isBoard" class="cn-version-info__item" data-testid="cn-version-info-configured">
						<span class="cn-version-info__label">{{ fieldLabels.configuredVersion }}:</span>
						<span class="cn-version-info__value">{{ isBoard ? boardConfiguredText : configuredVersion }}</span>
					</div>

					<!-- Additional items -->
					<div v-for="item in additionalItems" :key="item.label" class="cn-version-info__item">
						<span class="cn-version-info__label">{{ item.label }}:</span>
						<span class="cn-version-info__value" :class="item.statusClass">{{ item.value }}</span>
					</div>

					<!-- Optional additional items slot -->
					<slot name="additional-items" />
				</div>

				<!-- The board card's buttons: update (only while one is due), then the actions. -->
				<div
					v-if="isBoard"
					class="cn-version-info__footer-row"
					:class="{ 'cn-version-info__footer-row--divided': actionsDivider && !compact }"
					data-testid="cn-version-info-footer-row">
					<NcButton
						v-if="showUpdateButton && (!upToDateInline || !isUpToDate || updating)"
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
					<slot name="actions" />
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
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import Check from 'vue-material-design-icons/Check.vue'
import Update from 'vue-material-design-icons/Update.vue'
import { useLook } from '../../composables/useLook.js'
import { ensureTranslations } from '../../l10n/index.js'
import { CnSettingsSection } from '../CnSettingsSection/index.js'

/**
 * CnVersionInfoCard - App version information card for admin settings pages.
 *
 * Displays application name, version, and optional configured version with an
 * update button. Wraps CnSettingsSection for consistent admin settings layout.
 *
 * Every Conduction Nextcloud app should show this as the first section on its
 * admin settings page.
 *
 * Basic usage
 * ```vue
 * <CnVersionInfoCard app-name="Open Register" app-version="0.2.3" />
 * ```
 *
 * With update button
 * ```vue
 * <CnVersionInfoCard
 *   app-name="Open Register"
 *   app-version="0.2.3"
 *   configured-version="0.2.2"
 *   :is-up-to-date="false"
 *   :show-update-button="true"
 *   :updating="isUpdating"
 *   @update="runUpdate" />
 * ```
 *
 * With additional items and actions
 * ```vue
 * <CnVersionInfoCard
 *   app-name="Pipelinq"
 *   app-version="0.1.7"
 *   :additional-items="[{ label: 'Database', value: 'Connected', statusClass: 'cn-version-info__status--ok' }]">
 *   <template #actions>
 *     <NcButton @click="clearCache">Clear App Store Cache</NcButton>
 *   </template>
 * </CnVersionInfoCard>
 * ```
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
		/**
		 * The look the card is drawn in: `board` or `nextcloud`. Empty follows
		 * the `cnLook` that CnAppRoot provides. Under `board` the facts are a
		 * two-column list and the actions sit in a footer row.
		 *
		 * @spec openspec/changes/screens-chrome-parity/specs/settings-board-look/spec.md#requirement-the-version-card-takes-the-board-facts-and-footer
		 */
		look: {
			type: String,
			default: '',
		},

		/**
		 * Under the board look the card spans the whole settings grid, as the
		 * boards draw the version card. Set to `false` to keep it one card in
		 * the grid. Without the board look it has no effect.
		 *
		 * @spec openspec/changes/board-version-card-full-width/specs/settings-board-look/spec.md#requirement-the-board-version-card-spans-the-settings-grid
		 */
		wide: {
			type: Boolean,
			default: true,
		},

		/** Section title */
		title: {
			type: String,
			default: () => t('nextcloud-vue', 'Version information'),
		},

		/** Section description */
		description: {
			type: String,
			default: () => t('nextcloud-vue', 'Information about the current application installation'),
		},

		/** Documentation URL (shows info icon next to title) */
		docUrl: {
			type: String,
			default: '',
		},

		/** Card heading text */
		cardTitle: {
			type: String,
			default: () => t('nextcloud-vue', 'Application information'),
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

		/**
		 * Board look: draw the "Application name" row (PqBeheer does,
		 * dossiq's boards name the app in the description instead).
		 *
		 * @spec openspec/changes/version-card-board-compact/specs/settings-board-look/spec.md#requirement-the-board-version-card-is-compact
		 */
		showAppName: {
			type: Boolean,
			default: true,
		},

		/**
		 * Board look: draw a rule between the facts and the buttons (PqBeheer
		 * does, dossiq's boards do not).
		 *
		 * @spec openspec/changes/version-card-board-compact/specs/settings-board-look/spec.md#requirement-the-board-version-card-is-compact
		 */
		actionsDivider: {
			type: Boolean,
			default: true,
		},

		/**
		 * Board look: read the up-to-date state in the configured version row
		 * ("0.4.47, bijgewerkt", dossiq's boards) instead of a disabled "Up to
		 * date" button among the buttons (PqBeheer). The update button still
		 * shows while an update is due.
		 *
		 * @spec openspec/changes/version-card-board-compact/specs/settings-board-look/spec.md#requirement-the-board-version-card-is-compact
		 */
		inlineUpToDate: {
			type: Boolean,
			default: false,
		},

		/**
		 * Board look: the compact card of dossiq's boards in one switch: no
		 * application name row, no rule above the buttons, the up-to-date
		 * state inline, and 15px facts. The default keeps PqBeheer's card.
		 *
		 * @spec openspec/changes/version-card-board-compact/specs/settings-board-look/spec.md#requirement-the-board-version-card-is-compact
		 */
		compact: {
			type: Boolean,
			default: false,
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

		/**
		 * Custom labels for the standard fields, `{ appName?, version?, configuredVersion? }`.
		 * A label left out keeps the translated default.
		 */
		labels: {
			type: Object,
			default: () => ({}),
		},
	},

	emits: ['update'],

	setup(props) {
		// An admin page can be an entry with no other library surface: its
		// chrome reads in the user's language without the app registering.
		ensureTranslations()
		const { isBoard } = useLook(props)
		return { isBoard }
	},

	computed: {
		/**
		 * The field labels: the app's, else the library's in the reader's language.
		 *
		 * @return {{appName: string, version: string, configuredVersion: string}}
		 * @spec openspec/changes/version-card-dutch-and-header/specs/settings-board-look/spec.md#requirement-the-admin-chrome-reads-in-the-readers-language
		 */
		fieldLabels() {
			return {
				appName: t('nextcloud-vue', 'Application name'),
				version: t('nextcloud-vue', 'Version'),
				configuredVersion: t('nextcloud-vue', 'Configured version'),
				...(this.labels || {}),
			}
		},

		/**
		 * The board card's configured version line: the version ("Unknown"
		 * without one), and with `inlineUpToDate` ", up to date" when the app
		 * tracks updates and is.
		 *
		 * @return {string}
		 * @spec openspec/changes/version-card-board-compact/specs/settings-board-look/spec.md#requirement-the-board-version-card-is-compact
		 */
		boardConfiguredText() {
			const version = this.configuredVersion || t('nextcloud-vue', 'Unknown')
			return this.upToDateInline && this.showUpdateButton && this.isUpToDate && !this.updating
				? t('nextcloud-vue', '{version}, up to date', { version })
				: version
		},

		/** @return {boolean} Whether the up-to-date state reads in the configured version row. */
		upToDateInline() {
			return this.inlineUpToDate || this.compact
		},

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
				return t('nextcloud-vue', 'Updating…')
			}
			if (this.isUpToDate) {
				return t('nextcloud-vue', 'Up to date')
			}
			return t('nextcloud-vue', 'Update')
		},
	},

	methods: {
		t,

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
