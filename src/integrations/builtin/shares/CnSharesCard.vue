<!--
  CnSharesCard — bespoke surface-aware widget for the `shares` integration.

  Replaces the generic CnIntegrationCard for the `shares` leaf. Branches
  on `surface` per AD-19:
    - user-dashboard / app-dashboard : headline counts split by type
        (e.g. "3 users · 1 group · 2 links"); secondary line names the
        most recent share recipient.
    - detail-page                    : compact list of linked shares
        grouped by type with recipient + permissions per row.
    - single-entity                  : chip with share-type icon + a
        target / recipient label (referenceType: 'shares').

  Pulls rows from the same OR pluggable-integration sub-resource as
  CnSharesTab; for `single-entity` the optional `value` prop addresses a
  single share by id (matching CnIntegrationCard's fetchSingle contract).

  See `openregister/openspec/changes/integration-shares/` for the spec
  delta and ADR-019 (registry mechanism), AD-19 (surface fallback).
-->
<template>
	<CnDetailCard :title="cardTitle" :icon="cardIcon" :collapsible="collapsible">
		<NcLoadingIcon v-if="loading" />

		<!-- single-entity surface: chip -->
		<template v-else-if="surface === 'single-entity'">
			<span v-if="entity" class="cn-shares-card__chip" :title="chipSubtitle(entity)">
				<component :is="iconFor(shareTypeOf(entity))" :size="14" />
				<span class="cn-shares-card__chip-label">{{ chipLabel(entity) }}</span>
				<LockOutline
					v-if="isPasswordProtected(entity)"
					:size="12"
					:title="passwordProtectedLabel"
					:aria-label="passwordProtectedLabel" />
			</span>
			<span v-else class="cn-shares-card__empty">{{ emptyLabel }}</span>
		</template>

		<!-- dashboard surfaces: headline + most-recent -->
		<template v-else-if="surface === 'user-dashboard' || surface === 'app-dashboard'">
			<div v-if="degraded" class="cn-shares-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="shares.length === 0" class="cn-shares-card__empty">
				{{ emptyLabel }}
			</div>
			<div v-else class="cn-shares-card__headline">
				<div class="cn-shares-card__headline-line">
					<strong>{{ countsHeadline }}</strong>
				</div>
				<div v-if="mostRecent" class="cn-shares-card__headline-recent">
					<component :is="iconFor(shareTypeOf(mostRecent))" :size="14" />
					<span>{{ chipLabel(mostRecent) }}</span>
				</div>
			</div>
		</template>

		<!-- detail-page surface: compact list grouped by type -->
		<template v-else>
			<div v-if="degraded" class="cn-shares-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="shares.length === 0" class="cn-shares-card__empty">
				{{ emptyLabel }}
			</div>
			<div v-else class="cn-shares-card__groups">
				<section
					v-for="group in groupedShares"
					:key="group.key"
					class="cn-shares-card__group">
					<header class="cn-shares-card__group-header">
						<component :is="group.icon" :size="14" />
						<span>{{ group.label }}</span>
						<span class="cn-shares-card__group-count">{{ group.rows.length }}</span>
					</header>
					<ul class="cn-shares-card__list">
						<li
							v-for="share in group.rows.slice(0, COMPACT_LIMIT)"
							:key="shareKey(share)"
							class="cn-shares-card__row">
							<div class="cn-shares-card__row-main">
								<span class="cn-shares-card__title">{{ chipLabel(share) }}</span>
								<span class="cn-shares-card__subtitle">{{ permissionLabel(share) }}</span>
							</div>
							<LockOutline
								v-if="isPasswordProtected(share)"
								:size="14"
								:title="passwordProtectedLabel"
								:aria-label="passwordProtectedLabel" />
						</li>
					</ul>
				</section>
			</div>
		</template>
	</CnDetailCard>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import AccountOutline from 'vue-material-design-icons/AccountOutline.vue'
import AccountGroupOutline from 'vue-material-design-icons/AccountGroupOutline.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import Earth from 'vue-material-design-icons/Earth.vue'
import LockOutline from 'vue-material-design-icons/LockOutline.vue'
import Share from 'vue-material-design-icons/Share.vue'
import CnDetailCard from '../../../components/CnDetailCard/CnDetailCard.vue'
import { buildHeaders } from '../../../utils/index.js'

const VALID_SURFACES = ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity']
const COMPACT_LIMIT = 5

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
 * CnSharesCard — bespoke surface-aware widget for the `shares` integration.
 *
 * Renders shares metadata across all four surfaces. See the file-level
 * docblock for surface-by-surface behaviour.
 */
export default {
	name: 'CnSharesCard',

	components: {
		CnDetailCard,
		NcLoadingIcon,
		AccountOutline,
		AccountGroupOutline,
		LinkVariant,
		Earth,
		LockOutline,
		Share,
	},

	props: {
		/** Stable integration id (forwarded from the registry — always `'shares'`). */
		integrationId: { type: String, default: 'shares' },
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, required: true },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, required: true },
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** Rendering surface (AD-19). */
		surface: {
			type: String,
			default: 'detail-page',
			validator: (s) => VALID_SURFACES.includes(s),
		},
		/** Optional single-entity reference (share id). */
		value: { type: [String, Number], default: '' },
		/** Pre-translated card title. */
		title: { type: String, default: () => t('nextcloud-vue', 'Shares') },
		/** Optional Material Design Icon component. */
		icon: { type: Object, default: () => Share },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Whether the card body is collapsible. */
		collapsible: { type: Boolean, default: true },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No shares on this object yet') },
		/** Pre-translated unavailable label. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC sharing is currently unavailable.') },
		/** Pre-translated label for the password-protected indicator. */
		passwordProtectedLabel: { type: String, default: () => t('nextcloud-vue', 'Password protected') },
	},

	data() {
		return {
			shares: [],
			entity: null,
			loading: false,
			degraded: '',
			COMPACT_LIMIT,
		}
	},

	computed: {
		cardTitle() {
			return this.title || this.integrationId
		},

		cardIcon() {
			return this.icon
		},

		typedCounts() {
			const counts = { user: 0, group: 0, link: 0, federated: 0 }
			for (const share of this.shares) {
				const type = this.shareTypeOf(share)
				if (type === SHARE_TYPE_USER) {
					counts.user += 1
				} else if (type === SHARE_TYPE_GROUP) {
					counts.group += 1
				} else if (type === SHARE_TYPE_LINK) {
					counts.link += 1
				} else if (type === SHARE_TYPE_REMOTE || type === SHARE_TYPE_REMOTE_GROUP) {
					counts.federated += 1
				}
			}
			return counts
		},

		countsHeadline() {
			const c = this.typedCounts
			const parts = []
			if (c.user > 0) {
				parts.push(t('nextcloud-vue', '{n} users', { n: c.user }))
			}
			if (c.group > 0) {
				parts.push(t('nextcloud-vue', '{n} groups', { n: c.group }))
			}
			if (c.link > 0) {
				parts.push(t('nextcloud-vue', '{n} links', { n: c.link }))
			}
			if (c.federated > 0) {
				parts.push(t('nextcloud-vue', '{n} federated', { n: c.federated }))
			}
			if (parts.length === 0) {
				return t('nextcloud-vue', '{n} shares', { n: this.shares.length })
			}
			return parts.join(' · ')
		},

		groupedShares() {
			const groups = [
				{ key: 'user', label: t('nextcloud-vue', 'Users'), icon: 'AccountOutline', match: (s) => this.shareTypeOf(s) === SHARE_TYPE_USER },
				{ key: 'group', label: t('nextcloud-vue', 'Groups'), icon: 'AccountGroupOutline', match: (s) => this.shareTypeOf(s) === SHARE_TYPE_GROUP },
				{ key: 'link', label: t('nextcloud-vue', 'Public links'), icon: 'LinkVariant', match: (s) => this.shareTypeOf(s) === SHARE_TYPE_LINK },
				{ key: 'federated', label: t('nextcloud-vue', 'Federated'), icon: 'Earth', match: (s) => this.shareTypeOf(s) === SHARE_TYPE_REMOTE || this.shareTypeOf(s) === SHARE_TYPE_REMOTE_GROUP },
			]
			return groups
				.map((g) => ({ ...g, rows: this.shares.filter(g.match) }))
				.filter((g) => g.rows.length > 0)
		},

		mostRecent() {
			if (this.shares.length === 0) {
				return null
			}
			const sorted = [...this.shares].sort((a, b) => {
				const ta = Number(a.stime ?? a.shareTime ?? a.createdAt ?? 0)
				const tb = Number(b.stime ?? b.shareTime ?? b.createdAt ?? 0)
				return tb - ta
			})
			return sorted[0]
		},
	},

	watch: {
		objectId: { immediate: true, handler() { this.fetch() } },
		surface() { this.fetch() },
		value() { if (this.surface === 'single-entity') { this.fetchSingle() } },
	},

	methods: {
		baseUrl() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/integrations/${this.integrationId}`
		},

		shareKey(share) {
			return share.id ?? share.shareId ?? share.token ?? ''
		},

		shareTypeOf(share) {
			const value = share.shareType ?? share.share_type ?? share.type
			return Number.isFinite(Number(value)) ? Number(value) : -1
		},

		iconFor(type) {
			if (type === SHARE_TYPE_USER) {
				return 'AccountOutline'
			}
			if (type === SHARE_TYPE_GROUP) {
				return 'AccountGroupOutline'
			}
			if (type === SHARE_TYPE_LINK) {
				return 'LinkVariant'
			}
			if (type === SHARE_TYPE_REMOTE || type === SHARE_TYPE_REMOTE_GROUP) {
				return 'Earth'
			}
			return 'Share'
		},

		chipLabel(share) {
			const type = this.shareTypeOf(share)
			if (type === SHARE_TYPE_LINK) {
				return share.shareWithDisplayname || share.token || t('nextcloud-vue', 'Public link')
			}
			return share.shareWithDisplayname || share.shareWith || share.share_with || share.targetDisplayName || t('nextcloud-vue', 'Share')
		},

		chipSubtitle(share) {
			return this.permissionLabel(share)
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

		isPasswordProtected(share) {
			return Boolean(share.passwordProtected ?? share.hasPassword ?? share.password)
		},

		fetch() {
			if (this.surface === 'single-entity') {
				this.fetchSingle()
				return
			}
			this.fetchList()
		},

		async fetchList() {
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			this.loading = true
			this.degraded = ''
			try {
				const response = await fetch(this.baseUrl(), { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					this.shares = data.results || data.items || (Array.isArray(data) ? data : []) || []
				} else if (response.status === 503) {
					this.shares = []
					this.degraded = this.unavailableLabel
				} else {
					this.shares = []
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnSharesCard] failed to fetch shares', err)
				this.shares = []
			} finally {
				this.loading = false
			}
		},

		async fetchSingle() {
			if (this.value === '' || this.value === null || this.value === undefined
				|| !this.register || !this.schema || !this.objectId) {
				this.entity = null
				return
			}
			this.loading = true
			this.degraded = ''
			try {
				const response = await fetch(`${this.baseUrl()}/${encodeURIComponent(String(this.value))}`, { headers: buildHeaders() })
				if (response.ok) {
					this.entity = await response.json()
				} else if (response.status === 503) {
					this.entity = null
					this.degraded = this.unavailableLabel
				} else {
					this.entity = null
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnSharesCard] failed to fetch single share', err)
				this.entity = null
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-shares-card__empty {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	padding: 8px 0;
}

.cn-shares-card__headline {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-shares-card__headline-line {
	font-size: 1.05em;
	color: var(--color-main-text);
}

.cn-shares-card__headline-recent {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 0.9em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-shares-card__chip {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 4px 8px;
	border-radius: 12px;
	background: var(--color-background-hover);
	font-size: 0.9em;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-shares-card__chip-label {
	color: var(--color-main-text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-shares-card__group {
	margin-bottom: 10px;
}

.cn-shares-card__group-header {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 4px 0;
	font-size: 0.8em;
	font-weight: 600;
	color: var(--color-text-maxcontrast);
	border-bottom: 1px solid var(--color-border);
}

.cn-shares-card__group-count {
	margin-left: auto;
	font-weight: normal;
	font-size: 0.8em;
	padding: 1px 6px;
	border-radius: 9px;
	background: var(--color-background-hover);
}

.cn-shares-card__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-shares-card__row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 0;
}

.cn-shares-card__row-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
}

.cn-shares-card__title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
	font-size: 0.95em;
}

.cn-shares-card__subtitle {
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
