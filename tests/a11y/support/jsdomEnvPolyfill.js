/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Quiets two jsdom "not implemented" gaps that `axe-core` trips on every
 * run. Neither gap changes an axe VERDICT (violations stay accurate) —
 * they only spam jest's virtual console with one stack trace per node, so
 * this file removes the noise without altering results.
 *
 * 1. `HTMLCanvasElement.prototype.getContext` — jsdom throws "not
 *    implemented". Axe's `color-contrast` rule calls it once per text node
 *    (icon-ligature detection, e.g. Material Icons rendering the literal
 *    string "close" as a glyph). Stubbed with a minimal 2D-context surface.
 *
 * 2. `window.getComputedStyle(el, pseudoElt)` — jsdom throws "not
 *    implemented" whenever a pseudo-element (`::before` / `::after`)
 *    argument is passed, which axe's `color-contrast` rule does. Wrapped
 *    to fall back to the pseudo-less computed style.
 *
 * IMPORTANT — jsdom and color contrast: jsdom has no layout or paint
 * engine, so it cannot compute real rendered colors. Axe's `color-contrast`
 * rule therefore returns "incomplete" (NOT "violation") results under
 * jsdom — and `expectAccessible` only fails on `results.violations`, never
 * on incomplete. So this lane does NOT and CANNOT assert real contrast
 * ratios; genuine contrast auditing stays the job of the fleet's Playwright
 * visual-a11y passes, which run against a real browser. See
 * `openspec/changes/wcag-a11y-anchor/design.md`, "jsdom and color contrast".
 */

if (typeof HTMLCanvasElement !== 'undefined' && !HTMLCanvasElement.prototype.__cnA11yCanvasPolyfilled) {
	HTMLCanvasElement.prototype.getContext = function getContext() {
		return {
			font: '',
			textBaseline: 'alphabetic',
			fillStyle: '#000',
			fillText() {},
			measureText() {
				return { width: 0 }
			},
			getImageData(x, y, w, h) {
				return { data: new Uint8ClampedArray(Math.max(0, w) * Math.max(0, h) * 4) }
			},
			clearRect() {},
			fillRect() {},
			save() {},
			restore() {},
			scale() {},
			translate() {},
		}
	}
	HTMLCanvasElement.prototype.__cnA11yCanvasPolyfilled = true
}

if (typeof window !== 'undefined' && !window.__cnA11yComputedStylePatched) {
	const nativeGetComputedStyle = window.getComputedStyle.bind(window)
	window.getComputedStyle = function getComputedStyle(element) {
		// jsdom only implements the one-argument form; passing a pseudo-element
		// (which axe's color-contrast rule does for ::before/::after) logs a
		// "not implemented" stack to the virtual console BEFORE throwing — so
		// we must never forward the second argument at all. The pseudo areas
		// are unpaintable in jsdom regardless (see the module docblock), so
		// returning the element's own computed style is the correct, quiet
		// fallback. Deliberately ignores any `arguments[1]`.
		return nativeGetComputedStyle(element)
	}
	window.__cnA11yComputedStylePatched = true
}
