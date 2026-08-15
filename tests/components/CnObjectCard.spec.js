/**
 * Tests for CnObjectCard's body-click behaviour. When the card is
 * `selectable`, clicking anywhere on the card body toggles selection
 * (emits `select`); when not selectable it emits `click` for navigation.
 * The checkbox and actions areas carry `@click.stop` and are excluded.
 */

const { shallowMount } = require('@vue/test-utils')
const CnObjectCard = require('../../src/components/CnObjectCard/CnObjectCard.vue').default

const object = { id: 'org-1', title: 'Conduction' }
const schema = { title: 'Organisation', properties: {} }

function mountCard(propsData) {
	return shallowMount(CnObjectCard, { propsData: { object, schema, ...propsData } })
}

/**
 * The events the COMPONENT emitted, with VTU's native-DOM recordings removed.
 *
 * VTU v1 populated `emitted()` from `$emit` alone. VTU v2 additionally attaches
 * a native listener for every DOM event name to the component's single root
 * element (`attachNativeEventListener`) and records those too — unless the
 * component declares the name in Vue 3's `emits` option. CnObjectCard cannot
 * declare `click` there: it detects a consumer's `@click` via
 * `this.$attrs.onClick` to fire the deprecation warning, and a declared emit is
 * stripped out of `$attrs`.
 *
 * So after `trigger('click')` on the card root, `emitted('click')` is non-empty
 * whatever the component did, and `toBeFalsy()` can never hold. Filtering the
 * DOM events back out restores the original assertion: did the component emit
 * `click` (payload: the object) or not?
 *
 * @param {object} wrapper the mounted wrapper.
 * @param {string} name the event name.
 * @return {Array} recorded emissions that did not come from the DOM.
 */
function componentEmitted(wrapper, name) {
	return (wrapper.emitted(name) || []).filter(([arg]) => !(arg instanceof Event))
}

describe('CnObjectCard — body click', () => {
	it('emits select (not click) when selectable', async () => {
		const wrapper = mountCard({ selectable: true })
		await wrapper.find('.cn-object-card').trigger('click')
		expect(wrapper.emitted('select')).toBeTruthy()
		expect(wrapper.emitted('select')[0]).toEqual([object])
		expect(componentEmitted(wrapper, 'click')).toHaveLength(0)
	})

	it('also emits click (deprecated) when selectable and a click listener is attached', async () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const wrapper = shallowMount(CnObjectCard, {
			propsData: { object, schema, selectable: true },
			listeners: { click: () => {} },
		})
		await wrapper.find('.cn-object-card').trigger('click')
		expect(wrapper.emitted('select')).toBeTruthy()
		expect(wrapper.emitted('click')).toBeTruthy()
		expect(wrapper.emitted('click')[0]).toEqual([object])
		expect(warn).toHaveBeenCalled()
		warn.mockRestore()
	})

	it('does NOT emit click when selectable and no click listener is attached', async () => {
		const wrapper = mountCard({ selectable: true })
		await wrapper.find('.cn-object-card').trigger('click')
		expect(wrapper.emitted('select')).toBeTruthy()
		expect(componentEmitted(wrapper, 'click')).toHaveLength(0)
	})

	it('does NOT emit select when the click ends a text-selection drag', async () => {
		const wrapper = mountCard({ selectable: true })
		const card = wrapper.find('.cn-object-card')
		await card.trigger('mousedown', { clientX: 10, clientY: 10 })
		await card.trigger('click', { clientX: 120, clientY: 40 })
		expect(wrapper.emitted('select')).toBeFalsy()
	})

	it('emits select on a deliberate click (pointer barely moves)', async () => {
		const wrapper = mountCard({ selectable: true })
		const card = wrapper.find('.cn-object-card')
		await card.trigger('mousedown', { clientX: 10, clientY: 10 })
		await card.trigger('click', { clientX: 12, clientY: 11 })
		expect(wrapper.emitted('select')).toBeTruthy()
		expect(wrapper.emitted('select')[0]).toEqual([object])
	})

	it('emits click (not select) when not selectable', async () => {
		const wrapper = mountCard({ selectable: false })
		await wrapper.find('.cn-object-card').trigger('click')
		expect(wrapper.emitted('click')).toBeTruthy()
		expect(wrapper.emitted('click')[0]).toEqual([object])
		expect(wrapper.emitted('select')).toBeFalsy()
	})
})

// Metadata labels come from schema property titles, authored in English as the
// canonical source. The visible label is resolved through the injected
// cnTranslate (provided by CnAppRoot), so a Dutch user sees the translated
// label; standalone (no CnAppRoot ancestor) it renders the English source
// unchanged.
describe('CnObjectCard — schema-label translation', () => {
	const i18nObject = { id: 'org-1', title: 'Conduction', category: 'ngo' }
	const i18nSchema = {
		title: 'Organisation',
		properties: {
			category: { type: 'string', title: 'Category', order: 1 },
		},
	}

	it('resolves the metadata label through the injected cnTranslate', () => {
		const wrapper = shallowMount(CnObjectCard, {
			propsData: { object: i18nObject, schema: i18nSchema },
			provide: { cnTranslate: (s) => `NL:${s}` },
		})
		expect(wrapper.find('.cn-object-card__meta-label').text()).toBe('NL:Category')
	})

	it('renders the English source label unchanged when no cnTranslate is provided (standalone)', () => {
		const wrapper = shallowMount(CnObjectCard, {
			propsData: { object: i18nObject, schema: i18nSchema },
		})
		expect(wrapper.find('.cn-object-card__meta-label').text()).toBe('Category')
	})
})
