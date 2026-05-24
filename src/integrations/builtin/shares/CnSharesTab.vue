<!--
  CnSharesTab — bespoke sidebar tab for the `shares` integration.

  Replaces the generic CnIntegrationTab for the `shares` leaf: renders
  a recipient list grouped by share type (user / group / public link
  / federated), with per-row permissions, expiry date, a
  password-protected indicator, and a "manage in Files" deep-link.
  Talks to the same OpenRegister pluggable-integration sub-resource
    `/api/objects/{register}/{schema}/{objectId}/integrations/shares`
  served by `OCA\OpenRegister\Service\Integration\Providers\SharesProvider`
  (which walks linked files and calls `OCP\Share\IManager::getSharesBy()`
  per file).

  Surface behaviour:
    - Empty state with "Open Files" CTA when no shares exist.
    - Loading + 503 "currently unavailable" + generic error states match
      CnIntegrationTab's behaviour for AD-23 graceful degradation.

  Bespoke-vs-generic rationale: the generic tab renders a flat link list
  which loses Shares' four primary signals — recipient, permissions,
  expiry, password-protection — that case handlers need to triage "who
  has access to this case and how?" at a glance.

  See `openregister/openspec/changes/integration-shares/` for the spec
  delta and ADR-019 (registry mechanism).
-->
<template>
	<div class="cn-sidebar-tab cn-shares-tab">
		<div v-if="degraded" class="cn-shares-tab__banner" role="alert">
			<AlertCircleOutline :size="18" />
			<span>{{ degraded }}</span>
		</div>

		<NcLoadingIcon v-if="loading" />
		<div v-else-if="error" class="cn-shares-tab__error" role="alert">
			{{ error }}
		</div>
		<div v-else-if="shares.length === 0" class="cn-sidebar-tab__empty cn-shares-tab__empty">
			<Share :size="32" class="cn-shares-tab__empty-icon" />
			<p>{{ emptyLabel }}</p>
			<NcButton type="primary" @click="openFilesApp">
				<template #icon>
					<FolderOutline :size="20" />
				</template>
				{{ openFilesLabel }}
			</NcButton>
		</div>
		<div v-else class="cn-shares-tab__groups">
			<section
				v-for="group in groupedShares"
				:key="group.key"
				class="cn-shares-tab__group">
				<header class="cn-shares-tab__group-header">
					<component :is="group.icon" :size="18" />
					<span class="cn-shares-tab__group-label">{{ group.label }}</span>
					<span class="cn-shares-tab__group-count">{{ group.rows.length }}</span>
				</header>
				<ul class="cn-shares-tab__list">
					<li
						v-for="share in group.rows"
						:key="shareKey(share)"
						class="cn-shares-tab__row">
						<div class="cn-shares-tab__row-icon">
							<component :is="group.icon" :size="20" />
						</div>
						<div class="cn-shares-tab__row-main">
							<span class="cn-shares-tab__title">
								{{ shareTarget(share) }}
							</span>
							<span class="cn-shares-tab__permissions">
								{{ permissionLabel(share) }}
							</span>
							<span v-if="shareExpiry(share)" class="cn-shares-tab__expiry">
								{{ expiryLabel }}: {{ shareExpiry(share) }}
							</span>
						</div>
						<div class="cn-shares-tab__row-flags">
							<LockOutline
								v-if="isPasswordProtected(share)"
								:size="16"
								:title="passwordProtectedLabel"
								:aria-label="passwordProtectedLabel" />
							<NcButton
								v-if="canRevoke(share)"
								type="tertiary"
								:aria-label="revokeLabel"
								@click="revoke(share)">
								<template #icon>
									<CloseCircleOutline :size="16" />
								</template>
							</NcButton>
							<span
								v-else
								class="cn-shares-tab__revoke-disabled"
								:title="revokeDisabledLabel">
								<CloseCircleOutline :size="16" />
							</span>
						</div>
					</li>
				</ul>
			</section>
			<div class="cn-shares-tab__footer">
				<NcButton type="tertiary" @click="openFilesApp">
					<template #icon>
						<FolderOutline :size="18" />
					</template>
					{{ openFilesLabel }}
				</NcButton>
			</div>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import AccountOutline from 'vue-material-design-icons/AccountOutline.vue'
import AccountGroupOutline from 'vue-material-design-icons/AccountGroupOutline.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import Earth from 'vue-material-design-icons/Earth.vue'
import LockOutline from 'vue-material-design-icons/LockOutline.vue'
import CloseCircleOutline from 'vue-material-design-icons/CloseCircleOutline.vue'
import FolderOutline from 'vue-material-design-icons/FolderOutline.vue'
import Share from 'vue-material-design-icons/Share.vue'
import { buildHeaders } from '../../../utils/index.js'

