/**
 * Tests for CnAdminActionCard — one maintenance action on an admin page.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { post: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((path) => `/index.php${path}`),
}))

const axios = require('@nextcloud/axios').default
const { mount, flushPromises } = require('@vue/test-utils')
const CnAdminActionCard = require('../../src/components/CnAdminActionCard/CnAdminActionCard.vue').default
const barrel = require('../../src/index.js')

const props = {
	appId: 'pipelinq',
	action: 'provision',
	title: 'Repair the register',
	description: 'Creates missing schemas again. Your data stays as it is.',
	buttonLabel: 'Repair',
}

describe('CnAdminActionCard', () => {
	beforeEach(() => {
		axios.post.mockReset()
	})

	it('shows the title, the explanation and one button', () => {
		const wrapper = mount(CnAdminActionCard, { props })
		expect(wrapper.text()).toContain('Repair the register')
		expect(wrapper.text()).toContain('Creates missing schemas again.')
		expect(wrapper.find('[data-testid="cn-admin-action-card-run"]').text()).toContain('Repair')
	})

	it('posts the action, spins while it runs, then shows the server message', async () => {
		let settle
		axios.post.mockImplementation(() => new Promise((resolve) => {
			settle = resolve
		}))
		const wrapper = mount(CnAdminActionCard, { props })
		await wrapper.find('[data-testid="cn-admin-action-card-run"]').trigger('click')
		await flushPromises()

		expect(axios.post).toHaveBeenCalledWith('/index.php/apps/pipelinq/api/setup/action/provision', {})
		const button = wrapper.find('[data-testid="cn-admin-action-card-run"]')
		expect(button.attributes('disabled')).toBeDefined()
		expect(button.text()).toContain('Running…')

		settle({ data: { success: true, message: '41 schemas checked.' } })
		await flushPromises()

		const result = wrapper.find('[data-testid="cn-admin-action-card-result"]')
		expect(result.text()).toBe('41 schemas checked.')
		expect(result.attributes('type')).toBe('success')
		expect(wrapper.emitted('result')[0][0]).toMatchObject({ success: true, message: '41 schemas checked.' })
	})

	it('shows a failure as an error with the server message', async () => {
		axios.post.mockRejectedValue({ response: { data: { message: 'OpenRegister is not enabled.' } } })
		const wrapper = mount(CnAdminActionCard, { props })
		await wrapper.find('[data-testid="cn-admin-action-card-run"]').trigger('click')
		await flushPromises()
		const result = wrapper.find('[data-testid="cn-admin-action-card-result"]')
		expect(result.text()).toBe('OpenRegister is not enabled.')
		expect(result.attributes('type')).toBe('error')
	})

	it('treats success: false in a 200 answer as an error', async () => {
		axios.post.mockResolvedValue({ data: { success: false, message: 'Nothing to repair.' } })
		const wrapper = mount(CnAdminActionCard, { props })
		await wrapper.vm.run()
		expect(wrapper.vm.result).toEqual({ success: false, message: 'Nothing to repair.' })
	})

	it('posts to `url` with `payload` when given', async () => {
		axios.post.mockResolvedValue({ data: {} })
		const wrapper = mount(CnAdminActionCard, {
			props: { title: 'Re-import', url: '/apps/pipelinq/api/settings/import', payload: { force: true } },
		})
		await wrapper.vm.run()
		expect(axios.post).toHaveBeenCalledWith('/index.php/apps/pipelinq/api/settings/import', { force: true })
	})

	it('says so instead of posting when no action is configured', async () => {
		const wrapper = mount(CnAdminActionCard, { props: { title: 'Nothing' } })
		await wrapper.vm.run()
		expect(axios.post).not.toHaveBeenCalled()
		expect(wrapper.vm.result.success).toBe(false)
	})

	it('is exported from the package barrel', () => {
		expect(barrel.CnAdminActionCard).toBe(CnAdminActionCard)
	})
})
