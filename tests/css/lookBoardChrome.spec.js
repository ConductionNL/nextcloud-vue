/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board stylesheet is a contract the screens set: every rule is scoped
 * under .cn-look-board, and the frame, the header button and the navigation
 * carry the pixel values of the spec. jsdom draws no layout, so the values are
 * read from the stylesheet text.
 *
 * @spec openspec/changes/screens-chrome-parity/specs/app-look/spec.md#requirement-page-content-takes-the-board-frame
 * @spec openspec/changes/screens-chrome-parity/specs/app-look/spec.md#requirement-header-buttons-share-one-board-button
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * Rule bodies whose selector list has a selector containing the needle. A
 * needle ending in " {" must match the END of a selector instead.
 */
function rulesFor(needle) {
	const exact = needle.endsWith(' {')
	const text = exact ? needle.slice(0, -2) : needle
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		const selectors = m[1].split(',').map((s) => s.trim())
		if (selectors.some((s) => (exact ? s.endsWith(text) : s.includes(text)))) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('look-board.css: scope', () => {
	it('puts every selector under .cn-look-board', () => {
		const re = /([^{}]+)\{[^{}]*\}/g
		let m
		let count = 0
		while ((m = re.exec(css))) {
			for (const selector of m[1].split(',').map((s) => s.trim()).filter(Boolean)) {
				count++
				expect(selector.startsWith('.cn-look-board')).toBe(true)
			}
		}
		expect(count).toBeGreaterThan(40)
	})

	it('guards every page rule against a page that keeps the Nextcloud look', () => {
		const re = /([^{}]+)\{[^{}]*\}/g
		let m
		while ((m = re.exec(css))) {
			for (const selector of m[1].split(',').map((s) => s.trim())) {
				if (/cn-(index|detail|dashboard|settings)-page|cn-page-header|cn-admin-settings-shell/.test(selector)) {
					expect(selector).toContain(':not(.cn-look-nextcloud *)')
				}
			}
		}
	})
})

describe('look-board.css: the page frame', () => {
	it('gives index, detail, dashboard and settings pages the board padding and width', () => {
		for (const page of ['cn-index-page:', 'cn-detail-page:', 'cn-dashboard-page:', 'cn-settings-page:']) {
			const body = rulesFor(`.${page.replace(':', '')}:not`)
			expect(body).toContain('padding: var(--cn-board-content-padding)')
			expect(body).toContain('max-width: var(--cn-board-content-max-width)')
		}
	})

	it('keeps the 56px header inset only while the navigation is closed', () => {
		expect(rulesFor('.cn-look-board .cn-page-header:not')).toContain('padding-inline-start: 0')
		const closed = rulesFor(':has(.app-navigation--closed) .cn-page-header')
		expect(closed).toContain('padding-inline-start: 56px')
	})

	it('puts the 20px section gap between the blocks', () => {
		expect(rulesFor('.cn-look-board .cn-index-page:not(.cn-look-nextcloud *)')).toContain('var(--cn-board-section-gap)')
	})
})

describe('look-board.css: the header button', () => {
	const button = rulesFor('cn-index-page__header-buttons:not(.cn-look-nextcloud *) .button-vue')
	it('is 40px, radius 8, 14px weight 600, outlined', () => {
		expect(button).toContain('height: var(--cn-board-control-height)')
		expect(button).toContain('border-radius: var(--cn-board-control-radius)')
		expect(button).toContain('font-size: 14px')
		expect(button).toContain('font-weight: 600')
		expect(button).toContain('border: 1px solid var(--color-border-dark)')
		expect(button).toContain('padding: 0 14px')
	})

	it('fills the primary button with no border and padding 0 16px', () => {
		const primary = rulesFor('cn-index-page__header-buttons:not(.cn-look-nextcloud *) .button-vue--primary')
		expect(primary).toContain('background: var(--color-primary-element)')
		expect(primary).toContain('padding: 0 16px')
		expect(primary).toContain('border: 0')
	})

	it('spaces the row by 10px on all five header types', () => {
		for (const row of ['cn-index-page__header-buttons', 'cn-detail-page__header-actions', 'cn-dashboard-page__header-actions', 'cn-settings-page__header-buttons', 'cn-admin-settings-shell__header-buttons']) {
			expect(rulesFor(`.${row}:not(.cn-look-nextcloud *) {`) + rulesFor(`.${row}:not(.cn-look-nextcloud *),`)).toContain('gap: 10px')
		}
	})

	it('uses Nextcloud colour variables only', () => {
		expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
	})
})

describe('look-board.css: the navigation', () => {
	it('is 264px wide with 42px entries, 12px captions and the tonal active entry', () => {
		expect(rulesFor('.app-navigation[data-testid="cn-nav"] {')).toContain('width: 264px')
		expect(rulesFor('.app-navigation--closed[data-testid="cn-nav"]')).toContain('-264px')
		expect(rulesFor('.app-navigation-entry-link {')).toContain('padding: 0 10px')
		expect(rulesFor('.app-navigation-entry {')).toContain('min-height: 42px')
		const caption = rulesFor('.app-navigation-caption')
		expect(caption).toContain('font-size: 12px')
		expect(caption).toContain('text-transform: uppercase')
		expect(caption).toContain('letter-spacing: 0.06em')
		expect(rulesFor('.app-navigation-entry.active')).toContain('var(--color-primary-element-light)')
	})

	it('draws counts as 22px pills, red for attention', () => {
		const pill = rulesFor('.cn-app-nav__count {')
		expect(pill).toContain('height: 22px')
		expect(pill).toContain('border-radius: 11px')
		expect(rulesFor('.cn-app-nav__count--attention')).toContain('var(--color-error)')
	})

	it('orders Help before Advanced and pushes the card down', () => {
		expect(rulesFor('.cn-app-nav__footer-list')).toContain('order: 1')
		expect(rulesFor('[data-testid="cn-nav-settings"]')).toContain('order: 2')
		expect(rulesFor('.cn-app-nav__card {')).toContain('margin: auto 0 0')
	})

	it('draws one line between the navigation and the content, not NcContent\'s second one', () => {
		expect(rulesFor('~ .app-content.app-content')).toContain('border-inline-start: none')
	})
})
