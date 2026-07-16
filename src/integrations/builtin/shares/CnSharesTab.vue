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

		<div class="cn-shares-tab__toolbar">
			<NcButton variant="primary" data-testid="cn-shares-tab-share-file" @click="openCreateDialog">
				<template #icon>
					<Plus :size="20" />
				</template>
				{{ shareFileLabel }}
			</NcButton>
		</div>

		<NcLoadingIcon v-if="loading" />
		<div v-else-if="error" class="cn-shares-tab__error" role="alert">
			{{ error }}
		</div>
		<div v-else-if="shares.length === 0" class="cn-sidebar-tab__empty cn-shares-tab__empty">
			<Share :size="32" class="cn-shares-tab__empty-icon" />
			<p>{{ emptyLabel }}</p>
			<NcButton variant="primary" @click="openFilesApp">
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
					<NcListItem
						v-for="share in group.rows"
						:key="shareKey(share)"
						class="cn-shares-tab__row"
						:name="shareTarget(share)"
						:bold="true"
						:force-display-actions="true">
						<template #icon>
							<span class="cn-shares-tab__avatar" :aria-hidden="true">
								<component :is="iconFor(shareType(share))" :size="20" />
								<LockOutline
									v-if="isPasswordProtected(share)"
									class="cn-shares-tab__avatar-lock"
									:size="12"
									:title="passwordProtectedLabel"
									:aria-label="passwordProtectedLabel" />
							</span>
						</template>
						<template #subname>
							<span class="cn-shares-tab__permissions">
								<CnStatusBadge
									v-for="badge in permissionBadges(share)"
									:key="badge.key"
									class="cn-shares-tab__badge"
									size="small"
									:variant="badge.variant"
									:label="badge.label" />
								<CnStatusBadge
									v-if="isPasswordProtected(share)"
									class="cn-shares-tab__badge"
									size="small"
									variant="warning"
									:label="passwordProtectedLabel" />
							</span>
						</template>
						<template v-if="shareExpiryMs(share)" #details>
							<span class="cn-shares-tab__expiry" :title="expiryLabel">
								<ClockOutline :size="13" />
								<NcDateTime
									:timestamp="shareExpiryMs(share)"
									:relative-time="'short'" />
							</span>
						</template>
						<template #actions>
							<NcActionButton
								v-if="canRevoke(share)"
								:close-after-click="true"
								@click="revoke(share)">
								<template #icon>
									<CloseCircleOutline :size="20" />
								</template>
								{{ revokeLabel }}
							</NcActionButton>
							<NcActionButton :close-after-click="true" @click="openFilesApp">
								<template #icon>
									<FolderOutline :size="20" />
								</template>
								{{ openFilesLabel }}
							</NcActionButton>
						</template>
					</NcListItem>
				</ul>
			</section>
			<div class="cn-shares-tab__footer">
				<NcButton variant="tertiary" @click="openFilesApp">
					<template #icon>
						<FolderOutline :size="18" />
					</template>
					{{ openFilesLabel }}
				</NcButton>
			</div>
		</div>

		<CnShareCreate
			v-if="showCreate"
			:files="shareableFiles"
			:files-loading="filesLoading"
			:principals="principals"
			:principals-loading="principalsLoading"
			@close="showCreate = false"
			@search-principals="searchPrincipals"
			@create="createShare" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcActionButton, NcButton, NcDateTime, NcListItem, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import AccountOutline from 'vue-material-design-icons/AccountOutline.vue'
import AccountGroupOutline from 'vue-material-design-icons/AccountGroupOutline.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import EmailOutline from 'vue-material-design-icons/EmailOutline.vue'
import Earth from 'vue-material-design-icons/Earth.vue'
import LockOutline from 'vue-material-design-icons/LockOutline.vue'
import ClockOutline from 'vue-material-design-icons/ClockOutline.vue'
import CloseCircleOutline from 'vue-material-design-icons/CloseCircleOutline.vue'
import FolderOutline from 'vue-material-design-icons/FolderOutline.vue'
import Share from 'vue-material-design-icons/Share.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import CnStatusBadge from '../../../components/CnStatusBadge/CnStatusBadge.vue'
import { CnShareCreate } from '../../../components/CnShareCreate/index.js'
import { buildHeaders } from '../../../utils/index.js'

