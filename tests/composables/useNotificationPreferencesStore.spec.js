/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Reading and writing what notifies a person.
 *
 * Three failures are worth testing hard, because each one ends with somebody
 * believing a setting is in force when it is not.
 *
 * A write that the server refused, left on screen as though it stuck. A forced
 * row this store had written over, so an administrator's override was quietly
 * undone by the screen that exists to show it. And a test send that reported
 * nothing, which reads as proof a channel works.
 *
 * @spec openspec/changes/notification-preferences-ui/specs/notification-preferences/spec.md
 */

import axios from '@nextcloud/axios'
import { createPinia, setActivePinia } from 'pinia'
import { useNotificationPreferencesStore } from '../../src/composables/useNotificationPreferencesStore.js'
import { GLOBAL_SCOPE } from '../../src/utils/preferenceScopes.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(),
		put: jest.fn(),
		post: jest.fn(),
	},
}))

jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => url }))

const PAYLOAD = {
	events: [{ id: 'term-expires', label: 'A term expires' }],
	channels: [{ id: 'mail', label: 'Mail' }],
	groupValues: { 'term-expires': { mail: { [GLOBAL_SCOPE]: true } } },
	personalValues: { 'term-expires': { mail: { [GLOBAL_SCOPE]: false } } },
	forcedValues: { 'term-expires': { mail: { [GLOBAL_SCOPE]: true } } },
	refusals: { mail: { reason: 'This kind never leaves the organisation' } },
	digest: { mail: { mode: 'daily', timeOfDay: '08:00' } },
}

/**
 * A store on a fresh pinia, with the reads stubbed.
 *
 * @return {object} The store.
 */
function freshStore() {
	setActivePinia(createPinia())
	return useNotificationPreferencesStore()
}

beforeEach(() => {
	jest.clearAllMocks()
	axios.get.mockResolvedValue({ data: PAYLOAD })
	axios.put.mockResolvedValue({ data: {} })
	axios.post.mockResolvedValue({ data: { sent: true, message: 'Sent to r@example.org' } })
})

describe('reading the screen', () => {
	it('takes the catalogue, the values, the forced rows and the refusals from one read', () => {
		// One request rather than four: a screen assembled from four responses
		// renders a cell as editable for as long as the forced rows are still
		// in flight, which is the moment somebody clicks it.
		const store = freshStore()

		return store.load().then(() => {
			expect(axios.get).toHaveBeenCalledTimes(1)
			expect(store.events).toEqual(PAYLOAD.events)
			expect(store.forcedValues).toEqual(PAYLOAD.forcedValues)
			expect(store.refusals).toEqual(PAYLOAD.refusals)
			expect(store.digest).toEqual(PAYLOAD.digest)
		})
	})

	it('says why it has nothing rather than showing an empty matrix', async () => {
		// An empty matrix with no trace of why is indistinguishable from an app
		// that publishes no events: it would tell somebody nothing notifies
		// them when in fact it could not ask.
		axios.get.mockRejectedValue({ response: { data: { message: 'Not allowed' } } })
		const store = freshStore()

		await store.load()

		expect(store.error).toBe('Not allowed')
		expect(store.events).toEqual([])
	})

	it('stops loading whether it worked or not', async () => {
		axios.get.mockRejectedValue(new Error('down'))
		const store = freshStore()

		await store.load()

		expect(store.loading).toBe(false)
	})

	it('asks for a group only when there is one', async () => {
		const store = freshStore()

		await store.load()
		expect(axios.get.mock.calls[0][1]).toEqual({ params: {} })

		await store.load({ groupId: 'behandelaars' })
		expect(axios.get.mock.calls[1][1]).toEqual({ params: { group: 'behandelaars' } })
	})
})

