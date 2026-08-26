/**
 * Schema cover for `section: "integrations"` (ADR-110).
 *
 * These run against the COMPILED validator (`validateManifestV2.compiled.js`),
 * which is what the app actually loads at runtime — Nextcloud's CSP forbids
 * `new Function()`, so the validator is built ahead of time by
 * `npm run build:validators`. Editing the schema source without rebuilding
 * leaves the runtime rejecting a manifest the source-of-truth accepts, and a
 * test that read the .json instead of the artifact could not see that. Hence
 * the assertion here is deliberately made through the compiled path.
 */

import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

/**
 * Build a minimal valid v2 manifest carrying one menu entry.
 *
 * @param {object} entry The menu entry under test.
 * @return {object} Complete v2 manifest.
 */
function manifestWithEntry(entry) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '2.24.0',
		menu: [entry],
		pages: [],
	}
}

describe('menuItem.section — integrations', () => {
	it('accepts section: "integrations" on a top-level entry', () => {
		const result = validateManifestV2(manifestWithEntry({
			id: 'AvgRegisterLink',
			label: 'Processing activities (AVG)',
			icon: 'ShieldLockOutline',
			href: '/apps/openregister/#/avg',
			section: 'integrations',
			order: 10,
		}))
		expect(result.valid).toBe(true)
	})

	it('still accepts the three pre-existing sections', () => {
		for (const section of ['main', 'footer', 'settings']) {
			const result = validateManifestV2(manifestWithEntry({ id: 'X', label: 'X', route: 'X', section }))
			expect(result.valid).toBe(true)
		}
	})

	it('rejects an unknown section', () => {
		const result = validateManifestV2(manifestWithEntry({ id: 'X', label: 'X', route: 'X', section: 'sidebar' }))
		expect(result.valid).toBe(false)
	})

	it('accepts an integrations entry gated on appInstalled', () => {
		// The gate that stops the section advertising a link into an app the
		// instance does not have.
		const result = validateManifestV2(manifestWithEntry({
			id: 'AiOversightLink',
			label: 'AI oversight',
			href: '/apps/hermiq/ai-oversight',
			section: 'integrations',
			visibleIf: { appInstalled: 'hermiq' },
		}))
		expect(result.valid).toBe(true)
	})

	it('accepts section: "integrations" on a nested child entry', () => {
		const result = validateManifestV2(manifestWithEntry({
			id: 'Group',
			label: 'Group',
			children: [{ id: 'Child', label: 'Child', href: '/apps/other', section: 'integrations' }],
		}))
		expect(result.valid).toBe(true)
	})
})
