/**
 * Tests for the shared route-filter resolvers.
 *
 * Both were private to `CnIndexPage/useSelfFetchList.js` until `CnLogsPage`
 * needed the same two grammars (route-param interpolation + `?key=value`
 * deep links). They are pure, so they're covered here rather than through
 * two page components.
 */

const { resolveFilterMap, resolveQueryFilters } = require('../../src/utils/routeFilters.js')

describe('resolveQueryFilters', () => {
	it('passes through every non-reserved query entry as a filter', () => {
		expect(resolveQueryFilters({ jobId: 'j-1', level: 'ERROR' }))
			.toEqual({ jobId: 'j-1', level: 'ERROR' })
	})

	it('skips reserved underscore-prefixed list params', () => {
		expect(resolveQueryFilters({ jobId: 'j-1', _page: '2', _limit: '50', _search: 'x', _order: '[]' }))
			.toEqual({ jobId: 'j-1' })
	})

	it('drops null / undefined / empty-string values', () => {
		expect(resolveQueryFilters({ a: null, b: undefined, c: '', d: 'keep' }))
			.toEqual({ d: 'keep' })
	})

	it('keeps array values, so ?status[]=a&status[]=b stays an IN match', () => {
		expect(resolveQueryFilters({ status: ['a', 'b'] })).toEqual({ status: ['a', 'b'] })
	})

	it('keeps a falsy-but-meaningful "0"', () => {
		expect(resolveQueryFilters({ retryCount: '0' })).toEqual({ retryCount: '0' })
	})

	it('returns an empty map for a missing or non-object query', () => {
		expect(resolveQueryFilters(undefined)).toEqual({})
		expect(resolveQueryFilters(null)).toEqual({})
		expect(resolveQueryFilters('nope')).toEqual({})
	})
})

describe('resolveFilterMap', () => {
	it('interpolates an "@route.<name>" value from route params', () => {
		expect(resolveFilterMap({ jobId: '@route.id' }, { id: 'job-42' }))
			.toEqual({ jobId: 'job-42' })
	})

	it('interpolates the ":<name>" shorthand from route params', () => {
		expect(resolveFilterMap({ jobId: ':id' }, { id: 'job-42' }))
			.toEqual({ jobId: 'job-42' })
	})

	it('passes literals through untouched', () => {
		expect(resolveFilterMap({ level: 'ERROR', archived: false, limit: 5 }, {}))
			.toEqual({ level: 'ERROR', archived: false, limit: 5 })
	})

	it('returns an empty map for a missing or non-object filter map', () => {
		expect(resolveFilterMap(null, {})).toEqual({})
		expect(resolveFilterMap(undefined, {})).toEqual({})
		expect(resolveFilterMap('nope', {})).toEqual({})
	})
})
