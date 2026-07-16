/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for schema deletion in CnEditDataModal (schema-delete-cascade).
 *
 * The bug being guarded against: removeSchema() used to PATCH the register to
 * UNLINK the schema and only THEN issue the DELETE. When the DELETE was refused
 * (409 — the schema still has objects), the unlink had already been committed:
 * the schema survived but was detached from its register, so it vanished from the
 * pages editor while its data sat there untouched. Observed live on a real
 * register, which went [4432,4434,4438] -> [4432].
 */
import { parseAxiosError } from '../../src/utils/errors.js'

// A 409 exactly as OpenRegister's SchemasController::destroy sends it.
const conflict409 = (objectCount = 1) => ({
	message: 'Request failed with status code 409', // axios's useless generic
	response: { status: 409, data: { error: 'schema-has-objects', objectCount } },
})

describe('parseAxiosError', () => {
	it('extracts the server error code and count from a 409 body', () => {
		const parsed = parseAxiosError(conflict409(3))
		expect(parsed.status).toBe(409)
		expect(parsed.code).toBe('schema-has-objects')
		expect(parsed.data.objectCount).toBe(3)
		// The whole point: NOT axios's "Request failed with status code 409".
		expect(parsed.message).not.toBe('Request failed with status code 409')
	})

	it('falls back to the body message when there is no error code', () => {
		const parsed = parseAxiosError({ response: { status: 500, data: { message: 'Boom' } } })
		expect(parsed.code).toBeNull()
		expect(parsed.message).toBe('Boom')
	})

	it('handles a bare-string body', () => {
		const parsed = parseAxiosError({ response: { status: 400, data: 'Bad slug' } })
		expect(parsed.message).toBe('Bad slug')
	})

	it('survives an error with no response at all (network failure)', () => {
		const parsed = parseAxiosError(new Error('Network Error'))
		expect(parsed.status).toBe(0)
		expect(parsed.code).toBeNull()
		expect(parsed.message).toBeNull()
	})
})

