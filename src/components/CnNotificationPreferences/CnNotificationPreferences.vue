<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-notification-preferences" data-testid="cn-notification-preferences">
		<p v-if="adminMode" class="cn-notification-preferences__note" data-testid="cn-np-admin-note">
			{{ adminNote }}
		</p>

		<table class="cn-notification-preferences__table" data-testid="cn-np-table">
			<caption class="cn-notification-preferences__caption">
				{{ tableCaption }}
			</caption>
			<thead>
				<tr>
					<th scope="col">
						{{ eventHeader }}
					</th>
					<th
						v-for="channel in channels"
						:key="`ch-${channel.id}`"
						scope="col"
						data-testid="cn-np-channel-header"
						:data-channel="channel.id">
						{{ channel.label }}
						<span
							v-if="channelState(channel).usable === false"
							class="cn-notification-preferences__muted"
							data-testid="cn-np-channel-unusable">
							{{ channelState(channel).reason || unavailableText }}
						</span>
					</th>
				</tr>
			</thead>

			<tbody v-for="group in groups" :key="`grp-${group.key}`">
				<tr>
					<th :colspan="channels.length + 1" scope="colgroup">
						<button
							class="cn-notification-preferences__group"
							data-testid="cn-np-group"
							:data-group="group.key"
							:aria-expanded="String(!isCollapsed(group.key))"
							@click="toggleGroup(group.key)">
							{{ group.label }}
						</button>
					</th>
				</tr>

				<tr
					v-for="event in group.events"
					v-show="!isCollapsed(group.key)"
					:key="`ev-${event.id}`"
					data-testid="cn-np-row"
					:data-event="event.id">
					<th scope="row">
						{{ event.label }}
						<span
							v-if="event.immediate"
							class="cn-notification-preferences__muted"
							data-testid="cn-np-immediate">
							{{ immediateText }}
						</span>
					</th>

					<td
						v-for="channel in channels"
						:key="`c-${event.id}-${channel.id}`"
						data-testid="cn-np-cell"
						:data-event="event.id"
						:data-channel="channel.id"
						:data-level="cell(event, channel).level">
						<input
							type="checkbox"
							data-testid="cn-np-toggle"
							:data-event="event.id"
							:data-channel="channel.id"
							:checked="cell(event, channel).value"
							:disabled="isLocked(event, channel)"
							:aria-label="cellLabel(event, channel)"
							@change="onToggle(event, channel, $event)">
						<span class="cn-notification-preferences__muted" data-testid="cn-np-source">
							{{ sourceText(event, channel) }}
						</span>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import {
	channelAvailability,
	PREFERENCE_LEVELS,
	resolvePreference,
} from '../../utils/notificationPreference.js'

/**
 * CnNotificationPreferences — one screen where a person chooses what notifies
 * them, and finds out why they are getting what they are getting.
 *
 * Events down, channels across. The catalogue is the host's, so this component
 * never knows what a "term expires" event is.
 *
 * 🔴 IT NEVER SHOWS A SETTING THAT DOES NOT APPLY. That is the whole point of
 * the screen and it is the one way it can fail while looking perfect. Three
 * cases, each handled rather than hidden:
 *
 *   - A FORCED cell is locked, says who forced it and why. An administrator
 *     has taken the choice away; a toggle the person can move which then does
 *     nothing is worse than a locked one, because they believe they acted.
 *   - A channel the instance has not configured is disabled with the reason.
 *   - A channel REFUSED for this kind and recipient says the rule. An internal
 *     notice to an outside recipient is a rule working, not a gap to fix, and
 *     "no channels available" would send somebody to the wrong place.
 *
 * 🔴 IT IS A REAL TABLE. A grid of checkboxes with no row and column headers
 * is unreadable to a screen reader: every cell is "checkbox, checked" with no
 * way to know which event or which channel. The header cells are `th` with
 * scopes, and each toggle carries a name that says both.
 *
 * @event {object} change — A cell was set. Payload: `{ eventId, channelId, value }`.
 */
