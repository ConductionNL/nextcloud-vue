/**
 * Jest mock for `gridstack`. The real package ships ES modules and
 * triggers a Babel parse error before per-test `jest.mock(...)` calls
 * can intercept it; this stub gives the dashboard tests a static
 * surface.
 */
const GridStack = {
	init: jest.fn(() => ({
		on: jest.fn(),
		off: jest.fn(),
		destroy: jest.fn(),
		removeAll: jest.fn(),
		addWidget: jest.fn(),
		makeWidget: jest.fn(),
		save: jest.fn(() => []),
		load: jest.fn(),
		batchUpdate: jest.fn(),
		commit: jest.fn(),
	})),
}

module.exports = { GridStack }
module.exports.default = { GridStack }
