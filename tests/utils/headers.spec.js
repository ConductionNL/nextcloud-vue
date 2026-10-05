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

	it('serializes array values with PHP bracket notation', () => {
		const result = buildQueryString({
			type: ['person', 'organization'],
		})

		// URLSearchParams percent-encodes the brackets; PHP decodes
		// `type%5B%5D` back to the `type[]` array param.
		expect(decodeURIComponent(result)).toBe('?type[]=person&type[]=organization')
	})

	it('skips empty/nullish array items but keeps brackets', () => {
		const result = buildQueryString({
			type: ['person', '', null, 'organization'],
		})

		expect(decodeURIComponent(result)).toBe('?type[]=person&type[]=organization')
	})
})

describe('buildQueryString filter operators', () => {
	const { buildQueryString } = require('../../src/utils/headers.js')
	const decoded = (params) => decodeURIComponent(buildQueryString(params))

	it('serialises a nested operator in bracket form, not as JSON', () => {
		expect(decoded({ assignee: 'admin', slaDeadline: { lt: '2026-10-06' }, _limit: 1 }))
			.toBe('?assignee=admin&slaDeadline[lt]=2026-10-06&_limit=1')
	})

	it('serialises several operators on one field, and an array operand', () => {
		expect(decoded({ deadline: { gte: '2026-10-01', lt: '2026-10-06' } })).toBe('?deadline[gte]=2026-10-01&deadline[lt]=2026-10-06')
		expect(decoded({ status: { in: ['open', 'doing'] } })).toBe('?status[in][]=open&status[in][]=doing')
	})

	it('passes a key already in bracket form through unchanged', () => {
		expect(decoded({ 'slaDeadline[lt]': '2026-10-06' })).toBe('?slaDeadline[lt]=2026-10-06')
	})

	it('keeps JSON for reserved keys and bracket arrays for lists', () => {
		expect(decoded({ _order: { name: 'asc' } })).toBe('?_order={"name":"asc"}')
		expect(decoded({ status: ['a', 'b'] })).toBe('?status[]=a&status[]=b')
	})

	it('skips an empty operand', () => {
		expect(decoded({ deadline: { lt: '', gte: null } })).toBe('')
	})
})

describe('a count source sends its operator in bracket form', () => {
	it('requests slaDeadline[lt]=… for a visibleWhen source filter', async () => {
		const { readVisibleWhenValue } = require('../../src/utils/visibleWhen.js')
		const realFetch = global.fetch
		global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ total: 3, results: [] }) }))
		try {
			const total = await readVisibleWhenValue({
				source: { register: 'pipelinq', schema: 'ticket', filter: { status: 'in_progress', slaDeadline: { lt: '2026-10-06' } } },
			})
			const url = decodeURIComponent(global.fetch.mock.calls[0][0])
			expect(total).toBe(3)
			expect(url).toContain('/apps/openregister/api/objects/pipelinq/ticket?status=in_progress&slaDeadline[lt]=2026-10-06&_limit=1')
			expect(url).not.toContain('{')
		} finally {
			global.fetch = realFetch
		}
	})
})
