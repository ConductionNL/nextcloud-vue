/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board stylesheet is a contract the screens set: every rule is scoped
 * under .cn-look-board, and the frame, the header button and the navigation
 * carry the pixel values of the spec. jsdom draws no layout, so the values are
 * read from the stylesheet text.
 *
 * @spec openspec/changes/screens-chrome-parity/specs/app-look/spec.md#requirement-the-content-spans-the-content-area
 * @spec openspec/changes/screens-chrome-parity/specs/app-look/spec.md#requirement-header-buttons-share-one-board-button
 * @spec openspec/changes/screens-one-scroller-parity/specs/app-look/spec.md#requirement-the-content-spans-the-content-area
 * @spec openspec/changes/screens-one-scroller-parity/specs/app-look/spec.md#requirement-one-scrollbar-at-the-window-edge
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

	it('lets the content span the whole content area: no width cap', () => {
		expect(rulesFor('.cn-look-board {')).toContain('--cn-board-content-max-width: none')
		expect(css).not.toMatch(/1240px/)
	})

	it('scrolls a dashboard with the content area instead of inside the page', () => {
		const dashboard = rulesFor('.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) {')
		expect(dashboard).toContain('height: auto')
		expect(dashboard).toContain('overflow-y: visible')
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

	it('draws no scrollbar of its own: no track beside the primary action, none on the list', () => {
		const body = rulesFor('.app-navigation__body:not(.app-navigation__body--no-list) {')
		expect(body).toContain('overflow: visible')
		expect(body).toContain('flex-shrink: 0')
		expect(rulesFor('.app-navigation__list {')).toContain('scrollbar-width: none')
		expect(rulesFor('.app-navigation__body--no-list {')).toContain('scrollbar-width: none')
		expect(rulesFor('.app-navigation__list::-webkit-scrollbar')).toContain('display: none')
	})

	it('draws counts as 22px pills, red for attention', () => {
		const pill = rulesFor('.cn-app-nav__count {')
		expect(pill).toContain('height: 22px')
		expect(pill).toContain('border-radius: 11px')
		expect(rulesFor('.cn-app-nav__count--attention')).toContain('var(--color-error)')
	})

	it('writes the attention count in white, not in the error text colour', () => {
		const attention = rulesFor('.cn-app-nav__count--attention')
		expect(attention).toContain('color: var(--color-primary-element-text)')
		expect(attention).not.toContain('--color-error-text')
	})

	it('puts the tonal primary on the open entry at !important, over NcAppNavigationItem\'s 16% mix, hovered too', () => {
		expect(rulesFor('.app-navigation-entry.active {')).toContain('background-color: var(--color-primary-element-light) !important')
		expect(rulesFor('.app-navigation-entry.active:hover {')).toContain('background-color: var(--color-primary-element-light) !important')
		expect(rulesFor('.app-navigation-entry.active .app-navigation-entry-link')).toContain('background: var(--color-primary-element-light)')
	})

	it('puts a caption\'s edit pencil on the caption line at its end, a 28px round button', () => {
		expect(rulesFor('.app-navigation-caption:has(.app-navigation-caption__actions) {')).toContain('position: relative')
		const actions = rulesFor('.app-navigation-caption .app-navigation-caption__actions {')
		expect(actions).toContain('position: absolute')
		expect(actions).toContain('inset-inline-end: 4px')
		const button = rulesFor('.app-navigation-caption .app-navigation-caption__actions .button-vue {')
		expect(button).toContain('width: 28px')
		expect(button).toContain('border-radius: 14px')
	})

	it('scopes the !important wash to the board look', () => {
		const important = []
		const re = /([^{}]+)\{([^{}]*)\}/g
		let m
		while ((m = re.exec(css))) {
			if (/\.app-navigation-entry\.active/.test(m[1]) && /!important/.test(m[2])) {
				important.push(...m[1].split(',').map((s) => s.trim()))
			}
		}
		expect(important.length).toBeGreaterThan(0)
		for (const selector of important) {
			expect(selector.startsWith('.cn-look-board ')).toBe(true)
		}
	})

	it('orders Help before Advanced and pushes the card down', () => {
		expect(rulesFor('.cn-app-nav__footer-list')).toContain('order: 1')
		expect(rulesFor('[data-testid="cn-nav-settings"]')).toContain('order: 2')
		expect(rulesFor('.cn-app-nav__card {')).toContain('margin: auto 0 0')
	})

	it('keeps the board rhythm: no empty search slot, entries 2px apart, 20px captions at 12px', () => {
		expect(rulesFor('.app-navigation__search:empty')).toContain('display: none')
		expect(rulesFor('.app-navigation__list {')).toMatch(/margin: 0;[\s\S]*gap: 2px/)
		expect(rulesFor('.app-navigation-caption:not(:first-child)')).toContain('margin-top: 18px')
		expect(rulesFor('.app-navigation-caption .app-navigation-caption__name')).toMatch(/font-size: inherit[\s\S]*line-height: normal/)
	})

	it('draws Help and Advanced as two 40px rows at weight 400, 2px apart', () => {
		expect(rulesFor('.cn-app-nav__footer-list .app-navigation-entry {')).toContain('font-weight: 400')
		expect(rulesFor('.cn-app-nav__footer-list + [data-testid="cn-nav-settings"]')).toContain('margin-top: -18px')
		expect(rulesFor('[data-testid="cn-nav-settings"] > :first-child .button-vue')).toMatch(/height: 40px[\s\S]*font-weight: 400/)
	})

	it('draws one line between the navigation and the content, not NcContent\'s second one', () => {
		expect(rulesFor('~ .app-content.app-content')).toContain('border-inline-start: none')
	})
})
