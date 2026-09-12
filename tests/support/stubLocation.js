/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Spy on `window.location.assign` / `replace` / `reload` under jsdom 21+.
 *
 * WHY THIS FILE EXISTS. Four specs used to fake navigation the way every
 * Jest tutorial written before 2023 does:
 *
 *     const original = window.location
 *     delete window.location
 *     window.location = { assign: jest.fn(), ... }
 *
 * That worked under Jest 29, whose `jest-environment-jsdom` pinned jsdom 20.
 * It does not work under Jest 30, which ships jsdom 26. Measured against a
 * raw `new JSDOM()` on every major from 19 to 26: the window's `location`
 * descriptor is `configurable: true` on 19 and 20, and `configurable: false`
 * from 21 onwards, per the HTML standard's `[LegacyUnforgeable]` on
 * `Window.location`. So the bump is not what changed the behaviour; jsdom 21
 * did, three years ago, and Jest 29 was simply holding an old jsdom.
 *
 * WHAT THAT COSTS IF YOU DO NOTHING, and why this is not cosmetic. The
 * `delete` returns `false` instead of throwing, and the assignment that
 * follows runs jsdom's real `location` setter, which tries to navigate. The
 * spec then reads the REAL location back, so `window.location.assign` is the
 * real, non-mock function and the assertion fails with "received value must
 * be a mock or spy function". That is the loud version. The quiet version is
 * a spec that only reads `window.location.pathname`: it keeps passing while
 * silently testing jsdom's default `/` instead of the value it meant to set.
 *
 * WHY EVERY OBVIOUS ALTERNATIVE IS CLOSED. All of these were tried against
 * jsdom 26 and all of them throw or no-op:
 *
 *   delete window.location                    returns false, deletes nothing
 *   Object.defineProperty(window, 'location') "Cannot redefine property"
 *   jest.spyOn(window, 'location', 'get')     "not declared configurable"
 *   jest.spyOn(window.location, 'assign')     "Cannot assign to read only"
 *   Object.defineProperty(location, 'assign') "Cannot redefine property"
 *
 * `assign`, `replace` and `reload` are own properties of the `Location`
 * instance, non-writable and non-configurable, so neither the instance nor
 * its prototype offers a seam.
 *
 * WHAT THIS DOES INSTEAD. Every jsdom Web IDL wrapper keeps its
 * implementation object behind a well-known symbol, and the implementation
 * is an ordinary class instance whose methods are writable. Spying there
 * puts the spy UNDER the read-only wrapper, so production code still calls
 * `window.location.assign(url)` exactly as it does in a browser and the spy
 * records the URL it was given. The assertion keeps its full strength: it is
 * still "navigation was requested, to this URL", not a weaker stand-in.
 *
 * This reaches past a public API and is a hack, so it is written down once
 * here rather than copied into four specs. It is the workaround Jest's own
 * issue tracker settles on (jestjs/jest#15674), and the alternative is a
 * navigation seam threaded through roughly fifteen production call sites,
 * which is a refactor and not a test fix.
 */

/**
 * The symbol jsdom hangs a wrapper's implementation object off.
 *
 * Found by inspection rather than imported: the symbol lives in
 * `jsdom/lib/jsdom/living/generated/utils.js`, which is not a public entry
 * point, and a deep require into jsdom would break on any repackaging. A
 * `Location` wrapper carries exactly one own symbol key, so this is
 * unambiguous.
 *
 * @param {object} wrapper The jsdom Web IDL wrapper to look inside.
 * @return {object} The implementation object behind it.
 */
function implOf(wrapper) {
	const key = Reflect.ownKeys(wrapper).find((k) => typeof k === 'symbol')

	if (!key) {
		throw new Error(
			'stubLocation: no implementation symbol on window.location. '
			+ 'jsdom has changed how it stores wrapper implementations, so this '
			+ 'helper needs revisiting rather than working around.',
		)
	}

	return wrapper[key]
}

/**
 * Replace one navigation method on `window.location` with a jest mock.
 *
 * The returned mock is a normal `jest.spyOn` result, so assert on it with
 * `toHaveBeenCalledWith` and hand it back with `.mockRestore()` when the test
 * is done. Restoring matters: the spy is installed on the implementation
 * object, which the jsdom window keeps for the whole test FILE, so a spy left
 * behind would swallow navigation in every later test in that file.
 *
 * @param {'assign'|'replace'|'reload'} method The navigation method to stub.
 * @return {object} The installed jest spy.
 */
export function stubLocationMethod(method) {
	return jest.spyOn(implOf(window.location), method).mockImplementation(() => {})
}
