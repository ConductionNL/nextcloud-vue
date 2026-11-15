/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An index page finds a record by scanning its code (`scan`): the list is
 * filtered on the code's field, a single match opens with `onMatch: open`,
 * none says so (buildiq pages-qr-and-barcodes D1).
 *
 * @spec openspec/changes/index-scan/specs/index-scan/spec.md
 */
import { shallowMount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

function mountPage(scan, objects = []) {
	const replace = jest.fn(() => Promise.resolve())
	const w = shallowMount(CnIndexPage, {
		props: { objects, scan },
		global: { mocks: { $route: { query: { page: '1' }, params: {} }, $router: { replace, push: jest.fn() } } },
	})
	return { w, replace }
}

describe('CnIndexPage scan', () => {
	it('draws the scan field only when enabled with a field', () => {
		expect(mountPage({ enabled: true, field: 'serial' }).w.find('[data-testid="cn-index-page-scan"]').exists()).toBe(true)
		expect(mountPage({ enabled: true }).w.find('[data-testid="cn-index-page-scan"]').exists()).toBe(false)
		expect(mountPage(null).w.find('[data-testid="cn-index-page-scan"]').exists()).toBe(false)
	})

	it('filters the list on the scanned code through the address', () => {
		const { w, replace } = mountPage({ enabled: true, field: 'serial' })
		w.vm.applyScan(' SN-0042 ')
		expect(replace).toHaveBeenCalledWith({ query: { page: '1', serial: 'SN-0042' } })
		expect(w.vm.pendingScanOpen).toBeNull()
		w.vm.applyScan('')
		expect(replace).toHaveBeenCalledTimes(1)
	})

	it('opens a single match with onMatch open, and says when nothing matches', async () => {
		const { w } = mountPage({ enabled: true, field: 'serial', onMatch: 'open' }, [{ id: 'r1', serial: 'SN-0042' }])
		w.vm.applyScan('SN-0042')
		expect(w.vm.pendingScanOpen).toBe('SN-0042')
		w.vm.$options.watch.effectiveLoading.call(w.vm, false)
		expect(w.emitted('view')[0][0]).toEqual({ id: 'r1', serial: 'SN-0042' })
		const none = mountPage({ enabled: true, field: 'serial', onMatch: 'open' }, [])
		none.w.vm.applyScan('NOPE')
		none.w.vm.$options.watch.effectiveLoading.call(none.w.vm, false)
		await none.w.vm.$nextTick()
		expect(none.w.find('[data-testid="cn-index-page-scan-none"]').exists()).toBe(true)
	})
})
