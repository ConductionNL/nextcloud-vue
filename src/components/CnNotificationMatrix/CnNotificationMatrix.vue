<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-notification-matrix" data-testid="cn-notification-matrix">
		<p v-if="adminMode" class="cn-notification-matrix__note" data-testid="cn-nm-admin-note">
			{{ adminNote }}
		</p>

		<table class="cn-notification-matrix__table" data-testid="cn-nm-table">
			<caption class="cn-notification-matrix__caption">
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
						data-testid="cn-nm-channel-header"
						:data-channel="channel.id">
						{{ channel.label }}
						<span
							v-if="channelState(channel).usable === false"
							class="cn-notification-matrix__muted"
							data-testid="cn-nm-channel-unusable">
							{{ channelState(channel).reason || unavailableText }}
						</span>

						<template v-if="channelState(channel).usable !== false">
							<label class="cn-notification-matrix__muted">
								{{ digestLabel }}
								<select
									data-testid="cn-nm-digest-mode"
									:data-channel="channel.id"
									:value="digestFor(channel).mode"
									@change="onDigestMode(channel, $event)">
									<option
										v-for="mode in digestModes"
										:key="`dm-${channel.id}-${mode.id}`"
										:value="mode.id">
										{{ mode.label }}
									</option>
								</select>
							</label>

							<label
								v-if="digestFor(channel).mode !== 'off'"
								class="cn-notification-matrix__muted">
								{{ digestTimeLabel }}
								<input
									type="time"
									data-testid="cn-nm-digest-time"
									:data-channel="channel.id"
									:value="digestFor(channel).timeOfDay"
									@change="onDigestTime(channel, $event)">
							</label>

							<span
								v-if="digestFor(channel).mode !== 'off'"
								class="cn-notification-matrix__muted"
								data-testid="cn-nm-digest-immediate-note">
								{{ digestImmediateNote }}
							</span>

							<button
								class="cn-notification-matrix__test"
								data-testid="cn-nm-test-send"
								:data-channel="channel.id"
								:aria-label="testSendLabel(channel)"
								@click="onTestSend(channel)">
								{{ testSendText }}
							</button>

							<span
								v-if="testResultFor(channel) !== null"
								class="cn-notification-matrix__muted"
								data-testid="cn-nm-test-result"
								:data-channel="channel.id"
								:data-ok="String(testResultFor(channel).ok === true)"
								role="status">
								{{ testResultText(channel) }}
							</span>
						</template>
					</th>
				</tr>
			</thead>

			<tbody v-for="group in groups" :key="`grp-${group.key}`">
				<tr>
					<th :colspan="channels.length + 1" scope="colgroup">
						<button
							class="cn-notification-matrix__group"
							data-testid="cn-nm-group"
							:data-group="group.key"
							:aria-expanded="String(!isCollapsed(group.key))"
							@click="toggleGroup(group.key)">
							{{ group.label }}
						</button>
					</th>
				</tr>

				<tr
					v-for="row in rowsFor(group)"
					v-show="!isCollapsed(group.key)"
					:key="`ev-${row.event.id}-${row.scope}`"
					data-testid="cn-nm-row"
					:class="{ 'cn-notification-matrix__row--scoped': !row.isGlobal }"
					:data-event="row.event.id"
					:data-scope="row.scope">
					<th scope="row" :class="{ 'cn-notification-matrix__scope': !row.isGlobal }">
						<template v-if="row.isGlobal">
							{{ row.event.label }}
							<span
								v-if="row.event.immediate"
								class="cn-notification-matrix__muted"
								data-testid="cn-nm-immediate">
								{{ immediateText }}
							</span>

							<select
								v-if="addableScopes(row.event).length > 0"
								class="cn-notification-matrix__muted"
								data-testid="cn-nm-add-scope"
								:data-event="row.event.id"
								:aria-label="addScopeLabel(row.event)"
								value=""
								@change="onAddScope(row.event, $event)">
								<option value="">
									{{ addScopeText }}
								</option>
								<option
									v-for="choice in addableScopes(row.event)"
									:key="`sc-${row.event.id}-${choice.id}`"
									:value="choice.id">
									{{ choice.label }}
								</option>
							</select>
						</template>
						<template v-else>
							<span data-testid="cn-nm-scope-label">{{ scopeLabel(row.scope) }}</span>
						</template>
					</th>

					<td
						v-for="channel in channels"
						:key="`c-${row.event.id}-${row.scope}-${channel.id}`"
						data-testid="cn-nm-cell"
						:data-event="row.event.id"
						:data-scope="row.scope"
						:data-channel="channel.id"
						:data-level="cellFor(row.event, channel, row.scope).level">
						<input
							type="checkbox"
							data-testid="cn-nm-toggle"
							:data-event="row.event.id"
							:data-scope="row.scope"
							:data-channel="channel.id"
							:checked="cellFor(row.event, channel, row.scope).value"
							:disabled="isLockedFor(row.event, channel, row.scope)"
							:aria-label="cellLabelFor(row.event, channel, row.scope)"
							@change="onToggle(row.event, channel, $event, row.scope)">
						<span class="cn-notification-matrix__muted" data-testid="cn-nm-source">
							{{ sourceTextFor(row.event, channel, row.scope) }}
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
import {
	GLOBAL_SCOPE,
	scopeRowsFor,
	valueForScope,
} from '../../utils/preferenceScopes.js'