// NC core share-type constants (OCP\Share\IShare::TYPE_*).
const SHARE_TYPE_USER = 0
const SHARE_TYPE_GROUP = 1
const SHARE_TYPE_LINK = 3
const SHARE_TYPE_EMAIL = 4
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
		NcActionButton,
		NcButton,
		NcDateTime,
		NcListItem,
		NcLoadingIcon,
		AlertCircleOutline,
		AccountOutline,
		AccountGroupOutline,
		LinkVariant,
		EmailOutline,
		Earth,
		LockOutline,
		ClockOutline,
		CloseCircleOutline,
		FolderOutline,
		Share,
		Plus,
		CnStatusBadge,
		CnShareCreate,
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
		/** Pre-translated label for the "Share file" toolbar button. */
		shareFileLabel: { type: String, default: () => t('nextcloud-vue', 'Share file') },
	},

	data() {
		return {
			shares: [],
			loading: false,
			error: '',
			degraded: '',
			showCreate: false,
			shareableFiles: [],
			filesLoading: false,
			principals: [],
			principalsLoading: false,
		}
	},

	computed: {
		groupedShares() {
			const groups = [
				{ key: 'user', label: t('nextcloud-vue', 'Users'), icon: 'AccountOutline', match: (s) => this.shareType(s) === SHARE_TYPE_USER },
				{ key: 'group', label: t('nextcloud-vue', 'Groups'), icon: 'AccountGroupOutline', match: (s) => this.shareType(s) === SHARE_TYPE_GROUP },
				{ key: 'link', label: t('nextcloud-vue', 'Public links'), icon: 'LinkVariant', match: (s) => this.shareType(s) === SHARE_TYPE_LINK },
				{ key: 'email', label: t('nextcloud-vue', 'Email'), icon: 'EmailOutline', match: (s) => this.shareType(s) === SHARE_TYPE_EMAIL },
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

		// Tier-2 dedicated endpoints (ShareLinksController) — distinct
		// from the generic registry `baseUrl()` above. Create/revoke flow
		// through these so the IManager-backed service owns the write
		// path (NO cache table).
		sharesUrl() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/shares`
		},

		shareableFilesUrl() {
			return `${this.apiBase}/integrations/shares/files/${this.register}/${this.schema}/${this.objectId}`
		},

		async openCreateDialog() {
			this.showCreate = true
			await this.fetchShareableFiles()
		},

		async fetchShareableFiles() {
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			this.filesLoading = true
			try {
				const response = await fetch(this.shareableFilesUrl(), { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					this.shareableFiles = data.results || (Array.isArray(data) ? data : []) || []
				} else {
					this.shareableFiles = []
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnSharesTab] failed to fetch shareable files', err)
				this.shareableFiles = []
			} finally {
				this.filesLoading = false
			}
		},

		searchPrincipals({ shareType, query }) {
			// Principal lookup is host-supplied: the host app wires NC's
			// share-search OCS endpoint. Emit upward so the host can
			// populate `principals`; default is a no-op empty list.
			this.$emit('search-principals', { shareType, query })
		},

		async createShare(payload) {
			try {
				const response = await fetch(this.sharesUrl(), {
					method: 'POST',
					headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				})
				if (response.ok) {
					this.showCreate = false
					this.$emit('share-created', payload)
					await this.fetchShares()
				} else {
					const data = await response.json().catch(() => ({}))
					this.error = data.error || t('nextcloud-vue', 'Could not create share.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnSharesTab] failed to create share', err)
				this.error = t('nextcloud-vue', 'Could not create share.')
			}
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
				// Public links surface as a generic "Share link" label,
				// mirroring NC core's share list (the raw token is never
				// shown as a recipient name).
				return share.shareWithDisplayname || share.label || t('nextcloud-vue', 'Share link')
			}
			return share.shareWithDisplayname || share.shareWith || share.share_with || share.targetDisplayName || ''
		},

		// Picks the recipient/share-type icon component for a row,
		// mirroring NC core's share list (user / group / link / email /
		// federated).
		iconFor(type) {
			if (type === SHARE_TYPE_GROUP) {
				return 'AccountGroupOutline'
			}
			if (type === SHARE_TYPE_LINK) {
				return 'LinkVariant'
			}
			if (type === SHARE_TYPE_EMAIL) {
				return 'EmailOutline'
			}
			if (type === SHARE_TYPE_REMOTE || type === SHARE_TYPE_REMOTE_GROUP) {
				return 'Earth'
			}
			return 'AccountOutline'
		},

		permissionLabel(share) {
			return this.permissionBadges(share).map((b) => b.label).join(' · ')
		},

		// Decomposes the NC permission bitmask into the badge set the real
		// share UI shows: "Can edit" / "Read only" (mutually exclusive),
		// plus "Can reshare" when the share permission bit is set.
		permissionBadges(share) {
			const perms = Number(share.permissions ?? share.permission ?? 0)
			const canEdit = (perms & PERMISSION_UPDATE) === PERMISSION_UPDATE
				|| (perms & PERMISSION_CREATE) === PERMISSION_CREATE
				|| (perms & PERMISSION_DELETE) === PERMISSION_DELETE
			const canRead = (perms & PERMISSION_READ) === PERMISSION_READ
			const badges = []
			if (canEdit) {
				badges.push({ key: 'edit', variant: 'success', label: t('nextcloud-vue', 'Can edit') })
			} else if (canRead) {
				badges.push({ key: 'read', variant: 'default', label: t('nextcloud-vue', 'Read only') })
			}
			if ((perms & PERMISSION_SHARE) === PERMISSION_SHARE) {
				badges.push({ key: 'reshare', variant: 'info', label: t('nextcloud-vue', 'Can reshare') })
			}
			return badges
		},

		// Returns the expiry as epoch-ms for <NcDateTime>, or 0 when there
		// is no (valid) expiry so the template can `v-if` it away.
		shareExpiryMs(share) {
			const value = share.expiration ?? share.expirationDate ?? share.expiry ?? null
			if (!value) {
				return 0
			}
			const date = new Date(value)
			const ms = date.getTime()
			return Number.isNaN(ms) ? 0 : ms
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

.cn-shares-tab__toolbar {
	display: flex;
	justify-content: flex-end;
	margin-bottom: 10px;
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

/* Share-type icon tile, mirroring the NcAvatar slot in NC's share list. */
.cn-shares-tab__avatar {
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 34px;
	height: 34px;
	border-radius: 50%;
	background: var(--color-background-dark);
	color: var(--color-main-text);
}

.cn-shares-tab__avatar-lock {
	position: absolute;
	right: -2px;
	bottom: -2px;
	color: var(--color-warning, #e9a40f);
	background: var(--color-main-background);
	border-radius: 50%;
}

.cn-shares-tab__permissions {
	display: inline-flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 4px;
}

.cn-shares-tab__badge {
	white-space: nowrap;
}

.cn-shares-tab__expiry {
	display: inline-flex;
	align-items: center;
	gap: 3px;
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
	white-space: nowrap;
}

.cn-shares-tab__footer {
	margin-top: 12px;
	display: flex;
	justify-content: flex-end;
}
</style>
