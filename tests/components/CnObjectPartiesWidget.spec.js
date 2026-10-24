/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnObjectPartiesWidget — a record's parties by role, primary first, each
 * indicator with its verdict, the blocking ones also as notes. Ported from
 * dossiq's CasePartiesWidget specs (partyCorrespondence, pipelinqCaseSurfaces).
 *
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-record-shows-its-parties-by-role
 */
var mockGet = jest.fn()

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url, params = {}) => url.replace(/\{(\w+)\}/g, (_m, k) => params[k] ?? `{${k}}`) }))

import { mount } from '@vue/test-utils'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'

import '../../src/components/CnObjectPartiesWidget/index.js'

const CnObjectPartiesWidget = require('../../src/components/CnObjectPartiesWidget/CnObjectPartiesWidget.vue').default

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const LISTING = {
	primary: 'p-jan',
	roles: [],
	kinds: [{ key: 'person', label: 'Person' }],
	byRole: {
		interested: [{ partyUuid: 'p-council', displayName: 'Gemeente Utrecht' }],
		applicant: [{ partyUuid: 'p-mr', displayName: 'Mr. Advocaat' }, { partyUuid: 'p-jan', displayName: 'Jan Jansen', partyKind: 'person' }],
	},
	results: [
		{ partyUuid: 'p-jan', displayName: 'Jan Jansen' },
		{ partyUuid: 'p-mr', displayName: 'Mr. Advocaat' },
		{ partyUuid: 'p-council', displayName: 'Gemeente Utrecht' },
	],
}

const CONTENT = {
	rolesObjects: { register: 'x', schema: 'role', field: 'item' },
	roleLabels: { applicant: 'Requester', interested: 'Interested party' },
	kindsSource: { url: '/apps/x/api/items/@objectId/party-kinds', enforce: 'crm', sourceText: { crm: 'Kinds from the CRM' } },
	extraLines: [{
		endpoint: '/apps/x/api/items/@objectId/parties/{party}/language',
		valueLabels: { language: { nl: 'Dutch' } },
		lines: [{ when: { field: 'stated', op: 'eq', value: true }, text: 'Writing language: {language}. Asked for by the party.' }, { text: 'Writing language: {language}.' }],
	}],
	correspondence: { endpoint: '/apps/x/api/items/@objectId/dossier', path: 'documents' },
}

function serve(overrides = {}) {
	mockGet.mockImplementation((url) => {
		const routes = {
			'/apps/openregister/api/objects/x/item/r-1/parties': LISTING,
			'/apps/openregister/api/parties/p-jan': { id: 'p-jan', name: 'Jan Jansen', indicators: [] },
			'/apps/openregister/api/parties/p-mr': { id: 'p-mr', name: 'Mr. Advocaat', indicators: [{ key: 'warn', label: 'Read first', effect: 'warn' }] },
			'/apps/openregister/api/parties/p-council': { id: 'p-council', name: 'Gemeente Utrecht', indicators: [{ key: 'secret', label: 'Secrecy', effect: 'refuse-publication' }] },
			'/apps/openregister/api/objects/x/role': { results: [{ participant: 'p-mr', representedParty: 'p-jan' }] },
			'/apps/x/api/items/r-1/party-kinds': { source: 'crm', kinds: [{ code: 'organisation', label: 'Organisation' }] },
			'/apps/x/api/items/r-1/parties/p-jan/language': { language: 'nl', stated: true },
			'/apps/x/api/items/r-1/dossier': { documents: [{ sender: 'p-jan', recipients: [] }, { sender: '', recipients: ['p-jan'] }] },
			...overrides,
		}
		if (Object.hasOwn(routes, url)) {
			return routes[url] instanceof Error ? Promise.reject(routes[url]) : Promise.resolve({ data: routes[url] })
		}
		return Promise.reject(new Error(`404 ${url}`))
	})
}

async function mountParties(content = CONTENT) {
	const wrapper = mount(CnObjectPartiesWidget, {
		props: { content, objectId: 'r-1', register: 'x', schema: 'item' },
		global: { stubs: { NcLoadingIcon: true, NcEmptyContent: { props: ['name', 'description'], template: '<div class="empty">{{ name }} {{ description }}</div>' }, NcNoteCard: { props: ['type'], template: '<div class="note" :data-type="type"><slot /></div>' } } },
	})
	await flush()
	return wrapper
}

