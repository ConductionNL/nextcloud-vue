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

	it('starts the card title at the left edge at 17px, not centred as NcSettingsSection draws it', () => {
		const rule = rulesFor('.cn-look-board .settings-section:not(.cn-look-nextcloud *) .settings-section__name')
		expect(rule).toMatch(/justify-content: flex-start/)
		expect(rule).toMatch(/text-align: start/)
		expect(rule).toMatch(/font-size: 17px/)
	})

	/**
	 * @spec openspec/changes/board-settings-card-spacing/specs/settings-board-look/spec.md#requirement-a-board-admin-settings-card-spaces-its-title-and-description-as-the-board-does
	 */
	it('gives a shell card the board padding, its description 4px under the title, and a note card no margin', () => {
		const card = '.cn-look-board.cn-admin-settings-shell:not(.cn-look-nextcloud *) > .settings-section'
		const wrapped = '.cn-look-board .cn-admin-settings-shell:not(.cn-look-nextcloud *) > :not(.settings-section):has(> .settings-section) > .settings-section'
		for (const section of [card, wrapped]) {
			expect(rulesFor(section)).toMatch(/padding: 20px 22px/)
			expect(rulesFor(`${section} > .settings-section__desc`)).toMatch(/margin-top: -10px/)
			expect(rulesFor(`${section} > .notecard`)).toMatch(/margin-block: 0/)
		}
	})

	/**
	 * @spec openspec/changes/version-card-dutch-and-header/specs/settings-board-look/spec.md#requirement-no-header-button-covers-a-card-title
	 */
	it('puts header actions in a grid row beside the title, not absolutely over it', () => {
		const section = '.cn-look-board .settings-section:not(.cn-look-nextcloud *):has(> .cn-settings-section__actions)'
		expect(rulesFor(section)).toMatch(/display: grid !important/)
		expect(rulesFor(section)).toMatch(/grid-template-columns: minmax\(0, 1fr\) auto/)
		expect(rulesFor(`${section} > .settings-section__name`)).toMatch(/grid-column: 1;/)
		const actions = rulesFor('.cn-look-board .settings-section:not(.cn-look-nextcloud *) > .cn-settings-section__actions')
		expect(actions).toMatch(/position: static/)
		expect(actions).toMatch(/grid-column: 2/)
		expect(css).not.toMatch(/cn-settings-section__actions[^{]*\{[^}]*position: absolute/)
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
