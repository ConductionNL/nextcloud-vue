/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Layout/observer APIs that jsdom does not implement, for the `check:smoke`
 * lane.
 *
 * The smoke lane mounts EVERY component, including ones the behavioural suite
 * never touches, so it is the first lane to reach code that observes element
 * geometry. jsdom ships none of these APIs, and the failure is a bare
 * `ResizeObserver is not defined` thrown from `mounted()` — indistinguishable,
 * in the sweep's report, from a genuine component defect. `CnCard` was the
 * first to hit it.
 *
 * These are deliberately INERT (they record nothing and never fire a
 * callback) rather than simulated: jsdom has no layout engine, so any size it
 * reported would be fiction, and a component that renders differently based on
 * fictional geometry would be asserted against fiction. The contract this lane
 * checks is "mounts and renders without error", which needs the API to EXIST,
 * not to work. Anything that genuinely depends on measured layout belongs in
 * the Playwright lane, against a real browser.
 */

/**
 * Install an inert observer class under `name` if the environment lacks it.
 *
 * @param {string} name Global constructor name (e.g. 'ResizeObserver').
 */
function installInertObserver(name) {
	if (typeof globalThis[name] !== 'undefined') {
		return
	}
	globalThis[name] = class {

		observe() {}
		unobserve() {}
		disconnect() {}
		takeRecords() {
			return []
		}

	}
}

installInertObserver('ResizeObserver')
installInertObserver('IntersectionObserver')
installInertObserver('MutationObserver')

// `matchMedia` is absent in jsdom and read during setup by components that
// branch on a breakpoint or on `prefers-reduced-motion`. Reports "does not
// match" for everything, which is the quiet default: a component that honours
// reduced motion or a narrow viewport still renders its standard tree.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
	window.matchMedia = (query) => ({
		matches: false,
		media: String(query),
		onchange: null,
		addListener() {},
		removeListener() {},
		addEventListener() {},
		removeEventListener() {},
		dispatchEvent() {
			return false
		},
	})
}

// jsdom implements neither, and GridStack-backed and canvas-backed widgets call
// them from mounted(). Both are no-ops here for the same reason as the
// observers above.
if (typeof window !== 'undefined') {
	if (typeof window.requestAnimationFrame !== 'function') {
		window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0)
		window.cancelAnimationFrame = (id) => clearTimeout(id)
	}
	if (typeof Element !== 'undefined' && typeof Element.prototype.scrollIntoView !== 'function') {
		Element.prototype.scrollIntoView = function scrollIntoView() {}
	}
}
