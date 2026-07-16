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
		removeWidget: jest.fn(),
		enable: jest.fn(),
		disable: jest.fn(),
		save: jest.fn(() => []),
		load: jest.fn(),
		batchUpdate: jest.fn(),
		commit: jest.fn(),
		// CnDashboardGrid.syncGridItems reads `grid.engine.nodes`; give the
		// stub an empty engine so the layout watcher is a no-op under jsdom.
		engine: { nodes: [] },
	})),
}

module.exports = { GridStack }
module.exports.default = { GridStack }
