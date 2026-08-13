/**
 * Nested-modal stacking order.
 *
 * REGRESSION UNDER TEST
 * ---------------------
 * Two modals open at once, and clicks aimed at the top one land on the one
 * underneath. `@nextcloud/vue` v9 gives every `.modal-mask` a flat
 * `z-index: 9998`, and this library used to pin every NcDialog mask to
 * `10005 !important` on top of that, so the two masks TIED and the painting
 * order fell back to DOM order — a mount-timing race between two nodes both
 * teleported to `<body>`. The loser's whole dialog sits under the winner's
 * full-viewport mask, so every click aimed at it is intercepted.
 *
 * Measured live in OpenBuild: clicks on the nested "Generate an app with AI"
 * dialog were received by the wizard's `#wizard-app-description` textarea.
 *
 * WHAT THESE TESTS CAN AND CANNOT PROVE
 * -------------------------------------
 * They prove the stacking ORDER — which mask ends up on the higher layer, that
 * the outer one is restored when the inner closes, and that no layer is
 * stranded once everything closes. A browser resolves a click to the top-most
 * painted element at that point, so stacking order is the input that decides
 * pointer routing.
 *
 * They do NOT click anything: jsdom has no layout engine and does not implement
 * `document.elementFromPoint`, so a real hit test is not available here.
 * Pointer-event routing therefore rests on the stacking order asserted below
 * plus the CSS rule that, among positioned siblings, the higher `z-index`
 * paints on top — not on an executed click. Do not over-claim it.
 */

import fs from 'fs'
import path from 'path'
import {
	MODAL_STACK_BASE_Z_INDEX,
	MODAL_STACK_STEP,
	acquireModalLayer,
	installModalStack,
	isModalStackInstalled,
	modalStackDepth,
	releaseModalLayer,
	resetModalStack,
	topModalZIndex,
	uninstallModalStack,
} from '../../src/utils/modalStack.js'

/** Let the MutationObserver callback run — it is delivered asynchronously. */
const flushMutations = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Create a `.modal-mask` the way NcModal does (teleported to <body>) and hand
 * back the element.
 *
 * @param {string} [extraClass] Extra class, e.g. NcDialog's `dialog__modal`.
 * @return {HTMLElement} The inserted mask.
 */
function openMask(extraClass = 'dialog__modal') {
	const mask = document.createElement('div')
	mask.className = `modal-mask ${extraClass}`.trim()
	document.body.appendChild(mask)
	return mask
}

const zIndexOf = (element) => Number.parseInt(element.style.zIndex, 10)

afterEach(() => {
	// `resetModalStack()` ignores the reference count, so one call always tears
	// the binder down even after a test installed it twice.
	resetModalStack()
	document.body.innerHTML = ''
})

describe('modalStack — layer bookkeeping', () => {
	it('reports the base layer while nothing is open', () => {
		expect(modalStackDepth()).toBe(0)
		expect(topModalZIndex()).toBe(MODAL_STACK_BASE_Z_INDEX)
	})

	it('puts each newly opened modal strictly above the current top', () => {
		const outer = acquireModalLayer()
		const inner = acquireModalLayer()

		expect(outer.zIndex).toBe(MODAL_STACK_BASE_Z_INDEX + MODAL_STACK_STEP)
		expect(inner.zIndex).toBeGreaterThan(outer.zIndex)
		expect(modalStackDepth()).toBe(2)
		expect(topModalZIndex()).toBe(inner.zIndex)
	})

	it('restores the outer modal as top-most when the inner one closes', () => {
		const outer = acquireModalLayer()
		const inner = acquireModalLayer()

		expect(releaseModalLayer(inner.token)).toBe(true)

		expect(modalStackDepth()).toBe(1)
		expect(topModalZIndex()).toBe(outer.zIndex)
	})

	it('returns to the base layer after open → open → close → close', () => {
		const outer = acquireModalLayer()
		const inner = acquireModalLayer()
		releaseModalLayer(inner.token)
		releaseModalLayer(outer.token)

		expect(modalStackDepth()).toBe(0)
		expect(topModalZIndex()).toBe(MODAL_STACK_BASE_Z_INDEX)

		// No upward drift: the next modal opens on the same layer the first did.
		expect(acquireModalLayer().zIndex).toBe(outer.zIndex)
	})

	it('keeps the inner modal on top when the OUTER one closes first', () => {
		const outer = acquireModalLayer()
		const inner = acquireModalLayer()

		releaseModalLayer(outer.token)

		expect(modalStackDepth()).toBe(1)
		expect(topModalZIndex()).toBe(inner.zIndex)
	})

	it('ignores an unknown or already-released token', () => {
		const layer = acquireModalLayer()
		expect(releaseModalLayer(layer.token)).toBe(true)
		expect(releaseModalLayer(layer.token)).toBe(false)
		expect(releaseModalLayer(9999)).toBe(false)
		expect(modalStackDepth()).toBe(0)
	})
})

