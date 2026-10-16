// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// declared-props-detail-index-sidebar: the detail-page widget host and the
// index-page stat row pass a widget only the content keys it declares.
//
// WHY PLAYWRIGHT: what reaches a widget's root is the rendered DOM of the real
// hosts in a browser.
//
// @spec openspec/changes/declared-props-detail-index-sidebar/specs/widget-hosts/spec.md

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('an undeclared content key does not override what the widget computes', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 })
	await page.goto('/?l8=hosts-declared-props', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const root = page.locator('[data-testid="hosts-declared-props"]')
	await expect(root.locator('[data-testid="badge"]')).toHaveCount(2, { timeout: 90_000 })
	for (const host of ['detail-host', 'index-row']) {
		const cell = root.locator(`[data-testid="${host}"]`)
		await expect(cell.locator('[data-testid="badge"]')).toHaveText('Computed')
		await expect(cell.locator('[data-testid="heading"]')).toHaveText('Hello')
	}
})
