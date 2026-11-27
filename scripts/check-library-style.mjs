// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// After `npm run build`: the published ESM entry installs the stylesheet
// through library-style.js (once per page, newest build wins; the board-look
// rules as a second sheet that stays off until used), and component
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
	// The board-look rules ride as their own argument, switched off until the board look is used.
	const call = text.match(/\ninstallLibraryStyle\(("(?:[^"\\]|\\.)*"), "[^"]*", undefined, ("(?:[^"\\]|\\.)*")\)\n$/)
	if (!call) {
		problems.push('dist/esm/library-style.js does not pass the board-look rules as their own sheet')
	} else {
		const base = JSON.parse(call[1])
		const board = JSON.parse(call[2])
		if (base.includes('cn-board-look-start')) {
			problems.push('the library sheet still holds the board-look block')
		}
		if (!board.includes('.cn-look-board') || !board.includes(':has(')) {
			problems.push('the board-look sheet does not hold the board-look :has() rules')
		}
	}
}

// What apps import (css/index.css): the sheet without the board-look block,
// which enableBoardLookStyle() adds from utils/boardLookSheet.js on demand.
const appSheet = path.join(root, 'dist/nextcloud-vue.base.css')
if (!fs.readFileSync(path.join(root, 'css/index.css'), 'utf8').includes("@import '../dist/nextcloud-vue.base.css';")) {
	problems.push('css/index.css does not import dist/nextcloud-vue.base.css')
}
if (!fs.existsSync(appSheet)) {
	problems.push('dist/nextcloud-vue.base.css was not emitted')
} else {
	const base = fs.readFileSync(appSheet, 'utf8')
	if (base.includes('cn-board-look-start') || !base.includes('/*! cn-board-look-slot */')) {
		problems.push('dist/nextcloud-vue.base.css still holds the board-look block, or lacks the slot marker')
	}
}
const boardModule = fs.readFileSync(path.join(root, 'dist/esm/utils/boardLookSheet.js'), 'utf8')
const boardRules = boardModule.match(/const BOARD_LOOK_CSS = ("(?:[^"\\]|\\.)*");/)
if (!boardRules || !JSON.parse(boardRules[1]).includes('.cn-look-board') || !JSON.parse(boardRules[1]).includes(':has(')) {
	problems.push('dist/esm/utils/boardLookSheet.js does not carry the board-look :has() rules')
}
if (!fs.readFileSync(path.join(root, 'dist/esm/utils/boardLookStyle.js'), 'utf8').includes('addBoardSheet(target, BOARD_LOOK_CSS, BOARD_LOOK_BUILT)')) {
	problems.push('dist/esm/utils/boardLookStyle.js no longer adds the board sheet from boardLookSheet.js')
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
console.log('check-library-style: the entry installs the stylesheet once per page, the board-look rules as their own sheet; css/index.css carries no board-look block, boardLookSheet.js does; scope ids hash path and source.')
