/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The manifest `offline` block (manifest-offline-block, design D1 and D2):
 * the schema's caps, the register a take-along entry may leave out, and the
 * rule that an offline form writes to a register and schema.
 *
 * @spec openspec/changes/manifest-offline-block/specs/manifest-offline/spec.md#requirement-the-manifest-declares-what-goes-offline
 */

import {
	isObjectUrlFor,
	offlineForms,
	takeAlongEntries,
} from '../../src/utils/offlineManifest.js'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

/**
 * A v2 manifest with an inspections list and an inspection report form.
 *
 * @param {object} offline The offline block.
 * @param {Array} [extraPages] Pages added after the two.
 * @return {object} The manifest.
 */
function manifest(offline, extraPages = []) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '1.0.0',
		menu: [],
		pages: [
			{ id: 'inspections', route: '/inspections', type: 'index', title: 'Inspections', config: { register: 'toezicht', schema: 'inspection' } },
			{ id: 'inspection-report', route: '/report', type: 'form', title: 'Inspection report', config: { register: 'toezicht', schema: 'report', fields: [] } },
			...extraPages,
		],
		offline,
	}
}

describe('the offline block validates', () => {
	it('accepts a take-along and an offline form', () => {
		const result = validateManifestV2(manifest({
			takeAlong: [{ register: 'toezicht', schema: 'inspection', filter: { inspector: '@me', plannedDate: '@today' }, limit: 50, ttlHours: 12 }],
			forms: ['inspection-report'],
		}))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('accepts a manifest without the block', () => {
		const m = manifest(undefined)
		delete m.offline
		expect(validateManifestV2(m).valid).toBe(true)
	})

	it('takes the one register pages bind the schema in when the entry names none', () => {
		const m = manifest({ takeAlong: [{ schema: 'inspection' }] })
		expect(validateManifestV2(m).valid).toBe(true)
		expect(takeAlongEntries(m)).toEqual([{ register: 'toezicht', schema: 'inspection', filter: {}, limit: 100, ttlHours: 24 }])
	})

	it('accepts an edit form posting to its record URL', () => {
		const result = validateManifestV2(manifest({ forms: ['edit-report'] }, [
			{ id: 'edit-report', route: '/report/:id', type: 'form', title: 'Edit', config: { register: 'toezicht', schema: 'report', submitEndpoint: '/index.php/apps/openregister/api/objects/toezicht/report/:id', fields: [] } },
		]))
		expect(result.errors).toEqual([])
	})
})

describe('the offline block refuses', () => {
	it('a take-along over the cap, saying the limit is at most 500', () => {
		const result = validateManifestV2(manifest({ takeAlong: [{ register: 'toezicht', schema: 'inspection', limit: 800 }] }))
		expect(result.valid).toBe(false)
		expect(result.errors.join('\n')).toMatch(/offline\/takeAlong\[0\]\/limit: must be <= 500/)
	})

	it('a lifetime over 72 hours', () => {
		const result = validateManifestV2(manifest({ takeAlong: [{ register: 'toezicht', schema: 'inspection', ttlHours: 73 }] }))
		expect(result.errors.join('\n')).toMatch(/offline\/takeAlong\[0\]\/ttlHours: must be <= 72/)
	})

	it('an unknown key in the block', () => {
		const result = validateManifestV2(manifest({ everything: true }))
		expect(result.valid).toBe(false)
	})

	it('an entry without a register when pages bind its schema in two registers', () => {
		const result = validateManifestV2(manifest({ takeAlong: [{ schema: 'inspection' }] }, [
			{ id: 'archive', route: '/archive', type: 'index', title: 'Archive', config: { register: 'archief', schema: 'inspection' } },
		]))
		expect(result.errors).toContain('offline/takeAlong[0]/register: pages bind schema "inspection" in 2 registers (toezicht, archief), so name the register to take it along from')
	})

	it('an entry without a register when no page binds its schema', () => {
		const result = validateManifestV2(manifest({ takeAlong: [{ schema: 'permit' }] }))
		expect(result.errors).toContain('offline/takeAlong[0]/register: no page binds schema "permit", so name the register to take it along from')
	})

	it('a forms entry that is not a form page', () => {
		const result = validateManifestV2(manifest({ forms: ['inspections'] }))
		expect(result.errors).toContain('offline/forms[0]: "inspections" is not a type: form page')
	})

	it('a handler form, naming the page and saying an offline form writes to a register and schema', () => {
		const result = validateManifestV2(manifest({ forms: ['report'] }, [
			{ id: 'report', route: '/r', type: 'form', title: 'Report', config: { register: 'toezicht', schema: 'report', submitHandler: 'sendReport', fields: [] } },
		]))
		expect(result.valid).toBe(false)
		expect(result.errors).toContain('offline/forms[0]: page "report" submits through submitHandler "sendReport", which the queue cannot replay; an offline form writes to a register and schema')
	})

	it('a form without a register and schema', () => {
		const result = validateManifestV2(manifest({ forms: ['contact'] }, [
			{ id: 'contact', route: '/c', type: 'form', title: 'Contact', config: { submitEndpoint: '/apps/myapp/api/contact', fields: [] } },
		]))
		expect(result.errors).toContain('offline/forms[0]: page "contact" declares no config.register and config.schema; an offline form writes to a register and schema')
	})

	it('a form posting somewhere other than its object URL', () => {
		const result = validateManifestV2(manifest({ forms: ['contact'] }, [
			{ id: 'contact', route: '/c', type: 'form', title: 'Contact', config: { register: 'toezicht', schema: 'report', submitEndpoint: '/apps/myapp/api/contact', fields: [] } },
		]))
		expect(result.errors).toContain('offline/forms[0]: page "contact" submits to "/apps/myapp/api/contact", which is not the object URL of toezicht/report; an offline form writes to a register and schema')
	})
})

describe('offline manifest readers', () => {
	it('recognises a schema object URL and nothing else', () => {
		expect(isObjectUrlFor('/apps/openregister/api/objects/toezicht/report', 'toezicht', 'report')).toBe(true)
		expect(isObjectUrlFor('/index.php/apps/openregister/api/objects/toezicht/report/{id}', 'toezicht', 'report')).toBe(true)
		expect(isObjectUrlFor('/apps/openregister/api/objects/toezicht/report/extra/path', 'toezicht', 'report')).toBe(false)
		expect(isObjectUrlFor('/apps/openregister/api/objects/other/report', 'toezicht', 'report')).toBe(false)
		expect(isObjectUrlFor('', 'toezicht', 'report')).toBe(false)
	})

	it('lists only the offline forms the validator accepts', () => {
		const m = manifest({ forms: ['inspection-report', 'inspections', 'missing'] })
		expect(offlineForms(m)).toEqual([{ id: 'inspection-report', register: 'toezicht', schema: 'report' }])
	})

	it('reads nothing from a manifest without the block', () => {
		expect(takeAlongEntries({ pages: [] })).toEqual([])
		expect(offlineForms(null)).toEqual([])
	})
})