beforeEach(() => mockGet.mockReset())

describe('CnObjectPartiesWidget', () => {
	it('registers the parties type for detail pages', () => {
		expect(getWidgetTypeEntry('parties').renderer).toBe(CnObjectPartiesWidget)
	})

	it('puts the primary party and its role first, in the app\'s words', async () => {
		serve()
		const w = await mountParties()
		const roles = w.findAll('[data-testid="cn-object-parties-role"]')
		expect(roles[0].attributes('data-role')).toBe('applicant')
		expect(roles[0].find('h4').text()).toBe('Requester')
		expect(roles[0].findAll('[data-testid="cn-object-parties-party"]')[0].text()).toContain('Jan Jansen')
		expect(w.find('[data-testid="cn-object-parties-primary"]').exists()).toBe(true)
	})

	it('names who represents a party', async () => {
		serve()
		const w = await mountParties()
		expect(w.find('[data-party="p-mr"] [data-testid="cn-object-parties-represented"]').text()).toContain('Jan Jansen')
	})

	it('gives every indicator its verdict, and puts a blocking one above the list', async () => {
		serve()
		const w = await mountParties()
		expect(w.find('[data-party="p-mr"] [data-testid="cn-object-parties-indicator"]').text()).toContain('Read first ·')
		const notes = w.findAll('[data-testid="cn-object-parties-verdict"]')
		expect(notes).toHaveLength(1)
		expect(notes[0].attributes('data-effect')).toBe('refuse-publication')
		expect(notes[0].text()).toContain('because of Gemeente Utrecht')
	})

	it('marks a kind the record does not accept, from the enforcing source only', async () => {
		serve()
		const w = await mountParties()
		expect(w.find('[data-party="p-jan"] [data-testid="cn-object-parties-not-accepted"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-object-parties-accepted"]').text()).toContain('Kinds from the CRM')
		serve({ '/apps/x/api/items/r-1/party-kinds': { source: 'own', kinds: [{ code: 'organisation' }] } })
		const other = await mountParties()
		expect(other.find('[data-testid="cn-object-parties-not-accepted"]').exists()).toBe(false)
	})

	it('draws the extra line that applies, with the coded value labelled', async () => {
		serve()
		const w = await mountParties()
		expect(w.find('[data-party="p-jan"] [data-testid="cn-object-parties-extra-line"]').text()).toBe('Writing language: Dutch. Asked for by the party.')
	})

	it('counts the documents a party sent and received', async () => {
		serve()
		const w = await mountParties()
		expect(w.find('[data-party="p-jan"] [data-testid="cn-object-parties-documents"]').text()).toBe('1 sent, 1 received')
	})

	it('reads the dossier once for the whole list, and draws no line for a party nobody corresponded with', async () => {
		serve()
		const w = await mountParties()
		expect(mockGet.mock.calls.filter(([url]) => url.endsWith('/dossier'))).toHaveLength(1)
		expect(w.find('[data-party="p-council"] [data-testid="cn-object-parties-documents"]').exists()).toBe(false)
	})

	it('drops the correspondence line rather than claiming nobody wrote when the read fails', async () => {
		serve({ '/apps/x/api/items/r-1/dossier': new Error('500') })
		const w = await mountParties()
		expect(w.findAll('[data-testid="cn-object-parties-documents"]')).toHaveLength(0)
		expect(w.findAll('[data-testid="cn-object-parties-party"]').length).toBeGreaterThan(0)
	})

	it('says a failed read failed, never that there are no parties', async () => {
		serve({ '/apps/openregister/api/objects/x/item/r-1/parties': new Error('500') })
		const w = await mountParties()
		expect(w.find('[data-testid="cn-object-parties-failed"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-object-parties-empty"]').exists()).toBe(false)
	})

	it('says there are none when the listing is empty', async () => {
		serve({ '/apps/openregister/api/objects/x/item/r-1/parties': { byRole: {}, results: [] } })
		const w = await mountParties()
		expect(w.find('[data-testid="cn-object-parties-empty"]').exists()).toBe(true)
	})
})

