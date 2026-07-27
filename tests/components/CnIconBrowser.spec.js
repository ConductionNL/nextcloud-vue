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
	it('exposes a single roving tab stop in the grid (first cell by default)', () => {
		const w = mount(CnIconBrowserPanel, { propsData: { value: null, icons }, mocks })
		const cells = w.findAll('.cn-icon-browser-panel__cell')
		expect(cells.at(0).attributes('tabindex')).toBe('0')
		expect(cells.at(1).attributes('tabindex')).toBe('-1')
		expect(cells.at(2).attributes('tabindex')).toBe('-1')
	})
	it('starts the roving cursor on the selected icon', () => {
		const w = mount(CnIconBrowserPanel, { propsData: { value: icons[2].value, icons }, mocks })
		const cells = w.findAll('.cn-icon-browser-panel__cell')
		expect(cells.at(2).attributes('tabindex')).toBe('0')
		expect(cells.at(0).attributes('tabindex')).toBe('-1')
	})
	it('moves the roving cursor with arrow keys and Home/End (clamped at the edges)', async () => {
		const w = mount(CnIconBrowserPanel, { propsData: { value: null, icons }, mocks, attachTo: document.body })
		const cells = w.findAll('.cn-icon-browser-panel__cell')
		await cells.at(0).trigger('keydown', { key: 'ArrowRight' })
		expect(w.vm.activeIndex).toBe(1)
		await cells.at(1).trigger('keydown', { key: 'ArrowLeft' })
		expect(w.vm.activeIndex).toBe(0)
		// ArrowLeft at the first cell clamps (stays put).
		await cells.at(0).trigger('keydown', { key: 'ArrowLeft' })
		expect(w.vm.activeIndex).toBe(0)
		await cells.at(0).trigger('keydown', { key: 'End' })
		expect(w.vm.activeIndex).toBe(icons.length - 1)
		await cells.at(icons.length - 1).trigger('keydown', { key: 'Home' })
		expect(w.vm.activeIndex).toBe(0)
		w.unmount()
	})
	it('resets the roving cursor when the filtered list changes', async () => {
		const w = mount(CnIconBrowserPanel, { propsData: { value: null, icons }, mocks })
		w.setData({ activeIndex: 2 })
		await w.vm.$nextTick()
		w.setData({ debouncedQuery: 'calendarrange' })
		await w.vm.$nextTick()
		expect(w.vm.activeIndex).toBe(0)
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
	it('exposes tablist/tab/tabpanel ARIA semantics when the Custom tab is shown', async () => {
		const w = mount(CnIconBrowserPanel, { propsData: { value: null, icons, allowUrl: true }, mocks })
		expect(w.find('[role="tablist"]').exists()).toBe(true)
		const tabs = w.findAll('[role="tab"]')
		expect(tabs.length).toBe(2)
		// Icons tab is active by default; aria-selected + roving tabindex reflect it.
		expect(tabs.at(0).attributes('aria-selected')).toBe('true')
		expect(tabs.at(0).attributes('tabindex')).toBe('0')
		expect(tabs.at(1).attributes('aria-selected')).toBe('false')
		expect(tabs.at(1).attributes('tabindex')).toBe('-1')
		// Each tab controls a tabpanel that points back at it.
		const iconsPanelId = tabs.at(0).attributes('aria-controls')
		const iconsPanel = w.find(`#${iconsPanelId}`)
		expect(iconsPanel.attributes('role')).toBe('tabpanel')
		expect(iconsPanel.attributes('aria-labelledby')).toBe(tabs.at(0).attributes('id'))
	})
	it('switches tabs with arrow keys (roving focus, activation follows focus)', async () => {
		const w = mount(CnIconBrowserPanel, { propsData: { value: null, icons, allowUrl: true }, mocks, attachTo: document.body })
		const tabs = w.findAll('[role="tab"]')
		await tabs.at(0).trigger('keydown', { key: 'ArrowRight' })
		expect(w.vm.mode).toBe('custom')
		expect(tabs.at(1).attributes('aria-selected')).toBe('true')
		await tabs.at(1).trigger('keydown', { key: 'Home' })
		expect(w.vm.mode).toBe('icons')
		w.unmount()
	})
	it('omits tab semantics when there is no Custom tab (icons panel is plain)', () => {
		const w = mount(CnIconBrowserPanel, { propsData: { value: null, icons }, mocks })
		expect(w.find('[role="tablist"]').exists()).toBe(false)
		expect(w.find('[role="tabpanel"]').exists()).toBe(false)
		expect(w.find('.cn-icon-browser-panel__icons').attributes('role')).toBeUndefined()
	})
})

