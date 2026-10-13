// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// Two builds of the library on one page (?l7=library-style, harness
// l7/LibraryStyle.vue): one library stylesheet stays, the newest build's, in
// either load order. Before, every app's bundle added its own copy, and an
// older copy's `!important` rule beat the newer one (pipelinq's lead page kept
// a 16px list footer bleed over #1529's 12px).
//
// WHY PLAYWRIGHT: the cascade between two real <style> elements.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

for (const order of ['old-first', 'new-first']) {
	test(`the newest build's stylesheet is the one on the page (${order})`, async ({ page }) => {
		await page.goto(`/?l7=library-style&order=${order}`, { waitUntil: 'domcontentloaded', timeout: 90_000 })
		const probe = page.locator('[data-testid="library-style-probe"]')
		await probe.waitFor({ state: 'visible', timeout: 60_000 })
		const sheets = await page.locator('style[data-cn-library]').count()
		expect(sheets).toBe(1)
		await expect(page.locator('style[data-cn-library]')).toHaveAttribute('data-cn-library', '2026-10-13T10:00:00.000Z')
		await expect(probe).toHaveCSS('color', 'rgb(0, 120, 0)')
	})
}
