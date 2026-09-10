/**
 * Tests for CnDetailPage's locked card.
 *
 * Regression guard: setup() must expose the lock state under a NON-underscore
 * key (`lockState`). Vue 2.7 strips `_`/`$`-prefixed setup-return keys from the
 * render context, so the earlier `_lockState` name left the card's
 * `v-if="lockState && ..."` permanently undefined → the card never rendered.
 *
 * Also pins the scope change: the card now renders for ANY active lock, not
 * only a remote one. It used to be suppressed when the current user held the
 * lock, which meant the one person who could do something about a stale lock
 * was also the only person the UI never told about it. The tone and the Unlock
 * button carry the difference between the two cases — see
 * CnLockedBannerTone.spec.js.
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
	// Declares the props the page binds, so a spec can assert what the page
	// TELLS the card — a bare stub swallows them and every tone assertion
	// silently reads undefined.
	CnLockedBanner: {
		name: 'CnLockedBanner',
		props: ['lockedBy', 'lockedByMe', 'expiresAt', 'unlocking'],
		template: '<div class="locked-banner" />',
	},
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

describe('CnDetailPage — locked card', () => {
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

	it('renders the card for the current user\'s OWN lock too, and says whose it is', () => {
		mockLockRefs.locked.value = true
		mockLockRefs.lockedByMe.value = true
		const wrapper = mountDetail()
		const card = wrapper.findComponent({ name: 'CnLockedBanner' })

		expect(card.exists()).toBe(true)
		// The prop is what lets the card pick the neutral tone and offer Unlock;
		// without it the viewer's own lock would read as somebody else's refusal.
		expect(card.props('lockedByMe')).toBe(true)
	})

	it('tells the card the lock is somebody else\'s', () => {
		mockLockRefs.locked.value = true
		mockLockRefs.lockedByMe.value = false
		mockLockRefs.lockedBy.value = 'Alice'
		const wrapper = mountDetail()

		expect(wrapper.findComponent({ name: 'CnLockedBanner' }).props('lockedByMe')).toBe(false)
	})

	it('hides the banner when the object is not locked', () => {
		const wrapper = mountDetail()
		expect(wrapper.findComponent({ name: 'CnLockedBanner' }).exists()).toBe(false)
	})
})
