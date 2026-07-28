<!--
  - SPDX-License-Identifier: EUPL-1.2
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  -
  - CnCredentials — the settings surface for the OpenRegister credential
  - broker. Apps occasionally need to act on your behalf against an external
  - service (GitHub, GitLab, …). Rather than hand the secret to the app, you
  - give it once to OpenRegister, which stores it in Doriath — Nextcloud's
  - native, encrypted credential vault. Apps then make the outbound call
  - THROUGH OpenRegister and never see the secret itself. You decide which
  - apps may use each credential, so one credential can be shared across apps
  - or kept dedicated to one.
  -
  - Two scopes render from this one component:
  -   • scope="personal"      (default) — the signed-in user's own
  -     credentials, shown in an app's *personal* settings. From here you may
  -     only add/remove *the app you are currently in* to/from a credential,
  -     or add a new credential (the current app is auto-added). You never
  -     manage the full app list of another app from here.
  -   • scope="organisation"  — organisation-wide credentials, shown in an
  -     app's *admin* settings. An admin manages the full allowed-app list.
  -
  - Talks to OpenRegister's credential endpoints (metadata only — a secret is
  - write-only and is NEVER returned or displayed):
  -   GET    /apps/openregister/api/credentials?scope={scope}
  -   GET    /apps/openregister/api/credentials/providers
  -   POST   /apps/openregister/api/credentials      { name, provider, allowedApps?, secret?, scope? }
  -   PUT    /apps/openregister/api/credentials/{id}  { name?, allowedApps?, secret? }
  -   DELETE /apps/openregister/api/credentials/{id}
  -
  - Provider presentation (title, colour, how-to text + link, secret label) is
  - a hardcoded catalogue in this file (PROVIDER_META): new providers get a
  - richer card here without a server change; unknown providers fall back to a
  - neutral tile keyed off the identifier.
  -
  - Renders inside CnAppRoot's `#user-settings` (personal) or an admin surface
  - (organisation). Fails soft: a 404 (broker not installed) degrades to an
  - empty state with a friendly note rather than crashing.
  -->
