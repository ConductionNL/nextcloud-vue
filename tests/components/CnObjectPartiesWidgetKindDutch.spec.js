/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * OpenRegister's parties listing labels its built-in kinds in English
 * (Person, Organisation, Colleague, Address). DqZaakBetrokkenen r36 printed
 * them as such in the Dutch Rollen rows ("Verzoeker · Person"); the library
 * now names a built-in kind in the reader's language.
 *
 * @spec openspec/changes/party-kind-in-the-readers-language/specs/object-parties/spec.md
 */
var mockGet = jest.fn()

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }))
jest.mock('@nextcloud/event-bus', () => ({ __esModule: true, emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url, params = {}) => url.replace(/\{(\w+)\}/g, (_m, k) => params[k] ?? `{${k}}`) }))

import { mount } from '@vue/test-utils'

import '../../src/components/CnObjectPartiesWidget/index.js'
import { registerTranslations } from '../../src/l10n/index.js'

const CnObjectPartiesWidget = require('../../src/components/CnObjectPartiesWidget/CnObjectPartiesWidget.vue').default

const LISTING = {
	primary: '',
	roles: [{ key: 'r-adviser', label: 'Adviseur' }, { key: 'r-reporter', label: 'Melder' }],
	kinds: [{ key: 'colleague', label: 'Colleague' }, { key: 'organisation', label: 'Organisation' }],
	byRole: {
		'r-adviser': [{ partyUuid: 'p-lars', displayName: 'Lars de Koning', partyKind: 'colleague' }],
		'r-reporter': [{ partyUuid: 'p-bl', displayName: 'Bewonersvereniging Lindelaan', partyKind: 'organisation' }],
	},
	results: [],
}

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

describe('a party kind in the reader\'s language', () => {
	beforeAll(() => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()
	})

	afterAll(() => {
		globalThis._nc_l10n_language = 'en'
	})

	it('names OpenRegister\'s built-in kinds in Dutch on the board rows', async () => {
		mockGet.mockImplementation((url) => (url === '/apps/openregister/api/objects/x/item/r-1/parties'
			? Promise.resolve({ data: LISTING })
			: Promise.reject(new Error(`404 ${url}`))))
		const wrapper = mount(CnObjectPartiesWidget, {
			props: { content: {}, objectId: 'r-1', register: 'x', schema: 'item' },
			global: { provide: { cnLook: 'board' }, stubs: { NcLoadingIcon: true, NcEmptyContent: true, NcNoteCard: true } },
		})
		await flush()
		const text = wrapper.text()
		expect(text).toContain('Collega')
		expect(text).toContain('Organisatie')
		expect(text).not.toContain('Colleague')
		expect(text).not.toContain('Organisation')
	})
})
