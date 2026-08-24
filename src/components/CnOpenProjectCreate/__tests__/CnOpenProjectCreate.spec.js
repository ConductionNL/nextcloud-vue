/**
 * Tests for CnOpenProjectCreate — create-new-work-package modal.
 *
 * Covers:
 *  - projects derived from /api/integrations/openproject/available on mount;
 *  - submit emits `create` with { projectId, subject, type };
 *  - submit is disabled until subject + project are set;
 *  - free-text project id is used when no projects are discovered;
 *  - 503 surfaces the unconfigured Configure CTA (external-source state);
 *  - 501 surfaces the "Integriq not installed" copy;
 *  - no create is emitted when the form is incomplete.
 */

const { mount } = require('@vue/test-utils')
const CnOpenProjectCreate = require('../CnOpenProjectCreate.vue').default

function resolveOnce(payload, status = 200) {
	return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(payload) })
}

describe('CnOpenProjectCreate', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('derives projects from the available endpoint on mount', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [
				{ workPackageId: 1, subject: 'A', project: 'Portal' },
				{ workPackageId: 2, subject: 'B', project: 'Portal' },
				{ workPackageId: 3, subject: 'C', project: 'Internal' },
			],
		}))

		const wrapper = mount(CnOpenProjectCreate)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.projects).toEqual(['Portal', 'Internal'])
		expect(wrapper.vm.projectOptions).toHaveLength(2)
		wrapper.unmount()
	})

	it('emits create with the selected project, subject and type', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [{ workPackageId: 1, subject: 'A', project: 'Portal' }],
		}))

		const wrapper = mount(CnOpenProjectCreate)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		wrapper.vm.project = { id: 'Portal', label: 'Portal' }
		wrapper.vm.subject = 'Ship it'
		wrapper.vm.type = 'Task'
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.canSubmit).toBe(true)
		wrapper.vm.submit()

		expect(wrapper.emitted('create')).toBeTruthy()
		expect(wrapper.emitted('create')[0]).toEqual([{ projectId: 'Portal', subject: 'Ship it', type: 'Task' }])
		wrapper.unmount()
	})

	it('uses a free-text project id when no projects are discovered', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ results: [] }))

		const wrapper = mount(CnOpenProjectCreate)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		wrapper.vm.projectId = '42'
		wrapper.vm.subject = 'Ship it'
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.canSubmit).toBe(true)
		wrapper.vm.submit()

		expect(wrapper.emitted('create')[0]).toEqual([{ projectId: '42', subject: 'Ship it', type: '' }])
		wrapper.unmount()
	})

	it('renders the unconfigured Configure CTA on 503', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ error: 'no source' }, 503))

		const wrapper = mount(CnOpenProjectCreate)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.unconfigured).toBe(true)
		expect(wrapper.text()).toContain('Configure OpenProject connection')
		wrapper.unmount()
	})

	it('surfaces the not-installed copy on 501', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ error: 'nope' }, 501))

		const wrapper = mount(CnOpenProjectCreate)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.text()).toContain('Integriq is not installed.')
		wrapper.unmount()
	})

	it('does not emit create when the form is incomplete', () => {
		global.fetch.mockReturnValue(resolveOnce({ results: [] }))
		const wrapper = mount(CnOpenProjectCreate)

		wrapper.vm.submit()
		expect(wrapper.emitted('create')).toBeFalsy()
		wrapper.unmount()
	})
})
