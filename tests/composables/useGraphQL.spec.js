/**
 * Tests for useGraphQL + selectByPath.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { post: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((path) => `/index.php${path}`),
}))

const axios = require('@nextcloud/axios').default
const { useGraphQL, selectByPath } = require('../../src/composables/useGraphQL.js')

describe('selectByPath', () => {
	test('reads scalar via dot path', () => {
		expect(selectByPath({ data: { foo: { totalCount: 7 } } }, 'data.foo.totalCount')).toBe(7)
	})

	test('flat-maps via [] segment', () => {
		const obj = { data: { foo: [{ count: 1 }, { count: 2 }, { count: 3 }] } }
		expect(selectByPath(obj, 'data.foo[].count')).toEqual([1, 2, 3])
	})

	test('returns undefined for missing path', () => {
		expect(selectByPath({ a: 1 }, 'b.c')).toBeUndefined()
	})

	test('returns empty array when [] hop hits null', () => {
		expect(selectByPath({ data: { foo: null } }, 'data.foo[].count')).toEqual([])
	})

	test('null obj returns undefined', () => {
		expect(selectByPath(null, 'a')).toBeUndefined()
	})
})

describe('useGraphQL', () => {
	beforeEach(() => {
		axios.post.mockReset()
	})

	test('posts query + variables, exposes data ref', async () => {
		axios.post.mockResolvedValue({ data: { data: { foo: { totalCount: 5 } } } })
		const { data, loading, error, refetch } = useGraphQL('{ foo { totalCount } }', { x: 1 }, { immediate: false })
		expect(loading.value).toBe(false)
		await refetch()
		expect(loading.value).toBe(false)
		expect(error.value).toBeNull()
		expect(data.value).toEqual({ foo: { totalCount: 5 } })
		expect(axios.post.mock.calls[0][0]).toContain('/api/graphql')
		expect(axios.post.mock.calls[0][1]).toMatchObject({
			query: '{ foo { totalCount } }',
			variables: { x: 1 },
		})
	})

	test('surfaces GraphQL errors[]', async () => {
		axios.post.mockResolvedValue({
			data: { data: null, errors: [{ message: 'syntax error' }, { message: 'second' }] },
		})
		const { error, refetch } = useGraphQL('{ broken }', {}, { immediate: false })
		await refetch()
		expect(error.value).not.toBeNull()
		expect(error.value.message).toContain('syntax error')
		expect(error.value.message).toContain('second')
	})

	test('wraps transport errors', async () => {
		const boom = new Error('boom')
		axios.post.mockRejectedValue(boom)
		const { error, data, refetch } = useGraphQL('{ x }', {}, { immediate: false })
		await refetch()
		expect(error.value).toBe(boom)
		expect(data.value).toBeNull()
	})

	test('immediate=false defers the first request', async () => {
		const { refetch } = useGraphQL('{ x }', {}, { immediate: false })
		expect(axios.post).not.toHaveBeenCalled()
		axios.post.mockResolvedValue({ data: { data: {} } })
		await refetch()
		expect(axios.post).toHaveBeenCalledTimes(1)
	})

	test('null query never fires', async () => {
		const { data, refetch } = useGraphQL(null, {}, { immediate: false })
		await refetch()
		expect(axios.post).not.toHaveBeenCalled()
		expect(data.value).toBeNull()
	})
})
