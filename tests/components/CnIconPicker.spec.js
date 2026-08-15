// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

import { mount } from '@vue/test-utils'
import CnIconPicker from '../../src/components/CnIconPicker/CnIconPicker.vue'
import CnDashboardIcon from '../../src/components/CnIconPicker/CnDashboardIcon.vue'
import CnIcon from '../../src/components/CnIcon/CnIcon.vue'
import HelpCircleOutline from 'vue-material-design-icons/HelpCircleOutline.vue'
import {
	getIconComponent,
	isCustomIconUrl,
	DEFAULT_ICON,
	DASHBOARD_ICONS,
} from '../../src/components/CnIconPicker/dashboardIcons.js'
import {
	fromMdiJs,
	fromFontAwesome,
	fromOpenGemeenten,
	dedupeCatalogue,
} from '../../src/components/CnIconPicker/iconCatalogues.js'

const mocks = { t: (_app, s) => s }

describe('CnIcon dashboard-icon fallback', () => {
	it('resolves a DASHBOARD_ICONS name (what the picker offers) without registering', () => {
		const w = mount(CnIcon, { propsData: { name: 'RocketLaunch' } })
		expect(w.vm.resolvedComponent).toBe(DASHBOARD_ICONS.RocketLaunch)
	})
	it('still falls back to the help icon for a genuinely unknown name', () => {
		const w = mount(CnIcon, { propsData: { name: 'TotallyNotAnIcon' } })
		expect(w.vm.resolvedComponent).toBe(HelpCircleOutline)
	})
})

describe('dashboardIcons helpers', () => {
	it('resolves unknown/empty names to the default icon component', () => {
		expect(getIconComponent('nope')).toBe(DASHBOARD_ICONS[DEFAULT_ICON])
		expect(getIconComponent('')).toBe(DASHBOARD_ICONS[DEFAULT_ICON])
		expect(getIconComponent(null)).toBe(DASHBOARD_ICONS[DEFAULT_ICON])
	})
	it('returns null for URL names (render as img)', () => {
		expect(getIconComponent('/path/x.svg')).toBeNull()
		expect(getIconComponent('http://x/y.png')).toBeNull()
	})
	it('isCustomIconUrl discriminates URLs', () => {
		expect(isCustomIconUrl('/a.svg')).toBe(true)
		expect(isCustomIconUrl('http://a')).toBe(true)
		expect(isCustomIconUrl('Star')).toBe(false)
		expect(isCustomIconUrl('')).toBe(false)
	})
})

describe('CnDashboardIcon', () => {
	it('renders an <img> for URL names', () => {
		const w = mount(CnDashboardIcon, { propsData: { name: '/custom.svg', alt: 'x' } })
		expect(w.find('img').exists()).toBe(true)
		expect(w.find('img').attributes('src')).toBe('/custom.svg')
	})
	it('renders a component for registry names', () => {
		const w = mount(CnDashboardIcon, { propsData: { name: 'Star' } })
		expect(w.find('img').exists()).toBe(false)
	})
})

