import { mount } from '@vue/test-utils'
import CnStructuredDocReview from '@/components/CnStructuredDocReview/CnStructuredDocReview.vue'

const stubs = {
	CnJsonViewer: { template: '<div class="stub-viewer" :data-language="language" />', props: ['value', 'language', 'readOnly'] },
}

describe('CnStructuredDocReview', () => {
	it('renders the title + status pill', () => {
		const wrapper = mount(CnStructuredDocReview, { propsData: { title: 'Doc A' }, stubs })
		expect(wrapper.text()).toContain('Doc A')
		expect(wrapper.find('[data-testid="status-pill"]').exists()).toBe(true)
	})

	it('applies the right status BEM modifier', () => {
		const wrapper = mount(CnStructuredDocReview, { propsData: { status: 'approved' }, stubs })
		expect(wrapper.vm.statusClass).toBe('cn-structured-doc-review__status--approved')
	})

	it('falls back to unknown for unknown statuses', () => {
		const wrapper = mount(CnStructuredDocReview, { propsData: { status: 'archived' }, stubs })
		expect(wrapper.vm.statusClass).toBe('cn-structured-doc-review__status--unknown')
		expect(wrapper.vm.statusLabel).toBe('archived')
	})

	it('uses overridden status labels', () => {
		const wrapper = mount(CnStructuredDocReview, {
			propsData: { status: 'approved', statusLabels: { approved: 'Goedgekeurd' } },
			stubs,
		})
		expect(wrapper.vm.statusLabel).toBe('Goedgekeurd')
	})

	it('renders the issues banner when issues are provided', () => {
		const wrapper = mount(CnStructuredDocReview, {
			propsData: { issues: [{ message: 'Missing field x', severity: 'error', path: '/a/b' }] },
			stubs,
		})
		expect(wrapper.find('[data-testid="issues"]').exists()).toBe(true)
		expect(wrapper.text()).toContain('Missing field x')
		expect(wrapper.text()).toContain('/a/b')
	})

	it('hides the issues banner when issues is empty', () => {
		const wrapper = mount(CnStructuredDocReview, { stubs })
		expect(wrapper.find('[data-testid="issues"]').exists()).toBe(false)
	})

	it('renders the decision row by default', () => {
		const wrapper = mount(CnStructuredDocReview, { stubs })
		expect(wrapper.find('[data-testid="decision"]').exists()).toBe(true)
	})

	it('hides the decision row when showDecision is false', () => {
		const wrapper = mount(CnStructuredDocReview, { propsData: { showDecision: false }, stubs })
		expect(wrapper.find('[data-testid="decision"]').exists()).toBe(false)
	})

	it('hasBlockingIssues is true when any error severity is present', () => {
		const wrapper = mount(CnStructuredDocReview, {
			propsData: {
				issues: [
					{ message: 'a', severity: 'warning' },
					{ message: 'b', severity: 'error' },
				],
			},
			stubs,
		})
		expect(wrapper.vm.hasBlockingIssues).toBe(true)
	})

	it('hasBlockingIssues is false when only warnings exist', () => {
		const wrapper = mount(CnStructuredDocReview, {
			propsData: { issues: [{ message: 'a', severity: 'warning' }] },
			stubs,
		})
		expect(wrapper.vm.hasBlockingIssues).toBe(false)
	})

	it('treats issues without severity as errors (blocking)', () => {
		const wrapper = mount(CnStructuredDocReview, {
			propsData: { issues: [{ message: 'a' }] },
			stubs,
		})
		expect(wrapper.vm.hasBlockingIssues).toBe(true)
	})

	it('emits decision approve with comment', async () => {
		const wrapper = mount(CnStructuredDocReview, { stubs })
		wrapper.vm.comment = 'LGTM'
		wrapper.vm.emitDecision('approve')
		expect(wrapper.emitted('decision')[0][0]).toEqual({ verdict: 'approve', comment: 'LGTM' })
	})

	it('approve button is disabled when blocking issues exist', () => {
		const wrapper = mount(CnStructuredDocReview, {
			propsData: { issues: [{ message: 'fatal', severity: 'error' }] },
			stubs,
		})
		const approve = wrapper.find('.cn-structured-doc-review__action--approve')
		expect(approve.attributes('disabled')).toBeDefined()
	})

	it('reject button disabled when rejectRequiresComment + blank comment', () => {
		const wrapper = mount(CnStructuredDocReview, { propsData: { rejectRequiresComment: true }, stubs })
		const reject = wrapper.find('.cn-structured-doc-review__action--reject')
		expect(reject.attributes('disabled')).toBeDefined()
	})

	it('reject button enabled when rejectRequiresComment + non-blank comment', async () => {
		const wrapper = mount(CnStructuredDocReview, { propsData: { rejectRequiresComment: true }, stubs })
		wrapper.vm.comment = 'Missing data'
		await wrapper.vm.$nextTick()
		const reject = wrapper.find('.cn-structured-doc-review__action--reject')
		expect(reject.attributes('disabled')).toBeUndefined()
	})

	it('clearComment resets the comment field', () => {
		const wrapper = mount(CnStructuredDocReview, { stubs })
		wrapper.vm.comment = 'X'
		wrapper.vm.clearComment()
		expect(wrapper.vm.comment).toBe('')
	})
})
