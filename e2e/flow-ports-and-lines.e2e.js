// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The flow editor's PORTS and its LINES, in a real browser.
//
// WHY NONE OF THIS CAN BE A UNIT TEST
// -----------------------------------
// Every claim in this file is about something jsdom does not compute:
//
//   - which SIDE of a node a port renders on is a box position, and jsdom has
//     no layout, so every handle sits at (0, 0) there;
//   - whether a node draws one box or two is a question about painted borders
//     on two different elements;
//   - whether a line's pulse animates is a computed animation, and
//     `prefers-reduced-motion` is a media query;
//   - a context menu on an SVG path opens from a real hit test.
//
// The unit lane (CnFlowPorts.spec.js, CnFlowDetailPorts.spec.js,
// useFlowStoreEdgeActions.spec.js) asserts the parts that still have teeth
// without layout: which handles EXIST, which flags the editor derives, and what
// the store does to the document. This file asserts that those decisions become
// the thing a user can see and click.

import { test, expect } from '@playwright/test'

const EDITOR = '/?flow=1'
const CANVAS = '/?canvas=1'

/**
 * Open the editor with a trigger → step → end flow on the canvas.
 *
 * One of each ROLE, because the ports a step gets follow from its role — a
 * two-node fixture could not tell "an end step has no exit" from "the last node
 * has no exit".
 *
 * `lonely` is wired to nothing at all, which is what the orphan-port warning is
 * about.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<void>}
 */
async function seed(page) {
	await page.goto(EDITOR)
	await page.locator('[data-testid="flow-box"]').waitFor()

	await page.evaluate(() => {
		const store = window.__cnFlowStore
		store.flow.nodes = [
			{ id: 'a', type: 'openregister.trigger-manual', name: 'Start', x: 60, y: 120, config: {} },
			{ id: 'b', type: 'openregister.set-fields', name: 'Middle', x: 320, y: 120, config: {} },
			{ id: 'c', type: 'openregister.end', name: 'Finish', x: 580, y: 120, config: {} },
			{ id: 'lonely', type: 'openregister.set-fields', name: 'Lonely', x: 320, y: 340, config: {} },
		]
		store.flow.edges = [{ id: 'e1', from: 'a', to: 'b' }, { id: 'e2', from: 'b', to: 'c' }]
	})

	await expect(page.locator('.cn-flow-node')).toHaveCount(4)
	await expect(page.locator('.vue-flow__edge')).toHaveCount(2)

	// ⚠️ FIT, OR HALF THE GRAPH IS OFF-SCREEN AND EVERY CLICK MISSES IT.
	//
	// `fitViewOnInit` runs once, at mount — on an EMPTY canvas, because these
	// specs seed the graph afterwards through the store. The viewport therefore
	// keeps whatever zoom it settled on with no nodes in it, and the fixture's
	// right-hand nodes and the line between them land outside the canvas box.
	//
	// That failure is invisible in the worst way: the line is in the DOM, its
	// path has a length, and `getPointAtLength` returns a perfectly good point.
	// The point is simply not over the canvas, so `elementFromPoint` there is
	// the page background and the click quietly does nothing — which reads as
	// "the line menu does not open".
	await page.getByRole('button', { name: 'Fit the whole flow in view' }).click()
	await page.waitForTimeout(200)
}

/**
 * @param {import('@playwright/test').Page} page The page.
 * @param {string} name The step's authored name.
 * @return {import('@playwright/test').Locator} Its node element.
 */
function step(page, name) {
	return page.locator('.cn-flow-node').filter({ hasText: name })
}

