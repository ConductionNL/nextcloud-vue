<!--
  CnTalkTab — bespoke sidebar tab for the `talk` integration.

  Replaces the generic CnIntegrationTab for the `talk` leaf: renders a
  conversation list with room name, last-message preview, unread badge,
  and a "Open in Talk" deep-link per row. Talks to the same OpenRegister
  pluggable-integration sub-resource
    `/api/objects/{register}/{schema}/{objectId}/integrations/talk`
  served by `OCA\OpenRegister\Service\Integration\Providers\TalkProvider`
  (which calls `OCA\Talk\Manager::getRoomsForUser` and filters rooms by
  the `[or:{uuid}]` marker).

  Surface behaviour:
    - Empty state with "Open Talk" CTA when no linked rooms.
    - Loading + 503 "currently unavailable" + generic error states match
      CnIntegrationTab's behaviour for AD-23 graceful degradation.

  Bespoke-vs-generic rationale: the generic tab renders a flat link list
  which loses Talk's three primary signals (unread count, last message,
  participant size) — the bespoke tab surfaces them per row so case
  handlers can tell at a glance whether a conversation needs attention.

  See `openregister/openspec/changes/integration-talk/` for the spec
  delta and ADR-019 (registry mechanism).
-->
<template>
	<div class="cn-sidebar-tab cn-talk-tab">
		<div v-if="degraded" class="cn-talk-tab__banner" role="alert">
			<AlertCircleOutline :size="18" />
			<span>{{ degraded }}</span>
		</div>

		<NcLoadingIcon v-if="loading" />
		<div v-else-if="error" class="cn-talk-tab__error" role="alert">
			{{ error }}
		</div>
		<div v-else-if="rooms.length === 0" class="cn-sidebar-tab__empty cn-talk-tab__empty">
			<ChatOutline :size="32" class="cn-talk-tab__empty-icon" />
			<p>{{ emptyLabel }}</p>
			<NcButton type="primary" @click="openTalkApp">
				<template #icon>
					<ChatOutline :size="20" />
				</template>
				{{ openTalkLabel }}
			</NcButton>
		</div>
		<ul v-else class="cn-talk-tab__list">
			<li
				v-for="room in rooms"
				:key="roomKey(room)"
				class="cn-talk-tab__row"
				:class="{ 'cn-talk-tab__row--unread': hasUnread(room) }">
				<div class="cn-talk-tab__row-icon">
					<ChatOutline :size="24" />
					<span
						v-if="hasUnread(room)"
						class="cn-talk-tab__badge"
						:aria-label="unreadAriaLabel(room)">{{ formatUnread(room) }}</span>
				</div>
				<div class="cn-talk-tab__row-main">
					<a
						:href="roomUrl(room)"
						target="_blank"
						rel="noopener"
						class="cn-talk-tab__title">
						{{ roomTitle(room) }}
					</a>
					<span v-if="roomPreview(room)" class="cn-talk-tab__preview">
						{{ roomPreview(room) }}
					</span>
					<span v-if="roomMeta(room)" class="cn-talk-tab__meta">
						{{ roomMeta(room) }}
					</span>
				</div>
			</li>
		</ul>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import ChatOutline from 'vue-material-design-icons/ChatOutline.vue'
import { buildHeaders } from '../../../utils/index.js'

/**
 * CnTalkTab — bespoke conversation list for the `talk` integration.
 *
 * Renders rows pulled from the OR pluggable-integration endpoint with
 * unread indicators, last-message previews, and participant counts.
 */
