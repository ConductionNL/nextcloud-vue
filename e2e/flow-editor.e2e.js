// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// CnFlowDetail — the flow EDITOR, not just its canvas.
//
// What lives here rather than in flow-canvas.e2e.js: the per-step action menu,
// and the Ctrl+Z that has to stand down inside a text field. Both belong to the
// editor, and both are behaviour against real DOM that jsdom cannot settle —
// the menu positions against a real click, and "was the keystroke aimed at an
// input" is a question about a real focus.
//
// The editor's own API calls fail in the harness (there is no Nextcloud behind
// it) and that is fine: the store logs the failure and renders a blank flow,
// which is exactly the state a new flow starts in. Stubbing them added nothing
// these assertions depend on.

import { test, expect } from '@playwright/test'

const EDITOR = '/?flow=1'

/**
 * Open the editor with a two-step flow already on the canvas.
 *
 * Seeded through the store rather than through the palette: the palette is not
 * what these tests are about, and dragging it would make every one of them
 * depend on drag-and-drop working.
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
			{ id: 'a', type: 'openregister.trigger-manual', x: 60, y: 60, config: {} },
			{ id: 'b', type: 'openregister.end', x: 60, y: 240, config: {} },
		]
		store.flow.edges = [{ id: 'e1', from: 'a', to: 'b' }]
	})

	await expect(page.locator('.cn-flow-node')).toHaveCount(2)
}

test.describe('flow editor — the step action menu', () => {
	test('clicking a step offers Edit, Copy and Delete at the step', async ({ page }) => {
		await seed(page)

		await page.locator('.cn-flow-node').first().click()

		// `menuitem`, not `button`. NcActionButton renders a real <button> and
		// then overrides its ARIA role, so a getByRole('button') query finds
		// nothing while the element is plainly there in the DOM — which reads as
		// "the menu did not open" rather than "the query asked for the wrong
		// role".
		//
		// The actions are ON the step. Selecting one used to do nothing but fill
		// the sidebar, so Edit lived in another panel and Copy did not exist.
		for (const name of ['Edit', 'Copy', 'Delete']) {
			await expect(page.getByRole('menuitem', { name })).toBeVisible()
		}
	})

	test('Copy adds a second step and leaves the edges alone', async ({ page }) => {
		await seed(page)

		await page.locator('.cn-flow-node').first().click()
		await page.getByRole('menuitem', { name: 'Copy' }).click()

		await expect(page.locator('.cn-flow-node')).toHaveCount(3)

		// A duplicate wired like its original would fan the flow in two at that
		// point — a different graph from the one the author asked for.
		await expect(page.locator('.vue-flow__edge')).toHaveCount(1)
	})

	test('Delete removes the step and the edge that pointed at it', async ({ page }) => {
		await seed(page)

		await page.locator('.cn-flow-node').first().click()
		await page.getByRole('menuitem', { name: 'Delete' }).click()

		await expect(page.locator('.cn-flow-node')).toHaveCount(1)
		await expect(page.locator('.vue-flow__edge')).toHaveCount(0)
	})
})

test.describe('flow editor — undo', () => {
	test('Ctrl+Z brings back a deleted step and its edge', async ({ page }) => {
		await seed(page)

		await page.locator('.cn-flow-node').first().click()
		await page.getByRole('menuitem', { name: 'Delete' }).click()
		await expect(page.locator('.cn-flow-node')).toHaveCount(1)

		await page.keyboard.press('Control+z')

		await expect(page.locator('.cn-flow-node')).toHaveCount(2)
		await expect(page.locator('.vue-flow__edge')).toHaveCount(1)
	})

	test('the Undo button does the same, and is disabled with nothing to undo', async ({ page }) => {
		await seed(page)

		// A shortcut nobody is told about is a feature only its author has, so
		// the button is part of the contract rather than a convenience.
		const undo = page.getByRole('button', { name: 'Undo the last change' })
		await expect(undo).toBeDisabled()

		await page.locator('.cn-flow-node').first().click()
		await page.getByRole('menuitem', { name: 'Delete' }).click()

		await expect(undo).toBeEnabled()
		await undo.click()
		await expect(page.locator('.cn-flow-node')).toHaveCount(2)
	})

	/**
	 * ⚠️ THE ONE THAT MATTERS.
	 *
	 * The listener is on `document` so the shortcut works after clicking
	 * anywhere in the editor — which is exactly why it must yield. It sees the
	 * Ctrl+Z a user presses to undo TYPING, and reverting the whole graph
	 * because someone fixed a typo would be far worse than having no undo.
	 */
	test('Ctrl+Z inside a text field does NOT revert the graph', async ({ page }) => {
		await seed(page)

		await page.locator('.cn-flow-node').first().click()
		await page.getByRole('menuitem', { name: 'Delete' }).click()
		await expect(page.locator('.cn-flow-node')).toHaveCount(1)

		const input = page.locator('[data-testid="outside-input"]')
		await input.click()
		await input.fill('some typing')
		await page.keyboard.press('Control+z')

		// The graph is untouched: the keystroke belonged to the text field.
		await expect(page.locator('.cn-flow-node')).toHaveCount(1)
	})
})