/**
 * Click a line, at a point that is actually ON it.
 *
 * ⚠️ A REAL MOUSE CLICK AT A COMPUTED POINT, NOT `locator.click()` AND NOT
 * `{ force: true }`.
 *
 * A connection is an SVG `<g>` holding a hairline `<path>` and, over it, Vue
 * Flow's 20px-wide `.vue-flow__edge-interaction` path drawn at
 * `stroke-opacity: 0`. Playwright's visibility heuristic reads "paints nothing"
 * as "not visible" and refuses to click either — so `locator.click()` times out
 * on a line a user hits without difficulty.
 *
 * `{ force: true }` would get past that by skipping the actionability check
 * entirely, which is precisely the check worth keeping: it would also pass if
 * the line were covered by the toolbar, or if the hit area had disappeared.
 * Asking the browser for a point on the path and clicking THAT pixel proves the
 * line is hittable where it is drawn, which is the claim.
 *
 * @param {import('@playwright/test').Page} page  The page.
 * @param {number}                          index Which line, in DOM order.
 * @return {Promise<void>}
 */
async function clickLine(page, index = 0) {
	const point = await page.evaluate((which) => {
		const path = document.querySelectorAll('.vue-flow__edge-path')[which]
		const middle = path.getPointAtLength(path.getTotalLength() / 2)
		const matrix = path.getScreenCTM()

		return {
			x: (middle.x * matrix.a) + (middle.y * matrix.c) + matrix.e,
			y: (middle.x * matrix.b) + (middle.y * matrix.d) + matrix.f,
		}
	}, index)

	await page.mouse.click(point.x, point.y)
}

test.describe('flow editor — where a line may enter and leave a step', () => {
	test('a trigger draws exits and no entries; an end step the reverse', async ({ page }) => {
		await seed(page)

		// Counted per node, not globally: a global count would be satisfied by
		// any distribution of the same total across four nodes.
		await expect(step(page, 'Start').locator('.vue-flow__handle.target')).toHaveCount(0)
		await expect(step(page, 'Start').locator('.vue-flow__handle.source')).not.toHaveCount(0)

		await expect(step(page, 'Finish').locator('.vue-flow__handle.source')).toHaveCount(0)
		await expect(step(page, 'Finish').locator('.vue-flow__handle.target')).not.toHaveCount(0)

		// The control: an ordinary step keeps both, so this cannot pass by the
		// canvas having stopped drawing handles at all.
		await expect(step(page, 'Middle').locator('.vue-flow__handle.target')).not.toHaveCount(0)
		await expect(step(page, 'Middle').locator('.vue-flow__handle.source')).not.toHaveCount(0)
	})

	test('entries sit left and top of the box, exits right and bottom', async ({ page }) => {
		await seed(page)

		// MEASURED AGAINST THE NODE'S OWN BOX, not against a CSS class. Vue Flow
		// puts a `-left` / `-top` class on a handle from the `position` it was
		// given, so asserting the class would only restate the prop we passed —
		// it would stay green if the stylesheet that actually places the handle
		// went missing.
		const sides = await page.evaluate(() => {
			const node = [...document.querySelectorAll('.cn-flow-node')]
				.find((element) => element.textContent.includes('Middle'))
			const box = node.getBoundingClientRect()
			const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 }

			return [...node.querySelectorAll('.vue-flow__handle')].map((handle) => {
				const h = handle.getBoundingClientRect()
				const dx = (h.x + h.width / 2) - centre.x
				const dy = (h.y + h.height / 2) - centre.y

				return {
					kind: handle.classList.contains('target') ? 'entry' : 'exit',
					side: Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'top' : 'bottom'),
				}
			})
		})

		const entries = sides.filter((s) => s.kind === 'entry').map((s) => s.side)
		const exits = sides.filter((s) => s.kind === 'exit').map((s) => s.side)

		expect(entries.sort()).toEqual(['left', 'top'])
		expect(exits.sort()).toEqual(['bottom', 'right'])
	})

	test('every port draws a direction arrow', async ({ page }) => {
		await seed(page)

		// The arrow is a `::after` triangle, so it is only observable through
		// computed style — and only its BORDER carries a colour, which is what
		// makes it a triangle rather than a dot.
		const arrows = await page.evaluate(() => {
			const node = [...document.querySelectorAll('.cn-flow-node')]
				.find((element) => element.textContent.includes('Middle'))

			return [...node.querySelectorAll('.vue-flow__handle')].map((handle) => {
				const after = getComputedStyle(handle, '::after')
				const transparent = 'rgba(0, 0, 0, 0)'

				return {
					content: after.content,
					// Exactly ONE side of the border is painted; that is the
					// direction the triangle points.
					painted: [after.borderTopColor, after.borderLeftColor]
						.filter((colour) => colour !== transparent).length,
				}
			})
		})

		expect(arrows).toHaveLength(4)
		for (const arrow of arrows) {
			expect(arrow.content).not.toBe('none')
			expect(arrow.painted).toBe(1)
		}
	})

	test('a port nothing is connected to warns, and says why', async ({ page }) => {
		await seed(page)

		const lonely = step(page, 'Lonely')
		await expect(lonely.locator('.cn-flow-node__handle--orphan')).toHaveCount(4)

		// ⚠️ NOT COLOUR ALONE. The consequence has to reach a reader who cannot
		// see the ring, so it is in the title and in the accessible name.
		const entry = lonely.locator('.vue-flow__handle.target').first()
		await expect(entry).toHaveAttribute('title', /never reach it/)
		await expect(entry).toHaveAttribute('aria-label', /never reach it/)

		const exit = lonely.locator('.vue-flow__handle.source').first()
		await expect(exit).toHaveAttribute('title', /stops here/)

		// The control: a wired step warns about nothing, so this cannot pass by
		// every port on the canvas being painted as a warning.
		await expect(step(page, 'Middle').locator('.cn-flow-node__handle--orphan')).toHaveCount(0)
	})

	test('wiring a step up clears its warning', async ({ page }) => {
		await seed(page)
		await expect(step(page, 'Lonely').locator('.cn-flow-node__handle--orphan')).toHaveCount(4)

		await page.evaluate(() => {
			window.__cnFlowStore.connect({ source: 'b', target: 'lonely' })
		})

		// Its ENTRY is satisfied; its exit still is not. Asserted as a partial
		// clear rather than as zero, because "the warning went away" would also
		// be true of a warning that had simply stopped being computed.
		await expect(step(page, 'Lonely').locator('.cn-flow-node__handle--orphan')).toHaveCount(2)
	})
})

