/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnAppNav's `translateLabel: false` renders an entry's label as written, so
 * a user-authored title that equals a translation key ("Search") is not
 * swapped for its translation.
 *
 * Every entry, caption, group, child, footer and settings entry, hands its
 * label to the Nextcloud component as the `name` prop, which draws the
 * visible text and the tooltip from it. The jest stub of @nextcloud/vue
 * renders that prop as a `name` attribute, which is what these tests read.
 */
import { mount } from '@vue/test-utils'
import CnAppNav from '../../src/components/CnAppNav/CnAppNav.vue'

jest.mock('@nextcloud/capabilities', () => ({
	getCapabilities: jest.fn(() => ({})),
}))

const DICTIONARY = { Search: 'Zoeken', Dashboard: 'Overzicht' }
const translate = (key) => DICTIONARY[key] ?? key

/**
 * @param {Array<object>} menu The menu.
 * @return {object} The mounted nav.
 */
function mountMenu(menu) {
	return mount(CnAppNav, {
		global: {
			provide: { cnManifest: { version: '1.0.0', pages: [], menu }, cnTranslate: translate },
			mocks: { $route: { name: 'none', path: '/none', query: {}, params: {} } },
		},
	})
}

/**
 * @param {object} wrapper The mounted nav.
 * @param {string} testId The entry's data-testid.
 * @return {string|undefined} The label the entry was given.
 */
function nameOf(wrapper, testId) {
	const entry = wrapper.find(`[data-testid="${testId}"]`)
	expect(entry.exists()).toBe(true)
	return entry.attributes('name')
}

const menu = [
	{ id: 'caption', type: 'caption', label: 'Dashboard', translateLabel: false, order: 1 },
	{ id: 'caption-default', type: 'caption', label: 'Dashboard', order: 2 },
	{ id: 'top', label: 'Search', route: 'Top', translateLabel: false, order: 3 },
	{
		id: 'group',
		label: 'Dashboard',
		translateLabel: false,
		open: true,
		order: 4,
		children: [
			{ id: 'child', label: 'Search', route: 'Child', translateLabel: false },
			{ id: 'child-default', label: 'Search', route: 'Child2' },
		],
	},
	{ id: 'default', label: 'Search', route: 'Default', order: 5 },
	{ id: 'explicit', label: 'Search', route: 'Explicit', translateLabel: true, order: 6 },
	{ id: 'footer', label: 'Search', href: '/x', section: 'footer', translateLabel: false, order: 7 },
	{ id: 'footer-default', label: 'Search', href: '/y', section: 'footer', order: 8 },
	{ id: 'settings-caption', type: 'caption', label: 'Search', section: 'settings', translateLabel: false, order: 9 },
	{ id: 'settings', label: 'Dashboard', route: 'Settings', section: 'settings', translateLabel: false, order: 10 },
	{ id: 'settings-default', label: 'Dashboard', route: 'Settings2', section: 'settings', order: 11 },
]

describe('CnAppNav translateLabel', () => {
	it('renders the label as written on a caption, a top-level entry, a group and a child', () => {
		const wrapper = mountMenu(menu)
		expect(nameOf(wrapper, 'cn-nav-caption-caption')).toBe('Dashboard')
		expect(nameOf(wrapper, 'cn-nav-entry-top')).toBe('Search')
		expect(nameOf(wrapper, 'cn-nav-entry-group')).toBe('Dashboard')
		expect(nameOf(wrapper, 'cn-nav-entry-child')).toBe('Search')
	})

	it('renders the label as written in the footer and the settings foldout', () => {
		const wrapper = mountMenu(menu)
		expect(nameOf(wrapper, 'cn-nav-entry-footer')).toBe('Search')
		expect(nameOf(wrapper, 'cn-nav-caption-settings-caption')).toBe('Search')
		expect(nameOf(wrapper, 'cn-nav-entry-settings')).toBe('Dashboard')
	})

	it('still translates without the flag and with translateLabel: true', () => {
		const wrapper = mountMenu(menu)
		expect(nameOf(wrapper, 'cn-nav-caption-caption-default')).toBe('Overzicht')
		expect(nameOf(wrapper, 'cn-nav-entry-default')).toBe('Zoeken')
		expect(nameOf(wrapper, 'cn-nav-entry-explicit')).toBe('Zoeken')
		expect(nameOf(wrapper, 'cn-nav-entry-child-default')).toBe('Zoeken')
		expect(nameOf(wrapper, 'cn-nav-entry-footer-default')).toBe('Zoeken')
		expect(nameOf(wrapper, 'cn-nav-entry-settings-default')).toBe('Overzicht')
	})

	it('passes a verbatim label as text, never as HTML', () => {
		const wrapper = mountMenu([{ id: 'html', label: '<b>Bold</b>', route: 'Html', translateLabel: false }])
		expect(nameOf(wrapper, 'cn-nav-entry-html')).toBe('<b>Bold</b>')
		expect(wrapper.find('b').exists()).toBe(false)
	})
})
