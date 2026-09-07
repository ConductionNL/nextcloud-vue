// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The flow editor's messages, on the canvas.
//
// THE JOURNEY, END TO END
// -----------------------
// Open a PUBLISHED flow, pick a step from the palette, and read the refusal.
// Ruben did exactly that, saw the canvas do nothing, and never found the note
// card the editor had put at the top of the Steps tab in the right sidebar.
//
// It is asserted here rather than only in jest because the two things that make
// or break the fix need a real browser:
//
// 1. WHERE THE MESSAGE IS. "On the canvas" is a geometric claim. jsdom computes
//    no layout, so a unit test asserting the element exists cannot tell a
//    message pinned over the graph from one rendered off-screen.
// 2. WHETHER IT SWALLOWS THE CANVAS. The area is an absolutely positioned box
//    over the graph. `pointer-events` decides whether the space it covers still
//    belongs to the canvas underneath, and jsdom does not do hit testing at all.
//
// The harness mounts BOTH halves under `?flow=1` — CnFlowDetail and, in its
// embedded form, CnFlowSidebar — because this journey crosses them: the click
// happens in the palette and the answer has to appear on the canvas.

import { test, expect } from '@playwright/test'

const EDITOR = '/?flow=1'

// The addable step this spec clicks, taken from the catalogue THE HARNESS
// seeds. Named once so it cannot drift back into a per-spec catalogue.
const STEP = 'Edit fields'

/**
 * Open the editor on a flow, using the catalogue THE HARNESS owns.
 *
 * 🔴 THIS SPEC MUST NOT SEED THE CATALOGUE. It used to, and that is what made
 * it fail on CI while passing on every developer machine.
 *
 * The harness seeds a catalogue and then re-seeds it ONCE, from a watcher on
 * `catalogLoading`, because the store's own request has no Nextcloud behind it
 * and its failure path sets `nodeCatalog = []` a moment after the first seed.
 * That watcher is the harness's whole defence, and it only fires on a CHANGE.
 *
 * Seeding `catalogLoading = false` here disarmed it. On CI, where the request
 * is still in the air when the spec runs, the order became: spec seeds and
 * forces the flag false, the request then fails and empties the catalogue, and
 * the flag never changes again — so the watcher never fires and the palette is
 * empty for the rest of the test. Locally the request had already failed
 * before this line, so the seed survived and everything passed.
 *
 * The fix is not to wait longer. It is to stop two writers fighting over one
 * variable: the harness owns the catalogue, so a spec uses the entries it
 * provides (`Manual`, `Edit fields`, `End`) instead of inventing its own.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @param {string} lifecycleStatus The flow's lifecycle status.
 * @return {Promise<void>}
 */
async function openFlow(page, lifecycleStatus) {
	await page.goto(EDITOR)
	await page.locator('[data-testid="flow-box"]').waitFor()

	await page.evaluate((status) => {
		const store = window.__cnFlowStore
		store.flow = {
			id: 'flow-1',
			name: 'Mandaatbesluit, verkorte route',
			version: 2,
			lifecycleStatus: status,
			trigger: 'manual',
			nodes: [],
			edges: [],
		}
	}, lifecycleStatus)

	// A PRECONDITION, named so it fails legibly. `Edit fields` is the harness's
	// own entry, so its absence means the catalogue never seeded — which is a
	// different problem from the step under test, and used to present as a
	// click timing out after thirty seconds.
	await openPicker(page)
	await expect(
		page.locator('[data-testid="flow-step-picker-item"]', { hasText: STEP }),
		'the harness catalogue must have seeded before any of this is meaningful',
	).toBeVisible()
	await page.keyboard.press('Escape')
	await expect(page.locator('[data-testid="flow-step-picker"]')).toBeHidden()
}

/**
 * Open the step picker.
 *
 * The palette used to be a column in the sidebar; it is a modal off the
 * toolbar now, so every "click a step" in this file goes through here.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<void>}
 */
async function openPicker(page) {
	await page.locator('[data-testid="flow-add-step"]').click()
	await expect(page.locator('[data-testid="flow-step-picker"]')).toBeVisible()
}

/**
 * Add a step by name, through the picker.
 *
 * The modal closes itself on either outcome — the step arriving, or the graph
 * refusing it — because it covers the canvas that shows both.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @param {string} name The step's display name.
 * @return {Promise<void>}
 */
async function addStep(page, name) {
	await openPicker(page)
	await page.locator('[data-testid="flow-step-picker-item"]', { hasText: name }).click()
	await expect(page.locator('[data-testid="flow-step-picker"]')).toBeHidden()
}