test.describe('flow editor — one box per step', () => {
	test('the role accent is on the node’s own border, not on a box inside it', async ({ page }) => {
		await seed(page)

		// A node read as a card inside a card: the accent was an inset shadow on
		// the BODY, which sits inside `.cn-flow-node`'s 2px border and 12px of
		// padding, so the bar drew a second vertical edge a few pixels in from
		// the first. Nothing had a border it should not have — the accent was
		// painted on the wrong box.
		const painted = await page.evaluate(() => {
			const node = [...document.querySelectorAll('.cn-flow-node')]
				.find((element) => element.textContent.includes('Finish'))
			const body = node.querySelector('.cn-flow-detail__node')

			return {
				nodeShadow: getComputedStyle(node).boxShadow,
				bodyShadow: getComputedStyle(body).boxShadow,
				bodyPaddingLeft: getComputedStyle(body).paddingLeft,
			}
		})

		// The node carries the accent...
		expect(painted.nodeShadow).toContain('inset')

		// ...and the body inside it paints nothing at all.
		//
		// ⚠️ THIS ASSERTION IS WEAKER THAN IT LOOKS, AND THE COMPONENT KNOWS IT.
		// The harness has exactly ONE build of CnFlowDetail, so this passes
		// whether the absence is declared or merely left out. On a real
		// Nextcloud page several apps inject their own (older) copy of the same
		// scoped stylesheet under the SAME `data-v-` hash — Vue hashes the file
		// path, not the contents — and the stale `--role-*` rule then wins by
		// default. Measured live on dossiq: three such copies. The
		// `box-shadow: none` in CnFlowDetail is what actually holds this; see
		// the note there.
		expect(painted.bodyShadow).toBe('none')
		// ...and no longer holds itself away from an edge it does not meet.
		expect(painted.bodyPaddingLeft).toBe('0px')
	})

	test('each role gets its own accent colour', async ({ page }) => {
		await seed(page)

		const colours = await page.evaluate(() => {
			const read = (name) => {
				const node = [...document.querySelectorAll('.cn-flow-node')]
					.find((element) => element.textContent.includes(name))
				return getComputedStyle(node).boxShadow
			}

			return { trigger: read('Start'), step: read('Middle'), end: read('Finish') }
		})

		// Three distinct accents. Pinned as "all different" rather than to hex
		// values, because each is whatever the instance's theme resolves
		// --color-success / --color-primary-element / --color-error to.
		expect(new Set(Object.values(colours)).size).toBe(3)
	})
})

