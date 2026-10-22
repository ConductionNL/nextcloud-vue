/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `pages[].referencePreview: true` (case-page-and-list-as-a-place REQ-CPL-03):
 * a reference on the page shows a summary of the record it points at without
 * leaving. CnPageRenderer provides `cnReferencePreview` for the page; a record
 * list whose rows open a detail page then draws each row's title as a
 * CnReferencePreview of that row's record, and opens it on activation.
 *
 * @spec openspec/changes/reference-preview-from-page/specs/reference-preview-from-page/spec.md#requirement-a-page-can-turn-on-reference-previews
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(() => new Promise(() => {})) } }))

import { mount } from '@vue/test-utils'
import CnPageRenderer from '../../src/components/CnPageRenderer/CnPageRenderer.vue'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

const PAGES = [
	{ id: 'CaseDetail', type: 'detail', referencePreview: true, config: { register: 'dossiq', schema: 'case' } },
	{ id: 'TaskDetail', type: 'detail', config: { register: 'dossiq', schema: 'task' } },
]

describe('reference previews from a page declaration', () => {
	it('CnPageRenderer provides the switch and the target of a detail route', () => {
		const provided = CnPageRenderer.provide.call({ currentPage: PAGES[0], pageById: new Map(PAGES.map((p) => [p.id, p])), resolvedLook: 'board', pageSidebarVisible: {}, pageSidebarComponent: {}, detailObjectContext: {} })
		expect(provided.cnReferencePreview.enabled).toBe(true)
		expect(provided.cnReferencePreview.targetFor('CaseDetail')).toEqual({ register: 'dossiq', schema: 'case' })
		expect(provided.cnReferencePreview.targetFor('Nope')).toBeNull()
	})

	it('a record list draws a row\'s title as a preview of the row\'s record, and opens it', async () => {
		const push = jest.fn(() => Promise.resolve())
		const w = mount(CnRecordListWidget, {
			props: { content: { register: 'r', schema: 'relation', rowRoute: 'CaseDetail', rowIdField: 'caseId', title: '{title}' } },
			global: {
				provide: { cnReferencePreview: { enabled: true, targetFor: (name) => (name === 'CaseDetail' ? { register: 'dossiq', schema: 'case' } : null) } },
				mocks: { $router: { push, resolve: () => ({ href: '#' }) } },
				stubs: { CnIcon: true, NcLoadingIcon: true, NcPopover: { template: '<span><slot name="trigger" /><slot /></span>' } },
			},
		})
		w.vm.rows = [{ id: 'rel-1', caseId: 'c-9', title: 'Kapvergunning Molenweg 4' }]
		await w.vm.$nextTick()
		const trigger = w.find('[data-testid="cn-reference-preview-trigger"]')
		expect(trigger.exists()).toBe(true)
		expect(trigger.text()).toBe('Kapvergunning Molenweg 4')
		await trigger.trigger('click')
		expect(push).toHaveBeenCalledWith({ name: 'CaseDetail', params: { id: 'c-9' } })
	})

	it('keeps the row a plain link without the page switch', async () => {
		const w = mount(CnRecordListWidget, {
			props: { content: { register: 'r', schema: 'relation', rowRoute: 'CaseDetail', rowIdField: 'caseId', title: '{title}' } },
			global: { mocks: { $router: { push: jest.fn(), resolve: () => ({ href: '#' }) } }, stubs: { CnIcon: true, NcLoadingIcon: true, RouterLink: { template: '<a><slot /></a>' } } },
		})
		w.vm.rows = [{ id: 'rel-1', caseId: 'c-9', title: 'Kapvergunning Molenweg 4' }]
		await w.vm.$nextTick()
		expect(w.find('[data-testid="cn-reference-preview-trigger"]').exists()).toBe(false)
	})
})
