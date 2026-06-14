<!--
  CnTalkCard — bespoke surface-aware widget for the `talk` integration.

  Replaces the generic CnIntegrationCard for the `talk` leaf. Branches on
  `surface` per AD-19:
    - user-dashboard / app-dashboard : headline "N unread across M
        conversations" (per Talk integration-talk spec — unread is the
        single glanceable signal); secondary line names the most recent
        conversation.
    - detail-page                    : compact list of linked
        conversations with last-message preview + unread badge per row.
    - single-entity                  : chip with conversation name + an
        unread dot when applicable (referenceType: 'talk').

  Pulls rows from the same OR pluggable-integration sub-resource as
  CnTalkTab; for `single-entity` the optional `value` prop addresses a
  single conversation by token (matching CnIntegrationCard's fetchSingle
  contract).

  See `openregister/openspec/changes/integration-talk/` for the spec
  delta and ADR-019 (registry mechanism), AD-19 (surface fallback).
-->
<template>
	<CnDetailCard :title="cardTitle" :icon="cardIcon" :collapsible="collapsible">
		<NcLoadingIcon v-if="loading" />

		<!-- single-entity surface: chip -->
		<template v-else-if="surface === 'single-entity'">
			<span v-if="entity" class="cn-talk-card__chip" :title="chipSubtitle(entity)">
				<ChatOutline :size="14" />
				<a
					:href="chipUrl(entity)"
					target="_blank"
					rel="noopener">{{ roomTitle(entity) }}</a>
				<span v-if="hasUnread(entity)" class="cn-talk-card__chip-badge" :aria-label="unreadAriaLabel(entity)">
					{{ formatUnread(entity) }}
				</span>
			</span>
			<span v-else class="cn-talk-card__empty">{{ emptyLabel }}</span>
		</template>

		<!-- dashboard surfaces: headline + most-recent -->
		<template v-else-if="surface === 'user-dashboard' || surface === 'app-dashboard'">
			<div v-if="degraded" class="cn-talk-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="rooms.length === 0" class="cn-talk-card__empty">
				{{ emptyLabel }}
			</div>
			<div v-else class="cn-talk-card__headline">
				<div class="cn-talk-card__headline-line">
					<strong>{{ unreadHeadline }}</strong>
				</div>
				<div v-if="mostRecent" class="cn-talk-card__headline-recent">
					<ChatOutline :size="14" />
					<a
						:href="roomUrl(mostRecent)"
						target="_blank"
						rel="noopener">{{ roomTitle(mostRecent) }}</a>
					<span v-if="roomPreview(mostRecent)" class="cn-talk-card__headline-preview">
						· {{ roomPreview(mostRecent) }}
					</span>
				</div>
			</div>
		</template>

		<!-- detail-page surface: compact list -->
		<template v-else>
			<div v-if="degraded" class="cn-talk-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="rooms.length === 0" class="cn-talk-card__empty">
				{{ emptyLabel }}
			</div>
			<ul v-else class="cn-talk-card__list">
				<li
					v-for="room in displayedRooms"
					:key="roomKey(room)"
					class="cn-talk-card__row"
					:class="{ 'cn-talk-card__row--unread': hasUnread(room) }">
					<div class="cn-talk-card__row-icon">
						<NcAvatar
							:display-name="roomTitle(room)"
							:size="32"
							:is-no-user="true"
							:show-user-status="false" />
						<NcCounterBubble
							v-if="hasUnread(room)"
							class="cn-talk-card__badge"
							type="highlighted"
							:aria-label="unreadAriaLabel(room)">
							{{ formatUnread(room) }}
						</NcCounterBubble>
					</div>
					<div class="cn-talk-card__row-main">
						<a
							:href="roomUrl(room)"
							target="_blank"
							rel="noopener"
							class="cn-talk-card__title">{{ roomTitle(room) }}</a>
						<span v-if="roomPreview(room)" class="cn-talk-card__subtitle">{{ roomPreview(room) }}</span>
					</div>
				</li>
			</ul>
		</template>
	</CnDetailCard>