describe('modalStack — DOM binder', () => {
	it('is inert until installed', () => {
		expect(isModalStackInstalled()).toBe(false)
		installModalStack()
		expect(isModalStackInstalled()).toBe(true)
	})

	it('is idempotent — a second install does not double-count masks', async () => {
		installModalStack()
		installModalStack()
		openMask()
		await flushMutations()

		expect(modalStackDepth()).toBe(1)
	})

	it('survives a nested app root unmounting', async () => {
		// OpenBuild's BuilderHost renders a second CnAppRoot for the app being
		// previewed. When that inner shell unmounts, the outer one is still on
		// screen and still needs its dialogs layered.
		installModalStack() // outer CnAppRoot
		installModalStack() // inner CnAppRoot

		uninstallModalStack() // inner CnAppRoot unmounts

		expect(isModalStackInstalled()).toBe(true)
		const wizard = openMask()
		await flushMutations()
		expect(zIndexOf(wizard)).toBe(MODAL_STACK_BASE_Z_INDEX + MODAL_STACK_STEP)

		uninstallModalStack() // outer CnAppRoot unmounts
		expect(isModalStackInstalled()).toBe(false)
	})

	it('lifts the second of two open masks above the first', async () => {
		installModalStack()

		const wizard = openMask()
		await flushMutations()
		const copilot = openMask()
		await flushMutations()

		expect(zIndexOf(wizard)).toBe(MODAL_STACK_BASE_Z_INDEX + MODAL_STACK_STEP)
		expect(zIndexOf(copilot)).toBeGreaterThan(zIndexOf(wizard))
	})

	it('lifts a bare NcModal above the NcDialog that opened it', async () => {
		// The exact OpenBuild shape: the create-app wizard is a CnWizardDialog
		// (NcDialog → `modal-mask dialog__modal`) and the copilot dialog inside it
		// is a plain NcModal (`modal-mask` only, no `dialog__modal`). The stack
		// keys on `.modal-mask`, so the CSS baseline's `dialog__modal` qualifier
		// must not be load-bearing.
		installModalStack()

		const wizard = openMask('dialog__modal')
		await flushMutations()
		const copilot = openMask('')
		await flushMutations()

		expect(copilot.className).toBe('modal-mask')
		expect(zIndexOf(copilot)).toBeGreaterThan(zIndexOf(wizard))
	})

	it('restores the outer mask as top-most when the inner mask is removed', async () => {
		installModalStack()

		const wizard = openMask()
		await flushMutations()
		const copilot = openMask()
		await flushMutations()

		copilot.remove()
		await flushMutations()

		expect(modalStackDepth()).toBe(1)
		expect(topModalZIndex()).toBe(zIndexOf(wizard))
	})

	it('strands no layer once both masks are gone', async () => {
		installModalStack()

		const wizard = openMask()
		const copilot = openMask()
		await flushMutations()
		expect(modalStackDepth()).toBe(2)

		copilot.remove()
		wizard.remove()
		await flushMutations()

		expect(modalStackDepth()).toBe(0)
		expect(topModalZIndex()).toBe(MODAL_STACK_BASE_Z_INDEX)
	})

	it('keeps a mask on its own layer when Vue MOVES it rather than removing it', async () => {
		// Teleport relocations surface as a remove+add pair. Re-assigning would
		// hand the OUTER dialog a fresh layer above its own child — exactly the
		// bug this module exists to prevent.
		installModalStack()

		const wizard = openMask()
		await flushMutations()
		const copilot = openMask()
		await flushMutations()
		const wizardLayer = zIndexOf(wizard)

		const host = document.createElement('div')
		document.body.appendChild(host)
		host.appendChild(wizard)
		await flushMutations()

		expect(zIndexOf(wizard)).toBe(wizardLayer)
		expect(zIndexOf(copilot)).toBeGreaterThan(zIndexOf(wizard))
		expect(modalStackDepth()).toBe(2)
	})

	it('adopts masks that were already open at install time', async () => {
		const wizard = openMask()
		const copilot = openMask()

		installModalStack()

		expect(zIndexOf(copilot)).toBeGreaterThan(zIndexOf(wizard))
		expect(modalStackDepth()).toBe(2)
	})

	it('picks up a mask nested inside an added subtree', async () => {
		installModalStack()

		const host = document.createElement('div')
		const nested = document.createElement('div')
		nested.className = 'modal-mask dialog__modal'
		host.appendChild(nested)
		document.body.appendChild(host)
		await flushMutations()

		expect(modalStackDepth()).toBe(1)
		expect(zIndexOf(nested)).toBe(MODAL_STACK_BASE_Z_INDEX + MODAL_STACK_STEP)
	})

	it('releases every layer on uninstall but leaves visible masks styled', async () => {
		installModalStack()
		const wizard = openMask()
		await flushMutations()
		const styled = zIndexOf(wizard)
		// Assert the layer was actually written, so the "survives uninstall"
		// check below cannot pass vacuously on an unstyled mask (NaN === NaN).
		expect(styled).toBe(MODAL_STACK_BASE_Z_INDEX + MODAL_STACK_STEP)

		uninstallModalStack()

		expect(isModalStackInstalled()).toBe(false)
		expect(modalStackDepth()).toBe(0)
		// Stripping the layer off a mask that is still on screen would drop it
		// back under whatever it was covering, so the inline value stays.
		expect(zIndexOf(wizard)).toBe(styled)
	})
})

describe('modalStack — shipped stylesheet must not out-rank the stack', () => {
	const patches = fs.readFileSync(
		path.join(__dirname, '../../src/css/patches.css'),
		'utf8',
	)

	it('declares the modal baseline without !important', () => {
		// An `!important` baseline beats the inline layer the stack writes, which
		// is exactly how every dialog ended up flattened onto one layer before.
		const modalRules = patches.match(/\.modal-mask[^{]*\{[^}]*\}/g) || []
		expect(modalRules.length).toBeGreaterThan(0)
		for (const rule of modalRules) {
			expect(rule).not.toMatch(/!important/)
		}
	})

	it('lets the inline layer win over the baseline in the cascade', async () => {
		const style = document.createElement('style')
		// The upstream constant every mask starts from, plus our own baseline.
		style.textContent = `.modal-mask { z-index: 9998; }\n${patches}`
		document.head.appendChild(style)

		installModalStack()
		const wizard = openMask()
		await flushMutations()
		const copilot = openMask()
		await flushMutations()

		const computed = (el) => Number.parseInt(window.getComputedStyle(el).zIndex, 10)
		expect(computed(copilot)).toBeGreaterThan(computed(wizard))

		style.remove()
	})
})
