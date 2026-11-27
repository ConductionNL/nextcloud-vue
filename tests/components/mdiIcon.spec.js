import { mount } from '@vue/test-utils'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * mdiIcon() replaces one vue-material-design-icons SFC per lookup-table entry,
 * so the eager chunk no longer carries ~210 compiled components. Users must not
 * see a difference: every icon renders the package's DOM, attributes and click.
 */
import fs from 'fs'
import path from 'path'
import { CSS_ICON_TO_MDI } from '../../src/components/CnIcon/cssIconBridge.js'
import { mdiIcon, mdiIconClassStem } from '../../src/components/CnIcon/mdiIcon.js'
import { MDI_PATHS } from '../../src/components/CnIcon/mdiPaths.js'
import { SEMANTIC_ICON_COMPONENTS } from '../../src/components/CnIcon/semanticIcons.js'
import { DASHBOARD_ICONS } from '../../src/components/CnWidgetGrid/widgetIcons.js'

const ROOT = path.resolve(__dirname, '../..')
// @mdi/js is mocked for the suite; read the real package by path.
const REAL_MDI = require(path.join(ROOT, 'node_modules/@mdi/js/commonjs/mdi.js'))
const NAMES = Object.keys(MDI_PATHS)

/**
 * The package's own SFC for an icon name.
 *
 * @param {string} name PascalCase icon name.
 * @return {object} The component.
 */
function packageIcon(name) {
	return require(`vue-material-design-icons/${name}.vue`).default
}

/**
 * Every `mdiIcon('<Name>')` call under src/.
 *
 * @param {string} dir Directory to walk.
 * @return {string[]} Requested names.
 */
function requestedNames(dir) {
	return fs.readdirSync(dir).flatMap((entry) => {
		const full = path.join(dir, entry)
		if (fs.statSync(full).isDirectory()) {
			return requestedNames(full)
		}
		if (!/\.(js|vue)$/.test(entry)) {
			return []
		}
		return [...fs.readFileSync(full, 'utf8').matchAll(/\bmdiIcon\('([A-Za-z0-9]+)'\)/g)].map((m) => m[1])
	})
}

describe('mdiIcon', () => {
	it('mdiPaths.js holds exactly the requested icons, with @mdi/js paths (run scripts/generate-mdi-paths.mjs when this fails)', () => {
		expect([...new Set(requestedNames(path.join(ROOT, 'src')))].sort()).toEqual([...NAMES].sort())
		const wrong = NAMES.filter((name) => MDI_PATHS[name] !== REAL_MDI[`mdi${name}`])
		expect(wrong).toEqual([])
	})

	it('renders the same HTML as the package SFC for every icon, with and without props', () => {
		const variants = [{}, { title: 'Label', size: 16, fillColor: '#123456' }]
		const differ = []
		for (const name of NAMES) {
			for (const props of variants) {
				const attrs = { class: 'extra', 'data-x': '1' }
				const ours = mount(mdiIcon(name), { props, attrs }).html()
				const theirs = mount(packageIcon(name), { props, attrs }).html()
				if (ours !== theirs) {
					differ.push(`${name} ${JSON.stringify(props)}\n${ours}\n${theirs}`)
				}
			}
		}
		expect(differ).toEqual([])
	})

	it('keeps the package component name and class stem', () => {
		for (const name of NAMES) {
			expect(mdiIcon(name).name).toBe(packageIcon(name).name)
			const source = fs.readFileSync(path.join(ROOT, `node_modules/vue-material-design-icons/${name}.vue`), 'utf8')
			expect(mdiIconClassStem(name)).toBe(source.match(/class="material-design-icon ([^"]+)-icon"/)[1])
		}
	})

	it('emits click with the DOM event', async () => {
		const wrapper = mount(mdiIcon('Account'))
		await wrapper.trigger('click')
		expect(wrapper.emitted('click')).toHaveLength(1)
		expect(wrapper.emitted('click')[0][0]).toBeInstanceOf(Event)
	})

	it('returns one shared component per name across the tables', () => {
		expect(mdiIcon('Account')).toBe(mdiIcon('Account'))
		expect(CSS_ICON_TO_MDI['icon-user']).toBe(DASHBOARD_ICONS.Account)
		expect(SEMANTIC_ICON_COMPONENTS.AccountGroupOutline).toBe(mdiIcon('AccountGroupOutline'))
	})
})