describe('CnIconPicker', () => {
	it('emits input with the clicked icon registry key', async () => {
		const w = mount(CnIconPicker, { propsData: { value: null }, mocks })
		// Grid of icon tiles — click the one whose aria-label is the registry key.
		const star = w.findAll('.cn-icon-picker__icon').find((b) => b.attributes('aria-label') === 'Star')
		expect(star).toBeTruthy()
		await star.trigger('click')
		expect(w.emitted('input')[0]).toEqual(['Star'])
	})

	it('clearable: renders a leading None tile that emits null', async () => {
		const w = mount(CnIconPicker, { propsData: { value: 'Star', clearable: true }, mocks })
		const none = w.find('.cn-icon-picker__none')
		expect(none.exists()).toBe(true)
		await none.trigger('click')
		expect(w.emitted('input')[0]).toEqual([null])
	})

	it('no None tile unless clearable', () => {
		const w = mount(CnIconPicker, { propsData: { value: null }, mocks })
		expect(w.find('.cn-icon-picker__none').exists()).toBe(false)
	})

	it('marks the current icon tile as selected', () => {
		const w = mount(CnIconPicker, { propsData: { value: 'Star' }, mocks })
		const star = w.findAll('.cn-icon-picker__icon').find((b) => b.attributes('aria-label') === 'Star')
		expect(star.classes()).toContain('cn-icon-picker__icon--selected')
	})
	it('hides the upload control when no uploadFn is given', () => {
		const w = mount(CnIconPicker, { propsData: { value: null }, mocks })
		expect(w.find('.cn-icon-picker__upload-label').exists()).toBe(false)
	})
	it('shows the upload control when uploadFn is provided', () => {
		const w = mount(CnIconPicker, { propsData: { value: null, uploadFn: async () => ({ url: '/x' }) }, mocks })
		expect(w.find('.cn-icon-picker__upload-label').exists()).toBe(true)
	})

	it('default usage renders the legacy grid (not enriched)', () => {
		const w = mount(CnIconPicker, { propsData: { value: null }, mocks })
		expect(w.vm.enriched).toBe(false)
		expect(w.find('.cn-icon-picker__sources').exists()).toBe(false)
		expect(w.find('.cn-icon-picker__search').exists()).toBe(false)
	})
})

describe('CnIconPicker catalogue adapters', () => {
	it('fromMdiJs produces catalogue entries with path + viewBox', () => {
		const cat = fromMdiJs({ mdiAccount: 'M1 2 3 4', mdiHome: 'M5 6 7 8', notAnIcon: 42 })
		expect(cat).toHaveLength(2)
		const account = cat.find((e) => e.value === 'mdiAccount')
		expect(account.path).toBe('M1 2 3 4')
		expect(account.viewBox).toBe('0 0 24 24')
		expect(account.label).toBe('Account')
	})

	it('fromFontAwesome deduplicates by value across packs', () => {
		const fas = { faHouse: { iconName: 'house', icon: [512, 512, [], 'f015', 'M1'] } }
		const far = { faHouse: { iconName: 'house', icon: [448, 512, [], 'f015', 'M2'] } }
		const fab = { faGithub: { iconName: 'github', icon: [496, 512, [], 'f09b', 'M3'] } }
		const cat = fromFontAwesome({ fas, far, fab })
		expect(cat.filter((e) => e.value === 'house')).toHaveLength(1)
		expect(cat.find((e) => e.value === 'github').viewBox).toBe('0 0 496 512')
	})

	it('fromOpenGemeenten normalizes name/path and extracts svg path', () => {
		const cat = fromOpenGemeenten([
			{ name: 'paspoort', path: 'M9 9' },
			{ name: 'rijbewijs', svg: '<svg><path d="M4 4"/></svg>' },
			null,
		])
		expect(cat).toHaveLength(2)
		expect(cat.find((e) => e.value === 'rijbewijs').path).toBe('M4 4')
	})

	it('dedupeCatalogue drops duplicate + empty values', () => {
		const cat = dedupeCatalogue([
			{ value: 'a' }, { value: 'a' }, { value: '' }, { value: 'b' }, null,
		])
		expect(cat.map((e) => e.value)).toEqual(['a', 'b'])
	})
})

