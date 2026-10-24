/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record-list card whose footer action and row pill depend on state
 * (DqZaaktype Versies): a published version ends with a note and "Nieuwe
 * versie maken" across the card, a draft with "Publiceren"; each version's
 * pill reads Concept, Actief or Vastgezet from two fields.
 *
 * @spec openspec/changes/record-list-pill-cases-footer-choice/specs/record-list/spec.md
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))

/** Let fetches and condition evaluation settle. */
async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

const FOOTER = [
	{ label: 'Publish', type: 'open-modal', target: 'PublishDialog', visibleWhen: { field: 'isDraft', op: 'eq', value: true } },
	{ label: 'Make a new version', type: 'open-modal', target: 'NewVersionDialog', wide: true, note: 'A published version no longer changes.' },
]

const PILL = {
	cases: [
		{ when: { field: 'isDraft', op: 'eq', value: true }, label: 'Draft', variant: 'warning' },
		{ when: { field: 'validUntil', op: 'notEmpty' }, label: 'Locked', variant: 'default' },
	],
	label: 'Active',
	variant: 'success',
}

const ROWS = [
	{ id: 'v5', version: 5, isDraft: true },
	{ id: 'v4', version: 4, isDraft: false },
	{ id: 'v3', version: 3, isDraft: false, validUntil: '2026-10-02' },
]

/**
 * Mount the list on a record.
 *
 * @param {object} record The page's record.
 * @param {object} [provide] Values to provide.
 * @return {import('@vue/test-utils').VueWrapper} The list.
 */
function mountList(record, provide = {}) {
	return mount(CnRecordListWidget, {
		props: {
			content: { register: 'r', schema: 'caseType', presentation: 'rows', title: 'Version {version}', pill: PILL, footerAction: FOOTER },
			objectId: record.id,
			objectData: record,
		},
		global: {
			provide,
			stubs: { CnIcon: { props: ['name'], template: '<i class="icon" :data-name="name" />' }, NcLoadingIcon: true },
			mocks: { $router: { push: jest.fn() } },
		},
	})
}

beforeEach(() => {
	axios.get.mockReset()
	axios.get.mockResolvedValue({ data: { results: ROWS, total: ROWS.length } })
})

describe('CnRecordListWidget footer choice', () => {
	it('on a draft draws the first action whose condition holds, without a note', async () => {
		const dispatch = jest.fn()
		const w = mountList({ id: 'v5', isDraft: true }, { cnDispatchAction: dispatch })
		await flush()
		const button = w.find('[data-testid="cn-record-list-footer-action"]')
		expect(button.text()).toContain('Publish')
		expect(w.find('[data-testid="cn-record-list-footer-note"]').exists()).toBe(false)
		await button.trigger('click')
		expect(dispatch).toHaveBeenCalledWith({ label: 'Publish', type: 'open-modal', target: 'PublishDialog' })
	})

	it('on a published version draws the next action with its note, across the card', async () => {
		const w = mountList({ id: 'v4', isDraft: false })
		await flush()
		const button = w.find('[data-testid="cn-record-list-footer-action"]')
		expect(button.text()).toContain('Make a new version')
		expect(w.find('[data-testid="cn-record-list-footer"]').classes()).toContain('cn-record-list__footer--wide')
		expect(w.find('[data-testid="cn-record-list-footer-note"]').text()).toBe('A published version no longer changes.')
	})

	it('draws no action when no entry holds', async () => {
		const w = mount(CnRecordListWidget, {
			props: { content: { register: 'r', schema: 'caseType', footerAction: [FOOTER[0]] }, objectId: 'v4', objectData: { id: 'v4', isDraft: false } },
			global: { stubs: { NcLoadingIcon: true } },
		})
		await flush()
		expect(w.find('[data-testid="cn-record-list-footer-action"]').exists()).toBe(false)
	})
})

describe('CnRecordListWidget pill cases', () => {
	it('labels each row by the first case that holds, else the pill default', async () => {
		const w = mountList({ id: 'v4', isDraft: false })
		await flush()
		const pills = w.findAll('.cn-record-list__aside').map((aside) => aside.text())
		expect(pills).toEqual(['Draft', 'Active', 'Locked'])
	})
})
