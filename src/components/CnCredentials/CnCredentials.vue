<!--
  - SPDX-License-Identifier: EUPL-1.2
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  -
  - CnCredentials — self-contained settings pane that lets the signed-in
  - user manage the credentials the OpenRegister credential broker holds
  - on their behalf. The user hands a secret to OpenRegister once; apps
  - then make outbound calls THROUGH OpenRegister without ever seeing the
  - secret. This component is the browser surface over OR's credential API.
  -
  - It talks to OpenRegister's credential endpoints (metadata only — a
  - secret is write-only and is NEVER returned or displayed):
  -
  -   GET    /apps/openregister/api/credentials
  -            → { results: [{ '@self': { owner, ... }, id, name,
  -                            provider, allowedApps[], createdAt }] }
  -   GET    /apps/openregister/api/credentials/providers
  -            → { results: [{ identifier, title }] }
  -   POST   /apps/openregister/api/credentials
  -            body { name, provider, allowedApps?, secret? }
  -   PUT    /apps/openregister/api/credentials/{id}
  -            body { name?, allowedApps?, secret? }
  -   DELETE /apps/openregister/api/credentials/{id}
  -
  - Designed to render inside CnAppRoot's `#user-settings` slot, wrapped in
  - an `NcAppSettingsSection`. It is host-agnostic: pass the current app id
  - and the app's manifest `credentials[]` declarations so the pane can
  - explain which providers this app can reach through the broker.
  -
  - Fails soft: an empty `appCredentials` prop, or a 404 from the OR
  - endpoints (broker not installed), degrades to an empty list plus a
  - friendly note rather than crashing.
  -->
<template>
	<div class="cn-credentials">
		<p class="cn-credentials__intro">
			{{ t('nextcloud-vue', 'Give a secret to OpenRegister once. Apps then make calls on your behalf through OpenRegister — they never receive the secret itself.') }}
		</p>

		<NcLoadingIcon v-if="loading" :size="24" />

		<template v-else>
			<NcNoteCard v-if="error"
				type="warning"
				class="cn-credentials__error">
				{{ t('nextcloud-vue', 'Credentials are provided by OpenRegister and could not be loaded here.') }}
			</NcNoteCard>

			<!-- Apps requesting credentials (informational) -->
			<section class="cn-credentials__section">
				<h4 class="cn-credentials__section-title">
					{{ t('nextcloud-vue', 'Apps requesting credentials') }}
				</h4>
				<p v-if="appCredentials.length === 0" class="cn-credentials__muted">
					{{ t('nextcloud-vue', 'This app does not request any credentials.') }}
				</p>
				<ul v-else class="cn-credentials__requests">
					<li v-for="(req, index) in appCredentials"
						:key="`req-${index}`"
						class="cn-credentials__request">
						<span class="cn-credentials__request-provider">{{ providerTitle(req.provider) }}</span>
						<span v-if="req.reason" class="cn-credentials__request-reason"> — {{ req.reason }}</span>
					</li>
				</ul>
			</section>

			<!-- Your credentials -->
			<section class="cn-credentials__section">
				<h4 class="cn-credentials__section-title">
					{{ t('nextcloud-vue', 'Your credentials') }}
				</h4>
				<p v-if="credentials.length === 0" class="cn-credentials__muted">
					{{ t('nextcloud-vue', 'You have not stored any credentials yet.') }}
				</p>
				<ul v-else class="cn-credentials__list">
					<li v-for="cred in credentials"
						:key="cred.id"
						class="cn-credentials__item">
						<div class="cn-credentials__item-head">
							<div class="cn-credentials__item-meta">
								<span class="cn-credentials__item-name">{{ cred.name }}</span>
								<span class="cn-credentials__item-provider">{{ providerTitle(cred.provider) }}</span>
							</div>
							<div class="cn-credentials__item-actions">
								<NcButton variant="tertiary"
									:disabled="cred.saving"
									@click="onDuplicate(cred)">
									{{ t('nextcloud-vue', 'Duplicate') }}
								</NcButton>
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
						<NcSelect class="cn-credentials__item-apps"
							:options="appOptions"
							:value="cred.allowedApps"
							:multiple="true"
							:taggable="true"
							:close-on-select="false"
							:disabled="cred.saving"
							:input-label="t('nextcloud-vue', 'Allowed apps')"
							:placeholder="t('nextcloud-vue', 'Every app may use this credential')"
							@input="onAllowedAppsChange(cred, $event)" />
					</li>
				</ul>
			</section>

			<!-- Add credential -->
			<section class="cn-credentials__section">
				<h4 class="cn-credentials__section-title">
					{{ t('nextcloud-vue', 'Add credential') }}
				</h4>
				<form class="cn-credentials__form" @submit.prevent="onCreate">
					<NcTextField v-model="form.name"
						:label="t('nextcloud-vue', 'Name')"
						:input-label="t('nextcloud-vue', 'Name')"
						:disabled="saving"
						required />

					<NcSelect :options="providerOptions"
						:value="form.provider"
						:disabled="saving"
						:input-label="t('nextcloud-vue', 'Provider')"
						:placeholder="t('nextcloud-vue', 'Select a provider')"
						@input="form.provider = $event" />

					<NcTextField v-model="form.secret"
						type="password"
						:label="t('nextcloud-vue', 'Secret')"
						:input-label="t('nextcloud-vue', 'Secret')"
						:helper-text="t('nextcloud-vue', 'The secret is sent to OpenRegister and never shown again.')"
						:disabled="saving"
						autocomplete="new-password" />

					<NcSelect :options="appOptions"
						:value="form.allowedApps"
						:multiple="true"
						:taggable="true"
						:close-on-select="false"
						:disabled="saving"
						:input-label="t('nextcloud-vue', 'Allowed apps')"
						:placeholder="t('nextcloud-vue', 'Every app may use this credential')"
						@input="form.allowedApps = normaliseApps($event)" />

					<div class="cn-credentials__form-actions">
						<NcButton variant="primary"
							native-type="submit"
							:disabled="!canSubmit">
							{{ t('nextcloud-vue', 'Add credential') }}
						</NcButton>
					</div>
				</form>
			</section>
		</template>
	</div>
