/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An endpoint condition can name the record it sits on: `@objectId` and
 * `@object.<field>` in the endpoint resolve against the caller's context, so a
 * tab can ask another app about this record. Without the record there is no
 * request and the condition is false.
 */
import { evaluateVisibleWhen } from '../../src/utils/visibleWhen.js'

describe('visibleWhen endpoint tokens', () => {
	afterEach(() => {
		delete global.fetch
	})

	it('resolves @objectId and @object fields in the endpoint', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ proposals: [{ id: 'p1' }] }) })
		const cond = { endpoint: '/apps/portaliq/api/proposals?register=dossiq&schema=@object.schemaSlug&id=@objectId', field: 'proposals', op: 'notEmpty' }
		expect(await evaluateVisibleWhen(cond, { objectId: 'case-1', object: { schemaSlug: 'case' } })).toBe(true)
		expect(global.fetch.mock.calls[0][0]).toContain('/apps/portaliq/api/proposals?register=dossiq&schema=case&id=case-1')
	})

	it('asks nothing and hides while the record is not known', async () => {
		global.fetch = jest.fn()
		const cond = { endpoint: '/apps/portaliq/api/proposals?id=@objectId', field: 'proposals', op: 'notEmpty' }
		expect(await evaluateVisibleWhen(cond, {})).toBe(false)
		expect(global.fetch).not.toHaveBeenCalled()
	})
})
