/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/index-copy-with-relations/tasks.md#task-3
 */
import { createSelfModeActions } from '../../src/components/CnIndexPage/selfModeActions.js'

jest.mock('../../src/composables/useObjectCopy.js', () => {
	const actual = jest.requireActual('../../src/composables/useObjectCopy.js')
	return { ...actual, useObjectCopy: () => global.__copier }
})

const source = { id: 'A1', title: 'Zaaksysteem X', '@self': { id: 'A1' } }

function makeCtx() {
	const store = { saveObject: jest.fn().mockResolvedValue({ id: 'A9' }), getError: jest.fn() }
	const setResults = { singleCopy: jest.fn(), massCopy: jest.fn() }
	const ctx = {
		isSelfFetchMode: () => true,
		selfObjectStore: () => store,
		selfObjectType: () => 'application',
		list: () => ({ refresh: jest.fn() }),
		register: () => 'stack',
		schema: () => 'application',
		effectiveObjects: () => [source, { id: 'A2', title: 'Other' }],
		effectiveSchema: () => ({ slug: 'application' }),
		massActionNameField: () => 'title',
		emit: jest.fn(),
		setResults,
	}
	return { ctx, store, setResults }
}

beforeEach(() => {
	global.__copier = { copy: jest.fn().mockResolvedValue({ object: { id: 'A8' }, links: [{ kind: 'incoming', ok: false, title: 'Y', reason: 'no' }] }) }
})

describe('single copy with links', () => {
	it('calls the copy endpoint once with the ticked kinds, and never saves a clone', async () => {
		const { ctx, store, setResults } = makeCtx()
		await createSelfModeActions(ctx).handleSingleCopy({ id: 'A1', newName: 'Zaaksysteem X (kopie)', include: ['incoming'] })
		expect(global.__copier.copy).toHaveBeenCalledTimes(1)
		expect(global.__copier.copy).toHaveBeenCalledWith({ register: 'stack', schema: 'application', id: 'A1' }, 'Zaaksysteem X (kopie)', ['incoming'], { title: 'Zaaksysteem X (kopie)' })
		expect(store.saveObject).not.toHaveBeenCalled()
		expect(setResults.singleCopy).toHaveBeenCalledWith({ success: true, object: { id: 'A8' }, links: [expect.objectContaining({ ok: false })] })
	})

	it('without include, the browser clone runs as before', async () => {
		const { ctx, store, setResults } = makeCtx()
		await createSelfModeActions(ctx).handleSingleCopy({ id: 'A1', newName: 'Copy of X' })
		expect(global.__copier.copy).not.toHaveBeenCalled()
		expect(store.saveObject).toHaveBeenCalledTimes(1)
		expect(setResults.singleCopy).toHaveBeenCalledWith({ success: true })
	})

	it('a server without the endpoint (404/405) falls back to the fields-only copy', async () => {
		global.__copier.copy.mockRejectedValue({ response: { status: 405 } })
		const { ctx, store, setResults } = makeCtx()
		await createSelfModeActions(ctx).handleSingleCopy({ id: 'A1', newName: 'Copy of X', include: ['files'] })
		expect(store.saveObject).toHaveBeenCalledTimes(1)
		expect(setResults.singleCopy).toHaveBeenCalledWith({ success: true })
	})

	it('another failure is shown, not papered over with a half copy', async () => {
		global.__copier.copy.mockRejectedValue(new Error('500 boom'))
		const { ctx, store, setResults } = makeCtx()
		await createSelfModeActions(ctx).handleSingleCopy({ id: 'A1', newName: 'Copy of X', include: ['files'] })
		expect(store.saveObject).not.toHaveBeenCalled()
		expect(setResults.singleCopy).toHaveBeenCalledWith({ error: '500 boom' })
	})
})

describe('mass copy with links', () => {
	it('copies each row through the endpoint with the same kinds and collects the link outcome', async () => {
		const { ctx, store, setResults } = makeCtx()
		await createSelfModeActions(ctx).handleMassCopy({ ids: ['A1', 'A2'], include: ['incoming'], getName: (item) => `${item.title} (kopie)` })
		expect(global.__copier.copy).toHaveBeenCalledTimes(2)
		expect(store.saveObject).not.toHaveBeenCalled()
		const result = setResults.massCopy.mock.calls[0][0]
		expect(result.success).toBe(true)
		expect(result.links).toHaveLength(2)
		expect(result.links[0]).toMatchObject({ ok: false, source: 'A1' })
	})

	it('without include it copies fields only, as before', async () => {
		const { ctx, store, setResults } = makeCtx()
		await createSelfModeActions(ctx).handleMassCopy({ ids: ['A1', 'A2'], getName: (item) => `${item.title} (kopie)` })
		expect(global.__copier.copy).not.toHaveBeenCalled()
		expect(store.saveObject).toHaveBeenCalledTimes(2)
		expect(setResults.massCopy).toHaveBeenCalledWith({ success: true, successfulIds: ['A1', 'A2'] })
	})

	it('stops asking after the first 404 and copies the rest as fields only', async () => {
		global.__copier.copy.mockRejectedValue({ response: { status: 404 } })
		const { ctx, store } = makeCtx()
		await createSelfModeActions(ctx).handleMassCopy({ ids: ['A1', 'A2'], include: ['files'], getName: (item) => item.title })
		expect(global.__copier.copy).toHaveBeenCalledTimes(1)
		expect(store.saveObject).toHaveBeenCalledTimes(2)
	})
})
