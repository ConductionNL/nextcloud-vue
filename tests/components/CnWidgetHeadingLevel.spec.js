/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Widget titles follow the page's heading outline: h2 directly under a page's
 * h1, one level deeper inside a titled widget or a section. The title keeps
 * its class, so its look does not change (WCAG 1.3.1, axe heading-order).
 * The board look only: the Nextcloud look's page title is an h2 and its
 * widget titles stay h3.
 */

import { mount } from '@vue/test-utils'
import { defineComponent, h, provide } from 'vue'

jest.mock('@nextcloud/event-bus', () => ({
	emit: jest.fn(),
	subscribe: jest.fn(),
	unsubscribe: jest.fn(),
}))

import CnSectionsWidget from '../../src/components/CnSectionsWidget/CnSectionsWidget.vue'
import CnWidgetWrapper from '../../src/components/CnWidgetWrapper/CnWidgetWrapper.vue'
import { HEADING_LEVEL, headingTag } from '../../src/utils/headingLevel.js'

const stubs = { NcActions: true, NcActionButton: true, NcActionLink: true, CnDetailWidgetHost: true }

function underPage(level, render, look = 'board') {
	return defineComponent({
		setup() {
			provide(HEADING_LEVEL, level)
			provide('cnLook', look)
			return () => render()
		},
	})
}

function mountTree(Comp) {
	return mount(Comp, { global: { stubs, mocks: { $route: { name: 'Page' } } } })
}

describe('headingTag', () => {
	it('clamps to h2..h6 and defaults to h3', () => {
		expect(headingTag(undefined)).toBe('h3')
		expect(headingTag(1)).toBe('h2')
		expect(headingTag(9)).toBe('h6')
		expect(headingTag(() => 4)).toBe('h4')
	})
})

describe('CnWidgetWrapper heading level', () => {
	it('stays h3 outside any host', () => {
		const w = mount(CnWidgetWrapper, { props: { title: 'Zaken', showTitle: true }, global: { stubs, mocks: { $route: {} } } })
		expect(w.find('.cn-widget-wrapper__title').element.tagName).toBe('H3')
	})

	it('is h2 directly on a page that provides level 2, with the same class', () => {
		const w = mountTree(underPage(2, () => h(CnWidgetWrapper, { title: 'Zaken', showTitle: true })))
		const title = w.find('.cn-widget-wrapper__title')
		expect(title.element.tagName).toBe('H2')
		expect(title.classes()).toContain('cn-widget-wrapper__title')
	})

	it('keeps h3 in the Nextcloud look', () => {
		const w = mountTree(underPage(2, () => h(CnWidgetWrapper, { title: 'Zaken', showTitle: true }), 'nextcloud'))
		expect(w.find('.cn-widget-wrapper__title').element.tagName).toBe('H3')
	})

	it('follows a level given as a function', () => {
		const w = mountTree(underPage(() => 3, () => h(CnWidgetWrapper, { title: 'Zaken', showTitle: true })))
		expect(w.find('.cn-widget-wrapper__title').element.tagName).toBe('H3')
	})

	it('puts a widget inside a titled widget one level deeper', () => {
		const w = mountTree(underPage(2, () => h(CnWidgetWrapper, { title: 'Groep', showTitle: true }, {
			default: () => h(CnWidgetWrapper, { title: 'Binnen', showTitle: true }),
		})))
		const tags = w.findAll('.cn-widget-wrapper__title').map((t) => t.element.tagName)
		expect(tags).toEqual(['H2', 'H3'])
	})

	it('does not deepen inside a widget that shows no title', () => {
		const w = mountTree(underPage(2, () => h(CnWidgetWrapper, { title: 'Groep', showTitle: false }, {
			default: () => h(CnWidgetWrapper, { title: 'Binnen', showTitle: true }),
		})))
		const tags = w.findAll('.cn-widget-wrapper__title').map((t) => t.element.tagName)
		expect(tags).toEqual(['H2'])
	})
})

describe('CnSectionsWidget heading level', () => {
	it('draws section headings at the provided level, same class', () => {
		const w = mountTree(underPage(3, () => h(CnSectionsWidget, {
			content: { sections: [{ key: 'a', title: 'Eerste', widget: { type: 'text' } }], hideEmpty: false },
		})))
		const heading = w.find('.cn-sections-widget__heading')
		expect(heading.exists()).toBe(true)
		expect(heading.element.tagName).toBe('H3')
	})

	it('draws section headings at h2 directly under a page', () => {
		const w = mountTree(underPage(2, () => h(CnSectionsWidget, {
			content: { sections: [{ key: 'a', title: 'Eerste', widget: { type: 'text' } }], hideEmpty: false },
		})))
		expect(w.find('.cn-sections-widget__heading').element.tagName).toBe('H2')
	})
})
