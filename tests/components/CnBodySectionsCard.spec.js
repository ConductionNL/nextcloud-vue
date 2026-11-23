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

describe('CnBodySections title', () => {
	// @spec openspec/changes/detail-page-strings-dutch/specs/detail-page-strings-dutch/spec.md#requirement-the-detail-page-speaks-the-readers-language
	it('runs a manifest-authored title through the host translate function', () => {
		const w = mount(CnBodySections, {
			props: { sections: [{ id: 'asked', component: 'Section', title: 'Asked about' }] },
			global: {
				provide: {
					cnRegistry: { Section: { kind: 'section', component: Section } },
					cnTranslate: (key) => (key === 'Asked about' ? 'Vraag over' : key),
				},
			},
		})

		expect(w.find('[data-testid="cn-body-section-title-asked"]').text()).toBe('Vraag over')
	})

	it('prints the title as written when no host translate function is provided', () => {
		const w = mountSections([{ id: 'asked', component: 'Section', title: 'Asked about' }])

		expect(w.find('[data-testid="cn-body-section-title-asked"]').text()).toBe('Asked about')
	})
})
