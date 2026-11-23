/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A card's actions can sit in one "..." menu instead of a row of buttons
 * (DqZaaktype "Fasen en taken": a 34px "..." button per task, named
 * "Acties voor Volledigheid toetsen"). CnActionButtons gains `overflowOnly`:
 * every collapsible action goes in the menu, the trigger is icon only with
 * its own accessible name.
 *
 * @spec openspec/changes/grouped-cards-item-menu/specs/grouped-cards-item-menu/spec.md#requirement-a-cards-actions-can-sit-in-one-menu
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnActionButtons from '../../src/components/CnActionButtons/CnActionButtons.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

const CnGroupedCardsWidget = require('../../src/components/CnGroupedCardsWidget/CnGroupedCardsWidget.vue').default

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const PHASES = { phases: [{ id: 'p1', name: 'Fase 1: Ontvangst', tasks: [{ id: 't1', name: 'Volledigheid toetsen' }, { id: 't2', name: 'Ontvangstbevestiging' }] }] }
const ACTIONS = [
	{ id: 'edit', label: 'Edit task', type: 'navigate', target: '/tasks/@item.id' },
	{ id: 'remove', label: 'Remove task', type: 'api-call', url: '/api/tasks/@item.id', method: 'DELETE' },
]

describe('CnActionButtons overflowOnly', () => {
	it('draws no buttons and puts every action in one icon-only menu with its own name', () => {
		const w = mount(CnActionButtons, {
			props: { actions: ACTIONS.map((a) => ({ ...a, target: '/tasks/t1', url: '/api/tasks/t1' })), overflowOnly: true, overflowAriaLabel: 'Actions for Volledigheid toetsen' },
			global: { stubs: { NcActions: { props: ['menuName', 'ariaLabel', 'forceMenu'], template: '<div class="menu" :data-name="menuName" :aria-label="ariaLabel"><slot /></div>' }, NcActionButton: { template: '<button class="item"><slot /></button>' }, NcActionLink: { template: '<a class="item"><slot /></a>' } } },
		})
		expect(w.findAll('.button-vue')).toHaveLength(0)
		const menu = w.find('[data-testid="cn-action-buttons-overflow"]')
		expect(menu.exists()).toBe(true)
		expect(menu.attributes('aria-label')).toBe('Actions for Volledigheid toetsen')
		expect(menu.attributes('data-name')).toBeUndefined()
		expect(w.findAll('.item')).toHaveLength(2)
	})
})

describe('CnGroupedCardsWidget itemActionsMenu', () => {
	beforeEach(() => {
		invalidateEndpointSourceCache()
		axios.get.mockResolvedValue({ data: PHASES })
	})

	function mountCards(extra) {
		return mount(CnGroupedCardsWidget, {
			props: { content: { endpointSource: { url: '/apps/dossiq/api/case-types/ct-1/phases' }, groupsPath: 'phases', itemsKey: 'tasks', groupTitle: '{name}', itemTitle: '{name}', itemActions: ACTIONS, ...extra } },
			global: { stubs: { CnActionButtons: { name: 'CnActionButtons', props: ['actions', 'overflowOnly', 'overflowAriaLabel'], template: '<div class="actions" />' } } },
		})
	}

	it('hands each card its actions as one menu named after the card', async () => {
		const w = mountCards({ itemActionsMenu: true })
		await flush()
		const menus = w.findAllComponents({ name: 'CnActionButtons' }).filter((c) => Array.isArray(c.props('actions')) && c.props('actions').length > 0)
		expect(menus).toHaveLength(2)
		expect(menus.map((c) => c.props('overflowOnly'))).toEqual([true, true])
		expect(menus.map((c) => c.props('overflowAriaLabel'))).toEqual(['Actions for Volledigheid toetsen', 'Actions for Ontvangstbevestiging'])
		// The board look's 34px bordered square of a row menu (look-board-index.css).
		expect(menus.map((c) => c.classes())).toEqual([expect.arrayContaining(['cn-row-actions--board']), expect.arrayContaining(['cn-row-actions--board'])])
	})

	it('keeps the buttons without the option', async () => {
		const w = mountCards({})
		await flush()
		const cards = w.findAllComponents({ name: 'CnActionButtons' }).filter((c) => Array.isArray(c.props('actions')) && c.props('actions').length > 0)
		expect(cards.map((c) => Boolean(c.props('overflowOnly')))).toEqual([false, false])
	})
})
