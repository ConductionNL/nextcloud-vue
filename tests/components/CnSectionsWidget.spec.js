/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnSectionsWidget — the `sections` widget (abstract-sections-widget).
 *
 * Guarded: sections resolve inline or by sibling id (unknown ids skipped);
 * headings are translated and wait for content; a section whose widget draws
 * nothing takes no space; children get `fit: false`; `column: "side"` gives a
 * two-column layout; `cards` draws a card per section; and the type is a
 * container in the catalog, so the detail page hands it its siblings.
 */
import { mount } from '@vue/test-utils'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'

import '../../src/components/CnSectionsWidget/index.js'

const CnSectionsWidget = require('../../src/components/CnSectionsWidget/CnSectionsWidget.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

/** A host stub that renders its widget's `content.text`, or nothing. */
const HostStub = {
	name: 'CnDetailWidgetHost',
	props: ['widget', 'availableWidgets'],
	template: '<div class="host-stub"><span v-if="widget.content && widget.content.text">{{ widget.content.text }}</span></div>',
}

/**
 * Mount the widget.
 *
 * @param {object} content The content.
 * @param {object[]} [availableWidgets] Sibling definitions.
 * @return {Promise<object>} The wrapper, after the content measure ran.
 */
async function mountSections(content, availableWidgets = []) {
	const w = mount(CnSectionsWidget, {
		props: { content, availableWidgets },
		global: {
			provide: { cnTranslate: (key) => `T(${key})` },
			stubs: { CnDetailWidgetHost: HostStub },
		},
	})
	await flush()
	await w.vm.$nextTick()
	return w
}

describe('CnSectionsWidget', () => {
	it('registers as a renderer-only container type for the detail page', () => {
		const entry = getWidgetTypeEntry('sections')
		expect(entry.renderer).toBe(CnSectionsWidget)
		expect(entry.form).toBeNull()
		expect(entry.container).toBe(true)
		expect(entry.surfaces).toEqual(['detail-page'])
	})

	it('stacks inline and by-id sections in order under translated headings', async () => {
		const w = await mountSections(
			{
				sections: [
					{ title: 'Documents', widgetId: 'docs' },
					{ label: 'Folder', widget: { id: 'folder', type: 'files', content: { text: 'folder body' } } },
				],
			},
			[{ id: 'docs', type: 'object-list', content: { text: 'docs body' } }],
		)
		const sections = w.findAll('section')
		expect(sections.length).toBe(2)
		expect(sections[0].find('h3').text()).toBe('T(Documents)')
		expect(sections[0].text()).toContain('docs body')
		expect(sections[1].find('h3').text()).toBe('T(Folder)')
		expect(sections[0].attributes('aria-labelledby')).toBe(sections[0].find('h3').attributes('id'))
	})

	it('skips a section whose widgetId names nothing, with a warning', async () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const w = await mountSections({ sections: [{ title: 'Ghost', widgetId: 'nope' }, { title: 'Real', widget: { type: 'text', content: { text: 'x' } } }] })
		expect(w.findAll('section').length).toBe(1)
		expect(warn).toHaveBeenCalled()
		warn.mockRestore()
	})

	it('hides the heading and the space of a section whose widget drew nothing', async () => {
		const w = await mountSections({
			sections: [
				{ key: 'empty', title: 'Instruction', widget: { type: 'custom-x', content: {} } },
				{ key: 'full', title: 'Pages', widget: { type: 'text', content: { text: 'two pages' } } },
			],
		})
		const empty = w.find('[data-testid="cn-section-empty"]')
		expect(empty.classes()).toContain('cn-sections-widget__section--empty')
		expect(empty.find('h3').exists()).toBe(false)
		// The host stays mounted so the widget can still fetch and fill.
		expect(empty.find('.host-stub').exists()).toBe(true)
		expect(w.find('[data-testid="cn-section-full"] h3').exists()).toBe(true)
	})

	it('keeps an empty section shown with hideEmpty false', async () => {
		const w = await mountSections({ hideEmpty: false, sections: [{ key: 'e', title: 'Always', widget: { type: 'custom-x' } }] })
		expect(w.find('[data-testid="cn-section-e"] h3').text()).toBe('T(Always)')
	})

	it('turns the cell budget off for stacked children unless they set fit', async () => {
		const w = await mountSections({
			sections: [
				{ key: 'a', widget: { type: 'object-list', content: { text: 'a' } } },
				{ key: 'b', widget: { type: 'object-list', content: { text: 'b', fit: true } } },
			],
		})
		const hosts = w.findAllComponents(HostStub)
		expect(hosts[0].props('widget').content.fit).toBe(false)
		expect(hosts[1].props('widget').content.fit).toBe(true)
	})

	it('draws a main and a side column when a section asks for the side, and a card per section with cards', async () => {
		const w = await mountSections({
			cards: true,
			sections: [
				{ key: 'details', title: 'Details', widget: { type: 'text', content: { text: 'form' } } },
				{ key: 'traffic', title: 'Traffic', column: 'side', widget: { type: 'text', content: { text: 'toggle' } } },
			],
		})
		expect(w.classes()).toContain('cn-sections-widget--two-column')
		expect(w.classes()).toContain('cn-sections-widget--cards')
		expect(w.find('.cn-sections-widget__column--main [data-testid="cn-section-details"]').exists()).toBe(true)
		expect(w.find('.cn-sections-widget__column--side [data-testid="cn-section-traffic"]').exists()).toBe(true)
	})

	it('draws one column when no section asks for the side', async () => {
		const w = await mountSections({ sections: [{ title: 'Only', widget: { type: 'text', content: { text: 'x' } } }] })
		expect(w.classes()).not.toContain('cn-sections-widget--two-column')
		expect(w.findAll('.cn-sections-widget__column').length).toBe(1)
	})

	it('passes the siblings on, so a nested container can resolve ids', async () => {
		const siblings = [{ id: 'x', type: 'text', content: { text: 'x' } }]
		const w = await mountSections({ sections: [{ widgetId: 'x' }] }, siblings)
		expect(w.findComponent(HostStub).props('availableWidgets')).toEqual(siblings)
	})
})