test.describe('flow messages — the refusal an author could not find', () => {
	/**
	 * ⚠️ THE ONE THAT MATTERS.
	 */
	test('adding a step to a published flow says so ON the canvas', async ({ page }) => {
		await openFlow(page, 'published')

		// The palette entry, clicked the way an author clicks it.
		await addStep(page, STEP)

		const message = page.locator('[data-testid="flow-message-graph-locked"]')
		await expect(message).toBeVisible()
		await expect(message).toContainText('cannot be changed')

		// The refusal is INSIDE the canvas box, which is the whole claim. An
		// element that exists but renders somewhere else is the defect, not the
		// fix.
		const canvasBox = await page.locator('[data-testid="flow-box"]').boundingBox()
		const messageBox = await message.boundingBox()
		expect(messageBox.x).toBeGreaterThanOrEqual(canvasBox.x)
		expect(messageBox.y).toBeGreaterThanOrEqual(canvasBox.y)
		expect(messageBox.x + messageBox.width).toBeLessThanOrEqual(canvasBox.x + canvasBox.width + 1)

		// And it did what it said: nothing was added.
		await expect(page.locator('.cn-flow-node')).toHaveCount(0)
	})

	test('the sidebar does not say it too', async ({ page }) => {
		await openFlow(page, 'published')
		await addStep(page, STEP)

		await expect(page.locator('[data-testid="flow-message-graph-locked"]')).toBeVisible()

		// One home per message. Two copies and neither is authoritative, which
		// is how the sidebar copy came to be the only one and then went unread.
		await expect(page.locator('[data-testid="flow-sidebar-box"]')).not.toContainText('cannot be changed')
	})

	test('clicking the palette again does not add a second card', async ({ page }) => {
		await openFlow(page, 'published')

		await addStep(page, STEP)
		await addStep(page, 'End')
		await addStep(page, STEP)

		// Three refused clicks, one thing wrong.
		await expect(page.locator('[data-testid="flow-message-graph-locked"]')).toHaveCount(1)
	})

	test('a draft accepts the same click and says nothing about a lock', async ({ page }) => {
		await openFlow(page, 'draft')

		await addStep(page, STEP)

		await expect(page.locator('.cn-flow-node')).toHaveCount(1)
		await expect(page.locator('[data-testid="flow-message-graph-locked"]')).toHaveCount(0)
	})
})

test.describe('flow messages — the area does not take the canvas away', () => {
	test('the gaps between cards still belong to the graph', async ({ page }) => {
		await openFlow(page, 'published')
		await addStep(page, STEP)

		// A second message, so there is a real gap between two cards to aim at.
		await page.evaluate(() => {
			window.__cnFlowStore.error = { message: 'Something else went wrong.' }
		})
		await expect(page.locator('.cn-flow-canvas-messages__item')).toHaveCount(2)

		const hit = await page.evaluate(() => {
			const cards = [...document.querySelectorAll('.cn-flow-canvas-messages__item')]
			const first = cards[0].getBoundingClientRect()
			const second = cards[1].getBoundingClientRect()
			const element = document.elementFromPoint(
				first.left + (first.width / 2),
				(first.bottom + second.top) / 2,
			)

			return {
				// The container is `pointer-events: none`, so a point in the gap
				// must resolve to whatever is UNDER the area.
				insideArea: element?.closest('.cn-flow-canvas-messages') !== null
					&& element?.closest('.cn-flow-canvas-messages') !== undefined,
				pointerEvents: getComputedStyle(document.querySelector('.cn-flow-canvas-messages')).pointerEvents,
			}
		})

		expect(hit.pointerEvents).toBe('none')
		// The failure this guards is invisible: nothing errors, the canvas just
		// stops responding inside a rectangle nobody can see.
		expect(hit.insideArea).toBe(false)
	})

	test('a card is still clickable, so dismissing one works', async ({ page }) => {
		await openFlow(page, 'published')
		await addStep(page, STEP)

		const message = page.locator('[data-testid="flow-message-graph-locked"]')
		await expect(message).toContainText('cannot be changed')

		// The other half of the pointer contract: the container gives the
		// pointer away and each card takes it back.
		await page.locator('[data-testid="flow-message-dismiss-graph-locked"]').click()

		// The refusal goes; the LOCK stays, because it is still true.
		await expect(message).toContainText('read-only')
	})

	test('the area does not cover the graph', async ({ page }) => {
		await openFlow(page, 'published')
		await addStep(page, STEP)

		const canvasBox = await page.locator('[data-testid="flow-box"]').boundingBox()
		const areaBox = await page.locator('.cn-flow-canvas-messages').boundingBox()

		// A message strip across the canvas is a different defect from a
		// message nobody can find, not a fix for it.
		expect(areaBox.width).toBeLessThan(canvasBox.width / 2)
		expect(areaBox.height).toBeLessThan(canvasBox.height / 2)
	})
})

test.describe('flow messages — what a screen reader is told', () => {
	test('errors go to an assertive region and the rest to a polite one', async ({ page }) => {
		await openFlow(page, 'published')

		await page.evaluate(() => {
			const store = window.__cnFlowStore
			store.error = { response: { data: { error: 'A flow needs a name.' } } }
		})

		const alert = page.locator('[data-testid="flow-messages-alert"]')
		const status = page.locator('[data-testid="flow-messages-status"]')

		// A message that appears silently does not exist for a screen-reader
		// user, and an error announced twice is its own problem.
		await expect(alert).toHaveAttribute('role', 'alert')
		await expect(alert).toContainText('A flow needs a name.')
		await expect(status).toHaveAttribute('aria-live', 'polite')
		await expect(status).toContainText('read-only')
		await expect(status).not.toContainText('A flow needs a name.')
	})

	test('severity reaches assistive tech as a word, not only as a colour', async ({ page }) => {
		await openFlow(page, 'published')

		const severity = page.locator('[data-testid="flow-message-graph-locked"] .cn-flow-canvas-messages__severity')

		// Visually hidden, still in the accessibility tree: clipped rather than
		// `display: none`, which would remove it from that tree entirely.
		await expect(severity).toHaveText('Warning')
		const box = await severity.boundingBox()
		expect(box.width).toBeLessThanOrEqual(2)
	})
})

