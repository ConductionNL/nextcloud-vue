/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Reading and writing what notifies a person.
 *
 * 🔴 IT KEEPS NO COPY BEYOND THE PAGE. The spec asks for this and the reason
 * is worth writing down: notification preferences are read by the SERVER when
 * something happens, not by this screen. A cached copy that outlived the page
 * would let a person open the screen, see what they set last week, and be
 * looking at something an administrator has since forced. The store holds what
 * this page is showing and nothing else; `$reset` on unmount is the whole
 * lifecycle.
 *
 * 🔴 A WRITE THAT FAILS PUTS THE VALUE BACK. Optimism is right here — a
 * checkbox that waits for a round trip feels broken — but optimism without a
 * rollback is a screen that shows a setting the server never accepted, which
 * is the exact failure this whole change exists to prevent. The previous value
 * is kept and restored, and the failure is surfaced rather than logged.
 *
 * 🔴 PRUNING IS PART OF THE WRITE, NOT A SWEEP. Rows for events the catalogue
 * no longer has go on the next write the person makes anyway, so no separate
 * job has to exist and no row can outlive the screen that would have shown it.
 */

import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { defineStore } from 'pinia'
import { GLOBAL_SCOPE, pruneToCatalogue, setValue } from '../utils/preferenceScopes.js'

/** Where the catalogue, the values and the forced rows come from. */
export const NOTIFICATION_PREFERENCES_URL = '/apps/openregister/api/notification-preferences'

/** Where a test send is asked for. */
export const NOTIFICATION_TEST_SEND_URL = '/apps/openregister/api/notification-preferences/test'

/**
 * The preferences store for one screen.
 *
 * @spec openspec/changes/notification-preferences-ui/specs/notification-preferences/spec.md
 */
