// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The list view and the canvas are one flow: what changes in the list is on the
// canvas after the switch, in a real browser, where Vue Flow draws the nodes.

import { expect, test } from '@playwright/test'

/**
 * Open the editor with trigger, two steps and an end, as a list.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<void>}
 */
async function seed(page) {
	await page.goto('/?flow=1&view=list')
	await page.locator('[data-testid="flow-box"]').waitFor()

	await page.evaluate(() => {
		const store = window.__cnFlowStore
		store.nodeCatalog = [
			{ id: 'openregister.trigger-manual', displayName: 'Manual', role: 'trigger' },
			{ id: 'openregister.set-fields', displayName: 'Edit fields', role: 'step' },
			{ id: 'openregister.end', displayName: 'End', role: 'end' },
		]
		store.flow.nodes = [
			{ id: 't', type: 'openregister.trigger-manual', name: 'Start', start: true, x: 60, y: 60, config: {} },
			{ id: 'a', type: 'openregister.set-fields', name: 'First', x: 60, y: 200, config: {} },
			{ id: 'b', type: 'openregister.set-fields', name: 'Second', x: 60, y: 340, config: {} },
			{ id: 'e', type: 'openregister.end', name: 'Close', x: 60, y: 480, config: {} },
		]
		store.flow.edges = [{ from: 't', to: 'a' }, { from: 'a', to: 'b' }, { from: 'b', to: 'e' }]
	})

	await expect(page.locator('[data-testid="flow-step-row"]')).toHaveCount(3)
}

test.describe('flow editor list view', () => {
	test('moves a step in the list, and the canvas shows the same flow', async ({ page }) => {
		await seed(page)

		await page.locator('[data-testid="flow-step-row"]').first().locator('[data-testid="flow-step-down"]').click()

		await expect(page.locator('[data-testid="flow-step-row"] strong')).toHaveText(['Second', 'First', 'Close'])
		const lines = await page.evaluate(() => window.__cnFlowStore.canvasEdges.map((line) => `${line.source}>${line.target}`))
		expect(lines).toEqual(['t>b', 'b>a', 'a>e'])

		await page.locator('[data-testid="flow-view-canvas"]').click()

		await expect(page.locator('.cn-flow-node')).toHaveCount(4)
		await expect(page.locator('[data-testid="flow-step-list"]')).toHaveCount(0)
	})

	test('comes back from the canvas with what the canvas changed', async ({ page }) => {
		await seed(page)
		await page.locator('[data-testid="flow-view-canvas"]').click()
		await expect(page.locator('.cn-flow-node')).toHaveCount(4)

		await page.evaluate(() => window.__cnFlowStore.removeNode('b'))
		await page.locator('[data-testid="flow-view-list"]').click()

		await expect(page.locator('[data-testid="flow-step-row"]')).toHaveCount(2)
	})
})
