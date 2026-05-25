<!--
  CnTalkTab — bespoke sidebar tab for the `talk` integration.

  Replaces the generic CnIntegrationTab for the `talk` leaf: mirrors the
  real NC Talk conversation list — each row is an NcListItem with the
  conversation avatar (NcAvatar keyed on the room name), a bold
  conversation name, a last-message preview as the subname, a relative
  timestamp (NcDateTime) in the details slot, and an unread-count bubble
  (NcCounterBubble) when the room has unread messages. Per-row unlink and
  "Open in Talk" live in the row action menu. Tier-2: adds explicit
  "Link existing room" + "Create new room" actions powered by
  CnTalkRoomPicker / CnTalkRoomCreate; unlink does NOT destroy the
  underlying Talk room.

  Talks to the OpenRegister Tier-2 endpoint
    GET    /api/objects/{register}/{schema}/{objectId}/talk
    POST   /api/objects/{register}/{schema}/{objectId}/talk           — link
    POST   /api/objects/{register}/{schema}/{objectId}/talk/new       — create
    DELETE /api/objects/{register}/{schema}/{objectId}/talk/{roomToken} — unlink
  served by OCA\OpenRegister\Controller\TalkLinksController.

  Surface behaviour:
    - Empty state with "Open Talk" + Link/Create CTAs when no linked rooms.
    - Loading + 503 "currently unavailable" + generic error states match
      CnIntegrationTab's behaviour for AD-23 graceful degradation.

  See `openregister/openspec/changes/integration-talk/` for the spec
  delta and ADR-019 (registry mechanism).
-->
<template>
	<div class="cn-sidebar-tab cn-talk-tab">
		<div v-if="degraded" class="cn-talk-tab__banner" role="alert">
			<AlertCircleOutline :size="18" />
			<span>{{ degraded }}</span>
		</div>

		<!-- Tier-2 action bar — always visible when not in error/loading -->
		<div v-if="!loading && !error" class="cn-talk-tab__actions">
			<NcButton @click="openPicker">
				<template #icon>
					<LinkVariant :size="18" />
				</template>
				{{ t('nextcloud-vue', 'Link existing room') }}
			</NcButton>
			<NcButton type="primary" @click="openCreate">
				<template #icon>
					<Plus :size="18" />
				</template>
				{{ t('nextcloud-vue', 'Create new room') }}
			</NcButton>
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
			<NcListItem
				v-for="room in rooms"
				:key="roomKey(room)"
				class="cn-talk-tab__row"
				:class="{ 'cn-talk-tab__row--unread': hasUnread(room) }"
				:name="roomTitle(room)"
				:bold="hasUnread(room)"
				:href="roomUrl(room)"
				target="_blank"
				:force-display-actions="true">
				<template #icon>
					<NcAvatar
						:display-name="roomTitle(room)"
						:size="40"
						:is-no-user="true"
						:show-user-status="false" />
				</template>
				<template #subname>
					<span class="cn-talk-tab__preview">{{ roomSubname(room) }}</span>
				</template>
				<template v-if="roomTimestamp(room)" #details>
					<NcDateTime
						class="cn-talk-tab__time"
						:timestamp="roomTimestamp(room)"
						:relative-time="'short'" />
				</template>
				<template v-if="hasUnread(room)" #indicator>
					<NcCounterBubble
						class="cn-talk-tab__badge"
						type="highlighted"
						:aria-label="unreadAriaLabel(room)">
						{{ formatUnread(room) }}
					</NcCounterBubble>
				</template>
				<template #actions>
					<NcActionButton :close-after-click="true" @click="openRoom(room)">
						<template #icon>
							<OpenInNew :size="20" />
						</template>
						{{ t('nextcloud-vue', 'Open in Talk') }}
					</NcActionButton>
					<NcActionButton :close-after-click="true" @click="unlinkRoom(room)">
						<template #icon>
							<Close :size="20" />
						</template>
						{{ t('nextcloud-vue', 'Unlink from object (the room stays in Talk)') }}
					</NcActionButton>
				</template>
			</NcListItem>
		</ul>

		<!-- Picker + Create modals (mounted lazily) -->
		<CnTalkRoomPicker
			v-if="pickerOpen"
			:api-base="apiBase"
			@close="pickerOpen = false"
			@link="onPickerLink" />

		<CnTalkRoomCreate
			v-if="createOpen"
			@close="createOpen = false"
			@create="onCreateSubmit" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcActionButton, NcAvatar, NcButton, NcCounterBubble, NcDateTime, NcListItem, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import ChatOutline from 'vue-material-design-icons/ChatOutline.vue'