export const useNotificationPreferencesStore = defineStore('cnNotificationPreferences', {
	state: () => ({
		/** @type {Array<object>} The events the host publishes. */
		events: [],
		/** @type {Array<object>} The channels this instance has. */
		channels: [],
		/** @type {object} What an administrator set for the group. */
		groupValues: {},
		/** @type {object} What this person set, by event, channel and scope. */
		personalValues: {},
		/**
		 * @type {object} What an administrator has FORCED.
		 *
		 * Never written by this store. It is the administrator's, it sits
		 * above the person's own preference, and a screen that could write it
		 * would be offering to overrule the thing that exists to overrule the
		 * person.
		 */
		forcedValues: {},
		/** @type {object} What the platform refuses for this recipient, with reasons. */
		refusals: {},
		/** @type {object} The digest choice per channel. */
		digest: {},
		/** @type {boolean} Whether a read is in flight. */
		loading: false,
		/** @type {string} The last failure, surfaced rather than swallowed. */
		error: '',
		/** @type {Array<string>} Events dropped on the last write. */
		prunedEvents: [],
	}),

	actions: {
		/**
		 * Read everything this screen needs, in one request.
		 *
		 * One round trip rather than four: the catalogue, the values, the
		 * forced rows and the refusals are read together because a screen
		 * assembled from four responses can render a half-state where a cell
		 * is editable for as long as the forced rows are still in flight.
		 *
		 * @param {object} [options] - The call.
		 * @param {string} [options.groupId] - The group, for the admin screen.
		 * @return {Promise<void>} Nothing.
		 */
		async load({ groupId = '' } = {}) {
			this.loading = true
			this.error = ''
			try {
				const { data } = await axios.get(generateUrl(NOTIFICATION_PREFERENCES_URL), {
					params: groupId === '' ? {} : { group: groupId },
				})

				this.events = Array.isArray(data?.events) ? data.events : []
				this.channels = Array.isArray(data?.channels) ? data.channels : []
				this.groupValues = data?.groupValues || {}
				this.personalValues = data?.personalValues || {}
				this.forcedValues = data?.forcedValues || {}
				this.refusals = data?.refusals || {}
				this.digest = data?.digest || {}
			} catch (error) {
				// Surfaced, never swallowed. An empty matrix with no trace of
				// why is indistinguishable from an app that publishes no
				// events, and the screen would tell somebody nothing notifies
				// them when in fact it could not ask.
				this.error = messageOf(error)
				this.events = []
				this.channels = []
			} finally {
				this.loading = false
			}
		},

		/**
		 * Set one cell, and put it back if the server refuses.
		 *
		 * @param {object} change - The change.
		 * @param {string} change.eventId - The event.
		 * @param {string} change.channelId - The channel.
		 * @param {string} [change.scope] - The scope, global when absent.
		 * @param {?boolean} change.value - The new value, null to clear the row.
		 * @param {string} [change.groupId] - The group, when an administrator is setting a default.
		 * @return {Promise<boolean>} Whether it stuck.
		 */
		async setPreference({ eventId, channelId, scope = GLOBAL_SCOPE, value, groupId = '' } = {}) {
			const target = groupId === '' ? 'personalValues' : 'groupValues'
			const before = this[target]

			this[target] = setValue({ values: before, eventId, channelId, scope, value })
			this.error = ''

			const { kept, pruned } = pruneToCatalogue({ values: this[target], catalogue: this.events })
			this.prunedEvents = pruned

			try {
				await axios.put(generateUrl(NOTIFICATION_PREFERENCES_URL), {
					scope,
					group: groupId || undefined,
					values: kept,
				})
				this[target] = kept
				return true
			} catch (error) {
				// BACK WHERE IT WAS. Optimism without a rollback is a screen
				// showing a setting the server never accepted.
				this[target] = before
				this.prunedEvents = []
				this.error = messageOf(error)
				return false
			}
		},

		/**
		 * Set the digest for one channel.
		 *
		 * @param {object} choice - The choice.
		 * @param {string} choice.channelId - The channel.
		 * @param {string} [choice.mode] - `off`, `daily` or `weekly`.
		 * @param {string} [choice.timeOfDay] - When the digest goes out.
		 * @return {Promise<boolean>} Whether it stuck.
		 */
		async setDigest({ channelId, mode = 'off', timeOfDay = '' } = {}) {
			const before = this.digest
			this.digest = { ...before, [channelId]: { mode, timeOfDay } }
			this.error = ''

			try {
				await axios.put(generateUrl(`${NOTIFICATION_PREFERENCES_URL}/digest`), {
					channel: channelId,
					mode,
					timeOfDay,
				})
				return true
			} catch (error) {
				this.digest = before
				this.error = messageOf(error)
				return false
			}
		},

		/**
		 * Send one test notification to the person setting it.
		 *
		 * 🔴 IT REPORTS WHAT HAPPENED, INCLUDING A REFUSAL. The whole point is
		 * that nobody should have to wait for a real event to find out a
		 * channel is broken, so "sent" and "refused, because" are both
		 * results. A test send that silently did nothing would be worse than
		 * no button, because it would read as proof the channel works.
		 *
		 * @param {object} request - The request.
		 * @param {string} request.eventId - The event to send as.
		 * @param {string} request.channelId - The channel to send over.
		 * @return {Promise<object>} `{ ok, message }`.
		 */
		async testSend({ eventId, channelId } = {}) {
			try {
				const { data } = await axios.post(generateUrl(NOTIFICATION_TEST_SEND_URL), {
					event: eventId,
					channel: channelId,
				})
				return {
					ok: data?.sent === true,
					// The server's own sentence when it has one: it is the
					// only text that says why a channel did not carry this.
					message: String(data?.message ?? ''),
				}
			} catch (error) {
				return { ok: false, message: messageOf(error) }
			}
		},
	},
})

/**
 * The sentence a failure carries.
 *
 * @param {object} error - What was thrown.
 * @return {string} The message, or the empty string.
 */
function messageOf(error) {
	const candidates = [
		error?.response?.data?.message,
		error?.response?.data?.error,
		error?.message,
	]

	for (const candidate of candidates) {
		if (typeof candidate === 'string' && candidate.trim() !== '') {
			return candidate.trim()
		}
	}

	// Empty rather than invented, so a caller can say "that did not save" in
	// its own words instead of quoting a sentence nobody wrote.
	return ''
}
