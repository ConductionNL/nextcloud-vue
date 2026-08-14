/**
 * Jest mock for `gridstack`. The real package ships ES modules and
 * triggers a Babel parse error before per-test `jest.mock(...)` calls
 * can intercept it; this stub gives the dashboard tests a static
 * surface.
 *
 * The stub is deliberately a little more than inert: `on()` records its
 * handlers and `update()` writes the new rectangle onto the element's
 * `gs-*` attributes and then fires `change` — exactly what the real engine
 * does. Without that, a spec for CnDashboardGrid's keyboard repositioning
 * could only assert "we called update()", never that a keyboard nudge
 * reaches `layout-change` through the same path a drag does. Every method
 * is still a `jest.fn`, so the call-count assertions in the existing
 * dashboard specs keep working.
 */
const GridStack = {
	init: jest.fn((opts = {}) => {
		const handlers = {}

		const instance = {
			/** Registered event handlers, keyed by event name. */
			_handlers: handlers,
			/** The options GridStack was initialised with. */
			_opts: opts,
			/**
			 * Fire a recorded handler — the test-side equivalent of the real
			 * engine emitting an event.
			 *
			 * @param {string} name Event name.
			 * @param {...any} args Handler arguments.
			 * @return {void}
			 */
			_trigger(name, ...args) {
				if (typeof handlers[name] === 'function') {
					handlers[name](...args)
				}
			},
			on: jest.fn((name, fn) => {
				handlers[name] = fn
			}),
			off: jest.fn((name) => {
				delete handlers[name]
			}),
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
			getColumn: jest.fn(() => (typeof opts.column === 'number' ? opts.column : 12)),
			update: jest.fn((el, patch = {}) => {
				if (!el || typeof el.setAttribute !== 'function') {
					return
				}
				const read = (attr, fallback) => {
					const raw = el.getAttribute(attr)
					const num = raw === null ? NaN : Number(raw)
					return Number.isFinite(num) ? num : fallback
				}
				const next = {
					x: patch.x !== undefined ? patch.x : read('gs-x', 0),
					y: patch.y !== undefined ? patch.y : read('gs-y', 0),
					w: patch.w !== undefined ? patch.w : read('gs-w', 1),
					h: patch.h !== undefined ? patch.h : read('gs-h', 1),
				}
				el.setAttribute('gs-x', String(next.x))
				el.setAttribute('gs-y', String(next.y))
				el.setAttribute('gs-w', String(next.w))
				el.setAttribute('gs-h', String(next.h))
				instance._trigger('change', null, [{ id: el.getAttribute('gs-id'), ...next }])
			}),
			// CnDashboardGrid.syncGridItems reads `grid.engine.nodes`; give the
			// stub an empty engine so the layout watcher is a no-op under jsdom.
			engine: { nodes: [] },
		}

		return instance
	}),
}

module.exports = { GridStack }
module.exports.default = { GridStack }
