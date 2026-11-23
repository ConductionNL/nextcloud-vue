/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record list can group its rows by a field, with a heading per group
 * (DqZaakGerelateerd: "Onderwerp van deze zaak", "Wacht op", "Gepland
 * vervolg").
 *
 * @spec openspec/changes/record-list-group-headings/specs/record-list/spec.md#requirement-a-record-list-can-group-its-rows-under-headings
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path, vars) => path.replace(/\{(\w+)\}/g, (_, k) => vars[k]) }))

const ROWS = [
	{ id: 'r-1', title: 'Melding lantaarnpaal', kind: 'waitsOn' },
	{ id: 'r-2', title: 'Aanvraag verlichting', kind: 'subject' },
	{ id: 'r-3', title: 'Controle na plaatsing', kind: 'followUp' },
	{ id: 'r-4', title: 'Bezwaar buurman', kind: 'waitsOn' },
	{ id: 'r-5', title: 'Losse notitie' },
]

async function render(content, translate) {
	axios.get.mockResolvedValue({ data: { results: ROWS, total: ROWS.length } })
	const wrapper = mount(CnRecordListWidget, {
		props: { content: { register: 'r', schema: 'relation', title: '{title}', ...content } },
		global: { provide: translate ? { cnTranslate: translate } : {}, stubs: { NcLoadingIcon: true } },
	})
	await flushPromises()
	await flushPromises()
	return wrapper
}

/**
 * The groups as drawn: each list with the heading that names it and the
 * titles of its rows.
 *
 * @param {object} wrapper The mounted widget.
 * @return {Array<{heading: string|null, titles: Array<string>}>} The groups.
 */
function groupsOf(wrapper) {
	return wrapper.findAll('[data-testid="cn-record-list-group"]').map((group) => {
		const id = group.attributes('aria-labelledby')
		const heading = id ? wrapper.find(`#${id}`) : null
		return {
			heading: heading && heading.exists() ? heading.text() : null,
			titles: group.findAll('[data-testid="cn-record-list-item"]').map((item) => item.find('.cn-record-list__title').text()),
		}
	})
}

describe('CnRecordListWidget groupBy', () => {
	beforeEach(() => axios.get.mockReset())

	it('draws a heading per group, in the order the rows bring them, the rows without a value last and unheaded', async () => {
		const wrapper = await render({ groupBy: 'kind' })
		expect(groupsOf(wrapper)).toEqual([
			{ heading: 'waitsOn', titles: ['Melding lantaarnpaal', 'Bezwaar buurman'] },
			{ heading: 'subject', titles: ['Aanvraag verlichting'] },
			{ heading: 'followUp', titles: ['Controle na plaatsing'] },
			{ heading: null, titles: ['Losse notitie'] },
		])
	})

	it('labels a heading through valueLabels and the host translate, and follows groupOrder', async () => {
		const translate = (key) => ({ 'Waits on': 'Wacht op', Subject: 'Onderwerp van deze zaak', 'Planned follow-up': 'Gepland vervolg', Other: 'Overig' }[key] || key)
		const wrapper = await render({
			groupBy: 'kind',
			groupOrder: ['subject', 'waitsOn', 'followUp'],
			groupEmptyLabel: 'Other',
			valueLabels: { kind: { subject: 'Subject', waitsOn: 'Waits on', followUp: 'Planned follow-up' } },
		}, translate)
		expect(groupsOf(wrapper)).toEqual([
			{ heading: 'Onderwerp van deze zaak', titles: ['Aanvraag verlichting'] },
			{ heading: 'Wacht op', titles: ['Melding lantaarnpaal', 'Bezwaar buurman'] },
			{ heading: 'Gepland vervolg', titles: ['Controle na plaatsing'] },
			{ heading: 'Overig', titles: ['Losse notitie'] },
		])
		const heading = wrapper.find('[data-testid="cn-record-list-group-heading"]')
		expect(heading.element.tagName).toBe('H3')
		expect(heading.element.nextElementSibling.getAttribute('aria-labelledby')).toBe(heading.attributes('id'))
	})

	it('draws one list without headings when groupBy is not set', async () => {
		const wrapper = await render({})
		expect(wrapper.findAll('[data-testid="cn-record-list-group-heading"]')).toHaveLength(0)
		expect(wrapper.findAll('ul.cn-record-list__list')).toHaveLength(1)
		expect(wrapper.findAll('[data-testid="cn-record-list-item"]')).toHaveLength(5)
	})
})
