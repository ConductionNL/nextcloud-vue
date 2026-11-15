// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/**
 * A refresh that starts while the mount is still loading the schema waits
 * for it. The store adds `_facets=extend` only when it holds the schema with
 * facetable properties, so a list fetched before its schema arrived came
 * back without facets, and the side panel drew empty selects (DqZaken,
 * DqZakenSorteren on a slow schema endpoint).
 *
 * @spec openspec/changes/list-waits-for-its-schema/specs/list-waits-for-its-schema/spec.md
 */

import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useListView } from '../../src/composables/useListView.js'

const flush = () => new Promise((resolve) => setTimeout(resolve))

/**
 * @return {{promise: Promise, resolve: Function}} A promise the test settles by hand.
 */
function deferred() {
	let resolve
	const promise = new Promise((r) => {
		resolve = r
	})
	return { promise, resolve }
}

/**
 * A fake store whose schema arrives when the test says so, and which records
 * whether the schema was there when each fetch started.
 *
 * @param {Promise} schemaArrives Settles with the schema.
 * @return {object} The fake store.
 */
function makeStore(schemaArrives) {
	const store = {
		collections: {},
		loading: {},
		pagination: {},
		facets: {},
		schemas: {},
		schemaAtFetch: [],
		fetchCollection: jest.fn(async () => {
			store.schemaAtFetch.push(Boolean(store.schemas.t))
			return []
		}),
		fetchSchema: jest.fn(async () => {
			const schema = await schemaArrives
			store.schemas.t = schema
			return schema
		}),
	}
	return store
}

/**
 * @param {object} store The fake store.
 * @return {object} The composable's API.
 */
function mountList(store) {
	const Comp = defineComponent({
		setup() {
			return { list: useListView('t', { objectStore: store }) }
		},
		render() {
			return h('div')
		},
	})
	return mount(Comp).vm.list
}

describe('useListView waits for its schema', () => {
	it('a control: the mount fetch runs after the schema arrived', async () => {
		const schema = deferred()
		const store = makeStore(schema.promise)
		mountList(store)
		await flush()
		expect(store.fetchCollection).not.toHaveBeenCalled()
		schema.resolve({ properties: { status: { facetable: true } } })
		await flush()
		expect(store.schemaAtFetch).toEqual([true])
	})

	it('a refresh started while the schema loads waits for it', async () => {
		const schema = deferred()
		const store = makeStore(schema.promise)
		const list = mountList(store)
		await flush()
		const early = list.refresh(1)
		await flush()
		schema.resolve({ properties: { status: { facetable: true } } })
		await early
		await flush()
		expect(store.schemaAtFetch.length).toBeGreaterThan(0)
		expect(store.schemaAtFetch.every(Boolean)).toBe(true)
	})
})
