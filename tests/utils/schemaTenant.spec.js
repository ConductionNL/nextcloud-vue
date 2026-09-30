/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tenant is set by the platform, never by the person filling in a form.
 *
 * learniq's work group ships `tenant_id` as a plain required string (no
 * format, no readOnly, no flag), so the create dialog asked every teacher for
 * a required "Tenant *". `isTenantProperty` decides what counts as tenancy and
 * `fieldsFromSchema({ hideTenant: true })` drops it.
 */

import { fieldsFromSchema, isTenantProperty } from '@/utils/schema.js'

/** The live learniq work-group schema (OpenRegister, 2026-09-29), reduced. */
const workGroup = {
	title: 'Work group',
	required: ['cohortId', 'maxMembers', 'name', 'setName', 'tenant_id'],
	properties: {
		cohortId: { $ref: 'Cohort', format: 'uuid', title: 'Class', type: 'string' },
		name: { type: 'string', title: 'Name' },
		tenant_id: { description: 'The organisation this work group belongs to.', title: 'Tenant', type: 'string' },
	},
}

describe('isTenantProperty', () => {
	it.each(['tenant_id', 'tenantId', 'tenant-id', 'TENANT_ID', 'tenant', 'tenant_uuid'])('matches the tenant name %s', (key) => {
		expect(isTenantProperty(key, { type: 'string' })).toBe(true)
	})

	it.each([
		['x-openregister-tenant', { 'x-openregister-tenant': true }],
		['x-platform-managed', { 'x-platform-managed': true }],
		['x-managed-by: platform', { 'x-managed-by': 'platform' }],
		['format: tenant', { format: 'tenant' }],
		['referenceType: tenant', { referenceType: 'tenant' }],
	])('matches a property marked %s whatever its name', (_label, prop) => {
		expect(isTenantProperty('owningOrg', { type: 'string', ...prop })).toBe(true)
	})

	it('keeps a tenant-named property that opts out with x-openregister-tenant: false', () => {
		expect(isTenantProperty('tenant_id', { type: 'string', 'x-openregister-tenant': false })).toBe(false)
	})

	it.each(['organisation', 'organisationId', 'tenantName', 'maintenance', 'title'])('does not match %s by name', (key) => {
		expect(isTenantProperty(key, { type: 'string' })).toBe(false)
	})
})

describe('fieldsFromSchema — hideTenant', () => {
	it('drops the tenant property when asked', () => {
		const keys = fieldsFromSchema(workGroup, { hideTenant: true }).map((f) => f.key)
		expect(keys).toEqual(['cohortId', 'name'])
	})

	it('keeps it by default, so a detail page still shows the tenant', () => {
		const keys = fieldsFromSchema(workGroup).map((f) => f.key)
		expect(keys).toContain('tenant_id')
	})

	it('keeps it when an override says hidden: false', () => {
		const keys = fieldsFromSchema(workGroup, { hideTenant: true, overrides: { tenant_id: { hidden: false } } }).map((f) => f.key)
		expect(keys).toContain('tenant_id')
	})
})
