/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The run time keeps every board-look `:has()` flag on exactly the elements
 * that match its compound, through DOM changes.
 *
 * @spec openspec/changes/board-look-has-flags/specs/library-stylesheet/spec.md#requirement-the-board-look-anchors-no-has-outside-the-subject
 */
import { installHasFlags } from '../../src/utils/hasFlags.js'

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('hasFlags', () => {
	afterEach(() => {
		document.body.innerHTML = ''
		delete window.__cnHasFlags
	})

	test('flags the matching elements at once and after DOM changes', async () => {
		document.body.innerHTML = '<div class="a" id="one"></div><div class="a b" id="two"></div>'
		installHasFlags([['cn-h-t1', '.a.b', '.a']], ['class'])
		expect(document.getElementById('two').classList.contains('cn-h-t1')).toBe(true)
		expect(document.getElementById('one').classList.contains('cn-h-t1')).toBe(false)

		document.getElementById('one').classList.add('b')
		document.getElementById('two').classList.remove('b')
		await tick()
		expect(document.getElementById('one').classList.contains('cn-h-t1')).toBe(true)
		expect(document.getElementById('two').classList.contains('cn-h-t1')).toBe(false)

		const three = document.createElement('div')
		three.className = 'a b'
		document.body.appendChild(three)
		await tick()
		expect(three.classList.contains('cn-h-t1')).toBe(true)
	})

	test('a flag wiped by a class rewrite comes back', async () => {
		document.body.innerHTML = '<p class="a b" id="p"></p>'
		installHasFlags([['cn-h-t2', '.a.b', '.a']])
		const p = document.getElementById('p')
		p.setAttribute('class', 'a b')
		await tick()
		expect(p.classList.contains('cn-h-t2')).toBe(true)
	})

	test('watches the attributes the compounds read', async () => {
		document.body.innerHTML = '<i class="a" id="i"></i>'
		installHasFlags([['cn-h-t3', '.a[data-testid="go"]', '.a']], ['data-testid'])
		const i = document.getElementById('i')
		expect(i.classList.contains('cn-h-t3')).toBe(false)
		i.setAttribute('data-testid', 'go')
		await tick()
		expect(i.classList.contains('cn-h-t3')).toBe(true)
	})

	test('a compound whose key is not on the page is not queried', () => {
		document.body.innerHTML = '<div class="other"></div>'
		const spy = jest.spyOn(document, 'querySelectorAll')
		installHasFlags([['cn-h-t4', '.absent.x', '.absent']])
		expect(spy).not.toHaveBeenCalledWith('.absent.x')
		spy.mockRestore()
	})

	test('a second build adds its flags to the same engine', () => {
		document.body.innerHTML = '<div class="a b c"></div>'
		const first = installHasFlags([['cn-h-t5', '.a.b', '.a']])
		const second = installHasFlags([['cn-h-t5', '.a.b', '.a'], ['cn-h-t6', '.a.c', '.a']])
		expect(second).toBe(first)
		expect(first.entries.size).toBe(2)
		expect(document.querySelector('.a').className).toBe('a b c cn-h-t5 cn-h-t6')
	})

	test('a compound the browser cannot parse is skipped, and nothing to do is a no-op', () => {
		expect(installHasFlags([])).toBeNull()
		const engine = installHasFlags([['cn-h-t7', '.a:::bad', '.a']])
		expect(engine.entries.has('cn-h-t7')).toBe(false)
	})
})
