/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @jest-environment node
 *
 * Proof for `LibraryStylesheetCopy` in `@conduction/nextcloud-vue/webpack`:
 * after emit it writes the library stylesheet to the app's css/ folder, so
 * the page links it instead of a bundle inserting it as text.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const { LibraryStylesheetCopy, libraryStylesheetSource } = require('../../webpack/index.js')

function fakeCompiler(context) {
	const taps = []
	return {
		context,
		hooks: { afterEmit: { tap: (name, fn) => taps.push({ name, fn }) } },
		emit: () => taps.forEach(({ fn }) => fn()),
		taps,
	}
}

describe('libraryStylesheetSource', () => {
	it('follows the @import of css/index.css', () => {
		const resolve = () => '/pkg/css/index.css'
		expect(libraryStylesheetSource(resolve, () => "/* x */\n@import '../dist/nextcloud-vue.base.css';\n"))
			.toBe(path.resolve('/pkg/dist/nextcloud-vue.base.css'))
	})

	it('falls back to css/index.css itself when it imports nothing', () => {
		expect(libraryStylesheetSource(() => '/pkg/css/index.css', () => '.a{}')).toBe('/pkg/css/index.css')
	})
})

describe('LibraryStylesheetCopy', () => {
	let app
	beforeEach(() => {
		app = fs.mkdtempSync(path.join(os.tmpdir(), 'cn-sheet-'))
	})
	afterEach(() => {
		fs.rmSync(app, { recursive: true, force: true })
	})

	it('copies the sheet to css/nextcloud-vue.css under the app root after emit, not before', () => {
		const from = path.join(app, 'source.css')
		fs.writeFileSync(from, '.cn-x{color:red}')
		const compiler = fakeCompiler(app)
		new LibraryStylesheetCopy({ from }).apply(compiler)

		expect(compiler.taps.map(({ name }) => name)).toEqual(['LibraryStylesheetCopy'])
		expect(fs.existsSync(path.join(app, 'css', 'nextcloud-vue.css'))).toBe(false)
		compiler.emit()
		expect(fs.readFileSync(path.join(app, 'css', 'nextcloud-vue.css'), 'utf8')).toBe('.cn-x{color:red}')
	})

	it('writes where `to` says', () => {
		const from = path.join(app, 'source.css')
		fs.writeFileSync(from, '.a{}')
		const compiler = fakeCompiler(app)
		new LibraryStylesheetCopy({ from, to: 'css/lib/sheet.css' }).apply(compiler)
		compiler.emit()
		expect(fs.existsSync(path.join(app, 'css', 'lib', 'sheet.css'))).toBe(true)
	})
})
