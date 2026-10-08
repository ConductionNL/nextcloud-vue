<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<span class="cn-follow-toggle" data-testid="cn-follow-toggle">
		<NcButton
			:variant="state ? 'secondary' : 'tertiary'"
			:aria-pressed="state ? 'true' : 'false'"
			:title="tooltip"
			:disabled="busy"
			data-testid="cn-follow-toggle-button"
			@click.stop="toggle">
			<template #icon>
				<Bell v-if="state" :size="20" />
				<BellOutline v-else :size="20" />
			</template>
			{{ state ? followingLabel : followLabel }}
		</NcButton>
		<NcPopover
			v-if="count !== null"
			v-model:shown="open"
			placement="bottom-start">
			<template #trigger>
				<NcButton
					variant="tertiary"
					class="cn-follow-toggle__count"
					:aria-label="followersLabel"
					data-testid="cn-follow-toggle-count">
					{{ count }}
				</NcButton>
			</template>
			<div class="cn-follow-toggle__popover" data-testid="cn-follow-toggle-popover">
				<NcLoadingIcon v-if="loadingWatchers" :size="20" :name="loadingLabel" />
				<ul v-else class="cn-follow-toggle__list">
					<li v-for="watcher in watchers" :key="watcher.userId" class="cn-follow-toggle__row">
						<NcAvatar :user="watcher.userId"
							:displayName="watcher.displayName || watcher.userId"
							:size="28"
							hideStatus />
						<span class="cn-follow-toggle__who">
							<span class="cn-follow-toggle__name">{{ watcher.displayName || watcher.userId }}</span>
							<span v-if="watcher.created" class="cn-follow-toggle__since">{{ sinceText(watcher.created) }}</span>
						</span>
						<NcButton
							v-if="canRemove(watcher)"
							variant="tertiary"
							:aria-label="removeFollowerLabel(watcher)"
							:title="removeFollowerLabel(watcher)"
							data-testid="cn-follow-toggle-remove"
							@click="removeWatcher(watcher)">
							<template #icon>
								<Close :size="16" />
							</template>
						</NcButton>
					</li>
				</ul>
				<div v-if="canManage" class="cn-follow-toggle__picker">
					<NcSelect
						:inputLabel="addColleagueLabel"
						:modelValue="null"
						:options="pickerOptions"
						:loading="pickerLoading"
						:filterable="false"
						label="label"
						data-testid="cn-follow-toggle-picker"
						@search="onPickerSearch"
						@update:modelValue="addWatcher" />
				</div>
				<p v-if="popoverError"
					class="cn-follow-toggle__error"
					role="alert"
					data-testid="cn-follow-toggle-error">
					{{ popoverError }}
				</p>
			</div>
		</NcPopover>
	</span>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcAvatar, NcButton, NcLoadingIcon, NcPopover, NcSelect } from '@nextcloud/vue'
import Bell from 'vue-material-design-icons/Bell.vue'
import BellOutline from 'vue-material-design-icons/BellOutline.vue'
import Close from 'vue-material-design-icons/Close.vue'
import { patchStoredSelf } from '../../utils/patchStoredSelf.js'
import { listWatchers, setWatcher, setWatching } from '../../utils/recordInteractions.js'
import { searchNextcloudUsers } from '../../utils/userAutocomplete.js'

/**
 * CnFollowToggle — a Follow toggle bound to a record's `@self.watching` marker,
 * with the follower count and a followers popover for users who may see them.
 *
 * A click flips the toggle at once and sends `PUT` or `DELETE .../watch`; on
 * failure it flips back and shows the server's message, and a 404 says the
 * user can no longer see the record and emits `not-found`. The count shows
 * only when `watcherCount` is given (OpenRegister sets `@self.watcherCount` for
 * a reader with `update` only); opening the popover then fetches
 * `GET .../watchers`, never before, and a 403 closes it quietly. With
 * `canManage` (`@self.can.manage`) the popover offers an "Add a colleague"
 * picker and a remove action on each follower; without it, only the user's own
 * row can be removed.
 *
 * Example:
 * ```vue
 * <CnFollowToggle register="pipelinq" schema="ticket" :object-id="id"
 *   :watching="self.watching" :watcher-count="self.watcherCount" :can-manage="self.can && self.can.manage" />
 * ```
 */
