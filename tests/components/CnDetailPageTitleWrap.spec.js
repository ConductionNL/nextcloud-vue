/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A long detail title wraps to two lines before it truncates, and the full
 * text stays reachable. jsdom lays nothing out, so the stylesheet is read as
 * text: the rule is the contract.
 */
import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const css = fs.readFileSync(path.resolve(__dirname, '../../src/css/detail-page.css'), 'utf8')
const rule = (selector) => css.slice(css.indexOf(`\n${selector} {`), css.indexOf('}', css.indexOf(`\n${selector} {`)))

describe('CnDetailPage title', () => {
	const long = 'Verzoek om alle adviezen, mails en besluiten over de verlichting van het fietspad aan de Lindelaan uit 2025 en 2026'

	it('carries the full text as its title attribute', () => {
		const wrapper = mount(CnDetailPage, { propsData: { title: long } })
		const heading = wrapper.find('.cn-detail-page__title')
		expect(heading.text()).toBe(long)
		expect(heading.attributes('title')).toBe(long)
	})

	it('clamps to two lines and no longer forces one', () => {
		const title = rule('.cn-detail-page__title')
		expect(title).toContain('-webkit-line-clamp: 2')
		expect(title).toContain('overflow: hidden')
		expect(title).not.toContain('white-space: nowrap')
	})

	it('keeps the header actions on the title row, at the top', () => {
		expect(rule('.cn-detail-page__header')).toContain('align-items: flex-start')
		expect(rule('.cn-detail-page__header-actions')).toContain('flex-shrink: 0')
	})
})
