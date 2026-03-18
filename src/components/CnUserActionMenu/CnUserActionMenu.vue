<!--
  CnUserActionMenu — Popover menu triggered by clicking a user name.

  Shows avatar, display name, and contextual actions (message, chat, email, meeting)
  based on which Nextcloud apps are installed (Talk, Mail, Calendar).
-->
<template>
	<span class="cn-user-action-menu">
		<span
			ref="trigger"
			class="cn-user-action-menu__trigger"
			:class="{ 'cn-user-action-menu__trigger--interactive': interactive }"
			role="button"
			:tabindex="interactive ? 0 : -1"
			:aria-haspopup="interactive ? 'menu' : undefined"
			@click="interactive && openMenu()"
			@keydown.enter.prevent="interactive && openMenu()"
			@keydown.space.prevent="interactive && openMenu()">
			<slot>{{ displayName }}</slot>
		</span>

		<NcPopover
			v-if="interactive"
			:shown.sync="isOpen"
			:trigger="triggerElements"
			placement="bottom-start"
			@after-hide="onClose">
			<div
				class="cn-user-action-menu__popover"
				role="menu"
				:aria-label="'Actions for ' + displayName"
				@keydown.escape.prevent="closeMenu">
				<!-- User info header -->
				<div class="cn-user-action-menu__header">
					<NcAvatar
						:user="userId"
						:display-name="displayName"
						:size="36"
						:show-user-status="false" />
					<div class="cn-user-action-menu__user-info">
						<span class="cn-user-action-menu__display-name">{{ displayName }}</span>
						<span v-if="userEmail" class="cn-user-action-menu__email">{{ userEmail }}</span>
					</div>
				</div>

				<!-- Action buttons -->
				<div class="cn-user-action-menu__actions">
					<NcActionButton
						v-if="hasTalk"
						role="menuitem"
						@click="sendMessage">
						<template #icon>
							<MessageTextOutline :size="20" />
						</template>
						{{ sendMessageLabel }}
					</NcActionButton>

					<NcActionButton
						v-if="hasTalk"
						role="menuitem"
						@click="startChat">
						<template #icon>
							<ChatOutline :size="20" />
						</template>
						{{ startChatLabel }}
					</NcActionButton>

					<NcActionButton
						v-if="showEmailAction"
						role="menuitem"
						@click="sendEmail">
						<template #icon>
							<EmailOutline :size="20" />
						</template>
						{{ sendEmailLabel }}
					</NcActionButton>

					<NcActionButton
						v-if="hasCalendar"
						role="menuitem"
						@click="planMeeting">
						<template #icon>
							<CalendarOutline :size="20" />
						</template>
						{{ planMeetingLabel }}
					</NcActionButton>

					<div
						v-if="!hasTalk && !showEmailAction && !hasCalendar"
						class="cn-user-action-menu__no-actions">
						{{ noActionsLabel }}
					</div>
				</div>
			</div>
		</NcPopover>
	</span>
</template>

<script>
import { NcPopover, NcActionButton, NcAvatar } from '@nextcloud/vue'

import MessageTextOutline from 'vue-material-design-icons/MessageTextOutline.vue'
import ChatOutline from 'vue-material-design-icons/ChatOutline.vue'
import EmailOutline from 'vue-material-design-icons/EmailOutline.vue'
import CalendarOutline from 'vue-material-design-icons/CalendarOutline.vue'

import { buildHeaders } from '../../utils/index.js'

// Module-level capabilities cache (shared across all instances, fetched once per session)
let _capabilitiesCache = null
let _capabilitiesPromise = null

/**
 * CnUserActionMenu — Popover with user communication actions.
 *
 * Shows contextual actions based on installed Nextcloud apps (Talk, Mail, Calendar).
 * Uses @nextcloud/capabilities when available, falls back to OCS API.
 *
 * @example Usage in notes/tasks cards
 * <CnUserActionMenu
 *   :user-id="note.actorId || note.author"
 *   :display-name="note.actorDisplayName || note.author || 'Unknown'" />
 */
