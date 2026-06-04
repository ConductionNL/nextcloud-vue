/**
 * Tests for CnDetailPage's locked-by-other banner.
 *
 * Regression guard: setup() must expose the lock state under a NON-underscore
 * key (`lockState`). Vue 2.7 strips `_`/`$`-prefixed setup-return keys from the
 * render context, so the earlier `_lockState` name left the banner's
 * `v-if="lockState && ..."` permanently undefined → the banner never rendered.
 */

import { mount } from '@vue/test-utils'
import { ref } from 'vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), delete: jest.fn(), put: jest.fn() },
}))

// Controllable lock + silent subscription so setup()'s lock path runs without
// a live Pinia store.
const mockLockRefs = {
	locked: ref(false),
	lockedByMe: ref(false),
	lockedBy: ref(null),
	expiresAt: ref(null),
}
jest.mock('../../src/composables/useObjectLock.js', () => ({
	__esModule: true,
	useObjectLock: () => mockLockRefs,
}))
jest.mock('../../src/composables/useObjectSubscription.js', () => ({
	__esModule: true,
	useObjectSubscription: () => ({ status: { value: 'open' }, lastEventAt: { value: null } }),
}))

const CnDetailPage = require('../../src/components/CnDetailPage/CnDetailPage.vue').default

const stubs = {
	CnIcon: { template: '<div />' },
	CnLockedBanner: { name: 'CnLockedBanner', template: '<div class="locked-banner" />' },
	NcEmptyContent: { template: '<div />' },
	NcLoadingIcon: { template: '<div />' },
	NcButton: { template: '<div />' },
	AlertCircleOutline: { template: '<div />' },
	InformationOutline: { template: '<div />' },
	Refresh: { template: '<div />' },
}

function mountDetail() {
	return mount(CnDetailPage, {
		// objectType (not register+schema) keeps hasSchemaDrivenFetch false, so
		// the mount never touches the store; objectStore just needs to be truthy
		// so setup() takes the lock path.
		propsData: {
			title: 'Test',
			objectType: 'pipelinq-client',
			objectId: 'abc-123',
			objectStore: {},
			subscribe: true,
		},
		stubs,
	})
}

describe('CnDetailPage — locked-by-other banner', () => {
	beforeEach(() => {
		mockLockRefs.locked.value = false
		mockLockRefs.lockedByMe.value = false
		mockLockRefs.lockedBy.value = null
		mockLockRefs.expiresAt.value = null
	})

	it('renders CnLockedBanner when the object is locked by another user', () => {
		mockLockRefs.locked.value = true
		mockLockRefs.lockedByMe.value = false
		mockLockRefs.lockedBy.value = 'Alice'
		const wrapper = mountDetail()
		expect(wrapper.findComponent({ name: 'CnLockedBanner' }).exists()).toBe(true)
	})

	it('hides the banner when the lock is held by the current user', () => {
		mockLockRefs.locked.value = true
		mockLockRefs.lockedByMe.value = true
		const wrapper = mountDetail()
		expect(wrapper.findComponent({ name: 'CnLockedBanner' }).exists()).toBe(false)
	})

	it('hides the banner when the object is not locked', () => {
		const wrapper = mountDetail()
		expect(wrapper.findComponent({ name: 'CnLockedBanner' }).exists()).toBe(false)
	})
})
