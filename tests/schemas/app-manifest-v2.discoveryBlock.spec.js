/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Golden cases for the optional top-level `discovery` block (schema 2.44.0).
 *
 * The block is consumed by the OpenRegister AppHost, which publishes it to
 * anonymous callers of the Nextcloud capabilities endpoint and adds the OCM
 * resource types to /.well-known/ocm. nextcloud-vue does not read it; these
 * tests exercise schema validation only. The path rules matter most: the
 * schema is the build-time gate that stops an app from advertising another
 * host or a traversal path.
 */

import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const MINIMAL_V2 = {
	$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
	version: '2.0.0',
	menu: [],
	pages: [],
}

const ORI = {
	id: 'ori',
	name: 'Open Raadsinformatie',
	version: '1',
	role: 'provides',
	access: 'public',
	endpoint: '/apps/decidiq/api/ori/v1',
	specUrl: 'https://github.com/openstate/open-raadsinformatie',
}

function validate(discovery) {
	return validateManifestV2({ ...MINIMAL_V2, discovery })
}

describe('app-manifest-v2.schema.json — discovery block', () => {
	it('a manifest without a discovery block validates unchanged', () => {
		expect(validateManifestV2(MINIMAL_V2).valid).toBe(true)
	})

	it('a full block validates', () => {
		const result = validate({
			public: true,
			standards: [ORI, { id: 'zgw-zaken', name: 'ZGW Zaken API', role: 'consumes' }],
			links: { directory: '/apps/opencatalogi/api/directory' },
			ocmResourceTypes: [{ name: 'dossiq-case', shareTypes: ['user', 'group'], protocols: { dossiq: '/apps/dossiq/api/federation' } }],
		})
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it.each([
		['missing role', { id: 'ori', name: 'ORI' }],
		['unknown role', { ...ORI, role: 'offers' }],
		['unknown access', { ...ORI, access: 'anyone' }],
		['id not a slug', { ...ORI, id: 'Open Raadsinformatie' }],
		['endpoint is a URL', { ...ORI, endpoint: 'https://other.example/api' }],
		['endpoint is protocol-relative', { ...ORI, endpoint: '//other.example/api' }],
		['endpoint traverses', { ...ORI, endpoint: '/apps/../../etc' }],
		['spec url is http', { ...ORI, specUrl: 'http://example.org' }],
		['unknown key', { ...ORI, appVersion: '1.2.3' }],
	])('rejects a standard with %s', (_label, standard) => {
		expect(validate({ standards: [standard] }).valid).toBe(false)
	})

	it('rejects a link that is not a local path, or whose name is not a slug', () => {
		expect(validate({ links: { directory: 'https://other.example' } }).valid).toBe(false)
		expect(validate({ links: { 'Directory URL': '/x' } }).valid).toBe(false)
	})

	it('rejects an OCM resource type without share types or protocols', () => {
		expect(validate({ ocmResourceTypes: [{ name: 'x', shareTypes: [], protocols: { x: '/x' } }] }).valid).toBe(false)
		expect(validate({ ocmResourceTypes: [{ name: 'x', shareTypes: ['user'], protocols: {} }] }).valid).toBe(false)
		expect(validate({ ocmResourceTypes: [{ name: 'x', shareTypes: ['user'], protocols: { x: 'https://evil.example' } }] }).valid).toBe(false)
	})

	it('rejects an unknown top-level key inside the block', () => {
		expect(validate({ standards: [], versions: {} }).valid).toBe(false)
	})
})
