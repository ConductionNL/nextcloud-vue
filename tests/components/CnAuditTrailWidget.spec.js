/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnAuditTrailWidget (Wave 1, nextcloud-vue#91) — the lib
 * replacement for the three identical app adapters (procest / zaak /
 * scholiq). Unified object-context resolution:
 *
 *   explicit props → cnObjectContext inject (CnDetailPage) →
 *   cnDetailObjectContext holder (CnPageRenderer v2 grid) → content blob
 *
 * plus schema-object → slug collapse and the dual registration
 * (BUILT_IN_WIDGETS + dashboardWidgetRegistry, detail-page surface).
 */

import { shallowMount } from '@vue/test-utils'

const CnAuditTrailWidget = require('../../src/components/CnAuditTrailWidget/CnAuditTrailWidget.vue').default

const cardProps = (wrapper) => {
	const card = wrapper.findComponent({ name: 'CnAuditTrailCard' })
	return card.exists() ? card.props() : null
}

describe('CnAuditTrailWidget — context resolution', () => {
	it('renders CnAuditTrailCard from explicit props', () => {
		const wrapper = shallowMount(CnAuditTrailWidget, {
			propsData: { register: 'procest', schema: 'case', objectId: 'uuid-1', title: 'Changes', maxDisplay: 3 },
		})
		expect(cardProps(wrapper)).toMatchObject({
			register: 'procest',
			schema: 'case',
			objectId: 'uuid-1',
			title: 'Changes',
			maxDisplay: 3,
		})
	})

	it('falls back to the cnObjectContext inject (CnDetailPage path)', () => {
		const wrapper = shallowMount(CnAuditTrailWidget, {
			provide: {
				cnObjectContext: { register: 'procest', schema: 'case', objectId: 'ctx-1' },
			},
		})
		expect(cardProps(wrapper)).toMatchObject({ register: 'procest', schema: 'case', objectId: 'ctx-1' })
	})

	it('unwraps a { value } holder shape on cnObjectContext', () => {
		const wrapper = shallowMount(CnAuditTrailWidget, {
			provide: {
				cnObjectContext: { value: { register: 'r', schema: 's', objectId: 'held-1' } },
			},
		})
		expect(cardProps(wrapper)).toMatchObject({ objectId: 'held-1' })
	})

	it('falls back to the cnDetailObjectContext holder (CnPageRenderer v2 path)', () => {
		const wrapper = shallowMount(CnAuditTrailWidget, {
			provide: {
				cnDetailObjectContext: { value: { register: 'procest', schema: { slug: 'case', title: 'Case' }, objectId: 'v2-1' } },
			},
		})
		// The schema OBJECT collapses to its slug.
		expect(cardProps(wrapper)).toMatchObject({ register: 'procest', schema: 'case', objectId: 'v2-1' })
	})

	it('reads the stored content blob (dashboard registry path)', () => {
		const wrapper = shallowMount(CnAuditTrailWidget, {
			propsData: { content: { register: 'r', schema: 's', objectId: 'c-1', title: 'From content', maxDisplay: 2 } },
		})
		expect(cardProps(wrapper)).toMatchObject({ objectId: 'c-1', title: 'From content', maxDisplay: 2 })
	})

	it('explicit props win over the injected context', () => {
		const wrapper = shallowMount(CnAuditTrailWidget, {
			propsData: { objectId: 'explicit' },
			provide: { cnObjectContext: { register: 'r', schema: 's', objectId: 'ctx' } },
		})
		expect(cardProps(wrapper)).toMatchObject({ objectId: 'explicit' })
	})

	it('renders nothing while the object context is unresolved', () => {
		const wrapper = shallowMount(CnAuditTrailWidget)
		expect(wrapper.findComponent({ name: 'CnAuditTrailCard' }).exists()).toBe(false)
	})
})

describe('CnAuditTrailWidget — registration', () => {
	it('is the v2 BUILT_IN_WIDGETS audit-trail key', () => {
		const { BUILT_IN_WIDGETS } = require('../../src/components/CnWidgetGrid/builtInWidgets.js')
		expect(BUILT_IN_WIDGETS['audit-trail']).toBe(CnAuditTrailWidget)
	})

	it('is registered in dashboardWidgetRegistry as a detail-page surface (like data)', () => {
		require('../../src/components/CnWidgetGrid/registerDashboardWidgets.js')
		const { getWidgetTypeEntry, listWidgetTypes } = require('../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		const entry = getWidgetTypeEntry('audit-trail')
		expect(entry).not.toBeNull()
		expect(entry.renderer).toBe(CnAuditTrailWidget)
		expect(entry.form).toBeDefined()
		expect(entry.surfaces).toEqual(['detail-page'])
		expect(entry.ownsTitle).toBe(true)
		// Detail-page-only: never offered in the dashboard Add-widget picker.
		expect(listWidgetTypes('app-dashboard')).not.toContain('audit-trail')
		expect(listWidgetTypes('detail-page')).toContain('audit-trail')
	})
})
