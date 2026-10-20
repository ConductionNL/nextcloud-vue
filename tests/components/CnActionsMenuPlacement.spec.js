/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `placement` says where the menu opens against its trigger. The board's
 * "Meer" menu lines up with the trigger's right edge (DqZaakMeer); every
 * other menu keeps NcActions' centred `bottom`.
 */
import { mount } from '@vue/test-utils'
import CnActionsMenu from '../../src/components/CnActionsMenu/CnActionsMenu.vue'

const NcActions = { name: 'NcActions', props: ['placement'], template: '<div><slot name="icon" /><slot /></div>' }

/**
 * Mount the menu with the given props.
 *
 * @param {object} props Extra props.
 * @return {object} The wrapper.
 */
function mountMenu(props = {}) {
	return mount(CnActionsMenu, {
		propsData: { widgetId: 'w1', title: 'Zaak', surface: 'detail:w1', ...props },
		stubs: { NcActions, NcActionButton: true, NcActionLink: true, NcActionSeparator: true },
		mocks: { $route: { name: 'Dashboard' } },
		provide: { cnAppId: 'dossiq', cnFeatureRequestRepo: 'ConductionNL/dossiq' },
	})
}

describe('CnActionsMenu placement', () => {
	it('opens under the trigger, centred, by default', () => {
		expect(mountMenu().findComponent({ name: 'NcActions' }).props('placement')).toBe('bottom')
	})

	it('hands NcActions the placement it is given', () => {
		expect(mountMenu({ placement: 'bottom-end' }).findComponent({ name: 'NcActions' }).props('placement')).toBe('bottom-end')
	})
})

describe('CnDetailPage header menu placement', () => {
	const fs = require('fs')
	const path = require('path')
	const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnDetailPage/CnDetailPage.vue'), 'utf8')

	it('opens the board\'s "Meer" menu end-aligned and the Nextcloud one centred', () => {
		expect(source).toContain(':placement="isBoard ? \'bottom-end\' : \'bottom\'"')
	})
})
