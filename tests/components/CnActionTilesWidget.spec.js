/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnActionTilesWidget: a row of tiles whose click runs a declared action with
 * the page's workspace tokens resolved (board PqWerkplekKlant).
 *
 * @spec openspec/changes/dashboard-action-tiles/specs/dashboard-action-tiles/spec.md#requirement-a-dashboard-can-draw-a-row-of-action-tiles
 */
import { mount } from '@vue/test-utils'
import { CnActionTilesWidget } from '../../src/components/CnActionTilesWidget/index.js'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { DASHBOARD_CATALOG_WIDGET_KEYS } from '../../src/utils/libraryWidgetKeys.js'

const callback = {
	id: 'callback',
	label: 'Call back',
	icon: 'PhoneReturnOutline',
	action: {
		type: 'open-form',
		register: 'pipelinq',
		schema: 'crmTask',
		props: { type: 'callbackRequest', clientId: '@workspace.selectedClient', contactMoment: '@workspace.contactMoment?' },
	},
}

/**
 * Mount the widget.
 *
 * @param {Array<object>} tiles The tiles.
 * @param {object} workspace The page workspace.
 * @param {Function|null} dispatch The page's dispatcher.
 * @return {object} The wrapper.
 */
function mountTiles(tiles, workspace, dispatch = null) {
	return mount(CnActionTilesWidget, {
		props: { content: { tiles } },
		global: {
			provide: {
				cnWorkspaceContext: { value: workspace },
				cnDispatchAction: dispatch,
				cnTranslate: (key) => (key === 'Call back' ? 'Terugbellen' : key),
			},
			stubs: { CnIcon: { props: ['name'], template: '<i :data-icon="name" />' } },
		},
	})
}

describe('CnActionTilesWidget', () => {
	it('is registered as the action-tiles widget type', () => {
		expect(getWidgetTypeEntry('action-tiles')?.renderer).toBe(CnActionTilesWidget)
		expect(DASHBOARD_CATALOG_WIDGET_KEYS).toContain('action-tiles')
	})

	it('draws each tile with its icon and translated label', () => {
		const wrapper = mountTiles([callback, { id: 'complaint', label: 'Register a complaint', icon: 'AlertCircleOutline', action: { type: 'navigate', route: 'Tickets' } }], { selectedClient: 'c-1' })
		const tiles = wrapper.findAll('.cn-action-tiles__tile')
		expect(tiles).toHaveLength(2)
		expect(tiles[0].text()).toBe('Terugbellen')
		expect(tiles[0].find('[data-icon]').attributes('data-icon')).toBe('PhoneReturnOutline')
		expect(tiles[1].text()).toBe('Register a complaint')
	})

	it('dispatches the action with the workspace client filled and an open optional token dropped', async () => {
		const dispatch = jest.fn()
		const wrapper = mountTiles([callback], { selectedClient: 'c-1' }, dispatch)
		await wrapper.find('[data-testid="cn-action-tile-callback"]').trigger('click')
		expect(dispatch).toHaveBeenCalledTimes(1)
		expect(dispatch.mock.calls[0][0].props).toEqual({ type: 'callbackRequest', clientId: 'c-1' })
	})

	it('draws a tile disabled and dispatches nothing while a required token is open', async () => {
		const dispatch = jest.fn()
		const wrapper = mountTiles([callback], {}, dispatch)
		const tile = wrapper.find('[data-testid="cn-action-tile-callback"]')
		expect(tile.attributes('disabled')).toBeDefined()
		await tile.trigger('click')
		expect(dispatch).not.toHaveBeenCalled()
	})

	it('leaves out a tile whose workspace condition does not hold, and one without an action', () => {
		const wrapper = mountTiles([
			{ ...callback, visibleWhen: { workspace: 'callActive', op: 'eq', value: true } },
			{ id: 'bare', label: 'No action' },
		], { selectedClient: 'c-1', callActive: false })
		expect(wrapper.findAll('.cn-action-tiles__tile')).toHaveLength(0)
	})
})