export default {
	name: 'CnTalkTab',

	components: { NcButton, NcLoadingIcon, AlertCircleOutline, ChatOutline },

	props: {
		/** Stable integration id (forwarded from the registry — always `'talk'`). */
		integrationId: { type: String, default: 'talk' },
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, default: '' },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, default: '' },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No conversations linked yet') },
		/** Pre-translated label for the "Open in Talk" CTA. */
		openTalkLabel: { type: String, default: () => t('nextcloud-vue', 'Open Talk') },
		/** Pre-translated banner when Talk is unavailable. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC Talk is currently unavailable.') },
		/** URL of the NC Talk app entry. */
		talkAppUrl: { type: String, default: '/index.php/apps/spreed' },
	},

	data() {
		return {
			rooms: [],
			loading: false,
			error: '',
			degraded: '',
		}
	},

	watch: {
		objectId: { immediate: true, handler(id) { if (id) { this.fetchRooms() } } },
		register() { this.fetchRooms() },
		schema() { this.fetchRooms() },
	},

	methods: {
		baseUrl() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/integrations/${this.integrationId}`
		},

		roomKey(room) {
			return room.id ?? room.token ?? room.reference ?? ''
		},

		roomTitle(room) {
			return room.title ?? room.displayName ?? room.name ?? this.roomKey(room)
		},

		roomUrl(room) {
			if (room.url) {
				return room.url
			}
			const token = room.token ?? room.id ?? ''
			return token ? `/index.php/call/${token}` : this.talkAppUrl
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

		roomPreview(room) {
			const msg = room.lastMessage
			if (msg && typeof msg === 'object') {
				return msg.message ?? msg.text ?? ''
			}
			return room.lastMessageText ?? room.preview ?? ''
		},

		roomMeta(room) {
			const parts = []
			const participants = Number(room.participantCount ?? room.numParticipants ?? 0)
			if (Number.isFinite(participants) && participants > 0) {
				parts.push(t('nextcloud-vue', '{n} participants', { n: participants }))
			}
			if (room.lastActivity) {
				parts.push(this.formatTimestamp(room.lastActivity))
			}
			return parts.join(' · ')
		},

		formatTimestamp(value) {
			let date
			try {
				if (typeof value === 'number') {
					date = new Date(value * 1000)
				} else {
					date = new Date(value)
				}
				if (Number.isNaN(date.getTime())) {
					return ''
				}
				return date.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
			} catch (e) {
				return ''
			}
		},

		openTalkApp() {
			if (typeof window !== 'undefined') {
				window.open(this.talkAppUrl, '_blank', 'noopener')
			}
		},

		async fetchRooms() {
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
					this.rooms = rows
				} else if (response.status === 503) {
					this.rooms = []
					this.degraded = this.unavailableLabel
				} else {
					this.rooms = []
					this.error = t('nextcloud-vue', 'Could not load conversations.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnTalkTab] failed to fetch rooms', err)
				this.rooms = []
				this.error = t('nextcloud-vue', 'Could not load conversations.')
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-talk-tab__banner {
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

.cn-talk-tab__error {
	color: var(--color-error);
	font-size: 0.9em;
	margin: 4px 0 8px;
}

.cn-talk-tab__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 16px 8px;
	color: var(--color-text-maxcontrast);
	text-align: center;
}

.cn-talk-tab__empty-icon {
	color: var(--color-text-maxcontrast);
}

.cn-talk-tab__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-talk-tab__row {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	padding: 8px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-talk-tab__row:last-child {
	border-bottom: none;
}

.cn-talk-tab__row-icon {
	position: relative;
	flex-shrink: 0;
	color: var(--color-text-maxcontrast);
	padding-top: 2px;
}

.cn-talk-tab__badge {
	position: absolute;
	top: -4px;
	right: -8px;
	min-width: 18px;
	height: 18px;
	padding: 0 5px;
	border-radius: 9px;
	background: var(--color-primary-element, #4376FC);
	color: var(--color-primary-element-text, #ffffff);
	font-size: 0.7em;
	font-weight: bold;
	line-height: 18px;
	text-align: center;
}

.cn-talk-tab__row-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-talk-tab__title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
	text-decoration: none;
	font-weight: 500;
}

.cn-talk-tab__row--unread .cn-talk-tab__title {
	font-weight: 600;
}

a.cn-talk-tab__title:hover {
	text-decoration: underline;
}

.cn-talk-tab__preview {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-talk-tab__meta {
	font-size: 0.75em;
	color: var(--color-text-maxcontrast);
}
</style>
