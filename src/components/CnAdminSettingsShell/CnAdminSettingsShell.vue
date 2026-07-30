<template>
	<div class="cn-admin-settings-shell">
		<!-- Page title header — the uniform "<App> Settings / Configure your <App> installation" block.
		     Uses NcSettingsSection directly (not CnSettingsSection) so the description subtitle and
		     doc-url icon render — CnSettingsSection repurposes those props and does not forward them. -->
		<NcSettingsSection
			:name="resolvedTitle"
			:description="resolvedDescription"
			:doc-url="docUrl" />

		<!-- Version information card (version, up-to-date check, re-import, support footer) -->
		<CnVersionInfoCard
			v-if="showVersionCard"
			:app-name="appName"
			:app-version="resolvedVersion"
			:configured-version="resolvedConfiguredVersion"
			:is-up-to-date="resolvedIsUpToDate"
			:show-update-button="showUpdateButton"
			:updating="updating"
			:title="versionTitle"
			:description="resolvedVersionDescription"
			@update="onUpdate">
			<template #actions>
				<!-- Canonical "Re-import configuration" action (POST /apps/<appId>/api/settings/load) -->
				<NcButton
					v-if="showReimport"
					variant="primary"
					:disabled="reimporting"
					@click="reimport">
					<template #icon>
						<NcLoadingIcon v-if="reimporting" :size="20" />
						<Refresh v-else :size="20" />
					</template>
					{{ reimporting ? importingLabel : reimportLabel }}
				</NcButton>
				<!-- Run the first-time setup wizard on demand (ADR-042). -->
				<NcButton v-if="showSetup" @click="setupWizardOpen = true">
					<template #icon>
						<AutoFix :size="20" />
					</template>
					{{ setupLabel }}
				</NcButton>
				<!-- Open the "help us / suggest a feature" modal. -->
				<NcButton v-if="showHelp" @click="helpModalOpen = true">
					<template #icon>
						<HelpCircleOutline :size="20" />
					</template>
					{{ helpLabel }}
				</NcButton>
				<!-- @slot actions Extra action buttons rendered next to the built-in update / re-import buttons in the version card header. -->
				<slot name="actions" />
			</template>

			<template #footer>
				<!-- @slot footer Replaces the default support/SLA footer inside the version card. -->
				<slot name="footer">
					<div v-if="showSupport" class="cn-support-info">
						<h4>{{ supportTitle }}</h4>
						<p>
							{{ supportLine }}
							<a :href="`mailto:${supportEmail}`">{{ supportEmail }}</a>
						</p>
						<p v-if="slaEmail">
							{{ slaLine }}
							<a :href="`mailto:${slaEmail}`">{{ slaEmail }}</a>
						</p>
					</div>
				</slot>
			</template>

			<template #additional-items>
				<!-- @slot version-items Extra key/value rows appended inside the version card details. -->
				<slot name="version-items" />
			</template>
		</CnVersionInfoCard>

		<!-- @slot default The app's own settings sections, rendered below the version card. -->
		<slot />

		<!-- First-time setup wizard, opened from the admin page (ADR-042). -->
		<CnSetupWizard
			v-if="showSetup && setupWizardOpen"
			:app-id="appId"
			:steps="setupSteps"
			@complete="setupWizardOpen = false"
			@close="setupWizardOpen = false" />

		<!-- "Help us / suggest a feature" modal, opened from the admin page. -->
		<CnSuggestFeatureModal
			v-if="showHelp && helpModalOpen"
			:repo="helpRepo"
			:app="appId"
			@close="helpModalOpen = false" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { loadState } from '@nextcloud/initial-state'
import { generateUrl } from '@nextcloud/router'
import axios from '@nextcloud/axios'
import { showSuccess, showError } from '@nextcloud/dialogs'
import { NcButton, NcLoadingIcon, NcSettingsSection } from '@nextcloud/vue'
import Refresh from 'vue-material-design-icons/Refresh.vue'
import AutoFix from 'vue-material-design-icons/AutoFix.vue'
import HelpCircleOutline from 'vue-material-design-icons/HelpCircleOutline.vue'
import { CnVersionInfoCard } from '../CnVersionInfoCard/index.js'
import CnSetupWizard from '../CnSetupWizard/CnSetupWizard.vue'
import CnSuggestFeatureModal from '../CnSuggestFeatureModal/CnSuggestFeatureModal.vue'

