// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// After `npm run build`: the published ESM entry installs the stylesheet
// through library-style.js (once per page, newest build wins), and component
// scope ids hash path AND source, so two library versions of a changed
// component never share a selector. Exits 1 with the reason otherwise.

import fs from 'fs'
import { createRequire } from 'module'
import path from 'path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
// The very hash function rollup-plugin-vue uses (its own dependency, not ours).
const hash = createRequire(import.meta.url)(path.join(root, 'node_modules/rollup-plugin-vue/node_modules/hash-sum'))
const problems = []

const entry = fs.readFileSync(path.join(root, 'dist/esm/index.js'), 'utf8')
if (!entry.startsWith("import './library-style.js';")) {
	problems.push('dist/esm/index.js does not start with the library-style.js import')
}
if (entry.includes("import './nextcloud-vue.css'")) {
	problems.push('dist/esm/index.js still imports nextcloud-vue.css directly')
}
const style = path.join(root, 'dist/esm/library-style.js')
if (!fs.existsSync(style)) {
	problems.push('dist/esm/library-style.js was not emitted')
} else {
	const text = fs.readFileSync(style, 'utf8')
	const sheet = fs.readFileSync(path.join(root, 'dist/esm/nextcloud-vue.css'), 'utf8')
	if (!text.includes('function installLibraryStyle(') || !text.includes(JSON.stringify(sheet).slice(0, 200))) {
		problems.push('dist/esm/library-style.js does not carry the installer and the stylesheet')
	}
}

// One component whose scope id is known: path + source, as rollup-plugin-vue's production mode hashes it.
const file = 'src/components/CnObjectListWidget/CnObjectListWidget.vue'
const source = fs.readFileSync(path.join(root, file), 'utf8')
const contentId = hash(file + '\n' + source)
const pathId = hash(file)
const built = fs.readFileSync(path.join(root, 'dist/esm/nextcloud-vue.css'), 'utf8')
if (!built.includes(`cn-object-list-widget__add[data-v-${contentId}]`)) {
	problems.push(`CnObjectListWidget's rules are not scoped by path + source (expected data-v-${contentId})`)
}
if (built.includes(`[data-v-${pathId}]`)) {
	problems.push(`CnObjectListWidget's rules still carry the path-only id data-v-${pathId}`)
}

if (problems.length > 0) {
	console.error('check-library-style:\n  ' + problems.join('\n  '))
	process.exit(1)
}
console.log('check-library-style: the entry installs the stylesheet once per page; scope ids hash path and source.')