import Close from 'vue-material-design-icons/Close.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import OpenInNew from 'vue-material-design-icons/OpenInNew.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import CnTalkRoomCreate from '../../../components/CnTalkRoomCreate/CnTalkRoomCreate.vue'
import CnTalkRoomPicker from '../../../components/CnTalkRoomPicker/CnTalkRoomPicker.vue'
import { buildHeaders } from '../../../utils/index.js'
import { stripMarker } from '../../utils/marker.js'

/**
 * CnTalkTab — bespoke conversation list for the `talk` integration.
 *
 * Renders rows pulled from the OR Tier-2 link table as NcListItem rows
 * styled to mirror NC Talk: conversation avatar, bold name,
 * last-message preview, relative timestamp, and an unread counter
 * bubble. Tier-2: supports link / create / unlink via picker + create
 * dialogs.
 */
export default {
	name: 'CnTalkTab',

	components: {
		NcActionButton,
		NcAvatar,
		NcButton,
		NcCounterBubble,
		NcDateTime,
		NcListItem,
		NcLoadingIcon,
		AlertCircleOutline,
		ChatOutline,
		Close,
		LinkVariant,
		OpenInNew,
		Plus,
		CnTalkRoomPicker,
		CnTalkRoomCreate,
	},

	props: {
		integrationId: { type: String, default: 'talk' },
		objectId: { type: String, required: true },
		register: { type: String, default: '' },
		schema: { type: String, default: '' },
		apiBase: { type: String, default: '/apps/openregister/api' },
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No conversations linked yet') },
		openTalkLabel: { type: String, default: () => t('nextcloud-vue', 'Open Talk') },
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC Talk is currently unavailable.') },
		talkAppUrl: { type: String, default: '/index.php/apps/spreed' },
	},

	data() {
		return {
			rooms: [],
			loading: false,
			error: '',
			degraded: '',
			pickerOpen: false,
			createOpen: false,
		}
	},

	watch: {
		objectId: { immediate: true, handler(id) { if (id) { this.fetchRooms() } } },
		register() { this.fetchRooms() },
		schema() { this.fetchRooms() },
	},

	methods: {
		t,

		baseUrl() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/${this.integrationId}`
		},

		roomKey(room) {
			return room.roomToken ?? room.id ?? room.token ?? room.reference ?? ''
		},

		roomTitle(room) {
			const raw = room.roomName ?? room.title ?? room.displayName ?? room.name ?? this.roomKey(room)
			return stripMarker(raw) || String(this.roomKey(room))
		},

		roomUrl(room) {
			if (room.url) {
				return room.url
			}
			const token = room.roomToken ?? room.token ?? room.id ?? ''
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

		/**
		 * Last-message preview line. Falls back to a participant-count
		 * summary so the subname is never empty in NC-Talk style.
		 *
		 * @param {object} room Conversation row.
		 * @return {string} Preview or participant summary.
		 */
		roomSubname(room) {
			const preview = this.roomPreview(room)
			if (preview) {
				return preview
			}
			const participants = Number(room.participantCount ?? room.numParticipants ?? 0)
			if (Number.isFinite(participants) && participants > 0) {
				return t('nextcloud-vue', '{n} participants', { n: participants })
			}
			return ''
		},

		roomPreview(room) {
			const msg = room.lastMessage
			if (msg && typeof msg === 'object') {
				return msg.message ?? msg.text ?? ''
			}
			return room.lastMessageText ?? room.preview ?? ''
		},

		/**
		 * Resolve the room's last-activity moment as an epoch-millisecond
		 * value for NcDateTime. Accepts unix seconds, millisecond numbers,
		 * or an ISO-8601 string; returns 0 when unparseable (no timestamp).
		 *
		 * @param {object} room Conversation row.
		 * @return {number} Epoch milliseconds, or 0 when unknown.
		 */
		roomTimestamp(room) {
			const raw = room.lastActivity ?? room.lastActivityAt ?? null
			if (raw === null || raw === undefined || raw === '') {
				return 0
			}
			if (typeof raw === 'number') {
				// Heuristic: treat 10-digit values as unix seconds.
				return raw < 1e12 ? raw * 1000 : raw
			}
			const parsed = new Date(raw).getTime()
			return Number.isNaN(parsed) ? 0 : parsed
		},

		openRoom(room) {
			if (typeof window !== 'undefined') {
				window.open(this.roomUrl(room), '_blank', 'noopener')
			}
		},

		openTalkApp() {
			if (typeof window !== 'undefined') {
				window.open(this.talkAppUrl, '_blank', 'noopener')
			}
		},

		openPicker() {
			this.pickerOpen = true
		},

		openCreate() {
			this.createOpen = true
		},

		async onPickerLink(payload) {
			this.pickerOpen = false
			try {
				const response = await fetch(this.baseUrl(), {
					method: 'POST',
					headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
					body: JSON.stringify({ roomToken: payload.roomToken }),
				})
				if (response.ok) {
					await this.fetchRooms()
				} else if (response.status === 409) {
					this.error = t('nextcloud-vue', 'This room is already linked.')
				} else {
					this.error = t('nextcloud-vue', 'Could not link the room.')
				}
			} catch (err) {
				console.error('[CnTalkTab] link room failed', err)
				this.error = t('nextcloud-vue', 'Could not link the room.')
			}
		},

		async onCreateSubmit(payload) {
			this.createOpen = false
			try {
				const response = await fetch(`${this.baseUrl()}/new`, {
					method: 'POST',
					headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				})
				if (response.ok) {
					await this.fetchRooms()
				} else {
					this.error = t('nextcloud-vue', 'Could not create the room.')
				}
			} catch (err) {
				console.error('[CnTalkTab] create room failed', err)
				this.error = t('nextcloud-vue', 'Could not create the room.')
			}
		},

		async unlinkRoom(room) {
			const token = room.roomToken ?? room.token ?? room.id
			if (!token) {
				return
			}
			try {
				const response = await fetch(`${this.baseUrl()}/${encodeURIComponent(token)}`, {
					method: 'DELETE',
					headers: buildHeaders(),
				})
				if (response.ok) {
					await this.fetchRooms()
				} else {
					this.error = t('nextcloud-vue', 'Could not unlink the room.')
				}
			} catch (err) {
				console.error('[CnTalkTab] unlink room failed', err)
				this.error = t('nextcloud-vue', 'Could not unlink the room.')
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
				} else if (response.status === 503 || response.status === 501) {
					this.rooms = []
					this.degraded = this.unavailableLabel
				} else {
					this.rooms = []
					this.error = t('nextcloud-vue', 'Could not load conversations.')
				}
			} catch (err) {
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
.cn-talk-tab {
	padding: 8px 0;
}

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

.cn-talk-tab__actions {
	display: flex;
	gap: 8px;
	margin-bottom: 10px;
	flex-wrap: wrap;
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
	display: flex;
	flex-direction: column;
	gap: 2px;
}

/* Last-message preview — single line, muted, like NC Talk. */
.cn-talk-tab__preview {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-text-maxcontrast);
}

.cn-talk-tab__time {
	color: var(--color-text-maxcontrast);
	font-size: 0.8em;
	white-space: nowrap;
}
</style>
