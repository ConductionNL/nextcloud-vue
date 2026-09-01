/**
 * Tests for CnIconColorPicker — the Proton-style vault personalization
 * block (color swatches + searchable icon grid + themed preview).
 */

const { mount } = require('@vue/test-utils')
const CnIconColorPicker = require('../../src/components/CnIconColorPicker/CnIconColorPicker.vue').default
const { FOLDER_COLORS, FOLDER_ICONS } = require('../../src/utils/folderCustomization.js')

const FallbackGlyph = {
	name: 'FallbackGlyph',
	render() {
		return null
	},
}

function factory(props = {}) {
	return mount(CnIconColorPicker, {
		propsData: { fallbackIcon: FallbackGlyph, ...props },
	})
}

describe('CnIconColorPicker', () => {
	beforeEach(() => {
		window.matchMedia = jest.fn().mockReturnValue({
			matches: true,
			addEventListener: jest.fn(),
		})
	})

	it('renders one swatch per palette color plus the Default swatch', () => {
		const w = factory()
		const swatches = w.findAll('.cn-icon-color-picker__swatch')
		expect(swatches).toHaveLength(FOLDER_COLORS.length + 1)
	})

	it('renders the full icon grid plus the Default cell', () => {
		const w = factory()
		const cells = w.findAll('.cn-icon-color-picker__icon')
		expect(cells).toHaveLength(FOLDER_ICONS.length + 1)
	})

	it('emits update:color with the picked key, and null from the Default swatch', async () => {
		const w = factory({ color: 'blue' })
		await w.find('[data-testid="cn-icon-color-picker-color-red"]').trigger('click')
		expect(w.emitted('update:color')).toEqual([['red']])

		await w.find('[data-testid="cn-icon-color-picker-color-default"]').trigger('click')
		expect(w.emitted('update:color')[1]).toEqual([null])
	})

	it('emits update:icon with the picked key, and null from the Default cell', async () => {
		const w = factory({ icon: 'briefcase' })
		await w.find('[data-testid="cn-icon-color-picker-icon-star"]').trigger('click')
		expect(w.emitted('update:icon')).toEqual([['star']])

		await w.find('[data-testid="cn-icon-color-picker-icon-default"]').trigger('click')
		expect(w.emitted('update:icon')[1]).toEqual([null])
	})

	it('marks the current selection with aria-pressed', () => {
		const w = factory({ color: 'green', icon: 'home' })
		expect(
			w.find('[data-testid="cn-icon-color-picker-color-green"]').attributes('aria-pressed'),
		).toBe('true')
		expect(
			w.find('[data-testid="cn-icon-color-picker-icon-home"]').attributes('aria-pressed'),
		).toBe('true')
		expect(
			w.find('[data-testid="cn-icon-color-picker-color-default"]').attributes('aria-pressed'),
		).toBe('false')
	})

	it('filters the grid on search and hides the Default cell while searching', async () => {
		const w = factory()
		// Drive the bound query directly — NcTextField's inner input is an
		// upstream implementation detail this spec should not couple to.
		w.vm.query = 'credit'
		await w.vm.$nextTick()
		const cells = w.findAll('.cn-icon-color-picker__icon')
		expect(cells).toHaveLength(1)
		expect(w.find('[data-testid="cn-icon-color-picker-icon-credit-card"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-icon-color-picker-icon-default"]').exists()).toBe(false)
	})

	it('passes every user-facing label through the translate prop', () => {
		const w = factory({ translate: (s) => `NL:${s}` })
		expect(w.text()).toContain('NL:Color')
		expect(w.text()).toContain('NL:Icon')
		expect(
			w.find('[data-testid="cn-icon-color-picker-color-red"]').attributes('aria-label'),
		).toBe('NL:Red')
		expect(
			w.find('[data-testid="cn-icon-color-picker-icon-briefcase"]').attributes('aria-label'),
		).toBe('NL:Work')
	})

	it('offers no Default icon cell without a fallback glyph', () => {
		const w = mount(CnIconColorPicker)
		expect(w.find('[data-testid="cn-icon-color-picker-icon-default"]').exists()).toBe(false)
	})
})
