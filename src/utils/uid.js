/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Per-instance unique ids for ARIA wiring.
 *
 * WHY THIS EXISTS: components used to build these ids from `this._uid`, a Vue 2
 * internal that Vue 3 REMOVED. It does not throw — it evaluates to `undefined` —
 * so `'cn-page-size-' + this._uid` silently produced the literal id
 * `cn-page-size-undefined` for EVERY instance on the page. Since these ids are
 * what pair a `<label for>` with its input and what `aria-labelledby` /
 * `aria-controls` point at, the result was duplicate DOM ids and, for any page
 * with two of the same component, ARIA references resolving to the wrong
 * element. Assistive technology follows the reference, so this was a real
 * accessibility defect rather than untidy markup.
 *
 * Deliberately a module counter rather than `this.$.uid` (Vue 3's internal
 * instance uid): reaching into `$` is the same mistake `_uid` was, one major
 * version later. Vue 3.5's `useId()` is composition-API only and these are
 * Options-API components.
 *
 * NOT exported from `src/index.js`. It is an internal helper, not public API —
 * a consumer needing ids should let the component generate them.
 */

let counter = 0

/**
 * Next unique id suffix. Call ONCE per component instance — from `data()`, so
 * the value is fixed for the instance's lifetime rather than changing on
 * re-render (an id that changes between renders breaks the ARIA reference it
 * exists to establish).
 *
 * Monotonic within a page load, and never reset: uniqueness is the only
 * contract, so callers must not depend on the number itself, its start value,
 * or the gaps between values.
 *
 * @return {number} A value unique to this page load.
 */
export function nextUid() {
	counter += 1
	return counter
}