export default {
	name: 'CnNotificationPreferences',

	props: {
		/**
		 * The events, each `{ id, label, group, groupLabel, immediate,
		 * appDefault }`. From the host's catalogue.
		 */
		events: {
			type: Array,
			default: () => [],
		},

		/** The channels, each `{ id, label, configured, unconfiguredReason }`. */
		channels: {
			type: Array,
			default: () => [],
		},

		/** The group's values, as `{ [eventId]: { [channelId]: boolean } }`. */
		groupValues: {
			type: Object,
			default: () => ({}),
		},

		/** This person's values, same shape. */
		personalValues: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * What an administrator has forced, as
		 * `{ [eventId]: { [channelId]: { value, by, reason } } }`.
		 *
		 * A level ABOVE the person's own rather than another default: it is
		 * the administrator removing the choice, not setting it.
		 */
		forcedValues: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * What the platform refuses for this recipient, same shape, each
		 * `{ reason }`. A refusal is not an absence: it is a rule, and the
		 * screen says which.
		 */
		refusals: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * Whether this is the admin screen writing the group's defaults. The
		 * screen says a person's own value wins, so an administrator is not
		 * surprised when somebody does not get what they set.
		 */
		adminMode: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['change'],

	data() {
		return {
			/** Groups the reader has collapsed, for as long as they are here. */
			collapsed: [],
		}
	},

	computed: {
		/** @return {Array<object>} The events, in their groups. */
		groups() {
			const byKey = new Map()
			for (const event of this.events) {
				const key = String(event?.group ?? '')
				if (byKey.has(key) === false) {
					byKey.set(key, {
						key,
						label: String(event?.groupLabel ?? key) || this.ungroupedText,
						events: [],
					})
				}
				byKey.get(key).events.push(event)
			}
			return [...byKey.values()]
		},

		/** @return {string} The table's caption. */
		tableCaption() {
			return t('nextcloud-vue', 'What notifies you, and over which channel')
		},

		/** @return {string} The events column header. */
		eventHeader() {
			return t('nextcloud-vue', 'Event')
		},

		/** @return {string} What an ungrouped event group is called. */
		ungroupedText() {
			return t('nextcloud-vue', 'Other')
		},

		/** @return {string} What an unusable channel says with no reason given. */
		unavailableText() {
			return t('nextcloud-vue', 'Not available on this instance')
		},

		/** @return {string} What an immediate event says. */
		immediateText() {
			return t('nextcloud-vue', 'Always sent straight away, never held for a digest')
		},

		/** @return {string} What the admin screen says about a person's own value. */
		adminNote() {
			return t('nextcloud-vue', "These are the group's defaults. Somebody who has set their own value keeps it, unless a channel is forced.")
		},
	},

	methods: {
		t,

		/**
		 * Whether a channel can be used at all, for any event.
		 *
		 * @param {object} channel The channel.
		 * @return {object} Its availability.
		 */
		channelState(channel) {
			return channelAvailability({ channel })
		},

		/**
		 * One cell, resolved.
		 *
		 * @param {object} event The event.
		 * @param {object} channel The channel.
		 * @return {object} The resolution.
		 */
		cell(event, channel) {
			return resolvePreference({
				appDefault: event?.appDefault === true,
				groupValue: this.at(this.groupValues, event, channel),
				personalValue: this.at(this.personalValues, event, channel),
				forced: this.at(this.forcedValues, event, channel),
			})
		},

		/**
		 * Whether the platform refuses this channel for this event.
		 *
		 * @param {object} event The event.
		 * @param {object} channel The channel.
		 * @return {object} The availability.
		 */
		cellAvailability(event, channel) {
			return channelAvailability({
				channel,
				refusal: this.at(this.refusals, event, channel),
			})
		},

		/**
		 * A value out of one of the nested maps.
		 *
		 * @param {object} map The map.
		 * @param {object} event The event.
		 * @param {object} channel The channel.
		 * @return {(boolean|object|null)} The value, or null.
		 */
		at(map, event, channel) {
			const row = map?.[event?.id]
			const value = row?.[channel?.id]
			return value === undefined ? null : value
		},

		/**
		 * Whether a cell cannot be changed.
		 *
		 * @param {object} event The event.
		 * @param {object} channel The channel.
		 * @return {boolean} True when it is locked.
		 */
		isLocked(event, channel) {
			return this.cell(event, channel).editable === false
				|| this.cellAvailability(event, channel).usable === false
		},

		/**
		 * What a cell is called to somebody who cannot see the table.
		 *
		 * Says the event, the channel and why it is locked when it is. A
		 * disabled checkbox with no name is a dead end for a screen reader.
		 *
		 * @param {object} event The event.
		 * @param {object} channel The channel.
		 * @return {string} The accessible name.
		 */
		cellLabel(event, channel) {
			const base = t('nextcloud-vue', '{event} over {channel}', {
				event: event.label,
				channel: channel.label,
			})
			const reason = this.lockReason(event, channel)
			return reason === '' ? base : `${base}. ${reason}`
		},

		/**
		 * Why a cell is locked, in words.
		 *
		 * @param {object} event The event.
		 * @param {object} channel The channel.
		 * @return {string} The reason, or the empty string.
		 */
		lockReason(event, channel) {
			const availability = this.cellAvailability(event, channel)
			if (availability.usable === false) {
				return availability.reason || this.unavailableText
			}

			const resolved = this.cell(event, channel)
			if (resolved.editable === true) {
				return ''
			}

			if (resolved.forcedBy !== '' && resolved.reason !== '') {
				return t('nextcloud-vue', 'Set by {by}: {reason}', {
					by: resolved.forcedBy,
					reason: resolved.reason,
				})
			}
			if (resolved.forcedBy !== '') {
				return t('nextcloud-vue', 'Set by {by}, and cannot be changed here', { by: resolved.forcedBy })
			}
			return t('nextcloud-vue', 'Set by an administrator, and cannot be changed here')
		},

		/**
		 * What a cell says under its toggle.
		 *
		 * @param {object} event The event.
		 * @param {object} channel The channel.
		 * @return {string} The sentence.
		 */
		sourceText(event, channel) {
			const locked = this.lockReason(event, channel)
			if (locked !== '') {
				return locked
			}

			const level = this.cell(event, channel).level
			if (level === PREFERENCE_LEVELS.PERSONAL) {
				return t('nextcloud-vue', 'Your choice')
			}
			if (level === PREFERENCE_LEVELS.GROUP) {
				return t('nextcloud-vue', 'Follows your group')
			}
			return t('nextcloud-vue', 'Follows the app default')
		},

		/**
		 * Whether a group is collapsed.
		 *
		 * @param {string} key The group.
		 * @return {boolean} True when collapsed.
		 */
		isCollapsed(key) {
			return this.collapsed.includes(key)
		},

		/**
		 * Collapse a group, or open it again.
		 *
		 * @param {string} key The group.
		 */
		toggleGroup(key) {
			this.collapsed = this.isCollapsed(key)
				? this.collapsed.filter((entry) => entry !== key)
				: [...this.collapsed, key]
		},

		/**
		 * A cell was set.
		 *
		 * @param {object} event The event.
		 * @param {object} channel The channel.
		 * @param {Event} domEvent The change event.
		 */
		onToggle(event, channel, domEvent) {
			// Refuse from here too, not only in the template. A disabled
			// attribute is a rendering; this is the rule.
			if (this.isLocked(event, channel)) {
				return
			}

			/**
			 * @event change A cell was set.
			 * @type {object}
			 */
			this.$emit('change', {
				eventId: event.id,
				channelId: channel.id,
				value: domEvent?.target?.checked === true,
			})
		},
	},
}
</script>

<style scoped lang="scss">
.cn-notification-preferences__table {
	inline-size: 100%;
	border-collapse: collapse;
}

.cn-notification-preferences__caption {
	text-align: start;
	padding-block-end: 8px;
}

.cn-notification-preferences__table th,
.cn-notification-preferences__table td {
	text-align: start;
	padding: 6px 8px;
	border-block-end: 1px solid var(--color-border);
	vertical-align: top;
}

.cn-notification-preferences__muted {
	display: block;
	color: var(--color-text-maxcontrast);
	font-size: 0.85rem;
}

.cn-notification-preferences__group {
	background: none;
	border: none;
	font-weight: bold;
	padding: 8px 0;
	cursor: pointer;
	color: var(--color-main-text);
}

.cn-notification-preferences__note {
	color: var(--color-text-maxcontrast);
}
</style>