export default {
	name: 'CnUserActionMenu',

	components: {
		NcPopover,
		NcActionButton,
		NcAvatar,
		MessageTextOutline,
		ChatOutline,
		EmailOutline,
		CalendarOutline,
	},

	props: {
		/** The Nextcloud user ID */
		userId: {
			type: String,
			required: true,
		},
		/** The user's display name */
		displayName: {
			type: String,
			default: 'Unknown',
		},
		/** Whether the menu is interactive (false for current user or system accounts) */
		interactive: {
			type: Boolean,
			default: true,
		},

		// --- Pre-translated labels ---
		sendMessageLabel: { type: String, default: 'Send message' },
		startChatLabel: { type: String, default: 'Start chat' },
		sendEmailLabel: { type: String, default: 'Send email' },
		planMeetingLabel: { type: String, default: 'Plan meeting' },
		noActionsLabel: { type: String, default: 'No communication apps available' },
	},

	emits: ['action'],

	data() {
		return {
			isOpen: false,
			hasTalk: false,
			hasMail: false,
			hasCalendar: false,
			userEmail: '',
			emailResolved: false,
			triggerElements: [],
		}
	},

	computed: {
		showEmailAction() {
			return !!this.userEmail
		},
	},

	mounted() {
		this.triggerElements = [this.$refs.trigger]
		this.detectCapabilities()
	},

	methods: {
		openMenu() {
			if (!this.interactive) return
			this.isOpen = true
			// Resolve email on first open if not yet done
			if (!this.emailResolved) {
				this.resolveUserEmail()
			}
		},

		closeMenu() {
			this.isOpen = false
		},

		onClose() {
			this.isOpen = false
			// Return focus to trigger
			if (this.$refs.trigger) {
				this.$refs.trigger.focus()
			}
		},

		async detectCapabilities() {
			if (_capabilitiesCache) {
				this.applyCapabilities(_capabilitiesCache)
				return
			}

			// Try @nextcloud/capabilities first (synchronous, from initial state)
			try {
				// eslint-disable-next-line n/no-missing-import
				const { getCapabilities } = await import('@nextcloud/capabilities')
				const caps = getCapabilities()
				if (caps) {
					_capabilitiesCache = caps
					this.applyCapabilities(caps)
					return
				}
			} catch {
				// Package not available, fall back to API
			}

			// Fallback: fetch from OCS API (once per session)
			if (!_capabilitiesPromise) {
				_capabilitiesPromise = this.fetchCapabilities()
			}
			const caps = await _capabilitiesPromise
			if (caps) {
				_capabilitiesCache = caps
				this.applyCapabilities(caps)
			}
		},

		async fetchCapabilities() {
			try {
				const response = await fetch('/ocs/v2.php/cloud/capabilities?format=json', {
					headers: buildHeaders(),
				})
				if (response.ok) {
					const data = await response.json()
					return data?.ocs?.data?.capabilities || {}
				}
			} catch (err) {
				console.error('CnUserActionMenu: Failed to fetch capabilities', err)
			}
			return {}
		},

		applyCapabilities(caps) {
			this.hasTalk = !!caps?.spreed
			this.hasCalendar = !!caps?.dav
			this.hasMail = !!caps?.mail
		},

		async resolveUserEmail() {
			this.emailResolved = true
			try {
				const response = await fetch(
					`/ocs/v2.php/cloud/users/${encodeURIComponent(this.userId)}?format=json`,
					{
						headers: {
							...buildHeaders(),
							'OCS-APIREQUEST': 'true',
						},
					},
				)
				if (response.ok) {
					const data = await response.json()
					this.userEmail = data?.ocs?.data?.email || ''
				}
			} catch (err) {
				console.error('CnUserActionMenu: Failed to resolve user email', err)
				this.userEmail = ''
			}
		},

		async sendMessage() {
			try {
				const response = await fetch('/ocs/v2.php/apps/spreed/api/v4/room', {
					method: 'POST',
					headers: {
						...buildHeaders(),
						'OCS-APIREQUEST': 'true',
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ roomType: 1, invite: this.userId }),
				})
				if (response.ok) {
					const data = await response.json()
					const token = data?.ocs?.data?.token
					if (token) {
						window.location.href = `/apps/spreed/#/call/${token}`
					}
				} else {
					this.showActionError('Failed to create conversation')
				}
			} catch (err) {
				console.error('CnUserActionMenu: Failed to send message', err)
				this.showActionError('Failed to create conversation')
			}
			this.$emit('action', { type: 'message', userId: this.userId })
		},

		async startChat() {
			try {
				const response = await fetch('/ocs/v2.php/apps/spreed/api/v4/room', {
					method: 'POST',
					headers: {
						...buildHeaders(),
						'OCS-APIREQUEST': 'true',
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ roomType: 1, invite: this.userId }),
				})
				if (response.ok) {
					const data = await response.json()
					const token = data?.ocs?.data?.token
					if (token) {
						window.open(`/apps/spreed/#/call/${token}`, '_blank')
					}
				} else {
					this.showActionError('Failed to create conversation')
				}
			} catch (err) {
				console.error('CnUserActionMenu: Failed to start chat', err)
				this.showActionError('Failed to create conversation')
			}
			this.$emit('action', { type: 'chat', userId: this.userId })
		},

		sendEmail() {
			if (!this.userEmail) return
			if (this.hasMail) {
				window.location.href = `/apps/mail/compose?to=${encodeURIComponent(this.userEmail)}`
			} else {
				window.location.href = `mailto:${this.userEmail}`
			}
			this.closeMenu()
			this.$emit('action', { type: 'email', userId: this.userId })
		},

		planMeeting() {
			window.location.href = `/apps/calendar/new?attendees=${encodeURIComponent(this.userId)}&title=Meeting`
			this.closeMenu()
			this.$emit('action', { type: 'meeting', userId: this.userId })
		},

		showActionError(message) {
			try {
				// eslint-disable-next-line n/no-missing-import
				import('@nextcloud/dialogs').then(({ showError }) => {
					showError(message)
				})
			} catch {
				console.error(message)
			}
		},
	},
}
</script>

<style scoped>
.cn-user-action-menu {
	display: inline;
}

.cn-user-action-menu__trigger--interactive {
	cursor: pointer;
	color: var(--color-primary-element);
	font-weight: 600;
}

.cn-user-action-menu__trigger--interactive:hover {
	text-decoration: underline;
}

.cn-user-action-menu__trigger--interactive:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
	border-radius: var(--border-radius);
}

.cn-user-action-menu__popover {
	min-width: 220px;
	padding: 8px 0;
}

.cn-user-action-menu__header {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 8px 12px 12px;
	border-bottom: 1px solid var(--color-border);
	margin-bottom: 4px;
}

.cn-user-action-menu__user-info {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.cn-user-action-menu__display-name {
	font-weight: 600;
	font-size: 14px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-user-action-menu__email {
	font-size: 12px;
	color: var(--color-text-maxcontrast);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-user-action-menu__actions {
	padding: 4px 0;
}

.cn-user-action-menu__no-actions {
	padding: 12px 16px;
	text-align: center;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}
</style>
