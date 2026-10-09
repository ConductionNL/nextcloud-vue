/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/index-ref-column-labels/tasks.md#task-1
 */
import { createRefLabelResolver, pickRefLabel } from '../../src/composables/useRefLabels.js'

function makeStore(rows) {
	const registry = {}
	return {
		objects: {},
		objectTypeRegistry: registry,
		registerObjectType: jest.fn((slug, schema, register) => { registry[slug] = { schema, register } }),
		fetchCollectionForOptions: jest.fn(async (type, params) => {
			const wanted = String(params._ids).split(',')
			return rows.filter((r) => wanted.includes(r.id))
		}),
	}
}

const cases = [{ id: 'c1', title: 'Case one' }, { id: 'c2', title: 'Case two' }, { id: 'c3', name: 'Third' }]

describe('createRefLabelResolver', () => {
	it('sends one request per schema for the distinct ids', async () => {
		const store = makeStore(cases)
		const resolver = createRefLabelResolver(() => store)
		const out = await resolver.resolve('dossiq', 'case', ['c1', 'c2', 'c1', 'c3', 'c2'], 'title')
		expect(store.fetchCollectionForOptions).toHaveBeenCalledTimes(1)
		expect(store.fetchCollectionForOptions.mock.calls[0][1]._ids).toBe('c1,c2,c3')
		expect(out).toEqual({ c1: 'Case one', c2: 'Case two', c3: 'Third' })
	})

	it('caches per register and schema and refetches after invalidate', async () => {
		const store = makeStore(cases)
		const resolver = createRefLabelResolver(() => store)
		await resolver.resolve('dossiq', 'case', ['c1'], 'title')
		await resolver.resolve('dossiq', 'case', ['c1', 'c2'], 'title')
		expect(store.fetchCollectionForOptions).toHaveBeenCalledTimes(2)
		expect(store.fetchCollectionForOptions.mock.calls[1][1]._ids).toBe('c2')
		resolver.invalidate('dossiq', 'case')
		await resolver.resolve('dossiq', 'case', ['c1'], 'title')
		expect(store.fetchCollectionForOptions).toHaveBeenCalledTimes(3)
	})

	it('resolves a deleted reference to null without throwing', async () => {
		const store = makeStore(cases)
		const out = await createRefLabelResolver(() => store).resolve('dossiq', 'case', ['c1', 'gone'], 'title')
		expect(out).toEqual({ c1: 'Case one', gone: null })
	})

	it('resolves to null when the request fails or there is no store', async () => {
		const store = makeStore(cases)
		store.fetchCollectionForOptions.mockRejectedValue(new Error('boom'))
		expect(await createRefLabelResolver(() => store).resolve('dossiq', 'case', ['c1'], 'title')).toEqual({ c1: null })
		expect(await createRefLabelResolver(() => null).resolve('dossiq', 'case', ['c1'], 'title')).toEqual({ c1: null })
	})
})

describe('pickRefLabel', () => {
	it('prefers labelField, then title, name and @self.name, and reads nested paths', () => {
		expect(pickRefLabel({ title: 'T', name: 'N' }, 'title')).toBe('T')
		expect(pickRefLabel({ name: 'N' }, 'title')).toBe('N')
		expect(pickRefLabel({ '@self': { name: 'S' } }, 'title')).toBe('S')
		expect(pickRefLabel({ person: { displayName: 'Ada' } }, 'person.displayName')).toBe('Ada')
		expect(pickRefLabel({ title: { nl: 'Zaak' } }, 'title')).toBe('Zaak')
		expect(pickRefLabel({}, 'title')).toBeNull()
	})
})
