/**
 * Tests for the migrated `text` dashboard widget (cn-widget-library Wave 1).
 *
 * Covers: renderer renders text + table modes, the form assembles the content
 * shape and validates, and the registry entry is present after importing the
 * renderer's self-registering index.
 */

import { mount } from '@vue/test-utils'
import CnTextWidget from '@/components/CnTextWidget/CnTextWidget.vue'
import CnTextWidgetForm from '@/components/CnTextWidgetForm/CnTextWidgetForm.vue'

describe('CnTextWidget renderer', () => {
	it('renders a placeholder when there is no text', () => {
		const wrapper = mount(CnTextWidget, { propsData: { content: {} } })
		expect(wrapper.find('.cn-text-widget__placeholder').exists()).toBe(true)
	})

	it('renders sanitised markdown content', () => {
		const wrapper = mount(CnTextWidget, {
			propsData: { content: { text: '**bold**', contentMode: 'markdown' } },
		})
		expect(wrapper.find('.cn-text-widget__content').html()).toContain('<strong>bold</strong>')
	})

	it('renders a table in table mode', () => {
		const content = {
			tableMode: true,
			tableData: {
				headerRow: false,
				columnAlignments: ['left'],
				rows: [[{ text: 'A', rowSpan: 1, colSpan: 1 }]],
			},
		}
		const wrapper = mount(CnTextWidget, { propsData: { content } })
		expect(wrapper.find('.cn-text-widget__table').exists()).toBe(true)
	})
})

describe('CnTextWidgetForm', () => {
	it('emits the assembled shape on a text edit', () => {
		const wrapper = mount(CnTextWidgetForm)
		wrapper.vm.updateField('text', 'hello')
		const events = wrapper.emitted('update:content')
		const payload = events[events.length - 1][0]
		expect(payload.text).toBe('hello')
		expect(payload).toMatchObject({ contentMode: 'markdown', tableMode: false })
	})

	it('validate rejects empty text', () => {
		const wrapper = mount(CnTextWidgetForm)
		expect(wrapper.vm.validate().length).toBeGreaterThan(0)
	})
})

describe('text registry registration', () => {
	it('registers the text type after importing the renderer index', () => {
		let mod
		jest.isolateModules(() => {
			require('@/components/CnTextWidget/index.js')
			mod = require('@/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		})
		const entry = mod.getWidgetTypeEntry('text')
		expect(entry).not.toBeNull()
		expect(entry.form).toBeTruthy()
		expect(entry.defaultContent.contentMode).toBe('markdown')
	})
})
