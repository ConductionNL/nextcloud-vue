/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The `type: "connections"` page (PqIntegrations): one app's connections from
 * integriq as status cards, status chips with counts, a text filter, and the
 * three aside cards. The app comes from the config, so the route opened
 * without `?app=` still lists that app only.
 *
 * @spec openspec/changes/connection-registry-page/specs/connection-registry-page/spec.md#requirement-the-page-lists-one-apps-connections
 * @spec openspec/changes/connection-registry-page/specs/connection-registry-page/spec.md#requirement-status-chips-count-and-filter-the-cards
 * @spec openspec/changes/connection-registry-page/specs/connection-registry-page/spec.md#requirement-a-connection-is-a-status-card
 */
jest.mock('@nextcloud/l10n', () => {
	const fill = (text, params = {}) => text.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`)
	return {
		translate: (app, text, params) => fill(text, params),
		translatePlural: (app, one, many, count, params) => fill(count === 1 ? one : many, params).replace('%n', String(count)),
	}
})

const { mount } = require('@vue/test-utils')
const CnConnectionRegistry = require('../../src/components/CnConnectionRegistry/CnConnectionRegistry.vue').default
const { defaultPageTypes } = require('../../src/components/CnPageRenderer/pageTypes.js')
const { validateManifestV2 } = require('../../src/utils/validateManifest.js')

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const ROWS = [
	{ id: 'a', app: 'pipelinq', title: 'Telephony (CTI)', description: 'Screen pop.', status: 'configured', statusMessage: 'Asterisk answers.', checkedAt: '2026-10-07T08:12:00Z', settingsUrl: '/settings/admin/pipelinq#section-cti', order: 10, declaration: { kind: 'Telephony' } },
	{ id: 'b', app: 'pipelinq', title: 'Bluesky', description: 'Posts.', status: 'unconfigured', statusMessage: 'Not checked yet.', settingsUrl: '/apps/pipelinq/social-accounts', order: 30 },
	{ id: 'c', app: 'pipelinq', title: 'LinkedIn', status: 'limited', statusMessage: 'The company page needs admin rights.', checkedAt: '2026-10-05T11:02:00Z', order: 20 },
	{ id: 'd', app: 'pipelinq', title: 'Facebook page', status: 'error', statusMessage: 'The page token expired.', checkedAt: '2026-10-07T06:00:00Z', settingsUrl: 'https://example.org/fb', order: 40 },
	{ id: 'e', app: 'dossiq', title: 'Someone else', status: 'configured', order: 1 },
]

/**
 * @param {object} props Props.
 * @param {object} route The route.
 * @return {Promise<object>}
 */
async function make(props = {}, route = { query: {} }) {
	global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ results: ROWS, total: ROWS.length }) }))
	const wrapper = mount(CnConnectionRegistry, {
		props,
		global: {
			mocks: { $route: route },
			stubs: { NcTextField: { props: ['modelValue'], template: '<input class="search" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)">' }, NcButton: { props: ['href'], template: '<a :href="href"><slot /></a>' }, CnIcon: true },
		},
	})
	await flush()
	await flush()
	return wrapper
}

const cards = (wrapper) => wrapper.findAll('[data-testid="cn-connection-card"]')

describe('CnConnectionRegistry', () => {
	it('is the `connections` page type', () => {
		expect(defaultPageTypes.connections).toBeDefined()
	})

	it('validates a `connections` page in the manifest', () => {
		const manifest = {
			$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
			version: '1.0.0',
			menu: [{ id: 'Integrations', label: 'Integrations', route: 'Integrations' }],
			pages: [{ id: 'Integrations', route: '/settings/integrations', type: 'connections', title: 'Integrations', config: { app: 'pipelinq', appName: 'Pipelinq', addUrl: '/apps/integriq/connections?app=pipelinq' } }],
		}
		expect(validateManifestV2(manifest).errors).toEqual([])
	})

	it('lists the configured app only, also without ?app= in the route', async () => {
		const wrapper = await make({ page: { title: 'Integrations', config: { app: 'pipelinq' } } })
		expect(global.fetch.mock.calls[0][0]).toContain('/apps/openregister/api/objects/integriq/app_connection?')
		expect(global.fetch.mock.calls[0][0]).toContain('app=pipelinq')
		expect(cards(wrapper).map((c) => c.find('h3').text())).toEqual(['Telephony (CTI)', 'LinkedIn', 'Bluesky', 'Facebook page'])
	})

	it('says how many connections the app declares, and fits an admin tab without its heading', async () => {
		const wrapper = await make({ app: 'pipelinq', appName: 'Pipelinq', showTitle: false, footnote: 'The same page in every app.' })
		expect(wrapper.find('[data-testid="cn-connection-registry-summary"]').text()).toBe('4 of 4 connections that Pipelinq declares, checked by integriq')
		expect(wrapper.find('.cn-connection-registry__title').exists()).toBe(false)
		expect(wrapper.find('.cn-connection-registry__footnote').text()).toBe('The same page in every app.')
	})

	it('falls back to ?app= when the config names no app', async () => {
		const wrapper = await make({}, { query: { app: 'dossiq' } })
		expect(global.fetch.mock.calls[0][0]).toContain('app=dossiq')
		expect(cards(wrapper).map((c) => c.find('h3').text())).toEqual(['Someone else'])
	})

	it('counts every status on a chip and filters the cards by it', async () => {
		const wrapper = await make({ app: 'pipelinq' })
		const chips = wrapper.findAll('[data-testid="cn-connection-registry-chip"]')
		expect(chips.map((c) => c.text().replace(/\s+/g, ' '))).toEqual(['All connections 4', 'Set up 1', 'Limited 1', 'Not set 1', 'Error 1'])
		await chips[4].trigger('click')
		expect(chips[4].attributes('aria-pressed')).toBe('true')
		expect(cards(wrapper).map((c) => c.find('h3').text())).toEqual(['Facebook page'])
	})

	it('filters the cards by text', async () => {
		const wrapper = await make({ app: 'pipelinq' })
		await wrapper.find('input.search').setValue('token')
		expect(cards(wrapper).map((c) => c.find('h3').text())).toEqual(['Facebook page'])
	})

	it('draws a card with its kind, last check, status, message and settings action', async () => {
		const wrapper = await make({ app: 'pipelinq' })
		const [cti, linkedin, bluesky] = cards(wrapper)
		expect(cti.find('[data-testid="cn-connection-card-meta"]').text()).toMatch(/^Telephony · checked /)
		expect(cti.find('[data-testid="cn-connection-card-status"]').text()).toBe('Set up')
		expect(cti.text()).toContain('Asterisk answers.')
		expect(cti.find('[data-testid="cn-connection-card-action"]').text()).toBe('Open settings')
		expect(cti.find('[data-testid="cn-connection-card-action"]').attributes('href')).toContain('/settings/admin/pipelinq#section-cti')
		expect(linkedin.find('[data-testid="cn-connection-card-action"]').exists()).toBe(false)
		expect(linkedin.text()).toContain('No settings screen yet')
		expect(bluesky.find('[data-testid="cn-connection-card-meta"]').text()).toBe('never checked')
		expect(bluesky.find('[data-testid="cn-connection-card-action"]').text()).toBe('Set up')
	})

	it('lists what needs attention and when integriq last checked', async () => {
		const wrapper = await make({ app: 'pipelinq' })
		const attention = wrapper.find('[data-testid="cn-connection-registry-attention"]')
		expect(attention.findAll('li').map((li) => li.find('.cn-connection-registry__attention-name').text())).toEqual(['LinkedIn', 'Facebook page'])
		expect(wrapper.find('[data-testid="cn-connection-registry-checked"]').text()).toContain('Last check')
		expect(wrapper.find('[data-testid="cn-connection-registry-add-help"]').exists()).toBe(true)
	})

	it('draws the add button only when the config gives it a target', async () => {
		expect((await make({ app: 'pipelinq' })).find('[data-testid="cn-connection-registry-add"]').exists()).toBe(false)
		const wrapper = await make({ page: { config: { app: 'pipelinq', addUrl: '/apps/integriq/connections' } } })
		expect(wrapper.find('[data-testid="cn-connection-registry-add"]').text()).toBe('Add integration')
	})

	it('mounts without a router, as an admin settings tab does', async () => {
		global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ results: ROWS }) }))
		const wrapper = mount(CnConnectionRegistry, { props: { app: 'pipelinq' }, global: { stubs: { NcTextField: true, CnIcon: true } } })
		await flush()
		await flush()
		expect(cards(wrapper)).toHaveLength(4)
	})

	it('says so when the connections cannot be loaded', async () => {
		global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500, statusText: 'Server error' }))
		const wrapper = mount(CnConnectionRegistry, { props: { app: 'pipelinq' }, global: { mocks: { $route: { query: {} } }, stubs: { NcTextField: true, CnIcon: true } } })
		await flush()
		await flush()
		expect(wrapper.find('[data-testid="cn-connection-registry-error"]').text()).toContain('Server error')
	})
})
