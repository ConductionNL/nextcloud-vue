<template>
	<NcAppSettingsSection id="configuration-store" :name="t('nextcloud-vue', 'Configuration store')">
		<NcLoadingIcon v-if="loading" :size="24" />

		<NcNoteCard v-else-if="unavailable" type="info">
			{{ t('nextcloud-vue', 'The configuration store is provided by OpenRegister and could not be reached here.') }}
		</NcNoteCard>

		<div v-else class="cn-config-store">
			<p class="cn-config-store__intro">
				{{ t('nextcloud-vue', 'Publish and adopt shared configuration over GitHub. Choose which of your GitHub credentials the store should use — the store never assumes a credential you did not pick.') }}
			</p>

			<!-- Credential picker -->
			<div class="cn-config-store__block">
				<NcSelect v-if="githubCredentials.length"
					:options="githubCredentials"
					:value="selectedCredential"
					:clearable="true"
					:loading="savingCredential"
					label="name"
					:input-label="t('nextcloud-vue', 'GitHub credential for the store')"
					:placeholder="t('nextcloud-vue', 'Use no credential (anonymous browsing only)')"
					@input="onCredentialChange" />
				<NcNoteCard v-else type="warning">
					{{ t('nextcloud-vue', 'You have no GitHub credentials yet. Add one in the Credentials section above, then pick it here.') }}
				</NcNoteCard>
			</div>

			<!-- This instance's signing key, for others to trust -->
			<div v-if="publicKey" class="cn-config-store__block">
				<label class="cn-config-store__label">{{ t('nextcloud-vue', "This instance's signing key") }}</label>
				<div class="cn-config-store__key-row">
					<code class="cn-config-store__key">{{ publicKey }}</code>
					<NcButton variant="tertiary"
						:aria-label="t('nextcloud-vue', 'Copy signing key')"
						@click="copyKey">
						<template #icon>
							<ContentCopy :size="20" />
						</template>
					</NcButton>
				</div>
				<p class="cn-config-store__hint">
					{{ t('nextcloud-vue', 'Share this key with organisations that want to trust configuration you publish.') }}
				</p>
			</div>

			<!-- Browse the store by shareable type -->
			<div class="cn-config-store__block">
				<label class="cn-config-store__label">{{ t('nextcloud-vue', 'Browse the store') }}</label>
				<NcSelect v-if="types.length"
					:options="types"
					:value="selectedType"
					label="name"
					:input-label="t('nextcloud-vue', 'Configuration type')"
					:placeholder="t('nextcloud-vue', 'Pick a configuration type to browse')"
					@input="onTypeChange" />
				<NcNoteCard v-else type="info">
					{{ t('nextcloud-vue', 'No shareable configuration types are available yet.') }}
				</NcNoteCard>

				<NcLoadingIcon v-if="discovering" :size="20" class="cn-config-store__discovering" />

				<NcEmptyContent v-else-if="selectedType && discovered.length === 0"
					:name="t('nextcloud-vue', 'Nothing published yet')"
					:description="t('nextcloud-vue', 'No repositories were found for this configuration type.')">
					<template #icon>
						<PackageVariant :size="20" />
					</template>
				</NcEmptyContent>

				<ul v-else-if="discovered.length" class="cn-config-store__results">
					<li v-for="card in discovered" :key="card.repo" class="cn-config-store__card">
						<a :href="card.url"
							target="_blank"
							rel="noopener noreferrer"
							class="cn-config-store__card-title">
							{{ card.repo }}
						</a>
						<span class="cn-config-store__card-stars">★ {{ card.stars }}</span>
						<p v-if="card.description" class="cn-config-store__card-desc">
							{{ card.description }}
						</p>
					</li>
				</ul>
			</div>
		</div>
	</NcAppSettingsSection>
</template>

<script>
/**
 * CnConfigurationStore
 *
 * A self-contained `NcAppSettingsSection` for the federated configuration
 * store (OpenRegister). It does three things, all against OpenRegister's
 * `/api` surface, and fails soft (an info note) when OpenRegister is absent:
 *
 *  1. **Store credential** — lets the user choose WHICH of their GitHub
 *     credentials the store uses to publish and to browse, persisted to the
 *     `federated-config-credential` user preference. The store never assumes
 *     the user's only/first GitHub key is the one they meant to use.
 *  2. **Signing key** — shows this instance's Ed25519 signing public key so
 *     the operator can hand it to organisations that want to trust the
 *     configuration they publish.
 *  3. **Browse** — pick a shareable type and discover published bundles on
 *     GitHub by that type's topic.
 *
 * Endpoints used:
 *   GET  /apps/openregister/api/credentials?scope=personal      → { results: [{ id, name, provider, ... }] }
 *   GET  /apps/openregister/api/preferences/federated-config-credential  → { value }
 *   PUT  /apps/openregister/api/preferences/federated-config-credential  → { value }
 *   GET  /apps/openregister/api/federated-config/types          → { types: [{ id, name, topic }] }
 *   GET  /apps/openregister/api/federated-config/discover?topic → { results: [{ repo, url, stars, description }] }
 *   GET  /apps/openregister/api/federated-config/public-key     → { publicKey }
 *
 * Designed to render inside CnAppRoot's `#user-settings` slot, next to the
 * credential-broker pane.
 */
