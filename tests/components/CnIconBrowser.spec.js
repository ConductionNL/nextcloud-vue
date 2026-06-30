// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

import { mount } from '@vue/test-utils'
import CnIconBrowser from '../../src/components/CnIconBrowser/CnIconBrowser.vue'
import CnIconBrowserPanel from '../../src/components/CnIconBrowser/CnIconBrowserPanel.vue'
import {
	mdiCatalogue,
	vmdiCatalogue,
	findIconByValue,
} from '../../src/components/CnIconBrowser/iconCatalogue.js'
import { fuzzyScore, fuzzyFilter, normalizeQuery } from '../../src/components/CnIconBrowser/fuzzy.js'

const mocks = { t: (_app, s, params) => (params ? s.replace(/\{(\w+)\}/g, (_, k) => params[k]) : s) }

const FAKE_MDI = {
	mdiStar: 'M1 2 3',
	mdiAccountCircle: 'M4 5 6',
	mdiCalendarRange: 'M7 8 9',
	version: '7.4.47',
	mdiBadValue: 42,
}

function fakeVmdiContext() {
	const modules = {
		'./Account.vue': { default: { name: 'AccountIcon', render: (h) => h('span', 'A') } },
		'./CalendarRange.vue': { default: { name: 'CalendarRangeIcon', render: (h) => h('span', 'C') } },
	}
	const ctx = (file) => modules[file]
	ctx.keys = () => Object.keys(modules)
	return ctx
}

describe('iconCatalogue — mdiCatalogue', () => {
	it('maps the @mdi/js namespace to path-based entries, filtering noise', () => {
		const cat = mdiCatalogue(FAKE_MDI)
		expect(cat.map((c) => c.key)).toEqual(['mdiAccountCircle', 'mdiCalendarRange', 'mdiStar'])
		const account = cat[0]
		expect(account.label).toBe('Account Circle')
		expect(account.value).toBe('M4 5 6')
		expect(account.path).toBe('M4 5 6')
		expect(account.component).toBeUndefined()
	})
	it('tolerates an empty/missing namespace', () => {
		expect(mdiCatalogue()).toEqual([])
		expect(mdiCatalogue({})).toEqual([])
	})
})

describe('iconCatalogue — vmdiCatalogue', () => {
	it('maps a require-context to component-based entries that emit the name', () => {
		const cat = vmdiCatalogue(fakeVmdiContext())
		expect(cat.map((c) => c.key)).toEqual(['Account', 'CalendarRange'])
		expect(cat[1].label).toBe('Calendar Range')
		expect(cat[1].value).toBe('CalendarRange')
		expect(cat[0].component).toBeTruthy()
		expect(cat[0].path).toBeUndefined()
	})
})

describe('iconCatalogue — findIconByValue', () => {
	it('finds an entry by its emitted value', () => {
		const cat = mdiCatalogue(FAKE_MDI)
		expect(findIconByValue(cat, 'M1 2 3').key).toBe('mdiStar')
		expect(findIconByValue(cat, 'nope')).toBeNull()
		expect(findIconByValue(cat, '')).toBeNull()
		expect(findIconByValue(cat, null)).toBeNull()
	})
})

describe('fuzzy matcher', () => {
	it('normalizes away separators and case', () => {
		expect(normalizeQuery('Calendar Range')).toBe('calendarrange')
		expect(normalizeQuery('account-circle')).toBe('accountcircle')
	})
	it('matches a label across its word boundary without a space', () => {
		expect(fuzzyScore('calendarrange', 'Calendar Range')).toBeGreaterThan(0)
	})
	it('matches an in-order subsequence and rejects out-of-order', () => {
		expect(fuzzyScore('calrng', 'Calendar Range')).toBeGreaterThan(0)
		expect(fuzzyScore('rangecal', 'Calendar Range')).toBe(-1)
	})
	it('ranks a tighter (prefix) match above a looser one', () => {
		const icons = [
			{ key: 'a', label: 'Account Multiple' },
			{ key: 'b', label: 'Account' },
		]
		expect(fuzzyFilter(icons, 'account').map((i) => i.key)).toEqual(['b', 'a'])
	})
})