<template>
	<div class="cn-credentials" :class="`cn-credentials--${scope}`">
		<p class="cn-credentials__intro">
			{{ introText }}
			<a v-if="resolvedVaultUrl"
				:href="resolvedVaultUrl"
				class="cn-credentials__vault-link"
				target="_self">
				{{ t('nextcloud-vue', 'Learn about Doriath') }} ↗
			</a>
		</p>

		<!-- What this app uses (the app's manifest credentials[] requirements) -->
		<section v-if="scope === 'personal'" class="cn-credentials__section cn-credentials__supports">
			<h4 class="cn-credentials__section-title">
				{{ t('nextcloud-vue', 'What {app} uses', { app: appDisplayName }) }}
			</h4>
			<p v-if="appCredentials.length === 0" class="cn-credentials__muted">
				{{ t('nextcloud-vue', 'This app does not use any external credentials.') }}
			</p>
			<ul v-else class="cn-credentials__requests">
				<li v-for="(req, index) in appCredentials"
					:key="`req-${index}`"
					class="cn-credentials__request">
					<span class="cn-credentials__tile-dot" :style="dotStyle(req.provider)">{{ providerInitial(req.provider) }}</span>
					<span class="cn-credentials__request-body">
						<span class="cn-credentials__request-provider">{{ providerTitle(req.provider) }}</span>
						<span v-if="req.reason" class="cn-credentials__request-reason">{{ req.reason }}</span>
					</span>
				</li>
			</ul>
		</section>

		<NcLoadingIcon v-if="loading" :size="24" />

		<template v-else>
			<NcNoteCard v-if="error"
				type="warning"
				class="cn-credentials__error">
				{{ t('nextcloud-vue', 'Credentials are provided by OpenRegister and could not be loaded here.') }}
			</NcNoteCard>

			<!-- Your / the organisation's credentials -->
			<section class="cn-credentials__section">
				<h4 class="cn-credentials__section-title">
					{{ scope === 'organisation' ? t('nextcloud-vue', 'Organisation credentials') : t('nextcloud-vue', 'Your credentials') }}
				</h4>
				<p v-if="visibleCredentials.length === 0" class="cn-credentials__muted">
					{{ t('nextcloud-vue', 'No credentials stored yet.') }}
				</p>
				<ul v-else class="cn-credentials__list">
					<li v-for="cred in visibleCredentials"
						:key="cred.id"
						class="cn-credentials__item">
						<div class="cn-credentials__item-head">
							<span class="cn-credentials__tile-dot" :style="dotStyle(cred.provider)">{{ providerInitial(cred.provider) }}</span>
							<div class="cn-credentials__item-meta">
								<span class="cn-credentials__item-name">{{ cred.name }}</span>
								<span class="cn-credentials__item-provider">{{ providerTitle(cred.provider) }}</span>
							</div>
							<div class="cn-credentials__item-actions">
								<template v-if="cred.confirmingDelete">
									<NcButton variant="error"
										:disabled="cred.saving"
										@click="onDelete(cred)">
										{{ t('nextcloud-vue', 'Confirm delete') }}
									</NcButton>
									<NcButton variant="tertiary"
										:disabled="cred.saving"
										@click="cred.confirmingDelete = false">
										{{ t('nextcloud-vue', 'Cancel') }}
									</NcButton>
								</template>
								<NcButton v-else
									variant="tertiary"
									:disabled="cred.saving"
									@click="cred.confirmingDelete = true">
									{{ t('nextcloud-vue', 'Delete') }}
								</NcButton>
							</div>
						</div>

						<!-- Personal: only toggle THIS app in/out of the credential. -->
						<div v-if="scope === 'personal'" class="cn-credentials__item-toggle">
							<NcCheckboxRadioSwitch :model-value="appAllowed(cred)"
								:disabled="cred.saving"
								type="switch"
								@update:model-value="toggleThisApp(cred, $event)">
								{{ t('nextcloud-vue', '{app} may use this credential', { app: appDisplayName }) }}
							</NcCheckboxRadioSwitch>
							<p v-if="otherApps(cred).length" class="cn-credentials__also muted">
								{{ t('nextcloud-vue', 'Also allowed for: {apps}', { apps: otherApps(cred).join(', ') }) }}
							</p>
						</div>

						<!-- Organisation: admin manages the full allowed-app list. -->
						<NcSelect v-else
							class="cn-credentials__item-apps"
							:options="appOptions"
							:model-value="cred.allowedApps"
							:multiple="true"
							:taggable="true"
							:close-on-select="false"
							:disabled="cred.saving"
							:input-label="t('nextcloud-vue', 'Allowed apps')"
							:placeholder="t('nextcloud-vue', 'No app may use this credential yet')"
							@update:model-value="onAllowedAppsChange(cred, $event)" />
					</li>
				</ul>
			</section>

			<!-- Add credential — inline wizard: pick a provider, then fill it in. -->
			<section class="cn-credentials__section">
				<NcButton v-if="!adding"
					variant="secondary"
					@click="startAdd">
					<template #icon>
						<Plus :size="20" />
					</template>
					{{ t('nextcloud-vue', 'Add credential') }}
				</NcButton>

				<div v-else class="cn-credentials__wizard">
					<!-- Step 1: provider icon grid -->
					<template v-if="wizardStep === 'provider'">
						<h4 class="cn-credentials__section-title">
							{{ t('nextcloud-vue', 'Which credential do you want to add?') }}
						</h4>
						<div class="cn-credentials__grid">
							<button v-for="p in providerGrid"
								:key="p.identifier"
								type="button"
								class="cn-credentials__grid-tile"
								@click="pickProvider(p.identifier)">
								<span class="cn-credentials__tile-dot cn-credentials__tile-dot--lg" :style="dotStyle(p.identifier)">{{ providerInitial(p.identifier) }}</span>
								<span class="cn-credentials__grid-title">{{ p.title }}</span>
							</button>
						</div>
						<div class="cn-credentials__wizard-actions">
							<NcButton variant="tertiary" @click="cancelAdd">
								{{ t('nextcloud-vue', 'Cancel') }}
							</NcButton>
						</div>
					</template>

					<!-- Step 2: provider-specific form + how-to -->
					<template v-else>
						<div class="cn-credentials__wizard-head">
							<NcButton variant="tertiary" @click="wizardStep = 'provider'">
								<template #icon>
									<ChevronLeft :size="20" />
								</template>
								{{ t('nextcloud-vue', 'Back') }}
							</NcButton>
							<span class="cn-credentials__tile-dot" :style="dotStyle(form.provider)">{{ providerInitial(form.provider) }}</span>
							<span class="cn-credentials__wizard-title">{{ providerTitle(form.provider) }}</span>
						</div>

						<NcNoteCard v-if="activeMeta.setupHelp" type="info" class="cn-credentials__howto">
							{{ activeMeta.setupHelp }}
							<a v-if="activeMeta.setupUrl"
								:href="activeMeta.setupUrl"
								target="_blank"
								rel="noopener noreferrer"
								class="cn-credentials__howto-link">
								{{ t('nextcloud-vue', 'Open {provider}', { provider: providerTitle(form.provider) }) }} ↗
							</a>
						</NcNoteCard>

						<form class="cn-credentials__form" @submit.prevent="onCreate">
							<NcTextField v-model="form.name"
								:label="t('nextcloud-vue', 'Name')"
								:helper-text="t('nextcloud-vue', 'A label to recognise this credential later.')"
								:disabled="saving"
								required />

							<NcTextField v-model="form.secret"
								type="password"
								:label="activeMeta.secretLabel || t('nextcloud-vue', 'Secret')"
								:helper-text="t('nextcloud-vue', 'Sent to OpenRegister and stored in Doriath. It is never shown again.')"
								:disabled="saving"
								autocomplete="new-password"
								required />

							<!-- Organisation add: admin also chooses the allowed apps up-front. -->
							<NcSelect v-if="scope === 'organisation'"
								:options="appOptions"
								:model-value="form.allowedApps"
								:multiple="true"
								:taggable="true"
								:close-on-select="false"
								:disabled="saving"
								:input-label="t('nextcloud-vue', 'Allowed apps')"
								:placeholder="t('nextcloud-vue', 'Choose which apps may use it')"
								@update:model-value="form.allowedApps = normaliseApps($event)" />
							<p v-else class="cn-credentials__muted cn-credentials__addnote">
								{{ t('nextcloud-vue', '{app} will be allowed to use this credential. You can change that afterwards.', { app: appDisplayName }) }}
							</p>

							<div class="cn-credentials__form-actions">
								<NcButton variant="tertiary" :disabled="saving" @click="cancelAdd">
									{{ t('nextcloud-vue', 'Cancel') }}
								</NcButton>
								<NcButton variant="primary"
									type="submit"
									:disabled="!canSubmit">
									{{ t('nextcloud-vue', 'Add credential') }}
								</NcButton>
							</div>
						</form>
					</template>
				</div>
			</section>
		</template>
	</div>
</template>

<script>
import { NcButton, NcCheckboxRadioSwitch, NcLoadingIcon, NcNoteCard, NcSelect, NcTextField } from '@nextcloud/vue'
import ChevronLeft from 'vue-material-design-icons/ChevronLeft.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import axios from '@nextcloud/axios'

const CREDENTIALS_PATH = '/apps/openregister/api/credentials'
const PROVIDERS_PATH = '/apps/openregister/api/credentials/providers'

/**
 * Hardcoded per-provider presentation. Keyed by the OpenRegister catalogue
 * identifier. `colour` drives the tile; `setupHelp`/`setupUrl` explain how to
 * obtain the secret; `secretLabel` names the field. Providers not listed here
 * still work — they render a neutral tile from their identifier.
 */
const PROVIDER_META = {
	github: {
		title: 'GitHub',
		colour: '#1f2328',
		setupUrl: 'https://github.com/settings/personal-access-tokens',
		setupHelp: 'Create a fine-grained personal access token with read-only access to the repositories or organisation this app should reach, then paste it below.',
		secretLabel: 'Personal access token',
	},
	gitlab: {
		title: 'GitLab',
		colour: '#fc6d26',
		setupUrl: 'https://gitlab.com/-/user_settings/personal_access_tokens',
		setupHelp: 'Create a personal access token with the read_api (and read_repository) scopes, then paste it below.',
		secretLabel: 'Personal access token',
	},
	doffin: {
		title: 'Doffin (Norway)',
		colour: '#00509e',
		setupUrl: 'https://dfo.no/anskaffelser/doffin',
		setupHelp: 'Request an APIM subscription key for the Doffin public procurement API, then paste it below.',
		secretLabel: 'Subscription key',
	},
}

export default {
	name: 'CnCredentials',

	components: {
		NcButton,
		NcCheckboxRadioSwitch,
		NcLoadingIcon,
		NcNoteCard,
		NcSelect,
		NcTextField,
		ChevronLeft,
		Plus,
	},

	props: {
		/**
		 * The consuming Nextcloud app id (e.g. "openbuild-spectr"). In personal
		 * scope this is the only app you can toggle in/out of a credential.
		 *
		 * @type {string}
		 */
		appId: {
			type: String,
			default: '',
		},
		/**
		 * A friendly app name for copy ("{app} may use this credential"). Falls
		 * back to the appId.
		 *
		 * @type {string}
		 */
		appName: {
			type: String,
			default: '',
		},
		/**
		 * The current app's manifest `credentials[]` declarations — the
		 * providers this app can reach through the broker. Shape:
		 * `[{ provider, reason, scopes }]`. Rendered read-only under the intro.
		 *
		 * @type {Array<object>}
		 */
		appCredentials: {
			type: Array,
			default: () => [],
		},
		/**
		 * Which credential set to manage: `"personal"` (the signed-in user's
		 * own; app-scoped toggle only) or `"organisation"` (org-wide; full
		 * allowed-app management, admin surface).
		 *
		 * @type {string}
		 */
		scope: {
			type: String,
			default: 'personal',
			validator: (v) => ['personal', 'organisation'].includes(v),
		},
		/**
		 * Optional link target explaining the Doriath vault. Defaults to the
		 * Doriath app route; pass '' to hide the link.
		 *
		 * @type {string}
		 */
		vaultUrl: {
			type: String,
			default: null,
		},
	},

	data() {
		return {
			loading: true,
			error: false,
			saving: false,
			credentials: [],
			providers: [],
			adding: false,
			wizardStep: 'provider',
			form: {
				name: '',
				provider: null,
				secret: '',
				allowedApps: [],
			},
		}
	},

	computed: {
		/**
		 * Friendly current-app label.
		 *
		 * @return {string} App display name.
		 */
		appDisplayName() {
			return this.appName || this.appId || t('nextcloud-vue', 'This app')
		},
		/**
		 * Reframed intro copy per scope.
		 *
		 * @return {string} Intro text.
		 */
		introText() {
			if (this.scope === 'organisation') {
				return t('nextcloud-vue', 'Organisation credentials let apps act on behalf of your organisation. The secret is stored in Doriath — Nextcloud\'s native credential vault — never in the app. You choose which apps may use each credential.')
			}
			return t('nextcloud-vue', 'Apps sometimes need to act on your behalf against an external service. So they never hold your secrets, you give a secret to Nextcloud once and it is kept in Doriath — a native, encrypted credential vault. Apps then make the call through Doriath and never see the secret. You decide which apps may use each credential — share one across apps, or keep one per app.')
		},
		/**
		 * Resolved Doriath link (explicit prop, or the app route by default).
		 *
		 * @return {string} URL or ''.
		 */
		resolvedVaultUrl() {
			if (this.vaultUrl === '') {
				return ''
			}
			return this.vaultUrl || generateUrl('/apps/doriath')
		},
		/**
		 * The provider tiles offered in the add-wizard grid: what the server
		 * actually offers when known (so we never offer a provider the broker
		 * can't honour), else the full hardcoded set.
		 *
		 * @return {Array<{identifier: string, title: string}>} Grid tiles.
		 */
		providerGrid() {
			const serverIds = this.providers.map((p) => p.identifier)
			let ids = serverIds.length ? serverIds : Object.keys(PROVIDER_META)
			// When the app declares which providers it uses (appCredentials),
			// only offer those — an app should not let you add a credential for
			// a provider it has no code path to use.
			if (this.supportedProviders.size > 0) {
				ids = ids.filter((id) => this.supportedProviders.has(id))
			}
			return ids.map((id) => ({ identifier: id, title: this.providerTitle(id) }))
		},
		/**
		 * Provider identifiers the app declares it uses, derived from
		 * `appCredentials`. Empty when the app declares nothing — filtering is
		 * then a no-op, so consumers that don't declare providers are unchanged.
		 *
		 * @return {Set<string>} Supported provider identifiers.
		 */
		supportedProviders() {
			return new Set((this.appCredentials || [])
				.map((r) => r && r.provider)
				.filter(Boolean))
		},
		/**
		 * Stored credentials to display — filtered to the app's supported
		 * providers when it declares any, so you can only see and authorise
		 * credentials the app can actually use; otherwise all of them.
		 *
		 * @return {Array<object>} Visible credentials.
		 */
		visibleCredentials() {
			if (this.supportedProviders.size === 0) {
				return this.credentials
			}
			return this.credentials.filter((c) => this.supportedProviders.has(c.provider))
		},
		/**
		 * The union of app ids the organisation allowed-apps picker offers.
		 *
		 * @return {Array<string>} Distinct app ids.
		 */
		appOptions() {
			const ids = new Set()
			if (this.appId) {
				ids.add(this.appId)
			}
			for (const cred of this.credentials) {
				for (const appId of (cred.allowedApps || [])) {
					if (appId) {
						ids.add(appId)
					}
				}
			}
			return Array.from(ids)
		},
		/**
		 * Presentation metadata for the provider currently being added.
		 *
		 * @return {object} Provider meta (may be a neutral fallback).
		 */
		activeMeta() {
			return PROVIDER_META[this.form.provider] || {}
		},
		/**
		 * Whether the add form can be submitted — name, provider and a secret
		 * are required (the whole point is to store a secret).
		 *
		 * @return {boolean} True when submittable.
		 */
		canSubmit() {
			return !this.saving
				&& this.form.name.trim() !== ''
				&& !!this.form.provider
				&& this.form.secret.trim() !== ''
		},
	},

	mounted() {
		this.load()
	},

	methods: {
		t,

		/**
		 * Load credentials (scoped) and the provider catalogue in parallel.
		 * Fails soft on a rejected request.
		 *
		 * @return {Promise<void>}
		 */
		async load() {
			this.loading = true
			this.error = false
			try {
				const [credsRes, provRes] = await Promise.all([
					axios.get(generateUrl(CREDENTIALS_PATH), { params: { scope: this.scope } }),
					axios.get(generateUrl(PROVIDERS_PATH)),
				])
				this.credentials = this.mapCredentials(credsRes?.data?.results)
				this.providers = Array.isArray(provRes?.data?.results) ? provRes.data.results : []
			} catch (e) {
				this.error = true
				this.credentials = []
				this.providers = []
			} finally {
				this.loading = false
			}
		},

		/**
		 * Normalise API credential objects into display rows with local state.
		 *
		 * @param {Array<object>} results Raw credential objects.
		 * @return {Array<object>} Display rows.
		 */
		mapCredentials(results) {
			if (!Array.isArray(results)) {
				return []
			}
			return results.map((c) => ({
				id: c.id,
				name: c.name || '',
				provider: c.provider || '',
				allowedApps: Array.isArray(c.allowedApps) ? c.allowedApps.slice() : [],
				saving: false,
				confirmingDelete: false,
			}))
		},

		/**
		 * Open the add-credential wizard at the provider grid.
		 *
		 * @return {void}
		 */
		startAdd() {
			this.resetForm()
			this.wizardStep = 'provider'
			this.adding = true
		},

		/**
		 * Cancel the wizard and reset.
		 *
		 * @return {void}
		 */
		cancelAdd() {
			this.adding = false
			this.resetForm()
		},

		/**
		 * Choose a provider in step 1 and advance to the form.
		 *
		 * @param {string} identifier The provider identifier.
		 * @return {void}
		 */
		pickProvider(identifier) {
			this.form.provider = identifier
			this.wizardStep = 'form'
		},

		/**
		 * Create a credential. Personal scope auto-adds the current app; org
		 * scope sends the admin-chosen allowed apps and the organisation scope.
		 *
		 * @return {Promise<void>}
		 */
		async onCreate() {
			if (!this.canSubmit) {
				return
			}
			this.saving = true
			try {
				const body = {
					name: this.form.name.trim(),
					provider: this.form.provider,
					secret: this.form.secret,
				}
				if (this.scope === 'organisation') {
					body.scope = 'organisation'
					body.allowedApps = this.form.allowedApps.length ? this.form.allowedApps : (this.appId ? [this.appId] : [])
				} else {
					body.allowedApps = this.appId ? [this.appId] : []
				}
				await axios.post(generateUrl(CREDENTIALS_PATH), body)
				this.cancelAdd()
				await this.load()
			} catch (e) {
				this.showError(t('nextcloud-vue', 'Could not save the credential'))
			} finally {
				this.saving = false
			}
		},

		/**
		 * Delete a credential (and its vault secret), then reload.
		 *
		 * @param {object} cred The credential row.
		 * @return {Promise<void>}
		 */
		async onDelete(cred) {
			cred.saving = true
			try {
				await axios.delete(generateUrl(`${CREDENTIALS_PATH}/${encodeURIComponent(cred.id)}`))
				await this.load()
			} catch (e) {
				this.showError(t('nextcloud-vue', 'Could not delete the credential'))
				cred.saving = false
				cred.confirmingDelete = false
			}
		},

		/**
		 * Whether the current app is allowed to use a credential.
		 *
		 * @param {object} cred The credential row.
		 * @return {boolean} True when appId is in allowedApps.
		 */
		appAllowed(cred) {
			return !!this.appId && (cred.allowedApps || []).includes(this.appId)
		},

		/**
		 * The apps other than the current one that may use a credential.
		 *
		 * @param {object} cred The credential row.
		 * @return {Array<string>} Other app ids.
		 */
		otherApps(cred) {
			return (cred.allowedApps || []).filter((a) => a && a !== this.appId)
		},

		/**
		 * Personal scope: add/remove ONLY the current app to/from a credential.
		 * Reverts on failure.
		 *
		 * @param {object}  cred    The credential row.
		 * @param {boolean} checked The switch's new state.
		 * @return {Promise<void>}
		 */
		async toggleThisApp(cred, checked) {
			if (!this.appId) {
				return
			}
			const previous = cred.allowedApps.slice()
			const set = new Set(previous)
			if (checked) {
				set.add(this.appId)
			} else {
				set.delete(this.appId)
			}
			const next = Array.from(set)
			cred.allowedApps = next
			cred.saving = true
			try {
				await axios.put(generateUrl(`${CREDENTIALS_PATH}/${encodeURIComponent(cred.id)}`), { allowedApps: next })
			} catch (e) {
				cred.allowedApps = previous
				this.showError(t('nextcloud-vue', 'Could not update the credential'))
			} finally {
				cred.saving = false
			}
		},

		/**
		 * Organisation scope: persist a full allowed-apps change via PUT.
		 * Reverts on failure.
		 *
		 * @param {object} cred    The credential row.
		 * @param {Array}  updated The picker's new selection.
		 * @return {Promise<void>}
		 */
		async onAllowedAppsChange(cred, updated) {
			const next = this.normaliseApps(updated)
			const previous = cred.allowedApps.slice()
			cred.allowedApps = next
			cred.saving = true
			try {
				await axios.put(generateUrl(`${CREDENTIALS_PATH}/${encodeURIComponent(cred.id)}`), { allowedApps: next })
			} catch (e) {
				cred.allowedApps = previous
				this.showError(t('nextcloud-vue', 'Could not update allowed apps'))
			} finally {
				cred.saving = false
			}
		},

		/**
		 * Human-readable provider title — hardcoded catalogue first, then the
		 * server title, then the raw identifier.
		 *
		 * @param {string} identifier The provider identifier.
		 * @return {string} A display title.
		 */
		providerTitle(identifier) {
			if (PROVIDER_META[identifier] && PROVIDER_META[identifier].title) {
				return PROVIDER_META[identifier].title
			}
			const match = this.providers.find((p) => p.identifier === identifier)
			return (match && match.title) || identifier || ''
		},

		/**
		 * A one-letter badge for a provider tile.
		 *
		 * @param {string} identifier The provider identifier.
		 * @return {string} An uppercase initial.
		 */
		providerInitial(identifier) {
			const title = this.providerTitle(identifier)
			return (title || '?').trim().charAt(0).toUpperCase() || '?'
		},

		/**
		 * Inline style for a provider tile dot (its brand colour, or neutral).
		 *
		 * @param {string} identifier The provider identifier.
		 * @return {object} A style binding.
		 */
		dotStyle(identifier) {
			const colour = (PROVIDER_META[identifier] && PROVIDER_META[identifier].colour) || 'var(--color-primary-element)'
			return { backgroundColor: colour }
		},

		/**
		 * Coerce an NcSelect multiple/taggable value into a string[] of app ids.
		 *
		 * @param {Array} value The picker value.
		 * @return {Array<string>} App ids.
		 */
		normaliseApps(value) {
			if (!Array.isArray(value)) {
				return []
			}
			return value.map((v) => (typeof v === 'string' ? v : (v && v.id) || '')).filter((v) => v !== '')
		},

		/**
		 * Reset the add-credential form.
		 *
		 * @return {void}
		 */
		resetForm() {
			this.form = { name: '', provider: null, secret: '', allowedApps: [] }
		},

		/**
		 * Surface an error toast (lazy-loaded like the rest of the lib).
		 *
		 * @param {string} message The message to show.
		 * @return {void}
		 */
		showError(message) {
			import('@nextcloud/dialogs').then(({ showError }) => showError(message))
		},
	},
}
</script>

<style scoped>
.cn-credentials__intro {
	margin-bottom: 16px;
	color: var(--color-text-maxcontrast);
}

.cn-credentials__vault-link,
.cn-credentials__howto-link {
	white-space: nowrap;
	color: var(--color-primary-element);
}

.cn-credentials__error {
	margin-bottom: 12px;
}

.cn-credentials__section {
	margin-bottom: 22px;
}

.cn-credentials__section-title {
	margin: 8px 0 8px;
	font-weight: bold;
}

.cn-credentials__muted,
.muted {
	color: var(--color-text-maxcontrast);
}

.cn-credentials__requests,
.cn-credentials__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-credentials__request {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 6px 0;
}

.cn-credentials__request-body {
	display: flex;
	flex-direction: column;
}

.cn-credentials__request-provider {
	font-weight: bold;
}

.cn-credentials__request-reason {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
}

/* Provider tile dot: a coloured badge with the provider's initial. */
.cn-credentials__tile-dot {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: 32px;
	height: 32px;
	border-radius: var(--border-radius-large, 8px);
	color: #fff;
	font-weight: bold;
	font-size: 0.95em;
	line-height: 1;
}

.cn-credentials__tile-dot--lg {
	width: 44px;
	height: 44px;
	font-size: 1.3em;
}

.cn-credentials__item {
	padding: 12px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-credentials__item-head {
	display: flex;
	align-items: center;
	gap: 10px;
}

.cn-credentials__item-meta {
	display: flex;
	flex-direction: column;
	flex-grow: 1;
	min-width: 0;
}

.cn-credentials__item-name {
	font-weight: bold;
}

.cn-credentials__item-provider {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
}

.cn-credentials__item-actions {
	display: flex;
	align-items: center;
	gap: 4px;
	flex-shrink: 0;
}

.cn-credentials__item-toggle {
	margin: 8px 0 0 42px;
}

.cn-credentials__also {
	margin: 4px 0 0;
	font-size: 0.9em;
}

.cn-credentials__item-apps {
	margin-top: 8px;
	width: 100%;
}

.cn-credentials__grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
	gap: 10px;
	margin-bottom: 12px;
}

.cn-credentials__grid-tile {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 16px 8px;
	background: var(--color-background-hover);
	border: 2px solid var(--color-border);
	border-radius: var(--border-radius-large, 8px);
	cursor: pointer;
}

.cn-credentials__grid-tile:hover,
.cn-credentials__grid-tile:focus-visible {
	border-color: var(--color-primary-element);
	background: var(--color-background-dark);
}

.cn-credentials__grid-title {
	font-weight: bold;
	text-align: center;
}

.cn-credentials__wizard-head {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-bottom: 12px;
}

.cn-credentials__wizard-title {
	font-weight: bold;
	font-size: 1.1em;
}

.cn-credentials__howto {
	margin-bottom: 12px;
}

.cn-credentials__form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-credentials__addnote {
	margin: 0;
	font-size: 0.9em;
}

.cn-credentials__form-actions,
.cn-credentials__wizard-actions {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
}
</style>
