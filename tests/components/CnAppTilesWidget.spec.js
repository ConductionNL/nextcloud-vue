/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnAppTilesWidget: the apps a person can open as tiles, with a filter, the
 * apps they use most, a pin for pinned apps and a status per app (LpVandaag
 * "Apps").
 *
 * @spec openspec/changes/lpvandaag-start-page/specs/lpvandaag-start-page/spec.md#requirement-the-apps-a-person-can-open-are-tiles
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnAppTilesWidget, { arrangeApps, mostUsedApps } from '../../src/components/CnAppTilesWidget/CnAppTilesWidget.vue'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { clearAppDisplayNames } from '../../src/utils/nextcloudApps.js'

import '../../src/components/CnAppTilesWidget/index.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateOcsUrl: (path) => `/ocs/v2.php/${path}` }))
jest.mock('@nextcloud/auth', () => ({ getCurrentUser: () => ({ uid: 'pieter' }) }))
jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, params) => String(text).replace(/\{(\w+)\}/g, (_, key) => String((params || {})[key])),
	translatePlural: (app, one, many, count) => (count === 1 ? one : many).replace('%n', String(count)),
}))

const NAVIGATION = [
	{ id: 'files', app: 'files', name: 'Bestanden', href: '/apps/files/', icon: '/apps/files/img/app.svg' },
	{ id: 'calendar', app: 'calendar', name: 'Agenda', href: '/apps/calendar/', icon: '/apps/calendar/img/app.svg' },
	{ id: 'spreed', app: 'spreed', name: 'Talk', href: '/apps/spreed/', icon: '' },
	{ id: 'broken', name: '', href: '/x' },
]

/**
 * Mount the widget.
 *
 * @param {object} content The widget content.
 * @return {Promise<object>} The wrapper.
 */
async function mountTiles(content = {}) {
	const wrapper = mount(CnAppTilesWidget, {
		props: { content: { title: 'Apps', ...content } },
		global: { stubs: { Magnify: true, Pin: true, ViewGridOutline: true }, provide: { cnTranslate: (key) => key } },
	})
	await flushPromises()
	return wrapper
}

beforeEach(() => {
	window.localStorage.clear()
	clearAppDisplayNames()
	axios.get.mockReset()
	axios.get.mockResolvedValue({ data: { ocs: { data: NAVIGATION } } })
})

describe('arrangeApps', () => {
	it('puts the pinned apps first in pin order, leaves out the excluded and the unusable ones, and marks outages', () => {
		const apps = arrangeApps([
			{ id: 'a', label: 'A', href: '/a' },
			{ id: 'b', label: 'B', href: '/b', status: 'down' },
			{ id: 'c', label: 'C', href: '/c' },
			{ id: 'd', label: 'D', href: '/d' },
			{ id: 'e', label: '', href: '/e' },
		], { pinned: ['c', 'a', 'missing'], exclude: ['d'], status: { a: 'down' } })
		expect(apps.map((app) => app.id)).toEqual(['c', 'a', 'b'])
		expect(apps.map((app) => app.pinned)).toEqual([true, true, false])
		expect(apps.map((app) => app.down)).toEqual([false, true, true])
	})
})

describe('mostUsedApps', () => {
	it('lists the used apps, most first, up to the limit', () => {
		const apps = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
		expect(mostUsedApps(apps, { a: 2, b: 5, c: 0 }, 4).map((app) => app.id)).toEqual(['b', 'a'])
		expect(mostUsedApps(apps, { a: 2, b: 5 }, 1).map((app) => app.id)).toEqual(['b'])
		expect(mostUsedApps(apps, {}, 4)).toEqual([])
	})
})

