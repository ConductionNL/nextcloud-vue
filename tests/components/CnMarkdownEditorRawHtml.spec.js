/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Raw HTML in stored markdown, opened in CnMarkdownEditor's WYSIWYG mode,
 * against the REAL `@toast-ui/editor` (the global jest mapping swaps in a
 * stub). Toast UI converts a raw HTML block or tag by handing it to its own
 * inlined DOMPurify 2.3.3 and writing the result into a `div` of the live
 * document with `innerHTML`; `customHTMLSanitizer` does not reach that path.
 *
 * The payload is the attribute-based mXSS carrier from DOMPurify's own test
 * vectors: markup inside an attribute value that turns into a live
 * `<img onerror>` when a browser re-parses it in a raw-text context.
 * DOMPurify 2.3.3 keeps the attribute; 3.4.x (SAFE_FOR_XML) removes it.
 */

import { mount } from '@vue/test-utils'
import path from 'path'
import CnMarkdownEditor from '@/components/CnMarkdownEditor/CnMarkdownEditor.vue'

jest.mock('@toast-ui/editor', () => jest.requireActual(require('path').resolve(__dirname, '../../node_modules/@toast-ui/editor/dist/toastui-editor.js')))

const CARRIER = '<img src=x onerror=alert(1)>'
const MARKDOWN = [
	'Intro',
	'',
	`<div title="</style>${CARRIER}">block</div>`,
	'',
	`Inline <span title="</style>${CARRIER}">tag</span> and ${CARRIER} end`,
	'',
].join('\n')

/**
 * Every element Toast UI writes HTML into while the callback runs.
 *
 * @param {Function} run Callback to observe.
 * @return {Promise<Element[]>} The elements whose `innerHTML` was set.
 */
async function recordInnerHtmlTargets(run) {
	const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')
	const targets = []
	Object.defineProperty(Element.prototype, 'innerHTML', {
		configurable: true,
		get: descriptor.get,
		set(value) {
			targets.push(this)
			descriptor.set.call(this, value)
		},
	})
	try {
		await run()
	} finally {
		Object.defineProperty(Element.prototype, 'innerHTML', descriptor)
	}
	return targets
}

/**
 * Scripts, event handlers and handler text found under the given roots.
 *
 * @param {Element[]} roots Elements to inspect.
 * @return {string[]} One entry per finding.
 */
function findings(roots) {
	const found = []
	for (const root of roots) {
		for (const el of [root, ...root.querySelectorAll('*')]) {
			if (el.localName === 'script') {
				found.push('script element')
			}
			for (const attr of el.attributes) {
				if (/^on/i.test(attr.name)) {
					found.push(`${el.localName}[${attr.name}]`)
				} else if (/onerror|<img/i.test(attr.value)) {
					found.push(`${el.localName}[${attr.name}] carries markup`)
				}
			}
		}
	}
	return found
}

describe('CnMarkdownEditor WYSIWYG: raw HTML passes DOMPurify 3', () => {
	it('loads the real Toast UI editor in this suite', () => {
		const Editor = jest.requireActual(path.resolve(__dirname, '../../node_modules/@toast-ui/editor/dist/toastui-editor.js'))
		expect(typeof Editor).toBe('function')
	})

	it('opening stored markdown leaves no script, handler or carrier in any DOM Toast UI builds', async () => {
		let wrapper
		const targets = await recordInnerHtmlTargets(async () => {
			wrapper = mount(CnMarkdownEditor, {
				attachTo: document.body,
				propsData: { mode: 'wysiwyg', value: MARKDOWN },
			})
			await wrapper.vm.loadWysiwyg()
		})
		expect(wrapper.vm.toastEditor).not.toBeNull()
		expect(wrapper.vm.toastEditor.getMarkdown()).toContain('block')
		expect(targets.length).toBeGreaterThan(0)
		expect(findings([...targets, wrapper.vm.$refs.toastHost])).toEqual([])
		wrapper.unmount()
	})

	it('setMarkdown from a v-model change goes through the same guard', async () => {
		const wrapper = mount(CnMarkdownEditor, {
			attachTo: document.body,
			propsData: { mode: 'wysiwyg', value: 'start' },
		})
		await wrapper.vm.loadWysiwyg()
		const targets = await recordInnerHtmlTargets(async () => {
			wrapper.vm.onBoundValueChange(MARKDOWN)
		})
		expect(targets.length).toBeGreaterThan(0)
		expect(findings([...targets, wrapper.vm.$refs.toastHost])).toEqual([])
		wrapper.unmount()
	})

	it('pasted HTML is sanitised before Toast UI parses it', async () => {
		const wrapper = mount(CnMarkdownEditor, {
			attachTo: document.body,
			propsData: { mode: 'wysiwyg', value: 'start' },
		})
		await wrapper.vm.loadWysiwyg()
		const view = wrapper.vm.toastEditor.wwEditor.view
		const transformed = view.someProp('transformPastedHTML', (fn) => fn(`<p title="</style>${CARRIER}">x</p>${CARRIER}`, view))
		expect(transformed).not.toMatch(/onerror|title=/)
		expect(transformed).toContain('<p>x</p>')
		wrapper.unmount()
	})

	it('raw HTML that is safe keeps its formatting in WYSIWYG', async () => {
		const wrapper = mount(CnMarkdownEditor, {
			attachTo: document.body,
			propsData: { mode: 'wysiwyg', value: 'x <b>bold</b> <a href="https://example.com">link</a> <img src="https://example.com/a.png" alt="pic">\n\n<div>block text</div>\n' },
		})
		await wrapper.vm.loadWysiwyg()
		const host = wrapper.vm.$refs.toastHost
		expect(host.querySelector('strong, b').textContent).toBe('bold')
		expect(host.querySelector('a').getAttribute('href')).toBe('https://example.com')
		expect(host.querySelector('img').getAttribute('src')).toBe('https://example.com/a.png')
		expect(host.textContent).toContain('block text')
		wrapper.unmount()
	})

	it('a raw HTML block the sanitiser empties converts without throwing', async () => {
		const wrapper = mount(CnMarkdownEditor, {
			attachTo: document.body,
			propsData: { mode: 'wysiwyg', value: 'a\n\n<form><button>x</button></form>\n\nb <input onfocus=alert(1)> c\n' },
		})
		await wrapper.vm.loadWysiwyg()
		expect(wrapper.vm.toastEditor).not.toBeNull()
		expect(findings([wrapper.vm.$refs.toastHost])).toEqual([])
		expect(wrapper.vm.$refs.toastHost.textContent).toContain('b')
		wrapper.unmount()
	})
})
