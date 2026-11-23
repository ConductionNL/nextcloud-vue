// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// Table cells in a real browser, for the two claims jsdom cannot judge because
// it resolves no CSS custom properties:
//
//  - the boolean check mark is drawn in the success TEXT colour, so a theme
//    whose `--color-success` is a pale fill (Nextcloud 32+, nldesign) still
//    gives it at least 3:1 against the page (WCAG 2.2 SC 1.4.11);
//  - a badge column on an enum property shows the x-enum-labels label and
//    keeps the colour its map keys on the stored code.
//
// @spec openspec/changes/cell-labels-and-draft-indicator/specs/cell-labels-and-draft-indicator/spec.md#requirement-the-boolean-check-mark-is-drawn-in-the-success-text-colour
// @spec openspec/changes/cell-labels-and-draft-indicator/specs/cell-labels-and-draft-indicator/spec.md#requirement-a-built-in-cell-widget-shows-an-enum-value-by-its-label

import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 120_000 })

/** A theme whose success colour is a pale fill, with a dark text variant. */
const PALE_SUCCESS_THEME = `
:root {
	--color-success: #d6f0dc;
	--color-text-success: #1e5a2b;
	--color-success-text: #1e5a2b;
	--color-main-background: #ffffff;
}
`

/**
 * Open the cell harness.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<void>}
 */
async function openHarness(page) {
	await page.goto('/?celllabels=1', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await page.getByTestId('cell-badge').locator('.cn-status-badge').waitFor({ state: 'visible', timeout: 60_000 })
}

/**
 * The WCAG contrast ratio of two `rgb()` colours.
 *
 * @param {string} a A computed colour.
 * @param {string} b A computed colour.
 * @return {number} The ratio, 1 to 21.
 */
function contrast(a, b) {
	const luminance = (rgb) => {
		const [r, g, bl] = rgb.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => {
			const c = v / 255
			return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
		})
		return 0.2126 * r + 0.7152 * g + 0.0722 * bl
	}
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
	return (hi + 0.05) / (lo + 0.05)
}

test('the boolean check mark keeps 3:1 on a theme with a pale success fill', async ({ page }) => {
	await openHarness(page)
	await page.addStyleTag({ content: PALE_SUCCESS_THEME })

	const colours = await page.evaluate(() => {
		const icon = document.querySelector('[data-testid="cell-boolean"] .cn-cell-renderer__icon')
		const probe = document.createElement('span')
		probe.style.color = 'var(--color-success)'
		document.body.appendChild(probe)
		const fill = getComputedStyle(probe).color
		probe.remove()
		return { icon: icon ? getComputedStyle(icon).color : null, fill }
	})

	// CONTROL: the theme took, so a check mark in `--color-success` would be pale.
	expect(contrast(colours.fill, 'rgb(255, 255, 255)')).toBeLessThan(3)
	expect(colours.icon).toBe('rgb(30, 90, 43)')
	expect(contrast(colours.icon, 'rgb(255, 255, 255)')).toBeGreaterThanOrEqual(3)
})

test('a badge column shows the enum label and keeps the raw-keyed colour', async ({ page }) => {
	await openHarness(page)

	const badge = page.getByTestId('cell-badge').locator('.cn-status-badge')
	await expect(badge).toHaveText('Active')
	await expect(badge).toHaveClass(/cn-status-badge--success/)
})