test.describe('flow editor — the line action menu', () => {
	test('clicking a line offers rename, re-route, copy and delete', async ({ page }) => {
		await seed(page)

		await clickLine(page)

		for (const name of ['Edit label', 'Angled', 'Straight', 'Curved', 'Copy', 'Delete']) {
			await expect(page.getByRole('menuitem', { name, exact: true })).toBeVisible()
		}
	})

	test('the router the line already uses is offered as already-chosen', async ({ page }) => {
		await seed(page)
		await clickLine(page)

		// Angled is the default, so it is the current one — shown and disabled
		// rather than hidden, so the menu STATES the current value instead of
		// making the author click to find out.
		await expect(page.getByRole('menuitem', { name: 'Angled', exact: true })).toBeDisabled()
		await expect(page.getByRole('menuitem', { name: 'Straight', exact: true })).toBeEnabled()
	})

	test('Delete removes that line and leaves the other standing', async ({ page }) => {
		await seed(page)

		await clickLine(page)
		await page.getByRole('menuitem', { name: 'Delete', exact: true }).click()

		await expect(page.locator('.vue-flow__edge')).toHaveCount(1)
		// The steps are untouched — deleting a connection is not deleting a step.
		await expect(page.locator('.cn-flow-node')).toHaveCount(4)
	})

	test('a deleted line comes back with Ctrl+Z', async ({ page }) => {
		await seed(page)

		await clickLine(page)
		await page.getByRole('menuitem', { name: 'Delete', exact: true }).click()
		await expect(page.locator('.vue-flow__edge')).toHaveCount(1)

		await page.keyboard.press('Control+z')

		await expect(page.locator('.vue-flow__edge')).toHaveCount(2)
	})

	test('picking a router redraws that line and only that line', async ({ page }) => {
		await seed(page)

		await clickLine(page)
		await page.getByRole('menuitem', { name: 'Straight', exact: true }).click()

		// ⚠️ `expect.poll`, NOT a bare `page.evaluate()`. An evaluate takes ONE
		// snapshot and cannot retry, so reading the store immediately after a
		// click is a race with whatever the click still has to do. The same
		// shape failed `dashboard-date-chip.e2e.js` on its first CI run while
		// passing locally every time.
		//
		// One line changed; the other kept the default. A control that restyled
		// both would be indistinguishable from a working one on a canvas with a
		// single line, which is why the fixture has two.
		await expect
			.poll(() => page.evaluate(() => window.__cnFlowStore.edges.map((edge) => edge.lineType ?? null)))
			.toEqual(['straight', null])
	})

	test('Copy then Paste style carries a line’s look onto another', async ({ page }) => {
		await seed(page)

		// Give the first line something worth copying.
		await clickLine(page)
		await page.getByRole('menuitem', { name: 'Straight', exact: true }).click()

		await clickLine(page)
		await page.getByRole('menuitem', { name: 'Copy', exact: true }).click()

		await clickLine(page, 1)
		await page.getByRole('menuitem', { name: 'Paste style', exact: true }).click()

		await expect
			.poll(() => page.evaluate(() => window.__cnFlowStore.edges.map((edge) => edge.lineType)))
			.toEqual(['straight', 'straight'])
	})

	test('Paste style is hidden until something has been copied', async ({ page }) => {
		await seed(page)

		await clickLine(page)

		// The affordance only exists once it can do something. A permanently
		// present Paste that silently no-ops is worse than no Paste.
		await expect(page.getByRole('menuitem', { name: 'Paste style', exact: true })).toHaveCount(0)
	})

	test('Edit label opens the connection dialog and the label lands on the line', async ({ page }) => {
		await seed(page)

		await clickLine(page)
		await page.getByRole('menuitem', { name: 'Edit label', exact: true }).click()

		const field = page.getByRole('textbox', { name: 'Label' })
		await expect(field).toBeVisible()
		await field.fill('approved')
		await page.getByRole('button', { name: 'Done' }).click()

		// On the LINE, not merely in the store: a label the document holds and
		// the canvas never draws is the same as no label.
		await expect(page.locator('.cn-flow-edge__label').filter({ hasText: 'approved' })).toBeVisible()
	})

	test('an unlabelled line draws no empty chip', async ({ page }) => {
		await seed(page)

		// The control for the test above. Gating the label control on the slot
		// merely EXISTING would put a blank chip on every unnamed connection —
		// which reads as a line whose name is blank rather than one that never
		// had a name.
		await expect(page.locator('.cn-flow-edge__label')).toHaveCount(0)
	})
})

