// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A notice card in the side column (?l8=side-notice-card, harness
// l8/SideNoticeCard.vue): one toned box per notice, the bold title and the
// text inside it, 14px 16px inset, the warning tone different from the info
// one (DqSociaalDomein's special-category warning). A banner there drew a
// note card inside a second box and dropped the title.
//
// WHY PLAYWRIGHT: the claims are computed colours and boxes.
//
// @spec openspec/changes/side-notice-card/specs/notice-widget/spec.md#requirement-a-notice-card-for-the-side-column

import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 120_000 })

test('the side column notice is one toned box with its title', async ({ page }) => {
	await page.goto('/?l8=side-notice-card', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const warning = page.locator('[data-testid="side-special"] [data-testid="cn-notice-widget"]')
	await warning.waitFor({ state: 'visible', timeout: 60_000 })
	await expect(warning.locator('[data-testid="cn-notice-widget-title"]')).toHaveText('Bijzondere persoonsgegevens: gezondheid.')
	await expect(warning).toContainText('Elke inzage wordt gelogd met het doel.')
	const style = (locator) => locator.evaluate((el) => {
		const cs = getComputedStyle(el)
		return { bg: cs.backgroundColor, padding: cs.padding, weight: getComputedStyle(el.querySelector('strong')).fontWeight }
	})
	const w = await style(warning)
	expect(w.padding).toBe('14px 16px')
	expect(Number(w.weight)).toBeGreaterThanOrEqual(700)
	expect(w.bg).not.toBe('rgba(0, 0, 0, 0)')
	const info = await page.locator('[data-testid="side-info"] [data-testid="cn-notice-widget"]').evaluate((el) => getComputedStyle(el).backgroundColor)
	expect(info).not.toBe(w.bg)
	// One box: nothing inside the notice draws a background of its own.
	const nested = await warning.evaluate((el) => [...el.querySelectorAll('*')].filter((child) => getComputedStyle(child).backgroundColor !== 'rgba(0, 0, 0, 0)').length)
	expect(nested).toBe(0)
})
