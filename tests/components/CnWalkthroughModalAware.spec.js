/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The tour and the app's own dialogs (pipelinq review C1, C3, C5).
 *
 * - ESC while a create dialog is open belonged to the tour too: it dismissed
 *   the tour and the host recorded it as seen, so the tour was gone for good.
 * - The dim strips sat above the dialog (z-index 10000), so a click in the
 *   dialog landed on the dim and dismissed the tour.
 * - A step's target (`index-add`) exists on every list page. A step left on
 *   Products kept a live cutout over the Clients page's New button.
 */
const { mount } = require('@vue/test-utils')
const CnWalkthrough = require('../../src/components/CnWalkthrough/CnWalkthrough.vue').default
const { __resetWalkthroughCacheForTests } = require('../../src/composables/useWalkthrough.js')

const steps = [
	{ id: 'welcome', placement: 'center', title: 'Welcome', target: { kind: 'page', ref: 'Dashboard' }, advanceOn: { type: 'manual' } },
	{ id: 'create-product', title: 'Create a product', task: 'Click New and save a product', allowManualNext: true, target: { kind: 'element', ref: 'index-add' }, advanceOn: { type: 'object-created', register: 'pipelinq', schema: 'product' } },
	{ id: 'done', placement: 'center', title: 'Done', target: { kind: 'page', ref: 'Dashboard' }, advanceOn: { type: 'manual' } },
]
const manifest = { version: '1.0.0', walkthrough: { enabled: true, tours: [{ id: 'gs', trigger: 'first-visit', steps }] } }

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
let route

function mountTour() {
	return mount(CnWalkthrough, {
		propsData: { appId: 'pq-modal', manifest },
		attachTo: document.body,
		global: { mocks: { $route: route } },
	})
}

function addButton() {
	const btn = document.createElement('button')
	btn.setAttribute('data-walkthrough-id', 'index-add')
	btn.getBoundingClientRect = () => ({ top: 50, left: 600, width: 80, height: 34 })
	document.body.appendChild(btn)
	return btn
}

function openAppModal() {
	const mask = document.createElement('div')
	mask.className = 'modal-mask'
	document.body.appendChild(mask)
	return mask
}

beforeEach(() => {
	__resetWalkthroughCacheForTests()
	document.body.innerHTML = ''
	route = { name: 'Products', params: {} }
})

describe('CnWalkthrough and app dialogs', () => {
	it('leaves ESC to an open app dialog', async () => {
		const w = mountTour()
		await flush()
		openAppModal()
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
		expect(w.vm.wt.running.value).toBe(true)
		expect(w.emitted('dismiss')).toBeFalsy()
		expect(w.emitted('pause')).toBeFalsy()
		w.unmount()
	})

	it('pauses on ESC without a dialog, and does not end the tour', async () => {
		const w = mountTour()
		await flush()
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
		expect(w.emitted('pause')).toBeTruthy()
		expect(w.emitted('dismiss')).toBeFalsy()
		expect(w.emitted('complete')).toBeFalsy()
		expect(w.vm.wt.paused.value).toBe(true)
		expect(w.vm.wt.resumePaused()).toBe(true)
		expect(w.vm.step.id).toBe('welcome')
		w.unmount()
	})

	it('pauses on a click on the dim', async () => {
		const w = mountTour()
		await flush()
		await w.find('.cn-walkthrough__dim--full').trigger('click')
		expect(w.emitted('pause')).toBeTruthy()
		expect(w.emitted('complete')).toBeFalsy()
		w.unmount()
	})

	it('drops the dim while an app dialog is open, so clicks reach the dialog', async () => {
		addButton()
		const w = mountTour()
		await flush()
		w.vm.wt.next()
		await flush()
		expect(w.findAll('.cn-walkthrough__dim').length).toBeGreaterThan(0)
		const mask = openAppModal()
		await flush()
		expect(w.vm.appModalOpen).toBe(true)
		expect(w.findAll('.cn-walkthrough__dim')).toHaveLength(0)
		expect(w.find('.cn-walkthrough__card--docked').exists()).toBe(true)
		mask.remove()
		await flush()
		expect(w.vm.appModalOpen).toBe(false)
		w.unmount()
	})

	it('advances when the product is saved in the dialog', async () => {
		addButton()
		const w = mountTour()
		await flush()
		w.vm.wt.next()
		openAppModal()
		await flush()
		window.dispatchEvent(new CustomEvent('cn-walkthrough:object-created', {
			detail: { id: 'p-1', register: 'pipelinq', schema: 'product', object: { id: 'p-1' } },
		}))
		expect(w.vm.step.id).toBe('done')
		w.unmount()
	})

	it('does not spotlight the same button on another page', async () => {
		addButton()
		const w = mountTour()
		await flush()
		w.vm.wt.next()
		await flush()
		expect(w.vm.offPage).toBe(false)
		expect(w.vm.targetEl).not.toBeNull()
		route.name = 'Clients'
		w.vm.locateTarget()
		await flush()
		expect(w.vm.offPage).toBe(true)
		expect(w.vm.targetEl).toBeNull()
		expect(w.findAll('.cn-walkthrough__dim')).toHaveLength(0)
		route.name = 'Products'
		w.vm.locateTarget()
		expect(w.vm.offPage).toBe(false)
		w.unmount()
	})

	it('reports progress on every step change', async () => {
		const w = mountTour()
		await flush()
		w.vm.wt.next()
		await flush()
		expect(w.emitted('progress').pop()).toEqual([{ tourId: 'gs', stepId: 'create-product', index: 1 }])
		w.unmount()
	})
})
