/**
 * Tests for useDataSource — the manifest dataSource resolver.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { post: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((path) => `/index.php${path}`),
}))

const axios = require('@nextcloud/axios').default
const { useDataSource, buildCountQuery } = require('../../src/composables/useDataSource.js')

describe('buildCountQuery', () => {
	test('omits filter arg when empty', () => {
		expect(buildCountQuery('meeting', null)).toBe('{ meeting { totalCount } }')
		expect(buildCountQuery('meeting', {})).toBe('{ meeting { totalCount } }')
	})

	test('inlines filter as GraphQL literal', () => {
		expect(buildCountQuery('meeting', { lifecycle: 'review' }))
			.toBe('{ meeting(filter: {lifecycle: "review"}) { totalCount } }')
	})

	test('serializes nested + array values', () => {
		const q = buildCountQuery('item', { taskStatus: ['open', 'in-progress'], owner: { id: 1 } })
		expect(q).toContain('taskStatus: ["open", "in-progress"]')
		expect(q).toContain('owner: {id: 1}')
	})
})

describe('useDataSource', () => {
	beforeEach(() => axios.post.mockReset())

	test('shorthand → builds count query, resolves to { count }', async () => {
		axios.post.mockResolvedValue({ data: { data: { meeting: { totalCount: 4 } } } })
		const { data, refetch } = useDataSource({
			register: 'decidesk',
			schema: 'meeting',
			filter: { lifecycle: 'review' },
			aggregate: 'count',
		})
		await refetch()
		expect(data.value).toEqual({ count: 4 })
		expect(axios.post.mock.calls[0][1].query).toContain('meeting(filter:')
	})

	test('raw graphql form respects custom selectors', async () => {
		axios.post.mockResolvedValue({
			data: { data: { foo: [{ count: 1 }, { count: 2 }] } },
		})
		const { data, refetch } = useDataSource({
			graphql: {
				query: 'query { foo { count } }',
				selectors: { values: 'foo[].count' },
			},
		})
		await refetch()
		expect(data.value).toEqual({ values: [1, 2] })
		expect(axios.post.mock.calls[0][1].query).toBe('query { foo { count } }')
	})

	test('null dataSource never fires', async () => {
		const { data, refetch } = useDataSource(null)
		await refetch()
		expect(axios.post).not.toHaveBeenCalled()
		expect(data.value).toBeNull()
	})
})
