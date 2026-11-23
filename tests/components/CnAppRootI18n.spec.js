/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/manifest-i18n-labels/tasks.md#task-2
 */
import { mount } from '@vue/test-utils'
import { h } from 'vue'

jest.mock('@nextcloud/capabilities', () => ({ getCapabilities: jest.fn() }))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { post: jest.fn().mockRejectedValue(new Error('x')), get: jest.fn().mockRejectedValue(new Error('x')) },
}))
jest.mock('@nextcloud/l10n', () => ({
	...jest.requireActual('@nextcloud/l10n'),
	getLanguage: jest.fn(() => 'en'),
}))
const { getLanguage } = require('@nextcloud/l10n')
const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default

const manifest = {
	version: '1.0.0',
	i18n: { sourceLanguage: 'nl', languages: ['en', 'de'], labels: { en: { Vergunningen: 'Permits' }, de: { Vergunningen: 'Genehmigungen' } } },
	menu: [{ id: 'home', label: 'Vergunningen', route: 'home' }],
	pages: [{ id: 'home', route: '/', type: 'index', title: 'Vergunningen' }],
	dependencies: [],
}

let seen
const Probe = {
	inject: { cnTranslate: { default: null } },
	created() {
		seen = this.cnTranslate
	},
	render() {
		return h('span', { class: 'probe' })
	},
}

function mountRoot(props = {}) {
	return mount(CnAppRoot, {
		props: { manifest, appId: 'myapp', requiresApps: [], translate: (k) => k, ...props },
		slots: { footer: () => h(Probe) },
		global: { mocks: { $route: { name: 'home' } }, stubs: { 'router-view': true } },
	})
}

describe('CnAppRoot label lookup', () => {
	beforeEach(() => {
		seen = null
		getLanguage.mockReturnValue('en')
	})

	it('provides a lookup that tries the manifest for the user\'s language first', async () => {
		mountRoot()
		await new Promise((r) => setTimeout(r, 0))
		expect(seen('Vergunningen')).toBe('Permits')
		expect(seen('Overig')).toBe('Overig')
	})

	it('falls back to the host translate for a text the manifest lacks', async () => {
		mountRoot({ translate: (k) => (k === 'Overig' ? 'Other' : k) })
		await new Promise((r) => setTimeout(r, 0))
		expect(seen('Overig')).toBe('Other')
		expect(seen('Vergunningen')).toBe('Permits')
	})

	it('the language prop overrides the user\'s language (the preview case)', async () => {
		mountRoot({ language: 'de' })
		await new Promise((r) => setTimeout(r, 0))
		expect(seen('Vergunningen')).toBe('Genehmigungen')
	})

	it('a user in the source language gets the host translate, not the manifest', async () => {
		getLanguage.mockReturnValue('nl')
		mountRoot({ translate: (k) => `host:${k}` })
		await new Promise((r) => setTimeout(r, 0))
		expect(seen('Vergunningen')).toBe('host:Vergunningen')
	})

	it('reads the live manifest: a changed prop shows in the next lookup', async () => {
		const w = mountRoot()
		await new Promise((r) => setTimeout(r, 0))
		expect(seen('Vergunningen')).toBe('Permits')
		await w.setProps({ manifest: { ...manifest, i18n: { ...manifest.i18n, labels: { en: { Vergunningen: 'Licences' } } } } })
		expect(seen('Vergunningen')).toBe('Licences')
	})

	it('hands the same lookup to the walkthrough', async () => {
		const w = mountRoot()
		await new Promise((r) => setTimeout(r, 0))
		expect(w.vm.manifestTranslate('Vergunningen')).toBe('Permits')
		expect(w.vm.manifestTranslate).toBe(seen)
	})

	it('a manifest without i18n behaves as before: the host translate runs', async () => {
		mountRoot({ manifest: { ...manifest, i18n: undefined }, translate: (k) => k.toUpperCase() })
		await new Promise((r) => setTimeout(r, 0))
		expect(seen('abc')).toBe('ABC')
	})
})