</template>

<script>
import { NcButton, NcLoadingIcon, NcNoteCard, NcSelect, NcTextField } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import axios from '@nextcloud/axios'

const CREDENTIALS_PATH = '/apps/openregister/api/credentials'
const PROVIDERS_PATH = '/apps/openregister/api/credentials/providers'

export default {
	name: 'CnCredentials',

	components: {
		NcButton,
		NcLoadingIcon,
		NcNoteCard,
		NcSelect,
		NcTextField,
	},

	props: {
		/**
		 * The consuming Nextcloud app id (e.g. "pipelinq"). Seeds the
		 * allowed-apps picker and lets the pane stay host-agnostic.
		 *
		 * @type {string}
		 */
		appId: {
			type: String,
			default: '',
		},
		/**
		 * The current app's manifest `credentials[]` declarations — the
		 * providers this app wants to reach through the broker. Shape:
		 * `[{ provider, reason, scopes }]`. Rendered read-only in the
		 * "Apps requesting credentials" section. Defaults to an empty
		 * array so the pane renders an empty state rather than crashing.
		 *
		 * @type {Array<object>}
		 */
		appCredentials: {
			type: Array,
			default: () => [],
		},
	},

	data() {
		return {
			loading: true,
			error: false,
			saving: false,
			credentials: [],
			providers: [],
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
		 * Provider catalogue mapped to `NcSelect` option objects.
		 *
		 * @return {Array<{id: string, label: string}>} Picker options.
		 */
		providerOptions() {
			return this.providers.map((p) => ({
				id: p.identifier,
				label: p.title || p.identifier,
			}))
		},
		/**
		 * The union of app ids the allowed-apps pickers offer: the current
		 * app id plus any app id already referenced by a stored credential.
		 * Free-text entry (taggable) covers anything not yet seen.
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
		 * Whether the add-credential form can be submitted — a name and a
		 * provider are the minimum; the secret stays optional (rotate later).
		 *
		 * @return {boolean} True when the form is submittable.
		 */
		canSubmit() {
			return !this.saving && this.form.name.trim() !== '' && !!this.selectedProvider
		},
		/**
		 * The selected provider identifier from the add-form, or ''.
		 *
		 * @return {string} Provider identifier.
		 */
		selectedProvider() {
			return this.optionId(this.form.provider)
		},
	},

	mounted() {
		this.load()
	},

	methods: {
		t,

		/**
		 * Load the caller's credentials and the provider catalogue in
		 * parallel. Fails soft: a rejected request (e.g. the broker is not
		 * installed, 404) leaves both lists empty and flags a friendly note.
		 *
		 * @return {Promise<void>}
		 */
		async load() {
			this.loading = true
			this.error = false
			try {
				const [credsRes, provRes] = await Promise.all([
					axios.get(generateUrl(CREDENTIALS_PATH)),
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
		 * Normalise the credential list from the API into rows with local
		 * UI state (`saving`, `confirmingDelete`).
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
		 * Create a new credential from the add-form, then reload + reset.
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
					provider: this.selectedProvider,
					allowedApps: this.form.allowedApps,
				}
				if (this.form.secret !== '') {
					body.secret = this.form.secret
				}
				await axios.post(generateUrl(CREDENTIALS_PATH), body)
				this.resetForm()
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
		 * Prefill the add-form from an existing credential — name, provider
		 * and allowed apps carry over; the secret stays blank (write-only).
		 *
		 * @param {object} cred The credential to duplicate.
		 * @return {void}
		 */
		onDuplicate(cred) {
			const providerOption = this.providerOptions.find((o) => o.id === cred.provider)
			this.form = {
				name: cred.name ? `${cred.name} (copy)` : '',
				provider: providerOption || (cred.provider ? { id: cred.provider, label: cred.provider } : null),
				secret: '',
				allowedApps: (cred.allowedApps || []).slice(),
			}
		},

		/**
		 * Persist an allowed-apps change for a stored credential via PUT.
		 * Reverts the row on failure.
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
				await axios.put(generateUrl(`${CREDENTIALS_PATH}/${encodeURIComponent(cred.id)}`), {
					allowedApps: next,
				})
			} catch (e) {
				cred.allowedApps = previous
				this.showError(t('nextcloud-vue', 'Could not update allowed apps'))
			} finally {
				cred.saving = false
			}
		},

		/**
		 * Human-readable provider title for an identifier, falling back to
		 * the raw identifier when the catalogue has no match.
		 *
		 * @param {string} identifier The provider identifier.
		 * @return {string} A display title.
		 */
		providerTitle(identifier) {
			const match = this.providers.find((p) => p.identifier === identifier)
			return (match && match.title) || identifier || ''
		},

		/**
		 * Coerce an `NcSelect` multiple/taggable value into a plain string[]
		 * of app ids (options are objects, taggable free-text is a string).
		 *
		 * @param {Array} value The picker value.
		 * @return {Array<string>} App ids.
		 */
		normaliseApps(value) {
			if (!Array.isArray(value)) {
				return []
			}
			return value.map((v) => this.optionId(v)).filter((v) => v !== '')
		},

		/**
		 * Extract the id from an `NcSelect` value (option object or string).
		 *
		 * @param {object|string|null} value The picker value.
		 * @return {string} The id, or '' when empty.
		 */
		optionId(value) {
			if (!value) {
				return ''
			}
			return typeof value === 'string' ? value : (value.id || '')
		},

		/**
		 * Reset the add-credential form to its empty state.
		 *
		 * @return {void}
		 */
		resetForm() {
			this.form = {
				name: '',
				provider: null,
				secret: '',
				allowedApps: [],
			}
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
	margin-bottom: 12px;
	color: var(--color-text-maxcontrast);
}

.cn-credentials__error {
	margin-bottom: 12px;
}

.cn-credentials__section {
	margin-bottom: 20px;
}

.cn-credentials__section-title {
	margin: 8px 0 6px;
	font-weight: bold;
}

.cn-credentials__muted {
	color: var(--color-text-maxcontrast);
}

.cn-credentials__requests,
.cn-credentials__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-credentials__request {
	padding: 2px 0;
}

.cn-credentials__request-provider {
	font-weight: bold;
}

.cn-credentials__item {
	padding: 10px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-credentials__item-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 8px;
}

.cn-credentials__item-meta {
	display: flex;
	flex-direction: column;
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

.cn-credentials__item-apps {
	margin-top: 8px;
	width: 100%;
}

.cn-credentials__form {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.cn-credentials__form-actions {
	display: flex;
	justify-content: flex-end;
}
</style>