/**
 * CnNotificationMatrix — one screen where a person chooses what notifies them,
 * and finds out why they are getting what they are getting.
 *
 * 🔴 IT DOES NOT REPLACE `CnNotificationPreferences`, IT SITS BESIDE IT. That
 * component is a self-contained settings pane: it takes no props, fetches for
 * itself and scopes to the app whose settings modal is open, and `CnAppRoot`
 * mounts it as the default of its `#user-settings` slot. This one takes a
 * catalogue from its host, knows four levels rather than two and has a channel
 * axis. Replacing the older one in place, which an earlier revision of this
 * change did, left every app that mounts it through `CnAppRoot` rendering an
 * empty table with no error: a silent regression, not a breakage anybody would
 * see in a test.
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
 * 🔴 A PREFERENCE IS SET GLOBALLY OR FOR ONE CASE DOMAIN. "Tell me when a term
 * expires" is usually too much and "never" is too little, so the event row is
 * the global one and scoped rows sit indented under it. The narrower row wins
 * only where it applies: everywhere else the global row still stands, because
 * a scope that replaced it would silence every other domain the moment
 * somebody narrowed one.
 *
 * 🔴 ONLY EVENTS IN THE CATALOGUE ARE LISTED. A stored preference for an event
 * that no longer exists is not rendered, because a switch for something that
 * can no longer happen is a lie; the store drops it on the next write.
 *
 * 🔴 A TEST SEND REPORTS WHAT HAPPENED, INCLUDING A REFUSAL. Nobody should have
 * to wait for a real event to find out a channel is broken, and a button that
 * silently did nothing would read as proof the channel works.
 *
 * @event {object} change — A cell was set. Payload: `{ eventId, channelId, scope, value }`.
 * @event {object} add-scope — A scope was added to a row. Payload: `{ eventId, scope }`.
 * @event {object} digest-change — A channel's digest was set. Payload: `{ channelId, mode, timeOfDay }`.
 * @event {object} test-send — A test was asked for. Payload: `{ channelId }`.
 */
