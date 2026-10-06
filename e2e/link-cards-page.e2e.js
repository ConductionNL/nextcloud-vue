// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// @spec openspec/changes/live-check-follow-ups/specs/live-check-follow-ups/spec.md#requirement-a-link-card-looks-like-a-card
// @spec openspec/changes/live-check-follow-ups/specs/live-check-follow-ups/spec.md#requirement-a-page-heading-clears-the-navigation-toggle
//
// WHY THIS IS AN e2e SPEC AND NOT A JEST SPEC.
//
// The defect was a cascade outcome: on a live Nextcloud the theme ships
// `a { text-decoration: underline !important }`, and the card's own
// `text-decoration: none` lost to it, so a card's label and description
// rendered underlined. jsdom applies no scoped SFC styles and does not
// resolve two `!important` rules against each other, so a jest assertion
// could only read the source back. This spec injects the theme's rule and
// reads the style the browser computed.

import { expect, test } from '@playwright/test'

/** What thematiq's nldesign theme sets on every link (theme.css, "LINKS"). */
const THEME_LINK_RULES = `
	a { text-decoration: underline !important; }
	a { color: rgb(204, 0, 0) !important; }
`

test.beforeEach(async ({ page }) => {
	await page.goto('/?linkcards=1')
	await expect(page.locator('[data-testid="cn-link-card"]').first()).toBeVisible()
	await page.addStyleTag({ content: THEME_LINK_RULES })
})

/**
 * @param {import('@playwright/test').Locator} locator The element.
 * @param {string} property A CSS property name.
 * @return {Promise<string>} Its computed value.
 */
function computed(locator, property) {
	return locator.evaluate((el, prop) => getComputedStyle(el).getPropertyValue(prop), property)
}

test('the control: the injected theme rule does underline a plain link', async ({ page }) => {
	// Without this the assertions below could pass because the injected
	// stylesheet never applied.
	await page.evaluate(() => {
		const link = document.createElement('a')
		link.href = 'https://example.org/'
		link.textContent = 'plain link'
		link.setAttribute('data-testid', 'plain-link')
		document.body.appendChild(link)
	})
	expect(await computed(page.locator('[data-testid="plain-link"]'), 'text-decoration-line')).toBe('underline')
})

test('a card is a real link that is not underlined, at rest or on hover', async ({ page }) => {
	const card = page.locator('[data-testid="cn-link-card"]').first()
	expect(await card.evaluate((el) => el.tagName)).toBe('A')
	await expect(card).toHaveAttribute('href', 'https://example.org/leads')

	expect(await computed(card, 'text-decoration-line')).toBe('none')
	expect(await computed(card.locator('.cn-link-cards-page__label'), 'text-decoration-line')).toBe('none')
	expect(await computed(card.locator('.cn-link-cards-page__card-description'), 'text-decoration-line')).toBe('none')

	await card.hover()
	expect(await computed(card, 'text-decoration-line')).toBe('none')
})

test('the label is the title: main text colour and bold, not the link colour', async ({ page }) => {
	const card = page.locator('[data-testid="cn-link-card"]').first()
	const label = card.locator('.cn-link-cards-page__label')
	const mainText = await page.evaluate(() => {
		const probe = document.createElement('span')
		probe.style.color = 'var(--color-main-text)'
		document.body.appendChild(probe)
		const value = getComputedStyle(probe).color
		probe.remove()
		return value
	})
	expect(await computed(label, 'color')).toBe(mainText)
	expect(await computed(label, 'color')).not.toBe('rgb(204, 0, 0)')
	expect(Number(await computed(label, 'font-weight'))).toBeGreaterThanOrEqual(700)
})

test('hover and keyboard focus change the whole card', async ({ page }) => {
	const card = page.locator('[data-testid="cn-link-card"]').first()
	const restBorder = await computed(card, 'border-top-color')
	const restBackground = await computed(card, 'background-color')

	await card.hover()
	// The card has a short transition; wait for the end state.
	await expect.poll(() => computed(card, 'border-top-color')).not.toBe(restBorder)
	await expect.poll(() => computed(card, 'background-color')).not.toBe(restBackground)

	await page.mouse.move(0, 0)
	await page.keyboard.press('Tab')
	await expect(card).toBeFocused()
	expect(await computed(card, 'outline-style')).toBe('solid')
	expect(parseFloat(await computed(card, 'outline-width'))).toBeGreaterThanOrEqual(2)
})

test('the page title keeps clear of the navigation toggle', async ({ page }) => {
	// NcAppNavigationToggle is 44px wide at the left edge of the content.
	const header = page.locator('.cn-link-cards-page__header')
	expect(parseFloat(await computed(header, 'padding-inline-start'))).toBeGreaterThanOrEqual(56)
})
