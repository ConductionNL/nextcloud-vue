/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnDetailPage's header title (ADR-062): once the object resolves,
 * the `<h2>` names the RECORD (its display name) with the type label as a
 * small eyebrow — not the bare type name ("Case", "Publication").
 */
import { mount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

function storeWith(object) {
	return {
		objects: { 'reg-case': { 'id-1': object } },
		schemas: {},
		objectTypeRegistry: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	}
}

function mountPage(propsData) {
	return mount(CnDetailPage, { propsData })
}

describe('CnDetailPage — header record title', () => {
	it('falls back to the type label while the object is loading', () => {
		const w = mountPage({ title: 'Case' })
		expect(w.vm.displayTitle).toBe('Case')
		expect(w.vm.typeEyebrow).toBe('')
		expect(w.find('.cn-detail-page__title').text()).toBe('Case')
	})

	it('shows the record display name and the type as an eyebrow once resolved', () => {
		const w = mountPage({
			title: 'Case',
			register: 'reg',
			schema: 'case',
			objectId: 'id-1',
			objectStore: storeWith({ name: 'ACME onboarding' }),
		})
		expect(w.vm.objectDisplayName).toBe('ACME onboarding')
		expect(w.vm.displayTitle).toBe('ACME onboarding')
		expect(w.vm.typeEyebrow).toBe('Case')
		expect(w.find('.cn-detail-page__title').text()).toBe('ACME onboarding')
		expect(w.find('[data-testid="cn-detail-page-type-eyebrow"]').text()).toBe('Case')
	})

	it('never uses the raw id as a display name', () => {
		const w = mountPage({
			title: 'Case',
			register: 'reg',
			schema: 'case',
			objectId: 'id-1',
			objectStore: storeWith({ '@self': { name: 'id-1' } }),
		})
		expect(w.vm.objectDisplayName).toBe('')
		expect(w.vm.displayTitle).toBe('Case')
	})

	it('prefers @self.name and composes firstName + lastName', () => {
		const w = mountPage({
			title: 'Contact',
			register: 'reg',
			schema: 'case',
			objectId: 'id-1',
			objectStore: storeWith({ firstName: 'Jo', lastName: 'Smit' }),
		})
		expect(w.vm.objectDisplayName).toBe('Jo Smit')
	})
})
