/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for createSubResourcePlugin's fetch action — specifically what it
 * writes to the CONSOLE, which is a contract the consuming app cannot
 * override.
 *
 * The plugin used to `console.error` on every non-ok response, including a
 * plain 404. A "not found" is a normal, expected result for whole classes of
 * page — scholiq's credential-verification page exists precisely to answer
 * "is this credential real?", so an unknown id is the DESIGNED path. The page
 * rendered the invalid state correctly and its e2e failed anyway, on a console
 * write the app had no way to suppress (#612):
 *
 *     Error: CredentialVerify should have no fatal JS errors:
 *       Error fetching scholiq-Credential/test-id: Proxy(Object);
 *       Error fetching Credential/test-id: Proxy(Object)
 *
 * The failure is already recorded in `${name}Error` for the component to
 * render, so the console line was a second, uncontrollable channel for
 * information the consumer already had.
 */

import { createSubResourcePlugin } from '../../src/store/createSubResourcePlugin.js'

/**
 * Build a bare `this` for the generated action: the plugin's actions are
 * plain functions installed on a store, and reach the store only through
 * `this`, so a literal is enough to drive them.
 *
 * @return {object} A stand-in store context with the plugin's state.
 */
function makeContext() {
	const plugin = createSubResourcePlugin('contracts', 'contracts')()
	return Object.assign(plugin.state(), plugin.actions, {
		_buildUrl: (type, id) => `/api/${type}/${id}`,
		_buildHeaders: () => ({}),
	})
}

const notOk = (status, statusText) => ({
	ok: false,
	status,
	statusText,
	text: async () => 'body',
	json: async () => { throw new Error('no json') },
})

describe('createSubResourcePlugin — console contract on non-ok responses', () => {
	afterEach(() => {
		jest.restoreAllMocks()
	})

	it('does NOT console.error on an expected 404, but still records the error', async () => {
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
		jest.spyOn(globalThis, 'fetch').mockResolvedValue(notOk(404, 'Not Found'))

		const ctx = makeContext()
		const out = await ctx.fetchContracts('Credential', 'test-id')

		expect(errSpy).not.toHaveBeenCalled()
		// Silencing the console must NOT silence the state the component
		// renders — otherwise this trades a noisy page for a blank one.
		expect(ctx.contractsError).not.toBeNull()
		expect(out).toEqual([])
		expect(ctx.contractsLoading).toBe(false)
	})

	it('still console.errors a genuine fault, and names the status', async () => {
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
		jest.spyOn(globalThis, 'fetch').mockResolvedValue(notOk(503, 'Service Unavailable'))

		const ctx = makeContext()
		await ctx.fetchContracts('Credential', 'test-id')

		expect(errSpy).toHaveBeenCalledTimes(1)
		// The old message named the resource but not the failure, and printed
		// the reactive proxy as an unreadable `Proxy(Object)`.
		const [message, payload] = errSpy.mock.calls[0]
		expect(String(message)).toContain('503')
		expect(String(message)).toContain('Service Unavailable')
		expect(String(payload)).not.toContain('Proxy(')
	})
})