describe('writing one cell', () => {
	it('writes the person\'s own values by default', async () => {
		const store = freshStore()
		await store.load()

		const ok = await store.setPreference({ eventId: 'term-expires', channelId: 'mail', value: true })

		expect(ok).toBe(true)
		expect(store.personalValues['term-expires'].mail[GLOBAL_SCOPE]).toBe(true)
		expect(axios.put.mock.calls[0][1].group).toBeUndefined()
	})

	it('writes the group defaults when an administrator is the one setting them', async () => {
		const store = freshStore()
		await store.load()

		await store.setPreference({ eventId: 'term-expires', channelId: 'mail', value: false, groupId: 'behandelaars' })

		expect(store.groupValues['term-expires'].mail[GLOBAL_SCOPE]).toBe(false)
		// And the person's own row is untouched: a group default is a
		// different layer, not a rewrite of what somebody chose.
		expect(store.personalValues['term-expires'].mail[GLOBAL_SCOPE]).toBe(false)
		expect(axios.put.mock.calls[0][1].group).toBe('behandelaars')
	})

	it('puts the value back when the server refuses it', async () => {
		// THE FAILURE THIS EXISTS TO PREVENT. Optimism without a rollback is a
		// screen showing a setting the server never accepted, which is exactly
		// what this whole change is for.
		const store = freshStore()
		await store.load()
		axios.put.mockRejectedValue({ response: { data: { message: 'An administrator forced this channel' } } })

		const ok = await store.setPreference({ eventId: 'term-expires', channelId: 'mail', value: true })

		expect(ok).toBe(false)
		expect(store.personalValues['term-expires'].mail[GLOBAL_SCOPE]).toBe(false)
		expect(store.error).toBe('An administrator forced this channel')
	})

	it('keeps the value when the server accepts it, which is the control', async () => {
		// Without this, a store that rolled everything back would pass the
		// test above and never save anything at all.
		const store = freshStore()
		await store.load()

		await store.setPreference({ eventId: 'term-expires', channelId: 'mail', value: true })

		expect(store.personalValues['term-expires'].mail[GLOBAL_SCOPE]).toBe(true)
		expect(store.error).toBe('')
	})

	it('writes a scope through as the scope, not as the global row', async () => {
		const store = freshStore()
		await store.load()

		await store.setPreference({ eventId: 'term-expires', channelId: 'mail', scope: 'bezwaar', value: true })

		expect(store.personalValues['term-expires'].mail).toEqual({ [GLOBAL_SCOPE]: false, bezwaar: true })
		expect(axios.put.mock.calls[0][1].scope).toBe('bezwaar')
	})

	it('drops rows for events the catalogue no longer has, and names them', async () => {
		const store = freshStore()
		await store.load()
		store.personalValues = {
			...store.personalValues,
			'retired-event': { mail: { [GLOBAL_SCOPE]: true } },
		}

		await store.setPreference({ eventId: 'term-expires', channelId: 'mail', value: true })

		expect(store.personalValues['retired-event']).toBeUndefined()
		expect(store.prunedEvents).toEqual(['retired-event'])
		expect(axios.put.mock.calls[0][1].values['retired-event']).toBeUndefined()
	})

	it('prunes nothing when every row is still in the catalogue, which is the control', async () => {
		const store = freshStore()
		await store.load()

		await store.setPreference({ eventId: 'term-expires', channelId: 'mail', value: true })

		expect(store.prunedEvents).toEqual([])
		expect(store.personalValues['term-expires']).toBeDefined()
	})

	it('never writes the forced rows', async () => {
		// They are the administrator's, they sit above the person's own
		// preference, and a screen that could write them would offer to
		// overrule the thing that exists to overrule the person.
		const store = freshStore()
		await store.load()

		await store.setPreference({ eventId: 'term-expires', channelId: 'mail', value: false })

		expect(store.forcedValues).toEqual(PAYLOAD.forcedValues)
		for (const call of axios.put.mock.calls) {
			expect(call[1].forcedValues).toBeUndefined()
		}
	})
})

describe('the digest', () => {
	it('sets a mode and a time of day for one channel', async () => {
		const store = freshStore()
		await store.load()

		const ok = await store.setDigest({ channelId: 'mail', mode: 'weekly', timeOfDay: '09:30' })

		expect(ok).toBe(true)
		expect(store.digest.mail).toEqual({ mode: 'weekly', timeOfDay: '09:30' })
		expect(axios.put.mock.calls[0][1]).toEqual({ channel: 'mail', mode: 'weekly', timeOfDay: '09:30' })
	})

	it('leaves the other channels alone', async () => {
		const store = freshStore()
		await store.load()
		store.digest = { ...store.digest, push: { mode: 'off', timeOfDay: '' } }

		await store.setDigest({ channelId: 'mail', mode: 'off' })

		expect(store.digest.push).toEqual({ mode: 'off', timeOfDay: '' })
	})

	it('puts the old choice back when the server refuses', async () => {
		const store = freshStore()
		await store.load()
		axios.put.mockRejectedValue(new Error('no digest on this channel'))

		const ok = await store.setDigest({ channelId: 'mail', mode: 'weekly', timeOfDay: '09:30' })

		expect(ok).toBe(false)
		expect(store.digest.mail).toEqual({ mode: 'daily', timeOfDay: '08:00' })
		expect(store.error).toBe('no digest on this channel')
	})
})

describe('the test send', () => {
	it('reports that it arrived, and where', async () => {
		const store = freshStore()

		expect(await store.testSend({ eventId: 'term-expires', channelId: 'mail' }))
			.toEqual({ ok: true, message: 'Sent to r@example.org' })
	})

	it('reports a refusal as a result, with the reason', async () => {
		// A refusal is an answer, not a failure to answer. "Refused, because"
		// is the sentence somebody needs; a test send that silently did nothing
		// would read as proof the channel works.
		axios.post.mockResolvedValue({
			data: { sent: false, message: 'This kind never leaves the organisation' },
		})
		const store = freshStore()

		expect(await store.testSend({ eventId: 'term-expires', channelId: 'mail' }))
			.toEqual({ ok: false, message: 'This kind never leaves the organisation' })
	})

	it('reports a failed request rather than throwing at the screen', async () => {
		axios.post.mockRejectedValue({ response: { data: { error: 'Mail is not configured' } } })
		const store = freshStore()

		expect(await store.testSend({ eventId: 'term-expires', channelId: 'mail' }))
			.toEqual({ ok: false, message: 'Mail is not configured' })
	})

	it('does not report a send as successful just because the request returned', async () => {
		// A 200 carrying no `sent` is the shape a half-built endpoint returns,
		// and reading it as success is how a broken channel gets signed off.
		axios.post.mockResolvedValue({ data: {} })
		const store = freshStore()

		expect((await store.testSend({ eventId: 'term-expires', channelId: 'mail' })).ok).toBe(false)
	})
})