describe('CnAppTilesWidget', () => {
	it('registers as the app-tiles widget type', () => {
		expect(getWidgetTypeEntry('app-tiles').renderer).toBe(CnAppTilesWidget)
	})

	it('is registered by the library entry point, not only by its own index', () => {
		const source = require('fs').readFileSync(require('path').join(__dirname, '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'), 'utf8')
		expect(source).toContain("import '../CnAppTilesWidget/index.js'")
	})

	it('draws a tile per app of the navigation, with its name, link, icon and status', async () => {
		const wrapper = await mountTiles()
		expect(wrapper.find('h2').text()).toBe('Apps')
		const tiles = wrapper.findAll('.cn-app-tiles__tile')
		expect(tiles.map((tile) => tile.find('.cn-app-tiles__name').text())).toEqual(['Bestanden', 'Agenda', 'Talk'])
		expect(tiles[0].attributes('href')).toBe('/apps/files/')
		expect(tiles[0].find('.cn-app-tiles__glyph').attributes('style')).toContain('/apps/files/img/app.svg')
		expect(tiles[2].find('.cn-app-tiles__glyph').exists()).toBe(false)
		expect(tiles[0].find('.cn-app-tiles__dot').attributes('aria-label')).toBe('Available')
	})

	it('marks an app with an outage', async () => {
		const wrapper = await mountTiles({ status: { calendar: 'down' } })
		const tile = wrapper.find('[data-testid="cn-app-tiles-tile-calendar"]')
		expect(tile.find('.cn-app-tiles__badge').text()).toBe('Outage')
		expect(tile.find('.cn-app-tiles__dot').attributes('aria-label')).toBe('Outage')
	})

	it('uses the configured apps instead of the navigation', async () => {
		const wrapper = await mountTiles({ apps: [{ id: 'zaak', label: 'Zaaksysteem', href: '/apps/dossiq/' }], pinned: ['zaak'] })
		expect(axios.get).not.toHaveBeenCalled()
		const tiles = wrapper.findAll('.cn-app-tiles__tile')
		expect(tiles).toHaveLength(1)
		expect(tiles[0].find('.cn-app-tiles__pin').exists()).toBe(true)
	})

	it('narrows the tiles by the filter', async () => {
		const wrapper = await mountTiles()
		await wrapper.find('[data-testid="cn-app-tiles-filter"]').setValue('AG')
		expect(wrapper.findAll('.cn-app-tiles__tile').map((tile) => tile.find('.cn-app-tiles__name').text())).toEqual(['Agenda'])
		await wrapper.find('[data-testid="cn-app-tiles-filter"]').setValue('zzz')
		expect(wrapper.find('[data-testid="cn-app-tiles-empty"]').text()).toBe('No tile matches the filter')
	})

	it('counts the reader\'s uses and offers the most used apps with their count', async () => {
		const wrapper = await mountTiles()
		expect(wrapper.find('[data-testid="cn-app-tiles-most-used"]').exists()).toBe(false)
		await wrapper.find('[data-testid="cn-app-tiles-tile-calendar"]').trigger('click')
		await wrapper.find('[data-testid="cn-app-tiles-tile-calendar"]').trigger('click')
		await wrapper.find('[data-testid="cn-app-tiles-tile-files"]').trigger('click')
		const chips = wrapper.findAll('.cn-app-tiles__chip')
		expect(chips.map((chip) => chip.text())).toEqual(['Agenda 2 times', 'Bestanden 1 time'])
		expect(JSON.parse(window.localStorage.getItem('cn-app-tiles-usage:pieter'))).toEqual({ calendar: 2, files: 1 })
	})

	it('reads the counts the browser kept, and draws no row when switched off', async () => {
		window.localStorage.setItem('cn-app-tiles-usage:pieter', JSON.stringify({ spreed: 9 }))
		expect((await mountTiles()).find('.cn-app-tiles__chip').text()).toBe('Talk 9 times')
		expect((await mountTiles({ showMostUsed: false })).find('[data-testid="cn-app-tiles-most-used"]').exists()).toBe(false)
	})

	it('has no filter field when switched off', async () => {
		const wrapper = await mountTiles({ showFilter: false })
		expect(wrapper.find('[data-testid="cn-app-tiles-filter"]').exists()).toBe(false)
	})
})
