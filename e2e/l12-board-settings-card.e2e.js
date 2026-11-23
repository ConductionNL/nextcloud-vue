// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// An admin settings card under the board look has the board's spacing
// (?l7=board-settings-card, harness l7/BoardSettingsCard.vue, portaliq's
// "Aanmelden op het portaal" on board PtBeheerinstellingen): 20px 22px
// padding, the description 4px under the title, and a note card 14px under
// the description with no margin of its own.
//
// WHY PLAYWRIGHT: the claim is rendered spacing in the card's flex column.

import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

test('a board admin settings card spaces its title, description and note card as the board does', async ({ page }) => {
	await page.route('**/apps/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
	await page.goto('/?l7=board-settings-card', { waitUntil: 'domcontentloaded', timeout: 120_000 })
	const host = page.locator('[data-testid="board-settings-card"]')
	await host.locator('.settings-section .notecard').first().waitFor({ state: 'visible', timeout: 90_000 })
	if (process.env.L11_SHOT) {
		await host.screenshot({ path: process.env.L11_SHOT })
	}
	const card = await host.locator('.settings-section').first().evaluate((section) => {
		const box = (sel) => section.querySelector(sel).getBoundingClientRect()
		const s = section.getBoundingClientRect()
		const style = getComputedStyle(section)
		const name = box('.settings-section__name')
		const desc = box('.settings-section__desc')
		const note = box('.notecard')
		return {
			padding: style.padding,
			titleSize: getComputedStyle(section.querySelector('.settings-section__name')).fontSize,
			nameToDesc: Math.round(desc.top - name.bottom),
			descToNote: Math.round(note.top - desc.bottom),
			noteToEnd: Math.round(s.bottom - note.bottom),
		}
	})
	expect(card.padding).toBe('20px 22px')
	expect(card.titleSize).toBe('17px')
	expect(card.nameToDesc).toBe(4)
	expect(card.descToNote).toBe(14)
	// The card's 20px padding plus its 1px border.
	expect(card.noteToEnd).toBe(21)
})