describe('CnIconBrowserPanel — icons grid', () => {
	const icons = mdiCatalogue(FAKE_MDI)

	it('renders one cell per catalogue entry and emits input + pick', async () => {
		const w = mount(CnIconBrowserPanel, { propsData: { value: null, icons }, mocks })
		const cells = w.findAll('.cn-icon-browser-panel__cell')
		expect(cells.length).toBe(icons.length)
		await cells.at(0).trigger('click')
		expect(w.emitted('input')[0]).toEqual([icons[0].value])
		expect(w.emitted('pick')).toBeTruthy()
	})
	it('shows the empty message when icons is empty', () => {
		const w = mount(CnIconBrowserPanel, { propsData: { value: null, icons: [] }, mocks })
		expect(w.find('.cn-icon-browser-panel__empty').text()).toBe('No icons available.')
	})
	it('caps the rendered grid at maxResults', () => {
		const w = mount(CnIconBrowserPanel, { propsData: { value: null, icons, maxResults: 2 }, mocks })
		expect(w.findAll('.cn-icon-browser-panel__cell').length).toBe(2)
		expect(w.find('.cn-icon-browser-panel__hint').exists()).toBe(true)
	})
	it('fuzzy-filters by the search query (incl. no-space and subsequence)', async () => {
		const w = mount(CnIconBrowserPanel, { propsData: { value: null, icons }, mocks })
		w.setData({ debouncedQuery: 'calendarrange' })
		await w.vm.$nextTick()
		expect(w.vm.visibleIcons.map((i) => i.key)).toEqual(['mdiCalendarRange'])
		w.setData({ debouncedQuery: 'calrng' })
		await w.vm.$nextTick()
		expect(w.vm.visibleIcons.map((i) => i.key)).toContain('mdiCalendarRange')
	})
	it('highlights the active cell matching the value', () => {
		const w = mount(CnIconBrowserPanel, { propsData: { value: 'M1 2 3', icons }, mocks })
		expect(w.find('.cn-icon-browser-panel__cell--active').exists()).toBe(true)
	})
	it('renders a <component> cell and emits the name for a component catalogue', async () => {
		const compIcons = vmdiCatalogue(fakeVmdiContext())
		const w = mount(CnIconBrowserPanel, { propsData: { value: null, icons: compIcons }, mocks })
		const cells = w.findAll('.cn-icon-browser-panel__cell')
		expect(cells.length).toBe(compIcons.length)
		await cells.at(0).trigger('click')
		expect(w.emitted('input')[0]).toEqual(['Account'])
	})
})

describe('CnIconBrowserPanel — custom tab', () => {
	const icons = mdiCatalogue(FAKE_MDI)

	it('hides the Custom tab when no urlIcons, no uploadFn, no allowUrl', () => {
		const w = mount(CnIconBrowserPanel, { propsData: { value: null, icons }, mocks })
		expect(w.find('.cn-icon-browser-panel__tabs').exists()).toBe(false)
	})
	it('emits input + pick when a curated url icon is picked', async () => {
		const urlIcons = [{ label: 'Brand', url: '/apps/x/brand.svg' }]
		const w = mount(CnIconBrowserPanel, { propsData: { value: null, icons, urlIcons }, mocks })
		w.setData({ mode: 'custom' })
		await w.vm.$nextTick()
		await w.find('.cn-icon-browser-panel__custom .cn-icon-browser-panel__cell').trigger('click')
		expect(w.emitted('input')[0]).toEqual(['/apps/x/brand.svg'])
		expect(w.emitted('pick')).toBeTruthy()
	})
	it('shows the upload control only when uploadFn is provided', () => {
		const without = mount(CnIconBrowserPanel, { propsData: { value: null, icons, urlIcons: [{ label: 'B', url: '/b.svg' }] }, mocks })
		expect(without.find('.cn-icon-browser-panel__upload-label').exists()).toBe(false)
		const withFn = mount(CnIconBrowserPanel, { propsData: { value: null, icons, uploadFn: async () => ({ url: '/x' }) }, mocks })
		withFn.setData({ mode: 'custom' })
		expect(withFn.find('.cn-icon-browser-panel__upload-label').exists()).toBe(true)
	})
	it('emits the typed URL via input WITHOUT a pick (so the popover stays open)', async () => {
		const w = mount(CnIconBrowserPanel, { propsData: { value: null, icons, allowUrl: true }, mocks })
		w.setData({ mode: 'custom' })
		await w.vm.$nextTick()
		const input = w.find('.cn-icon-browser-panel__url-input')
		input.element.value = 'https://example.com/icon.svg'
		await input.trigger('input')
		expect(w.emitted('input').pop()).toEqual(['https://example.com/icon.svg'])
		expect(w.emitted('pick')).toBeFalsy()
	})
	it('seeds the URL input from a URL value', () => {
		const w = mount(CnIconBrowserPanel, { propsData: { value: '/seed.svg', icons, allowUrl: true }, mocks })
		w.setData({ mode: 'custom' })
		expect(w.find('.cn-icon-browser-panel__url-input').element.value).toBe('/seed.svg')
	})
})