describe('CnEditDataModal — removeSchema ordering and cascade', () => {
	const CnEditDataModal = require('../../src/dialogs/CnEditDataModal.vue').default
	const { removeSchema, confirmCascade, cancelCascade } = CnEditDataModal.methods

	/**
	 * Minimal Options-API stand-in carrying the real methods, so the ordering and
	 * cascade contract are tested without mounting the whole modal (which pulls in
	 * registers, schemas and the OpenRegister API).
	 *
	 * @param {object} axios Stubbed axios.
	 * @return {object} The harness context.
	 */
	function harness(axios) {
		return {
			$axios: axios,
			busy: false,
			error: '',
			pendingCascade: null,
			selectedRegister: { id: 2466, schemas: [4432, 4434] },
			headers: () => ({}),
			loadSchemas: jest.fn(),
			removeSchema,
			confirmCascade,
			cancelCascade,
		}
	}

	// The component imports axios directly, so intercept the module.
	const axios = require('@nextcloud/axios').default

	beforeEach(() => {
		jest.resetAllMocks()
	})

	it('does NOT unlink the schema when the DELETE is refused (the corruption bug)', async () => {
		axios.delete = jest.fn().mockRejectedValue(conflict409(1))
		axios.patch = jest.fn()

		const ctx = harness(axios)
		await ctx.removeSchema({ id: 4434, title: 'Cow' })

		// The register must be left EXACTLY as it was.
		expect(axios.patch).not.toHaveBeenCalled()
		expect(ctx.selectedRegister.schemas).toEqual([4432, 4434])
	})

	it('offers the cascade (with the count) instead of echoing an HTTP status', async () => {
		axios.delete = jest.fn().mockRejectedValue(conflict409(2))
		axios.patch = jest.fn()

		const ctx = harness(axios)
		await ctx.removeSchema({ id: 4434, title: 'Cow' })

		expect(ctx.pendingCascade).toEqual({ schema: { id: 4434, title: 'Cow' }, objectCount: 2 })
		expect(ctx.error).toBe('')
	})

	it('unlinks only AFTER a successful delete', async () => {
		const order = []
		axios.delete = jest.fn(async () => { order.push('delete') })
		axios.patch = jest.fn(async () => { order.push('patch') })

		const ctx = harness(axios)
		await ctx.removeSchema({ id: 4434, title: 'Cow' })

		expect(order).toEqual(['delete', 'patch'])
		expect(ctx.selectedRegister.schemas).toEqual([4432])
	})

	it('cascade sends ?deleteObjects=true — and never force', async () => {
		axios.delete = jest.fn()
		axios.patch = jest.fn()

		const ctx = harness(axios)
		await ctx.removeSchema({ id: 4434, title: 'Cow' }, true)

		const url = axios.delete.mock.calls[0][0]
		expect(url).toContain('deleteObjects=true')
		expect(url).not.toContain('force')
	})

	it('the cascade is confirm-gated: it only runs once confirmed', async () => {
		axios.delete = jest.fn().mockRejectedValueOnce(conflict409(1))
		axios.patch = jest.fn()

		const ctx = harness(axios)
		await ctx.removeSchema({ id: 4434, title: 'Cow' })
		expect(axios.delete).toHaveBeenCalledTimes(1) // refused; nothing destroyed
		expect(ctx.pendingCascade).toBeTruthy()

		axios.delete = jest.fn() // now it succeeds
		await ctx.confirmCascade()

		expect(axios.delete.mock.calls[0][0]).toContain('deleteObjects=true')
		expect(ctx.pendingCascade).toBeNull()
	})

	it('cancelling the cascade destroys nothing', async () => {
		axios.delete = jest.fn().mockRejectedValue(conflict409(1))
		axios.patch = jest.fn()

		const ctx = harness(axios)
		await ctx.removeSchema({ id: 4434, title: 'Cow' })
		const callsAfterRefusal = axios.delete.mock.calls.length

		ctx.cancelCascade()

		expect(ctx.pendingCascade).toBeNull()
		expect(axios.delete).toHaveBeenCalledTimes(callsAfterRefusal) // no further delete
		expect(axios.patch).not.toHaveBeenCalled()
		expect(ctx.selectedRegister.schemas).toEqual([4432, 4434])
	})

	// Reported from the live UI: confirming the cascade re-opened the SAME
	// confirmation, forever. An OpenRegister too old to know `?deleteObjects=true`
	// ignores the flag and answers 409 exactly as before — and the catch block was
	// re-arming pendingCascade on that, so the user could confirm a destructive
	// action that never landed, indefinitely.
	it('a CASCADE that still reports objects errors — it must NOT re-prompt (the loop)', async () => {
		axios.delete = jest.fn().mockRejectedValue(conflict409(1))
		axios.patch = jest.fn()

		const ctx = harness(axios)

		await ctx.removeSchema({ id: 4434, title: 'Cow' }) // plain delete → offer cascade
		expect(ctx.pendingCascade).toBeTruthy()

		await ctx.confirmCascade() // cascade ALSO 409s

		expect(ctx.pendingCascade).toBeNull() // ← no re-prompt: the loop is closed
		expect(ctx.error).toBeTruthy() // the user is told instead
		expect(axios.patch).not.toHaveBeenCalled()
		expect(ctx.selectedRegister.schemas).toEqual([4432, 4434])
	})

	it('clears any stale cascade prompt when the delete fails for another reason', async () => {
		axios.delete = jest.fn().mockRejectedValue({ response: { status: 403, data: { error: 'forbidden' } } })
		axios.patch = jest.fn()

		const ctx = harness(axios)
		ctx.pendingCascade = { schema: { id: 4434 }, objectCount: 1 } // stale from an earlier attempt

		await ctx.removeSchema({ id: 4434, title: 'Cow' })

		expect(ctx.pendingCascade).toBeNull()
		expect(ctx.error).toBeTruthy()
	})
})

describe('CnEditDataModal — the cascade warning names the schema', () => {
	const CnEditDataModal = require('../../src/dialogs/CnEditDataModal.vue').default
	const { cascadeWarning, cascadeConfirmLabel } = CnEditDataModal.computed

	// Reported from the live UI: the dialog read “%s” still has 1 object.
	// Nextcloud's l10n substitutes %n for the plural count and {named} placeholders
	// from a vars OBJECT — it has no printf %s. Passing %s with an array left the
	// literal on screen.
	it('interpolates the schema name — never leaves a raw placeholder', () => {
		const ctx = { pendingCascade: { schema: { id: 4434, title: 'Cow' }, objectCount: 1 } }
		const text = cascadeWarning.call(ctx)

		expect(text).toContain('Cow')
		expect(text).not.toContain('%s')
		expect(text).not.toContain('{name}')
	})

	it('falls back to the slug when the schema has no title', () => {
		const ctx = { pendingCascade: { schema: { id: 4434, slug: 'cow' }, objectCount: 2 } }
		expect(cascadeWarning.call(ctx)).toContain('cow')
	})

	it('the confirm button carries the count', () => {
		const ctx = { pendingCascade: { schema: { title: 'Cow' }, objectCount: 3 } }
		expect(cascadeConfirmLabel.call(ctx)).not.toContain('%n')
	})
})
