// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// board-title-secondary-own-line: in the board look the secondary line of the
// title column sits under the title, also when the app draws the title
// through its own `#column-title` slot (pipelinq's report tables), and the
// title's underline does not reach it.
//
// WHY PLAYWRIGHT: "under" is layout in a `white-space: nowrap` cell, which
// jsdom does not compute.
//
// @spec openspec/changes/board-title-secondary-own-line/specs/board-title-secondary-own-line/spec.md

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

/**
 * @param {import('@playwright/test').Locator} host The table's host.
 * @return {Promise<{titleBottom: number, secondaryTop: number, decoration: string}>} The boxes.
 */
async function measure(host) {
	const cell = host.locator('td.cn-table-col--title').first()
	return cell.evaluate((td) => {
		const secondary = td.querySelector('.cn-table-cell__secondary')
		const title = td.querySelector('.report-title') || td.querySelector('.cn-cell-renderer')
		return {
			titleBottom: title.getBoundingClientRect().bottom,
			secondaryTop: secondary.getBoundingClientRect().top,
			decoration: getComputedStyle(secondary).textDecorationLine,
		}
	})
}

test('the secondary line sits under a slotted title and under a plain one', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 })
	await page.goto('/?l8=slotted-title-secondary', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const root = page.locator('[data-testid="slotted-title-secondary"]')
	await expect(root.getByText('Pieter de Vries').first()).toBeVisible({ timeout: 90_000 })

	for (const id of ['slotted', 'plain']) {
		const box = await measure(root.locator(`[data-testid="${id}"]`))
		expect(box.secondaryTop, id).toBeGreaterThanOrEqual(box.titleBottom - 1)
		expect(box.decoration, id).toBe('none')
	}
})
