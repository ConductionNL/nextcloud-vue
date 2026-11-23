/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnSectionsWidget card grid: `columns` lays the section cards out side by
 * side (DqDoorlooptijd "Naleving": four charts, three to a row), a side
 * column keeps its two-column layout, and `footnote` closes the group.
 *
 * @spec openspec/changes/sections-card-grid/specs/sections-card-grid/spec.md#requirement-a-sections-widget-can-lay-its-cards-out-in-columns
 * @spec openspec/changes/sections-card-grid/specs/sections-card-grid/spec.md#requirement-a-sections-widget-can-close-with-a-footnote
 */
import { mount } from '@vue/test-utils'

const CnSectionsWidget = require('../../src/components/CnSectionsWidget/CnSectionsWidget.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const HostStub = {
	name: 'CnDetailWidgetHost',
	props: ['widget', 'availableWidgets'],
	template: '<div class="host-stub"><span>{{ widget.content && widget.content.text }}</span></div>',
}

/**
 * Mount the widget.
 *
 * @param {object} content The content.
 * @return {Promise<object>} The wrapper.
 */
async function mountSections(content) {
	const w = mount(CnSectionsWidget, {
		props: { content },
		global: {
			provide: { cnTranslate: (key) => `T(${key})` },
			stubs: { CnDetailWidgetHost: HostStub },
		},
	})
	await flush()
	await w.vm.$nextTick()
	return w
}

const four = ['a', 'b', 'c', 'd'].map((id) => ({ title: id, widget: { id, type: 'text', content: { text: id } } }))

describe('CnSectionsWidget card grid', () => {
	it('lays the cards out in the columns it names', async () => {
		const w = await mountSections({ cards: true, columns: 3, sections: four })
		expect(w.classes()).toContain('cn-sections-widget--grid')
		const column = w.find('.cn-sections-widget__column')
		expect(column.attributes('style')).toContain('--cn-sections-columns: 3')
		expect(w.findAll('section').length).toBe(4)
	})

	it('stacks as before without columns, with one column or with a side column', async () => {
		for (const content of [
			{ cards: true, sections: four },
			{ cards: true, columns: 1, sections: four },
			{ cards: true, columns: 3, sections: [...four, { title: 'side', column: 'side', widget: { type: 'text', content: { text: 's' } } }] },
		]) {
			const w = await mountSections(content)
			expect(w.classes()).not.toContain('cn-sections-widget--grid')
			expect(w.find('.cn-sections-widget__column').attributes('style') || '').not.toContain('--cn-sections-columns')
		}
	})

	it('caps the columns at four', async () => {
		const w = await mountSections({ cards: true, columns: 9, sections: four })
		expect(w.find('.cn-sections-widget__column').attributes('style')).toContain('--cn-sections-columns: 4')
	})

	it('closes the group with its translated footnote', async () => {
		const w = await mountSections({ cards: true, columns: 3, sections: four, footnote: 'Click a case type' })
		const note = w.find('[data-testid="cn-sections-widget-footnote"]')
		expect(note.exists()).toBe(true)
		expect(note.text()).toBe('T(Click a case type)')
	})

	it('draws no footnote without one', async () => {
		const w = await mountSections({ cards: true, sections: four })
		expect(w.find('[data-testid="cn-sections-widget-footnote"]').exists()).toBe(false)
	})
})
