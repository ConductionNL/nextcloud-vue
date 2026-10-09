/**
 * Tests for CnEnvironmentBanner and the environment helpers.
 *
 * @spec openspec/changes/environment-banner/tasks.md#task-1
 */

import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/l10n', () => ({ translate: (app, text) => text }))

const CnEnvironmentBanner = require('../../src/components/CnEnvironmentBanner/CnEnvironmentBanner.vue').default
const { resolveEnvironment } = require('../../src/utils/environment.js')

describe('CnEnvironmentBanner', () => {
	beforeEach(() => {
		document.title = 'Pipelinq'
	})

	it.each([
		['development', 'Development environment', '[DEV] Pipelinq'],
		['test', 'Test environment', '[TEST] Pipelinq'],
		['acceptance', 'Acceptance environment', '[ACC] Pipelinq'],
	])('names the %s environment in words and prefixes the title', (environment, label, title) => {
		const wrapper = mount(CnEnvironmentBanner, { propsData: { environment } })
		const banner = wrapper.find('[data-testid="cn-environment-banner"]')
		expect(banner.exists()).toBe(true)
		expect(banner.text()).toBe(label)
		expect(banner.attributes('role')).toBe('note')
		expect(banner.attributes('aria-label')).toBe(label)
		expect(banner.classes()).toContain(`cn-environment-banner--${environment}`)
		expect(document.title).toBe(title)
		wrapper.unmount()
		expect(document.title).toBe('Pipelinq')
	})

	it.each(['production', 'staging', '', undefined])('renders nothing for %p and leaves the title alone', (environment) => {
		const wrapper = mount(CnEnvironmentBanner, { propsData: { environment } })
		expect(wrapper.find('[data-testid="cn-environment-banner"]').exists()).toBe(false)
		expect(document.title).toBe('Pipelinq')
	})

	it('has no close action', () => {
		const wrapper = mount(CnEnvironmentBanner, { propsData: { environment: 'acceptance' } })
		expect(wrapper.find('button').exists()).toBe(false)
	})

	it('does not stack the prefix and follows a change of environment', async () => {
		const wrapper = mount(CnEnvironmentBanner, { propsData: { environment: 'test' } })
		await wrapper.setProps({ environment: 'acceptance' })
		expect(document.title).toBe('[ACC] Pipelinq')
		await wrapper.setProps({ environment: 'production' })
		expect(document.title).toBe('Pipelinq')
	})
})

describe('resolveEnvironment', () => {
	it('lets the app setting win over the organisation', () => {
		expect(resolveEnvironment('test', 'acceptance')).toBe('test')
	})

	it('falls back to the organisation, then to none', () => {
		expect(resolveEnvironment('', 'Acceptance')).toBe('acceptance')
		expect(resolveEnvironment(undefined, 'nonsense')).toBe('')
	})
})
