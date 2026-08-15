/**
 * Jest stub for `@vueuse/core`.
 *
 * Provides a minimal `tryOnScopeDispose` stub that calls the callback immediately
 * in tests (simulating scope disposal) unless tests override it.
 */

module.exports = {
	__esModule: true,
	tryOnScopeDispose: jest.fn(),
}
