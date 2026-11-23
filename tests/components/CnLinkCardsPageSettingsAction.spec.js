/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A link card that opens the user settings dialog, and the panel badge's tone
 * (board PqGeavanceerdHub: "Persoonlijke instellingen", "Alleen voor jou";
 * "Alleen beheerders" in the purple tone).
 *
 * @spec openspec/changes/link-cards-settings-action/specs/link-cards-page/spec.md#requirement-a-link-card-can-open-the-user-settings
 * @spec openspec/changes/link-cards-settings-action/specs/link-cards-page/spec.md#requirement-the-panel-badge-takes-a-tone
 */
import fs from 'fs'
import path from 'path'

jest.mock('@nextcloud/capabilities', () => ({ getCapabilities: jest.fn(() => ({})) }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => '/index.php' + url }))
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(() => Promise.resolve({ data: {} })) } }))

const { mount } = require('@vue/test-utils')
const CnLinkCardsPage = require('../../src/components/CnLinkCardsPage/CnLinkCardsPage.vue').default

const router = {
	resolve: (to) => ({ href: '/apps/pipelinq' + (to.path ?? '/' + String(to.name).toLowerCase()) }),
	push: jest.fn(() => Promise.resolve()),
}

function mountPage(config, provide = {}) {
	return mount(CnLinkCardsPage, {
		props: config,
		global: {
			provide: { cnPermissions: ['admin'], cnManifest: { runtime: {} }, ...provide },
			mocks: { $router: router },
			stubs: { CnIcon: true, InformationOutline: true, ChevronRight: true, OpenInNew: true },
		},
	})
}

const settingsCard = { id: 'Personal', label: 'Personal settings', action: 'user-settings', status: 'Only for you' }

describe('CnLinkCardsPage settings action', () => {
	it('opens the user settings dialog from a card with action user-settings', async () => {
		const open = jest.fn()
		const wrapper = mountPage({ cards: [settingsCard] }, { cnOpenUserSettings: open })
		const card = wrapper.find('[data-card-id="Personal"]')
		expect(card.exists()).toBe(true)
		expect(card.attributes('role')).toBe('button')
		expect(card.attributes('target')).toBeUndefined()
		expect(card.find('[data-testid="cn-link-card-status"]').text()).toBe('Only for you')
		await card.trigger('click')
		expect(open).toHaveBeenCalledTimes(1)
		expect(router.push).not.toHaveBeenCalled()
	})

	it('opens it from the keyboard with the space key', async () => {
		const open = jest.fn()
		const wrapper = mountPage({ cards: [settingsCard] }, { cnOpenUserSettings: open })
		await wrapper.find('[data-card-id="Personal"]').trigger('keydown', { key: ' ' })
		expect(open).toHaveBeenCalledTimes(1)
	})

	it('leaves the card out when no host offers the dialog', () => {
		const wrapper = mountPage({ cards: [settingsCard, { id: 'Store', label: 'Store', route: 'Store' }] })
		expect(wrapper.find('[data-card-id="Personal"]').exists()).toBe(false)
		expect(wrapper.find('[data-card-id="Store"]').exists()).toBe(true)
	})

	it('draws the panel badge in its tone, primary by default', () => {
		const purple = mountPage({ cards: [settingsCard], panel: { badge: { label: 'Administrators only', tone: 'purple' } } }, { cnOpenUserSettings: jest.fn() })
		expect(purple.find('[data-testid="cn-link-cards-panel-badge"]').classes()).toContain('cn-link-cards-page__panel-badge--purple')
		const plain = mountPage({ cards: [settingsCard], panel: { badge: { label: 'Administrators only' } } }, { cnOpenUserSettings: jest.fn() })
		expect(plain.find('[data-testid="cn-link-cards-panel-badge"]').classes()).toContain('cn-link-cards-page__panel-badge--primary')
	})
})

describe('CnLinkCardsPage board look trailing and badge', () => {
	const vue = fs.readFileSync(path.join(__dirname, '../../src/components/CnLinkCardsPage/CnLinkCardsPage.vue'), 'utf8')
	const board = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

	it('keeps the trailing icon at the top of the card, as the board draws it', () => {
		const rule = board.match(/\.cn-link-cards-page__trailing \{([^}]*)\}/)
		expect(rule[1]).toContain('align-self: flex-start;')
	})

	it('sizes the badge to the board pill: a 14px icon on a normal line', () => {
		expect(vue).toMatch(/:name="resolvedPanel\.badgeIcon"\s*:size="14"/)
		const rule = vue.match(/\.cn-link-cards-page__panel-badge \{([^}]*)\}/)
		expect(rule[1]).toContain('line-height: normal;')
		expect(vue).toContain('.cn-link-cards-page__panel-badge--purple {\n\tbackground: var(--cn-status-purple-bg);\n\tcolor: var(--cn-status-purple-text);')
	})
})