export default {
	name: 'CnFollowToggle',

	components: { Bell, BellOutline, Close, NcAvatar, NcButton, NcLoadingIcon, NcPopover, NcSelect },

	props: {
		/** Register slug of the record. */
		register: {
			type: String,
			required: true,
		},

		/** Schema slug of the record. */
		schema: {
			type: String,
			required: true,
		},

		/** Id of the record. */
		objectId: {
			type: String,
			required: true,
		},

		/** Whether the current user follows the record (`@self.watching`). */
		watching: {
			type: Boolean,
			default: false,
		},

		/** Number of followers (`@self.watcherCount`). Null hides the count and the popover. */
		watcherCount: {
			type: Number,
			default: null,
		},

		/** Whether the user may add and remove other followers (`@self.can.manage`). */
		canManage: {
			type: Boolean,
			default: false,
		},

		/** Whether following sends change notifications. False changes the tooltip to say it does not. */
		notifies: {
			type: Boolean,
			default: true,
		},

		/** User id of the current user. Defaults to Nextcloud's `OC.currentUser`. */
		currentUser: {
			type: String,
			default: '',
		},
	},

	emits: ['change', 'error', 'not-found'],

	data() {
		return {
			state: this.watching,
			count: this.watcherCount,
			busy: false,
			open: false,
			watchers: [],
			loadingWatchers: false,
			popoverError: '',
			pickerOptions: [],
			pickerLoading: false,
		}
	},

	computed: {
		followLabel() {
			return t('nextcloud-vue', 'Follow')
		},

		followingLabel() {
			return t('nextcloud-vue', 'Following')
		},

		loadingLabel() {
			return t('nextcloud-vue', 'Loading …')
		},

		addColleagueLabel() {
			return t('nextcloud-vue', 'Add a colleague')
		},

		followersLabel() {
			return t('nextcloud-vue', '{count} followers', { count: this.count })
		},

		tooltip() {
			return this.notifies
				? t('nextcloud-vue', 'Follow this record to get its updates')
				: t('nextcloud-vue', 'You will see it under Following. This register sends no change notifications.')
		},

		me() {
			return this.currentUser || (typeof OC !== 'undefined' && OC ? OC.currentUser : '') || ''
		},
	},

	watch: {
		watching(value) {
			this.state = value
		},

		watcherCount(value) {
			this.count = value
		},

		open(value) {
			if (value) {
				this.loadWatchers()
			}
		},
	},

	methods: {
		sinceText(created) {
			const d = new Date(created)
			return Number.isNaN(d.getTime())
				? ''
				: t('nextcloud-vue', 'Since {date}', { date: d.toLocaleDateString() })
		},

		removeFollowerLabel(watcher) {
			return t('nextcloud-vue', 'Remove {name} as a follower', { name: watcher.displayName || watcher.userId })
		},

		canRemove(watcher) {
			return this.canManage || (this.me !== '' && watcher.userId === this.me)
		},

		async toggle() {
			if (this.busy) {
				return
			}
			const previous = this.state
			this.state = !previous
			if (this.count !== null) {
				this.count = Math.max(0, this.count + (this.state ? 1 : -1))
			}
			this.busy = true
			const result = await setWatching(this.register, this.schema, this.objectId, this.state)
			this.busy = false
			if (!result.ok) {
				this.state = previous
				if (this.count !== null) {
					this.count = Math.max(0, this.count + (previous ? 1 : -1))
				}
				const message = result.status === 404
					? t('nextcloud-vue', 'You can no longer see this record.')
					: (result.message || t('nextcloud-vue', 'Could not change following.'))
				import('@nextcloud/dialogs').then(({ showError }) => showError(message)).catch(() => {})
				/** @event error Emitted when a call failed; payload is the message shown. */
				this.$emit('error', message)
				if (result.status === 404) {
					/** @event not-found Emitted on a 404: the record went away or access was withdrawn. */
					this.$emit('not-found')
				}
				return
			}
			patchStoredSelf(this.register, this.schema, this.objectId, {
				watching: this.state,
				...(this.count !== null ? { watcherCount: this.count } : {}),
			})
			/** @event change Emitted after a successful call. Payload: `{ watching, count }`. */
			this.$emit('change', { watching: this.state, count: this.count })
		},

		async loadWatchers() {
			this.popoverError = ''
			this.loadingWatchers = true
			const result = await listWatchers(this.register, this.schema, this.objectId)
			this.loadingWatchers = false
			if (!result.ok) {
				// No right to see the list (403) or a failure: close without a toast.
				this.open = false
				return
			}
			const data = result.data || {}
			this.watchers = Array.isArray(data.results) ? data.results : []
			this.count = Number.isFinite(data.total) ? data.total : this.watchers.length
		},

		async onPickerSearch(query) {
			this.pickerLoading = true
			const found = await searchNextcloudUsers(query || '', { limit: 10 })
			const already = new Set(this.watchers.map((w) => w.userId))
			this.pickerOptions = found.filter((u) => !already.has(u.id)).map((u) => ({ ...u, label: u.label || u.displayName || u.id }))
			this.pickerLoading = false
		},

		async addWatcher(option) {
			if (!option || !option.id) {
				return
			}
			this.popoverError = ''
			const result = await setWatcher(this.register, this.schema, this.objectId, option.id, true)
			if (!result.ok) {
				this.popoverError = result.message || t('nextcloud-vue', 'Could not add this colleague.')
				return
			}
			await this.loadWatchers()
		},

		async removeWatcher(watcher) {
			this.popoverError = ''
			const result = await setWatcher(this.register, this.schema, this.objectId, watcher.userId, false)
			if (!result.ok) {
				this.popoverError = result.message || t('nextcloud-vue', 'Could not remove this follower.')
				return
			}
			if (watcher.userId === this.me) {
				this.state = false
				this.$emit('change', { watching: false, count: this.count })
			}
			await this.loadWatchers()
		},
	},
}
</script>

<style scoped>
.cn-follow-toggle {
	display: inline-flex;
	align-items: center;
	gap: 4px;
}

.cn-follow-toggle__popover {
	min-width: 260px;
	padding: 12px;
}

.cn-follow-toggle__list {
	list-style: none;
	margin: 0 0 8px;
	padding: 0;
}

.cn-follow-toggle__row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 4px 0;
}

.cn-follow-toggle__who {
	display: flex;
	flex-direction: column;
	flex: 1 1 auto;
	min-width: 0;
}

.cn-follow-toggle__since {
	color: var(--color-text-maxcontrast);
	font-size: var(--font-size-small, 13px);
}

.cn-follow-toggle__error {
	margin: 8px 0 0;
	color: var(--color-error-text);
}
</style>
