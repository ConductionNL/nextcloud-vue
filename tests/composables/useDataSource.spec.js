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

const { ref } = require('vue')
const axios = require('@nextcloud/axios').default
const { useDataSource, buildCountQuery, buildBucketQuery } = require('../../src/composables/useDataSource.js')

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

describe('buildBucketQuery', () => {
	test('builds groupBy query with from/to variables', () => {
		const q = buildBucketQuery({
			schemaSlug: 'call_log',
			filter: { status: 'error' },
			bucket: { field: 'created', interval: 'day' },
		})
		expect(q).toContain('query($from: String!, $to: String!)')
		expect(q).toContain('call_log(filter: {status: "error"}')
		expect(q).toContain('groupBy: { field: "created", interval: DAY, from: $from, to: $to }')
		expect(q).toContain('groups { key value }')
	})

	test('uppercases interval case-insensitively', () => {
		expect(buildBucketQuery({
			schemaSlug: 'c',
			bucket: { field: 'f', interval: 'day' },
		})).toContain('interval: DAY')
		expect(buildBucketQuery({
			schemaSlug: 'c',
			bucket: { field: 'f', interval: 'DAY' },
		})).toContain('interval: DAY')
		expect(buildBucketQuery({
			schemaSlug: 'c',
			bucket: { field: 'f', interval: 'Quarter' },
		})).toContain('interval: QUARTER')
	})

	test('omits filter arg when none given', () => {
		const q = buildBucketQuery({
			schemaSlug: 'c',
			bucket: { field: 'f', interval: 'day' },
		})
		expect(q).not.toContain('filter:')
		expect(q).toContain('c(groupBy:')
	})

	test('adds metric + metricField for non-count metrics', () => {
		const q = buildBucketQuery({
			schemaSlug: 'order',
			bucket: { field: 'created', interval: 'day', metric: 'sum', metricField: 'amount' },
		})
		expect(q).toContain('metric: SUM')
		expect(q).toContain('metricField: "amount"')
	})

	test('default fromVar/toVar can be customised', () => {
		const q = buildBucketQuery({
			schemaSlug: 'c',
			bucket: { field: 'f', interval: 'day', fromVar: 'since', toVar: 'until' },
		})
		expect(q).toContain('query($since: String!, $until: String!)')
		expect(q).toContain('from: $since, to: $until')
	})

	test('throws on unknown interval', () => {
		expect(() => buildBucketQuery({
			schemaSlug: 'c',
			bucket: { field: 'f', interval: 'fortnight' },
		})).toThrow(/unknown interval/)
	})

	test('throws on non-count metric without metricField', () => {
		expect(() => buildBucketQuery({
			schemaSlug: 'c',
			bucket: { field: 'f', interval: 'day', metric: 'sum' },
		})).toThrow(/metricField is required/)
	})

	test('throws on unknown metric', () => {
		expect(() => buildBucketQuery({
			schemaSlug: 'c',
			bucket: { field: 'f', interval: 'day', metric: 'median', metricField: 'x' },
		})).toThrow(/unknown metric/)
	})

	test('throws when bucket.field is missing', () => {
		expect(() => buildBucketQuery({
			schemaSlug: 'c',
			bucket: { interval: 'day' },
		})).toThrow(/bucket\.field is required/)
	})
})

describe('useDataSource — bucket shorthand', () => {
	beforeEach(() => axios.post.mockReset())

	test('uses staticRange when no inject range is supplied', async () => {
		axios.post.mockResolvedValue({
			data: {
				data: {
					call_log: {
						groups: [
							{ key: '2026-05-01T00:00:00Z', value: 3 },
							{ key: '2026-05-02T00:00:00Z', value: 1 },
						],
					},
				},
			},
		})
		const { data, refetch } = useDataSource({
			schema: 'call_log',
			filter: { status: 'error' },
			bucket: {
				field: 'created',
				interval: 'day',
				staticRange: {
					from: '2026-05-01T00:00:00.000Z',
					to: '2026-05-22T00:00:00.000Z',
				},
			},
		})
		await refetch()
		const call = axios.post.mock.calls[0][1]
		expect(call.query).toContain('groupBy:')
		expect(call.variables).toEqual({
			from: '2026-05-01T00:00:00.000Z',
			to: '2026-05-22T00:00:00.000Z',
		})
		expect(data.value).toEqual({
			series: [3, 1],
			categories: ['2026-05-01T00:00:00Z', '2026-05-02T00:00:00Z'],
		})
	})

	test('inject range overrides staticRange', async () => {
		axios.post.mockResolvedValue({
			data: { data: { call_log: { groups: [] } } },
		})
		const range = ref({
			from: '2026-06-01T00:00:00.000Z',
			to: '2026-06-07T23:59:59.999Z',
			preset: 'last-7',
		})
		const { refetch } = useDataSource(
			{
				schema: 'call_log',
				bucket: {
					field: 'created',
					interval: 'day',
					staticRange: { from: '2026-01-01T00:00:00.000Z', to: '2026-12-31T00:00:00.000Z' },
				},
			},
			{ range },
		)
		await refetch()
		const vars = axios.post.mock.calls[0][1].variables
		expect(vars).toEqual({
			from: '2026-06-01T00:00:00.000Z',
			to: '2026-06-07T23:59:59.999Z',
		})
	})

	test('no range available → no fetch', async () => {
		const { data, refetch } = useDataSource({
			schema: 'call_log',
			bucket: { field: 'created', interval: 'day' },
		})
		await refetch()
		expect(axios.post).not.toHaveBeenCalled()
		expect(data.value).toBeNull()
	})

	test('unknown interval surfaces error without firing', async () => {
		const { error, refetch } = useDataSource({
			schema: 'call_log',
			bucket: {
				field: 'created',
				interval: 'fortnight',
				staticRange: { from: 'x', to: 'y' },
			},
		})
		await refetch()
		expect(axios.post).not.toHaveBeenCalled()
		expect(error.value).not.toBeNull()
		expect(error.value.message).toMatch(/unknown interval/)
	})

	test('sum metric without metricField surfaces error without firing', async () => {
		const { error, refetch } = useDataSource({
			schema: 'order',
			bucket: {
				field: 'created',
				interval: 'day',
				metric: 'sum',
				staticRange: { from: 'x', to: 'y' },
			},
		})
		await refetch()
		expect(axios.post).not.toHaveBeenCalled()
		expect(error.value).not.toBeNull()
		expect(error.value.message).toMatch(/metricField is required/)
	})

	test('custom fromVar/toVar names flow into variables', async () => {
		axios.post.mockResolvedValue({ data: { data: { c: { groups: [] } } } })
		const { refetch } = useDataSource({
			schema: 'c',
			bucket: {
				field: 'f',
				interval: 'day',
				fromVar: 'since',
				toVar: 'until',
				staticRange: { from: 'a', to: 'b' },
			},
		})
		await refetch()
		expect(axios.post.mock.calls[0][1].variables).toEqual({ since: 'a', until: 'b' })
	})
})
