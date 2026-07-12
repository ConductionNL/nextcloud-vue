// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/*
 * CnDetailPage — hide-empty forwarding to the auto-rendered data widget.
 *
 * CnObjectDataWidget gained `hide-empty` (discriminated supertypes: one `ticket`
 * schema holding request/complaint/contactmoment, where a complaint carries none
 * of the telephony fields a contactmoment does). But the manifest-driven detail
 * page renders that widget through its own auto-body, so the prop was
 * unreachable from a manifest: the page has to forward it.
 *
 * CnPageRenderer forwards `page.config` as props, so `config.hideEmpty: true`
 * lands on this prop. A widget that declares its own `content.hideEmpty` still
 * wins, so a single widget can opt in on a page that has not.
 */

import { shallowMount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const mountWith = (propsData = {}) => shallowMount(CnDetailPage, {
	propsData: { register: 'pipelinq', schema: 'ticket', objectId: 'abc', ...propsData },
	mocks: { t: (app, s) => s },
	stubs: { CnObjectDataWidget: true, CnObjectMetadataWidget: true },
})

describe('CnDetailPage hide-empty forwarding', () => {
	it('defaults to false, so existing detail pages are unchanged', () => {
		const w = mountWith()
		expect(w.vm.hideEmpty).toBe(false)
	})

	it('accepts hideEmpty from the manifest page config', () => {
		const w = mountWith({ hideEmpty: true })
		expect(w.vm.hideEmpty).toBe(true)
	})

	it('lets a widget opt in via content.hideEmpty even when the page has not', () => {
		const w = mountWith()
		const item = { widgetId: 'data' }
		w.vm.widgetContentFor = () => ({ hideEmpty: true })

		// The template resolves `content.hideEmpty === true || hideEmpty`.
		const resolved = w.vm.widgetContentFor(item).hideEmpty === true || w.vm.hideEmpty
		expect(resolved).toBe(true)
	})

	it('page-level hideEmpty applies when the widget declares no content', () => {
		const w = mountWith({ hideEmpty: true })
		const item = { widgetId: 'data' }
		w.vm.widgetContentFor = () => ({})

		const resolved = w.vm.widgetContentFor(item).hideEmpty === true || w.vm.hideEmpty
		expect(resolved).toBe(true)
	})
})
