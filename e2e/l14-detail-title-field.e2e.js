// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A detail page names the record by `titleField` (?l7=detail-title-field,
// harness l7/DetailTitleField.vue): the heading reads the invoice number,
// not the schema title OpenRegister puts in `@self.name`.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the invoice page is headed by the invoice number', async ({ page }) => {
	await page.goto('/?l7=detail-title-field', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const title = page.locator('[data-testid="detail-title-field"] .cn-detail-page__title')
	await title.waitFor({ state: 'visible', timeout: 60_000 })
	await expect(title).toHaveText('F-2026-0001')
})
