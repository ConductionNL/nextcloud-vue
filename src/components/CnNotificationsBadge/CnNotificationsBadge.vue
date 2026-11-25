<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  CnNotificationsBadge — the signed-in user's unread Nextcloud notifications
  of one app, as a count in a page header that opens their list.

  Reads the Nextcloud notifications OCS API (GET /apps/notifications/api/v2/
  notifications) and keeps the entries whose `app` is `appId`. A notification
  is unread until it is dismissed, so opening one dismisses it (DELETE on its
  id), lowers the count, and then follows its link. With nothing unread, or
  without the notifications app, the badge draws nothing.
-->
<template>
	<NcPopover
		v-if="items.length > 0"
		v-model:shown="open"
		class="cn-notifications-badge"
		placement="bottom-end">
		<template #trigger>
			<NcButton
				variant="tertiary"
				class="cn-notifications-badge__trigger"
				:aria-label="triggerLabel"
				:title="triggerLabel"
				data-testid="cn-notifications-badge">
				<template #icon>
					<BellOutline :size="20" />
				</template>
				<span class="cn-notifications-badge__count" data-testid="cn-notifications-badge-count">{{ items.length }}</span>
			</NcButton>
		</template>
		<div class="cn-notifications-badge__panel" role="dialog" :aria-label="panelLabel">
			<p class="cn-notifications-badge__heading">
				{{ panelLabel }}
			</p>
			<ul class="cn-notifications-badge__list">
				<li v-for="item in items" :key="item.id">
					<a
						class="cn-notifications-badge__item"
						:href="item.link || '#'"
						data-testid="cn-notifications-badge-item"
						@click.prevent="openItem(item)">
						<img
							v-if="item.icon"
							class="cn-notifications-badge__icon"
							:src="item.icon"
							alt="">
						<BellOutline v-else class="cn-notifications-badge__icon" :size="20" />
						<span class="cn-notifications-badge__text">
							<span class="cn-notifications-badge__subject">{{ item.subject }}</span>
							<span class="cn-notifications-badge__time">{{ item.when }}</span>
						</span>
					</a>
				</li>
			</ul>
		</div>
	</NcPopover>
</template>

<script>
import axios from '@nextcloud/axios'
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import { generateOcsUrl } from '@nextcloud/router'
import { NcButton, NcPopover } from '@nextcloud/vue'
import BellOutline from 'vue-material-design-icons/BellOutline.vue'
import { appNotifications } from '../../utils/appNotifications.js'

const PAGE_REFRESH = 'cn:page:refresh'

export default {
	name: 'CnNotificationsBadge',

	components: {
		BellOutline,
		NcButton,
		NcPopover,
	},

	props: {
		/** The Nextcloud app id whose notifications count (`app` on each notification). */
		appId: {
			type: String,
			required: true,
		},
	},

	data() {
		return {
			items: [],
			open: false,
		}
	},

	computed: {
		/** @return {string} "3 unread notifications". */
		triggerLabel() {
			return n('nextcloud-vue', '%n unread notification', '%n unread notifications', this.items.length)
		},

		/** @return {string} The list's heading. */
		panelLabel() {
			return t('nextcloud-vue', 'Notifications')
		},
	},

	created() {
		this.load()
		subscribe(PAGE_REFRESH, this.onPageRefresh)
	},

	beforeUnmount() {
		unsubscribe(PAGE_REFRESH, this.onPageRefresh)
	},

	methods: {
		/**
		 * Read the user's notifications and keep this app's. A read that
		 * fails (no notifications app, offline) leaves the badge as it was.
		 *
		 * @spec openspec/changes/dashboard-notifications-badge/specs/dashboard-page/spec.md#requirement-a-dashboard-header-counts-the-users-unread-notifications-of-the-app
		 * @return {Promise<boolean>} Whether the read answered.
		 */
		async load() {
			try {
				const response = await axios.get(generateOcsUrl('/apps/notifications/api/v2/notifications'), {
					headers: { 'OCS-APIRequest': 'true' },
					params: { format: 'json' },
				})
				this.items = appNotifications(response?.data, this.appId)
				return true
			} catch {
				return false
			}
		},

		/**
		 * The page refreshes (its Refresh, or `autoRefresh`): read again.
		 *
		 * @param {object} [payload] The refresh payload.
		 * @return {void}
		 */
		onPageRefresh(payload) {
			const done = this.load()
			payload?.waitUntil?.(done)
		},

		/**
		 * Open a notification: dismiss it, so it is read and the count goes
		 * down, then follow its link.
		 *
		 * @spec openspec/changes/dashboard-notifications-badge/specs/dashboard-page/spec.md#requirement-opening-a-notification-marks-it-read
		 * @param {{id: number, link: string}} item The notification.
		 * @return {Promise<void>}
		 */
		async openItem(item) {
			try {
				await axios.delete(generateOcsUrl('/apps/notifications/api/v2/notifications/{id}', { id: item.id }), {
					headers: { 'OCS-APIRequest': 'true' },
				})
			} catch {
				// Still open the item: the user asked for it, and the next
				// read shows the notification again if it was not dismissed.
			}
			this.items = this.items.filter((entry) => entry.id !== item.id)
			this.open = false
			if (item.link) {
				this.navigate(item.link)
			}
		},

		/**
		 * Follow a link (a method, so a test can watch it).
		 *
		 * @param {string} link The notification's link.
		 * @return {void}
		 */
		navigate(link) {
			window.location.assign(link)
		},
	},
}
</script>

<style scoped>
.cn-notifications-badge__count {
	min-width: 20px;
	padding: 0 6px;
	border-radius: var(--border-radius-pill);
	background: var(--color-primary-element);
	color: var(--color-primary-element-text);
	font-size: 12px;
	font-weight: 600;
	line-height: 20px;
	text-align: center;
}

.cn-notifications-badge__panel {
	width: min(360px, 90vw);
	max-height: 60vh;
	overflow: auto;
	padding: calc(2 * var(--default-grid-baseline, 4px));
}

.cn-notifications-badge__heading {
	margin: 0 0 calc(2 * var(--default-grid-baseline, 4px));
	padding: 0 calc(2 * var(--default-grid-baseline, 4px));
	font-weight: 600;
}

.cn-notifications-badge__list {
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-notifications-badge__item {
	display: flex;
	align-items: flex-start;
	gap: calc(2 * var(--default-grid-baseline, 4px));
	min-height: var(--default-clickable-area, 34px);
	padding: calc(2 * var(--default-grid-baseline, 4px));
	border-radius: var(--border-radius-large);
	color: var(--color-main-text);
	text-decoration: none;
}

.cn-notifications-badge__item:hover,
.cn-notifications-badge__item:focus-visible {
	background: var(--color-background-hover);
}

.cn-notifications-badge__icon {
	flex: 0 0 20px;
	width: 20px;
	height: 20px;
}

.cn-notifications-badge__text {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.cn-notifications-badge__subject {
	overflow-wrap: anywhere;
}

.cn-notifications-badge__time {
	color: var(--color-text-maxcontrast);
	font-size: 12px;
}
</style>
