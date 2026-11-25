/**
 * Tests for CnPageRenderer's lifted-field forwarding to `type:"custom"`
 * pages. The schema-v2 lifted fields (title, description, icon, …) are
 * forwarded as props — but a custom component that declares none of them
 * would receive them as FALLTHROUGH ATTRIBUTES on its root element:
 * `title="Vault"` becomes a native browser tooltip hovering over the
 * entire page. The renderer therefore forwards a lifted field to a custom
 * component only when its definition declares the matching prop.
 */

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => ({ registerObjectType: jest.fn() }),
	createObjectStore: () => () => ({ registerObjectType: jest.fn() }),
}))

const { mount } = require('@vue/test-utils')
const CnPageRenderer = require('../../src/components/CnPageRenderer/CnPageRenderer.vue').default

const PlainCustomStub = {
	name: 'PlainCustomStub',
	template: '<div class="plain-custom-stub" />',
}

const TitledCustomStub = {
	name: 'TitledCustomStub',
	props: { title: { type: String, default: '' } },
	template: '<div class="titled-custom-stub">{{ title }}</div>',
}

function manifestFor(component) {
	return {
		version: '1.0.0',
		menu: [],
		pages: [{
			id: 'board',
			route: '/board',
			type: 'custom',
			title: 'Vault',
			icon: 'KeyVariant',
			component,
		}],
	}
}

function mountRenderer(component, customComponents) {
	return mount(CnPageRenderer, {
		provide: {
			cnManifest: manifestFor(component),
			cnCustomComponents: customComponents,
			cnTranslate: (k) => k,
		},
		mocks: { $route: { name: 'board', params: {} } },
	})
}

describe('CnPageRenderer — lifted fields on type:"custom" pages', () => {
	it('does NOT leak title/icon as root attributes on a component without those props', () => {
		const wrapper = mountRenderer('PlainCustom', { PlainCustom: PlainCustomStub })
		const root = wrapper.find('.plain-custom-stub')
		expect(root.exists()).toBe(true)
		expect(root.attributes('title')).toBeUndefined()
		expect(root.attributes('icon')).toBeUndefined()
	})

	it('still forwards title to a custom component that DECLARES the prop', () => {
		const wrapper = mountRenderer('TitledCustom', { TitledCustom: TitledCustomStub })
		const stub = wrapper.find('.titled-custom-stub')
		expect(stub.exists()).toBe(true)
		expect(stub.text()).toBe('Vault')
		// declared prop, so it must not double as a root attribute
		expect(stub.attributes('title')).toBeUndefined()
	})
})

describe('CnPageRenderer — lifted fields on a lazily registered custom page', () => {
	const { defineAsyncComponent } = require('vue')
	const { flushPromises } = require('@vue/test-utils')
	const { lazyComponent } = require('../../src/utils/lazyComponent.js')

	it('forwards title to a defineAsyncComponent page once it resolves', async () => {
		const AsyncTitled = defineAsyncComponent(() => Promise.resolve(TitledCustomStub))
		const wrapper = mountRenderer('AsyncTitled', { AsyncTitled })
		await flushPromises()
		await flushPromises()

		const stub = wrapper.find('.titled-custom-stub')
		expect(stub.exists()).toBe(true)
		expect(stub.text()).toBe('Vault')
	})

	it('forwards title to a lazyComponent() page once it loads', async () => {
		const LazyTitled = lazyComponent(() => Promise.resolve({ default: TitledCustomStub }), 'Titled')
		const wrapper = mountRenderer('LazyTitled', { LazyTitled })
		await flushPromises()
		await flushPromises()

		const stub = wrapper.find('.titled-custom-stub')
		expect(stub.exists()).toBe(true)
		expect(stub.text()).toBe('Vault')
	})

	it('still leaks nothing onto a lazily loaded page that declares no lifted props', async () => {
		const AsyncPlain = defineAsyncComponent(() => Promise.resolve(PlainCustomStub))
		const wrapper = mountRenderer('AsyncPlain', { AsyncPlain })
		await flushPromises()
		await flushPromises()

		const root = wrapper.find('.plain-custom-stub')
		expect(root.exists()).toBe(true)
		expect(root.attributes('title')).toBeUndefined()
	})
})
