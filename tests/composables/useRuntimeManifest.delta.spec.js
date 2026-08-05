/**
 * Tests for the opt-in `delta` merge mode of useRuntimeManifest.
 *
 * Covers the manifest-delta-merge capability:
 * - delta mode merges the fetched payload onto the stub base
 * - default mode still fully replaces (regression guard)
 * - orphaned delta paths are surfaced
 */

import { nextTick } from 'vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((path) => `/index.php${path}`),
}))

const { useRuntimeManifest } = require('../../src/composables/useRuntimeManifest.js')

const SCHEMA = 'https://conduction.nl/schemas/app-manifest-v2.schema.json'

const stub = {
	$schema: SCHEMA,
	version: '1.0.0',
	menu: [{ id: 'home', label: 'Home', route: 'home' }],
	pages: [
		{ id: 'home', route: '/', type: 'index', title: 'Home', widgets: [] },
		{ id: 'about', route: '/about', type: 'index', title: 'About', widgets: [] },
	],
}

async function flush() {
	await nextTick()
	await Promise.resolve()
	await nextTick()
}

describe('useRuntimeManifest — delta mode', () => {
	beforeEach(() => jest.clearAllMocks())

	it('merges a delta onto the stub base, keeping untouched pages', async () => {
		const delta = { pages: [{ id: 'home', title: 'Dashboard' }] }
		const fetcher = jest.fn().mockResolvedValue({ status: 200, data: delta })
		const { manifest, orphanedDeltaPaths } = useRuntimeManifest('app', stub, { fetcher, mergeStrategy: 'delta' })
		await flush()
		expect(manifest.value.pages.find((p) => p.id === 'home').title).toBe('Dashboard')
		expect(manifest.value.pages.find((p) => p.id === 'about').title).toBe('About')
		expect(orphanedDeltaPaths.value).toEqual([])
	})

	it('default mode still fully replaces (regression guard)', async () => {
		const full = { ...stub, version: '2.0.0', pages: [{ id: 'home', route: '/', type: 'index', title: 'Only', widgets: [] }] }
		const fetcher = jest.fn().mockResolvedValue({ status: 200, data: full })
		const { manifest } = useRuntimeManifest('app', stub, { fetcher })
		await flush()
		expect(manifest.value.pages).toHaveLength(1)
		expect(manifest.value).toBe(full)
	})

	it('surfaces orphaned delta paths from a remove of a missing page', async () => {
		const delta = { pages: [{ id: 'ghost', $op: 'remove' }] }
		const fetcher = jest.fn().mockResolvedValue({ status: 200, data: delta })
		const { orphanedDeltaPaths } = useRuntimeManifest('app', stub, { fetcher, mergeStrategy: 'delta' })
		await flush()
		expect(orphanedDeltaPaths.value).toEqual(['pages/ghost'])
	})
})