describe('CnObjectPartiesWidget presentation "primary"', () => {
	const ORG_LISTING = {
		primary: 'p-marja',
		total: 2,
		roles: [{ key: 'chair', label: 'Chair' }, { key: 'secretary', label: 'Secretary' }],
		byRole: {
			chair: [{ partyUuid: 'p-marja', displayName: 'Marja Verbeek', role: 'chair', email: 'marja.verbeek@zuiddrecht.example' }],
			secretary: [{ partyUuid: 'p-kees', displayName: 'Kees de Wit', role: 'secretary' }],
		},
		results: [
			{ partyUuid: 'p-kees', displayName: 'Kees de Wit', role: 'secretary' },
			{ partyUuid: 'p-marja', displayName: 'Marja Verbeek', role: 'chair', email: 'marja.verbeek@zuiddrecht.example' },
		],
	}
	const PRIMARY = {
		presentation: 'primary',
		roleLabels: { chair: 'Voorzitter' },
		link: { label: 'Alle {total} contactpersonen', tab: 'contact-persons' },
	}

	function serveOrg(listing) {
		mockGet.mockImplementation((url) => (url === '/apps/openregister/api/objects/x/item/r-1/parties'
			? (listing instanceof Error ? Promise.reject(listing) : Promise.resolve({ data: listing }))
			: Promise.reject(new Error(`404 ${url}`))))
	}

	it('shows the primary party as a lead with its role, its e-mail and the link to all of them', async () => {
		serveOrg(ORG_LISTING)
		const w = await mountParties(PRIMARY)
		const lead = w.find('[data-testid="cn-object-parties-main"]')
		expect(lead.exists()).toBe(true)
		expect(lead.find('[data-testid="cn-object-parties-main-initials"]').text()).toBe('MV')
		expect(lead.find('[data-testid="cn-object-parties-main-name"]').text()).toBe('Marja Verbeek')
		expect(lead.find('[data-testid="cn-object-parties-main-role"]').text()).toBe('Voorzitter')
		const mail = w.find('[data-testid="cn-object-parties-main-email"]')
		expect(mail.attributes('href')).toBe('mailto:marja.verbeek@zuiddrecht.example')
		expect(mail.text()).toBe('marja.verbeek@zuiddrecht.example')
		const link = w.find('[data-testid="cn-object-parties-main-link"]')
		expect(link.text()).toBe('Alle 2 contactpersonen')
		expect(link.attributes('href')).toBe('#contact-persons')
		expect(w.find('[data-testid="cn-object-parties-role"]').exists()).toBe(false)
	})

	it('reads the listing only, no party records', async () => {
		serveOrg(ORG_LISTING)
		await mountParties(PRIMARY)
		expect(mockGet).toHaveBeenCalledTimes(1)
	})

	it('takes the role label the listing declares when the app names none', async () => {
		serveOrg(ORG_LISTING)
		const w = await mountParties({ ...PRIMARY, roleLabels: {} })
		expect(w.find('[data-testid="cn-object-parties-main-role"]').text()).toBe('Chair')
	})

	it('says there is no main contact, and still links to the parties', async () => {
		serveOrg({ ...ORG_LISTING, primary: null })
		const w = await mountParties(PRIMARY)
		expect(w.find('[data-testid="cn-object-parties-main"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-object-parties-main-none"]').text()).toBe('No main contact yet')
		expect(w.find('[data-testid="cn-object-parties-main-link"]').text()).toBe('Alle 2 contactpersonen')
	})

	it('draws no foot link when the record has no parties', async () => {
		serveOrg({ primary: null, total: 0, byRole: {}, results: [], roles: [] })
		const w = await mountParties(PRIMARY)
		expect(w.find('[data-testid="cn-object-parties-main-none"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-object-parties-main-link"]').exists()).toBe(false)
	})

	it('says a failed read failed, never "no main contact"', async () => {
		serveOrg(new Error('500'))
		const w = await mountParties(PRIMARY)
		expect(w.find('[data-testid="cn-object-parties-failed"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-object-parties-main-none"]').exists()).toBe(false)
	})
})
