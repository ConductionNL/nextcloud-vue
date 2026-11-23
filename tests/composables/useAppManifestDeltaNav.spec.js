/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * A backend `/api/manifest` delta reaches the navigation.
 *
 * dossiq's "My case types" caption (with its pencil `href`) and the
 * `ct-<uuid>` entries arrive through `useAppManifest(..., { mergeStrategy:
 * 'delta' })`. On 2026-10-10 they never rendered: the compiled validator
 * called Ajv runtime helpers through a `require()` a consumer's webpack
 * dropped, so validation threw, a silent catch kept the bundled manifest, and
 * the nav showed the static caption only.
 *
 * @spec openspec/changes/manifest-validator-self-contained/specs/manifest-validator-self-contained/spec.md#requirement-a-backend-manifest-delta-reaches-the-navigation
 * @spec openspec/changes/manifest-validator-self-contained/specs/manifest-validator-self-contained/spec.md#requirement-the-compiled-validator-needs-no-runtime-module
 */

import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import { defineComponent, h, nextTick } from 'vue'

jest.mock('@nextcloud/capabilities', () => ({
	getCapabilities: jest.fn(() => ({})),
}))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		post: jest.fn().mockRejectedValue(new Error('no batch route')),
		get: jest.fn().mockRejectedValue(new Error('no route')),
	},
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((p) => `/index.php${p}`),
	generateOcsUrl: jest.fn((p) => `/ocs/v2.php${p}`),
	linkTo: jest.fn((app, file) => `/${app}/${file}`),
	imagePath: jest.fn((app, file) => `/${app}/img/${file}`),
}))

const { useAppManifest } = require('../../src/composables/useAppManifest.js')
const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default

const bundled = {
	$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
	version: '1.0.0',
	dependencies: [],
	menu: [
		{ id: 'Cases', label: 'Cases', route: 'Cases', order: 20 },
		{ id: 'MyCaseTypesCaption', type: 'caption', label: 'My case types', order: 30 },
	],
	pages: [{ id: 'Cases', route: '/cases', type: 'index', title: 'Cases', config: { register: 'dossiq', schema: 'case' } }],
}

const delta = {
	menu: [
		{ id: 'MyCaseTypesCaption', type: 'caption', label: 'My case types', order: 30, href: '/settings/user/dossiq' },
		{ id: 'ct-8510135b', label: 'Omgevingsvergunning', icon: 'FolderOutline', route: 'Cases', query: { caseType: '8510135b' }, order: 31 },
	],
}

/**
 * Drain the composable's async chain (fetch, sentinels, lazy validator).
 *
 * @return {Promise<void>}
 */
async function flush() {
	for (let i = 0; i < 5; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

describe('a backend manifest delta reaches CnAppNav', () => {
	it('renders the delta caption with its pencil link and the added entries', async () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const fetcher = jest.fn().mockResolvedValue({ status: 200, data: delta })
		const Host = defineComponent({
			setup() {
				const { manifest } = useAppManifest('dossiq', bundled, { mergeStrategy: 'delta', fetcher })
				return { manifest }
			},
			render() {
				return h(CnAppRoot, { manifest: this.manifest, appId: 'dossiq', translate: (k) => k, requiresApps: [] })
			},
		})

		const wrapper = mount(Host, {
			global: {
				mocks: { $route: { name: 'Cases', query: {} } },
				stubs: { 'router-view': { template: '<div />' }, 'router-link': { template: '<a><slot /></a>' } },
			},
		})
		expect(wrapper.find('[data-testid="cn-nav-caption-edit-MyCaseTypesCaption"]').exists()).toBe(false)

		await flush()

		const nav = wrapper.findComponent({ name: 'CnAppNav' })
		const caption = nav.props('manifest').menu.find((e) => e.id === 'MyCaseTypesCaption')
		expect(caption.href).toBe('/settings/user/dossiq')
		expect(wrapper.find('[data-testid="cn-nav-caption-edit-MyCaseTypesCaption"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-nav-entry-ct-8510135b"]').exists()).toBe(true)
		expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('[useAppManifest]'), expect.anything())
		warn.mockRestore()
		wrapper.unmount()
	})

	it('says so when resolving the manifest throws, and keeps the bundled one', async () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const { manifest, isLoading } = useAppManifest('dossiq', bundled, {
			mergeStrategy: 'delta',
			fetcher: jest.fn().mockResolvedValue({ status: 200, data: delta }),
			// A sentinel lookup that throws stands in for any failure past the fetch.
			getAppConfigValue: () => { throw new Error('boom') },
		})
		// A sentinel makes the resolver call getAppConfigValue.
		manifest.value.pages[0].config.schema = '@resolve:case_schema'
		await flush()
		expect(isLoading.value).toBe(false)
		expect(manifest.value).toBe(bundled)
		expect(warn).toHaveBeenCalledWith('[useAppManifest] Could not resolve the manifest; keeping the bundled manifest.', expect.any(Error))
		manifest.value.pages[0].config.schema = 'case'
		warn.mockRestore()
	})
})

describe('the compiled manifest validator', () => {
	it('requires no runtime module, so no bundler can drop one', () => {
		const compiled = fs.readFileSync(path.resolve(__dirname, '../../src/utils/validateManifestV2.compiled.js'), 'utf-8')
		expect(compiled).not.toMatch(/require\(/)
	})

	it('still checks a string length', () => {
		const { validateManifest } = require('../../src/utils/validateManifest.js')
		const ok = validateManifest(bundled)
		expect(ok.valid).toBe(true)
		// `nav.help.label` carries `minLength: 1`, checked through Ajv's ucs2length.
		const bad = validateManifest({ ...bundled, nav: { help: { label: '' } } })
		expect(bad.valid).toBe(false)
	})
})
