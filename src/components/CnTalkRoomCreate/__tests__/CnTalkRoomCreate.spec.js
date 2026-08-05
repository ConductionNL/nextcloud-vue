/**
 * Tests for CnTalkRoomCreate — inline-create Talk room dialog.
 *
 * Covers:
 *  - default type is Group (id=2);
 *  - one2one type (1) is not in the option list;
 *  - submit emits `create` with name/description/type;
 *  - submit is disabled until name is set.
 */

const { mount } = require('@vue/test-utils')
const CnTalkRoomCreate = require('../CnTalkRoomCreate.vue').default

describe('CnTalkRoomCreate', () => {
	it('defaults to group type and excludes one2one', () => {
		const wrapper = mount(CnTalkRoomCreate)
		expect(wrapper.vm.selectedType.id).toBe(2)
		const ids = wrapper.vm.typeOptions.map(o => o.id)
		expect(ids).toEqual(expect.arrayContaining([2, 3]))
		expect(ids).not.toContain(1)
		wrapper.destroy()
	})

	it('emits create with the full payload on submit', async () => {
		const wrapper = mount(CnTalkRoomCreate)
		await wrapper.setData({
			name: 'Sprint planning',
			description: 'Weekly sync',
			selectedType: { id: 2, label: 'Group' },
		})

		wrapper.vm.submit()
		expect(wrapper.emitted('create')).toBeTruthy()
		expect(wrapper.emitted('create')[0]).toEqual([{
			name: 'Sprint planning',
			description: 'Weekly sync',
			type: 2,
		}])
		wrapper.destroy()
	})

	it('blocks submit when name is empty', async () => {
		const wrapper = mount(CnTalkRoomCreate)
		expect(wrapper.vm.canSubmit).toBe(false)
		wrapper.vm.submit()
		expect(wrapper.emitted('create')).toBeFalsy()
		wrapper.destroy()
	})
})
