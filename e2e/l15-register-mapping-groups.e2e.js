// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// register-mapping-collapsed-groups: a register mapping with several groups
// starts with every group closed behind a heading button that shows its
// configured count, so the card is short (pipelinq's was ~2,700px). A click
// or Enter opens one group.
//
// WHY PLAYWRIGHT: laid-out heights and real keyboard activation.
//
// @spec openspec/changes/register-mapping-collapsed-groups/specs/register-mapping/spec.md

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('register groups start closed with their count and open on demand', async ({ page }) => {
	await page.route('**/apps/openregister/api/registers**', (route) => route.fulfill({
		contentType: 'application/json',
		body: JSON.stringify({ results: [{ id: 5, title: 'Pipelinq', schemas: [{ id: 28, title: 'client' }, { id: 29, title: 'contact' }] }] }),
	}))
	await page.setViewportSize({ width: 1000, height: 900 })
	await page.goto('/?l8=mapping-groups', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const root = page.locator('[data-testid="mapping-groups"]')
	const toggles = root.locator('[data-testid="cn-register-mapping-group-toggle"]')
	await expect(toggles).toHaveCount(4, { timeout: 90_000 })

	await expect(root.locator('[data-testid="cn-register-mapping-group-count"]')).toHaveText(['2/8 configured', '0/4 configured', '0/3 configured', '0/3 configured'])
	for (let i = 0; i < 4; i++) {
		await expect(toggles.nth(i)).toHaveAttribute('aria-expanded', 'false')
	}
	const closed = (await root.boundingBox()).height
	expect(closed).toBeLessThan(600)

	await toggles.nth(0).click()
	await expect(toggles.nth(0)).toHaveAttribute('aria-expanded', 'true')
	await expect(root.locator('[data-testid="cn-register-mapping-group-body"]').nth(0)).toBeVisible()
	expect((await root.boundingBox()).height).toBeGreaterThan(closed + 200)

	await toggles.nth(1).focus()
	await page.keyboard.press('Enter')
	await expect(toggles.nth(1)).toHaveAttribute('aria-expanded', 'true')
	await expect(root.locator('[data-testid="cn-register-mapping-group-body"]').nth(1)).toBeVisible()
})