// NC core share-type constants (OCP\Share\IShare::TYPE_*).
const SHARE_TYPE_USER = 0
const SHARE_TYPE_GROUP = 1
const SHARE_TYPE_LINK = 3
const SHARE_TYPE_REMOTE = 6
const SHARE_TYPE_REMOTE_GROUP = 9

// Permission bitmask (OCP\Constants::PERMISSION_*).
const PERMISSION_READ = 1
const PERMISSION_UPDATE = 2
const PERMISSION_CREATE = 4
const PERMISSION_DELETE = 8
const PERMISSION_SHARE = 16

/**
 * CnSharesTab — bespoke recipient list for the `shares` integration.
 *
 * Renders shares grouped by type with permissions, expiry, password-
 * protected flag, and a revoke action. Reads from the OR
 * pluggable-integration endpoint and delegates revoke back to the same
 * endpoint via DELETE.
 */
export default {
	name: 'CnSharesTab',

	components: {
		NcButton,
		NcLoadingIcon,
		AlertCircleOutline,
		AccountOutline,
		AccountGroupOutline,
		LinkVariant,
		Earth,
		LockOutline,
		CloseCircleOutline,
		FolderOutline,
		Share,
	},

	props: {
		/** Stable integration id (forwarded from the registry — always `'shares'`). */
		integrationId: { type: String, default: 'shares' },
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, default: '' },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, default: '' },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No shares on this object yet') },
		/** Pre-translated label for the "Open Files" CTA. */
		openFilesLabel: { type: String, default: () => t('nextcloud-vue', 'Manage in Files') },
		/** Pre-translated banner when the share subsystem is unavailable. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC sharing is currently unavailable.') },
		/** Pre-translated revoke button label. */
		revokeLabel: { type: String, default: () => t('nextcloud-vue', 'Revoke share') },
		/** Pre-translated tooltip shown when the current user cannot revoke. */
		revokeDisabledLabel: { type: String, default: () => t('nextcloud-vue', 'Only the share owner can revoke') },
		/** Pre-translated label for the password-protected indicator. */
		passwordProtectedLabel: { type: String, default: () => t('nextcloud-vue', 'Password protected') },
		/** Pre-translated label for the expiry row. */
		expiryLabel: { type: String, default: () => t('nextcloud-vue', 'Expires') },
		/** URL of the NC Files app entry. */
		filesAppUrl: { type: String, default: '/index.php/apps/files' },
	},

	data() {
		return {
			shares: [],
			loading: false,
			error: '',
			degraded: '',
		}
	},

	computed: {
		groupedShares() {
			const groups = [
				{ key: 'user', label: t('nextcloud-vue', 'Users'), icon: 'AccountOutline', match: (s) => this.shareType(s) === SHARE_TYPE_USER },
				{ key: 'group', label: t('nextcloud-vue', 'Groups'), icon: 'AccountGroupOutline', match: (s) => this.shareType(s) === SHARE_TYPE_GROUP },
				{ key: 'link', label: t('nextcloud-vue', 'Public links'), icon: 'LinkVariant', match: (s) => this.shareType(s) === SHARE_TYPE_LINK },
				{ key: 'federated', label: t('nextcloud-vue', 'Federated'), icon: 'Earth', match: (s) => this.shareType(s) === SHARE_TYPE_REMOTE || this.shareType(s) === SHARE_TYPE_REMOTE_GROUP },
			]
			return groups
				.map((g) => ({ ...g, rows: this.shares.filter(g.match) }))
				.filter((g) => g.rows.length > 0)
		},
	},

	watch: {
		objectId: { immediate: true, handler(id) { if (id) { this.fetchShares() } } },
		register() { this.fetchShares() },
		schema() { this.fetchShares() },
	},

	methods: {
		baseUrl() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/integrations/${this.integrationId}`
		},

		shareKey(share) {
			return share.id ?? share.shareId ?? share.token ?? ''
		},

		shareType(share) {
			const value = share.shareType ?? share.share_type ?? share.type
			return Number.isFinite(Number(value)) ? Number(value) : -1
		},

		shareTarget(share) {
			const type = this.shareType(share)
			if (type === SHARE_TYPE_LINK) {
				return share.shareWithDisplayname || share.token || t('nextcloud-vue', 'Public link')
			}
			return share.shareWithDisplayname || share.shareWith || share.share_with || share.targetDisplayName || ''
		},

		permissionLabel(share) {
			const perms = Number(share.permissions ?? share.permission ?? 0)
			const parts = []
			if ((perms & PERMISSION_READ) === PERMISSION_READ) {
				parts.push(t('nextcloud-vue', 'read'))
			}
			if ((perms & PERMISSION_UPDATE) === PERMISSION_UPDATE
				|| (perms & PERMISSION_CREATE) === PERMISSION_CREATE
				|| (perms & PERMISSION_DELETE) === PERMISSION_DELETE) {
				parts.push(t('nextcloud-vue', 'write'))
			}
			if ((perms & PERMISSION_SHARE) === PERMISSION_SHARE) {
				parts.push(t('nextcloud-vue', 'share'))
			}
			return parts.length > 0 ? parts.join(' · ') : t('nextcloud-vue', 'no permissions')
		},

		shareExpiry(share) {
			const value = share.expiration ?? share.expirationDate ?? share.expiry ?? null
			if (!value) {
				return ''
			}
			try {
				const date = new Date(value)
				if (Number.isNaN(date.getTime())) {
					return ''
				}
				return date.toLocaleDateString(undefined, { dateStyle: 'medium' })
			} catch (e) {
				return ''
			}
		},

		isPasswordProtected(share) {
			return Boolean(share.passwordProtected ?? share.hasPassword ?? share.password)
		},

		canRevoke(share) {
			// The current-user-can-revoke flag is provider-supplied. When
			// absent we default to true so the action stays usable; the
			// backend rejects unauthorized revoke attempts.
			return share.canRevoke !== false
		},

		openFilesApp() {
			if (typeof window !== 'undefined') {
				window.open(this.filesAppUrl, '_blank', 'noopener')
			}
		},

		async fetchShares() {
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			this.loading = true
			this.error = ''
			this.degraded = ''
			try {
				const response = await fetch(this.baseUrl(), { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					const rows = data.results || data.items || (Array.isArray(data) ? data : []) || []
					this.shares = rows
				} else if (response.status === 503) {
					this.shares = []
					this.degraded = this.unavailableLabel
				} else {
					this.shares = []
					this.error = t('nextcloud-vue', 'Could not load shares.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnSharesTab] failed to fetch shares', err)
				this.shares = []
				this.error = t('nextcloud-vue', 'Could not load shares.')
			} finally {
				this.loading = false
			}
		},

		async revoke(share) {
			const id = this.shareKey(share)
			if (!id) {
				return
			}
			try {
				const response = await fetch(`${this.baseUrl()}/${encodeURIComponent(id)}`, {
					method: 'DELETE',
					headers: buildHeaders(),
				})
				if (response.ok) {
					this.shares = this.shares.filter((row) => this.shareKey(row) !== id)
					this.$emit('share-revoked', { id, share })
				} else {
					this.error = t('nextcloud-vue', 'Could not revoke share.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnSharesTab] failed to revoke share', err)
				this.error = t('nextcloud-vue', 'Could not revoke share.')
			}
		},
	},
}
</script>

<style scoped>
.cn-shares-tab__banner {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 10px;
	margin-bottom: 10px;
	border-radius: var(--border-radius);
	background: var(--color-warning, #e9a40f);
	color: var(--color-main-background);
	font-size: 0.9em;
}

.cn-shares-tab__error {
	color: var(--color-error);
	font-size: 0.9em;
	margin: 4px 0 8px;
}

.cn-shares-tab__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 16px 8px;
	color: var(--color-text-maxcontrast);
	text-align: center;
}

.cn-shares-tab__empty-icon {
	color: var(--color-text-maxcontrast);
}

.cn-shares-tab__group {
	margin-bottom: 12px;
}

.cn-shares-tab__group-header {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 4px 0;
	font-size: 0.85em;
	font-weight: 600;
	color: var(--color-text-maxcontrast);
	border-bottom: 1px solid var(--color-border);
}

.cn-shares-tab__group-label {
	flex: 1;
}

.cn-shares-tab__group-count {
	font-weight: normal;
	font-size: 0.85em;
	padding: 1px 6px;
	border-radius: 9px;
	background: var(--color-background-hover);
}

.cn-shares-tab__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-shares-tab__row {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 8px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-shares-tab__row:last-child {
	border-bottom: none;
}

.cn-shares-tab__row-icon {
	flex-shrink: 0;
	color: var(--color-text-maxcontrast);
}

.cn-shares-tab__row-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-shares-tab__title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
	font-weight: 500;
}

.cn-shares-tab__permissions {
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
}

.cn-shares-tab__expiry {
	font-size: 0.75em;
	color: var(--color-text-maxcontrast);
}

.cn-shares-tab__row-flags {
	display: flex;
	align-items: center;
	gap: 4px;
	color: var(--color-text-maxcontrast);
}

.cn-shares-tab__revoke-disabled {
	opacity: 0.4;
	cursor: not-allowed;
	display: inline-flex;
}

.cn-shares-tab__footer {
	margin-top: 12px;
	display: flex;
	justify-content: flex-end;
}
</style>