export default {
	name: 'CnNotificationMatrix',

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

		/**
		 * This person's narrower values, as
		 * `{ [eventId]: { [channelId]: { [scope]: boolean } } }`.
		 *
		 * Separate from `personalValues` rather than replacing it, so the
		 * global row keeps the flat shape every existing caller passes. A row
		 * left unset here falls through to the global value, which is what
		 * makes an absent scoped row an unanswered question rather than a no.
		 */
		scopedValues: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * The scopes a row can be narrowed to, each `{ id, label }`. Case
		 * domains or record types, named by whoever configured the app.
		 */
		scopeChoices: {
			type: Array,
			default: () => [],
		},

		/**
		 * The digest per channel, as `{ [channelId]: { mode, timeOfDay } }`
		 * where mode is `off`, `daily` or `weekly`.
		 */
		digest: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * The last test send per channel, as
		 * `{ [channelId]: { ok, message } }`. A refusal belongs here as much
		 * as a success: both are results.
		 */
		testResults: {
			type: Object,
			default: () => ({}),
		},
	},

	emits: ['change', 'add-scope', 'digest-change', 'test-send'],

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

		/** @return {Array<object>} The digest choices, in the order they escalate. */
		digestModes() {
			return [
				{ id: 'off', label: t('nextcloud-vue', 'Send each one as it happens') },
				{ id: 'daily', label: t('nextcloud-vue', 'Once a day') },
				{ id: 'weekly', label: t('nextcloud-vue', 'Once a week') },
			]
		},

		/** @return {string} What the digest control is called. */
		digestLabel() {
			return t('nextcloud-vue', 'Bundle these')
		},

		/** @return {string} What the time control is called. */
		digestTimeLabel() {
			return t('nextcloud-vue', 'Time of day')
		},

		/** @return {string} What a digest says about the events it cannot hold. */
		digestImmediateNote() {
			return t('nextcloud-vue', 'Events marked as urgent are still sent straight away.')
		},

		/** @return {string} What the test button says. */
		testSendText() {
			return t('nextcloud-vue', 'Send a test')
		},

		/** @return {string} What the add-a-scope control says when nothing is chosen. */
		addScopeText() {
			return t('nextcloud-vue', 'Set this for one kind of case')
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
			return this.cellFor(event, channel, GLOBAL_SCOPE)
		},

		/**
		 * One cell on one row, resolved.
		 *
		 * The scoped value is a NARROWER ANSWER TO THE SAME QUESTION, not a
		 * separate preference, so an unset scoped cell falls back to the
		 * person's global value and from there to the group and the default.
		 * Reading an unset scoped cell as false would override both.
		 *
		 * @param {object} event The event.
		 * @param {object} channel The channel.
		 * @param {string} scope The scope of this row.
		 * @return {object} The resolution.
		 */
		cellFor(event, channel, scope = GLOBAL_SCOPE) {
			const narrow = valueForScope({
				values: this.scopedValues,
				eventId: event?.id,
				channelId: channel?.id,
				scope,
			})

			return resolvePreference({
				appDefault: event?.appDefault === true,
				groupValue: this.at(this.groupValues, event, channel),
				personalValue: narrow.value === null
					? this.at(this.personalValues, event, channel)
					: narrow.value,
				forced: this.at(this.forcedValues, event, channel),
			})
		},

		/**
		 * The rows one group renders: each event, then its scopes.
		 *
		 * Only events in the catalogue. A stored preference for an event the
		 * catalogue no longer has is not listed, because a switch for
		 * something that can no longer happen is a lie.
		 *
		 * @param {object} group The group.
		 * @return {Array<object>} `{ event, scope, isGlobal }`.
		 */
		rowsFor(group) {
			const rows = []
			for (const event of group.events) {
				for (const row of scopeRowsFor({ values: this.scopedValues, eventId: event.id })) {
					rows.push({ event, scope: row.scope, isGlobal: row.isGlobal })
				}
			}
			return rows
		},

		/**
		 * The scopes this row can still be narrowed to.
		 *
		 * @param {object} event The event.
		 * @return {Array<object>} The remaining choices.
		 */
		addableScopes(event) {
			const taken = new Set(scopeRowsFor({ values: this.scopedValues, eventId: event?.id })
				.map((row) => row.scope))
			return this.scopeChoices.filter((choice) => taken.has(String(choice?.id)) === false)
		},

		/**
		 * What a scope is called on screen.
		 *
		 * @param {string} scope The scope.
		 * @return {string} Its label, or the id when nobody named it.
		 */
		scopeLabel(scope) {
			const choice = this.scopeChoices.find((entry) => String(entry?.id) === scope)
			return String(choice?.label ?? scope)
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
			return this.isLockedFor(event, channel, GLOBAL_SCOPE)
		},

		/**
		 * Whether a cell on one row cannot be changed.
		 *
		 * @param {object} event The event.
		 * @param {object} channel The channel.
		 * @param {string} scope The scope of this row.
		 * @return {boolean} True when it is locked.
		 */
		isLockedFor(event, channel, scope = GLOBAL_SCOPE) {
			return this.cellFor(event, channel, scope).editable === false
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
			return this.cellLabelFor(event, channel, GLOBAL_SCOPE)
		},

		/**
		 * What a cell is called, saying which row it is on.
		 *
		 * A scoped row is indented, and indentation is invisible to a screen
		 * reader: without the scope in the name, two checkboxes for the same
		 * event and channel are indistinguishable.
		 *
		 * @param {object} event The event.
		 * @param {object} channel The channel.
		 * @param {string} scope The scope of this row.
		 * @return {string} The accessible name.
		 */
		cellLabelFor(event, channel, scope = GLOBAL_SCOPE) {
			const base = scope === GLOBAL_SCOPE
				? t('nextcloud-vue', '{event} over {channel}', {
						event: event.label,
						channel: channel.label,
					})
				: t('nextcloud-vue', '{event} over {channel}, for {scope}', {
						event: event.label,
						channel: channel.label,
						scope: this.scopeLabel(scope),
					})
			const reason = this.lockReasonFor(event, channel, scope)
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
			return this.lockReasonFor(event, channel, GLOBAL_SCOPE)
		},

		/**
		 * Why a cell on one row is locked, in words.
		 *
		 * @param {object} event The event.
		 * @param {object} channel The channel.
		 * @param {string} scope The scope of this row.
		 * @return {string} The reason, or the empty string.
		 */
		lockReasonFor(event, channel, scope = GLOBAL_SCOPE) {
			const availability = this.cellAvailability(event, channel)
			if (availability.usable === false) {
				return availability.reason || this.unavailableText
			}

			const resolved = this.cellFor(event, channel, scope)
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
			return this.sourceTextFor(event, channel, GLOBAL_SCOPE)
		},

		/**
		 * What a cell on one row says under its toggle.
		 *
		 * @param {object} event The event.
		 * @param {object} channel The channel.
		 * @param {string} scope The scope of this row.
		 * @return {string} The sentence.
		 */
		sourceTextFor(event, channel, scope = GLOBAL_SCOPE) {
			const locked = this.lockReasonFor(event, channel, scope)
			if (locked !== '') {
				return locked
			}

			const narrow = valueForScope({
				values: this.scopedValues,
				eventId: event?.id,
				channelId: channel?.id,
				scope,
			})
			if (scope !== GLOBAL_SCOPE && narrow.scope === GLOBAL_SCOPE) {
				// Said out loud, because an unanswered narrower question looks
				// exactly like an answered one: the checkbox shows the same
				// state either way.
				return t('nextcloud-vue', 'Follows the row above')
			}

			const level = this.cellFor(event, channel, scope).level
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
		 * @param {string} scope The scope of the row it is on.
		 */
		onToggle(event, channel, domEvent, scope = GLOBAL_SCOPE) {
			// Refuse from here too, not only in the template. A disabled
			// attribute is a rendering; this is the rule.
			if (this.isLockedFor(event, channel, scope)) {
				return
			}

			/**
			 * @event change A cell was set.
			 * @type {object}
			 */
			this.$emit('change', {
				eventId: event.id,
				channelId: channel.id,
				scope,
				value: domEvent?.target?.checked === true,
			})
		},

		/**
		 * A scope was added to a row, from the row itself.
		 *
		 * @param {object} event The event.
		 * @param {Event} domEvent The change event.
		 */
		onAddScope(event, domEvent) {
			const scope = String(domEvent?.target?.value ?? '')
			if (scope === '') {
				return
			}

			// Back to the placeholder, so the control reads as an action
			// rather than as a setting that now says something.
			if (domEvent?.target) {
				domEvent.target.value = ''
			}

			/**
			 * @event add-scope A row was narrowed.
			 * @type {object}
			 */
			this.$emit('add-scope', { eventId: event.id, scope })
		},

		/**
		 * What a channel's digest is set to.
		 *
		 * @param {object} channel The channel.
		 * @return {object} `{ mode, timeOfDay }`.
		 */
		digestFor(channel) {
			const set = this.digest?.[channel?.id]
			return {
				mode: String(set?.mode ?? 'off'),
				timeOfDay: String(set?.timeOfDay ?? ''),
			}
		},

		/**
		 * The digest mode was changed.
		 *
		 * @param {object} channel The channel.
		 * @param {Event} domEvent The change event.
		 */
		onDigestMode(channel, domEvent) {
			/**
			 * @event digest-change Emitted when a reader changes a channel's digest mode or its time of day. Payload: `{ channelId, mode, timeOfDay }`.
			 */
			this.$emit('digest-change', {
				channelId: channel.id,
				mode: String(domEvent?.target?.value ?? 'off'),
				timeOfDay: this.digestFor(channel).timeOfDay,
			})
		},

		/**
		 * The digest time was changed.
		 *
		 * @param {object} channel The channel.
		 * @param {Event} domEvent The change event.
		 */
		onDigestTime(channel, domEvent) {
			this.$emit('digest-change', {
				channelId: channel.id,
				mode: this.digestFor(channel).mode,
				timeOfDay: String(domEvent?.target?.value ?? ''),
			})
		},

		/**
		 * The last test send on a channel, or null when there has been none.
		 *
		 * @param {object} channel The channel.
		 * @return {?object} `{ ok, message }`.
		 */
		testResultFor(channel) {
			const result = this.testResults?.[channel?.id]
			return result === undefined || result === null ? null : result
		},

		/**
		 * What a test send reported.
		 *
		 * @param {object} channel The channel.
		 * @return {string} The sentence.
		 */
		testResultText(channel) {
			const result = this.testResultFor(channel)
			if (result === null) {
				return ''
			}
			if (String(result.message ?? '') !== '') {
				return String(result.message)
			}
			// Only when the server sent no sentence of its own. A refusal
			// without a reason still has to say it was a refusal.
			return result.ok === true
				? t('nextcloud-vue', 'The test arrived.')
				: t('nextcloud-vue', 'The test did not arrive.')
		},

		/**
		 * What the test button is called.
		 *
		 * @param {object} channel The channel.
		 * @return {string} The accessible name.
		 */
		testSendLabel(channel) {
			return t('nextcloud-vue', 'Send a test over {channel}', { channel: channel.label })
		},

		/**
		 * What the add-a-scope control is called.
		 *
		 * @param {object} event The event.
		 * @return {string} The accessible name.
		 */
		addScopeLabel(event) {
			return t('nextcloud-vue', 'Set {event} for one kind of case', { event: event.label })
		},

		/**
		 * A test send was asked for.
		 *
		 * @param {object} channel The channel.
		 */
		onTestSend(channel) {
			/**
			 * @event test-send Emitted when a reader asks for a test notification on one channel. Payload: `{ channelId }`.
			 */
			this.$emit('test-send', { channelId: channel.id })
		},
	},
}
</script>

<style scoped lang="scss">
.cn-notification-matrix__table {
	inline-size: 100%;
	border-collapse: collapse;
}

.cn-notification-matrix__caption {
	text-align: start;
	padding-block-end: 8px;
}

.cn-notification-matrix__table th,
.cn-notification-matrix__table td {
	text-align: start;
	padding: 6px 8px;
	border-block-end: 1px solid var(--color-border);
	vertical-align: top;
}

.cn-notification-matrix__muted {
	display: block;
	color: var(--color-text-maxcontrast);
	font-size: 0.85rem;
}

.cn-notification-matrix__group {
	background: none;
	border: none;
	font-weight: bold;
	padding: 8px 0;
	cursor: pointer;
	color: var(--color-main-text);
}

.cn-notification-matrix__scope {
	padding-inline-start: 24px !important;
	font-weight: normal;
}

.cn-notification-matrix__row--scoped th,
.cn-notification-matrix__row--scoped td {
	border-block-end-style: dotted;
}

.cn-notification-matrix__test {
	margin-block-start: 4px;
}

.cn-notification-matrix__note {
	color: var(--color-text-maxcontrast);
}
</style>