/**
 * CnAdminSettingsShell — the canonical chrome for a Conduction app's Nextcloud
 * admin settings page.
 *
 * Renders, in fleet-standard order:
 *   1. a page title header ("<App> Settings" / "Configure your <App> installation" + doc-url),
 *   2. a CnVersionInfoCard (version from `loadState`, up-to-date badge, a
 *      "Re-import configuration" button wired to the AppHost endpoint
 *      `POST /apps/<appId>/api/settings/load`, and a support/SLA footer),
 *   3. the app's own settings sections (default slot).
 *
 * Every app's `AdminRoot.vue` collapses to a thin wrapper so the chrome can
 * never drift between apps again.
 *
 * Basic usage
 * ```vue
 * <CnAdminSettingsShell
 *   app-id="shillinq"
 *   app-name="Shillinq"
 *   doc-url="https://shillinq.conduction.nl/docs/intro">
 *   <MyRegisterMapping />
 *   <MyFeatureSettings />
 * </CnAdminSettingsShell>
 * ```
 *
 * Real up-to-date check (when the backend exposes it)
 * ```vue
 * <CnAdminSettingsShell
 *   app-id="opencatalogi" app-name="OpenCatalogi"
 *   :app-version="running" :configured-version="configured"
 *   :is-up-to-date="running === configured" />
 * ```
 */
