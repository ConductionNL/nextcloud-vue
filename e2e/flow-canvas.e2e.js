// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// CnGraphCanvas on Vue Flow — the assertions that can only run in a browser.
//
// WHY THESE ARE NOT UNIT TESTS
// ----------------------------
// Vue Flow MEASURES nodes before it renders them, and jsdom computes no layout.
// Mounting the canvas in jest yields ZERO node elements, so every assertion
// about what is drawn, where it is, or what a key does to it would pass over an
// empty list. That is the same failure this repo has already been bitten by:
// `CnFlowKeyboardConnect.spec.js` records that openregister's e2e version of
// this assertion "went green by not running".
//
// So the canvas's geometry and its keyboard contract are asserted here, against
// a real browser, and the unit lane asserts only what still has teeth without
// layout.
//
// THE KEYBOARD TEST IS THE POINT OF THIS FILE
// -------------------------------------------
// The hand-rolled canvas this replaced was keyboard-operable by deliberate
// design. Vue Flow is pointer-first. A mouse-driven e2e would pass over a total
// keyboard regression without noticing, so `keyboard only` below uses NO
// pointer events at all.

import { test, expect } from '@playwright/test'

const CANVAS = '/?canvas=1'
const READONLY = '/?canvas=1&readonly=1'

test.describe('flow canvas — rendering', () => {
	test('draws every node and edge the document declares', async ({ page }) => {
		await page.goto(CANVAS)

		// Three nodes, one edge — the harness graph. Counted rather than
		// eyeballed, because "the canvas rendered" is true of a canvas that
		// drew nothing.
		await expect(page.locator('.cn-flow-node')).toHaveCount(3)
		await expect(page.locator('.vue-flow__edge')).toHaveCount(1)
	})

	test('a node has a real box, which is what let nodeWidth/nodeHeight go', async ({ page }) => {
		await page.goto(CANVAS)

		const box = await page.locator('.cn-flow-node').first().boundingBox()

		// The old canvas needed the host to declare nodeWidth/nodeHeight so its
		// hand-drawn edges could guess a centre, and attached them off-centre
		// when the numbers were wrong. Vue Flow measures the rendered node —
		// this assertion is that measurement existing.
		expect(box.width).toBeGreaterThan(0)
		expect(box.height).toBeGreaterThan(0)
	})

	test('a node draws exactly ONE box — the wrapper adds none', async ({ page }) => {
		await page.goto(CANVAS)

		// A node rendered THREE nested boxes at one point. Only one was ours:
		// Vue Flow wraps every `#node-default` in `.vue-flow__node-default`,
		// and its theme-default.css gives that wrapper a border, a white
		// background and 10px of padding — a box around our box, on every node.
		//
		// This is asserted from COMPUTED STYLE rather than by counting
		// elements, because the wrapper is legitimately there and has to be:
		// what must not happen is that it PAINTS. A DOM-shape assertion would
		// have to be rewritten every time Vue Flow changes its tree, and would
		// still not notice a border reappearing.
		const painted = await page.evaluate(() => {
			const wrapper = document.querySelector('.vue-flow__node')
			const node = wrapper.querySelector('.cn-flow-node')
			const read = (el) => {
				const c = getComputedStyle(el)
				return {
					borderWidth: c.borderTopWidth,
					background: c.backgroundColor,
				}
			}
			return { wrapper: read(wrapper), node: read(node) }
		})

		// The wrapper paints nothing at all.
		expect(painted.wrapper.borderWidth).toBe('0px')
		expect(['rgba(0, 0, 0, 0)', 'transparent']).toContain(painted.wrapper.background)

		// ...and the node itself still does, so this cannot pass by the canvas
		// having stopped drawing nodes altogether.
		expect(painted.node.borderWidth).not.toBe('0px')
	})

	test('an edge ends in a visible arrowhead, clear of the port handle', async ({ page }) => {
		await page.goto(CANVAS)
		await page.locator('.vue-flow__edge').first().waitFor()

		// An edge says which way the data flows, and only the arrowhead says it.
		// The arrow WAS being drawn all along at 12.5px — landing exactly on the
		// target's 18px port handle, which Vue Flow paints in a layer above the
		// edges. Measurably present, and invisible to every user: the canvas
		// read as a set of undirected lines.
		//
		// So this asserts the two things that made it visible, not merely that a
		// marker exists: it must be LARGER than the handle it lands on, and it
		// must not be painted in the line's own pale colour.
		const arrow = await page.evaluate(() => {
			const marker = document.querySelector('.cn-graph-canvas marker.vue-flow__arrowhead')
			if (marker === null) {
				return null
			}

			const shape = marker.querySelector('polyline, path')
			const handle = document.querySelector('.vue-flow__handle-top')
			const path = document.querySelector('.vue-flow__edge-path')

			return {
				width: Number(marker.getAttribute('markerWidth')),
				fill: getComputedStyle(shape).fill,
				handleWidth: handle.getBoundingClientRect().width,
				edgeStroke: getComputedStyle(path).stroke,
				referenced: (path.getAttribute('marker-end') || '').includes(marker.id),
			}
		})

		expect(arrow).not.toBeNull()

		// The edge actually POINTS at this marker. A marker sitting unreferenced
		// in <defs> renders nothing — which is exactly the state CnFlowDetail's
		// own hand-rolled arrowhead was in.
		expect(arrow.referenced).toBe(true)

		// Bigger than the handle, or it is hidden behind it again.
		expect(arrow.width).toBeGreaterThan(arrow.handleWidth)

		// Not the line's colour: the arrow is the signal, the line is the path.
		expect(arrow.fill).not.toBe(arrow.edgeStroke)
	})

	test('a port handle takes the theme colour, not Vue Flow\'s default', async ({ page }) => {
		await page.goto(CANVAS)

		// Vue Flow's `.vue-flow__node-default .vue-flow__handle` rule (0,2,0)
		// outranks our `.cn-flow-node__handle` (0,1,0), so handles rendered its
		// hard-coded #1a192b — rgb(26, 25, 43) — and ignored the user's theme
		// including dark mode. Pinned as "not that colour" rather than as an
		// exact value, because the themed colour is whatever the instance's
		// --color-primary-element resolves to.
		const background = await page.evaluate(() => {
			const handle = document.querySelector('.cn-flow-node__handle')
			return getComputedStyle(handle).backgroundColor
		})

		expect(background).not.toBe('rgb(26, 25, 43)')
	})
})

