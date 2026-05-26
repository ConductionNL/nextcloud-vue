<template>
	<NcAppSettingsSection id="notifications" :name="t('nextcloud-vue', 'Notifications')">
		<NcLoadingIcon v-if="loading" :size="24" />

		<NcEmptyContent v-else-if="error"
			:name="t('nextcloud-vue', 'Notification preferences unavailable')"
			:description="t('nextcloud-vue', 'Notification preferences are provided by OpenRegister and could not be loaded here.')">
			<template #icon>
				<BellOffOutline :size="20" />
			</template>
		</NcEmptyContent>

		<NcEmptyContent v-else-if="entries.length === 0"
			:name="t('nextcloud-vue', 'No notifications')"
			:description="t('nextcloud-vue', 'This app does not declare any notifications yet.')">
			<template #icon>
				<BellOutline :size="20" />
			</template>
		</NcEmptyContent>

		<div v-else class="cn-notif-prefs">
			<p class="cn-notif-prefs__intro">
				{{ t('nextcloud-vue', 'Choose which notifications you want to receive. Items you leave unchanged use the app default.') }}
			</p>
			<div v-for="group in groupedEntries" :key="group.schema" class="cn-notif-prefs__group">
				<h4 class="cn-notif-prefs__group-title">
					{{ group.schemaTitle }}
				</h4>
				<div v-for="entry in group.items" :key="entry.key" class="cn-notif-prefs__row">
					<NcCheckboxRadioSwitch type="switch"
						:checked="entry.enabled"
						:disabled="entry.saving"
						@update:checked="onToggle(entry, $event)">
						{{ notificationLabel(entry.notification) }}
					</NcCheckboxRadioSwitch>
					<NcButton v-if="entry.source === 'user-override'"
						type="tertiary"
						:disabled="entry.saving"
						@click="onReset(entry)">
						{{ t('nextcloud-vue', 'Reset to default') }}
					</NcButton>
				</div>
			</div>
		</div>
	</NcAppSettingsSection>
</template>

<script>
/**
 * CnNotificationPreferences
 *
 * A self-contained `NcAppSettingsSection` that lets the current user turn
 * the notifications declared by their accessible schemas on or off. It reads
 * the effective preferences (schema default merged with the user's overrides)
 * and writes override-only values, both via OpenRegister's
 * `/api/notification-preferences` endpoint:
 *
 *   GET  → { results: [{ schema, schemaTitle, notification, enabled, channels, source }], total }
 *   PUT  → { schema, notification, enabled } | { schema, notification, reset: true }
 *
 * Preferences are override-only: leaving an item unchanged keeps the app
 * default, so apps that add new schemas/notifications keep working without
 * any per-user migration. Designed to render inside CnAppRoot's
 * `#user-settings` slot (its default fallback mounts this component).
 */
import { NcAppSettingsSection, NcButton, NcCheckboxRadioSwitch, NcEmptyContent, NcLoadingIcon } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import axios from '@nextcloud/axios'
import BellOutline from 'vue-material-design-icons/BellOutline.vue'
import BellOffOutline from 'vue-material-design-icons/BellOffOutline.vue'

const PREFS_PATH = '/apps/openregister/api/notification-preferences'

export default {
	name: 'CnNotificationPreferences',
	components: {
		NcAppSettingsSection,
		NcButton,
		NcCheckboxRadioSwitch,
		NcEmptyContent,
		NcLoadingIcon,
		BellOutline,
		BellOffOutline,
	},
	data() {
		return {
			loading: true,
			error: false,
			entries: [],
		}
	},
	computed: {
		/**
		 * Group the flat effective-preference list by schema for display.
		 *
		 * @return {Array<{schema: string, schemaTitle: string, items: Array}>} Grouped entries.
		 */
		groupedEntries() {
			const groups = new Map()
			for (const entry of this.entries) {
				if (!groups.has(entry.schema)) {
					groups.set(entry.schema, {
						schema: entry.schema,
						schemaTitle: entry.schemaTitle || entry.schema,
						items: [],
					})
				}
				groups.get(entry.schema).items.push(entry)
			}
			return Array.from(groups.values())
		},
	},
	mounted() {
		this.load()
	},
	methods: {
		t,

		/**
		 * Load the current user's effective notification preferences.
		 *
		 * @return {Promise<void>}
		 */
		async load() {
			this.loading = true
			this.error = false
			try {
				const { data } = await axios.get(generateUrl(PREFS_PATH))
				const results = Array.isArray(data?.results) ? data.results : []
				this.entries = results.map((e) => ({
					...e,
					key: `${e.schema}/${e.notification}`,
					enabled: e.enabled === true,
					saving: false,
				}))
			} catch (e) {
				this.error = true
			} finally {
				this.loading = false
			}
		},

		/**
		 * Persist an on/off override for a single notification.
		 *
		 * @param {object}  entry   The preference row.
		 * @param {boolean} checked The new on/off value.
		 * @return {Promise<void>}
		 */
		async onToggle(entry, checked) {
			const previous = entry.enabled
			entry.saving = true
			entry.enabled = checked
			try {
				await axios.put(generateUrl(PREFS_PATH), {
					schema: entry.schema,
					notification: entry.notification,
					enabled: checked,
				})
				entry.source = 'user-override'
			} catch (e) {
				entry.enabled = previous
				this.showError(t('nextcloud-vue', 'Could not save notification preference'))
			} finally {
				entry.saving = false
			}
		},

		/**
		 * Clear a user override so the schema default applies again.
		 *
		 * @param {object} entry The preference row.
		 * @return {Promise<void>}
		 */
		async onReset(entry) {
			entry.saving = true
			try {
				await axios.put(generateUrl(PREFS_PATH), {
					schema: entry.schema,
					notification: entry.notification,
					reset: true,
				})
				await this.load()
			} catch (e) {
				this.showError(t('nextcloud-vue', 'Could not reset notification preference'))
				entry.saving = false
			}
		},

		/**
		 * Human-readable label for a notification key, falling back to the key.
		 *
		 * @param {string} key The notification annotation key.
		 * @return {string} A display label.
		 */
		notificationLabel(key) {
			const known = {
				object_created: t('nextcloud-vue', 'When an item is created'),
				object_updated: t('nextcloud-vue', 'When an item is updated'),
				object_transitioned: t('nextcloud-vue', 'When an item is assigned or changes status'),
			}
			return known[key] || key
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
.cn-notif-prefs__intro {
	margin-bottom: 12px;
	color: var(--color-text-maxcontrast);
}

.cn-notif-prefs__group {
	margin-bottom: 16px;
}

.cn-notif-prefs__group-title {
	margin: 8px 0 4px;
	font-weight: bold;
}

.cn-notif-prefs__row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 2px 0;
}
</style>
