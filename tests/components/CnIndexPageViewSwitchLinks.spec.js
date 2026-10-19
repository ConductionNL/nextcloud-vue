/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `viewSwitchLinks`: a view switch segment that opens another page. The index
 * page resolves each entry to `{ href, to }` for the bar; an unresolvable
 * route and an unknown mode are left out, and nothing is passed without the
 * board look.
 *
 * @spec openspec/changes/screens-view-switch-links/specs/view-switch/spec.md#requirement-a-view-switch-segment-can-open-another-page
 */
import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

function targets(extra = {}, look = 'board') {
	const w = mount(CnIndexPage, {
		propsData: {
			title: 'Cases',
			schema: { title: 'Case', properties: { title: { title: 'Title' } } },
			objects: [{ id: 1 }],
			pagination: { page: 1, pages: 1, total: 1, limit: 20 },
			...extra,
		},
		global: {
			provide: { cnLook: look },
			mocks: {
				$router: { push: jest.fn(), resolve: (to) => (to.name === 'CaseBoard' ? { href: '#/cases/board' + (to.query ? '?team=' + to.query.team : '') } : (() => { throw new Error('no route') })()) },
				$route: { query: {}, name: 'Cases' },
			},
			stubs: { CnActionsBar: { name: 'CnActionsBar', props: ['viewModeLinks', 'disabledViewModes'], template: '<div />' }, CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnSavedViewsControl: true, CnBuildiqEditButton: true },
		},
	})
	return w.findComponent({ name: 'CnActionsBar' }).props()
}

describe('CnIndexPage viewSwitchLinks', () => {
	it('resolves a route (with query) and an href, and leaves the rest out', () => {
		const props = targets({ viewSwitch: ['table', 'cards', 'kanban', 'map'], viewSwitchLinks: { kanban: { route: 'CaseBoard', query: { team: 'woo' } }, map: { href: '/apps/x/map' }, cards: { route: 'Missing' }, calendar: { href: '/x' } } })
		expect(props.viewModeLinks).toEqual({ kanban: { href: '#/cases/board?team=woo', to: { name: 'CaseBoard', query: { team: 'woo' } } }, map: { href: '/apps/x/map' } })
	})

	it('passes nothing without the board look or without the key', () => {
		expect(targets({ viewSwitchLinks: { kanban: { route: 'CaseBoard' } } }, 'nextcloud').viewModeLinks).toEqual({})
		expect(targets().viewModeLinks).toEqual({})
	})

	it('is a manifest key: a route or an href per mode, nothing else', () => {
		const manifest = (viewSwitchLinks) => ({
			$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
			version: '2.0.0',
			menu: [],
			pages: [{ id: 'Cases', route: '/cases', type: 'index', title: 'Cases', config: { register: 'r', schema: 'case', viewSwitchLinks } }],
		})
		expect(validateManifestV2(manifest({ kanban: { route: 'CaseBoard', query: { team: 'woo' } }, map: { href: '/apps/x/map' } })).valid).toBe(true)
		expect(validateManifestV2(manifest({ kanban: {} })).valid).toBe(false)
		expect(validateManifestV2(manifest({ calendar: { route: 'X' } })).valid).toBe(false)
	})
})