test.describe('flow sidebar — the header carries the flow', () => {
	/**
	 * The action menu really opens, which a mounted-component test cannot say.
	 * NcActions teleports its menu to the body on click, so "the items exist"
	 * in jsdom and "a user can reach them" are different claims.
	 */
	test('the header menu opens and offers the flow\'s verbs', async ({ page }) => {
		await openFlow(page, 'draft')

		await page.locator('[data-testid="flow-sidebar-box"] .action-item__menutoggle').first().click()

		for (const name of ['Edit flow', 'Enable', 'Publish']) {
			await expect(page.getByRole('menuitem', { name })).toBeVisible()
		}
	})

	test('Edit flow opens the settings dialog, not the whole editor again', async ({ page }) => {
		await openFlow(page, 'draft')

		await page.locator('[data-testid="flow-sidebar-box"] .action-item__menutoggle').first().click()
		await page.getByRole('menuitem', { name: 'Edit flow' }).click()

		// CnFlowSettingsModal, not CnFlowEditModal. The second would mount a
		// canvas inside a dialog on top of the canvas already on the page.
		const dialog = page.locator('[data-testid="flow-settings-modal"]')
		await expect(dialog).toBeVisible()
		await expect(dialog).toContainText('Name')
		await expect(dialog.locator('.cn-graph-canvas')).toHaveCount(0)
	})

	// ⚠️ INVERTED, NOT DELETED. This assertion used to require
	// 'Restrict to register' IN the dialog, which is exactly the thing that
	// has moved: what starts a flow is a step on the canvas, and the four
	// legacy columns were a second way to say a fact the graph already
	// carries. Deleting the assertion would leave nothing watching the field
	// come back; inverting it keeps the claim, pointed the other way.
	test('the settings dialog carries no trigger configuration at all', async ({ page }) => {
		await openFlow(page, 'draft')

		await page.locator('[data-testid="flow-sidebar-box"] .action-item__menutoggle').first().click()
		await page.getByRole('menuitem', { name: 'Edit flow' }).click()

		const dialog = page.locator('[data-testid="flow-settings-modal"]')
		await expect(dialog).toBeVisible()

		for (const gone of ['Trigger', 'Restrict to register', 'Restrict to schema', 'Cron schedule']) {
			await expect(dialog).not.toContainText(gone)
		}

		// And it says where the trigger went, rather than leaving a hole.
		await expect(dialog.locator('[data-testid="flow-settings-trigger-note"]')).toContainText('step on the canvas')
	})

	test('Run is refused, in words, until the canvas has a manual start step', async ({ page }) => {
		await openFlow(page, 'draft')

		const run = page.locator('[data-testid="flow-run-button"]')
		await expect(run).toBeDisabled()
		await expect(run).toHaveAttribute('title', /manual start step/)
	})

	// ⚠️ INVERTED, not deleted. This asserted TWO tabs (Steps and Runs), after a
	// version that asserted three. The palette moved to a modal off the toolbar
	// and took the Steps tab with it, so the sidebar is the flow's runs — and a
	// strip with one tab in it is chrome around nothing, so the strip is gone
	// too. The claim survives, pointed the other way.
	test('the sidebar has no tab strip left: it is the flow\'s runs', async ({ page }) => {
		await openFlow(page, 'draft')

		await expect(page.locator('[data-testid="flow-sidebar-box"] [role="tablist"]')).toHaveCount(0)
		await expect(page.locator('[data-testid="flow-sidebar-box"]')).toContainText('Runs')
		await expect(page.locator('[data-testid="flow-sidebar-box"]')).not.toContainText('Search steps')
	})
})

test.describe('flow sidebar — a run has its own address', () => {
	test('a run row is a real link a browser can open in a new tab', async ({ page }) => {
		await openFlow(page, 'draft')

		await page.evaluate(() => {
			window.__cnFlowStore.runs = [
				{ uuid: 'run-1', status: 'completed', created: '2026-09-06 08:00' },
			]
		})

		// No tab to press any more: the sidebar IS the runs.
		const link = page.locator('[data-testid="flow-run-link"]').first()
		await expect(link).toBeVisible()

		// The attribute a browser acts on, read off the real DOM. `href` set
		// through a binding that produced `undefined` still renders an <a>, and
		// still swallows middle-click without a word.
		const href = await link.getAttribute('href')
		expect(href).toContain('/apps/openregister/flow-runs/run-1')
	})
})