describe('CnIconBrowser — wrapper', () => {
	const icons = mdiCatalogue(FAKE_MDI)

	it('inline mode renders the panel directly with no trigger', () => {
		const w = mount(CnIconBrowser, { propsData: { value: null, icons, inline: true }, mocks })
		expect(w.findComponent(CnIconBrowserPanel).exists()).toBe(true)
		expect(w.find('.cn-icon-browser__trigger').exists()).toBe(false)
	})
	it('popup mode renders a trigger button', () => {
		const w = mount(CnIconBrowser, { propsData: { value: null, icons }, mocks })
		expect(w.find('.cn-icon-browser__trigger').exists()).toBe(true)
	})
	it('renders the field label when provided', () => {
		const w = mount(CnIconBrowser, { propsData: { value: null, icons, inline: true, label: 'Icon' }, mocks })
		expect(w.find('.cn-icon-browser__field-label').text()).toBe('Icon')
	})
	it('associates the field label with the trigger button (for/id + aria-labelledby)', () => {
		const w = mount(CnIconBrowser, { propsData: { value: null, icons, label: 'Icon' }, mocks })
		const label = w.find('.cn-icon-browser__field-label')
		const button = w.find('.cn-icon-browser__trigger')
		expect(label.attributes('for')).toBe(button.attributes('id'))
		expect(button.attributes('aria-labelledby')).toBe(label.attributes('id'))
		// aria-labelledby supplies the accessible name, so the generic aria-label is dropped.
		expect(button.attributes('aria-label')).toBeUndefined()
	})
	it('falls back to an aria-label on the trigger when no field label is set', () => {
		const w = mount(CnIconBrowser, { propsData: { value: null, icons }, mocks })
		const button = w.find('.cn-icon-browser__trigger')
		expect(button.attributes('aria-label')).toBe('Select icon')
		expect(button.attributes('aria-labelledby')).toBeUndefined()
	})
	it('names the popover dialog so it has an accessible name', async () => {
		const w = mount(CnIconBrowser, { propsData: { value: null, icons }, mocks })
		await w.setData({ open: true })
		const dialog = w.find('[role="dialog"]')
		expect(dialog.exists()).toBe(true)
		expect(dialog.attributes('aria-label')).toBe('Icon browser')
	})
	it('forwards the panel input event as its own', () => {
		const w = mount(CnIconBrowser, { propsData: { value: null, icons, inline: true }, mocks })
		w.findComponent(CnIconBrowserPanel).vm.$emit('input', 'M1 2 3')
		expect(w.emitted('input')[0]).toEqual(['M1 2 3'])
	})
})

describe('CnIconBrowser — catalogue resolution', () => {
	const icons = mdiCatalogue(FAKE_MDI)

	it('prefers the icons prop', () => {
		const w = mount(CnIconBrowser, {
			propsData: { value: null, inline: true, icons: icons.slice(0, 1) },
			provide: { cnIconCatalogue: icons },
			mocks,
		})
		expect(w.findComponent(CnIconBrowserPanel).props('icons').length).toBe(1)
	})
	it('uses a provided cnIconCatalogue when no icons prop is passed', () => {
		const w = mount(CnIconBrowser, {
			propsData: { value: null, inline: true },
			provide: { cnIconCatalogue: icons },
			mocks,
		})
		expect(w.findComponent(CnIconBrowserPanel).props('icons')).toBe(icons)
	})
	it('falls back to the union curated set (dashboard + widget) when nothing is provided', () => {
		const w = mount(CnIconBrowser, { propsData: { value: null, inline: true }, mocks })
		const keys = w.findComponent(CnIconBrowserPanel).props('icons').map((i) => i.key)
		expect(keys.length).toBeGreaterThan(0)
		// Dashboard-registry icon AND a widget-only icon (e.g. the Delta/Stat default).
		expect(keys).toContain('ViewDashboard')
		expect(keys).toContain('Cash')
	})
})