test.describe('flow editor — the menus draw the right glyph', () => {
	/**
	 * ⚠️ RESOLVING AN ICON IS NOT DRAWING ONE, AND THE ORIGINAL DEFECT WAS
	 * VISUAL.
	 *
	 * `CnIcon` answers an unknown name with a help-circle and says nothing —
	 * that is how this menu shipped asking for `Pencil` and `Delete` (the
	 * vocabulary publishes `PencilOutline` / `DeleteOutline`) and drew two
	 * question marks. The unit guard, CnFlowMenuIcons.spec.js, resolves each
	 * name to a component and fails on the fallback; it cannot see what reaches
	 * the screen.
	 *
	 * THE TELL IS THAT THEY WERE IDENTICAL. Two of the three entries drew the
	 * SAME glyph, and the third — `Copy`, whose name happened to be correct —
	 * drew its own. So distinctness is not a proxy here, it is the actual
	 * symptom: three fallen-back icons are three copies of one path, and a menu
	 * of distinct paths cannot be a menu of fallbacks.
	 */
	test('the step menu draws three different icons, not the same one twice', async ({ page }) => {
		await seed(page)
		await step(page, 'Middle').click()
		// Wait for the menu to be DRAWN before reading it. Reading the paths in
		// the same tick as the click raced the render and read fewer entries on a
		// slow frame: 1 red run in 3 on an identical SHA, 2026-09-01.
		await expect(page.getByRole('menuitem')).toHaveCount(3)

		const paths = await page.evaluate(() =>
			[...document.querySelectorAll('[role="menuitem"] svg path')]
				.map((node) => node.getAttribute('d')),
		)

		expect(paths).toHaveLength(3)
		// Non-empty, so "no icon at all" cannot pass as three distinct nothings.
		for (const d of paths) {
			expect(d && d.length).toBeGreaterThan(10)
		}
		expect(new Set(paths).size).toBe(3)
	})

	test('the line menu draws a different icon for every entry', async ({ page }) => {
		await seed(page)
		await clickLine(page)
		// Same race as the step menu above: let the six entries render first.
		await expect(page.getByRole('menuitem')).toHaveCount(6)

		const paths = await page.evaluate(() =>
			[...document.querySelectorAll('[role="menuitem"] svg path')]
				.map((node) => node.getAttribute('d')),
		)

		// Edit label / Angled / Straight / Curved / Copy / Delete.
		expect(paths).toHaveLength(6)
		for (const d of paths) {
			expect(d && d.length).toBeGreaterThan(10)
		}
		expect(new Set(paths).size).toBe(6)
	})

})

