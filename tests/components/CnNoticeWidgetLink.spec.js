/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A notice links to a record named by the page's record.
 *
 * @spec openspec/changes/notice-link/specs/notice-link/spec.md#requirement-a-notice-can-link-to-a-record
 */
import { mount } from '@vue/test-utils'
import CnNoticeWidget from '../../src/components/CnNoticeWidget/CnNoticeWidget.vue'

const LINK = { route: 'CaseDetail', params: { id: '@object.objectUuid' }, label: '@object.subjectLabel', fallbackLabel: 'Open the case' }
const CONTENT = { title: 'A case is waiting on this task', text: 'Complete the task and the case moves on.', link: LINK }

/**
 * @param {object|null} objectData The page's record.
 * @return {import('@vue/test-utils').VueWrapper}
 */
function mountNotice(objectData) {
	return mount(CnNoticeWidget, {
		props: { content: CONTENT, objectData, objectId: 't-1' },
		global: {
			mocks: { $router: {} },
			stubs: { CnIcon: true, RouterLink: { props: ['to'], template: '<a class="router-link" :data-to="JSON.stringify(to)"><slot /></a>' } },
		},
	})
}

describe('CnNoticeWidget link', () => {
	it('links the record the page names, labelled by its title', () => {
		const link = mountNotice({ objectUuid: 'case-1', subjectLabel: 'Kapvergunning Lindelaan' }).find('[data-testid="cn-notice-widget-link"]')
		expect(link.text()).toBe('Kapvergunning Lindelaan')
		expect(JSON.parse(link.attributes('data-to'))).toEqual({ name: 'CaseDetail', params: { id: 'case-1' } })
	})

	it('falls back to the fallback label without a title', () => {
		expect(mountNotice({ objectUuid: 'case-1' }).find('[data-testid="cn-notice-widget-link"]').text()).toBe('Open the case')
	})

	it('draws no link while a param does not resolve', () => {
		const w = mountNotice({ subjectLabel: 'x' })
		expect(w.find('[data-testid="cn-notice-widget-link"]').exists()).toBe(false)
		expect(w.text()).toContain('A case is waiting on this task')
	})
})
