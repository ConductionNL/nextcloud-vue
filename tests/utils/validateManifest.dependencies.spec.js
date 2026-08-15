/**
 * Tests for the HARD/SOFT dependency model in the manifest validator
 * (REQ-DIA-4). A `dependencies` entry may be a string (HARD) or an object
 * `{ id, required?, name? }` where `required: false` marks a SOFT
 * (optional) dependency. Existing string-only manifests must stay valid.
 */

import { validateManifest, validateManifestV2 } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

/** Minimal valid v1 manifest carrying the supplied dependencies. */
function v1(dependencies) {
	return { version: '1.0.0', menu: [], pages: [], dependencies }
}

/** Minimal valid v2 manifest carrying the supplied dependencies. */
function v2(dependencies) {
	return { $schema: V2_SCHEMA_URL, version: '2.18.0', menu: [], pages: [], dependencies }
}

describe('manifest dependencies HARD/SOFT forms (REQ-DIA-4)', () => {
	describe('v1 validateManifest', () => {
		it('accepts a string entry (HARD) — backward compatible', () => {
			const { valid, errors } = validateManifest(v1(['openregister']))
			expect(errors.filter((e) => e.includes('/dependencies'))).toEqual([])
			expect(valid).toBe(true)
		})

		it('accepts an object entry with required:false (SOFT)', () => {
			const { valid, errors } = validateManifest(v1([{ id: 'deck', required: false, name: 'Deck' }]))
			expect(errors.filter((e) => e.includes('/dependencies'))).toEqual([])
			expect(valid).toBe(true)
		})

		it('accepts an object entry without required (defaults HARD)', () => {
			const { errors } = validateManifest(v1([{ id: 'openregister' }]))
			expect(errors.filter((e) => e.includes('/dependencies'))).toEqual([])
		})

		it('accepts a mixed array of string and object entries', () => {
			const { valid } = validateManifest(v1(['openregister', { id: 'deck', required: false }]))
			expect(valid).toBe(true)
		})

		it('rejects an object entry with no id', () => {
			const { valid, errors } = validateManifest(v1([{ required: false }]))
			expect(valid).toBe(false)
			expect(errors.some((e) => e.includes('/dependencies/0/id'))).toBe(true)
		})

		it('rejects a non-boolean required', () => {
			const { errors } = validateManifest(v1([{ id: 'deck', required: 'nope' }]))
			expect(errors.some((e) => e.includes('/dependencies/0/required'))).toBe(true)
		})
	})

	describe('v2 validateManifestV2 (schema)', () => {
		it('accepts a string entry (HARD)', () => {
			const { valid } = validateManifestV2(v2(['openregister']))
			expect(valid).toBe(true)
		})

		it('accepts an object entry with required:false (SOFT)', () => {
			const { valid, errors } = validateManifestV2(v2([{ id: 'deck', required: false, name: 'Deck' }]))
			expect(errors.filter((e) => String(e).includes('dependencies'))).toEqual([])
			expect(valid).toBe(true)
		})

		it('rejects an object dependency with unknown extra keys (additionalProperties:false)', () => {
			const { valid } = validateManifestV2(v2([{ id: 'deck', required: false, bogus: 1 }]))
			expect(valid).toBe(false)
		})
	})
})
