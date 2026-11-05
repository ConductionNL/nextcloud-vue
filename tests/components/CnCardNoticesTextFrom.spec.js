/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqTeamwachtrij "Bron niet beschikbaar": the notice's text is what the
 * sources endpoint says is unavailable, and it shows only while that is a
 * non-empty string, on the team-queue saved view only.
 *
 * @spec openspec/changes/notice-text-from-endpoint/specs/card-state-notices/spec.md
 */
import { mount } from '@vue/test-utils'
import CnCardNotices from '../../src/components/CnCardNotices/CnCardNotices.vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const NoticeStub = { name: 'CnNoticeWidget', props: ['content'], template: '<div class="notice">{{ content.title }} {{ content.text }}</div>' }

/** @return {Promise<void>} */
async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const NOTICE = { variant: 'warning', layout: 'stacked', title: 'Bron niet beschikbaar.', textFrom: { endpoint: '/apps/dossiq/api/work-queue/sources', field: 'unavailableText' } }

/**
 * @param {object} body The endpoint's answer.
 */
function answer(body) {
	global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(body) }))
}

describe('CnCardNotices textFrom', () => {
	it('draws the endpoint\'s text', async () => {
		answer({ unavailableText: 'Berichtenbox antwoordt niet.' })
		const w = mount(CnCardNotices, { props: { notices: [NOTICE] }, global: { stubs: { CnNoticeWidget: NoticeStub } } })
		await flush()
		expect(global.fetch.mock.calls[0][0]).toContain('/apps/dossiq/api/work-queue/sources')
		const content = w.findComponent({ name: 'CnNoticeWidget' }).props('content')
		expect(content.text).toBe('Berichtenbox antwoordt niet.')
		expect(content.textFrom).toBeUndefined()
	})

	it('draws nothing while the text is empty', async () => {
		answer({ unavailableText: '' })
		const w = mount(CnCardNotices, { props: { notices: [NOTICE] }, global: { stubs: { CnNoticeWidget: NoticeStub } } })
		await flush()
		expect(w.find('.notice').exists()).toBe(false)
	})

	it('draws nothing when the endpoint fails', async () => {
		global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 503 }))
		const w = mount(CnCardNotices, { props: { notices: [NOTICE] }, global: { stubs: { CnNoticeWidget: NoticeStub } } })
		await flush()
		expect(w.find('.notice').exists()).toBe(false)
	})
})

describe('CnIndexPage notice savedViews', () => {
	/**
	 * @param {string} applied The applied saved view id.
	 * @return {Array<object>} The page notices.
	 */
	function noticesWith(applied) {
		const w = mount(CnIndexPage, {
			propsData: {
				title: 'Cases',
				schema: { title: 'Case', properties: {} },
				objects: [],
				pagination: { page: 1, pages: 1, total: 0, limit: 20 },
				notices: [{ text: 'Always' }, { text: 'Team only', savedViews: ['default:team-queue'] }],
			},
			global: {
				mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Cases' } },
				stubs: { CnActionsBar: true, CnSavedViewsControl: true, CnBuildiqEditButton: true, CnDataTable: true, CnCardGrid: true, CnPagination: true, CnIndexSidebar: true, CnCardNotices: true },
			},
		})
		w.vm.appliedSavedViewId = applied
		return w.vm.pageNotices.map((n) => n.text)
	}

	it('keeps a notice to the saved views it names', () => {
		expect(noticesWith('')).toEqual(['Always'])
		expect(noticesWith('default:team-queue')).toEqual(['Always', 'Team only'])
	})
})
