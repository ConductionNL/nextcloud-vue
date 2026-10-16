// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// version-card-dutch-and-header: the admin chrome for a Dutch reader (board
// PqBeheer). The version card and the register mapping read in Dutch, and in
// half-width cards no button overlaps a card's title.
//
// WHY PLAYWRIGHT: laid-out boxes of titles and buttons.
//
// @spec openspec/changes/version-card-dutch-and-header/specs/settings-board-look/spec.md

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

/**
 * @param {{x: number, y: number, width: number, height: number}} a A box.
 * @param {{x: number, y: number, width: number, height: number}} b Another box.
 * @return {boolean} Whether they overlap.
 */
function overlaps(a, b) {
	return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

test('the admin chrome reads in Dutch and no button covers a card title', async ({ page }) => {
	await page.route('**/apps/openregister/api/registers**', (route) => route.fulfill({
		contentType: 'application/json',
		body: JSON.stringify({ results: [{ id: 5, title: 'Pipelinq', schemas: [{ id: 28, title: 'client' }] }] }),
	}))
	await page.setViewportSize({ width: 1100, height: 900 })
	await page.goto('/?l8=admin-chrome-dutch', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const root = page.locator('[data-testid="admin-chrome-dutch"]')
	const version = root.locator('.cn-version-info')
	await expect(version).toBeVisible({ timeout: 90_000 })

	await expect(version.locator('.cn-version-info__label')).toHaveText(['Naam van de app:', 'Versie:', 'Ingestelde versie:'])
	await expect(root).toContainText('Bijgewerkt')
	await expect(root).toContainText('Ondersteuning')
	await expect(root).toContainText('Soort object')
	await expect(root).not.toContainText('Up to date')
	await expect(root).not.toContainText('Application Name')

	const sections = root.locator('.settings-section')
	const count = await sections.count()
	expect(count).toBeGreaterThanOrEqual(2)
	for (let i = 0; i < count; i++) {
		const section = sections.nth(i)
		const title = section.locator(':scope > .settings-section__name').first()
		if (await title.count() === 0) {
			continue
		}
		const titleBox = await title.boundingBox()
		const buttons = section.locator('button, a.button-vue')
		for (let j = 0; j < await buttons.count(); j++) {
			const box = await buttons.nth(j).boundingBox()
			if (box) {
				expect(overlaps(titleBox, box), `button ${j} of section ${i} overlaps its title`).toBe(false)
			}
		}
	}
})
