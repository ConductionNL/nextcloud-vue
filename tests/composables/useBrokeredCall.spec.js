/**
 * Tests for useBrokeredCall — external-provider fetch THROUGH the
 * OpenRegister credential broker (zero-secret, session-authenticated).
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
const {
	useBrokeredCall,
	buildBrokerPath,
	parseBrokeredBody,
	brokerSessionRequestUrl,
} = require('../../src/composables/useBrokeredCall.js')

describe('buildBrokerPath', () => {
	test('returns path unchanged when no query', () => {
		expect(buildBrokerPath('/repos/foo/issues', null)).toBe('/repos/foo/issues')
		expect(buildBrokerPath('/repos/foo/issues', {})).toBe('/repos/foo/issues')
	})

	test('appends query string', () => {
		expect(buildBrokerPath('/issues', { state: 'open', per_page: 20 }))
			.toBe('/issues?state=open&per_page=20')
	})

	test('joins with & when path already has a query', () => {
		expect(buildBrokerPath('/issues?page=2', { state: 'open' }))
			.toBe('/issues?page=2&state=open')
	})

	test('repeats key for array values, drops null/undefined', () => {
		expect(buildBrokerPath('/x', { tag: ['a', 'b'], skip: null, gone: undefined }))
			.toBe('/x?tag=a&tag=b')
	})
})

describe('parseBrokeredBody', () => {
	test('parses JSON object/array bodies', () => {
		expect(parseBrokeredBody('{"a":1}')).toEqual({ a: 1 })
		expect(parseBrokeredBody('[1,2,3]')).toEqual([1, 2, 3])
	})

	test('returns raw string for non-JSON / plain text', () => {
		expect(parseBrokeredBody('hello world')).toBe('hello world')
	})

	test('returns raw string when JSON parse fails', () => {
		expect(parseBrokeredBody('{not json')).toBe('{not json')
	})

	test('null/empty become null', () => {
		expect(parseBrokeredBody(null)).toBeNull()
		expect(parseBrokeredBody('')).toBeNull()
		expect(parseBrokeredBody('   ')).toBeNull()
	})
})

describe('brokerSessionRequestUrl', () => {
	test('builds the session-request URL, url-encoding the id', () => {
		expect(brokerSessionRequestUrl('cred 1/2'))
			.toBe('/index.php/apps/openregister/api/credentials/cred%201%2F2/session-request')
	})
})

describe('useBrokeredCall', () => {
	beforeEach(() => axios.post.mockReset())

	test('happy path — POSTs to the broker, exposes parsed data', async () => {
		axios.post.mockResolvedValue({
			data: { status: 200, headers: {}, body: '{"login":"octocat"}' },
		})
		const { data, loading, error, refetch } = useBrokeredCall({
			credentialId: 'abc',
			appId: 'pipelinq',
			method: 'GET',
			path: '/user',
		}, { immediate: false })
		expect(loading.value).toBe(false)
		await refetch()
		expect(loading.value).toBe(false)
		expect(error.value).toBeNull()
		expect(data.value).toEqual({ login: 'octocat' })
		// URL targets the session-request endpoint for the credential.
		expect(axios.post.mock.calls[0][0])
			.toBe('/index.php/apps/openregister/api/credentials/abc/session-request')
		// Body carries the manifest app id, method, path (never a secret).
		expect(axios.post.mock.calls[0][1]).toEqual({
			appId: 'pipelinq',
			method: 'GET',
			path: '/user',
			body: null,
		})
	})

	test('assembles the query string onto the path', async () => {
		axios.post.mockResolvedValue({ data: { status: 200, body: '[]' } })
		const { refetch } = useBrokeredCall({
			credentialId: 'abc',
			appId: 'pipelinq',
			path: '/repos/foo/issues',
			query: { state: 'open', per_page: 20 },
		}, { immediate: false })
		await refetch()
		expect(axios.post.mock.calls[0][1].path).toBe('/repos/foo/issues?state=open&per_page=20')
	})

	test('forwards headers and body when supplied', async () => {
		axios.post.mockResolvedValue({ data: { status: 201, body: '{}' } })
		const { refetch } = useBrokeredCall({
			credentialId: 'abc',
			appId: 'pipelinq',
			method: 'post',
			path: '/things',
			headers: { Accept: 'application/json' },
			body: '{"name":"x"}',
		}, { immediate: false })
		await refetch()
		expect(axios.post.mock.calls[0][1]).toEqual({
			appId: 'pipelinq',
			method: 'POST',
			path: '/things',
			headers: { Accept: 'application/json' },
			body: '{"name":"x"}',
		})
	})

	test('responsePath slices the parsed body', async () => {
		axios.post.mockResolvedValue({
			data: { status: 200, body: '{"items":[{"title":"first"},{"title":"second"}]}' },
		})
		const { data, refetch } = useBrokeredCall({
			credentialId: 'abc',
			appId: 'pipelinq',
			path: '/issues',
			responsePath: 'items[].title',
		}, { immediate: false })
		await refetch()
		expect(data.value).toEqual(['first', 'second'])
	})

	test('403 → clean error, no secret, data null', async () => {
		const boom = new Error('Request failed with status code 403')
		boom.response = { status: 403, data: { message: 'forbidden' } }
		axios.post.mockRejectedValue(boom)
		const { data, error, refetch } = useBrokeredCall({
			credentialId: 'abc',
			appId: 'pipelinq',
			path: '/user',
		}, { immediate: false })
		await refetch()
		expect(data.value).toBeNull()
		expect(error.value).not.toBeNull()
		expect(error.value.message).toContain('403')
		expect(error.value.message).toContain('allowedApps')
		// Never leaks a token / secret material.
		expect(error.value.message).not.toMatch(/secret|token|password|bearer/i)
	})

	test('502 → clean upstream-unreachable error', async () => {
		const boom = new Error('Request failed with status code 502')
		boom.response = { status: 502 }
		axios.post.mockRejectedValue(boom)
		const { error, refetch } = useBrokeredCall({
			credentialId: 'abc',
			appId: 'pipelinq',
			path: '/user',
		}, { immediate: false })
		await refetch()
		expect(error.value.message).toContain('502')
		expect(error.value.message).toMatch(/provider could not be reached/i)
	})

	test('non-2xx upstream envelope status → clean error, no body leak', async () => {
		axios.post.mockResolvedValue({
			data: { status: 404, headers: {}, body: '{"secret_leaked":"nope"}' },
		})
		const { data, error, refetch } = useBrokeredCall({
			credentialId: 'abc',
			appId: 'pipelinq',
			path: '/missing',
		}, { immediate: false })
		await refetch()
		expect(data.value).toBeNull()
		expect(error.value).not.toBeNull()
		expect(error.value.message).toContain('404')
		expect(error.value.message).not.toContain('secret_leaked')
	})

	test('transport error without a status → terse clean error', async () => {
		axios.post.mockRejectedValue(new Error('Network Error'))
		const { error, refetch } = useBrokeredCall({
			credentialId: 'abc',
			appId: 'pipelinq',
			path: '/user',
		}, { immediate: false })
		await refetch()
		expect(error.value.message).toMatch(/Brokered request failed/i)
	})

	test('immediate=false defers the first request', async () => {
		useBrokeredCall({ credentialId: 'abc', appId: 'pipelinq', path: '/user' }, { immediate: false })
		expect(axios.post).not.toHaveBeenCalled()
	})

	test('missing credentialId or path never fires', async () => {
		const a = useBrokeredCall({ appId: 'pipelinq', path: '/user' }, { immediate: false })
		const b = useBrokeredCall({ credentialId: 'abc', appId: 'pipelinq' }, { immediate: false })
		await a.refetch()
		await b.refetch()
		expect(axios.post).not.toHaveBeenCalled()
		expect(a.data.value).toBeNull()
		expect(b.data.value).toBeNull()
	})

	test('reactive config re-runs the request', async () => {
		axios.post.mockResolvedValue({ data: { status: 200, body: '{"ok":1}' } })
		const config = ref({ credentialId: 'abc', appId: 'pipelinq', path: '/a' })
		const { refetch } = useBrokeredCall(config, { immediate: false })
		await refetch()
		expect(axios.post).toHaveBeenCalledTimes(1)
		config.value = { credentialId: 'abc', appId: 'pipelinq', path: '/b' }
		// flush the deep watcher
		await Promise.resolve()
		await Promise.resolve()
		expect(axios.post.mock.calls[axios.post.mock.calls.length - 1][1].path).toBe('/b')
	})
})
