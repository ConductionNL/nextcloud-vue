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

/**
 * Open the editor on a published flow with a usable palette.
 *
 * Seeded through the store: the harness has no Nextcloud behind it, so the
 * catalogue request fails and the palette would otherwise be empty. The
 * catalogue is server data in real life, and seeding it is the harness standing
 * in for the server rather than the test standing in for the component.
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
		store.nodeCatalog = [
			{ id: 'openregister.trigger-manual', displayName: 'When someone runs it', description: 'Start this flow by hand.' },
			{ id: 'openregister.filter', displayName: 'Filter', description: 'Drop items that do not match.' },
			{ id: 'openregister.end', displayName: 'End', description: 'End the flow here.' },
		]
		store.catalogLoading = false
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

	await expect(page.locator('.cn-flow-sidebar__palette-item').first()).toBeVisible()
}

test.describe('flow messages — the refusal an author could not find', () => {
	/**
	 * ⚠️ THE ONE THAT MATTERS.
	 */
	test('adding a step to a published flow says so ON the canvas', async ({ page }) => {
		await openFlow(page, 'published')

		// The palette entry, clicked the way an author clicks it.
		await page.locator('.cn-flow-sidebar__palette-item', { hasText: 'Filter' }).click()

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
		await page.locator('.cn-flow-sidebar__palette-item', { hasText: 'Filter' }).click()

		await expect(page.locator('[data-testid="flow-message-graph-locked"]')).toBeVisible()

		// One home per message. Two copies and neither is authoritative, which
		// is how the sidebar copy came to be the only one and then went unread.
		await expect(page.locator('[data-testid="flow-sidebar-box"]')).not.toContainText('cannot be changed')
	})

	test('clicking the palette again does not add a second card', async ({ page }) => {
		await openFlow(page, 'published')

		await page.locator('.cn-flow-sidebar__palette-item', { hasText: 'Filter' }).click()
		await page.locator('.cn-flow-sidebar__palette-item', { hasText: 'End' }).click()
		await page.locator('.cn-flow-sidebar__palette-item', { hasText: 'Filter' }).click()

		// Three refused clicks, one thing wrong.
		await expect(page.locator('[data-testid="flow-message-graph-locked"]')).toHaveCount(1)
	})

	test('a draft accepts the same click and says nothing about a lock', async ({ page }) => {
		await openFlow(page, 'draft')

		await page.locator('.cn-flow-sidebar__palette-item', { hasText: 'Filter' }).click()

		await expect(page.locator('.cn-flow-node')).toHaveCount(1)
		await expect(page.locator('[data-testid="flow-message-graph-locked"]')).toHaveCount(0)
	})
})

test.describe('flow messages — the area does not take the canvas away', () => {
	test('the gaps between cards still belong to the graph', async ({ page }) => {
		await openFlow(page, 'published')
		await page.locator('.cn-flow-sidebar__palette-item', { hasText: 'Filter' }).click()

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
		await page.locator('.cn-flow-sidebar__palette-item', { hasText: 'Filter' }).click()

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
		await page.locator('.cn-flow-sidebar__palette-item', { hasText: 'Filter' }).click()

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
