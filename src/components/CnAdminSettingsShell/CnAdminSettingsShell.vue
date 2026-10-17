<template>
	<div class="cn-admin-settings-shell" :class="[ownLookClass, sectionColumns ? `cn-admin-settings-shell--columns-${sectionColumns}` : '']">
		<!-- Names a development, test or acceptance environment; cannot be dismissed. Production shows nothing. -->
		<CnEnvironmentBanner v-if="environmentName" :environment="environmentName" />

		<!-- Page title header — the uniform "<App> Settings / Configure your <App> installation" block.
		     Uses NcSettingsSection directly (not CnSettingsSection) so the description subtitle and
		     doc-url icon render — CnSettingsSection repurposes those props and does not forward them. -->
		<NcSettingsSection
			v-if="!isBoard"
			:name="resolvedTitle"
			:description="resolvedDescription"
			:docUrl="docUrl" />

		<!-- The board header: an h1 and its description, then the labelled
		     Documentation button and the buildiq square. No documentation icon
		     beside the title. -->
		<div v-else class="cn-admin-settings-shell__header" data-testid="cn-admin-settings-header">
			<div class="cn-admin-settings-shell__heading">
				<h1 class="cn-admin-settings-shell__title">
					{{ resolvedTitle }}
				</h1>
				<!-- `breadcrumbs`: the board's path line in place of the
				     description ("Beheerinstellingen / Launchpad / Algemeen ·
				     geldt voor de hele organisatie"). -->
				<div v-if="crumbs.length > 0" class="cn-admin-settings-shell__crumbs" data-testid="cn-admin-settings-breadcrumbs">
					<nav class="cn-admin-settings-shell__crumb-list" :aria-label="breadcrumbLabel">
						<template v-for="(crumb, index) in crumbs" :key="index">
							<span v-if="index > 0" aria-hidden="true">/</span>
							<a v-if="crumb.href" :href="crumb.href" class="cn-admin-settings-shell__crumb-link">{{ crumb.label }}</a>
							<span v-else :aria-current="index === crumbs.length - 1 ? 'page' : null">{{ crumb.label }}</span>
						</template>
					</nav>
					<template v-if="breadcrumbNote">
						<span aria-hidden="true">·</span>
						<span>{{ breadcrumbNote }}</span>
					</template>
				</div>
				<p v-else class="cn-admin-settings-shell__description">
					{{ resolvedDescription }}
				</p>
			</div>
			<div class="cn-admin-settings-shell__header-buttons">
				<NcButton
					v-if="docUrl"
					:href="docUrl"
					target="_blank"
					rel="noopener noreferrer"
					data-testid="cn-admin-settings-documentation">
					<template #icon>
						<BookOpenVariant :size="20" />
					</template>
					{{ documentationLabel }}
				</NcButton>
				<CnBuildiqEditButton />
			</div>
		</div>

		<!-- `tabs`: a strip under the header (boards ShInstellingen,
		     LpBeheerAlgemeen). Each tab's panel holds the `tab-<id>` slot; the
		     version card, the credential broker and the default slot below
		     belong to the first tab and show only while it is open. -->
		<CnTabs
			v-if="tabItems.length > 0"
			class="cn-admin-settings-shell__tabs"
			:look="isBoard ? 'board' : 'nextcloud'"
			:variant="tabsVariant"
			:ariaLabel="resolvedTitle"
			data-testid="cn-admin-settings-tabs"
			@update:activeIndex="onTabIndex">
			<CnTab
				v-for="tab in tabItems"
				:key="tab.id"
				:title="tab.label"
				:count="tab.count"
				:active="tab.id === activeTabId">
				<div class="cn-admin-settings-shell__panel" :data-tab="tab.id">
					<!-- @slot tab-<id> The panel of the tab with that `id` in `tabs`. -->
					<slot v-if="!lazyTabs || tab.id === activeTabId" :name="`tab-${tab.id}`" />
				</div>
			</CnTab>
		</CnTabs>

		<!-- `versionCardPosition: "end"`: the app's sections come first, and the
		     version card and the credential broker follow them (board DcBeheer
		     starts with the app's own card). The same slot, rendered once. -->
		<slot v-if="versionCardAtEnd && onFirstTab" />

		<!-- Version information card (version, up-to-date check, re-import, support footer) -->
		<CnVersionInfoCard
			v-if="showVersionCard && onFirstTab"
			:appName="appName"
			:appVersion="resolvedVersion"
			:configuredVersion="resolvedConfiguredVersion"
			:isUpToDate="resolvedIsUpToDate"
			:showUpdateButton="showUpdateButton"
			:updating="updating"
			:title="versionTitle"
			:description="resolvedVersionDescription"
			:wide="versionCardWide"
			:showAppName="showAppName"
			:actionsDivider="actionsDivider"
			:inlineUpToDate="inlineUpToDate"
			:compact="compact"
			@update="onUpdate">
			<template #actions>
				<!-- Canonical "Re-import configuration" action (POST /apps/<appId>/api/settings/load) -->
				<NcButton
					v-if="showReimport"
					:variant="compactCard ? 'secondary' : 'primary'"
					:disabled="reimporting"
					@click="reimport">
					<template #icon>
						<NcLoadingIcon v-if="reimporting" :size="20" />
						<Refresh v-else :size="20" />
					</template>
					{{ reimporting ? importingLabel : reimportLabel }}
				</NcButton>
				<!-- Run the first-time setup wizard on demand (ADR-042). -->
				<NcButton v-if="showSetup" data-testid="cn-admin-run-setup" @click="setupWizardOpen = true">
					<template #icon>
						<AutoFix :size="20" />
					</template>
					{{ setupLabel }}
				</NcButton>
				<!-- "Help us / suggest a feature" — a direct link to the forge's
				     feature-request issue form (team decision 2026-09-04: the
				     in-product suggestion modal is gone; the forge is where
				     the conversation happens, in English). -->
				<NcButton
					v-if="showHelp && helpUrl"
					:href="helpUrl"
					target="_blank">
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
					<div v-if="showSupport && !supportAtEnd && !compactCard" class="cn-support-info">
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
				<!-- The board card: support as one fact row, the SLA address on the same line. -->
				<div v-if="compactCard && showSupport && !supportAtEnd && !$slots.footer" class="cn-version-info__item" data-testid="cn-admin-settings-support-row">
					<span class="cn-version-info__label">{{ supportTitle }}:</span>
					<span class="cn-version-info__value">
						<a :href="`mailto:${supportEmail}`">{{ supportEmail }}</a><template v-if="slaEmail">, {{ slaInline }} <a :href="`mailto:${slaEmail}`">{{ slaEmail }}</a></template>
					</span>
				</div>
				<!-- @slot version-items Extra key/value rows appended inside the version card details. -->
				<slot name="version-items" />
			</template>
		</CnVersionInfoCard>

		<!--
			Organisation credential broker (ADR-079 Step 2).

			This is the ONE home for org-wide credentials. It used to live in a
			generic modal on CnAppRoot, rendered from `manifest.adminSettings[]`
			and gated on app ownership — but no app ever declared that array, so
			the surface was unreachable in every app in the fleet. It belongs
			here: an org-wide secret store is app-level configuration, and
			/settings/admin/<app> is authorized by Nextcloud server-side rather
			than by a client-side flag.

			Opt-in, because only an app that actually brokers credentials should
			show it — the manifest `credentials[]` declarations drive the
			informational "apps requesting credentials" list inside.
		-->
		<CnCredentials
			v-if="showOrganisationCredentials && onFirstTab"
			scope="organisation"
			:appId="appId"
			:appName="appName"
			:appCredentials="appCredentials"
			data-testid="cn-admin-organisation-credentials" />

		<!-- @slot default The app's own settings sections, rendered below the version card, or above it with `versionCardPosition: "end"`. With `tabs`, only while the first tab is open. -->
		<slot v-if="!versionCardAtEnd && onFirstTab" />

		<!-- `supportPosition: "end"`: the support lines as their own wide card,
		     last on the page (board PqBeheer), not in the version card. -->
		<CnSettingsSection
			v-if="showSupport && supportAtEnd && onFirstTab"
			class="cn-admin-settings-shell__support"
			:name="supportTitle"
			:wide="true"
			data-testid="cn-admin-settings-support">
			<p class="cn-admin-settings-shell__support-line">
				{{ supportLine }}
				<a :href="`mailto:${supportEmail}`">{{ supportEmail }}</a>
			</p>
			<p v-if="slaEmail" class="cn-admin-settings-shell__support-line">
				{{ slaLine }}
				<a :href="`mailto:${slaEmail}`">{{ slaEmail }}</a>
			</p>
		</CnSettingsSection>

		<!-- First-time setup wizard, opened from the admin page (ADR-042). -->
		<CnSetupWizard
			v-if="showSetup && setupWizardOpen"
			:appId="appId"
			:steps="setupSteps"
			@complete="setupWizardOpen = false"
			@close="setupWizardOpen = false" />
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { showError, showSuccess } from '@nextcloud/dialogs'
import { loadState } from '@nextcloud/initial-state'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcLoadingIcon, NcSettingsSection } from '@nextcloud/vue'
import { computed, provide } from 'vue'
import AutoFix from 'vue-material-design-icons/AutoFix.vue'
import BookOpenVariant from 'vue-material-design-icons/BookOpenVariant.vue'
import HelpCircleOutline from 'vue-material-design-icons/HelpCircleOutline.vue'
import Refresh from 'vue-material-design-icons/Refresh.vue'
import CnBuildiqEditButton from '../CnBuildiqEditButton/CnBuildiqEditButton.vue'
import CnCredentials from '../CnCredentials/CnCredentials.vue'
import CnEnvironmentBanner from '../CnEnvironmentBanner/CnEnvironmentBanner.vue'
import CnSetupWizard from '../CnSetupWizard/CnSetupWizard.vue'
import { useEnvironment } from '../../composables/useEnvironment.js'
import { normalizeLook, useLook } from '../../composables/useLook.js'
import { ensureTranslations } from '../../l10n/index.js'
import { buildFeatureRequestUrl } from '../../utils/forge.js'
import { prefixUrl } from '../../utils/headers.js'
import { CnSettingsSection } from '../CnSettingsSection/index.js'
import { CnTab, CnTabs } from '../CnTabs/index.js'
import { CnVersionInfoCard } from '../CnVersionInfoCard/index.js'

/**
 * The tab the address names.
 *
 * @param {string} key The query parameter.
 * @return {string} Its value, or ''.
 */
function readTabFromAddress(key) {
	if (typeof window === 'undefined' || !key) {
		return ''
	}
	return new URLSearchParams(window.location.search).get(key) || ''
}

/**
 * The tab remembered under a storage key, or '' without a key, a value or
 * usable storage (a private window can refuse it).
 *
 * @param {string} key The storage key.
 * @return {string} The remembered tab id.
 */
function readStoredTab(key) {
	if (!key) {
		return ''
	}
	try {
		return window.localStorage.getItem(key) || ''
	} catch {
		return ''
	}
}

/**
 * Remember the open tab under a storage key; nothing without a key or
 * usable storage.
 *
 * @param {string} key The storage key.
 * @param {string} id The tab's id.
 * @return {void}
 */
function storeTab(key, id) {
	if (!key) {
		return
	}
	try {
		window.localStorage.setItem(key, id)
	} catch {
		// Storage refused (private window): the address still holds the tab.
	}
}

/**
 * Put the open tab in the address without a new history entry.
 *
 * @param {string} key The query parameter.
 * @param {string} id The tab's id.
 * @return {void}
 */
function writeTabToAddress(key, id) {
	if (typeof window === 'undefined' || !key || !window.history?.replaceState) {
		return
	}
	const url = new URL(window.location.href)
	url.searchParams.set(key, id)
	window.history.replaceState(window.history.state, '', url.toString())
}

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
		CnEnvironmentBanner,
		CnBuildiqEditButton,
		BookOpenVariant,
		NcSettingsSection,
		CnCredentials,
		CnSettingsSection,
		CnVersionInfoCard,
		CnSetupWizard,
		CnTab,
		CnTabs,
		NcButton,
		NcLoadingIcon,
		Refresh,
		AutoFix,
		HelpCircleOutline,
	},

	props: {
		/**
		 * The environment this instance is: `development`, `test`, `acceptance` or
		 * `production`. Wins over the active organisation's `environment` field.
		 * A non-production environment is named in a banner at the top and the tab
		 * title gets a prefix. Production, an unknown value or no value shows nothing.
		 *
		 * @type {string}
		 */
		environment: {
			type: String,
			default: '',
		},

		/**
		 * Render the organisation credential broker on this admin page
		 * (ADR-079 Step 2). Opt-in: only an app that actually brokers org-wide
		 * secrets should surface it.
		 *
		 * This replaces the generic `manifest.adminSettings[]` modal that used
		 * to live on CnAppRoot. That modal was gated on app OWNERSHIP and on an
		 * array no app in the fleet ever declared, so the broker was
		 * unreachable everywhere. Here it is reachable and the access decision
		 * is Nextcloud's, made server-side for /settings/admin/<app>.
		 */
		showOrganisationCredentials: {
			type: Boolean,
			default: false,
		},

		/**
		 * The app's manifest `credentials[]` declarations, forwarded to the
		 * broker to drive its informational "apps requesting credentials"
		 * list. Only read when `showOrganisationCredentials` is true.
		 */
		appCredentials: {
			type: Array,
			default: () => [],
		},

		/**
		 * The look the shell is drawn in: `board` or `nextcloud`. Empty follows
		 * the `cnLook` that CnAppRoot provides.
		 *
		 * @spec openspec/changes/screens-chrome-parity/specs/settings-board-look/spec.md#requirement-the-admin-settings-shell-takes-the-board-header
		 */
		look: {
			type: String,
			default: '',
		},

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

		/**
		 * Board look: the path under the title, in place of the description,
		 * as `[{ label, href? }]` ("Beheerinstellingen" linking to the admin
		 * settings, then the app and the section). A crumb without `href` is
		 * text; the last one is the current page.
		 *
		 * @spec openspec/changes/screens-admin-settings-board-header/specs/settings-board-look/spec.md
		 */
		breadcrumbs: {
			type: Array,
			default: () => [],
		},

		/**
		 * Board look: a note after the path, behind a "·" ("geldt voor de
		 * hele organisatie").
		 *
		 * @spec openspec/changes/screens-admin-settings-board-header/specs/settings-board-look/spec.md
		 */
		breadcrumbNote: {
			type: String,
			default: '',
		},

		/** Documentation URL (renders the info icon next to the title). */
		docUrl: {
			type: String,
			default: '',
		},

		/**
		 * A tab strip under the header, as `[{ id, label, count? }]`. Each
		 * tab's panel is the `tab-<id>` slot; the version card, the credential
		 * broker and the default slot show only on the first tab. The open tab
		 * is in the address (`?<tabQueryKey>=<id>`), so a link opens it and a
		 * reload keeps it. The strip is keyboard operable (arrow keys, Home,
		 * End). Empty draws no strip.
		 *
		 * @type {Array<{id: string, label: string, count?: number}>}
		 * @spec openspec/changes/admin-settings-tabs/specs/settings-board-look/spec.md#requirement-the-admin-shell-can-draw-a-tab-strip
		 */
		tabs: {
			type: Array,
			default: () => [],
		},

		/**
		 * The query parameter that holds the open tab's `id`.
		 *
		 * @spec openspec/changes/admin-settings-tabs/specs/settings-board-look/spec.md#requirement-the-admin-shell-can-draw-a-tab-strip
		 */
		tabQueryKey: {
			type: String,
			default: 'tab',
		},

		/**
		 * A browser storage key under which the shell remembers the last
		 * opened tab, so the page opens on it again when the address names no
		 * tab. Empty (the default) remembers nothing. The address still wins.
		 *
		 * @spec openspec/changes/admin-shell-remembers-tab/specs/settings-board-look/spec.md#requirement-the-admin-shell-can-remember-the-last-tab
		 */
		tabStorageKey: {
			type: String,
			default: '',
		},

		/**
		 * Mount a tab's `tab-<id>` slot only while that tab is open, and
		 * unmount it when another tab opens, so each visit mounts it afresh
		 * and the page does not load every tab at once. Off (the default),
		 * every panel stays mounted and only the open one shows.
		 *
		 * @spec openspec/changes/admin-settings-lazy-tabs/specs/settings-board-look/spec.md#requirement-the-admin-shell-can-mount-only-the-open-tab
		 */
		lazyTabs: {
			type: Boolean,
			default: false,
		},

		/**
		 * How the `tabs` strip is drawn, as CnTabs' `variant`: `line`, the
		 * folder tabs (the default), or `underline`, plain labels on a rule
		 * with the open one underlined (board LpBeheerAlgemeen).
		 *
		 * @type {'line'|'underline'}
		 * @spec openspec/changes/admin-settings-underline-tabs/specs/settings-board-look/spec.md#requirement-the-admin-shell-can-draw-an-underline-tab-strip
		 */
		tabsVariant: {
			type: String,
			default: 'line',
			validator: (value) => ['line', 'underline'].includes(value),
		},

		/** Whether to render the version card. */
		showVersionCard: {
			type: Boolean,
			default: true,
		},

		/**
		 * Under the board look the version card spans the whole settings grid.
		 * Set to `false` to keep it one card in the grid.
		 *
		 * @spec openspec/changes/board-version-card-full-width/specs/settings-board-look/spec.md#requirement-the-board-version-card-spans-the-settings-grid
		 */
		versionCardWide: {
			type: Boolean,
			default: true,
		},

		/**
		 * Where the version card (and the organisation credential broker) sits:
		 * `start`, above the app's sections (the default), or `end`, after them,
		 * for a page whose board starts with the app's own card. The keyboard
		 * order follows, because the slot moves in the markup.
		 *
		 * @spec openspec/changes/screens-admin-settings-version-card-end/specs/settings-board-look/spec.md#requirement-the-version-card-can-follow-the-apps-sections
		 */
		versionCardPosition: {
			type: String,
			default: 'start',
			validator: (value) => ['start', 'end'].includes(value),
		},

		/**
		 * Board look: how many columns the section cards take, `1` or `2`.
		 * Empty (the default) fits as many 420px columns as the width allows.
		 *
		 * @type {1|2|null}
		 * @spec openspec/changes/version-card-board-compact/specs/settings-board-look/spec.md#requirement-the-admin-page-can-fix-its-columns
		 */
		sectionColumns: {
			type: Number,
			default: null,
			validator: (value) => value === null || [1, 2].includes(value),
		},

		/**
		 * Board look: the version card draws its "Application name" row.
		 * Dossiq's boards pass false.
		 *
		 * @spec openspec/changes/version-card-board-compact/specs/settings-board-look/spec.md#requirement-the-board-version-card-is-compact
		 */
		showAppName: {
			type: Boolean,
			default: true,
		},

		/**
		 * Board look: the version card draws a rule above its buttons.
		 * Dossiq's boards pass false.
		 *
		 * @spec openspec/changes/version-card-board-compact/specs/settings-board-look/spec.md#requirement-the-board-version-card-is-compact
		 */
		actionsDivider: {
			type: Boolean,
			default: true,
		},

		/**
		 * Board look: the version card reads the up-to-date state in its
		 * configured version row instead of a disabled button. Dossiq's boards
		 * pass true.
		 *
		 * @spec openspec/changes/version-card-board-compact/specs/settings-board-look/spec.md#requirement-the-board-version-card-is-compact
		 */
		inlineUpToDate: {
			type: Boolean,
			default: false,
		},

		/**
		 * Board look: the compact version card of dossiq's boards: "About this
		 * <App> installation.", no application name row, the up-to-date state
		 * inline, support as one row, secondary buttons, no rule above them.
		 * The default keeps PqBeheer's card.
		 *
		 * @spec openspec/changes/version-card-board-compact/specs/settings-board-look/spec.md#requirement-the-board-version-card-is-compact
		 */
		compact: {
			type: Boolean,
			default: false,
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

		/**
		 * Where the support lines go: `card`, in the version card's footer (the
		 * default), or `end`, as their own wide card after everything else on
		 * the first tab (board PqBeheer).
		 *
		 * @spec openspec/changes/admin-shell-support-end/specs/settings-board-look/spec.md#requirement-support-can-be-its-own-card-at-the-end
		 */
		supportPosition: {
			type: String,
			default: 'card',
			validator: (value) => ['card', 'end'].includes(value),
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

		/** Show a "Help us / suggest a feature" link to the forge's feature-request form. */
		showHelp: {
			type: Boolean,
			default: false,
		},

		/** `<owner>/<repo>` GitHub slug the feature-request link targets. */
		helpRepo: {
			type: String,
			default: '',
		},
	},

	emits: ['update', 'reimported', 'reimport-error', 'tab-change'],

	setup(props) {
		// An admin page can be an entry with no other library surface: its
		// chrome reads in the user's language without the app registering.
		ensureTranslations()
		// The app's own `environment` setting, else the active organisation's.
		const { environment: environmentName } = useEnvironment({ environment: () => props.environment })
		const { look, isBoard } = useLook(props)
		// A shell told `look: "board"` itself draws the board look also on an
		// admin page that no CnAppRoot wraps, as Nextcloud's settings pages are.
		const ownLookClass = computed(() => (normalizeLook(props.look) === 'board' ? 'cn-look-board' : ''))
		// Everything inside the shell, its own version card and the app's
		// sections alike, follows the shell's look without the app providing it.
		provide('cnLook', look)
		return { environmentName, isBoard, ownLookClass }
	},

	data() {
		return {
			reimporting: false,
			setupWizardOpen: false,
			// The open tab's id; empty until a tab is picked or the address names one.
			chosenTabId: readTabFromAddress(this.tabQueryKey) || readStoredTab(this.tabStorageKey),
		}
	},

	computed: {
		/**
		 * The tabs that have an id and a label.
		 *
		 * @return {Array<{id: string, label: string, count: number|null}>}
		 * @spec openspec/changes/admin-settings-tabs/specs/settings-board-look/spec.md#requirement-the-admin-shell-can-draw-a-tab-strip
		 */
		tabItems() {
			return (Array.isArray(this.tabs) ? this.tabs : [])
				.filter((tab) => tab && typeof tab.id === 'string' && tab.id !== '' && typeof tab.label === 'string' && tab.label !== '')
				.map((tab) => ({ id: tab.id, label: tab.label, count: tab.count ?? null }))
		},

		/**
		 * The open tab: the one picked or named in the address, else the first.
		 *
		 * @return {string} Its id, or '' without tabs.
		 */
		activeTabId() {
			const ids = this.tabItems.map((tab) => tab.id)
			return ids.includes(this.chosenTabId) ? this.chosenTabId : (ids[0] || '')
		},

		/**
		 * Whether the shell's own content shows: always without tabs, else on
		 * the first tab.
		 *
		 * @return {boolean}
		 */
		onFirstTab() {
			return this.tabItems.length === 0 || this.activeTabId === this.tabItems[0].id
		},

		/**
		 * Whether the app's sections come before the version card.
		 *
		 * @return {boolean}
		 * @spec openspec/changes/screens-admin-settings-version-card-end/specs/settings-board-look/spec.md#requirement-the-version-card-can-follow-the-apps-sections
		 */
		versionCardAtEnd() {
			return this.versionCardPosition === 'end'
		},

		/** @return {boolean} Whether the version card is the compact board card. */
		compactCard() {
			return this.isBoard && this.compact
		},

		/** @return {boolean} Whether the support lines are their own card at the end. */
		supportAtEnd() {
			return this.supportPosition === 'end'
		},

		/**
		 * The crumbs that have a label.
		 *
		 * @return {Array<{label: string, href?: string}>}
		 * @spec openspec/changes/screens-admin-settings-board-header/specs/settings-board-look/spec.md
		 */
		crumbs() {
			return (Array.isArray(this.breadcrumbs) ? this.breadcrumbs : [])
				.filter((crumb) => crumb && typeof crumb.label === 'string' && crumb.label !== '')
		},

		/** @return {string} The accessible name of the breadcrumb navigation. */
		breadcrumbLabel() {
			return t('nextcloud-vue', 'Breadcrumb')
		},

		/**
		 * The "Help us" link target: the forge's feature-request issue form
		 * for `helpRepo`, on the fleet-default forge. Empty (hiding the
		 * button) when no repo is configured.
		 *
		 * @return {string}
		 */
		helpUrl() {
			const repo = String(this.helpRepo || '').trim()
			if (!repo) {
				return ''
			}
			return buildFeatureRequestUrl(null, repo)
		},

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
			if (this.versionDescription) {
				return this.versionDescription
			}
			return this.compactCard
				? t('nextcloud-vue', 'About this {app} installation.', { app: this.appName })
				: t('nextcloud-vue', 'Information about the current {app} installation', { app: this.appName })
		},

		/** @return {string} Re-import endpoint. */
		resolvedReimportUrl() {
			return prefixUrl(this.reimportUrl) || generateUrl('/apps/{appId}/api/settings/load', { appId: this.appId })
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

		/** @return {string} The words before the SLA address in the board card's support row. */
		slaInline() {
			return t('nextcloud-vue', 'for an SLA')
		},

		/** @return {string} SLA footer line. */
		slaLine() {
			return t('nextcloud-vue', 'For a Service Level Agreement (SLA), contact')
		},

		/** @return {string} Setup-wizard button label. */
		setupLabel() {
			return t('nextcloud-vue', 'Run setup wizard')
		},

		/** @return {string} Documentation button label (board header). */
		documentationLabel() {
			return t('nextcloud-vue', 'Documentation')
		},

		/** @return {string} Help / suggest-feature button label. */
		helpLabel() {
			return t('nextcloud-vue', 'Help us')
		},
	},

	/**
	 * A page that opens on a tab other than the first (named in the address,
	 * or remembered) tells the app once, as a click would, so a breadcrumb or
	 * title that follows the tab is right from the first paint.
	 *
	 * @spec openspec/changes/admin-shell-remembers-tab/specs/settings-board-look/spec.md#requirement-the-admin-shell-can-remember-the-last-tab
	 */
	mounted() {
		if (this.tabItems.length > 0 && this.activeTabId !== this.tabItems[0].id) {
			this.$emit('tab-change', this.activeTabId)
		}
	},

	methods: {
		/**
		 * A tab was picked in the strip: remember it, put it in the address
		 * (replacing the entry, so Back leaves the page) and tell the app.
		 *
		 * @param {number} index The picked tab's index.
		 * @return {void}
		 * @spec openspec/changes/admin-settings-tabs/specs/settings-board-look/spec.md#requirement-the-admin-shell-can-draw-a-tab-strip
		 */
		onTabIndex(index) {
			const tab = this.tabItems[index]
			if (!tab || tab.id === this.chosenTabId) {
				return
			}
			this.chosenTabId = tab.id
			writeTabToAddress(this.tabQueryKey, tab.id)
			storeTab(this.tabStorageKey, tab.id)
			/**
			 * @event tab-change Emitted when the reader opens another tab. Payload: its `id`.
			 */
			this.$emit('tab-change', tab.id)
		},

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

/* The board look lifts the width and lays the header and cards on a grid (look-board.css). */

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
