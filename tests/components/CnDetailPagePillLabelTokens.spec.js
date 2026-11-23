/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A header pill's label can name fields of the record: DqZaaktype reads
 * "Versie 4 gepubliceerd" and "Versie 5 concept" where the label was the
 * state alone.
 *
 * @spec openspec/changes/detail-pill-label-tokens/specs/detail-page/spec.md#requirement-a-header-pill-label-can-name-the-records-fields
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const STATUS = { field: 'isDraft', labels: { false: 'Version {version} published', true: 'Version {version} draft' }, colorMap: { false: 'success', true: 'warning' } }

function makeStore(object) {
	return {
		objects: { 'reg-caseType': { 'id-1': object } },
		schemas: {},
		objectTypeRegistry: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	}
}

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

function mountPage(object, translate = (key) => key) {
	return mount(CnDetailPage, {
		props: { title: 'Case type', register: 'reg', schema: 'caseType', objectId: 'id-1', objectStore: makeStore(object), statusPill: STATUS },
		global: {
			stubs: {
				NcBreadcrumbs: { template: '<nav><slot /></nav>' },
				NcBreadcrumb: { props: ['name'], template: '<span>{{ name }}</span>' },
				CnDashboardGrid: { template: '<div />' },
				CnDetailWidgetHost: { template: '<div />' },
			},
			provide: { cnLook: 'board', cnTranslate: translate },
		},
	})
}

const pillTexts = (w) => w.findAll('[data-testid^="cn-detail-page-pill-"]').map((p) => p.text())

describe('CnDetailPage pill label tokens', () => {
	it('fills the record\'s fields into the label', async () => {
		const w = mountPage({ id: 'id-1', title: 'Omgevingsvergunning', isDraft: false, version: 4 })
		await flush()
		expect(pillTexts(w)).toEqual(['Version 4 published'])
	})

	it('fills them after translating', async () => {
		const translate = (text) => ({ 'Version {version} draft': 'Versie {version} concept' }[text] || text)
		const w = mountPage({ id: 'id-1', title: 'Omgevingsvergunning', isDraft: true, version: 5 }, translate)
		await flush()
		expect(pillTexts(w)).toEqual(['Versie 5 concept'])
	})

	it('leaves out a field the record does not have', async () => {
		const w = mountPage({ id: 'id-1', title: 'Omgevingsvergunning', isDraft: false })
		await flush()
		expect(pillTexts(w)).toEqual(['Version published'])
	})
})
