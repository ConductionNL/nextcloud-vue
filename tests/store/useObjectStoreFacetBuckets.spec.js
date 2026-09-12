/**
 * Facet bucket normalisation, fed OpenRegister's real wire shape.
 *
 * OpenRegister emits a terms bucket as `{ key, results, label }`. That is the
 * shape produced by MagicFacetHandler and by the four other facet handlers,
 * and it is the shape OpenRegister's own integration test asserts. The store
 * used to read `b.count`, which is absent from that shape, and coerced the
 * miss to `0`, so every faceted select in every consuming app showed `(0)`.
 *
 * The rule these tests pin down: a bucket without a count normalises to no
 * count at all, never to zero. Zero is a claim about the data.
 */

import { createPinia, setActivePinia } from 'pinia'
import { searchPlugin } from '../../src/store/plugins/search.js'
import { createObjectStore } from '../../src/store/useObjectStore.js'

const TEAM_ALPHA = '9d3f2b1a-4c5e-4a71-b8d2-1e6f0a7c3b45'
const TEAM_BETA = 'c71e5d84-2f9b-4e13-9a06-8b4d2c1f7e90'

describe('useObjectStore facet bucket normalisation', () => {
	let store

	beforeEach(() => {
		setActivePinia(createPinia())
		const useStore = createObjectStore('facet-bucket-store')
		store = useStore()
		store.registerObjectType('caseFile', '28', '5')
	})

	/**
	 * Answer the next fetch with a collection response carrying these facets.
	 *
	 * @param {object} facets The `facets` block of the API response
	 */
	function respondWithFacets(facets) {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({
				results: [],
				total: 0,
				page: 1,
				pages: 1,
				facets,
			}),
		})
	}

	it('reads the count from the results field OpenRegister actually sends', async () => {
		respondWithFacets({
			team: {
				type: 'terms',
				buckets: [
					{ key: TEAM_ALPHA, results: 12, label: 'Team Alpha' },
					{ key: TEAM_BETA, results: 3, label: 'Team Beta' },
				],
			},
		})

		await store.fetchCollection('caseFile')

		expect(store.facets.caseFile.team.values).toEqual([
			{ value: TEAM_ALPHA, count: 12, label: 'Team Alpha' },
			{ value: TEAM_BETA, count: 3, label: 'Team Beta' },
		])
	})

	it('also reads a bucket that names the field count', async () => {
		respondWithFacets({
			status: {
				buckets: [
					{ value: 'open', count: 5, label: 'Open' },
					{ value: 'closed', count: 2, label: 'Closed' },
				],
			},
		})

		await store.fetchCollection('caseFile')

		expect(store.facets.caseFile.status.values).toEqual([
			{ value: 'open', count: 5, label: 'Open' },
			{ value: 'closed', count: 2, label: 'Closed' },
		])
	})

	it('leaves the count undefined when the bucket carries none', async () => {
		respondWithFacets({
			team: { buckets: [{ key: TEAM_ALPHA, label: 'Team Alpha' }] },
		})

		await store.fetchCollection('caseFile')

		expect(store.facets.caseFile.team.values[0].count).toBeUndefined()
	})

	it('keeps a genuine zero', async () => {
		respondWithFacets({
			team: { buckets: [{ key: TEAM_ALPHA, results: 0, label: 'Team Alpha' }] },
		})

		await store.fetchCollection('caseFile')

		expect(store.facets.caseFile.team.values[0].count).toBe(0)
	})

	it('carries the bucket label through so a reference facet can name itself', async () => {
		respondWithFacets({
			team: { buckets: [{ key: TEAM_ALPHA, results: 12, label: 'Team Alpha' }] },
		})

		await store.fetchCollection('caseFile')

		expect(store.facets.caseFile.team.values[0].label).toBe('Team Alpha')
	})

	it('omits the label when the bucket has none, rather than inventing one', async () => {
		respondWithFacets({
			status: { buckets: [{ key: 'open', results: 4 }] },
		})

		await store.fetchCollection('caseFile')

		expect(store.facets.caseFile.status.values[0]).toEqual({ value: 'open', count: 4 })
	})
})

describe('searchPlugin facet bucket normalisation', () => {
	let store

	beforeEach(() => {
		setActivePinia(createPinia())
		const useStore = createObjectStore('facet-search-store', { plugins: [searchPlugin()] })
		store = useStore()
	})

	it('normalises search facets through the same rules as the collection fetch', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({
				results: [],
				total: 0,
				facets: {
					team: {
						buckets: [
							{ key: TEAM_ALPHA, results: 12, label: 'Team Alpha' },
							{ key: TEAM_BETA, label: 'Team Beta' },
						],
					},
				},
			}),
		})

		store.setSearchParams({ register: 'r1', schema: 's1' })
		await store.refetchSearchCollection()

		expect(store.searchFacets.team.values).toEqual([
			{ value: TEAM_ALPHA, count: 12, label: 'Team Alpha' },
			{ value: TEAM_BETA, label: 'Team Beta' },
		])
	})
})
