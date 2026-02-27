import { buildHeaders, buildQueryString } from '../../src/utils/headers.js'

describe('buildHeaders', () => {
	it('includes requesttoken and OCS header', () => {
		const headers = buildHeaders()

		expect(headers.requesttoken).toBe('test-token-12345')
		expect(headers['OCS-APIREQUEST']).toBe('true')
		expect(headers['Content-Type']).toBe('application/json')
	})

	it('uses custom content type', () => {
		const headers = buildHeaders('text/plain')

		expect(headers['Content-Type']).toBe('text/plain')
	})

	it('omits content type when null', () => {
		const headers = buildHeaders(null)

		expect(headers['Content-Type']).toBeUndefined()
	})
})

describe('buildQueryString', () => {
	it('returns empty string for no params', () => {
		expect(buildQueryString()).toBe('')
		expect(buildQueryString({})).toBe('')
	})

	it('builds query string with leading ?', () => {
		const result = buildQueryString({ _limit: 20, _page: 1 })

		expect(result).toBe('?_limit=20&_page=1')
	})

	it('skips null/undefined/empty values', () => {
		const result = buildQueryString({
			_search: 'test',
			_limit: null,
			_page: undefined,
			_filter: '',
		})

		expect(result).toBe('?_search=test')
	})

	it('JSON-stringifies _order objects', () => {
		const result = buildQueryString({
			_order: { name: 'asc' },
		})

		expect(result).toBe('?_order=%7B%22name%22%3A%22asc%22%7D')
		expect(decodeURIComponent(result)).toBe('?_order={"name":"asc"}')
	})
})
