// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// @spec CnNavCardGrid cards are keyboard-operable via native elements —
// Tab reaches a card, Enter activates it (openspec/changes/cn-nav-card-grid).
//
// WHY THIS IS AN e2e SPEC AND NOT A JEST SPEC.
//
// CnNavCardGrid deliberately has NO custom keydown handler — its cards are
// native <a>/<router-link> elements, relying entirely on the browser's own
// "Enter activates the focused link" behaviour (a User-Agent feature of the
// HTML `a` element, not something the library implements). jsdom does not
// simulate that UA behaviour: dispatching a synthetic `keydown` with
// `key: 'Enter'` on an anchor in jsdom does nothing — no click, no
// navigation. A jest assertion here would only prove the test dispatched an
// event, never that activation actually happened. Only a real browser can
// measure the real claim.

import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
	await page.goto('/?navcards=1')
	await expect(page.locator('[data-testid="navcards-start"]')).toBeVisible()
})

// The card is not the literal next Tab stop after "Start": CnWidgetWrapper's
// chrome puts TWO focusable stops before the content — the header's
// overflow "Actions" menu button, then the scrollable content region itself
// (tabindex=0, the WCAG "scrollable-region-focusable" pattern) — before
// reaching the grid. Verified empirically (not assumed) via a debug probe
// that walked five consecutive Tabs and printed the active element at each
// step. Tabbing three times from "Start" still proves the card is genuinely
// reachable via native focus order, which is the actual claim under test
// (not "immediately adjacent to an arbitrary preceding element").
async function tabToFirstCard(page) {
	await page.locator('[data-testid="navcards-start"]').focus()
	await page.keyboard.press('Tab') // CnWidgetWrapper header Actions button
	await page.keyboard.press('Tab') // CnWidgetWrapper scrollable content region
	await page.keyboard.press('Tab') // first CnNavCardGrid card
}

test('Tab reaches the card via native focus order (through the widget chrome)', async ({ page }) => {
	await tabToFirstCard(page)

	const card = page.locator('.cn-nav-card-grid__card').first()
	await expect(card).toBeFocused()
})

test('Enter activates a focused card (opens its href in a new tab)', async ({ page, context }) => {
	await tabToFirstCard(page)
	await expect(page.locator('.cn-nav-card-grid__card').first()).toBeFocused()

	const [newPage] = await Promise.all([
		context.waitForEvent('page'),
		page.keyboard.press('Enter'),
	])
	await newPage.waitForLoadState('domcontentloaded').catch(() => {
		// example.org is an external host; in an offline CI runner the
		// navigation itself may fail to resolve, but the browser having
		// opened a SECOND PAGE at all is the load-bearing assertion —
		// that only happens because Enter genuinely activated the link.
	})
	expect(newPage.url()).toContain('example.org/explore')
	await newPage.close()
})

test('the card has no aria-label (accessible name comes from its content)', async ({ page }) => {
	const card = page.locator('.cn-nav-card-grid__card').first()
	await expect(card).toHaveAttribute('aria-describedby', /.+/)
	expect(await card.getAttribute('aria-label')).toBeNull()
	await expect(card).toContainText('Explore')
})
