/**
 * CnTextWidget markdown mode: a `<script>` or `<style>` element at the start
 * of a line is removed before parsing, so the markdown after it on that line
 * is still parsed (REQ-TXMD-003 "Script tags in markdown are stripped").
 *
 * @spec openspec/specs/text-display-widget/spec.md#REQ-TXMD-003
 */

import { mount } from '@vue/test-utils'
import CnTextWidget from '@/components/CnTextWidget/CnTextWidget.vue'

function render(text, contentMode = 'markdown') {
	const wrapper = mount(CnTextWidget, { propsData: { content: { text, contentMode } } })
	return wrapper.find('.cn-text-widget__content')
}

describe('CnTextWidget markdown with raw-text elements', () => {
	it('strips a leading <script> and still parses the bold after it', () => {
		const body = render('<script>window.__x = 1</script> and **bold**')
		expect(body.find('script').exists()).toBe(false)
		expect(body.html()).not.toContain('__x')
		expect(body.find('strong').text()).toBe('bold')
		expect(body.text()).toBe('and bold')
	})

	it('strips a <style> element with attributes and its content', () => {
		const body = render('<STYLE type="text/css">p { color: red }</STYLE>\n\n*it*')
		expect(body.find('style').exists()).toBe(false)
		expect(body.html()).not.toContain('color: red')
		expect(body.find('em').text()).toBe('it')
	})

	it('still removes an unterminated <script> through the sanitiser', () => {
		const body = render('<script>alert(1)')
		expect(body.find('script').exists()).toBe(false)
	})

	it('strips a script that removing an inner one would form', () => {
		const body = render('<scr<script></script>ipt>window.__y = 1</script> and **bold**')
		expect(body.find('script').exists()).toBe(false)
		expect(body.html()).not.toContain('__y')
		expect(body.find('strong').text()).toBe('bold')
	})

	it('leaves other inline HTML to the sanitiser', () => {
		const body = render('<a href="http://example.com" data-x="1">link</a>')
		expect(body.find('a').attributes('href')).toBe('http://example.com')
		expect(body.find('a').attributes('data-x')).toBeUndefined()
	})

	it('does not pre-strip in html mode, where the sanitiser alone applies', () => {
		const body = render('<script>alert(1)</script><b>x</b>', 'html')
		expect(body.find('script').exists()).toBe(false)
		expect(body.find('b').text()).toBe('x')
	})
})
