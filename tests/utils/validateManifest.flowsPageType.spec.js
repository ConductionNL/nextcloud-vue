/**
 * Schema cover for the `flows` / `flow-detail` page types (ADR-110 Decision 4).
 *
 * Run against the COMPILED validator, which is what the app loads at runtime —
 * Nextcloud's CSP forbids `new Function()`, so it is built ahead of time. A
 * test reading the .json instead of the artifact cannot see a stale build.
 */

import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

/**
 * Build a minimal valid v2 manifest carrying one page.
 *
 * @param {object} page The page under test.
 * @return {object} Complete v2 manifest.
 */
function manifestWithPage(page) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '2.25.0',
		menu: [{ id: 'M', label: 'M', route: page.id }],
		pages: [page],
	}
}

describe('page type — flows / flow-detail', () => {
	it('accepts a flows page scoped to an app', () => {
		const r = validateManifestV2(manifestWithPage({
			id: 'Flows',
			route: '/flows',
			type: 'flows',
			title: 'Flows',
			config: { app: 'dossiq' },
		}))
		expect(r.valid).toBe(true)
	})

	it('accepts a flow-detail page with a sidebarComponent', () => {
		const r = validateManifestV2(manifestWithPage({
			id: 'FlowDetail',
			route: '/flows/:id',
			type: 'flow-detail',
			title: 'Flow',
			config: { app: 'dossiq' },
			sidebarComponent: 'FlowDetailSidebar',
		}))
		expect(r.valid).toBe(true)
	})

	it('accepts a flows page with no app (the fleet-wide surface)', () => {
		const r = validateManifestV2(manifestWithPage({
			id: 'Flows', route: '/flows', type: 'flows', title: 'Flows', config: {},
		}))
		expect(r.valid).toBe(true)
	})

	it('still rejects an unknown page type', () => {
		const r = validateManifestV2(manifestWithPage({
			id: 'X', route: '/x', type: 'flowchart', title: 'X',
		}))
		expect(r.valid).toBe(false)
	})

	it('keeps every pre-existing page type valid', () => {
		for (const type of ['index', 'detail', 'dashboard', 'logs', 'settings', 'chat', 'files', 'form', 'map', 'roadmap', 'search']) {
			const r = validateManifestV2(manifestWithPage({
				id: 'P',
				route: '/p',
				type,
				title: 'P',
				config: { register: 'r', schema: 's' },
			}))
			expect({ type, valid: r.valid }).toEqual({ type, valid: true })
		}
	})
})