describe('CnIconBrowserPanel — upload', () => {
	const icons = mdiCatalogue(FAKE_MDI)
	const flush = () => new Promise((r) => setTimeout(r, 0))
	let OrigFileReader
	let lastReader

	beforeEach(() => {
		// Mock FileReader so onload/onerror fire deterministically (jsdom's real
		// reader resolves async and can't be made to error on demand).
		OrigFileReader = global.FileReader
		lastReader = null
		global.FileReader = class {

			constructor() { lastReader = this; this.onload = null; this.onerror = null }
			readAsDataURL() { /* test fires onload/onerror manually */ }

		}
	})
	afterEach(() => {
		global.FileReader = OrigFileReader
	})

	async function selectFile(uploadFn) {
		const w = mount(CnIconBrowserPanel, { propsData: { value: null, icons, uploadFn }, mocks })
		w.setData({ mode: 'custom' })
		await w.vm.$nextTick()
		const input = w.find('.cn-icon-browser-panel__file-input')
		Object.defineProperty(input.element, 'files', {
			value: [new File(['x'], 'icon.png', { type: 'image/png' })],
			configurable: true,
		})
		await input.trigger('change')
		return w
	}

	it('emits input + pick with the returned URL on a successful upload', async () => {
		const uploadFn = jest.fn(async () => ({ url: '/uploaded/icon.png' }))
		const w = await selectFile(uploadFn)
		expect(w.vm.uploading).toBe(true)
		lastReader.onload({ target: { result: 'data:image/png;base64,AAA' } })
		await flush()
		expect(uploadFn).toHaveBeenCalledWith('data:image/png;base64,AAA')
		expect(w.emitted('input').pop()).toEqual(['/uploaded/icon.png'])
		expect(w.emitted('pick')).toBeTruthy()
		expect(w.vm.uploading).toBe(false)
		expect(w.vm.uploadError).toBe('')
	})

	it('sets uploadError and resets uploading when uploadFn rejects', async () => {
		const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
		const uploadFn = jest.fn(async () => { throw new Error('Server said no') })
		const w = await selectFile(uploadFn)
		lastReader.onload({ target: { result: 'data:image/png;base64,AAA' } })
		await flush()
		expect(w.vm.uploadError).toBe('Server said no')
		expect(w.vm.uploading).toBe(false)
		expect(w.emitted('pick')).toBeFalsy()
		consoleError.mockRestore()
	})

	it('sets uploadError when the FileReader errors', async () => {
		const uploadFn = jest.fn(async () => ({ url: '/x' }))
		const w = await selectFile(uploadFn)
		lastReader.onerror()
		await flush()
		expect(w.vm.uploadError).toBe('Failed to upload icon')
		expect(w.vm.uploading).toBe(false)
		expect(uploadFn).not.toHaveBeenCalled()
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
	it('forwards NcPopover trigger attrs (aria-haspopup/expanded) onto the default button', async () => {
		const w = mount(CnIconBrowser, { propsData: { value: null, icons }, mocks })
		const btn = () => w.find('.cn-icon-browser__trigger')
		expect(btn().attributes('aria-haspopup')).toBe('dialog')
		expect(btn().attributes('aria-expanded')).toBe('false')
		await btn().trigger('click')
		expect(btn().attributes('aria-expanded')).toBe('true')
	})
	it('opens the popover when the trigger is clicked', async () => {
		const w = mount(CnIconBrowser, { propsData: { value: null, icons }, mocks })
		expect(w.vm.open).toBe(false)
		await w.find('.cn-icon-browser__trigger').trigger('click')
		expect(w.vm.open).toBe(true)
		expect(w.find('[role="dialog"]').exists()).toBe(true)
	})
	it('closes the popover when the inner panel emits pick', async () => {
		const w = mount(CnIconBrowser, { propsData: { value: null, icons }, mocks })
		await w.setData({ open: true })
		w.findComponent(CnIconBrowserPanel).vm.$emit('pick')
		await w.vm.$nextTick()
		expect(w.vm.open).toBe(false)
	})
	it('exposes open/toggle to the trigger slot scope', async () => {
		const w = mount(CnIconBrowser, {
			propsData: { value: null, icons },
			mocks,
			scopedSlots: {
				trigger: `
					<div>
						<button class="slot-open" @click="props.open" />
						<button class="slot-toggle" @click="props.toggle" />
					</div>
				`,
			},
		})
		await w.find('.slot-open').trigger('click')
		expect(w.vm.open).toBe(true)
		// openPanel is idempotent; toggle flips it back closed.
		await w.find('.slot-toggle').trigger('click')
		expect(w.vm.open).toBe(false)
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

describe('CnIconBrowser — default NL-government url-icon groups', () => {
	it('offers the bundled NL sets when the consumer passes nothing', () => {
		// The regression this guards: widget config forms render CnIconBrowser deep
		// inside CnAddWidgetModal and cannot pass a prop, and url-icons had no
		// inject, so the NL sets could never reach a widget's icon picker.
		const w = mount(CnIconBrowser, { propsData: { value: null, inline: true }, mocks })
		const groups = w.findComponent(CnIconBrowserPanel).props('urlIconGroups')
		expect(groups.map((g) => g.key)).toEqual(['open-gemeenten', 'den-haag', 'rvo'])
	})
	it('keeps the two small sets eager and defers RVO behind load()', () => {
		const w = mount(CnIconBrowser, { propsData: { value: null, inline: true }, mocks })
		const groups = w.findComponent(CnIconBrowserPanel).props('urlIconGroups')
		const [gemeente, denHaag, rvo] = groups
		expect(gemeente.icons.length).toBeGreaterThan(0)
		expect(denHaag.icons.length).toBeGreaterThan(0)
		// RVO ships no icons up front — only a loader — so its ~1.9MB stays out of
		// the eager bundle until a user opens its tab.
		expect(rvo.icons).toEqual([])
		expect(typeof rvo.load).toBe('function')
	})
	it('lets a provided cnIconUrlGroups override the default, and [] opt out', () => {
		const custom = [{ key: 'brand', label: 'Brand', icons: [{ label: 'B', url: '/b.svg' }] }]
		const w = mount(CnIconBrowser, {
			propsData: { value: null, inline: true },
			provide: { cnIconUrlGroups: custom },
			mocks,
		})
		expect(w.findComponent(CnIconBrowserPanel).props('urlIconGroups')).toBe(custom)

		const off = mount(CnIconBrowser, {
			propsData: { value: null, inline: true },
			provide: { cnIconUrlGroups: [] },
			mocks,
		})
		expect(off.findComponent(CnIconBrowserPanel).props('urlIconGroups')).toEqual([])
	})
})

describe('CnIconBrowserPanel — lazily-loaded url-icon groups', () => {
	const icons = mdiCatalogue(FAKE_MDI)
	const eager = { key: 'eager', label: 'Eager', icons: [{ label: 'E', url: '/e.svg' }] }

	function lazyGroup(load) {
		return { key: 'lazy', label: 'Lazy', icons: [], load }
	}

	// Selecting a set's tab kicks off load() from a watcher without awaiting it, so
	// let the promise settle and the re-render land before asserting.
	async function activateGroup(w, key) {
		w.vm.mode = 'group:' + key
		await w.vm.$nextTick()
		await new Promise((resolve) => setTimeout(resolve, 0))
		await w.vm.$nextTick()
	}

	it('keeps a lazy group visible as a tab before its icons exist', () => {
		const w = mount(CnIconBrowserPanel, {
			propsData: { value: null, icons, urlIconGroups: [eager, lazyGroup(async () => [])] },
			mocks,
		})
		// An empty-but-loadable group must survive resolvedGroups' empty filter,
		// or its tab would never render and could never be activated.
		expect(w.vm.resolvedGroups.map((g) => g.key)).toEqual(['eager', 'lazy'])
		expect(w.vm.tabs.map((tabDef) => tabDef.label)).toEqual(['Icons', 'Eager', 'Lazy'])
	})

	it('does not call load() until the group is actually activated', async () => {
		const load = jest.fn(async () => [{ label: 'L', url: '/l.svg' }])
		const w = mount(CnIconBrowserPanel, {
			propsData: { value: null, icons, urlIconGroups: [eager, lazyGroup(load)] },
			mocks,
		})
		// Sitting on another set's tab must not fetch the lazy one.
		await activateGroup(w, 'eager')
		expect(load).not.toHaveBeenCalled()

		await activateGroup(w, 'lazy')
		expect(load).toHaveBeenCalledTimes(1)
	})

	it('renders the loaded icons and only loads once', async () => {
		const load = jest.fn(async () => [{ label: 'Lazy icon', url: '/l.svg' }])
		const w = mount(CnIconBrowserPanel, {
			propsData: { value: null, icons, urlIconGroups: [eager, lazyGroup(load)] },
			mocks,
		})
		await activateGroup(w, 'lazy')

		expect(w.vm.activeGroup.icons).toEqual([{ label: 'Lazy icon', url: '/l.svg' }])
		expect(w.find('.cn-icon-browser-panel__cell-img').attributes('src')).toBe('/l.svg')

		// Re-activating must not re-fetch.
		await activateGroup(w, 'eager')
		await activateGroup(w, 'lazy')
		expect(load).toHaveBeenCalledTimes(1)
	})

	it('surfaces a failed load and retries on the next activation', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		const load = jest.fn()
			.mockRejectedValueOnce(new Error('chunk 404'))
			.mockResolvedValueOnce([{ label: 'Recovered', url: '/r.svg' }])
		const w = mount(CnIconBrowserPanel, {
			propsData: { value: null, icons, urlIconGroups: [eager, lazyGroup(load)] },
			mocks,
		})
		await activateGroup(w, 'lazy')

		// The set is reported as broken, not silently dropped — a vanishing tab
		// looks exactly like the missing-icons bug this mechanism fixes.
		expect(w.find('.cn-icon-browser-panel__error').text()).toBe('Could not load this icon set.')
		expect(w.vm.resolvedGroups.map((g) => g.key)).toContain('lazy')

		// A failure leaves the group unresolved, so returning to the tab retries.
		await activateGroup(w, 'eager')
		await activateGroup(w, 'lazy')
		expect(load).toHaveBeenCalledTimes(2)
		expect(w.vm.activeGroup.icons).toEqual([{ label: 'Recovered', url: '/r.svg' }])
		expect(w.find('.cn-icon-browser-panel__error').exists()).toBe(false)
		spy.mockRestore()
	})
})

describe('CnIconBrowserPanel — named sets are promoted to top-level tabs', () => {
	const icons = mdiCatalogue(FAKE_MDI)
	const groups = [
		{ key: 'open-gemeenten', label: 'Gemeente', icons: [{ id: 'g1', label: 'G', url: '/g.svg' }] },
		{ key: 'den-haag', label: 'Den Haag', icons: [{ id: 'd1', label: 'D', url: '/d.svg' }] },
	]

	it('gives each named set its own tab instead of burying it under Custom', () => {
		// The reason for the model: users could not find the sets one level down
		// behind a tab labelled "Custom".
		const w = mount(CnIconBrowserPanel, {
			propsData: { value: null, icons, urlIconGroups: groups },
			mocks,
		})
		const labels = w.findAll('.cn-icon-browser-panel__tab').map((b) => b.text())
		expect(labels).toEqual(['Icons', 'Gemeente', 'Den Haag'])
	})

	it('offers no Custom tab when the only sources are named sets', () => {
		const w = mount(CnIconBrowserPanel, {
			propsData: { value: null, icons, urlIconGroups: groups },
			mocks,
		})
		// Nothing bring-your-own is configured, so "Custom" would be an empty tab.
		expect(w.vm.hasCustomTab).toBe(false)
	})

	it('keeps the legacy flat urlIcons inside Custom, unpromoted', () => {
		// Back-compat: a flat `urlIcons` list has no set name to put on a tab.
		const w = mount(CnIconBrowserPanel, {
			propsData: {
				value: null,
				icons,
				urlIcons: [{ label: 'Brand', url: '/b.svg' }],
				allowUrl: true,
			},
			mocks,
		})
		const labels = w.findAll('.cn-icon-browser-panel__tab').map((b) => b.text())
		expect(labels).toEqual(['Icons', 'Custom'])
		expect(w.vm.unnamedIcons).toEqual([{ label: 'Brand', url: '/b.svg' }])
	})

	it('roves the tablist with arrow keys, wrapping at both ends', async () => {
		const w = mount(CnIconBrowserPanel, {
			propsData: { value: null, icons, urlIconGroups: groups },
			mocks,
			attachTo: document.body,
		})
		const tabs = w.findAll('.cn-icon-browser-panel__tab')
		await tabs.at(0).trigger('keydown', { key: 'ArrowRight' })
		expect(w.vm.mode).toBe('group:open-gemeenten')

		await tabs.at(1).trigger('keydown', { key: 'End' })
		expect(w.vm.mode).toBe('group:den-haag')

		// Wraps forward off the end, and back off the start.
		await tabs.at(2).trigger('keydown', { key: 'ArrowRight' })
		expect(w.vm.mode).toBe('icons')
		await tabs.at(0).trigger('keydown', { key: 'ArrowLeft' })
		expect(w.vm.mode).toBe('group:den-haag')
		w.unmount()
	})
})

describe('CnIconBrowserPanel — duplicate icon payloads', () => {
	const icons = mdiCatalogue(FAKE_MDI)

	it('renders every icon when two share an identical url', () => {
		// Real data: rvo-bestelbus/rvo-bus and og-paspoort/og-paspoortinternationaal
		// are distinct icons with byte-identical SVGs. Keying cells by `url` gave
		// Vue duplicate keys ("may cause an update error"); `id` is unique.
		const dupUrl = 'data:image/svg+xml,<svg/>'
		const group = {
			key: 'dupes',
			label: 'Dupes',
			icons: [
				{ id: 'a', label: 'Bestelbus', url: dupUrl },
				{ id: 'b', label: 'Bus', url: dupUrl },
			],
		}
		const w = mount(CnIconBrowserPanel, {
			propsData: { value: null, icons, urlIconGroups: [group] },
			mocks,
		})
		w.vm.mode = 'group:dupes'

		return w.vm.$nextTick().then(() => {
			const cells = w.findAll('.cn-icon-browser-panel__cell-img')
			expect(cells.length).toBe(2)
			expect(cells.at(0).attributes('alt')).toBe('Bestelbus')
			expect(cells.at(1).attributes('alt')).toBe('Bus')
		})
	})
})

describe('CnIconBrowserPanel — clearable', () => {
	const icons = mdiCatalogue(FAKE_MDI)

	it('offers no clear control by default', () => {
		const w = mount(CnIconBrowserPanel, { propsData: { value: 'M1 2 3', icons }, mocks })
		expect(w.find('.cn-icon-browser-panel__clear').exists()).toBe(false)
	})

	it('shows the clear control only once something is selected', async () => {
		const w = mount(CnIconBrowserPanel, {
			propsData: { value: null, icons, clearable: true },
			mocks,
		})
		expect(w.find('.cn-icon-browser-panel__clear').exists()).toBe(false)

		await w.setProps({ value: 'M1 2 3' })
		expect(w.find('.cn-icon-browser-panel__clear').exists()).toBe(true)
	})

	it('emits a null input and a pick when cleared', async () => {
		const w = mount(CnIconBrowserPanel, {
			propsData: { value: 'M1 2 3', icons, clearable: true },
			mocks,
		})
		await w.find('.cn-icon-browser-panel__clear').trigger('click')
		expect(w.emitted('input')[0]).toEqual([null])
		expect(w.emitted('pick')).toHaveLength(1)
	})

	it('clears a picked url icon too, not just catalogue icons', async () => {
		const w = mount(CnIconBrowserPanel, {
			propsData: { value: 'data:image/svg+xml,<svg/>', icons, clearable: true },
			mocks,
		})
		await w.find('.cn-icon-browser-panel__clear').trigger('click')
		expect(w.emitted('input')[0]).toEqual([null])
	})
})
