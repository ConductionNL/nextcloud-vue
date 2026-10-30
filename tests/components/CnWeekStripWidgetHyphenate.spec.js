/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnWeekStripWidget: a long one-word title in a narrow day breaks at a
 * syllable with a hyphen, in the language of the page or of `content.lang`.
 *
 * @spec openspec/changes/week-strip-titles-hyphenate/specs/week-strip-titles-hyphenate/spec.md#requirement-a-week-strip-item-hyphenates-its-words
 */
import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnWeekStripWidget from '../../src/components/CnWeekStripWidget/CnWeekStripWidget.vue'

const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnWeekStripWidget/CnWeekStripWidget.vue'), 'utf8')
const style = source.slice(source.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of the rule with this exact selector.
 *
 * @param {string} selector The selector.
 * @return {string} The declarations, or ''.
 */
function bodyOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(style))) {
		if (m[1].trim() === selector) {
			return m[2]
		}
	}
	return ''
}

const NOW = new Date(2026, 9, 7, 10, 0)
const ITEMS = { items: [{ title: 'Parkeervergunningen binnenstad', meta: '2026-4837', date: '2026-10-05' }] }

describe('CnWeekStripWidget: hyphenated titles', () => {
	it('hyphenates the title and the meta, and breaks anywhere only as a last resort', () => {
		for (const selector of ['.cn-week-strip__title', '.cn-week-strip__meta']) {
			const body = bodyOf(selector)
			expect(body).toMatch(/hyphens: auto;/)
			expect(body).toMatch(/-webkit-hyphens: auto;/)
			expect(body).toMatch(/overflow-wrap: anywhere;/)
		}
	})

	it('takes the page language when the content names none', () => {
		const wrapper = mount(CnWeekStripWidget, { propsData: { content: ITEMS, now: NOW } })
		expect(wrapper.find('.cn-week-strip').attributes('lang')).toBeUndefined()
	})

	it('sets content.lang on the strip, so the words hyphenate in that language', () => {
		const wrapper = mount(CnWeekStripWidget, { propsData: { content: { ...ITEMS, lang: 'nl' }, now: NOW } })
		expect(wrapper.find('.cn-week-strip').attributes('lang')).toBe('nl')
	})

	it('ignores a lang that is not a language tag', () => {
		const wrapper = mount(CnWeekStripWidget, { propsData: { content: { ...ITEMS, lang: 'nl"><x' }, now: NOW } })
		expect(wrapper.find('.cn-week-strip').attributes('lang')).toBeUndefined()
	})
})
