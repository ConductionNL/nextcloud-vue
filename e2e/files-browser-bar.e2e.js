// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The files browser's controls keep their labels whole beside a long crumb.
// Found on a dossiq case on 10 October 2026: the root crumb read the folder's
// uuid and the primary button was cut to "Bestanden...". Text cutting only
// exists in a real browser.
//
// @spec openspec/changes/dutch-library-strings-and-files-crumb/specs/dutch-library-strings-and-files-crumb/spec.md#requirement-the-files-browser-keeps-its-button-labels-whole

import { expect, test } from '@playwright/test'

test('the upload button keeps its whole label beside a long crumb', async ({ page }) => {
	await page.goto('/?filesbar=1')
	const button = page.locator('[data-testid="cn-files-browser-upload-button"]')
	await expect(button).toBeVisible()
	const m = await button.evaluate((el) => {
		const texts = [...el.querySelectorAll('*')].filter((n) => n.children.length === 0 && n.textContent.trim() !== '')
		return {
			label: el.textContent.trim(),
			cut: texts.some((n) => n.scrollWidth > n.clientWidth + 0.5),
		}
	})
	expect(m.label).toBe('Bestanden toevoegen')
	expect(m.cut).toBe(false)
})
