/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnIndexPage's built-in Request-a-feature action (#7) — the
 * CnActionsBar @request-feature handler opens CnSuggestFeatureModal with
 * an "index:<schema>" surface, and warns + no-ops without the repo inject.
 */

import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const baseProps = {
	title: 'Clients',
	schema: { name: 'client', title: 'Client', properties: {} },
	objects: [],
}

function mountPage(extra = {}, provide = {}) {
	return mount(CnIndexPage, {
		propsData: { ...baseProps, ...extra },
		mocks: { $router: { push: jest.fn() }, $route: { name: 'Clients' } },
		stubs: {
			CnDataTable: true, CnCardGrid: true, CnPagination: true,
			CnActionsBar: true, CnContextMenu: true, CnRowActions: true,
			CnIndexSidebar: true, CnSuggestFeatureModal: true,
		},
		provide: { cnCustomComponents: {}, ...provide },
	})
}

describe('CnIndexPage — Request a feature (#7)', () => {
	let warnSpy
	beforeEach(() => { warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {}) })
	afterEach(() => { warnSpy.mockRestore() })

	it('showRequestFeature defaults to true', () => {
		const wrapper = mountPage({}, { cnFeatureRequestRepo: 'ConductionNL/pipelinq' })
		expect(wrapper.vm.showRequestFeature).toBe(true)
	})

	it('opens the modal on @request-feature when a repo is injected', async () => {
		const wrapper = mountPage({}, { cnAppId: 'pipelinq', cnFeatureRequestRepo: 'ConductionNL/pipelinq' })
		expect(wrapper.vm.featureRequestModalOpen).toBe(false)
		wrapper.vm.onRequestFeatureClick()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.featureRequestModalOpen).toBe(true)
	})

	it('warns and does not open when no repo inject is present', () => {
		const wrapper = mountPage({}, { cnFeatureRequestRepo: '' })
		wrapper.vm.onRequestFeatureClick()
		expect(wrapper.vm.featureRequestModalOpen).toBe(false)
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Cannot open feature request modal'))
	})

	it('derives surface as "index:<schema name>"', () => {
		const wrapper = mountPage({}, { cnFeatureRequestRepo: 'ConductionNL/pipelinq' })
		expect(wrapper.vm.requestFeatureSurface).toBe('index:client')
	})
})