</template>

<script>
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import { NcAvatar, NcCounterBubble, NcLoadingIcon } from '@nextcloud/vue'
import ChatOutline from 'vue-material-design-icons/ChatOutline.vue'
import CnDetailCard from '../../../components/CnDetailCard/CnDetailCard.vue'
import { buildHeaders } from '../../../utils/index.js'
import { stripMarker } from '../../utils/marker.js'

const VALID_SURFACES = ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity']
const COMPACT_LIMIT = 5

/**
 * CnTalkCard — bespoke surface-aware widget for the `talk` integration.
 *
 * Renders Talk-aware metadata across all four surfaces. See the
 * file-level docblock for surface-by-surface behaviour.
 */
export default {
	name: 'CnTalkCard',

	components: { CnDetailCard, NcAvatar, NcCounterBubble, NcLoadingIcon, ChatOutline },

	props: {
		/** Stable integration id (forwarded from the registry — always `'talk'`). */
		integrationId: { type: String, default: 'talk' },
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
		/** Optional single-entity reference (room token). */
		value: { type: String, default: '' },
		/** Pre-translated card title. */
		title: { type: String, default: () => t('nextcloud-vue', 'Chat') },
		/** Optional Material Design Icon component. */
		icon: { type: Object, default: () => ChatOutline },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Whether the card body is collapsible. */
		collapsible: { type: Boolean, default: true },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No conversations linked yet') },
		/** Pre-translated unavailable label. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC Talk is currently unavailable.') },
		/** URL of the NC Talk app entry. */
		talkAppUrl: { type: String, default: '/index.php/apps/spreed' },
	},

	data() {
		return {
			rooms: [],
			entity: null,
			loading: false,
			degraded: '',
		}
	},

	computed: {
		cardTitle() {
			return this.title || this.integrationId
		},

		cardIcon() {
			return this.icon
		},

		displayedRooms() {
			if (this.surface === 'user-dashboard' || this.surface === 'app-dashboard') {
				return this.rooms.slice(0, COMPACT_LIMIT)
			}
			return this.rooms
		},

		totalUnread() {
			return this.rooms.reduce((sum, room) => {
				const count = Number(room.unreadMessages ?? room.unread ?? 0)
				return sum + (Number.isFinite(count) && count > 0 ? count : 0)
			}, 0)
		},

		unreadHeadline() {
			const unread = this.totalUnread
			const total = this.rooms.length
			if (unread === 0) {
				// "M conversations" via translatePlural.
				return n('nextcloud-vue', '{count} conversation', '{count} conversations', total, { count: total })
			}
			// Pre-format the two plural fragments, then compose so we don't
			// trip the @nextcloud/l10n single-placeholder constraint.
			const unreadFragment = n('nextcloud-vue', '{count} unread message', '{count} unread messages', unread, { count: unread })
			const acrossFragment = n('nextcloud-vue', 'across {count} conversation', 'across {count} conversations', total, { count: total })
			return `${unreadFragment} ${acrossFragment}`
		},

		mostRecent() {
			if (this.rooms.length === 0) {
				return null
			}
			// Sort defensive copy by lastActivity desc.
			const sorted = [...this.rooms].sort((a, b) => {
				const ta = Number(a.lastActivity ?? 0)
				const tb = Number(b.lastActivity ?? 0)
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

		roomKey(room) {
			return room.id ?? room.token ?? room.reference ?? ''
		},

		roomTitle(room) {
			const raw = room.title ?? room.displayName ?? room.name ?? this.roomKey(room)
			return stripMarker(raw) || String(this.roomKey(room))
		},

		roomUrl(room) {
			if (room.url) {
				return room.url
			}
			const token = room.token ?? room.id ?? ''
			return token ? `/index.php/call/${token}` : this.talkAppUrl
		},

		roomPreview(room) {
			const msg = room.lastMessage
			if (msg && typeof msg === 'object') {
				return msg.message ?? msg.text ?? ''
			}
			return room.lastMessageText ?? room.preview ?? ''
		},

		hasUnread(room) {
			const count = Number(room.unreadMessages ?? room.unread ?? 0)
			return Number.isFinite(count) && count > 0
		},

		formatUnread(room) {
			const count = Number(room.unreadMessages ?? room.unread ?? 0)
			if (!Number.isFinite(count) || count <= 0) {
				return ''
			}
			return count > 99 ? '99+' : String(count)
		},

		unreadAriaLabel(room) {
			const count = Number(room.unreadMessages ?? room.unread ?? 0)
			return t('nextcloud-vue', '{n} unread', { n: count })
		},

		chipSubtitle(room) {
			const preview = this.roomPreview(room)
			return preview || this.roomTitle(room)
		},

		chipUrl(room) {
			return this.roomUrl(room)
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
					this.rooms = data.results || data.items || (Array.isArray(data) ? data : []) || []
				} else if (response.status === 503) {
					this.rooms = []
					this.degraded = this.unavailableLabel
				} else {
					this.rooms = []
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnTalkCard] failed to fetch rooms', err)
				this.rooms = []
			} finally {
				this.loading = false
			}
		},

		async fetchSingle() {
			if (!this.value || !this.register || !this.schema || !this.objectId) {
				this.entity = null
				return
			}
			this.loading = true
			this.degraded = ''
			try {
				const response = await fetch(`${this.baseUrl()}/${encodeURIComponent(this.value)}`, { headers: buildHeaders() })
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
				console.error('[CnTalkCard] failed to fetch single conversation', err)
				this.entity = null
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-talk-card__empty {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	padding: 8px 0;
}

.cn-talk-card__headline {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-talk-card__headline-line {
	font-size: 1.1em;
	color: var(--color-main-text);
}

.cn-talk-card__headline-recent {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 0.9em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-talk-card__headline-recent a {
	color: var(--color-main-text);
	text-decoration: none;
}

.cn-talk-card__headline-recent a:hover {
	text-decoration: underline;
}

.cn-talk-card__headline-preview {
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-talk-card__chip {
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

/* stylelint-disable-next-line no-descending-specificity */
.cn-talk-card__chip a {
	color: var(--color-main-text);
	text-decoration: none;
}

.cn-talk-card__chip a:hover {
	text-decoration: underline;
}

.cn-talk-card__chip-badge {
	display: inline-block;
	min-width: 16px;
	height: 16px;
	padding: 0 5px;
	border-radius: 8px;
	background: var(--color-primary-element, #4376FC);
	color: var(--color-primary-element-text, #ffffff);
	font-size: 0.7em;
	font-weight: bold;
	line-height: 16px;
	text-align: center;
}

.cn-talk-card__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-talk-card__row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-talk-card__row:last-child {
	border-bottom: none;
}

.cn-talk-card__row-icon {
	position: relative;
	flex-shrink: 0;
	color: var(--color-text-maxcontrast);
}

.cn-talk-card__badge {
	position: absolute;
	top: -4px;
	right: -8px;
	min-width: 16px;
	height: 16px;
	padding: 0 5px;
	border-radius: 8px;
	background: var(--color-primary-element, #4376FC);
	color: var(--color-primary-element-text, #ffffff);
	font-size: 0.7em;
	font-weight: bold;
	line-height: 16px;
	text-align: center;
}

.cn-talk-card__row-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
}

.cn-talk-card__title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
	text-decoration: none;
}

.cn-talk-card__row--unread .cn-talk-card__title {
	font-weight: 600;
}

a.cn-talk-card__title:hover {
	text-decoration: underline;
}

.cn-talk-card__subtitle {
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