test.describe('flow editor — accessibility', () => {
	// ⚠️ ONE TEST PER THEME, NOT A LOOP INSIDE ONE TEST.
	//
	// The loop seeded the graph twice, emulated the colour scheme twice and ran
	// axe twice inside a single 30s budget. On its own that finished in ~12s; in
	// the full `fullyParallel` run, with every other spec contending for the
	// same machine, it timed out — and a timeout on the slowest test in the file
	// reads as "the a11y check broke" rather than "this test asks for too much
	// at once". Two tests fit the budget, and they run in parallel anyway, so
	// splitting costs no wall-clock.
	for (const theme of ['light', 'dark']) {
		test(`axe finds no violations on a graph carrying warnings — ${theme}`, async ({ page }) => {
			// The EDITOR surface, not the bare canvas — `flow-canvas.e2e.js`
			// covers that one. What is new here is a graph with warning ports on
			// it: the state a half-built flow spends most of its life in, and the
			// one with the most colour and the most `title` / `aria-label` on
			// elements that are not controls.
			// eslint-disable-next-line
			const axePath = require.resolve('axe-core')

			await seed(page)
			await page.emulateMedia({ colorScheme: theme })
			await expect(step(page, 'Lonely').locator('.cn-flow-node__handle--orphan')).toHaveCount(4)

			await page.addScriptTag({ path: axePath })
			const result = await page.evaluate(async () => {
				// eslint-disable-next-line
				return await window.axe.run(document.querySelector('[data-testid="flow-box"]'))
			})

			const serious = result.violations.filter(
				(violation) => violation.impact === 'serious' || violation.impact === 'critical',
			)
			expect(
				serious.map((violation) => `${violation.id}: ${violation.nodes.map((n) => n.html).join(' | ')}`),
			).toEqual([])
		})
	}
})

test.describe('flow canvas — the direction of flow, along the whole line', () => {
	test('a line carries a travelling pulse', async ({ page }) => {
		await page.goto(CANVAS)
		await page.locator('.vue-flow__edge').first().waitFor()

		const pulse = await page.evaluate(() => {
			const path = document.querySelector('.cn-flow-edge__pulse')
			if (path === null) {
				return null
			}

			const style = getComputedStyle(path)

			return {
				animation: style.animationName,
				duration: style.animationDuration,
				// It must follow the SAME path the line does, or it is a second
				// line rather than a marker travelling along this one.
				samePath: path.getAttribute('d') === document.querySelector('.vue-flow__edge-path').getAttribute('d'),
			}
		})

		expect(pulse).not.toBeNull()
		// `toContain`, because the SFC compiler suffixes a scoped keyframes name
		// with a content hash (`cn-flow-edge-pulse-6a540df7`) that changes every
		// time the file does. Pinning the exact name would make this test fail
		// on an unrelated edit to the stylesheet.
		expect(pulse.animation).toContain('cn-flow-edge-pulse')
		expect(pulse.duration).not.toBe('0s')
		expect(pulse.samePath).toBe(true)
	})

	test('it is GONE, not merely paused, for a reader who asked for less motion', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' })
		await page.goto(CANVAS)
		await page.locator('.vue-flow__edge').first().waitFor()

		// ⚠️ HIDDEN RATHER THAN STOPPED. A paused animation leaves the dash
		// pattern frozen wherever it stood, so the line would keep a row of dots
		// on it that read as a second, dotted connection — the letter of WCAG
		// 2.2 AA 2.3.3 without the point of it.
		await expect(page.locator('.cn-flow-edge__pulse')).toBeHidden()
	})
})
