/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `card: true` on a body section draws it in the widget card; without it the
 * section stays bare, for components that draw their own card.
 */

import { mount } from '@vue/test-utils'
import { h } from 'vue'
import CnBodySections from '../../src/components/CnBodySections/CnBodySections.vue'

const Section = { name: 'Section', render: () => h('div', 'content') }

function mountSections(sections) {
	return mount(CnBodySections, {
		props: { sections },
		global: { provide: { cnRegistry: { Section: { kind: 'section', component: Section } } } },
	})
}

describe('CnBodySections card', () => {
	it('draws a section in a card when card is set', () => {
		const w = mountSections([{ id: 'a', component: 'Section', title: 'A', card: true }])

		expect(w.find('[data-section-id="a"]').classes()).toContain('cn-body-sections__section--card')
	})

	it('leaves a section bare by default', () => {
		const w = mountSections([{ id: 'a', component: 'Section', title: 'A' }])

		expect(w.find('[data-section-id="a"]').classes()).not.toContain('cn-body-sections__section--card')
	})
})
