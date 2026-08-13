/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * What `useObjectStore`'s fetch-by-id path writes to the CONSOLE — a contract
 * the consuming app cannot override.
 *
 * #612 removed the unconditional `console.error` on an expected 404 from the
 * SUB-RESOURCE paths (`createSubResourcePlugin`, `useSubResource`). It missed
 * the single-object path in this store, which is the one that actually emits
 * the message scholiq reports, so the defect survived the fix:
 *
 *     Error: CredentialVerify should have no fatal JS errors:
 *       Error fetching scholiq-Credential/test-id: Proxy(Object)
 *
 * The `Proxy(Object)` tail identifies the site precisely — that is
 * `this.errors[type]`, a reactive proxy, logged from the `!response.ok`
 * branch. The `catch` branch below it logs the raw `Error` and would print
 * `Error: …`, so it is not the one being hit. The `catch` is left logging on
 * purpose: `fetch` does not throw on an HTTP status, so anything arriving
 * there is a genuine network or parse fault, not a 404.
 *
 * A "not found" is a normal, expected result for whole classes of page —
 * scholiq's credential-verification page exists precisely to answer "is this
 * credential real?", so an unknown id is the DESIGNED path, not an error. The
 * failure is already recorded in `store.errors[type]` for the component to
 * render, so the console line was a second, uncontrollable channel for
 * information the consumer already had.
 */

import { createPinia, setActivePinia } from 'pinia'
import { createObjectStore } from '../../src/store/useObjectStore.js'

const notOk = (status, statusText) => ({
	ok: false,
	status,
	statusText,
	text: async () => 'body',
	json: async () => { throw new Error('no json') },
})

describe('useObjectStore fetch-by-id console contract', () => {
	let store

	beforeEach(() => {
		setActivePinia(createPinia())
		const useStore = createObjectStore('test-store')
		store = useStore()
		store.registerObjectType('credential', '28', '5')
	})

	afterEach(() => {
		jest.restoreAllMocks()
	})

	it('does NOT console.error on an expected 404, but still records the error', async () => {
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
		jest.spyOn(globalThis, 'fetch').mockResolvedValue(notOk(404, 'Not Found'))

		const out = await store.fetchObject('credential', 'test-id')

		expect(errSpy).not.toHaveBeenCalled()
		// Silencing the console must NOT silence the state the component
		// renders — otherwise this trades a noisy page for a blank one.
		expect(store.errors.credential).not.toBeNull()
		expect(out).toBeNull()
		expect(store.loading.credential).toBe(false)
	})

	it('still console.errors a genuine fault, and names the status', async () => {
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
		jest.spyOn(globalThis, 'fetch').mockResolvedValue(notOk(503, 'Service Unavailable'))

		await store.fetchObject('credential', 'test-id')

		expect(errSpy).toHaveBeenCalledTimes(1)
		const [message, payload] = errSpy.mock.calls[0]
		expect(String(message)).toContain('503')
		expect(String(message)).toContain('Service Unavailable')
		// The old line printed the reactive proxy as an unreadable
		// `Proxy(Object)` — it named the resource but not the failure.
		expect(String(payload)).not.toContain('Proxy(')
		expect(store.errors.credential).not.toBeNull()
	})

	it('still console.errors a thrown network fault (the catch path is untouched)', async () => {
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
		const boom = new TypeError('Failed to fetch')
		jest.spyOn(globalThis, 'fetch').mockRejectedValue(boom)

		await store.fetchObject('credential', 'test-id')

		// `fetch` does not throw on an HTTP status, so anything here is real.
		expect(errSpy).toHaveBeenCalledTimes(1)
		expect(store.errors.credential).not.toBeNull()
	})
})
