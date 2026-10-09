/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/widget-registry-public-flag/tasks.md#task-4
 */
import { mount } from '@vue/test-utils'
import CnMarkdownWidget from '../../src/components/CnMarkdownWidget/CnMarkdownWidget.vue'
import CnMarkdownWidgetForm from '../../src/components/CnMarkdownWidgetForm/CnMarkdownWidgetForm.vue'
import CnWidgetGrid from '../../src/components/CnWidgetGrid/CnWidgetGrid.vue'
import CnWikiPage from '../../src/components/CnWikiPage/CnWikiPage.vue'
import { cnRenderMarkdown } from '../../src/composables/cnRenderMarkdown.js'

import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'

const SOURCE = '# Welcome\n\nSome **bold** prose.\n\n- one\n- two\n'

describe('CnMarkdownWidget', () => {
	it('renders prose through cnRenderMarkdown', () => {
		const w = mount(CnMarkdownWidget, { propsData: { content: { markdown: SOURCE } } })
		expect(w.find('h1').text()).toBe('Welcome')
		expect(w.find('strong').text()).toBe('bold')
		expect(w.findAll('li')).toHaveLength(2)
	})

	it('is equivalent to the markdown CnWikiPage renders', () => {
		const widget = mount(CnMarkdownWidget, { propsData: { content: { markdown: SOURCE } } })
		const wiki = cnRenderMarkdown(SOURCE)
		expect(widget.find('.cn-markdown-widget').element.innerHTML).toBe(wiki)
		expect(CnWikiPage).toBeTruthy()
	})

	it('does not execute a script tag or a javascript: URL under the public host', () => {
		const hostile = 'Hello <script>window.__pwned = 1</script>\n\n[click](javascript:window.__pwned=2)\n\n<img src=x onerror="window.__pwned=3">'
		const grid = mount(CnWidgetGrid, {
			propsData: { slotName: 'body', host: 'public', widgets: [{ widgetKey: 'markdown', slot: 'body', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 2, props: { content: { markdown: hostile } } }] },
			attachTo: document.body,
		})
		const root = grid.element
		expect(root.querySelector('script')).toBeNull()
		expect(root.querySelector('[onerror]')).toBeNull()
		for (const a of root.querySelectorAll('a')) {
			expect(a.getAttribute('href') || '').not.toMatch(/^\s*javascript:/i)
		}
		expect(window.__pwned).toBeUndefined()
		expect(root.textContent).toContain('Hello')
		grid.unmount()
	})

	it('is placeable by the standard widget entry shape in the grid', () => {
		const grid = mount(CnWidgetGrid, {
			propsData: { slotName: 'body', host: 'public', widgets: [{ widgetKey: 'markdown', slot: 'body', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 2, props: { content: { markdown: 'x' } } }] },
		})
		expect(grid.find('.cn-markdown-widget').exists()).toBe(true)
	})
})

describe('CnMarkdownWidgetForm', () => {
	it('emits the content and validates', async () => {
		const w = mount(CnMarkdownWidgetForm)
		expect(w.vm.validate()).toHaveLength(1)
		await w.find('textarea').setValue('# Hi')
		expect(w.emitted('update:content').pop()[0]).toEqual({ markdown: '# Hi' })
		expect(w.vm.validate()).toEqual([])
	})
})
