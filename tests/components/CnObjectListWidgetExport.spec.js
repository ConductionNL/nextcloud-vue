/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `content.export` offers the filtered list as a download in the card's
 * header (DqZaakAssistent "Downloaden"), through OpenRegister's export, and
 * `group` keeps the button to one group's members ("only the AI oversight
 * role"). The export endpoint still applies its own read rights.
 */
import { flushPromises, shallowMount } from '@vue/test-utils'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'
import { getCurrentUserGroups } from '../../src/utils/widgetVisibility.js'

jest.mock('../../src/utils/widgetVisibility.js', () => ({
	__esModule: true,
	getCurrentUserGroups: jest.fn(),
}))

function mountList(content) {
	return shallowMount(CnObjectListWidget, {
		propsData: {
			content: { register: 'hermiq', schema: 'approval', filter: { 'advisoryContext.subjectId': '@objectId' }, columns: [{ key: 'prompt', label: 'Question' }], ...content },
		},
		provide: { cnTranslate: (key) => ({ Download: 'Downloaden' }[key] ?? key), cnObjectContext: { objectId: 'case-1', object: { id: 'case-1' } } },
		stubs: { CnDataTable: true },
	})
}

const headers = (w) => (w.emitted('header') || []).map(([header]) => header)

beforeEach(() => {
	getCurrentUserGroups.mockReset()
	getCurrentUserGroups.mockResolvedValue(['ai-oversight'])
})

describe('CnObjectListWidget — export', () => {
	it('offers no export unless the content asks for one', async () => {
		const w = mountList({})
		await flushPromises()
		expect(headers(w)).toEqual([])
	})

	it('reports a Download action that exports the list as filtered here', async () => {
		const w = mountList({ export: { label: 'Download' } })
		await flushPromises()
		const [header] = headers(w)
		expect(header.action.label).toBe('Downloaden')
		expect(typeof header.action.run).toBe('function')
		const url = w.vm.exportUrl('csv')
		expect(url).toContain('/apps/openregister/api/objects/hermiq/approval/export')
		expect(url).toContain('format=csv')
		expect(decodeURIComponent(url)).toContain('advisoryContext.subjectId=case-1')
	})

	it('shows it to members of the named group only', async () => {
		const member = mountList({ export: { group: 'ai-oversight' } })
		await flushPromises()
		expect(headers(member)).toHaveLength(1)

		getCurrentUserGroups.mockResolvedValue(['handlers'])
		const other = mountList({ export: { group: 'ai-oversight' } })
		await flushPromises()
		expect(headers(other)).toEqual([])
	})
})
