import { shallowMount } from '@vue/test-utils'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * PqKlant / PqOrganisatie Kennisbank in the board look: the placeholder a
 * manifest writes reads in the reader's language (live read "Search the
 * knowledge base"), and a suggestion is a link row with its book icon before
 * the title, not a bordered card with the icon above the link.
 *
 * @spec openspec/changes/kb-search-board-rows/specs/kb-search-board-rows/spec.md
 */
import fs from 'fs'
import path from 'path'
import CnKbSearchWidget from '../../src/components/CnKbSearchWidget/CnKbSearchWidget.vue'

const nl = { 'Search the knowledge base': 'Zoek in de kennisbank' }

function mount(content, translate) {
	return shallowMount(CnKbSearchWidget, {
		propsData: { content },
		provide: {
			cnLook: { value: 'board' },
			...(translate ? { cnTranslate: translate } : {}),
		},
	})
}

describe('CnKbSearchWidget board rows', () => {
	it('reads the manifest placeholder through the host translation', () => {
		const w = mount({ placeholder: 'Search the knowledge base' }, (key) => nl[key] || key)
		expect(w.vm.placeholder).toBe('Zoek in de kennisbank')
	})

	it('keeps the placeholder as written without a host translation', () => {
		expect(mount({ placeholder: 'Zoek een artikel' }).vm.placeholder).toBe('Zoek een artikel')
	})

	it('draws a board suggestion as a link row, the icon before the title', () => {
		const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnKbSearchWidget/CnKbSearchWidget.vue'), 'utf8')
		const css = source.split('<style')[1].replace(/\/\*[\s\S]*?\*\//g, '')
		const rule = (selector) => {
			const at = css.indexOf(selector + ' {')
			expect(at).toBeGreaterThan(-1)
			return css.slice(at, css.indexOf('}', at))
		}
		const row = rule('.cn-kb-search-widget--board .cn-kb-search-widget__suggestions .cn-kb-search-widget__result')
		expect(row).toContain('border: 0;')
		expect(row).toContain('padding: 0;')
		const link = rule('.cn-kb-search-widget--board .cn-kb-search-widget__suggestions .cn-kb-search-widget__result-title')
		expect(link).toContain('display: flex;')
		expect(link).toContain('gap: 8px;')
		expect(link).toContain('font-size: 14px;')
		expect(link).toContain('font-weight: 400;')
		expect(link).toContain('text-decoration: underline;')
	})
})
