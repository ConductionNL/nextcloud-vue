/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The admin settings board look in the stylesheet: a shell carrying the board
 * class itself gets the frame, grid and cards, and a wide section loses
 * NcSettingsSection's 900px cap (screens-admin-settings-board-header). jsdom
 * draws no layout, so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/screens-admin-settings-board-header/specs/settings-board-look/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function rulesFor(selector) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('look-board.css: admin settings', () => {
	it('gives a shell carrying the board class itself the frame, the grid and the cards', () => {
		expect(rulesFor('.cn-look-board.cn-admin-settings-shell:not(.cn-look-nextcloud *)')).toMatch(/padding: var\(--cn-board-content-padding\)/)
		expect(rulesFor('.cn-look-board.cn-admin-settings-shell:not(.cn-look-nextcloud *)')).toMatch(/display: grid/)
		expect(rulesFor('.cn-look-board.cn-admin-settings-shell:not(.cn-look-nextcloud *) > .settings-section')).toMatch(/padding: 22px 24px/)
	})

	it('lifts the 900px cap of a wide section', () => {
		const rule = rulesFor('.cn-look-board .settings-section.cn-settings-section--wide:not(.cn-look-nextcloud *)')
		expect(rule).toMatch(/width: auto/)
		expect(rule).toMatch(/max-width: none/)
		expect(rulesFor('.cn-look-board .settings-section.cn-settings-section--wide:not(.cn-look-nextcloud *) .settings-section__name')).toMatch(/max-width: none/)
	})

	it('starts the card title at the left edge at 19px, not centred as NcSettingsSection draws it', () => {
		const rule = rulesFor('.cn-look-board .settings-section:not(.cn-look-nextcloud *) .settings-section__name')
		expect(rule).toMatch(/justify-content: flex-start/)
		expect(rule).toMatch(/text-align: start/)
		expect(rule).toMatch(/font-size: 19px/)
	})

	it('makes sections inside a wrapping element grid items and cards', () => {
		const wrapper = '.cn-look-board.cn-admin-settings-shell:not(.cn-look-nextcloud *) > :not(.settings-section):has(> .settings-section)'
		expect(rulesFor(wrapper)).toMatch(/display: contents/)
		expect(rulesFor('.cn-look-board .cn-admin-settings-shell:not(.cn-look-nextcloud *) > :not(.settings-section):has(> .settings-section)')).toMatch(/display: contents/)
		expect(rulesFor(`${wrapper} > .settings-section`)).toMatch(/padding: 22px 24px/)
		expect(rulesFor('.cn-look-board .cn-admin-settings-shell:not(.cn-look-nextcloud *) > :not(.settings-section):has(> .settings-section) > .settings-section')).toMatch(/background: var\(--color-main-background\)/)
	})

	it('draws the path line muted at 15px', () => {
		const rule = rulesFor('.cn-look-board .cn-admin-settings-shell__crumbs:not(.cn-look-nextcloud *)')
		expect(rule).toMatch(/font-size: 15px/)
		expect(rule).toMatch(/color: var\(--color-text-maxcontrast\)/)
	})
})
