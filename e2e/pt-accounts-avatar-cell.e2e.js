// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The `avatar` cell widget in a board table (PtAccounts "Naam"), measured in a
// browser: the e-mail (the column's `secondary`) sits under the name BESIDE the
// 32px initials circle, not under the whole cell, and the name keeps the plain
// title style (15px, weight 700, no underline) of a normal title cell.
//
// WHY PLAYWRIGHT: x positions, weights and underlines are layout and computed
// style; jsdom resolves neither.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('an avatar name cell stacks the e-mail under the name, beside the circle', async ({ page }) => {
	await page.goto('/?ptaccounts=1', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const cell = page.locator('[data-testid="pt-accounts"] tbody tr').first().locator('td.cn-table-col--title')
	await cell.waitFor({ state: 'visible', timeout: 60_000 })

	const info = await cell.evaluate((td) => {
		const circle = td.querySelector('.cn-cell-renderer__avatar-initials').getBoundingClientRect()
		const name = td.querySelector('.cn-cell-renderer__avatar-name')
		const nameBox = name.getBoundingClientRect()
		const secondary = td.querySelector('.cn-cell-renderer__avatar-secondary')
		const secondaryBox = secondary.getBoundingClientRect()
		const nameStyle = getComputedStyle(name)
		return {
			circleWidth: Math.round(circle.width),
			circleRight: circle.right,
			nameLeft: nameBox.left,
			secondaryLeft: secondaryBox.left,
			secondaryTop: secondaryBox.top,
			nameBottom: nameBox.bottom,
			circleMid: circle.top + circle.height / 2,
			stackMid: (nameBox.top + secondaryBox.bottom) / 2,
			nameWeight: Number(nameStyle.fontWeight),
			nameSize: nameStyle.fontSize,
			nameUnderline: nameStyle.textDecorationLine,
			secondarySize: getComputedStyle(secondary).fontSize,
			secondaryText: secondary.textContent.trim(),
			duplicate: td.querySelectorAll('.cn-table-cell__secondary').length,
		}
	})

	expect(info.circleWidth).toBe(32)
	// The name and the e-mail start at the same x, 10px after the circle.
	expect(Math.round(info.secondaryLeft)).toBe(Math.round(info.nameLeft))
	expect(Math.round(info.nameLeft - info.circleRight)).toBe(10)
	// The e-mail is under the name, and the circle is centred on the pair.
	expect(info.secondaryTop).toBeGreaterThanOrEqual(info.nameBottom - 1)
	expect(Math.abs(info.circleMid - info.stackMid)).toBeLessThan(3)
	expect(info.secondaryText).toBe('m.dewit@oosthaven.nl')
	expect(info.secondarySize).toBe('13px')
	// Drawn once: not again under the whole cell.
	expect(info.duplicate).toBe(0)
	// The name keeps the plain-title style.
	expect(info.nameWeight).toBe(700)
	expect(info.nameSize).toBe('15px')
	expect(info.nameUnderline).toBe('none')
})