test.describe('flow canvas — pointer interaction', () => {
	test('dragging a node moves it', async ({ page }) => {
		await page.goto(CANVAS)
		const wrapper = page.locator('.vue-flow__node').first()
		const box = await wrapper.boundingBox()
		const before = await wrapper.getAttribute('style')

		await wrapper.hover()
		await page.mouse.down()
		// `steps` matters: Vue Flow drags with d3-drag, which needs intermediate
		// pointer moves. A single jump arrives as one event and reads as a click.
		await page.mouse.move(box.x + 120, box.y + 60, { steps: 12 })
		await page.mouse.up()

		// The node's own transform changed — the graph moved, not just the view.
		expect(await wrapper.getAttribute('style')).not.toBe(before)
	})

	test('the zoom control changes the viewport', async ({ page }) => {
		await page.goto(CANVAS)
		const viewport = page.locator('.vue-flow__viewport')

		const before = await viewport.getAttribute('style')
		// OUR control, not the library's: `@vue-flow/controls` renders unlabelled
		// buttons that axe flags as `button-name`, so this canvas ships its own.
		await page.getByRole('button', { name: 'Zoom in' }).click()
		await expect(viewport).not.toHaveAttribute('style', before ?? '')
	})

	test('every control actually does something', async ({ page }) => {
		await page.goto(CANVAS)
		const viewport = page.locator('.vue-flow__viewport')

		// EACH button, not just the first. `fitView` was BOTH a boolean prop and
		// Vue Flow's function of the same name, so the fit button was calling
		// `true` — and a suite that clicked only "Zoom in" reported a healthy
		// control bar over a dead button.
		for (const name of ['Zoom in', 'Zoom out', 'Fit the whole flow in view']) {
			const before = await viewport.getAttribute('style')
			await page.getByRole('button', { name }).click()
			await expect(viewport).not.toHaveAttribute('style', before ?? '')
		}
	})
})

test.describe('flow canvas — removing a node', () => {
	test('Delete removes the focused node, and its edges go with it', async ({ page }) => {
		await page.goto(CANVAS)
		await expect(page.locator('.cn-flow-node')).toHaveCount(3)
		await expect(page.locator('.vue-flow__edge')).toHaveCount(1)

		// Focus node `a`, which the harness graph's only edge leaves from.
		await page.locator('.cn-flow-node').first().focus()
		await page.keyboard.press('Delete')

		await expect(page.locator('.cn-flow-node')).toHaveCount(2)

		// The edge is the assertion that matters. A canvas that dropped the node
		// and kept the line would leave an edge pointing at nothing — which is
		// exactly what the store's own removeNode() exists to prevent, and what
		// a node-count-only test would sail past.
		await expect(page.locator('.vue-flow__edge')).toHaveCount(0)
	})

	test('Backspace removes it too, because that is the Mac delete key', async ({ page }) => {
		await page.goto(CANVAS)
		await expect(page.locator('.cn-flow-node')).toHaveCount(3)

		await page.locator('.cn-flow-node').nth(2).focus()
		await page.keyboard.press('Backspace')

		await expect(page.locator('.cn-flow-node')).toHaveCount(2)
	})

	test('a read-only canvas refuses Delete', async ({ page }) => {
		await page.goto(READONLY)
		await expect(page.locator('.cn-flow-node')).toHaveCount(3)

		await page.locator('.cn-flow-node').first().focus()
		await page.keyboard.press('Delete')

		// The control for the two above: the key is wired, and read-only means
		// read-only. A canvas that LOOKS locked and still deletes on a keypress
		// is worse than one with no shortcut at all.
		await expect(page.locator('.cn-flow-node')).toHaveCount(3)
	})
})