export default {
	name: 'CnAdminSettingsShell',

	components: {
		NcSettingsSection,
		CnVersionInfoCard,
		CnSetupWizard,
		CnSuggestFeatureModal,
		NcButton,
		NcLoadingIcon,
		Refresh,
		AutoFix,
		HelpCircleOutline,
	},

	props: {
		/** The Nextcloud app id (used for the default re-import endpoint + version loadState). */
		appId: {
			type: String,
			required: true,
		},
		/** Human-readable application name shown in the header and version card. */
		appName: {
			type: String,
			required: true,
		},
		/**
		 * Running app version. When empty, read from
		 * `loadState(appId, 'version', 'Unknown')` (provided by AppHost's
		 * GenericAdminSettings::getForm()).
		 */
		appVersion: {
			type: String,
			default: '',
		},
		/** Page title. Defaults to "<appName> Settings". */
		title: {
			type: String,
			default: '',
		},
		/** Page description. Defaults to "Configure your <appName> installation". */
		description: {
			type: String,
			default: '',
		},
		/** Documentation URL (renders the info icon next to the title). */
		docUrl: {
			type: String,
			default: '',
		},
		/** Whether to render the version card. */
		showVersionCard: {
			type: Boolean,
			default: true,
		},
		/** Version card heading. */
		versionTitle: {
			type: String,
			default: () => t('nextcloud-vue', 'Version information'),
		},
		/** Version card description. Defaults to "Information about the current <appName> installation". */
		versionDescription: {
			type: String,
			default: '',
		},
		/**
		 * Configured version (for apps that track a separate config version).
		 * When omitted, read from `loadState(appId, 'configuredVersion', '')`
		 * (AppHost stamps it on each config import).
		 */
		configuredVersion: {
			type: String,
			default: '',
		},
		/**
		 * Whether the installation is up to date. Drives the badge/button in the
		 * version card. When left null, the shell reads the REAL value from
		 * `loadState(appId, 'isUpToDate', true)` — AppHost's GenericAdminSettings
		 * provides it by comparing the running version to the imported config
		 * version. Pass an explicit boolean to override; do NOT hardcode true.
		 */
		isUpToDate: {
			type: Boolean,
			default: null,
		},
		/** Whether to show the version card's up-to-date / update button. */
		showUpdateButton: {
			type: Boolean,
			default: true,
		},
		/** Whether an app update is in progress (drives the update button spinner). */
		updating: {
			type: Boolean,
			default: false,
		},
		/** Whether to show the "Re-import configuration" action. */
		showReimport: {
			type: Boolean,
			default: true,
		},
		/**
		 * Override the re-import endpoint. Defaults to the canonical AppHost
		 * route `/apps/<appId>/api/settings/load`.
		 */
		reimportUrl: {
			type: String,
			default: '',
		},
		/** Whether to render the default support footer. */
		showSupport: {
			type: Boolean,
			default: true,
		},
		/** Support contact email. */
		supportEmail: {
			type: String,
			default: 'support@conduction.nl',
		},
		/** SLA contact email (set to '' to hide the SLA line). */
		slaEmail: {
			type: String,
			default: 'sales@conduction.nl',
		},
		/** Show a "Run setup wizard" action that opens CnSetupWizard (ADR-042). */
		showSetup: {
			type: Boolean,
			default: false,
		},
		/** The `manifest.setup.steps` array passed to CnSetupWizard. */
		setupSteps: {
			type: Array,
			default: () => [],
		},
		/** Show a "Help us / suggest a feature" action that opens CnSuggestFeatureModal. */
		showHelp: {
			type: Boolean,
			default: false,
		},
		/** `<owner>/<repo>` GitHub slug for the feature-request modal. */
		helpRepo: {
			type: String,
			default: '',
		},
	},

	emits: ['update', 'reimported', 'reimport-error'],

	data() {
		return {
			reimporting: false,
			setupWizardOpen: false,
			helpModalOpen: false,
		}
	},

	computed: {
		/** @return {string} The running version, falling back to AppHost initial state. */
		resolvedVersion() {
			if (this.appVersion) {
				return this.appVersion
			}
			return loadState(this.appId, 'version', 'Unknown')
		},
		/** @return {string} Configured version, falling back to AppHost initial state. */
		resolvedConfiguredVersion() {
			return this.configuredVersion || loadState(this.appId, 'configuredVersion', '')
		},
		/** @return {boolean} Real up-to-date signal: explicit prop wins, else AppHost initial state. */
		resolvedIsUpToDate() {
			if (this.isUpToDate !== null) {
				return this.isUpToDate
			}
			return loadState(this.appId, 'isUpToDate', true)
		},
		/** @return {string} Page title, defaulting to "<appName> Settings". */
		resolvedTitle() {
			return this.title || t('nextcloud-vue', '{app} Settings', { app: this.appName })
		},
		/** @return {string} Page description. */
		resolvedDescription() {
			return this.description || t('nextcloud-vue', 'Configure your {app} installation', { app: this.appName })
		},
		/** @return {string} Version card description. */
		resolvedVersionDescription() {
			return this.versionDescription || t('nextcloud-vue', 'Information about the current {app} installation', { app: this.appName })
		},
		/** @return {string} Re-import endpoint. */
		resolvedReimportUrl() {
			return this.reimportUrl || generateUrl('/apps/{appId}/api/settings/load', { appId: this.appId })
		},
		/** @return {string} Re-import button label. */
		reimportLabel() {
			return t('nextcloud-vue', 'Re-import configuration')
		},
		/** @return {string} Re-import in-progress label. */
		importingLabel() {
			return t('nextcloud-vue', 'Importing…')
		},
		/** @return {string} Support footer heading. */
		supportTitle() {
			return t('nextcloud-vue', 'Support')
		},
		/** @return {string} Support footer line. */
		supportLine() {
			return t('nextcloud-vue', 'For support, contact us at')
		},
		/** @return {string} SLA footer line. */
		slaLine() {
			return t('nextcloud-vue', 'For a Service Level Agreement (SLA), contact')
		},
		/** @return {string} Setup-wizard button label. */
		setupLabel() {
			return t('nextcloud-vue', 'Run setup wizard')
		},
		/** @return {string} Help / suggest-feature button label. */
		helpLabel() {
			return t('nextcloud-vue', 'Help us')
		},
	},

	methods: {
		/** Forward the version card's update-button click to the parent. */
		onUpdate() {
			/**
			 * @event update Emitted when the version card's update button is clicked.
			 */
			this.$emit('update')
		},

		/**
		 * Re-import the app's OpenRegister configuration via the canonical
		 * AppHost endpoint, then emit the result so the parent can refresh.
		 *
		 * @return {Promise<void>}
		 */
		async reimport() {
			if (this.reimporting) {
				return
			}
			this.reimporting = true
			try {
				const response = await axios.post(this.resolvedReimportUrl)
				const data = response?.data ?? {}
				// AppHost returns { success, message, ... }; a bare 2xx also counts.
				if (data.success === false) {
					throw new Error(data.message || t('nextcloud-vue', 'Re-import failed'))
				}
				showSuccess(data.message || t('nextcloud-vue', 'Configuration re-imported successfully'))
				/**
				 * @event reimported Emitted after a successful configuration re-import.
				 * @type {object} The AppHost response payload.
				 */
				this.$emit('reimported', data)
			} catch (error) {
				const message = error?.response?.data?.message || error?.message || t('nextcloud-vue', 'Re-import failed')
				showError(message)
				/**
				 * @event reimport-error Emitted when a configuration re-import fails.
				 * @type {Error} The error that caused the failure.
				 */
				this.$emit('reimport-error', error)
			} finally {
				this.reimporting = false
			}
		},
	},
}
</script>

<style scoped>
.cn-admin-settings-shell {
	max-width: 900px;
}

.cn-support-info {
	margin-top: 16px;
	padding-top: 16px;
	border-top: 1px solid var(--color-border);
}

.cn-support-info h4 {
	margin: 0 0 8px 0;
	font-size: 14px;
	font-weight: 600;
	color: var(--color-main-text);
}

.cn-support-info p {
	margin: 4px 0;
	color: var(--color-text-maxcontrast);
	font-size: 14px;
}

.cn-support-info a {
	color: var(--color-primary-element);
}
</style>
