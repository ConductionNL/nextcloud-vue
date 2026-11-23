// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The field labels of the detail data card under the board look (DqContact,
// PqKlant, ShKlant): 13px, regular weight, light grey. The component's own
// label rule (weight 500, 0.85em, set with the same specificity as the look's)
// won whenever the component's CSS came after the look's, so the labels read
// bold and dark on the live page.
//
// The board stylesheets are put FIRST in the head, the order the built library
// ships them in, so ties resolve as they do in an app.

import { expect, test } from '@playwright/test'
import fs from 'fs'

const BOARD_CSS = ['src/css/look-board.css', 'src/css/look-board-detail.css']
	.map((file) => fs.readFileSync(file, 'utf8'))
	.join('\n')

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the data card labels are 13px, regular weight and light grey', async ({ page }) => {
	await page.goto('/?tabswidget=board', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await page.locator('.tabs-board .cn-object-data-widget__label').first().waitFor({ state: 'visible', timeout: 60_000 })
	await page.evaluate((text) => {
		const style = document.createElement('style')
		style.textContent = text
		document.head.prepend(style)
		// A theme that sets the ink of every div outside the header with an id in
		// its selector (nldesign's element overrides), after the look and the component.
		const theme = document.createElement('style')
		theme.textContent = 'div:not(#header div):not(#header * div) { color: rgb(27, 28, 29); }'
		document.head.append(theme)
	}, BOARD_CSS)
	const m = await page.evaluate(() => {
		const label = document.querySelector('.tabs-board .cn-object-data-widget__label')
		const value = document.querySelector('.tabs-board .cn-object-data-widget__value')
		const cs = getComputedStyle(label)
		return {
			weight: Number(cs.fontWeight),
			size: cs.fontSize,
			color: cs.color,
			valueColor: getComputedStyle(value).color,
		}
	})
	expect(m.weight).toBe(400)
	expect(m.size).toBe('13px')
	// Not the theme's ink for every div: the label stays the muted colour.
	expect(m.color).not.toBe('rgb(27, 28, 29)')
	expect(m.color).not.toBe(m.valueColor)
})