test.describe('flow canvas — read-only refuses everything', () => {
	test('a read-only canvas does not move a node', async ({ page }) => {
		await page.goto(READONLY)
		// The NODE's own transform, not its screen box. `fitView` reframes the
		// VIEWPORT shortly after mount, which shifts every node on screen
		// without moving it in the graph — measuring the box made this test
		// report a 22px "drag" that never happened.
		const wrapper = page.locator('.vue-flow__node').first()
		const box = await wrapper.boundingBox()
		const before = await wrapper.getAttribute('style')

		await wrapper.hover()
		await page.mouse.down()
		await page.mouse.move(box.x + 140, box.y + 80, { steps: 12 })
		await page.mouse.up()

		// Asserted as "did not move", not "looks disabled". readOnly maps to
		// three Vue Flow flags and missing one leaves a canvas that LOOKS
		// locked and is not.
		expect(await wrapper.getAttribute('style')).toBe(before)
	})
})

test.describe('flow canvas — keyboard only', () => {
	// ⚠️ NO POINTER EVENTS IN THIS BLOCK. Not one. A test that clicks to focus
	// and then presses a key proves the key works for someone who has a mouse,
	// which is not the population this contract exists for.

	test('a node can be reached, moved and connected with the keyboard alone', async ({ page }) => {
		await page.goto(CANVAS)
		await expect(page.locator('.cn-flow-node')).toHaveCount(3)

		// REACH: tab until a node has focus.
		let focused = null
		for (let press = 0; press < 25; press++) {
			await page.keyboard.press('Tab')
			focused = await page.evaluate(() => document.activeElement?.className || '')
			if (String(focused).includes('cn-flow-node') === true) {
				break
			}
		}
		expect(String(focused)).toContain('cn-flow-node')

		// MOVE: the focused node shifts, and the shift is measurable.
		const active = page.locator('.cn-flow-node:focus')
		const before = await active.boundingBox()
		await page.keyboard.press('ArrowRight')
		await page.keyboard.press('ArrowRight')
		const after = await active.boundingBox()
		expect(after.x).toBeGreaterThan(before.x)

		// CONNECT: `c` arms an exit, and the armed port is announced — colour
		// alone would not tell a screen-reader user which branch is live.
		await page.keyboard.press('c')
		await expect(page.locator('[aria-pressed="true"].vue-flow__handle')).toHaveCount(1)

		// CANCEL: Escape disarms.
		await page.keyboard.press('Escape')
		await expect(page.locator('[aria-pressed="true"].vue-flow__handle')).toHaveCount(0)
	})

	test('repeated `c` reaches EVERY exit of a multi-exit node', async ({ page }) => {
		await page.goto(CANVAS)

		// Focus the routing node specifically — it is the one with three exits,
		// and its second and third branches are what a pointer-first canvas
		// leaves unreachable.
		await page.locator('.cn-flow-node').nth(1).focus()

		// `data-handleid`, not `id`: Vue Flow CONSUMES the `id` we pass to
		// `<Handle>` and re-emits it as `data-handleid`. Reading `id` returns
		// null for every port, which would collapse to a single distinct value
		// and let this test pass while stepping was broken.
		const armedPort = async () =>
			await page.locator('.cn-flow-node:focus [aria-pressed="true"]').getAttribute('data-handleid')

		await page.keyboard.press('c')
		const first = await armedPort()
		await page.keyboard.press('c')
		const second = await armedPort()
		await page.keyboard.press('c')
		const third = await armedPort()

		// Three DISTINCT exits reached without a pointer. If stepping regressed,
		// these would all be the same port and every branch but one would be
		// mouse-only — a WCAG 2.1.1 failure on the feature the canvas is for.
		expect(new Set([first, second, third]).size).toBe(3)
	})
})

test.describe('flow canvas — accessibility', () => {
	test('axe finds no violations, in light and dark', async ({ page }) => {
		// eslint-disable-next-line
		const axePath = require.resolve('axe-core')

		for (const theme of ['light', 'dark']) {
			await page.goto(CANVAS)
			await page.emulateMedia({ colorScheme: theme })
			await expect(page.locator('.cn-flow-node')).toHaveCount(3)

			await page.addScriptTag({ path: axePath })
			const result = await page.evaluate(async () => {
				// eslint-disable-next-line
				return await window.axe.run(document.querySelector('[data-testid="canvas-box"]'))
			})

			const serious = result.violations.filter(
				(violation) => violation.impact === 'serious' || violation.impact === 'critical',
			)
			expect(
				serious.map((violation) => `${violation.id}: ${violation.nodes.map((n) => n.html).join(' | ')}`),
			).toEqual([])
		}
	})
})