import { NcAppSettingsSection, NcButton, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcSelect } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { showError, showSuccess } from '@nextcloud/dialogs'
import axios from '@nextcloud/axios'
import ContentCopy from 'vue-material-design-icons/ContentCopy.vue'
import PackageVariant from 'vue-material-design-icons/PackageVariant.vue'

const API = '/apps/openregister/api'
const CREDENTIAL_PREF = 'federated-config-credential'

export default {
	name: 'CnConfigurationStore',
	components: {
		NcAppSettingsSection,
		NcButton,
		NcEmptyContent,
		NcLoadingIcon,
		NcNoteCard,
		NcSelect,
		ContentCopy,
		PackageVariant,
	},
	data() {
		return {
			loading: true,
			unavailable: false,
			savingCredential: false,
			discovering: false,
			githubCredentials: [],
			selectedCredential: null,
			types: [],
			selectedType: null,
			discovered: [],
			publicKey: '',
		}
	},
	mounted() {
		this.load()
	},
	methods: {
		t,

		/**
		 * Load the user's GitHub credentials, their current choice, the
		 * shareable types, and the instance signing key. Fails soft to the
		 * "unavailable" note when OpenRegister cannot be reached.
		 *
		 * @return {Promise<void>}
		 */
		async load() {
			this.loading = true
			this.unavailable = false
			try {
				const [credsResp, prefResp, typesResp, keyResp] = await Promise.all([
					axios.get(generateUrl(`${API}/credentials?scope=personal`)),
					axios.get(generateUrl(`${API}/preferences/${CREDENTIAL_PREF}`)),
					axios.get(generateUrl(`${API}/federated-config/types`)),
					axios.get(generateUrl(`${API}/federated-config/public-key`)).catch(() => ({ data: {} })),
				])

				const creds = Array.isArray(credsResp.data?.results) ? credsResp.data.results : []
				this.githubCredentials = creds.filter((c) => c.provider === 'github')

				const chosenId = prefResp.data?.value || ''
				this.selectedCredential = this.githubCredentials.find((c) => c.id === chosenId) || null

				this.types = Array.isArray(typesResp.data?.types) ? typesResp.data.types : []
				this.publicKey = keyResp.data?.publicKey || ''
			} catch (e) {
				this.unavailable = true
			} finally {
				this.loading = false
			}
		},

		/**
		 * Persist the chosen store credential (or clear it).
		 *
		 * @param {object|null} credential The selected credential, or null when cleared.
		 * @return {Promise<void>}
		 */
		async onCredentialChange(credential) {
			const previous = this.selectedCredential
			this.selectedCredential = credential
			this.savingCredential = true
			try {
				await axios.put(generateUrl(`${API}/preferences/${CREDENTIAL_PREF}`), { value: credential?.id || '' })
				showSuccess(t('nextcloud-vue', 'Store credential saved'))
			} catch (e) {
				this.selectedCredential = previous
				showError(t('nextcloud-vue', 'Could not save the store credential'))
			} finally {
				this.savingCredential = false
			}
		},

		/**
		 * Discover published bundles for the picked shareable type.
		 *
		 * @param {object|null} type The selected type (carries a `topic`), or null.
		 * @return {Promise<void>}
		 */
		async onTypeChange(type) {
			this.selectedType = type
			this.discovered = []
			if (!type?.topic) {
				return
			}
			this.discovering = true
			try {
				const { data } = await axios.get(generateUrl(`${API}/federated-config/discover?topic=${encodeURIComponent(type.topic)}`))
				this.discovered = Array.isArray(data?.results) ? data.results : []
			} catch (e) {
				showError(t('nextcloud-vue', 'Could not browse the store'))
			} finally {
				this.discovering = false
			}
		},

		/**
		 * Copy the instance signing key to the clipboard.
		 *
		 * @return {Promise<void>}
		 */
		async copyKey() {
			try {
				await navigator.clipboard.writeText(this.publicKey)
				showSuccess(t('nextcloud-vue', 'Signing key copied'))
			} catch (e) {
				showError(t('nextcloud-vue', 'Could not copy the signing key'))
			}
		},
	},
}
</script>

<style scoped>
.cn-config-store {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.cn-config-store__intro {
	color: var(--color-text-maxcontrast);
}

.cn-config-store__block {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-config-store__label {
	font-weight: 600;
}

.cn-config-store__key-row {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-config-store__key {
	overflow-x: auto;
	padding: 6px 10px;
	border-radius: var(--border-radius);
	background-color: var(--color-background-dark);
	font-family: monospace;
}

.cn-config-store__hint {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
}

.cn-config-store__results {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin-top: 8px;
}

.cn-config-store__card {
	padding: 10px 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
}

.cn-config-store__card-title {
	font-weight: 600;
}

.cn-config-store__card-stars {
	margin-inline-start: 8px;
	color: var(--color-text-maxcontrast);
}

.cn-config-store__card-desc {
	margin-top: 4px;
	color: var(--color-text-maxcontrast);
}

.cn-config-store__discovering {
	margin-top: 8px;
}
</style>
