/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/audit-trail-restore-version/tasks.md#task-1
 */
import { useRestoreVersion } from '../../src/composables/useRestoreVersion.js'

const target = { register: 'permits', schema: 'permit', objectId: 'abc', auditTrailId: 42 }

function answer(status, body) {
	global.fetch = jest.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body })
}

describe('useRestoreVersion', () => {
	it('posts the entry id to the revert route', async () => {
		answer(200, { id: 'abc' })
		const result = await useRestoreVersion().restore(target)
		const [url, init] = global.fetch.mock.calls[0]
		expect(url).toContain('/apps/openregister/api/objects/permits/permit/abc/revert')
		expect(init.method).toBe('POST')
		expect(JSON.parse(init.body)).toEqual({ auditTrailId: 42 })
		expect(result).toMatchObject({ ok: true, record: { id: 'abc' } })
	})

	it.each([
		[403, 'You cannot restore this record.'],
		[404, 'This record no longer exists.'],
		[500, 'The record could not be restored.'],
	])('maps %s to a fixed sentence, never the server text', async (status, message) => {
		answer(status, { error: 'SERVER TEXT' })
		const result = await useRestoreVersion().restore(target)
		expect(result.ok).toBe(false)
		expect(result.message).toBe(message)
	})

	it('names the lock holder on a 423', async () => {
		answer(423, { '@self': { locked: { displayName: 'Sanne', user: 'sanne' } } })
		expect((await useRestoreVersion().restore(target)).message).toBe('This record is locked by Sanne.')
	})

	it('falls back to the page record, then to "someone else", on a 423', async () => {
		answer(423, {})
		const object = { '@self': { locked: { displayName: 'Jan' } } }
		expect((await useRestoreVersion().restore({ ...target, object })).message).toBe('This record is locked by Jan.')
		expect((await useRestoreVersion().restore(target)).message).toBe('This record is locked by someone else.')
	})

	it('treats a network failure as a failed restore', async () => {
		global.fetch = jest.fn().mockRejectedValue(new Error('offline'))
		const result = await useRestoreVersion().restore(target)
		expect(result).toMatchObject({ ok: false, status: 0, message: 'The record could not be restored.' })
	})
})
