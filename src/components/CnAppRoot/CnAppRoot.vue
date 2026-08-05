<!--
  CnAppRoot — top-level wrapper for manifest-driven Conduction apps.

  Provides the manifest, custom-component registry, and translate
  function to descendants via Vue's `provide`/`inject`. Orchestrates
  four rendering phases:

    0. Capabilities  — checks the Nextcloud capabilities API for any
                       app id listed in `requiresApps` (default
                       `['openregister']`). When a required app is
                       missing, default content is <NcEmptyContent>
                       with an OR-store action; consumers may replace
                       the surface entirely via the #or-missing slot.
                       Apps that do not need the guard pass
                       `:requires-apps="[]"`.
    1. Loading       — while useAppManifest.isLoading is true.
                       Default: <CnAppLoading />. Override: #loading slot.
    2. Dependency    — after loading; when any entry in
                       manifest.dependencies is not installed/enabled.
                       Default: <CnDependencyMissing />. Override:
                       #dependency-missing slot.
    3. Shell         — manifest loaded + dependencies satisfied.
                       Renders #menu (default <CnAppNav />) + the
                       consuming app's <router-view>, plus optional
                       #header-actions, #sidebar, and #footer slots.

  Consuming apps that want manifest-driven pages but their own root
  layout can skip CnAppRoot entirely and use CnPageRenderer / CnAppNav
  with explicit props (the props-vs-inject fallback). CnAppRoot is the
  full-shell convenience.

  Hosts a per-user `NcAppSettingsDialog` that any descendant can open
  via the injected `cnOpenUserSettings()` method. CnAppNav binds the
  inject to manifest entries with `action: "user-settings"`. Apps
  populate the modal by passing `NcAppSettingsSection`s into the
  `#user-settings` slot; the slot falls back to a single placeholder
  section when no content is supplied.

  A SECOND, distinct `NcAppSettingsDialog` hosts admin-only, app-level
  (not per-user) settings, driven GENERICALLY by `manifest.adminSettings[]`
  (sorted by `order`) — one `NcAppSettingsSection` per entry. The built-in
  `type: "organisation-credentials"` renders the organisation credential
  broker (`CnCredentials scope="organisation"`); a `component` entry
  resolves from the `customComponents` registry, forwarding `props`. Any
  descendant opens the dialog via the injected `cnOpenAdminSettings()`
  method; CnAppNav auto-prepends an "Admin settings" entry (visible only
  to app OWNERS — `currentUserGroups` ∩ `permissions.owners`, or a
  `runtime.user` owner signal; NOT `OC.isUserAdmin()`) that opens it, and
  also binds manifest entries with `action: "admin-settings"`. An app
  with no (or empty) `adminSettings` mounts no admin dialog and no admin
  nav entry at all — the org-credentials pane is no longer hardcoded;
  apps declare it explicitly as one `adminSettings` entry. Apps can still
  populate it via the `#admin-settings` slot (which overrides the
  generic render entirely).

  See REQ-JMR-003 and REQ-JMR-013 of the json-manifest-renderer spec,
  and REQ-OR-1..REQ-OR-7 of the cnapproot-app-availability-guard spec.
