/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A non-decreasing `Date.now()` for the jest environment.
 *
 * WHY THIS EXISTS
 *
 * `Date.now()` reads CLOCK_REALTIME, and on this workspace (WSL2) that clock
 * STEPS BACKWARDS under load. Measured over 199,897,765 readings in 100
 * seconds: 4,088,103 of them were LOWER than the reading before, the worst by
 * 671 ms. It is the wall clock and not measurement noise, because in the same
 * loop `process.hrtime.bigint()` never went backwards once: one step put
 * `Date.now()` 573 ms in the past while hrtime had advanced 73 ms.
 *
 * Vue's DOM event layer assumes that clock only ever moves forward. Every
 * listener it attaches stamps itself with the moment it was attached, and then
 * refuses any event that claims to be older (`createInvoker` in
 * `@vue/runtime-dom`):
 *
 *     const invoker = (e) => {
 *         if (!e._vts) { e._vts = Date.now() }
 *         else if (e._vts <= invoker.attached) { return }   // dropped
 *         ...
 *     }
 *     invoker.attached = getNow()                           // Date.now()
 *
 * The guard is there for a real browser problem: a handler attached during the
 * patch that an inner click triggered would otherwise fire for that same click
 * (vuejs/vue#6566). Vue Test Utils plays along by stamping the events it
 * dispatches, `event._vts = Date.now() + 1`, immediately before
 * `dispatchEvent`.
 *
 * So the comparison is between two `Date.now()` readings: one taken when the
 * component mounted, one taken when the test fired the event. When the clock
 * steps back further than the gap between those two moments, the event arrives
 * looking OLDER than the listener and Vue returns without calling the handler.
 * Nothing throws and nothing warns. The component simply does not react.
 *
 * THE SYMPTOM IS A CLICK, OR A KEYSTROKE, THAT DOES NOTHING, in a spec that
 * passes on the next run. `wrapper.emitted('select')` comes back undefined and
 * the assertion dies reading a property of undefined, nowhere near the cause.
 * Reproduced on `CnRelatedObjectsWidget.spec.js` (nextcloud-vue#1102) at
 * roughly one run in twenty while the machine was busy: once on the Add-note
 * `trigger('input')`, whose `update:modelValue` was never emitted, and once on
 * a `trigger('click')` two tests earlier. `tests/setup.js` already names this
 * shape from four other specs, all of which have "nothing in common except
 * that they click".
 *
 * THE FIX IS TO GIVE VUE THE CLOCK IT ASSUMES, not to disable its guard. The
 * shim below hands back the highest reading seen so far, so a backwards step
 * flattens into a pause instead of moving time in reverse. It is a floor and
 * never an offset: while the real clock is ahead of the last reading, which is
 * every reading on a sane clock, the real value passes straight through, and
 * after a step back the shim is at most that step ahead of the truth for the
 * few hundred ms it takes the real clock to catch up.
 *
 * It is installed over the global `Date.now` rather than around each
 * `trigger()` call, because every listener Vue attaches anywhere in the suite
 * takes its `attached` stamp from the same clock, and a per-call workaround
 * would have to be remembered at hundreds of call sites.
 *
 * Jest's fake timers are unaffected: they replace the whole `Date` global and
 * restore it afterwards, so this wrapper is simply not the clock in use while
 * they are installed, and is the clock again as soon as they are not.
 */

/** The clock as the environment supplies it, captured before anything wraps it. */
const realClock = Date.now.bind(Date)

/** The clock `monotonicNow` reads. Only a test ever changes it. */
let source = realClock

/** The highest reading handed out so far. */
let ceiling = 0

/**
 * `Date.now()`, floored at the highest value already returned.
 *
 * @return {number} Milliseconds since the epoch, never lower than last time.
 */
export function monotonicNow() {
	const now = source()
	if (now > ceiling) {
		ceiling = now
	}
	return ceiling
}

/** Install the shim over the global `Date.now`. */
export function installMonotonicDateNow() {
	Date.now = monotonicNow
}

/**
 * Make the shim read a shifted clock, so a spec can reproduce a backwards step
 * without waiting for the host to deliver one.
 *
 * The shift is applied UNDER the shim rather than over it: a spec that stubbed
 * `Date.now` itself would replace the shim instead of exercising it, and would
 * fail whether the shim were there or not.
 *
 * @param {(realNow: number) => number} shift Maps a real reading to a fake one.
 * @return {Function} Call it to put the real clock back.
 */
export function __setClockSourceForTests(shift) {
	const previous = source
	source = () => shift(realClock())
	return () => {
		source = previous
	}
}
