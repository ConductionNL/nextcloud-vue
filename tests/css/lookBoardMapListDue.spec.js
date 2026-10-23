/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A map list row's date in the board look: a 14px clock before "1 nov", 13px
 * semibold in the soft text colour (DqZakenKaart). jsdom draws no layout, so
 * the template and the rules are read as text.
 *
 * @spec openspec/changes/board-map-list-due-clock/specs/board-map-list-due-clock/spec.md#requirement-a-board-map-list-rows-date-carries-a-clock
 */
const fs = require('fs')
const path = require('path')

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnIndexPage/CnIndexPage.vue'), 'utf8')
const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('the board map list row date', () => {
	it('draws the clock before the date in the board look only', () => {
		const due = sfc.match(/<span v-if="item\.due" class="cn-index-page__map-due"[^>]*>([\s\S]*?)<\/span>/)
		expect(due).not.toBeNull()
		expect(due[1]).toMatch(/<ClockOutline v-if="isBoardLook" :size="14"/)
		expect(sfc).toMatch(/import ClockOutline from 'vue-material-design-icons\/ClockOutline\.vue'/)
	})

	it('is 13px semibold in the soft text colour, the clock 4px before it', () => {
		const rule = css.match(/\.cn-look-board \.cn-index-page__map-due:not\(\.cn-look-nextcloud \*\) \{([^}]*)\}/)
		expect(rule).not.toBeNull()
		expect(rule[1]).toContain('display: inline-flex;')
		expect(rule[1]).toContain('gap: 4px;')
		expect(rule[1]).toContain('font-weight: 600;')
		expect(rule[1]).toContain('color: var(--cn-board-text-soft);')
	})
})
