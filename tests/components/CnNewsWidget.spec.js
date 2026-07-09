/**
 * Tests for the migrated `news` dashboard widget (cn-widget-library Wave 1).
 *
 * Covers: renderer renders its config (empty-state + layout class), the form
 * edits the content shape and validates feed URLs, and the registry entry is
 * present after importing the renderer's self-registering index.
 */

import { mount } from '@vue/test-utils'
import CnNewsWidget from '@/components/CnNewsWidget/CnNewsWidget.vue'
import CnNewsWidgetForm from '@/components/CnNewsWidgetForm/CnNewsWidgetForm.vue'

describe('CnNewsWidget renderer', () => {
	it('renders the empty state with no items', () => {
		const wrapper = mount(CnNewsWidget, { propsData: { content: { feedUrls: [] } } })
		expect(wrapper.find('.cn-news-widget__state--empty').exists()).toBe(true)
	})

	it('applies the layout class from config', () => {
		const wrapper = mount(CnNewsWidget, { propsData: { content: { layout: 'grid' } } })
		expect(wrapper.classes()).toContain('cn-news-widget--grid')
	})
})

describe('CnNewsWidgetForm', () => {
	it('adds a feed URL and emits the assembled shape', () => {
		const wrapper = mount(CnNewsWidgetForm)
		wrapper.vm.addFeedUrl()
		wrapper.vm.updateFeedUrl(0, 'https://example.com/feed.xml')
		const events = wrapper.emitted('update:content')
		const payload = events[events.length - 1][0]
		expect(payload.feedUrls).toEqual(['https://example.com/feed.xml'])
		expect(payload).toMatchObject({
			layout: 'list',
			itemLimit: 10,
			showThumbnails: true,
			showSummary: true,
			summaryMaxChars: 200,
			dateFormat: 'relative',
			metadataFilter: null,
		})
	})

	it('validate rejects a non-http feed URL', () => {
		const wrapper = mount(CnNewsWidgetForm)
		wrapper.vm.addFeedUrl()
		wrapper.vm.updateFeedUrl(0, 'ftp://nope')
		expect(wrapper.vm.validate().length).toBeGreaterThan(0)
	})
})

describe('news registry registration', () => {
	it('registers the news type after importing the renderer index', () => {
		let mod
		jest.isolateModules(() => {
			require('@/components/CnNewsWidget/index.js')
			mod = require('@/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		})
		const entry = mod.getWidgetTypeEntry('news')
		expect(entry).not.toBeNull()
		expect(entry.renderer).toBeTruthy()
		expect(entry.form).toBeTruthy()
		expect(entry.defaultContent).toMatchObject({
			feedUrls: [],
			layout: 'list',
			itemLimit: 10,
			showThumbnails: true,
			showSummary: true,
			summaryMaxChars: 200,
			dateFormat: 'relative',
			metadataFilter: null,
		})
		expect(mod.listWidgetTypes()).toContain('news')
	})
})
