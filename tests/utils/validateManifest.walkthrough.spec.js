/**
 * Tests for the manifest `walkthrough` block (ADR-043 / cn-walkthrough-engine).
 * A well-formed walkthrough validates; an unknown target.kind or advanceOn.type
 * or an extra property fails (additionalProperties / enum).
 */

import { validateManifest } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

/**
 * Build a minimal v2 manifest carrying a `walkthrough` block.
 *
 * @param {object} walkthrough The walkthrough block under test.
 * @return {object} Complete v2 manifest.
 */
function manifestWithWalkthrough(walkthrough) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '1.0.0',
		menu: [{ id: 'Home', label: 'Home', route: 'Home', order: 10 }],
		pages: [{ id: 'Home', route: '/home', type: 'index', title: 'Home', config: { register: 'r', schema: 's' } }],
		walkthrough,
	}
}

const validBlock = {
	enabled: true,
	version: 1,
	completionConfigKey: 'walkthrough_seen_version',
	tours: [{
		id: 'getting-started',
		title: 'Getting started',
		trigger: 'first-visit',
		steps: [
			{ id: 'welcome', placement: 'center', sinceVersion: '1.0.0', target: { kind: 'page', ref: 'Home' }, advanceOn: { type: 'manual' } },
			{ id: 'make', sinceVersion: '1.0.0', task: 'Create one', target: { kind: 'element', ref: 'add' }, advanceOn: { type: 'object-created', register: 'r', schema: 's', capture: { id: ':id' } } },
		],
	}],
}

describe('manifest walkthrough validation', () => {
	it('accepts a well-formed walkthrough block', () => {
		const { valid, errors } = validateManifest(manifestWithWalkthrough(validBlock))
		expect(errors).toEqual([])
		expect(valid).toBe(true)
	})

	it('rejects an unknown target.kind', () => {
		const bad = JSON.parse(JSON.stringify(validBlock))
		bad.tours[0].steps[0].target.kind = 'magic'
		expect(validateManifest(manifestWithWalkthrough(bad)).valid).toBe(false)
	})

	it('rejects an unknown advanceOn.type', () => {
		const bad = JSON.parse(JSON.stringify(validBlock))
		bad.tours[0].steps[0].advanceOn.type = 'telepathy'
		expect(validateManifest(manifestWithWalkthrough(bad)).valid).toBe(false)
	})

	it('rejects an unknown trigger', () => {
		const bad = JSON.parse(JSON.stringify(validBlock))
		bad.tours[0].trigger = 'whenever'
		expect(validateManifest(manifestWithWalkthrough(bad)).valid).toBe(false)
	})

	it('rejects an extra property on a step', () => {
		const bad = JSON.parse(JSON.stringify(validBlock))
		bad.tours[0].steps[0].bogus = true
		expect(validateManifest(manifestWithWalkthrough(bad)).valid).toBe(false)
	})

	it('requires tours', () => {
		expect(validateManifest(manifestWithWalkthrough({ enabled: true })).valid).toBe(false)
	})
})
