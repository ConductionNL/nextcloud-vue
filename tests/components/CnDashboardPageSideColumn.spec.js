/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A dashboard hands its grid the side column of the open view, or of the page
 * itself: DqMijnWerk draws its side cards 320px wide, DqMijnTeam (the other
 * view of the same page) two halves.
 *
 * @spec openspec/changes/dashboard-side-column-width/specs/dashboard-side-column-width/spec.md#requirement-a-dashboard-can-draw-its-side-column-at-a-fixed-width
 */
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'

const WIDGET = { id: 'w', type: 'text', title: 'W', content: { text: 'x' } }
const CELL = { id: 'c', widgetId: 'w', gridX: 0, gridY: 0, gridWidth: 8, gridHeight: 2 }
const VIEWS = [
	{ id: 'mine', label: 'My work', widgets: [WIDGET], layout: [CELL], gridSideColumn: { width: 320 } },
	{ id: 'team', label: 'My team', widgets: [WIDGET], layout: [CELL] },
]
const Grid = { name: 'CnDashboardGrid', props: ['layout', 'sideColumn'], template: '<div class="grid" />' }

/**
 * @param {object} props Page props.
 * @param {object} query The route query.
 * @return {object} Wrapper.
 */
function mountPage(props, query = {}) {
	return mount(CnDashboardPage, {
		props: { title: 'My work', pageId: 'p', widgets: [], layout: [], ...props },
		global: {
			stubs: { CnDashboardGrid: Grid, CnWidgetWrapper: { template: '<div><slot /></div>' } },
			mocks: { $route: { name: 'P', query }, $router: { replace: jest.fn(async () => {}), push: jest.fn() } },
		},
	})
}

const sides = (wrapper) => wrapper.findAllComponents({ name: 'CnDashboardGrid' }).map((grid) => grid.props('sideColumn'))

describe('CnDashboardPage: a side column of a fixed width', () => {
	beforeEach(() => localStorage.clear())

	it('gives the page grid the page\'s side column', () => {
		expect(sides(mountPage({ widgets: [WIDGET], layout: [CELL], gridSideColumn: { width: 320 } }))).toEqual([{ width: 320 }])
	})

	it('gives a view grid the open view\'s own side column, and none to a view without one', () => {
		expect(sides(mountPage({ views: VIEWS }, { view: 'mine' }))).toEqual([{ width: 320 }])
		expect(sides(mountPage({ views: VIEWS }, { view: 'team' }))).toEqual([null])
	})

	it('is a manifest key on a dashboard and on its views (2.142.0)', () => {
		const { validateManifestV2 } = require('../../src/utils/validateManifest.js')
		const manifest = (config) => ({
			$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
			version: '1.0.0',
			menu: [{ id: 'Home', label: 'Home', route: 'Home', order: 10 }],
			pages: [{ id: 'Home', route: '/', type: 'dashboard', title: 'Home', config }],
		})
		expect(validateManifestV2(manifest({ gridSideColumn: { width: 320 }, views: [{ id: 'mine', label: 'Mine', gridSideColumn: { width: 320, from: 8 } }] })).errors).toEqual([])
		expect(validateManifestV2(manifest({ gridSideColumn: { width: 0 } })).valid).toBe(false)
		expect(validateManifestV2(manifest({ views: [{ id: 'mine', label: 'Mine', gridSideColumn: { from: 8 } }] })).valid).toBe(false)
	})
})
