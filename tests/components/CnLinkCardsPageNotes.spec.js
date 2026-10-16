/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnLinkCardsPage as PqGeavanceerdHub draws it: a note chip with a tone on a
 * card, from a static text or from counts ("7 active, 2 paused"), a trailing
 * chevron on an in-app card and an external-link icon on an external one, a
 * card that opens the user settings modal, and a panel under the cards that
 * only administrators see.
 *
 * @spec openspec/changes/link-cards-notes/specs/link-cards-page/spec.md#requirement-a-card-can-carry-a-note-with-a-tone
 * @spec openspec/changes/link-cards-notes/specs/link-cards-page/spec.md#requirement-a-card-ends-in-a-chevron-or-an-external-link-icon
 * @spec openspec/changes/link-cards-notes/specs/link-cards-page/spec.md#requirement-a-card-can-open-the-user-settings
 * @spec openspec/changes/link-cards-notes/specs/link-cards-page/spec.md#requirement-an-admin-panel-under-the-cards
 */
import { getCurrentUser } from '@nextcloud/auth'
import { mount } from '@vue/test-utils'
import CnLinkCardsPage from '../../src/components/CnLinkCardsPage/CnLinkCardsPage.vue'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

jest.mock('@nextcloud/capabilities', () => ({ getCapabilities: jest.fn(() => ({})) }))
jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn(() => ({ uid: 'admin', isAdmin: true })) }))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const FLOWS = { register: 'pipelinq', schema: 'flow' }

const cards = [
	{ id: 'Reports', label: 'Reports', route: 'Reports', note: 'card.reports.note' },
	{
		id: 'Flows',
		label: 'Flows',
		route: 'Flows',
		note: { text: '{active} active, {paused} paused', tone: 'success', counts: { active: { ...FLOWS, filter: { status: 'active' } }, paused: { ...FLOWS, filter: { status: 'paused' } } } },
	},
	{
		id: 'Integrations',
		label: 'Integrations',
		route: 'Integrations',
		note: [
			{ text: '{errors} connections have an error', textOne: '{errors} connection has an error', tone: 'error', when: 'errors', counts: { errors: { register: 'integriq', schema: 'app_connection', filter: { app: 'pipelinq', status: 'error' } } } },
			{ text: 'All connections checked' },
		],
	},
	{ id: 'Docs', label: 'Documentation', href: 'https://docs.example.org', note: { text: 'Opens in a new tab' } },
	{ id: 'Personal', label: 'Personal settings', action: 'user-settings', note: { text: 'Only for you' } },
]

/**
 * A fetch that answers a `_limit=1` list request with a total per status.
 *
 * @param {object} totals Status to total.
 * @return {jest.Mock}
 */
function mockTotals(totals) {
	return jest.fn((url) => {
		const status = new URL(url, 'http://x').searchParams.get('status')
		return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ results: [], total: totals[status] ?? 0 }) })
	})
}

/**
 * @param {object} [props] Extra props.
 * @param {object} [provide] Extra provides.
 * @return {Promise<object>}
 */
async function mountPage(props = {}, provide = {}) {
	const $router = {
		resolve: jest.fn((to) => ({ href: '/index.php/apps/x/' + String(to.name || to.path).toLowerCase() })),
		push: jest.fn(() => Promise.resolve()),
	}
	const wrapper = mount(CnLinkCardsPage, {
		propsData: { cards, ...props },
		global: {
			provide: { cnTranslate: (key) => ({ 'card.reports.note': '7 reports' }[key] ?? key), cnOpenUserSettings: jest.fn(), ...provide },
			mocks: { $router },
		},
	})
	await flush()
	await flush()
	return wrapper
}

const card = (wrapper, id) => wrapper.find(`[data-card-id="${id}"]`)
const note = (wrapper, id) => card(wrapper, id).find('[data-testid="cn-link-card-note"]')

describe('CnLinkCardsPage notes, trailing icons, user settings and admin panel', () => {
	beforeEach(() => {
		global.fetch = mockTotals({ active: 7, paused: 2, error: 1 })
	})

	it('shows a static note, translated, as a neutral chip', async () => {
		const wrapper = await mountPage()
		expect(note(wrapper, 'Reports').text()).toBe('7 reports')
		expect(note(wrapper, 'Reports').classes()).toContain('cn-status-badge--default')
	})

	it('fills a note from its counts and draws it in its tone', async () => {
		const wrapper = await mountPage()
		expect(note(wrapper, 'Flows').text()).toBe('7 active, 2 paused')
		expect(note(wrapper, 'Flows').classes()).toContain('cn-status-badge--success')
		const urls = global.fetch.mock.calls.map(([url]) => url)
		expect(urls.some((url) => url.includes('/objects/pipelinq/flow?') && url.includes('status=active') && url.includes('_limit=1'))).toBe(true)
	})

	it('takes the first note whose count is above zero, in the singular for one', async () => {
		const wrapper = await mountPage()
		expect(note(wrapper, 'Integrations').text()).toBe('1 connection has an error')
		expect(note(wrapper, 'Integrations').classes()).toContain('cn-status-badge--error')
		global.fetch = mockTotals({ error: 0 })
		const calm = await mountPage()
		expect(note(calm, 'Integrations').text()).toBe('All connections checked')
	})

	it('ends an in-app card in a chevron and an external card in an external-link icon', async () => {
		const wrapper = await mountPage()
		expect(card(wrapper, 'Reports').find('[data-testid="cn-link-card-trailing"]').attributes('data-trailing')).toBe('chevron')
		expect(card(wrapper, 'Docs').find('[data-testid="cn-link-card-trailing"]').attributes('data-trailing')).toBe('external')
	})

	it('opens the user settings modal from a user-settings card', async () => {
		const open = jest.fn()
		const wrapper = await mountPage({}, { cnOpenUserSettings: open })
		await card(wrapper, 'Personal').trigger('click')
		expect(open).toHaveBeenCalledTimes(1)
	})

	it('leaves the user-settings card out without a modal to open', async () => {
		const wrapper = await mountPage({}, { cnOpenUserSettings: null })
		expect(card(wrapper, 'Personal').exists()).toBe(false)
	})

	it('shows the admin panel to an administrator only', async () => {
		const adminPanel = { text: 'The menu choice applies to everyone.', href: '/settings/admin/pipelinq', linkLabel: 'Open admin settings' }
		const wrapper = await mountPage({ adminPanel })
		const panel = wrapper.find('[data-testid="cn-link-cards-admin"]')
		expect(panel.text()).toContain('Administrators only')
		expect(panel.text()).toContain('The menu choice applies to everyone.')
		expect(panel.find('a').attributes('href')).toContain('/settings/admin/pipelinq')
		getCurrentUser.mockReturnValueOnce({ uid: 'u', isAdmin: false })
		const user = await mountPage({ adminPanel })
		expect(user.find('[data-testid="cn-link-cards-admin"]').exists()).toBe(false)
	})

	it('validates a links page with notes, a user-settings card and an admin panel', () => {
		const manifest = {
			$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
			version: '1.0.0',
			menu: [{ id: 'Advanced', label: 'Advanced', route: 'Advanced' }],
			pages: [{ id: 'Advanced', route: '/advanced', type: 'links', title: 'Advanced', config: { cards, adminPanel: { text: 'x', href: '/settings/admin/pipelinq', component: 'MenuStructureSettings' } } }],
		}
		const result = validateManifestV2(manifest)
		expect(result.errors).toEqual([])
	})
})
