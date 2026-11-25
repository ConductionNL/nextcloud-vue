/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The library imports each Nc* component from its own @nextcloud/vue entry.
 * @nextcloud/vue 9 declares no sideEffects, so an import from its index kept
 * every component in the consumer's bundle: an app importing CnAppRoot carried
 * 3.0 MB minified in its eager chunk, 1.1 MB once these imports are deep.
 */

import fs from 'fs'
import path from 'path'
import { nextcloudVueComponents, nextcloudVueDeepImports, rewriteNextcloudVueImports } from '../../rollup.nextcloud-vue-deep.mjs'

const ROOT = path.join(__dirname, '../..')
const COMPONENTS = new Set(['NcButton', 'NcSelect', 'NcDialog'])

describe('rewriteNextcloudVueImports', () => {
	it('turns each component into a default import of its own entry', () => {
		const out = rewriteNextcloudVueImports("import { NcButton, NcSelect } from '@nextcloud/vue';\nfoo()\n", COMPONENTS)
		expect(out.toString()).toBe("import NcButton from '@nextcloud/vue/components/NcButton';\nimport NcSelect from '@nextcloud/vue/components/NcSelect';\nfoo()\n")
	})

	it('keeps the local name of an aliased import', () => {
		const out = rewriteNextcloudVueImports('import { NcButton as Btn } from "@nextcloud/vue"', COMPONENTS)
		expect(out.toString()).toBe('import Btn from "@nextcloud/vue/components/NcButton";')
	})

	it('leaves names without a component entry on the index', () => {
		const out = rewriteNextcloudVueImports("import { NcDialog, emojiSearch } from '@nextcloud/vue';", COMPONENTS)
		expect(out.toString()).toBe("import NcDialog from '@nextcloud/vue/components/NcDialog';\nimport { emojiSearch } from '@nextcloud/vue';")
	})

	it('changes nothing without a component import', () => {
		expect(rewriteNextcloudVueImports("import { emojiSearch } from '@nextcloud/vue';", COMPONENTS)).toBeNull()
		expect(rewriteNextcloudVueImports("export * from '@nextcloud/vue';", COMPONENTS)).toBeNull()
		expect(rewriteNextcloudVueImports("import NcDialog from '@nextcloud/vue/components/NcDialog';", COMPONENTS)).toBeNull()
	})

	it('handles a multi-line import', () => {
		const out = rewriteNextcloudVueImports("import {\n\tNcButton,\n\tNcSelect,\n} from '@nextcloud/vue'\n", COMPONENTS)
		expect(out.toString()).toBe("import NcButton from '@nextcloud/vue/components/NcButton';\nimport NcSelect from '@nextcloud/vue/components/NcSelect';\n")
	})
})

describe('nextcloudVueComponents', () => {
	it('lists the installed @nextcloud/vue component entries', () => {
		const names = nextcloudVueComponents(ROOT)
		expect(names.has('NcButton')).toBe(true)
		expect(names.has('NcAppSidebar')).toBe(true)
		expect(names.has('useIsMobile')).toBe(false)
	})

	it('has an entry for every Nc* name the library source imports', () => {
		const names = nextcloudVueComponents(ROOT)
		const used = new Set()
		const walk = (dir) => {
			for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
				const file = path.join(dir, entry.name)
				if (entry.isDirectory()) {
					walk(file)
				} else if (/\.(js|vue)$/.test(entry.name)) {
					for (const match of fs.readFileSync(file, 'utf8').matchAll(/import\s*\{([^}]*)\}\s*from\s*'@nextcloud\/vue'/g)) {
						match[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean).forEach((n) => used.add(n))
					}
				}
			}
		}
		walk(path.join(ROOT, 'src'))
		expect(used.size).toBeGreaterThan(10)
		expect([...used].filter((n) => !names.has(n))).toEqual([])
	})
})

describe('nextcloudVueDeepImports plugin', () => {
	it('rewrites ES chunks with a source map and leaves CommonJS output alone', () => {
		const plugin = nextcloudVueDeepImports()
		const code = "import { NcButton } from '@nextcloud/vue';\n"
		const result = plugin.renderChunk(code, {}, { format: 'es' })
		expect(result.code).toBe("import NcButton from '@nextcloud/vue/components/NcButton';\n")
		expect(result.map.mappings).not.toBe('')
		expect(plugin.renderChunk(code, {}, { format: 'cjs' })).toBeNull()
	})
})
