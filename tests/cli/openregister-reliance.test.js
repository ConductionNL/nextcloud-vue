/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const { computeReliance, countDirect, tierOf, pageSlug } = require('../../scripts/openregister-reliance.js')

function fixture(files) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reliance-'))
	for (const [relative, content] of Object.entries(files)) {
		const full = path.join(root, relative)
		fs.mkdirSync(path.dirname(full), { recursive: true })
		fs.writeFileSync(full, content)
	}
	return root
}

describe('openregister reliance', () => {
	test('tiers follow the summed score', () => {
		expect(tierOf(0)).toBe('none')
		expect(tierOf(3)).toBe('light')
		expect(tierOf(4)).toBe('medium')
		expect(tierOf(10)).toBe('medium')
		expect(tierOf(11)).toBe('heavy')
	})

	test('page slugs are kebab case', () => {
		expect(pageSlug('CnDeleteDialog')).toBe('cn-delete-dialog')
		expect(pageSlug('CnKpiGrid')).toBe('cn-kpi-grid')
	})

	test('direct markers ignore comments', () => {
		expect(countDirect("// talks to openregister\nimport { useObjectStore } from '../../store/useObjectStore.js'\nconst url = '/apps/openregister/api/objects'\n")).toBe(2)
	})

	test('a wrapper inherits reliance from the files it imports, not from the registry hub', () => {
		const root = fixture({
			'src/store/useObjectStore.js': "export const useObjectStore = () => fetch('/apps/openregister/api/objects')\n",
			'src/components/CnPlain/CnPlain.vue': '<template><div /></template>\n',
			'src/components/CnDirect/CnDirect.vue': "<script>import { useObjectStore } from '../../store/useObjectStore.js'\nexport default {}</script>\n",
			'src/components/CnWrapper/CnWrapper.vue': "<script>import CnDirect from '../CnDirect/CnDirect.vue'\nexport default { components: { CnDirect } }</script>\n",
			'src/components/CnHub/registry.js': "import CnDirect from '../CnDirect/CnDirect.vue'\nimport CnPlain from '../CnPlain/CnPlain.vue'\nexport const registry = { CnDirect, CnPlain }\n",
			'src/components/CnWidget/CnWidget.vue': "<script>import { helper } from '../CnHub/helper.js'\nexport default {}</script>\n",
			'src/components/CnHub/helper.js': 'export const helper = () => 1\n',
			'docs/components/cn-plain.md': '# CnPlain\n',
		})

		const reliance = computeReliance(path.join(root, 'src'), path.join(root, 'docs/components'))

		expect(reliance.CnPlain).toEqual({ direct: 0, transitive: 0, tier: 'none', via: [], page: 'cn-plain' })
		expect(reliance.CnDirect.direct).toBe(1)
		expect(reliance.CnDirect.transitive).toBe(1)
		expect(reliance.CnDirect.tier).toBe('light')
		expect(reliance.CnWrapper.direct).toBe(0)
		expect(reliance.CnWrapper.transitive).toBe(2)
		expect(reliance.CnWrapper.via).toEqual(['CnDirect'])
		expect(reliance.CnWidget.tier).toBe('none')
		expect(reliance.CnWidget.page).toBeNull()
		expect(reliance.CnHub.tier).toBe('light')
	})
})