-->
<template>
	<NcContent :app-name="appDisplayName || (manifest && manifest.name) || appId" data-testid="cn-app-root">
		<!-- Phase 0a: capabilities check in flight -->
		<template v-if="capabilitiesLoading">
			<div class="cn-app-root__capabilities-loading" data-testid="cn-app-root-capabilities-loading">
				<NcLoadingIcon :size="32" />
			</div>
		</template>

		<!--
		  @slot or-missing
		  @description Custom missing-app screen used when one or more
		  entries in `requiresApps` are absent from the Nextcloud
		  capabilities payload. Receives `{ missingApps: string[] }`.
		  Default content: an `<NcEmptyContent>` with the OpenRegister
		  database icon, i18n title/description, and a primary action
		  linking to the OpenRegister integration page. Override when
		  the consumer needs a custom CTA (e.g. softwarecatalog linking
		  to its public landing page). See REQ-OR-4.
		-->
		<template v-else-if="missingApps.length > 0">
			<slot name="or-missing" :missing-apps="missingApps">
				<div class="cn-app-root__or-missing">
					<NcEmptyContent
						:name="orMissingTitle"
						:description="orMissingDescription">
						<template #icon>
							<DatabaseSearchOutline :size="64" />
						</template>
						<template #action>
							<!--
							  Admin: one click installs-and-enables (or enables)
							  the missing app via Nextcloud's own settings/apps/
							  enable endpoint, then reloads. On failure the error
							  shows inline and the store link stays as a fallback
							  (REQ-DIA-3).
							-->
							<template v-if="isAdmin">
								<NcButton
									type="primary"
									data-testid="cn-app-root-or-missing-install"
									:disabled="depInstalling"
									@click="installDependency(orMissingPrimaryApp)">
									<template #icon>
										<NcLoadingIcon v-if="depInstalling" :size="20" />
									</template>
									{{ orMissingInstallLabel }}
								</NcButton>
								<p v-if="depInstallError" class="cn-app-root__or-missing-error">
									{{ depInstallError }}
								</p>
								<a
									v-if="depInstallError"
									class="cn-app-root__or-missing-action"
									:href="orStoreLink">
									{{ orMissingActionLabel }}
								</a>
							</template>
							<!--
							  Non-admin: no dead-end link they cannot act on —
							  point them at their administrator instead (REQ-DIA-3).
							-->
							<p v-else class="cn-app-root__or-missing-ask-admin" data-testid="cn-app-root-or-missing-ask-admin">
								{{ orMissingAskAdmin }}
							</p>
						</template>
					</NcEmptyContent>
				</div>
			</slot>
		</template>

		<!--
		  @slot loading
		  @description Loading screen rendered while the manifest
		  fetch is in flight (REQ-JMR-013). Default content is a
		  `<CnAppLoading />` brand spinner. Override when the consumer
		  needs a custom skeleton or branded loader.
		-->
		<template v-else-if="phase === 'loading'">
			<slot name="loading">
				<CnAppLoading />
			</slot>
		</template>

		<!--
		  @slot dependency-missing
		  @description Empty-state surface rendered when one or more
		  entries in `manifest.dependencies` are not installed/enabled.
		  Receives `{ dependencies }` (the unresolved list). Default:
		  `<CnDependencyMissing>`. See REQ-JMR-011.
		-->
		<template v-else-if="phase === 'dependency-missing'">
			<slot name="dependency-missing" :dependencies="unresolvedHardDependencies">
				<CnDependencyMissing
					:dependencies="unresolvedHardDependencies"
					:app-name="appId" />
			</slot>
		</template>

		<!--
		  Phase 2b: setup — a REQUIRED first-time-setup step (ADR-042) is unmet,
		  so the shell is gated to CnSetupWizard until it clears.
		-->
		<template v-else-if="phase === 'setup'">
			<!--
			  @slot setup
			  @description Override the gating setup surface. Scope: the manifest
			  setup steps + the useSetupStatus state.
			-->
			<slot name="setup" :steps="manifest.setup.steps" :status="setupState">
				<div class="cn-app-root__setup">
					<CnSetupWizard
						:app-id="appId"
						:steps="manifest.setup.steps"
						@complete="onSetupComplete" />
				</div>
			</slot>
		</template>

		<!-- Phase 3: shell -->
		<template v-else>
			<!--
			  @slot menu
			  @description Left-rail navigation surface. Default:
			  `<CnAppNav>` reading `manifest.menu` and filtering by
			  `permissions`. Override to ship a hand-rolled menu while
			  keeping the rest of CnAppRoot's shell.
			-->
			<slot name="menu">
				<CnAppNav :manifest="menuManifest" :permissions="permissions" :is-owner="isOwner" />
			</slot>
			<NcAppContent>
				<!--
				  Soft-dependency notices (REQ-DIA-6). One dismissible,
				  NON-BLOCKING NcNoteCard per unresolved+undismissed SOFT
				  dependency, each carrying the same admin-aware install/enable
				  action as the hard surfaces. Dismissal persists per
				  app+dependency in localStorage so a dismissed notice does not
				  reappear on reload.
				-->
				<NcNoteCard
					v-for="dep in unresolvedSoftDependencies"
					:key="'cn-soft-dep-' + dep.id"
					type="warning"
					:heading="softDepHeading(dep)"
					class="cn-app-root__soft-dep"
					:data-testid="'cn-app-root-soft-dep-' + dep.id">
					<div class="cn-app-root__soft-dep-body">
						<p class="cn-app-root__soft-dep-text">
							{{ softDepText(dep) }}
						</p>
						<div class="cn-app-root__soft-dep-actions">
							<NcButton
								v-if="isAdmin"
								type="secondary"
								:data-testid="'cn-app-root-soft-dep-install-' + dep.id"
								:disabled="depInstalling"
								@click="installDependency(dep.id)">
								<template #icon>
									<NcLoadingIcon v-if="depInstalling && installingDepId === dep.id" :size="20" />
								</template>
								{{ dep.enabled === false ? softDepEnableLabel : softDepInstallLabel }}
							</NcButton>
							<span v-else class="cn-app-root__soft-dep-ask-admin">
								{{ softDepAskAdmin(dep) }}
							</span>
							<NcButton
								type="tertiary"
								:data-testid="'cn-app-root-soft-dep-dismiss-' + dep.id"
								@click="dismissSoftDep(dep.id)">
								{{ softDepDismissLabel }}
							</NcButton>
						</div>
						<p v-if="depInstallError && erroredDepId === dep.id" class="cn-app-root__soft-dep-error">
							{{ depInstallError }}
						</p>
					</div>
				</NcNoteCard>
				<!--
				  In-app edit shell (ADR-041). The Conduction-orange OpenBuild edit
				  button is rendered INSIDE each page's action row (CnDashboardPage /
				  CnDetailPage / CnIndexPage) — it self-wires from the `cnManifestEditor`
				  and `cnOpenBuildAvailable` this component provides, so it sits inline
				  with the page's normal buttons rather than as a floating overlay.
				-->
				<router-view :key="routerViewKey" />
				<!--
				  @slot tenant-badge
				  @description Top-bar tenant indicator surface
				  (multi-tenancy-context REQ-MT-4). Default:
				  <CnTenantBadge /> — auto-hides when the user has 0–1
				  organisations. Override to suppress entirely
				  (`<template #tenant-badge></template>`) or to render
				  a custom multi-tenant switcher.
				-->
				<slot name="tenant-badge">
					<CnTenantBadge />
				</slot>
				<!--
				  @slot header-actions
				  @description Optional action buttons rendered in the
				  page header alongside the router-view. Empty by
				  default; consumer apps fill it with toolbar buttons.
				-->
				<slot name="header-actions" />
				<!--
				  @slot footer
				  @description Optional footer surface rendered below the
				  router-view inside `NcAppContent`. Empty by default.
				-->
				<slot name="footer" />
			</NcAppContent>
			<!--
			  Sidebar slot — gated by the `cnPageSidebarVisible` inject
			  provided by `CnPageRenderer`. When the current manifest
			  page declares `sidebar.show: false` (sibling of `config`),
			  the renderer flips the holder's `.value` to `false` and
			  the slot stops rendering. The default holder value (used
			  when no `CnPageRenderer` ancestor exists) is `true`, so
			  apps that mount their own page components without the
			  renderer keep rendering the slot exactly as today.

			  Default content: when `cnPageSidebarComponent.value` is a
			  Vue component (set by the renderer when the current page
			  declares a `sidebarComponent` registry name), it renders
			  here as the slot's DEFAULT content. The consumer's
			  `#sidebar` slot override (when supplied) wins via Vue's
			  standard slot mechanic; the resolved component is the
			  fallback. See manifest-named-view-sidebar spec.
			-->
			<!--
			  @slot sidebar
			  @description Right-rail sidebar surface. Gated by the
			  `cnPageSidebarVisible` inject (provided by `CnPageRenderer`)
			  so manifest pages can suppress the sidebar via
			  `pages[].sidebar.show: false`. Default content: when
			  `cnPageSidebarComponent.value` is set (provided by
			  `CnPageRenderer` for `pages[].sidebarComponent`), that
			  component renders here; otherwise empty. Consumer-supplied
			  slot content always wins over the resolved component.
			-->
			<slot v-if="cnPageSidebarVisible.value !== false" name="sidebar">
				<component
					:is="cnPageSidebarComponent.value"
					v-if="cnPageSidebarComponent.value" />
			</slot>
			<!--
			  Hoisted index-page sidebar. CnIndexPage publishes its
			  embedded CnIndexSidebar config (component + props +
			  listeners) into the `cnIndexSidebarConfig` holder so it
			  mounts at NcContent level — the only place where Nextcloud's
			  NcAppSidebar slides correctly from the right. Rendering
			  alongside the consumer's `#sidebar` slot is safe because
			  the embedded sidebar only sets the holder when the page is
			  an index AND `sidebar.enabled !== false`; detail-page
			  sidebars (CnObjectSidebar) keep owning the slot.
			-->
			<component
				:is="cnIndexSidebarConfig.value.component"
				v-if="cnIndexSidebarConfig.value"
				v-bind="cnIndexSidebarConfig.value.props"
				v-on="cnIndexSidebarConfig.value.listeners" />

			<!--
			  Hoisted object-sidebar. CnDetailPage writes into the
			  provided `objectSidebarState` holder to publish its
			  schema-driven sidebar (Files / Notes / Tags / Tasks /
			  Audit) at NcContent level — same ADR-017 reason as the
			  hoisted index sidebar above. The auto-mount is suppressed
			  when:
			  - the consumer fills the `#sidebar` slot (their sidebar
			    keeps owning the slot); or
			  - an ancestor already provides `objectSidebarState` (the
			    ancestor renders its own sidebar, e.g. decidesk's host
			    wrapper); or
			  - `objectType` + `objectId` are empty (defense-in-depth
			    against CnIndexPage's `inject('sidebarState') ??
			    inject('objectSidebarState')` fallback leaking an
			    `active: true` write into this channel — see
			    CnAppRootObjectSidebar.spec.js).
			-->
			<CnObjectSidebar
				v-if="shouldAutoMountObjectSidebar"
				:open="effectiveObjectSidebarState.open === true"
				:tabs="effectiveObjectSidebarState.tabs"
				:object-type="effectiveObjectSidebarState.objectType"
				:object-id="effectiveObjectSidebarState.objectId"
				:object-data="effectiveObjectSidebarState.object"
				:object-schema="effectiveObjectSidebarState.schemaObject"
				:register="effectiveObjectSidebarState.register"
				:schema="effectiveObjectSidebarState.schema"
				:title="effectiveObjectSidebarState.title"
				:subtitle="effectiveObjectSidebarState.subtitle"
				:hidden-tabs="effectiveObjectSidebarState.hiddenTabs"
				:requested-tab="effectiveObjectSidebarState.requestedTab"
				@update:open="effectiveObjectSidebarState.open = $event" />

			<!--
			  AI Chat Companion — auto-mounted at the END of NcContent's
			  children so its embedded NcAppSidebar slides in from the right
			  edge (positioning relies on being the last NcContent sibling,
			  same trick the hoisted index-page sidebar above uses).
			  Gating (health probe, pageKind overrides) happens inside the
			  component; app opt-in is via the `aiCompanion` prop (default off).
			-->
			<CnAiCompanion v-if="aiCompanion" :chat-app-id="chatAppId" />

			<!--
			  Command palette (Ctrl/Cmd+K) — auto-mounted, opt-in via the
			  `commandPalette` prop (default off). Zero-config navigation
			  source from `manifest.menu`; the "objects" live-search source
			  is wired by passing `commandPalette: { objectSearch: ... }`
			  (see `createObjectSearchSource`). Actions register themselves
			  via `useCommandPalette().register(...)` from anywhere in the
			  app — no additional wiring here.
			-->
			<CnCommandPalette
				v-if="cnCommandPaletteVisible"
				:manifest="manifest"
				:router="$router"
				:app-id="appId"
				v-bind="cnCommandPaletteOverrides" />

			<!--
			  Support note — auto-mounted on first open per the fleet
			  support-dialog rollout. Deriving slug/name/URLs from `appId`
			  by convention means apps gain it on a lib bump with no
			  per-app wiring; pass `:support-dialog="false"` to opt out or
			  an object to override copy/URLs. Persistence is per-user
			  (server preferences endpoint) with a localStorage fallback.
			-->
			<CnSupportDialog
				v-if="cnSupportVisible"
				:app-name="cnSupportAppName"
				:app-slug="appId"
				:app-store-url="cnSupportAppStoreUrl"
				:feature-request-url="cnSupportFeatureRequestUrl"
				v-bind="cnSupportOverrides"
				@close="cnSupportHide" />
			<!--
			  Product walkthrough (ADR-043) — a non-gating spotlight tour
			  auto-mounted over the live shell. Reads `manifest.walkthrough` and
			  auto-starts a tour that qualifies for the user's app version. No
			  per-app wiring; declare a `walkthrough` block to opt in.
			-->
			<!-- @slot walkthrough Override the gating-free walkthrough overlay. Scope: { manifest, seenVersion }. -->
			<slot v-if="walkthroughEnabled"
				name="walkthrough"
				:manifest="manifest"
				:seen-version="walkthroughSeenVersion">
				<CnWalkthrough
					:app-id="appId"
					:manifest="manifest"
					:seen-version="walkthroughSeenVersion"
					:resume="walkthroughResume"
					:translate="translate"
					@complete="onWalkthroughComplete"
					@dismiss="onWalkthroughComplete" />
			</slot>
			<!--
			  User-settings modal. Always mounted so descendants can
			  open it via the `cnOpenUserSettings` inject (CnAppNav
			  wires this to manifest entries with
			  `action: "user-settings"`). The `#user-settings` slot
			  hosts NcAppSettingsSection children; the placeholder
			  fallback below renders when no slot content is supplied.
			-->
			<NcAppSettingsDialog
				:open="userSettingsOpen"
				:show-navigation="true"
				:name="resolvedUserSettingsTitle"
				@update:open="userSettingsOpen = $event">
				<!-- @slot user-settings Sections rendered inside the host NcAppSettingsDialog. Pass NcAppSettingsSection children. Defaults to the notification-preferences pane when omitted. -->
				<slot name="user-settings">
					<CnNotificationPreferences v-if="userSettingsOpen" />
					<!--
						Credential broker (OpenRegister). Lets the user manage the
						secrets OR holds on their behalf; apps call external providers
						through OR without ever seeing the secret. The app's manifest
						`credentials[]` declarations drive the informational "Apps
						requesting credentials" list.
					-->
					<NcAppSettingsSection v-if="userSettingsOpen"
						id="credentials"
						:name="translate('Credentials')">
						<CnCredentials
							scope="personal"
							:app-id="appId"
							:app-name="appDisplayName || (manifest && manifest.name) || appId"
							:app-credentials="(manifest && manifest.credentials) || []" />
					</NcAppSettingsSection>
					<!--
						Self-service walkthrough replay (ADR-043). Only mounts
						when the manifest declares an enabled tour, so apps
						without a walkthrough never show an empty section.
					-->
					<NcAppSettingsSection v-if="walkthroughEnabled"
						id="cn-walkthrough"
						:name="restartWalkthroughSectionName">
						<p class="cn-app-root__walkthrough-hint">
							{{ restartWalkthroughHint }}
						</p>
						<NcButton type="secondary" @click="restartWalkthroughFromSettings">
							<template #icon>
								<Restart :size="20" />
							</template>
							{{ restartWalkthroughLabel }}
						</NcButton>
					</NcAppSettingsSection>
				</slot>
			</NcAppSettingsDialog>

			<!--
			  Admin-settings modal. Distinct from the user-settings dialog
			  above — this hosts APP-level (not per-user) configuration
			  surfaces that only app OWNERS should reach, rendered GENERICALLY
			  from `manifest.adminSettings[]` (sorted by `order`), one
			  `NcAppSettingsSection` per entry. `type: "organisation-credentials"`
			  renders the organisation credential broker
			  (`CnCredentials scope="organisation"`); a `component` entry
			  resolves from the `customComponents` registry, forwarding
			  `props`. Only mounted when BOTH the caller is an owner
			  (`isOwner`) AND `adminSettings` is non-empty (`hasAdminSettings`)
			  — an app with no `adminSettings` shows no admin dialog at all
			  (D4 backward-compat). Opened via the `cnOpenAdminSettings`
			  inject (CnAppNav wires this to the auto-prepended "Admin
			  settings" entry and to manifest entries with
			  `action: "admin-settings"`). A per-entry `permission` further
			  narrows a section WITHIN this already owner-gated dialog — it
			  can never widen access to a non-owner.
			-->
			<NcAppSettingsDialog
				v-if="isOwner && hasAdminSettings"
				:open="adminSettingsOpen"
				:show-navigation="true"
				:name="resolvedAdminSettingsTitle"
				@update:open="adminSettingsOpen = $event">
				<!-- @slot admin-settings Sections rendered inside the host admin-settings NcAppSettingsDialog. Pass NcAppSettingsSection children to override the generic manifest.adminSettings[] render entirely. -->
				<slot name="admin-settings">
					<template v-for="section in visibleAdminSettingsSections">
						<NcAppSettingsSection
							v-if="adminSettingsOpen"
							:id="section.id"
							:key="section.id"
							:name="translate(section.label)">
							<!--
								Built-in: organisation credential broker (OpenRegister).
								Lets an owner manage the secrets OR holds on behalf of
								the whole organisation; apps call external providers
								through OR without ever seeing the secret. The app's
								manifest `credentials[]` declarations drive the
								informational "Apps requesting credentials" list.
							-->
							<CnCredentials
								v-if="section.type === 'organisation-credentials'"
								scope="organisation"
								:app-id="appId"
								:app-name="appDisplayName || (manifest && manifest.name) || appId"
								:app-credentials="(manifest && manifest.credentials) || []" />
							<!--
								Custom: resolved from the customComponents registry
								(the same registry CnPageRenderer uses for
								type:"custom" pages), forwarding the entry's props.
							-->
							<component
								:is="resolveAdminSettingsComponent(section.component)"
								v-else-if="section.component && resolveAdminSettingsComponent(section.component)"
								v-bind="section.props || {}" />
						</NcAppSettingsSection>
					</template>
				</slot>
			</NcAppSettingsDialog>

			<!--
			  V2 registry modal — mounted when cnOpenModal(key, props) is
			  called by the actions dispatcher. The resolved component is
			  whatever was registered under that key in the `registry` prop.
			  Closes by setting activeModalKey to null.
			-->
			<component
				:is="activeModalComponent"
				v-if="activeModalComponent"
				v-bind="activeModalProps"
				@close="activeModalKey = null"
				@update:open="activeModalKey = null" />
		</template>
	</NcContent>
</template>

<script>
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { getCurrentUser } from '@nextcloud/auth'
import { NcAppContent, NcAppSettingsDialog, NcAppSettingsSection, NcButton, NcContent, NcEmptyContent, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import DatabaseSearchOutline from 'vue-material-design-icons/DatabaseSearchOutline.vue'
import Restart from 'vue-material-design-icons/Restart.vue'
import CnAppNav from '../CnAppNav/CnAppNav.vue'
import CnAppLoading from '../CnAppLoading/CnAppLoading.vue'
import CnDependencyMissing from '../CnDependencyMissing/CnDependencyMissing.vue'
import CnSetupWizard from '../CnSetupWizard/CnSetupWizard.vue'
import CnWalkthrough from '../CnWalkthrough/CnWalkthrough.vue'
import CnAiCompanion from '../CnAiCompanion/CnAiCompanion.vue'
import { DEFAULT_CHAT_APP_ID } from '../../composables/aiChatConfig.js'
import CnCommandPalette from '../CnCommandPalette/CnCommandPalette.vue'
import CnObjectSidebar from '../CnObjectSidebar/CnObjectSidebar.vue'
import CnSupportDialog from '../CnSupportDialog/CnSupportDialog.vue'
import CnNotificationPreferences from '../CnNotificationPreferences/CnNotificationPreferences.vue'
import CnCredentials from '../CnCredentials/CnCredentials.vue'
import CnTenantBadge from '../CnTenantBadge/CnTenantBadge.vue'
import { provideTenantContext } from '../../composables/useTenantContext.js'
import { computed, shallowRef, watch, reactive } from 'vue'
import { useManifestEditor } from '../../composables/useManifestEditor.js'
import { useOpenBuildEditAvailability } from '../../composables/useOpenBuildEditAvailability.js'
import { loadState } from '@nextcloud/initial-state'
import { useAppStatus } from '../../composables/useAppStatus.js'
import { useAppInstaller } from '../../composables/useAppInstaller.js'
import { useSetupStatus } from '../../composables/useSetupStatus.js'
import { useWalkthrough } from '../../composables/useWalkthrough.js'
import { useSupportDialog } from '../../composables/useSupportDialog.js'
import { useObjectStore } from '../../store/index.js'
import { BUILT_IN_FORMATTERS } from '../../utils/builtInFormatters.js'
import { BUILT_IN_KB_PROVIDERS } from '../../utils/kbSearchProviders.js'
import { DEFAULT_FORGE } from '../../utils/forge.js'
import { RegistryKindError } from '../../errors/RegistryKindError.js'

/**
 * Recognised registry kinds and their required metadata fields.
 * An empty array means no additional fields are required beyond `component`.
 */
const REGISTRY_KIND_REQUIRED_FIELDS = {
	widget: ['defaultSize', 'minSize', 'maxSize', 'allowedSlots', 'propsSchema'],
	modal: ['propsSchema'],
	page: [],
	'form-field': ['appliesTo'],
	'cell-renderer': ['appliesTo'],
	// Slot-component kinds: a registered component mounted into a named page
	// slot (CnPageRenderer resolves these by registry name, independent of
	// `kind`). `header`/`actions` back the `headerComponent`/`actionsComponent`
	// manifest sugar; `tab` backs `config.sidebarTabs[].component`; `section`
	// backs `config.bodyWidgets[].component` (rendered into a `section:*` slot).
	// They carry no required metadata (like `page`) — listing them here keeps the
	// mount-time registry validator from rejecting a valid slot registration.
	header: [],
	actions: [],
	tab: [],
	// In-body section component (CnDetailPage `config.bodyWidgets[].component`,
	// reusable by dashboard/index). Resolved by registry name and rendered as a
	// titled card IN THE PAGE BODY with the object/page context injected. Unlike
	// an integration `widget`, a `section` requires NO sidebar tab and carries no
	// grid metadata — it sits wherever the page's `placement` puts it.
	section: [],
	// Create-override handler: a plain async function (exposed as `.handler` /
	// `.fn`) that CnPageRenderer resolves for CnIndexPage's `createOverride`
	// prop so a declarative `type:"index"` page can route its generic Add
	// through an app-specific create flow. Carries no component/metadata — it is
	// resolved by name, not mounted — so it lists no required fields (like
	// `page`); listing it here keeps the mount-time validator from rejecting a
	// valid handler registration.
	'create-override': [],
}

const KNOWN_REGISTRY_KINDS = Object.keys(REGISTRY_KIND_REQUIRED_FIELDS)

/**
 * Default URL for the OpenRegister integration page. The empty-state
 * action links here so users can install / enable OpenRegister with one
 * click. Override per-environment by replacing the default empty-state
 * via the `#or-missing` slot.
 */
const OR_STORE_LINK = '/index.php/settings/apps/integration/openregister'

export default {
	name: 'CnAppRoot',

	components: {
		NcAppContent,
		NcAppSettingsDialog,
		NcAppSettingsSection,
		NcButton,
		NcContent,
		NcEmptyContent,
		NcLoadingIcon,
		NcNoteCard,
		DatabaseSearchOutline,
		Restart,
		CnAppNav,
		CnAppLoading,
		CnDependencyMissing,
		CnSetupWizard,
		CnWalkthrough,
		CnAiCompanion,
		CnCommandPalette,
		CnObjectSidebar,
		CnSupportDialog,
		CnNotificationPreferences,
		CnCredentials,
		CnTenantBadge,
	},

	provide() {
		const self = this
		return {
			// In-app editing (ADR-041): descendants read the editor's `source`
			// — the working copy while editing, the live manifest otherwise. A
			// getter so it stays reactive despite provide() running once; when
			// not editing it returns the live manifest, identical to before.
			get cnManifest() {
				return self.manifestEditor ? self.manifestEditor.source.value : self.manifest
			},
			cnManifestEditor: this.manifestEditor,
			// App registers/schemas for the in-app pages editor (index/detail
			// data source). Plain value (not a getter) so deep descendants —
			// the page-tree rows under the edit button — resolve it reliably.
			// Being a plain value is also why it goes stale: provide() runs
			// once, so this can never reflect a schema created after boot.
			// Kept as-is for backwards compatibility; `cnDataSourcesState`
			// below is the live path, and descendants prefer it.
			cnDataSources: this.dataSources,
			// Live data sources for the pages editor. Provided BY REFERENCE —
			// the holder's identity never changes, only its fields — so the
			// one-shot provide() still sees every update. Descendants resolve
			// `cnDataSourcesState.value ?? cnDataSources`.
			cnDataSourcesState: this.dataSourcesState,
			// Re-fetch the data sources via `dataSourcesLoader`. The pages-editor
			// modals call this on open. No-op when no loader is configured.
			cnRefreshDataSources: this.refreshDataSources,
			// Provided as the raw refs (not getters): Vue 2 inject resolves plain
			// provided properties at any depth, but getter-defined provide
			// properties don't reliably reach deep descendants (e.g. the edit
			// button under a page component). Descendants unwrap with `.value`.
			cnOpenBuildAvailable: this.openBuildAvailable,
			cnEditingBody: this.manifestEditor ? this.manifestEditor.editing : false,
			cnCustomComponents: this.customComponents,
			cnTranslate: this.translate,
			cnPageTypes: this.pageTypes,
			cnFormatters: { ...BUILT_IN_FORMATTERS, ...this.formatters },
			cnCellWidgets: this.cellWidgets,
			// Pluggable kb-search providers (#91 Wave 3): library built-ins
			// (`default`) merged UNDER the consumer registry — the same
			// last-wins spread as cnFormatters. CnKbSearchWidget resolves
			// `content.provider` against this.
			cnKbSearchProviders: { ...BUILT_IN_KB_PROVIDERS, ...this.kbSearchProviders },
			/**
			 * V2 component registry. Provided to all descendants so
			 * CnWidgetGrid and CnPageRenderer can resolve widget keys.
			 * The registry prop is passed by reference — mutations
			 * after mount are NOT tracked; consumers should mount with
			 * the complete registry.
			 */
			cnRegistry: this.registry,
			/**
			 * Open a modal registered in the v2 registry. Used by
			 * the actions dispatcher to open modals declared in the
			 * manifest's `actions[]` array. Validates `kind === "modal"`
			 * before delegating to the `cnModalKey` reactive holder.
			 *
			 * @param {string} key The registry key of the modal to open.
			 * @param {object} props Props forwarded to the modal component.
			 */
			cnOpenModal: (key, props = {}) => {
				const entry = this.registry[key]
				if (!entry || entry.kind !== 'modal') {
					// eslint-disable-next-line no-console
					console.warn(
						`[CnAppRoot] cnOpenModal: "${key}" is not a registered modal (kind must be "modal").`,
					)
					return
				}
				this.activeModalKey = key
				this.activeModalProps = props
			},
			/**
			 * Open the host app's NcAppSettingsDialog. Bound to
			 * `this` so descendants don't have to. Used by CnAppNav
			 * to dispatch `action: "user-settings"` clicks; consumer
			 * apps can also call it directly via inject for custom
			 * triggers (e.g. an avatar-menu entry).
			 */
			cnOpenUserSettings: () => {
				this.userSettingsOpen = true
			},
			/**
			 * Open the host app's admin-settings NcAppSettingsDialog —
			 * the app-level (not per-user) surface introduced to hold
			 * the organisation credential broker out of the personal
			 * settings modal. Bound to `this` so descendants don't have
			 * to. Used by CnAppNav to dispatch the auto-prepended "Admin
			 * settings" entry (admins only) and `action:
			 * "admin-settings"` manifest entries; consumer apps can also
			 * call it directly via inject for custom triggers.
			 */
			cnOpenAdminSettings: () => {
				this.adminSettingsOpen = true
			},
			/**
			 * Restart entry for the product walkthrough (ADR-043). Descendants
			 * (a menu/settings "Replay walkthrough" entry, or a manifest menu
			 * `action: "replay-walkthrough"`) call this to re-run a tour. With no
			 * `tourId` the first declared tour is used.
			 *
			 * @param {string} [tourId] The tour to restart.
			 * @return {void}
			 */
			cnReplayWalkthrough: (tourId) => {
				if (!this.walkthroughEnabled) return
				const wt = useWalkthrough(this.appId, this.manifest)
				const id = tourId || (this.manifest.walkthrough.tours[0] && this.manifest.walkthrough.tours[0].id)
				if (id) wt.restart(id)
			},
			/**
			 * Reactive AI context holder. Page components (CnIndexPage,
			 * CnDetailPage, CnDashboardPage) overwrite fields on this object
			 * in created() and watch() so the widget sees live context.
			 * The same object reference is stable for the lifetime of CnAppRoot.
			 */
			cnAiContext: this.cnAiContext,
			/**
			 * Reactive holder that descendants — specifically
			 * CnIndexPage — write to in order to mount their embedded
			 * sidebar at NcContent level. The Vue 2 reactive idiom is
			 * `{ value }` so descendants assign `holder.value = config`.
			 * `config` is `{ component, props, listeners }`.
			 *
			 * Default null. CnIndexPage clears it on unmount so the
			 * hoisted sidebar disappears when the user navigates away.
			 */
			cnIndexSidebarConfig: this.cnIndexSidebarConfig,
			/**
			 * Sentinel that CnIndexPage checks to decide whether to
			 * publish its embedded sidebar to the hoist (true) or
			 * render it inline (false, default for non-CnAppRoot
			 * hosts).
			 */
			cnHostsIndexSidebar: true,
			/**
			 * Consuming app's slug (e.g. "pipelinq"). Mirrors the `appId`
			 * prop. Auto-filled by `CnWidgetWrapper`'s built-in
			 * Request-a-feature default as the `app` prop on
			 * `CnSuggestFeatureModal` so no per-widget wiring is needed.
			 */
			cnAppId: this.appId,
			/**
			 * Target repo slug for the in-product feature-request deep
			 * link (e.g. `Conduction/pipelinq`). Read from the
			 * manifest's `nav.featureRequestRepo` when set; falls back
			 * to `Conduction/<appId>` which is the convention for
			 * every Conduction app on Codeberg.
			 */
			cnFeatureRequestRepo: this.resolvedFeatureRequestRepo,
			/**
			 * Forge config (`{type, baseUrl}`) for the in-product
			 * feature-request deep link. Read from the manifest's
			 * `nav.forge` (merged over the Codeberg default). Switching
			 * the fleet's forge — back to GitHub, or onto a self-hosted
			 * Forgejo/Gitea — is just this one manifest field.
			 */
			cnFeatureRequestForge: this.resolvedFeatureRequestForge,
			/**
			 * Object-sidebar channel — reactive holder that
			 * `CnDetailPage` writes to publish its schema-driven
			 * sidebar to the NcContent-level auto-mount above.
			 * Always exposed (even when an ancestor provides its
			 * own) so descendants under THIS CnAppRoot see a
			 * consistent inject; the auto-mount itself defers to
			 * the ancestor via `ancestorObjectSidebarState`.
			 *
			 * Shape mirrors what CnDetailPage.syncSidebarState
			 * writes — `{ active, open, objectType, objectId,
			 * title, subtitle, register, schema, hiddenTabs, tabs
			 * }` — plus the always-truthy `_origin` marker so
			 * tests can tell the two channels apart.
			 *
			 * When an ANCESTOR already provides `objectSidebarState`
			 * (a host App shell that mounts its own CnObjectSidebar in
			 * the `#sidebar` slot — decidesk / procest / openregister),
			 * we re-provide THAT holder rather than our local one.
			 * Otherwise the descendant CnDetailPage (a deep child of
			 * this CnAppRoot via `<router-view>`) would inject our
			 * local holder and write the published tab strip there,
			 * while the host's `#sidebar` slot — compiled in the
			 * ancestor's render scope — reads the ancestor's holder.
			 * The two never meet and the strip never renders. Sharing
			 * the ancestor holder here keeps the write target and the
			 * read target the same object.
			 */
			objectSidebarState: this.ancestorObjectSidebarState || this.localObjectSidebarState,
			/**
			 * Index-sidebar channel — CnIndexPage's inject probes
			 * `sidebarState` FIRST and falls back to
			 * `objectSidebarState`. Providing a distinct holder
			 * here keeps the two channels isolated so index-page
			 * writes never leak into the object-sidebar
			 * auto-mount (the openbuilt double-sidebar regression).
			 * Shape covers the CnIndexPage write surface
			 * (`searchValue`, `activeFilters`, `facetData`, etc.).
			 */
			sidebarState: this.localIndexSidebarState,
			/**
			 * Reactive `{ [register]: { [schema]: number } }` totals
			 * populated by `_hydrateMenuCounts()` from `useObjectStore()`
			 * for every `count: "auto"` menu entry whose resolved page is
			 * `type: "index"` with `register`/`schema` in its config.
			 *
			 * `CnAppNav.resolveCount()` reads from this map to render
			 * `NcCounterBubble` badges next to menu entries. The hydration
			 * happens once at mount (one `?_limit=1` fetch per unique
			 * `(register, schema)` pair); subsequent index-page mounts
			 * reuse the same store entry so no extra round-trip.
			 *
			 * Defaults to an empty object so `resolveCount` returns
			 * `null` (no badge) until hydration completes — which keeps
			 * the navigation rendering immediately without waiting for
			 * the counts.
			 */
			cnMenuCounts: this.cnMenuCounts,
		}
	},

	/**
	 * Inject the current page's sidebar-visibility flag and
	 * sidebar-component override. The provider is `CnPageRenderer`
	 * (a typical descendant via `<router-view>`).
	 *
	 * `cnPageSidebarVisible` default — used when no `CnPageRenderer`
	 * ancestor exists (e.g. apps mounting their own page components
	 * without the renderer) — is `{ value: true }` so the `#sidebar`
	 * slot renders unchanged.
	 *
	 * `cnPageSidebarComponent` default is `{ value: null }` so the
	 * slot's default content stays empty unless the manifest
	 * explicitly opts in via `pages[].sidebarComponent`. Apps that
	 * already provide a `#sidebar` slot override see no behaviour
	 * change either way — the override wins over the slot default.
	 *
	 * The shape `{ value: T }` is a hand-rolled reactive holder
	 * (Vue 2 options API) — see `CnPageRenderer.data()`.
	 */
	inject: {
		cnPageSidebarVisible: { default: () => ({ value: true }) },
		cnPageSidebarComponent: { default: () => ({ value: null }) },
		/**
		 * Ancestor-provided `objectSidebarState` — when set, an
		 * ancestor (e.g. decidesk's host wrapper, procest's app
		 * shell) owns the channel and renders its own
		 * CnObjectSidebar. We defer to it by suppressing our local
		 * auto-mount. Default `null` so a fresh CnAppRoot always
		 * uses its own local holder.
		 */
		ancestorObjectSidebarState: { from: 'objectSidebarState', default: null },
	},

	props: {
		/**
		 * Reactive manifest object (from useAppManifest). The renderer
		 * reads `manifest.dependencies`, `manifest.menu`, and is
		 * propagated to descendants via provide/inject.
		 *
		 * @type {object}
		 */
		manifest: {
			type: Object,
			required: true,
		},
		/**
		 * Remount key for the routed `<router-view>`. Hosts that rebuild the
		 * router at runtime (e.g. the OpenBuild builder adding a page mid-edit)
		 * bump this AFTER the rebuild so the view drops its stale component-
		 * instance cache and mounts the new routes — a Vue Router 3 matcher swap
		 * alone resolves the new hrefs but leaves SPA-navigation to a just-added
		 * route rendering a blank view. Keep at the default for static apps: the
		 * key is stable across ordinary navigation, so the view is never
		 * needlessly remounted (and the shell / teleported modals are untouched).
		 *
		 * @type {string|number}
		 */
		routerViewKey: {
			type: [String, Number],
			default: 'cn-router-view',
		},
		/**
		 * Optional persistence hook for in-app editing (ADR-041). Called with the
		 * minimal manifest delta when the user saves an edit. When omitted, Save
		 * still updates the rendered manifest in memory but persists nothing —
		 * wire this to the OpenBuild app-override endpoint to make edits durable.
		 *
		 * @type {Function|null}
		 */
		persistManifestDelta: {
			type: Function,
			default: null,
		},
		/**
		 * App data sources for the in-app pages editor (ADR-041). Lets the
		 * Edit-pages modal offer Register / Schema / Columns dropdowns for
		 * `index`/`detail` pages instead of free-text slug inputs, so a
		 * created page actually renders a table. Shape: `{ registers:
		 * [{ value, label, schemas: [{ value, label, columns: string[] }] }] }`.
		 * Provided to descendants as `cnDataSources`; when omitted the editor
		 * falls back to free-text register/schema fields.
		 *
		 * @type {object|null}
		 */
		dataSources: {
			type: Object,
			default: null,
		},
		/**
		 * Async loader for the same data sources, re-invoked every time a
		 * pages-editor modal opens — so a register or schema created after
		 * app boot shows up without a page reload. Prefer this over the
		 * static `dataSources` snapshot, which is captured once and cannot
		 * change (`provide()` runs a single time).
		 *
		 * Signature: `async () => ({ registers: [...] })`, returning the
		 * same shape as `dataSources`. Passing it also moves the fetch off
		 * the app-boot path onto the (much rarer) editor-open path. When
		 * both props are given, `dataSources` seeds the initial list and
		 * the loader's result replaces it on the first refresh.
		 *
		 * @type {Function|null}
		 */
		dataSourcesLoader: {
			type: Function,
			default: null,
		},
		/**
		 * Nextcloud app id. Forwarded to NcContent as `app-name` and
		 * to CnDependencyMissing for the heading.
		 *
		 * @type {string}
		 */
		appId: {
			type: String,
			required: true,
		},
		/**
		 * Human-readable name shown in the Nextcloud top bar. When set it
		 * overrides the technical `appId` so a virtual app shows its own name
		 * (e.g. "Pet Store") instead of the host app id.
		 */
		appDisplayName: {
			type: String,
			default: '',
		},
		/**
		 * First-open support note (`CnSupportDialog`). `true` (default)
		 * auto-mounts it, deriving the app name and the App-Store /
		 * feature-request URLs from `appId` by convention. Pass `false`
		 * to opt out, or an object to override any `CnSupportDialog`
		 * prop (e.g. `{ appName, appStoreUrl, featureRequestUrl,
		 * donateUrl, founderName, … }`). Dismissal persists per-user via
		 * the app's `/api/preferences/support-dialog-seen` endpoint, with
		 * a localStorage fallback.
		 *
		 * @type {boolean|object}
		 */
		supportDialog: {
			type: [Boolean, Object],
			default: true,
		},
		/**
		 * Whether to mount the floating AI-chat companion (`CnAiCompanion`).
		 * Opt-in: `false` (default) keeps the companion off; pass `true` to
		 * show it. When enabled the companion still self-gates on its own
		 * backend health probe and hides on chat pages. The companion is an
		 * AI capability provided by the Hermiq app, so apps opt in explicitly
		 * rather than every app auto-mounting it whenever a chat backend
		 * happens to be reachable.
		 *
		 * @type {boolean}
		 */
		aiCompanion: {
			type: Boolean,
			default: false,
		},
		/**
		 * Whether to mount the Ctrl/Cmd+K command palette (`CnCommandPalette`).
		 * Opt-in: `false` (default) keeps it off, so existing apps are
		 * unaffected until they enable it. Pass `true` for the zero-config
		 * default (navigation from `manifest.menu` + any commands the app
		 * registers via `useCommandPalette().register(...)`, no live
		 * object search), or an object to override any `CnCommandPalette`
		 * prop — most commonly `{ objectSearch: createObjectSearchSource({...}) }`
		 * (see `src/utils/commandPaletteObjectSource.js`) to wire live
		 * OpenRegister search into the palette's "objects" source.
		 *
		 * @type {boolean|object}
		 */
		commandPalette: {
			type: [Boolean, Object],
			default: false,
		},
		/**
		 * Backend app id the AI Chat Companion targets for its chat / health /
		 * conversation HTTP calls (`/index.php/apps/{chatAppId}/api/...`). This is
		 * the single configuration point for switching the chat backend — see
		 * composables/aiChatConfig.js. Defaults to `hermiq`.
		 *
		 * Per hydra ADR-034 "Amendment 2026-07-05" the agent engine moved from
		 * OpenRegister to Hermiq and the default flipped to `hermiq`
		 * (`chat-appid-default-flip`). Deployments riding OpenRegister's compat
		 * window (openregister#305) can pass `chatAppId="openregister"` explicitly.
		 *
		 * @type {string}
		 */
		chatAppId: {
			type: String,
			default: DEFAULT_CHAT_APP_ID,
		},
		/**
		 * Whether the manifest is still loading from the backend.
		 * Typically wired to `useAppManifest().isLoading`. Defaults to
		 * false so that apps using only the bundled manifest skip the
		 * loading phase.
		 *
		 * @type {boolean}
		 */
		isLoading: {
			type: Boolean,
			default: false,
		},
		/**
		 * Custom-component registry consumed by CnPageRenderer for
		 * `type: "custom"` pages and slot overrides. Empty by default.
		 *
		 * @type {object}
		 */
		customComponents: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * Cell-formatter registry. Map of formatter-id →
		 * `(value, row, property) => string|number`. Resolves the
		 * `pages[].config.columns[].formatter` ids that index/logs pages
		 * declare, so per-column value formatting (status-label maps,
		 * "days in step", currency, …) lives in small pure data functions
		 * instead of bespoke `type:"custom"` table views. Provided to
		 * descendant CnDataTable / CnCellRenderer via inject (`cnFormatters`).
		 * Empty by default — a column with no `formatter`, or an app that
		 * passes no `formatters`, renders exactly as before.
		 *
		 * @type {object}
		 */
		formatters: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * Cell-widget registry. Map of widget-id → Vue component, rendered
		 * for a column that declares `pages[].config.columns[].widget`. The
		 * component receives `{ value, row, property, formatted, ...widgetProps }`.
		 * The library ships one built-in id, `"badge"` (renders `CnStatusBadge`);
		 * consumer entries cover everything else (status pills with custom
		 * colour maps, inline toggles, link cells, …). Provided to descendant
		 * `CnDataTable` / `CnCellRenderer` via inject (`cnCellWidgets`). Empty
		 * by default — a column with no `widget` renders as before.
		 *
		 * @type {object}
		 */
		cellWidgets: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * Pluggable knowledge-base search providers (#91 Wave 3). Map of
		 * provider-key → provider object (`{ search(query, opts), externalOpen? }`),
		 * merged OVER the library built-ins (`default`) and provided to
		 * descendant `CnKbSearchWidget` via inject (`cnKbSearchProviders`).
		 * A `kb-search` widget selects its provider by `content.provider`;
		 * an app talking to a bespoke KB backend (the xwiki proxy) registers
		 * its client here — the library ships only the `default` endpoint
		 * provider + the seam. Empty by default (the built-in `default`
		 * provider then serves every `kb-search` widget).
		 *
		 * @type {object}
		 */
		kbSearchProviders: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * Translate function provided by the consuming app. The library
		 * never imports `t()` from a specific app, so the consumer
		 * passes its own translator. Typically a closure over the
		 * Nextcloud `t()` mixin pre-bound to the app id, e.g.
		 * `(key) => t(appId, key)`.
		 *
		 * Defaults to an identity function so untranslated keys surface
		 * visibly rather than crashing.
		 *
		 * Note: the prop is named `translate` (not `t`) to avoid
		 * shadowing the global `t()` method that Conduction apps
		 * install via `Vue.mixin({ methods: { t, n } })`. The provide
		 * key is `cnTranslate`.
		 *
		 * @type {Function}
		 */
		translate: {
			type: Function,
			default: (key) => key,
		},
		/**
		 * List of permission strings the current user holds. Forwarded
		 * to CnAppNav's permission filter.
		 *
		 * @type {Array<string>}
		 */
		permissions: {
			type: Array,
			default: () => [],
		},
		/**
		 * Page-type registry. Map of `pages[].type` → Vue component.
		 * Provided to descendant CnPageRenderer instances via inject.
		 * When omitted, the renderer falls back to the library's
		 * `defaultPageTypes`. Apps with custom page types pass a merged
		 * map: `{ ...defaultPageTypes, report: MyReportPage }`.
		 *
		 * @type {object|null}
		 */
		pageTypes: {
			type: Object,
			default: null,
		},
		/**
		 * Component registry for v2 manifests. Map of registry key →
		 * `{ kind, component, ...kindMetadata }`. Provided to descendants
		 * via Vue provide under key `cnRegistry`. Validated at `mounted()`
		 * time — unknown `kind` throws `RegistryKindError`; missing required
		 * kind-metadata emits `console.warn`.
		 *
		 * Recognised kinds: `widget`, `modal`, `page`, `form-field`,
		 * `cell-renderer`, the slot-component kinds `header`, `actions`,
		 * `tab`, `section` (mounted into named page slots), and the handler
		 * kind `create-override`. See spec REQ-MVR-002.
		 *
		 * @type {object}
		 */
		registry: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * Required Nextcloud apps for this Conduction app to function.
		 * Default `['openregister']` — every fleet app stores its data
		 * in OpenRegister, so the guard is on by default. Consumer apps
		 * that don't need OpenRegister (the styleguide, the docs site,
		 * future utility apps) opt out via `:requires-apps="[]"`.
		 *
		 * On `mounted()`, CnAppRoot calls `getCapabilities()` from
		 * `@nextcloud/capabilities` exactly once and compares the
		 * returned capability keys against this list. When ANY entry
		 * is missing, CnAppRoot renders an `<NcEmptyContent>` (the
		 * default) or the consumer's `#or-missing` slot.
		 *
		 * Multi-app future-proofing free: a future docudesk-derived app
		 * needing both can declare
		 * `:requires-apps="['openregister', 'openconnector']"`.
		 *
		 * Network failure on `getCapabilities()` (admin-restricted,
		 * offline, CORS) falls through to the renderer rather than
		 * blocking the app on a flaky check — the data layer surfaces
		 * the actual failure when API calls hit OpenRegister.
		 *
		 * See REQ-OR-1..REQ-OR-7 of cnapproot-app-availability-guard.
		 *
		 * @type {Array<string>}
		 */
		requiresApps: {
			type: Array,
			default: () => ['openregister'],
		},
		/**
		 * Title rendered at the top of the user-settings modal
		 * (NcAppSettingsDialog `name` prop). Defaults to the
		 * translated string "User settings"; pass a custom label
		 * (e.g. "Decidesk preferences") to override per app.
		 *
		 * @type {string}
		 */
		userSettingsTitle: {
			type: String,
			default: '',
		},
		/**
		 * Title rendered at the top of the admin-settings modal
		 * (NcAppSettingsDialog `name` prop). Defaults to the
		 * translated string "Administration"; pass a custom label
		 * (e.g. "Pipelinq administration") to override per app.
		 *
		 * @type {string}
		 */
		adminSettingsTitle: {
			type: String,
			default: '',
		},

		/**
		 * Initial active organisation UUID (multi-tenancy-context). When
		 * set, the provided `useTenantContext()` mounts with this UUID
		 * already active so the first render stamps the right
		 * `X-OpenRegister-Organisation` header and the top-bar
		 * `CnTenantBadge` shows the right name immediately. Updates via
		 * `useTenantContext().setActiveTenant()` from any descendant.
		 *
		 * @type {string|null}
		 */
		initialOrganisationUuid: {
			type: String,
			default: null,
		},

		/**
		 * Initial active organisation entity (multi-tenancy-context).
		 * When set, surfaces the resolved name + slug for the badge
		 * without a second fetch.
		 *
		 * @type {object|null}
		 */
		initialOrganisation: {
			type: Object,
			default: null,
		},
	},

	/**
	 * Component-instance state for the capabilities guard.
	 *
	 * - `capabilitiesLoading`: `true` only when the prop says we need
	 *   to check (i.e. `requiresApps.length > 0`). Apps that opt out
	 *   via `:requires-apps="[]"` see this initialise to `false`, so
	 *   no spinner flashes and the renderer mounts on the first
	 *   render. Apps that need the guard see `true` initially; the
	 *   `mounted()` hook runs the check and flips to `false`.
	 * - `missingApps`: the list of `requiresApps` entries NOT
	 *   present in the capabilities payload. When empty, the
	 *   renderer mounts; when non-empty, the empty-state renders.
	 * - `guardError`: stores the caught error so consumers
	 *   inspecting the component instance can introspect failures.
	 *   The error path falls through to the renderer regardless.
	 */
	/**
	 * Auto-mount the first-open support note unless the host opted out
	 * with `:support-dialog="false"`. Per-user persistence via the app's
	 * preferences endpoint (localStorage fallback inside the composable).
	 * Returns no refs when disabled, so the `v-if="cnSupportVisible"` in
	 * the template stays false.
	 *
	 * @param {object} props Component props (reads `appId`, `supportDialog`).
	 * @return {object} `{ cnSupportVisible, cnSupportHide }` or `{}` when disabled.
	 */
	setup(props) {
		// Mount the multi-tenancy context provider so descendants can
		// reach the shared `activeOrganisationUuid` / `setActiveTenant`
		// via `useTenantContext()` (composable) or the
		// `tenantContextMixin` (Options API). The provider is mounted
		// even on single-tenant apps so consumers can opt-in later
		// without restructuring their CnAppRoot wrapper.
		const tenantContext = provideTenantContext(
			props.initialOrganisationUuid || null,
			props.initialOrganisation || null,
		)

		// Off when the host opts out (`:support-dialog="false"`) OR the manifest's
		// support block is explicitly disabled (the "Show the support note on
		// first open" toggle in OpenBuild's editor). Omitting the block keeps the
		// default-on first-open behaviour.
		const manifestSupportDisabled = !!(props.manifest && props.manifest.support
			&& typeof props.manifest.support === 'object'
			&& props.manifest.support.enabled === false)
		const supportPair = (props.supportDialog === false || manifestSupportDisabled)
			? {}
			: (() => {
				const { visible, hide } = useSupportDialog(props.appId, { persistence: 'server' })
				return { cnSupportVisible: visible, cnSupportHide: hide }
			})()

		// In-app editing (ADR-041) + the raw/reactive boundary (audit item 9,
		// `manifest-markraw-reactivity`). `baseRef` is the SINGLE reactive holder
		// for the manifest — it reconciles the prop read path and the editor's
		// live source into one wrap site. It is a `shallowRef`, NOT a `ref`: a
		// plain `ref(obj)` deep-observes the whole immutable manifest graph (up to
		// ~434 KB of nested objects) at boot for a structure the renderer only
		// ever reads. `shallowRef` holds the manifest RAW — `isReactive(baseRef
		// .value) === false` — so ordinary navigation and rendering never trigger
		// per-node observer conversion. The ADR-041 editor opts the live manifest
		// into deep reactivity IN PLACE on edit-enter (see `useManifestEditor`),
		// preserving object identity so already-mounted renderers see the edits;
		// on the next manifest publish the watch below re-installs a fresh raw
		// manifest, returning the read path to non-reactive.
		const baseRef = shallowRef(props.manifest)
		const manifestEditor = useManifestEditor(baseRef, {
			persist: (delta) => (typeof props.persistManifestDelta === 'function'
				? props.persistManifestDelta(delta)
				: undefined),
		})
		watch(() => props.manifest, (m) => {
			if (!manifestEditor.editing.value) baseRef.value = m
		})
		// One shared install/enable action for the or-missing guard and the
		// soft-dependency banners (REQ-DIA-3 / REQ-DIA-6). `depInstalling` /
		// `depInstallError` are the composable refs, returned top-level so the
		// template auto-unwraps them; `installAndEnable` is called from the
		// `installDependency` method.
		const appInstaller = useAppInstaller()

		const { available: openBuildAvailable } = useOpenBuildEditAvailability()
		// A manifest may opt OUT of the OpenBuild in-app edit button by setting
		// `openbuildEditable: false` (e.g. OpenBuild's own pages — an app does not
		// edit itself with itself). Default true: omitting the flag keeps the
		// button wherever the OpenBuild app is enabled (ADR-041).
		const openBuildEditable = computed(
			() => openBuildAvailable.value && props.manifest?.openbuildEditable !== false,
		)

		return {
			...supportPair,
			cnTenantContext: tenantContext,
			manifestEditor,
			openBuildAvailable: openBuildEditable,
			appInstaller,
			depInstalling: appInstaller.installing,
			depInstallError: appInstaller.error,
		}
	},

	/**
	 * Component-instance state for the capabilities guard.
	 *
	 * - `capabilitiesLoading`: `true` only when the prop says we need
	 *   to check (i.e. `requiresApps.length > 0`). Apps that opt out
	 *   via `:requires-apps="[]"` see this initialise to `false`, so
	 *   no spinner flashes and the renderer mounts on the first
	 *   render. Apps that need the guard see `true` initially; the
	 *   `mounted()` hook runs the check and flips to `false`.
	 * - `missingApps`: the list of `requiresApps` entries NOT
	 *   present in the capabilities payload. When empty, the
	 *   renderer mounts; when non-empty, the empty-state renders.
	 * - `guardError`: stores the caught error so consumers
	 *   inspecting the component instance can introspect failures.
	 *   The error path falls through to the renderer regardless.
	 */
	data() {
		const willCheck = Array.isArray(this.requiresApps) && this.requiresApps.length > 0
		return {
			capabilitiesLoading: willCheck,
			missingApps: [],
			guardError: null,
			/**
			 * Reactive holder that descendants write into to mount
			 * their embedded index sidebar at NcContent level. Shared
			 * via provide(); see the `cnIndexSidebarConfig` provide
			 * docs for the contract.
			 */
			cnIndexSidebarConfig: { value: null },
			/**
			 * Reactive AI context. Provided to all descendants via
			 * provide('cnAiContext'). Page components overwrite fields
			 * in their created() + watch() to give the companion
			 * per-page context. The same object reference is stable
			 * across the lifetime of CnAppRoot.
			 *
			 * Shape: CnAiContext (hydra-locked TypeScript interface)
			 *   { appId, pageKind, objectUuid?, registerSlug?,
			 *     schemaSlug?, route? }
			 */
			cnAiContext: reactive({
				appId: this.appId || 'unknown',
				pageKind: 'custom',
				route: { path: (typeof window !== 'undefined' ? window.location.pathname : '') },
			}),
			/**
			 * Reactive holder for the pages editor's register/schema
			 * data sources. Provided as `cnDataSourcesState`.
			 *
			 * The object reference is STABLE for the lifetime of
			 * CnAppRoot — `refreshDataSources()` mutates its fields and
			 * never reassigns it. That is load-bearing: provide() runs
			 * once, so a value provided from a prop can never change
			 * (which is exactly why the legacy `cnDataSources` snapshot
			 * goes stale). Descendants read `.value`, mirroring how they
			 * already unwrap `cnOpenBuildAvailable` / `cnEditingBody`.
			 *
			 * `value` holds the `{ registers: [...] }` payload (seeded
			 * from the `dataSources` snapshot when one is passed), and
			 * `hasLoader` lets descendants render the pickers instead of
			 * free-text fields before the first fetch resolves.
			 */
			dataSourcesState: {
				value: this.dataSources || null,
				loading: false,
				error: null,
				hasLoader: typeof this.dataSourcesLoader === 'function',
			},
			/**
			 * Reactive `{ [register]: { [schema]: number } }` map of
			 * object-store totals — one entry per unique
			 * `(register, schema)` pair declared on a menu item with
			 * `count: "auto"`. Provided to descendants as
			 * `cnMenuCounts`; CnAppNav reads from it inside its
			 * `resolveCount()` to render `NcCounterBubble` badges.
			 *
			 * Populated by `_hydrateMenuCounts()` at mount. Wrapped in
			 * `Vue.observable` so direct property writes
			 * (`this.cnMenuCounts[register][schema] = total`) are
			 * picked up by CnAppNav's reactive render.
			 */
			cnMenuCounts: reactive({}),
			/**
			 * Open state of the host NcAppSettingsDialog. Toggled
			 * to `true` by the provided `cnOpenUserSettings()`
			 * method (CnAppNav binds this to manifest entries with
			 * `action: "user-settings"`); the dialog flips it back
			 * via its `update:open` event.
			 */
			userSettingsOpen: false,
			/**
			 * Open state of the host admin-settings NcAppSettingsDialog.
			 * Toggled to `true` by the provided `cnOpenAdminSettings()`
			 * method (CnAppNav binds this to the auto-prepended "Admin
			 * settings" entry and to manifest entries with `action:
			 * "admin-settings"`); the dialog flips it back via its
			 * `update:open` event.
			 */
			adminSettingsOpen: false,
			/**
			 * Id of the dependency whose install/enable action is currently
			 * in flight (REQ-DIA-3 / REQ-DIA-6). Drives the per-button spinner
			 * so, with several soft-dependency banners on screen, only the
			 * clicked one shows busy. `null` when nothing is installing.
			 *
			 * @type {string|null}
			 */
			installingDepId: null,
			/**
			 * Id of the dependency whose last install/enable attempt failed —
			 * scopes the inline soft-dependency banner error to that dep even
			 * after `installingDepId` clears on settle.
			 *
			 * @type {string|null}
			 */
			erroredDepId: null,
			/**
			 * Ids of SOFT dependencies whose in-shell banner the user has
			 * dismissed (REQ-DIA-6). Seeded synchronously from `localStorage`
			 * (`cn-soft-dep-dismissed:{appId}:{depId}`) so a previously
			 * dismissed notice never flashes on mount; a fresh dismissal pushes
			 * the id here (reactive hide) and persists the key.
			 *
			 * @type {Array<string>}
			 */
			dismissedSoftDeps: (() => {
				const out = []
				try {
					const deps = Array.isArray(this.manifest?.dependencies)
						? this.manifest.dependencies
						: []
					for (const entry of deps) {
						const isObject = entry !== null && typeof entry === 'object'
						const id = isObject ? entry.id : entry
						const required = isObject ? entry.required !== false : true
						if (required || typeof id !== 'string' || id === '') continue
						if (window.localStorage.getItem('cn-soft-dep-dismissed:' + this.appId + ':' + id)) {
							out.push(id)
						}
					}
				} catch (e) {
					// localStorage unavailable (private mode) — nothing dismissed.
				}
				return out
			})(),
			/**
			 * Key of the currently active modal (opened via cnOpenModal).
			 * null when no modal is open.
			 *
			 * @type {string|null}
			 */
			activeModalKey: null,
			/**
			 * Props forwarded to the active modal component.
			 *
			 * @type {object}
			 */
			activeModalProps: {},
			/**
			 * Local holder for the object-sidebar channel. Lives on
			 * this CnAppRoot instance (Vue.observable so descendant
			 * writes via inject trigger re-renders); the `provide()`
			 * block exposes it under the `objectSidebarState` key.
			 *
			 * CnDetailPage flips `active: true` + fills the object
			 * coordinates in its `syncSidebarState()`; we render the
			 * hoisted CnObjectSidebar when both `objectType` and
			 * `objectId` are non-empty AND the consumer hasn't
			 * supplied a `#sidebar` slot AND no ancestor already
			 * owns the channel.
			 */
			localObjectSidebarState: reactive({
				active: false,
				open: false,
				objectType: '',
				objectId: '',
				title: '',
				subtitle: '',
				register: '',
				schema: '',
				// The loaded object, published by CnDetailPage so the hoisted
				// sidebar's data/metadata tab widgets get it as `objectData`.
				// Pre-declared here so Vue 2 keeps it reactive.
				object: null,
				// The resolved schema OBJECT, for the `data` tab widget.
				schemaObject: null,
				hiddenTabs: [],
				tabs: undefined,
				// Host-requested active tab id (e.g. a detail-page "Linked
				// apps" row deep-linking into a specific leaf). null = let
				// the sidebar pick its own default.
				requestedTab: null,
			}),
			/**
			 * Local holder for the index-sidebar channel. Distinct
			 * reference from `localObjectSidebarState` so the
			 * `sidebarState`-first inject in CnIndexPage never
			 * leaks an `active: true` write into the object-sidebar
			 * channel.
			 */
			localIndexSidebarState: reactive({
				active: false,
				open: false,
				searchValue: '',
				activeFilters: {},
				facetData: null,
				facetableFields: [],
				facetableConfig: null,
			}),
		}
	},

	computed: {
		/**
		 * Whether the current user is an OWNER of this app — the gate for
		 * the admin-settings nav entry + dialog (admin-settings-owner-gating
		 * capability). Deliberately NOT `OC.isUserAdmin()`: a Nextcloud
		 * super-admin who is not an app owner does not see the admin
		 * surface, and an app owner who is not a super-admin does.
		 *
		 * PRIMARY signal: `manifest.runtime.user.isOwner === true`, a
		 * read-only projection the backend computes via
		 * `PermissionResolver::matchesCaller(...['owners'])` (D5) — the
		 * reliable path for the ordinary manifest-render case.
		 *
		 * FALLBACK: a non-empty intersection of the caller's groups
		 * (`openbuild.currentUserGroups` initial state) with the owner GIDs
		 * parsed from the `permissions` prop using the same `group:<gid>` /
		 * bare-GID grammar as per-item `permission` narrowing — for hosts
		 * (e.g. an OpenBuilt virtual app) that pass the app's
		 * `Application.permissions.owners` principals through `permissions`
		 * rather than (or in addition to) the backend runtime.user
		 * projection. Read via `loadState` initial-state, never DOM
		 * data-attributes (hydra initial-state gate).
		 *
		 * @return {boolean}
		 */
		isOwner() {
			const runtime = this.manifest && this.manifest.runtime
			const runtimeUser = runtime && typeof runtime.user === 'object' && runtime.user !== null
				? runtime.user
				: null
			if (runtimeUser && runtimeUser.isOwner === true) return true
			return this.ownerGroupsIntersect
		},
		/**
		 * Caller's Nextcloud group GIDs, published by OpenBuild's
		 * `DashboardController::publishCurrentUserGroups()` initial state.
		 * Read via `loadState`, never DOM attributes. Defensive try/catch
		 * mirrors `serverAppStatuses` — apps without the `openbuild`
		 * initial-state key (non-OpenBuild hosts, tests) simply resolve to
		 * an empty list, so the fallback gate stays false rather than
		 * throwing.
		 *
		 * @return {Array<string>}
		 */
		currentUserGroups() {
			try {
				const groups = loadState('openbuild', 'currentUserGroups', [])
				return Array.isArray(groups) ? groups : []
			} catch {
				return []
			}
		},
		/**
		 * Owner GIDs parsed from the `permissions` prop using the existing
		 * per-item permission grammar (`group:<gid>` or a bare GID). Not
		 * every `permissions` entry is necessarily an owner GID (a host may
		 * also pass unrelated permission strings) — this is a best-effort
		 * parse, and only feeds the FALLBACK gate; the PRIMARY signal is
		 * `runtime.user.isOwner`.
		 *
		 * @return {Array<string>}
		 */
		ownerGidsFromPermissions() {
			if (!Array.isArray(this.permissions)) return []
			return this.permissions
				.filter((p) => typeof p === 'string' && p.length > 0)
				.map((p) => (p.startsWith('group:') ? p.slice('group:'.length) : p))
		},
		/**
		 * Whether `currentUserGroups` and `ownerGidsFromPermissions`
		 * intersect — the FALLBACK half of `isOwner`.
		 *
		 * @return {boolean}
		 */
		ownerGroupsIntersect() {
			const groups = this.currentUserGroups
			const owners = this.ownerGidsFromPermissions
			if (groups.length === 0 || owners.length === 0) return false
			return groups.some((g) => owners.includes(g))
		},
		/**
		 * Whether the manifest declares any `adminSettings` entries. An
		 * absent key and an empty array are treated identically — no admin
		 * dialog mounts either way (manifest-admin-settings D4).
		 *
		 * @return {boolean}
		 */
		hasAdminSettings() {
			return Array.isArray(this.manifest && this.manifest.adminSettings)
				&& this.manifest.adminSettings.length > 0
		},
		/**
		 * `manifest.adminSettings[]` sorted by `order` (ascending), falling
		 * back to array position when `order` is absent — mirrors
		 * CnAppNav's `visibleItems` sort convention.
		 *
		 * @return {Array<object>}
		 */
		sortedAdminSettings() {
			if (!this.hasAdminSettings) return []
			return this.manifest.adminSettings
				.map((entry, index) => ({ entry, index }))
				.sort((a, b) => {
					const aHas = typeof a.entry.order === 'number'
					const bHas = typeof b.entry.order === 'number'
					if (aHas && !bHas) return -1
					if (!aHas && bHas) return 1
					if (!aHas && !bHas) return a.index - b.index
					return (a.entry.order - b.entry.order) || (a.index - b.index)
				})
				.map((wrapped) => wrapped.entry)
		},
		/**
		 * `sortedAdminSettings` filtered by each entry's optional
		 * `permission` — narrow-only within the already owner-gated dialog
		 * (admin-settings-owner-gating "per-section permission narrows"
		 * requirement). Entries with no `permission` always pass; the
		 * dialog itself is only ever mounted for owners (`isOwner`), so a
		 * `permission` can never widen visibility to a non-owner.
		 *
		 * @return {Array<object>}
		 */
		visibleAdminSettingsSections() {
			return this.sortedAdminSettings.filter((section) => this.passesAdminSectionPermission(section))
		},
		/**
		 * The manifest the default `<CnAppNav>` renders — the editor's working
		 * `source` while in-app editing, else the live `manifest` prop. Passed to
		 * CnAppNav as a REACTIVE prop (not left to the provide/inject fallback):
		 * Vue 2 `inject` resolves the provided `cnManifest` getter once at the
		 * child's create time, so an async manifest update (e.g. a backend
		 * `/api/manifest` delta merged in by `useAppManifest`) never reaches the
		 * injected value. Binding the prop makes the nav update reactively.
		 * Mirrors the `cnManifest` provide getter so deep descendants stay
		 * consistent with the menu.
		 *
		 * @return {object}
		 */
		menuManifest() {
			const m = this.manifestEditor ? this.manifestEditor.source.value : this.manifest
			// Raw/reactive boundary (audit item 9). The manifest is held raw at
			// boot (CnAppRoot's shallowRef), so the default CnAppNav establishes
			// its render dependencies against a NON-reactive `menu` at first
			// render. When the in-app editor opts the manifest into reactivity on
			// edit-enter (`useManifestEditor.enter()` → `reactive()` in place),
			// CnAppNav would otherwise keep its stale dep-less render and miss live
			// menu edits. Handing it a FRESH wrapper identity while editing forces
			// one re-render that re-subscribes to the now-reactive `menu` array, so
			// menu add/label/reorder edits render live exactly as before — while
			// the spread's `menu` is the SAME reactive array, so in-place edits
			// flow through. Outside edit mode the live manifest is returned BY
			// IDENTITY (regression guard: the CnAppNav prop must === the manifest
			// prop for async backend-merge updates — see the reactive-menu tests).
			if (this.manifestEditor && this.manifestEditor.editing.value && m && typeof m === 'object') {
				return { ...m }
			}
			return m
		},
		/**
		 * Active object-sidebar holder for the auto-mount block.
		 * Mirrors the local holder; if an ancestor already provides
		 * `objectSidebarState`, the auto-mount is suppressed by
		 * `shouldAutoMountObjectSidebar`, so this getter is only
		 * read when we own the channel.
		 *
		 * @return {object}
		 */
		effectiveObjectSidebarState() {
			return this.localObjectSidebarState
		},
		/**
		 * Decide whether THIS CnAppRoot should render the hoisted
		 * CnObjectSidebar. False when:
		 * - the consumer fills `#sidebar` (their slot owns the rail);
		 * - an ancestor already provides `objectSidebarState`
		 *   (ancestor renders its own sidebar);
		 * - `localObjectSidebarState.active` is false (default);
		 * - `objectType` + `objectId` are both empty (defense-in-
		 *   depth against CnIndexPage's fallback writing `active:
		 *   true` into the wrong channel — see
		 *   CnAppRootObjectSidebar.spec.js for the regression).
		 *
		 * @return {boolean}
		 */
		shouldAutoMountObjectSidebar() {
			if (this.$slots && this.$slots.sidebar) return false
			if (this.$slots && this.$slots.sidebar) return false
			if (this.ancestorObjectSidebarState) return false
			const holder = this.localObjectSidebarState
			if (!holder || !holder.active) return false
			const hasObjectCoordinates = !!(holder.objectType && holder.objectId)
			return hasObjectCoordinates
		},
		/**
		 * Resolved support-dialog config — the manifest's `support` block
		 * (authored in OpenBuild's "Edit support & donation" editor) overlaid
		 * by any host-supplied `supportDialog` override object, so app authors
		 * can configure the donation/support note entirely from the UI while a
		 * host can still override per-mount.
		 *
		 * @return {object}
		 */
		cnSupportConfig() {
			const fromManifest = (this.manifest && this.manifest.support && typeof this.manifest.support === 'object')
				? this.manifest.support
				: {}
			const fromProp = (this.supportDialog && typeof this.supportDialog === 'object')
				? this.supportDialog
				: {}
			return { ...fromManifest, ...fromProp }
		},
		/**
		 * App display name for the support note — host override, else the
		 * capitalised `appId` (e.g. `pipelinq` → `Pipelinq`).
		 *
		 * @return {string}
		 */
		cnSupportAppName() {
			if (this.cnSupportConfig.appName) {
				return this.cnSupportConfig.appName
			}
			return this.appId
				? this.appId.charAt(0).toUpperCase() + this.appId.slice(1)
				: ''
		},
		/**
		 * App Store listing URL — host override, else the conventional
		 * `apps.nextcloud.com/apps/{appId}`.
		 *
		 * @return {string}
		 */
		cnSupportAppStoreUrl() {
			return this.cnSupportConfig.appStoreUrl
				|| ('https://apps.nextcloud.com/apps/' + this.appId)
		},
		/**
		 * Feature-request URL — host override, else the conventional
		 * `codeberg.org/Conduction/{appId}/issues/new`. The fleet's source
		 * of truth moved from GitHub to Codeberg (org `ConductionNL` →
		 * `Conduction`); Codeberg resolves repo-name casing.
		 *
		 * @return {string}
		 */
		cnSupportFeatureRequestUrl() {
			return this.cnSupportConfig.featureRequestUrl
				|| ('https://codeberg.org/Conduction/' + this.appId + '/issues/new')
		},
		/**
		 * Pass-through of any other `CnSupportDialog` props supplied in
		 * the `supportDialog` override object (donateUrl, supportUrl,
		 * conductionUrl, appsUrl, founderName/title/avatar/profile,
		 * bodyParagraphs). Lets a host re-sign the note without forking.
		 *
		 * @return {object}
		 */
		cnSupportOverrides() {
			const cfg = this.cnSupportConfig
			const passthrough = ['title', 'donateUrl', 'supportUrl', 'conductionUrl', 'appsUrl', 'founderName', 'founderTitle', 'founderAvatarUrl', 'founderProfileUrl', 'bodyParagraphs', 'buttons']
			const out = {}
			for (const key of passthrough) {
				if (cfg[key] !== undefined) {
					out[key] = cfg[key]
				}
			}
			return out
		},
		/**
		 * Whether the `CnCommandPalette` auto-mount is active — `true`, or
		 * an override object (per the `supportDialog` Boolean|Object
		 * convention above).
		 *
		 * @return {boolean}
		 */
		cnCommandPaletteVisible() {
			return this.commandPalette === true || (!!this.commandPalette && typeof this.commandPalette === 'object')
		},
		/**
		 * Prop overrides supplied via the `commandPalette` object form,
		 * spread onto `CnCommandPalette` OVER the auto-wired `manifest` /
		 * `router` / `app-id` — so an app can override e.g. `objectSearch`
		 * or `shortcut` without losing the zero-config navigation source.
		 *
		 * @return {object}
		 */
		cnCommandPaletteOverrides() {
			return (this.commandPalette && typeof this.commandPalette === 'object') ? this.commandPalette : {}
		},
		/**
		 * Per-dependency status, computed once per `appId` declared in
		 * `manifest.dependencies`. Reading the value here triggers the
		 * useAppStatus composable for each id; results are cached
		 * module-side so subsequent reads are free.
		 */
		dependencyStatuses() {
			const deps = Array.isArray(this.manifest?.dependencies)
				? this.manifest.dependencies
				: []
			// HARD/SOFT dependency model (REQ-DIA-4/REQ-DIA-5). Each manifest
			// entry is normalised to `{ id, required, name, status }`:
			//  - string        → HARD (`required: true`), name = id
			//  - { id, required?, name? } → `required` defaults to true;
			//    `required: false` marks a SOFT (optional) dependency.
			return deps
				.map((entry) => {
					const isObject = entry !== null && typeof entry === 'object'
					const id = isObject ? entry.id : entry
					if (typeof id !== 'string' || id === '') return null
					const required = isObject ? entry.required !== false : true
					const name = (isObject && entry.name) || id
					return { id, required, name, status: useAppStatus(id) }
				})
				.filter((entry) => entry !== null)
		},
		/**
		 * App statuses injected by the PHP boot() via IInitialStateService.
		 * Keyed by app id: { installed: bool, enabled: bool }.
		 * Falls back to {} when not injected (non-pipelinq consumers, tests).
		 */
		serverAppStatuses() {
			try {
				const statuses = loadState(this.appId, 'dependency_statuses', {})
				return statuses
			} catch {
				return {}
			}
		},

		unresolvedDependencies() {
			return this.dependencyStatuses
				.filter(({ id, status }) => {
					const server = this.serverAppStatuses[id]
					if (server !== undefined) return !server.installed || !server.enabled
					return !status.installed.value || !status.enabled.value
				})
				.map(({ id, required, name }) => {
					const server = this.serverAppStatuses[id]
					if (server !== undefined) {
						// Server data available: correctly distinguish the two states.
						// enabled: false → installed but disabled (→ "Enable")
						// enabled: undefined → not installed (→ "Install")
						return {
							id,
							name,
							required,
							category: server.category ?? 'featured',
							enabled: server.installed ? false : undefined,
						}
					}
					// No server data and the JS heuristic cannot tell not-installed
					// from installed-but-disabled. Default to the safe "not
					// installed" shape (enabled: undefined → "Install and enable"):
					// a genuinely-missing app must never be mislabelled "Enable".
					return { id, name, required, category: 'featured', enabled: undefined }
				})
		},
		/**
		 * Unresolved HARD dependencies — the app cannot run without these,
		 * so their presence gates the shell behind the blocking
		 * `dependency-missing` phase / `CnDependencyMissing` screen
		 * (REQ-DIA-5).
		 *
		 * @return {Array<object>} Unresolved entries with `required === true`.
		 */
		unresolvedHardDependencies() {
			return this.unresolvedDependencies.filter((dep) => dep.required)
		},
		/**
		 * Unresolved SOFT dependencies — optional integrations whose
		 * absence must NOT block the shell. Each surfaces as a dismissible
		 * in-shell `NcNoteCard` banner (REQ-DIA-6), filtered here to those
		 * not yet dismissed in `localStorage`.
		 *
		 * @return {Array<object>} Undismissed unresolved entries with
		 *   `required === false`.
		 */
		unresolvedSoftDependencies() {
			return this.unresolvedDependencies
				.filter((dep) => !dep.required)
				.filter((dep) => !this.dismissedSoftDeps.includes(dep.id))
		},
		/**
		 * First-time-setup status for this app (ADR-042), or null when the
		 * manifest declares no `setup` block. Calls useSetupStatus inside the
		 * computed so the returned refs stay reactive (same pattern as
		 * unresolvedDependencies → useAppStatus).
		 */
		setupState() {
			if (!this.appId || !this.manifest || !this.manifest.setup || this.manifest.setup.enabled === false) {
				return null
			}
			return useSetupStatus(this.appId, this.manifest)
		},
		/**
		 * Whether a REQUIRED setup step is unmet — the app shell is gated to
		 * the setup wizard until this clears. Never gates while the status is
		 * still loading (avoids a flash before the answer is known).
		 */
		setupGating() {
			const s = this.setupState
			return !!s && s.loading.value === false && s.requiredUnmet.value.length > 0
		},
		/**
		 * Whether the manifest declares an enabled walkthrough with at least one
		 * tour (ADR-043). Drives the non-gating CnWalkthrough overlay in the shell.
		 *
		 * @return {boolean} True when a walkthrough should mount.
		 */
		walkthroughEnabled() {
			const w = this.manifest && this.manifest.walkthrough
			return !!(w && w.enabled !== false && Array.isArray(w.tours) && w.tours.length > 0)
		},
		/**
		 * The user's last-seen app version for walkthrough composition. Read from
		 * a per-user/browser key; CnAppRoot writes it on completion. Apps wanting
		 * cross-device persistence can override the `#walkthrough` slot.
		 *
		 * @return {string} The last-seen version, or '' for a fresh user.
		 */
		walkthroughSeenVersion() {
			try {
				return window.localStorage.getItem('cn-walkthrough-seen:' + this.appId) || ''
			} catch (e) {
				return ''
			}
		},
		/**
		 * Cross-app / refresh resume token parsed from the URL query
		 * (`cn_resume_tour` / `cn_resume_step`), or null.
		 *
		 * @return {object|null} `{ tourId, stepId }` or null.
		 */
		walkthroughResume() {
			try {
				const p = new URLSearchParams(window.location.search)
				const tourId = p.get('cn_resume_tour')
				if (!tourId) return null
				return { tourId, stepId: p.get('cn_resume_step') || '' }
			} catch (e) {
				return null
			}
		},
		phase() {
			if (this.isLoading) return 'loading'
			// Only unresolved HARD dependencies block the shell (REQ-DIA-5);
			// unresolved SOFT dependencies surface as a non-blocking in-shell
			// banner and let the app advance to setup/shell.
			if (this.unresolvedHardDependencies.length > 0) return 'dependency-missing'
			if (this.setupGating) return 'setup'
			return 'shell'
		},
		/**
		 * Default link surfaced by the missing-app empty-state action.
		 * Points at the OpenRegister integration page in the Nextcloud
		 * app store. Replaceable per consumer via the `#or-missing`
		 * slot.
		 */
		orStoreLink() {
			return OR_STORE_LINK
		},
		/**
		 * Whether the current user is a Nextcloud admin. Only admins can
		 * hit `settings/apps/enable`, so both dependency surfaces branch on
		 * this: admins get the in-place install/enable action, non-admins
		 * get "ask your administrator" copy (REQ-DIA-2 / REQ-DIA-3).
		 *
		 * @return {boolean}
		 */
		isAdmin() {
			try {
				return getCurrentUser()?.isAdmin === true
			} catch (e) {
				return false
			}
		},
		/**
		 * The missing app the or-missing guard's primary install/enable
		 * action targets — the first entry of `missingApps` (typically
		 * `openregister`). Empty string when nothing is missing.
		 *
		 * @return {string}
		 */
		orMissingPrimaryApp() {
			return this.missingApps[0] || ''
		},
		/**
		 * Human-readable list of the missing apps for the guard copy.
		 *
		 * @return {string}
		 */
		missingAppsLabel() {
			return this.missingApps.join(', ')
		},
		/**
		 * Guard title — the translated `app-availability.title`, or a
		 * sensible English default when the key is untranslated (REQ-DIA-7).
		 *
		 * @return {string}
		 */
		orMissingTitle() {
			return this.availabilityCopy('app-availability.title', 'Required app not available')
		},
		/**
		 * Guard description — translated `app-availability.description` or an
		 * English default naming the missing app(s) (REQ-DIA-7).
		 *
		 * @return {string}
		 */
		orMissingDescription() {
			return this.availabilityCopy(
				'app-availability.description',
				`This app requires ${this.missingAppsLabel || 'another Nextcloud app'} to be installed and enabled.`,
			)
		},
		/**
		 * Fallback store-link label — translated `app-availability.action`
		 * or an English default (REQ-DIA-7).
		 *
		 * @return {string}
		 */
		orMissingActionLabel() {
			return this.availabilityCopy('app-availability.action', 'Open app settings')
		},
		/**
		 * Admin install button label for the or-missing guard.
		 *
		 * @return {string}
		 */
		orMissingInstallLabel() {
			return this.availabilityCopy('app-availability.install', 'Install and enable')
		},
		/**
		 * Non-admin "ask your administrator" copy for the or-missing guard
		 * (REQ-DIA-3), naming the missing app(s).
		 *
		 * @return {string}
		 */
		orMissingAskAdmin() {
			return this.availabilityCopy(
				'app-availability.ask-admin',
				`Ask your administrator to enable ${this.missingAppsLabel || 'the required app'}.`,
			)
		},
		/**
		 * Soft-dependency install-action label (app not installed).
		 *
		 * @return {string}
		 */
		softDepInstallLabel() {
			return this.availabilityCopy('app-availability.soft.install', 'Install and enable')
		},
		/**
		 * Soft-dependency enable-action label (installed but disabled).
		 *
		 * @return {string}
		 */
		softDepEnableLabel() {
			return this.availabilityCopy('app-availability.soft.enable', 'Enable')
		},
		/**
		 * Soft-dependency dismiss-action label.
		 *
		 * @return {string}
		 */
		softDepDismissLabel() {
			return this.availabilityCopy('app-availability.soft.dismiss', 'Dismiss')
		},
		/**
		 * Repo target for the built-in feature-request deep link.
		 * Provided to descendants under the `cnFeatureRequestRepo`
		 * inject key. Reads `manifest.nav.featureRequestRepo` when set;
		 * falls back to `Conduction/<appId>` — the convention for every
		 * Conduction app on Codeberg (the org slug is `Conduction`, vs
		 * `ConductionNL` on the old GitHub org). Returns empty string
		 * when no `appId` is available (defensive — should never happen
		 * since `appId` is a required prop).
		 *
		 * @return {string}
		 */
		resolvedFeatureRequestRepo() {
			const explicit = this.manifest?.nav?.featureRequestRepo
			if (typeof explicit === 'string' && explicit.length > 0) return explicit
			if (!this.appId) return ''
			return `Conduction/${this.appId}`
		},
		/**
		 * Forge config for the built-in feature-request deep link,
		 * provided under the `cnFeatureRequestForge` inject key. Reads
		 * `manifest.nav.forge` and merges it over the Codeberg default,
		 * so a manifest may set just `type` (e.g. back to `github`) or
		 * also `baseUrl` (self-hosted Forgejo/Gitea).
		 *
		 * @return {{type: string, baseUrl: string}}
		 */
		resolvedFeatureRequestForge() {
			const cfg = this.manifest?.nav?.forge
			return { ...DEFAULT_FORGE, ...(cfg && typeof cfg === 'object' ? cfg : {}) }
		},
		resolvedUserSettingsTitle() {
			return this.userSettingsTitle || this.translate('User settings')
		},
		/**
		 * Title for the admin-settings modal. Prop override, else the
		 * translated "Administration". Mirrors `resolvedUserSettingsTitle`.
		 *
		 * @return {string}
		 */
		resolvedAdminSettingsTitle() {
			return this.adminSettingsTitle || this.translate('Administration')
		},
		/**
		 * Section heading for the walkthrough-replay block in user settings.
		 *
		 * @return {string}
		 */
		restartWalkthroughSectionName() {
			return this.translate('Walkthrough')
		},
		/**
		 * Explanatory line above the restart-walkthrough button.
		 *
		 * @return {string}
		 */
		restartWalkthroughHint() {
			return this.translate('Take the guided tour of this app again.')
		},
		/**
		 * Label for the restart-walkthrough button in user settings.
		 *
		 * @return {string}
		 */
		restartWalkthroughLabel() {
			return this.translate('Restart walkthrough')
		},
		/**
		 * Resolve the active modal's Vue component from the registry.
		 * Returns null when no modal is open or the key no longer resolves.
		 *
		 * @return {object|null}
		 */
		activeModalComponent() {
			if (!this.activeModalKey) return null
			const entry = (this.registry || {})[this.activeModalKey]
			return (entry && entry.component) ? entry.component : null
		},
	},

	mounted() {
		// Guard against silently losing unsaved in-app edits. The manifest
		// editor stays `dirty` for the whole Save (the persist PUT can take a
		// few seconds), so a refresh mid-save would drop the edit before the
		// write lands; this warns the user while there are unsaved/in-flight
		// changes. Registered before the early-return so it always installs.
		window.addEventListener('beforeunload', this.onBeforeUnload)

		// Opt-out fast-path: empty `requiresApps` already initialised
		// `capabilitiesLoading` to `false` in data(); skip the check.
		if (!Array.isArray(this.requiresApps) || this.requiresApps.length === 0) {
			this._validateRegistry()
			this._warnCustomComponentsDeprecation()
			this._hydrateMenuCounts()
			return
		}

		try {
			// Use useAppStatus which checks OC.appswebroots first — Nextcloud
			// populates that map for every enabled app regardless of which
			// folder it lives in (apps/, custom-apps/, custom_apps/). Falling
			// back to getCapabilities() alone misses apps that do not register
			// an ICapability (OpenRegister being the primary example).
			this.missingApps = this.requiresApps.filter((id) => {
				const { installed } = useAppStatus(id)
				return !installed.value
			})
		} catch (err) {
			// eslint-disable-next-line no-console
			console.warn(
				'[CnAppRoot] Failed to check app availability for the app-availability guard:',
				err,
			)
			this.guardError = err
			this.missingApps = []
		} finally {
			this.capabilitiesLoading = false
		}

		this._validateRegistry()
		this._warnCustomComponentsDeprecation()
		this._hydrateMenuCounts()
	},

	beforeUnmount() {
		window.removeEventListener('beforeunload', this.onBeforeUnload)
	},

	methods: {
		/**
		 * Re-fetch the pages editor's register/schema data sources via the
		 * `dataSourcesLoader` prop. Provided to descendants as
		 * `cnRefreshDataSources`; the pages-editor modals call it on open.
		 *
		 * Mutates `dataSourcesState` in place (never reassigns it — see the
		 * stable-identity contract in `data()`). A refresh already in flight
		 * is reused rather than duplicated, so two modals opening at once
		 * issue one fetch. The previous list stays in `value` while a refresh
		 * runs and survives a failure, so the user can keep editing against
		 * the last known-good data instead of an empty dropdown.
		 *
		 * @return {Promise<void>} Resolves when the refresh settles. Never rejects.
		 */
		async refreshDataSources() {
			if (typeof this.dataSourcesLoader !== 'function') return
			if (this._dataSourcesInFlight) return this._dataSourcesInFlight

			this.dataSourcesState.loading = true
			this.dataSourcesState.error = null

			// Wrapped so a loader that throws synchronously is handled
			// identically to one that returns a rejecting promise.
			this._dataSourcesInFlight = (async () => {
				try {
					const next = await this.dataSourcesLoader()
					this.dataSourcesState.value = next || { registers: [] }
				} catch (e) {
					this.dataSourcesState.error = e
					// Keep the last good `value` — a failed refresh must not
					// blank a list the user is mid-edit against.
				} finally {
					this.dataSourcesState.loading = false
					this._dataSourcesInFlight = null
				}
			})()

			return this._dataSourcesInFlight
		},
		/**
		 * Whether an `adminSettings` entry's optional `permission` passes
		 * for the current caller, mirroring `CnAppNav.passesPermission`'s
		 * grammar exactly (a section with no `permission` always passes;
		 * an empty/absent `permissions` prop passes everything). Narrow-
		 * only: called only from within the already owner-gated admin
		 * dialog, so this can never grant a non-owner visibility.
		 *
		 * @param {{ permission?: string }} section An `adminSettings` entry.
		 * @return {boolean}
		 */
		passesAdminSectionPermission(section) {
			if (!section || !section.permission) return true
			if (!this.permissions || this.permissions.length === 0) return true
			return this.permissions.includes(section.permission)
		},
		/**
		 * Resolve a custom `adminSettings` entry's `component` key against
		 * the same registries `CnBodySections.resolveSectionComponent` /
		 * `CnPageRenderer.resolveCustomComponent` use for slot components:
		 * the v2 `registry` prop (any kind exposing a `.component`) wins,
		 * falling back to the legacy `customComponents` map. Returns `null`
		 * (renders nothing) when neither has the key registered.
		 *
		 * @param {string} key The entry's `component` registry key.
		 * @return {import('vue').Component|null}
		 */
		resolveAdminSettingsComponent(key) {
			if (typeof key !== 'string' || key === '') return null
			const reg = (this.registry && this.registry[key]) || null
			if (reg && reg.component) return reg.component
			const legacy = this.customComponents && this.customComponents[key]
			return legacy || null
		},
		/**
		 * Return the translated copy for `key`, or `fallback` when the
		 * `translate` prop leaves the key unchanged (its default is the
		 * identity function and no consumer app defines the
		 * `app-availability.*` keys). Keeps real l10n working for apps that
		 * DO supply the strings while guaranteeing English prose otherwise
		 * (REQ-DIA-7).
		 *
		 * @param {string} key The i18n key.
		 * @param {string} fallback The English default.
		 * @return {string}
		 */
		availabilityCopy(key, fallback) {
			const translated = this.translate(key)
			return (translated === undefined || translated === null || translated === key)
				? fallback
				: translated
		},
		/**
		 * Install-and-enable (or enable) a missing dependency via the shared
		 * `useAppInstaller` (REQ-DIA-3 / REQ-DIA-6). Marks the dependency
		 * busy for the per-button spinner, reloads on success (a freshly
		 * installed app's assets only exist after a full load), and on
		 * failure leaves `depInstallError` set so the store link stays as a
		 * fallback.
		 *
		 * @param {string} id The Nextcloud app id to install/enable.
		 * @return {Promise<void>}
		 */
		async installDependency(id) {
			if (!id) return
			this.installingDepId = id
			this.erroredDepId = null
			try {
				await this.appInstaller.installAndEnable(id)
				window.location.reload()
			} catch (e) {
				// Error is surfaced inline via `depInstallError`; the store
				// link remains available as a manual fallback. A cancelled
				// password confirmation also lands here (no error text).
				this.erroredDepId = id
			} finally {
				this.installingDepId = null
			}
		},
		/**
		 * Dismiss a soft-dependency banner (REQ-DIA-6). Persists the
		 * dismissal under `cn-soft-dep-dismissed:{appId}:{depId}` and hides
		 * the banner reactively. Independent per dependency.
		 *
		 * @param {string} id The soft dependency's app id.
		 * @return {void}
		 */
		dismissSoftDep(id) {
			try {
				window.localStorage.setItem('cn-soft-dep-dismissed:' + this.appId + ':' + id, '1')
			} catch (e) {
				// Best-effort persistence (private mode / no storage).
			}
			if (!this.dismissedSoftDeps.includes(id)) {
				this.dismissedSoftDeps.push(id)
			}
		},
		/**
		 * Heading for a soft-dependency banner.
		 *
		 * @param {object} dep The normalised dependency `{ id, name, ... }`.
		 * @return {string}
		 */
		softDepHeading(dep) {
			return this.availabilityCopy('app-availability.soft.heading', `Optional: ${dep.name}`)
		},
		/**
		 * Body text for a soft-dependency banner.
		 *
		 * @param {object} dep The normalised dependency `{ id, name, ... }`.
		 * @return {string}
		 */
		softDepText(dep) {
			return this.availabilityCopy(
				'app-availability.soft.description',
				`${dep.name} unlocks optional features in this app but is not installed or enabled.`,
			)
		},
		/**
		 * Non-admin "ask your administrator" copy for a soft-dependency
		 * banner.
		 *
		 * @param {object} dep The normalised dependency `{ id, name, ... }`.
		 * @return {string}
		 */
		softDepAskAdmin(dep) {
			return this.availabilityCopy('app-availability.soft.ask-admin', `Ask your administrator to enable ${dep.name}.`)
		},
		/**
		 * Warn before unload when the manifest editor has unsaved (or still-
		 * persisting) changes, so a refresh can't silently discard an in-app
		 * edit. No-op when not editing / nothing dirty.
		 *
		 * @param {BeforeUnloadEvent} event The browser beforeunload event.
		 * @return {string|undefined} A non-empty string triggers the native prompt.
		 */
		onBeforeUnload(event) {
			const editor = this.manifestEditor
			const dirtyRef = editor && editor.dirty
			const dirty = dirtyRef && typeof dirtyRef === 'object' && 'value' in dirtyRef ? dirtyRef.value : dirtyRef
			if (!dirty) return undefined
			// The standard cross-browser incantation to trigger the prompt.
			event.preventDefault()
			event.returnValue = ''
			return ''
		},
		/**
		 * Re-fetch setup status after the wizard reports completion so the
		 * phase flips from `setup` to `shell` without a page reload.
		 *
		 * @return {void}
		 */
		onSetupComplete() {
			if (this.setupState && typeof this.setupState.refresh === 'function') {
				this.setupState.refresh()
			}
			/**
			 * @event setup-complete Emitted after the gating setup wizard reports
			 * completion and the status has been re-fetched.
			 */
			this.$emit('setup-complete')
		},
		/**
		 * Persist the current app version as the user's last-seen walkthrough
		 * version (so an upgrade later surfaces only newer steps) and notify.
		 *
		 * @return {void}
		 */
		onWalkthroughComplete() {
			try {
				const v = (this.manifest && this.manifest.version) || '1.0.0'
				window.localStorage.setItem('cn-walkthrough-seen:' + this.appId, String(v))
			} catch (e) {
				// Non-fatal: persistence is best-effort (private mode / no storage).
			}
			/**
			 * @event walkthrough-complete Emitted when the walkthrough finishes or is dismissed.
			 */
			this.$emit('walkthrough-complete')
		},
		/**
		 * Replay the product tour from the user-settings dialog. Closes the
		 * dialog first, then restarts the first declared tour on the next tick
		 * — the modal must finish unmounting before the tour overlay paints, or
		 * the spotlight anchors against the closing modal. Mirrors the
		 * `cnReplayWalkthrough` provide method (same useWalkthrough cache, so
		 * the rendered CnWalkthrough genuinely re-fires).
		 *
		 * @return {void}
		 */
		restartWalkthroughFromSettings() {
			this.userSettingsOpen = false
			if (!this.walkthroughEnabled) return
			// 50ms lets the dialog's close animation settle so the tour
			// re-appears cleanly over the app shell, not the closing modal.
			setTimeout(() => {
				const id = this.manifest.walkthrough.tours[0] && this.manifest.walkthrough.tours[0].id
				if (id) useWalkthrough(this.appId, this.manifest).restart(id)
			}, 50)
		},
		/**
		 * Validate every entry in the `registry` prop at mount time.
		 *
		 * - Unknown `kind` throws `RegistryKindError` (hard error; developer
		 *   must fix the registration).
		 * - Known `kind` with missing required metadata emits `console.warn`
		 *   (soft error; the widget still renders with defaults).
		 */
		_validateRegistry() {
			const registry = this.registry || {}
			for (const [key, entry] of Object.entries(registry)) {
				if (!entry || typeof entry !== 'object') continue

				const kind = entry.kind

				if (!KNOWN_REGISTRY_KINDS.includes(kind)) {
					throw new RegistryKindError(key, kind)
				}

				const requiredFields = REGISTRY_KIND_REQUIRED_FIELDS[kind]
				for (const field of requiredFields) {
					if (!Object.prototype.hasOwnProperty.call(entry, field)) {
						// eslint-disable-next-line no-console
						console.warn(
							`[CnAppRoot] Registry entry "${key}" (kind: "${kind}") is missing required metadata field "${field}".`,
						)
					}
				}
			}
		},

		/**
		 * Emit a single console.warn per mount when both a non-empty
		 * customComponents prop AND a v2 manifest are present.
		 *
		 * Uses an instance flag `_customComponentsWarnedOnce` to prevent
		 * repeat warnings on re-render.
		 */
		_warnCustomComponentsDeprecation() {
			if (this._customComponentsWarnedOnce) return

			const hasCustomComponents = this.customComponents
				&& typeof this.customComponents === 'object'
				&& Object.keys(this.customComponents).length > 0

			const isV2Manifest = this.manifest
				&& typeof this.manifest.$schema === 'string'
				&& this.manifest.$schema.includes('app-manifest-v2')

			if (hasCustomComponents && isV2Manifest) {
				// eslint-disable-next-line no-console
				console.warn(
					'CnAppRoot: `customComponents` prop is deprecated when using v2 manifests. '
					+ 'Use the `registry` prop instead (see ADR-036).',
				)
				this._customComponentsWarnedOnce = true
			}
		},

		/**
		 * Scan the manifest for `count: "auto"` menu entries (top-level
		 * AND nested children) and hydrate `this.cnMenuCounts` from
		 * `useObjectStore().getPagination(slug).total` for each unique
		 * `(register, schema)` pair whose resolved page is `type: "index"`.
		 *
		 * Triggers one `fetchCollection(slug, { _limit: 1 })` per pair so
		 * the store's pagination cache is warmed. Subsequent CnIndexPage
		 * mounts reuse the same store entry (no extra round-trip).
		 *
		 * Failures are non-fatal — missing Pinia (no `pinia` plugin
		 * installed on the Vue instance), unregistered type slugs, or
		 * network errors all degrade gracefully to "no badge".
		 *
		 * @return {void}
		 * @private
		 */
		_hydrateMenuCounts() {
			const menu = this.manifest?.menu ?? []
			if (!Array.isArray(menu) || menu.length === 0) return

			const pages = this.manifest?.pages ?? []
			const collectAutoTargets = (items) => {
				const targets = []
				for (const item of items ?? []) {
					if (item?.count === 'auto' && item?.route) {
						const page = pages.find((p) => p.id === item.route)
						if (page?.type === 'index' && page?.config?.register && page?.config?.schema) {
							targets.push({ register: page.config.register, schema: page.config.schema })
						}
					}
					if (Array.isArray(item?.children)) {
						targets.push(...collectAutoTargets(item.children))
					}
				}
				return targets
			}

			const pairs = collectAutoTargets(menu)
			if (pairs.length === 0) return

			// De-duplicate by (register, schema).
			const seen = new Set()
			const uniquePairs = []
			for (const pair of pairs) {
				const key = `${pair.register}|${pair.schema}`
				if (seen.has(key)) continue
				seen.add(key)
				uniquePairs.push(pair)
			}

			// Prefer ONE batched round-trip (audit item 26): shillinq's nav
			// alone hits ~dozens of unique (register, schema) pairs, each of
			// which was a separate `?_limit=1` request at boot. On an
			// OpenRegister without the batch route (404) or any error, fall
			// back to the per-entry store path below so badges still render.
			this._hydrateMenuCountsBatched(uniquePairs).catch(() => {
				this._hydrateMenuCountsPerEntry(uniquePairs)
			})
		},

		/**
		 * Hydrate all menu counts with a single `POST /api/objects/counts`
		 * (OpenRegister batched-counts endpoint). Distributes each returned
		 * count into the reactive `cnMenuCounts` map. Rejects (so the caller
		 * falls back) on a non-2xx status, a missing/404 route, or a malformed
		 * response — never leaving a half-populated batch masquerading as done.
		 *
		 * @param {Array<{register: string, schema: string}>} uniquePairs Deduped pairs.
		 * @return {Promise<void>}
		 * @private
		 */
		async _hydrateMenuCountsBatched(uniquePairs) {
			const url = generateUrl('/apps/openregister/api/objects/counts')
			const { data } = await axios.post(url, {
				counts: uniquePairs.map(({ register, schema }) => ({ register, schema })),
			})
			const results = data?.results
			if (!Array.isArray(results)) {
				throw new Error('batched counts: malformed response')
			}
			for (const result of results) {
				const { register, schema, count } = result ?? {}
				if (typeof count !== 'number' || count < 0) continue
				if (!this.cnMenuCounts[register]) {
					this.cnMenuCounts[register] = {}
				}
				this.cnMenuCounts[register][schema] = count
			}
		},

		/**
		 * Legacy per-entry hydration: one `?_limit=1` store fetch per pair.
		 * The pre-batch behaviour, retained verbatim as the fallback for an
		 * OpenRegister without the batch route.
		 *
		 * @param {Array<{register: string, schema: string}>} uniquePairs Deduped pairs.
		 * @return {void}
		 * @private
		 */
		_hydrateMenuCountsPerEntry(uniquePairs) {
			let store
			try {
				store = useObjectStore()
			} catch (err) {
				// No Pinia plugin installed (tests, isolated mounts) —
				// silently skip; CnAppNav renders no badge.
				return
			}
			if (!store) return

			for (const { register, schema } of uniquePairs) {
				const slug = `${register}-${schema}`
				this._fetchAndCacheCount(store, slug, register, schema)
			}
		},

		/**
		 * Fire-and-forget count fetch + cache writer. Registers the type
		 * with the store on demand (so the consuming app doesn't need to
		 * pre-register every counted slug), issues a `?_limit=1` index
		 * fetch, and writes the resulting `total` into `cnMenuCounts`.
		 *
		 * Errors are swallowed so a single broken endpoint cannot blank
		 * the entire navigation. The most common failure modes
		 * (unregistered type, network error, store unavailable) all leave
		 * the badge unrendered — which is the documented fallback.
		 *
		 * @param {object} store  The `useObjectStore()` result.
		 * @param {string} slug   The store's type slug (`${register}-${schema}`).
		 * @param {string} register OpenRegister register slug.
		 * @param {string} schema   OpenRegister schema slug.
		 * @return {Promise<void>}
		 * @private
		 */
		async _fetchAndCacheCount(store, slug, register, schema) {
			try {
				if (typeof store.registerObjectType === 'function'
					&& (!store.objectTypeRegistry || !store.objectTypeRegistry[slug])) {
					store.registerObjectType(slug, schema, register)
				}
				if (typeof store.fetchCollection === 'function') {
					await store.fetchCollection(slug, { _limit: 1 })
				}
				const pagination = typeof store.getPagination === 'function'
					? store.getPagination(slug)
					: null
				const total = pagination?.total
				if (typeof total === 'number' && total >= 0) {
					if (!this.cnMenuCounts[register]) {
						this.cnMenuCounts[register] = {}
					}
					this.cnMenuCounts[register][schema] = total
				}
			} catch (err) {
				// Non-fatal — leave the badge unrendered.
			}
		},
	},
}
</script>

<style>
.cn-app-root__capabilities-loading {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	min-height: 100vh;
	background: var(--color-main-background);
}

.cn-app-root__or-missing {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	min-height: 100vh;
	background: var(--color-main-background);
	color: var(--color-main-text);
}

.cn-app-root__or-missing-action {
	display: inline-block;
	padding: calc(1.5 * var(--default-grid-baseline)) calc(3 * var(--default-grid-baseline));
	border-radius: var(--border-radius);
	background: var(--color-primary-element);
	color: var(--color-primary-element-text);
	text-decoration: none;
}

.cn-app-root__or-missing-action:hover,
.cn-app-root__or-missing-action:focus {
	background: var(--color-primary-element-hover);
	text-decoration: underline;
}

.cn-app-root__walkthrough-hint {
	margin-bottom: 12px;
	color: var(--color-text-maxcontrast);
}

.cn-app-root__or-missing-error {
	margin: calc(2 * var(--default-grid-baseline)) 0 calc(1 * var(--default-grid-baseline));
	color: var(--color-error);
}

.cn-app-root__or-missing-ask-admin {
	color: var(--color-text-maxcontrast);
}

.cn-app-root__soft-dep {
	margin: calc(2 * var(--default-grid-baseline));
}

.cn-app-root__soft-dep-body {
	display: flex;
	flex-direction: column;
	gap: var(--default-grid-baseline);
}

.cn-app-root__soft-dep-actions {
	display: flex;
	align-items: center;
	gap: calc(2 * var(--default-grid-baseline));
	flex-wrap: wrap;
}

.cn-app-root__soft-dep-ask-admin {
	color: var(--color-text-maxcontrast);
}

.cn-app-root__soft-dep-error {
	margin: 0;
	color: var(--color-error);
}
</style>