describe('CnIconPicker enriched mode', () => {
	const faCat = fromFontAwesome({ fas: { faHouse: { iconName: 'house', icon: [512, 512, [], 'f015', 'M1'] }, faStar: { iconName: 'star', icon: [576, 512, [], 'f005', 'M2'] } } })

	it('renders a source switcher only when more than one source is enabled', () => {
		const multi = mount(CnIconPicker, { propsData: { sources: ['mdi', 'fontawesome'], catalogues: { fontawesome: faCat } }, mocks })
		expect(multi.find('.cn-icon-picker__sources').exists()).toBe(true)

		const single = mount(CnIconPicker, { propsData: { searchable: true, sources: ['fontawesome'], catalogues: { fontawesome: faCat } }, mocks })
		expect(single.vm.enriched).toBe(true)
		expect(single.find('.cn-icon-picker__sources').exists()).toBe(false)
	})

	it('searchable: filters the grid and lifts the cap while querying', async () => {
		const w = mount(CnIconPicker, { propsData: { searchable: true, sources: ['fontawesome'], catalogues: { fontawesome: faCat } }, mocks })
		expect(w.find('.cn-icon-picker__search').exists()).toBe(true)
		w.setData({ query: 'star' })
		await w.vm.$nextTick()
		expect(w.vm.filteredEntries).toHaveLength(1)
		expect(w.vm.filteredEntries[0].value).toBe('star')
	})

	it('keeps the selected icon visible even when outside the display cap', async () => {
		const many = Array.from({ length: 200 }, (_, i) => ({ key: 'k' + i, label: 'k' + i, value: 'k' + i, search: 'k' + i }))
		const w = mount(CnIconPicker, { propsData: { searchable: true, sources: ['fontawesome'], value: 'k190', catalogues: { fontawesome: many } }, mocks })
		expect(w.vm.filteredEntries.length).toBeLessThanOrEqual(w.vm.displayLimit + 1)
		expect(w.vm.filteredEntries.find((e) => e.value === 'k190')).toBeTruthy()
	})

	it('MDI source falls back to DASHBOARD_ICONS when @mdi/js catalogue is absent', () => {
		const w = mount(CnIconPicker, { propsData: { searchable: true, sources: ['mdi'] }, mocks })
		w.setData({ mdiCatalogue: null })
		expect(w.vm.activeCatalogue).toEqual(w.vm.dashboardFallbackCatalogue)
		expect(w.vm.activeCatalogue.length).toBe(Object.keys(DASHBOARD_ICONS).length)
	})

	it('allowCustomSvg: formatSVG pretty-prints valid markup and emits it', () => {
		const w = mount(CnIconPicker, { propsData: { allowCustomSvg: true }, mocks })
		w.setData({ iconMode: 'custom', customSvg: '<svg><path d="M1 2"/></svg>' })
		w.vm.formatSVG()
		expect(w.vm.customSvg).toContain('\n')
		expect(w.emitted('input').pop()[0]).toContain('<svg>')
	})

	it('allowCustomSvg: formatSVG leaves invalid input unchanged', () => {
		const w = mount(CnIconPicker, { propsData: { allowCustomSvg: true }, mocks })
		w.setData({ iconMode: 'custom', customSvg: 'no svg here' })
		w.vm.formatSVG()
		expect(w.vm.customSvg).toBe('no svg here')
	})

	it('reveals more icons on scroll (infinite scroll past the cap)', async () => {
		const many = Array.from({ length: 400 }, (_, i) => ({ key: 'k' + i, label: 'k' + i, value: 'k' + i, search: 'k' + i }))
		const w = mount(CnIconPicker, { propsData: { searchable: true, sources: ['fontawesome'], catalogues: { fontawesome: many } }, mocks })
		expect(w.vm.filteredEntries.length).toBe(120)
		expect(w.vm.hasMore).toBe(true)
		// simulate a scroll to the bottom of the grid
		w.vm.onGridScroll({ target: { scrollTop: 1000, clientHeight: 200, scrollHeight: 1200 } })
		await w.vm.$nextTick()
		expect(w.vm.filteredEntries.length).toBe(240)
	})

	it('emits update:placement when a placement is chosen', () => {
		const w = mount(CnIconPicker, { propsData: { searchable: true, sources: ['fontawesome'], catalogues: { fontawesome: faCat }, placement: 'left' }, mocks, listeners: { 'update:placement': () => {} } })
		w.vm.selectPlacement('right')
		expect(w.emitted('update:placement')[0]).toEqual(['right'])
	})
})
