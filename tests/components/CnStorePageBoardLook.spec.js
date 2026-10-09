/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The catalogue card of the store page under the board look: icon chip, title,
 * "<kind> · <publisher>", a state pill, the description and a footer with the
 * version and one named action.
 *
 * @spec openspec/changes/screens-card-parity/specs/card-board-look/spec.md#requirement-a-catalogue-card-has-an-icon-a-state-and-one-action
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnStorePage from '../../src/components/CnStorePage/CnStorePage.vue'

jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn(() => ({ uid: 'admin', isAdmin: true })) }))
jest.mock('@nextcloud/dialogs', () => ({ showError: jest.fn(), showSuccess: jest.fn() }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => p }))

const CARDS = [
	{ slug: 'b2b', title: 'B2B sales pipeline', typeName: 'Pipeline template', publisher: 'Conduction', description: 'A sales flow.', version: '1.3.0', installed: true, openUrl: '/apps/pipelinq' },
	{ slug: 'upd', title: 'Support desk', kind: 'app-template', description: 'Tickets.', version: '2.0.0', installed: true, updateAvailable: true },
	{ slug: 'new', title: 'Intake', kind: 'app-template', description: 'Intake form.', version: '0.1.0' },
]

async function mountStore(look, props = {}) {
	global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ outcome: 'ok', cards: CARDS }) }))
	const w = mount(CnStorePage, { props: { app: 'pipelinq', ...props }, global: { provide: { cnLook: look } } })
	await flushPromises()
	return w
}

describe('CnStorePage catalogue card (board look)', () => {
	it('draws the installed template: chip, title, kind and publisher, pill, description and an Open footer', async () => {
		const w = await mountStore('board')
		const card = w.findAll('[data-testid="store-results"] .cn-store-page__card')[0]
		expect(card.classes()).toContain('cn-store-page__card--board')
		expect(card.find('.cn-store-page__card-chip').exists()).toBe(true)
		expect(card.find('h3').text()).toBe('B2B sales pipeline')
		expect(card.find('[data-testid="store-card-kind"]').text()).toBe('Pipeline template · Conduction')
		expect(card.find('[data-testid="store-card-state"]').text()).toBe('Installed')
		expect(card.find('.cn-store-page__card-description').text()).toBe('A sales flow.')
		expect(card.find('.cn-store-page__card-version').text()).toBe('Version 1.3.0')
		const action = card.find('[data-testid="store-card-action"]')
		expect(action.text()).toBe('Open')
		expect(action.attributes('aria-label')).toBe('Open B2B sales pipeline')
	})

	it('shows the Update pill and action for an item with an update', async () => {
		const w = await mountStore('board')
		const card = w.findAll('[data-testid="store-results"] .cn-store-page__card')[1]
		expect(card.find('[data-testid="store-card-state"]').text()).toBe('Update')
		expect(card.find('[data-testid="store-card-action"]').text()).toBe('Update')
	})

	it('shows no pill and an Install action for an item that is not installed', async () => {
		const w = await mountStore('board')
		const card = w.findAll('[data-testid="store-results"] .cn-store-page__card')[2]
		expect(card.find('[data-testid="store-card-state"]').exists()).toBe(false)
		expect(card.find('[data-testid="store-card-action"]').text()).toBe('Install')
	})

	it('hides Install when the viewer may not install', async () => {
		const w = await mountStore('board', { canInstall: false })
		const card = w.findAll('[data-testid="store-results"] .cn-store-page__card')[2]
		expect(card.find('[data-testid="store-card-action"]').exists()).toBe(false)
	})

	it('lays the cards on the board track', async () => {
		const w = await mountStore('board')
		expect(w.find('[data-testid="store-results"]').attributes('style')).toContain('minmax(var(--cn-card-grid-min, 260px), 1fr)')
	})

	it('keeps the plain card without the look', async () => {
		const w = await mountStore('nextcloud')
		const card = w.findAll('[data-testid="store-results"] .cn-store-page__card')[0]
		expect(card.classes()).not.toContain('cn-store-page__card--board')
		expect(card.find('.cn-store-page__card-chip').exists()).toBe(false)
		expect(card.find('[data-testid="store-install"]').exists()).toBe(true)
		expect(w.find('[data-testid="store-results"]').attributes('style')).toBeUndefined()
	})
})
