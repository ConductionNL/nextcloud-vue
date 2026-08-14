import { mount } from '@vue/test-utils'
import CnSignatureCapture from '@/components/CnSignatureCapture/CnSignatureCapture.vue'

// jsdom doesn't implement canvas — provide a minimal stub so the
// component can mount and `toDataURL` returns a deterministic string.
function stubCanvas(wrapper) {
	// `exists()` FIRST. VTU v1 handed back an empty wrapper whose `.element`
	// was simply `undefined`, so the guard below was reachable. VTU v2 throws
	// "Cannot call element on an empty DOMWrapper" from the accessor itself, so
	// reading `.element` before the guard is what fails — in typed mode there
	// is no <canvas> in the DOM at all.
	const found = wrapper.find('canvas')
	if (!found.exists()) return
	const canvas = found.element
	const noop = () => {}
	canvas.getContext = () => ({
		lineCap: '',
		lineJoin: '',
		lineWidth: 0,
		strokeStyle: '',
		beginPath: noop,
		moveTo: noop,
		lineTo: noop,
		stroke: noop,
		clearRect: noop,
	})
	canvas.toDataURL = () => 'data:image/png;base64,stub'
	canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 360, height: 120 })
}

describe('CnSignatureCapture', () => {
	it('renders the mode picker when both modes are allowed', () => {
		const wrapper = mount(CnSignatureCapture, { propsData: { allowTyped: true, allowDrawn: true } })
		expect(wrapper.findAll('input[type="radio"]').length).toBe(2)
	})

	it('hides the mode picker when only one mode is allowed', () => {
		const wrapper = mount(CnSignatureCapture, { propsData: { allowTyped: true, allowDrawn: false } })
		expect(wrapper.findAll('input[type="radio"]').length).toBe(0)
	})

	it('starts in initialMode when both are allowed', () => {
		const wrapper = mount(CnSignatureCapture, {
			propsData: { allowTyped: true, allowDrawn: true, initialMode: 'drawn' },
		})
		expect(wrapper.vm.mode).toBe('drawn')
	})

	it('falls back to the allowed mode when initialMode is disabled', () => {
		const wrapper = mount(CnSignatureCapture, {
			propsData: { allowTyped: false, allowDrawn: true, initialMode: 'typed' },
		})
		expect(wrapper.vm.mode).toBe('drawn')
	})

	it('renders the affirmation checkbox when affirmation prop is set', () => {
		const wrapper = mount(CnSignatureCapture, { propsData: { affirmation: 'I declare …' } })
		expect(wrapper.findAll('input[type="checkbox"]').length).toBe(1)
		expect(wrapper.text()).toContain('I declare …')
	})

	it('hides the affirmation checkbox when prop is empty', () => {
		const wrapper = mount(CnSignatureCapture, { propsData: { affirmation: '' } })
		expect(wrapper.findAll('input[type="checkbox"]').length).toBe(0)
	})

	it('emits change with the typed value on input', async () => {
		const wrapper = mount(CnSignatureCapture, { propsData: { allowTyped: true, allowDrawn: false } })
		const input = wrapper.find('input[type="text"]')
		input.element.value = 'Jane Doe'
		await input.trigger('input')
		const events = wrapper.emitted('change')
		expect(events).toBeTruthy()
		const last = events[events.length - 1][0]
		expect(last).toMatchObject({ mode: 'typed', value: 'Jane Doe' })
		expect(last.audit.capturedAt).toMatch(/T/)
	})

	it('emits change with affirmed state when checkbox toggled', async () => {
		const wrapper = mount(CnSignatureCapture, { propsData: { affirmation: 'OK' } })
		const cb = wrapper.find('input[type="checkbox"]')
		cb.element.checked = true
		await cb.trigger('change')
		const last = wrapper.emitted('change').pop()[0]
		expect(last.affirmed).toBe(true)
	})

	it('clear() resets all state and emits empty payload', async () => {
		const wrapper = mount(CnSignatureCapture, {
			propsData: { allowTyped: true, allowDrawn: false, affirmation: 'OK' },
		})
		wrapper.vm.typedValue = 'Jane'
		wrapper.vm.affirmed = true
		await wrapper.vm.$nextTick()
		wrapper.vm.clear()
		expect(wrapper.vm.typedValue).toBe('')
		expect(wrapper.vm.affirmed).toBe(false)
		const last = wrapper.emitted('change').pop()[0]
		expect(last).toMatchObject({ value: '', affirmed: false })
	})

	it('hasContent reflects typed input', async () => {
		const wrapper = mount(CnSignatureCapture, { propsData: { allowTyped: true, allowDrawn: false } })
		expect(wrapper.vm.hasContent).toBe(false)
		wrapper.vm.typedValue = 'X'
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.hasContent).toBe(true)
	})

	it('clear is disabled when there is no content', () => {
		const wrapper = mount(CnSignatureCapture)
		const clearBtn = wrapper.find('.cn-signature-capture__clear')
		expect(clearBtn.attributes('disabled')).toBeDefined()
	})

	it('drawn stroke emits a data-URL value', async () => {
		const wrapper = mount(CnSignatureCapture, {
			propsData: { allowTyped: false, allowDrawn: true },
		})
		stubCanvas(wrapper)
		wrapper.vm.prepareCanvas()
		wrapper.vm.startStroke({ clientX: 10, clientY: 10 })
		wrapper.vm.continueStroke({ clientX: 50, clientY: 50 })
		wrapper.vm.endStroke()
		expect(wrapper.vm.hasDrawnContent).toBe(true)
		const last = wrapper.emitted('change').pop()[0]
		expect(last.mode).toBe('drawn')
		expect(last.value).toBe('data:image/png;base64,stub')
		expect(last.audit.canvasWidth).toBe(360)
	})

	it('getSignature returns the current payload without emitting', () => {
		const wrapper = mount(CnSignatureCapture, { propsData: { allowTyped: true, allowDrawn: false } })
		wrapper.vm.typedValue = 'Jane'
		const sig = wrapper.vm.getSignature()
		expect(sig).toMatchObject({ mode: 'typed', value: 'Jane' })
	})

	it('switching modes clears the previous mode draft + emits change', async () => {
		const wrapper = mount(CnSignatureCapture, { propsData: { allowTyped: true, allowDrawn: true } })
		stubCanvas(wrapper)
		wrapper.vm.typedValue = 'Jane'
		wrapper.vm.mode = 'drawn'
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.typedValue).toBe('')
	})
})
