// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// Under the board look a Nextcloud text area or text field with a label keeps
// its placeholder hidden until the field takes focus, also under a theme that
// forces every placeholder visible (?l7=board-textarea-label, harness
// l7/BoardTextareaLabel.vue). Before, dossiq's DqTaak notes field drew its
// label "Een notitie toevoegen" over "Wat heb je gevonden, wie heb je gebeld?".
//
// WHY PLAYWRIGHT: the claim is the computed style of a ::placeholder under the
// real Nextcloud component stylesheet and a competing theme rule.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

const placeholderOpacity = (locator) => locator.evaluate((el) => getComputedStyle(el, '::placeholder').opacity)

test('the label and the placeholder are never drawn over each other', async ({ page }) => {
	await page.goto('/?l7=board-textarea-label', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="board-textarea-label"]')
	const area = host.locator('textarea')
	await area.waitFor({ state: 'visible', timeout: 60_000 })
	const field = host.locator('input').first()

	if (process.env.L11_SHOT) {
		await host.screenshot({ path: process.env.L11_SHOT })
	}
	// At rest the label sits in the field and the placeholder is hidden.
	expect(await placeholderOpacity(area)).toBe('0')
	expect(await placeholderOpacity(field)).toBe('0')

	// On focus the label moves up onto the border and the placeholder shows.
	await area.focus()
	expect(await placeholderOpacity(area)).toBe('1')
	await field.focus()
	expect(await placeholderOpacity(field)).toBe('1')
})
