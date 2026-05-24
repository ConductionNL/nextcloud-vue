import { useSupportDialog } from '@/composables/useSupportDialog.js'

function makeStorage() {
	const store = new Map()
	return {
		getItem: (k) => (store.has(k) ? store.get(k) : null),
		setItem: (k, v) => store.set(k, v),
		removeItem: (k) => store.delete(k),
		_store: store,
	}
}

describe('useSupportDialog', () => {
	it('starts visible when no flag is stored', () => {
		const storage = makeStorage()
		const { visible } = useSupportDialog('test-app-a', { storage })
		expect(visible.value).toBe(true)
	})

	it('starts hidden when the flag is already set', () => {
		const storage = makeStorage()
		storage.setItem('cn-support-dialog-shown:test-app-b', '1')
		const { visible } = useSupportDialog('test-app-b', { storage })
		expect(visible.value).toBe(false)
	})

	it('hide() persists the flag and flips visible', () => {
		const storage = makeStorage()
		const { visible, hide } = useSupportDialog('test-app-c', { storage })
		expect(visible.value).toBe(true)
		hide()
		expect(visible.value).toBe(false)
		expect(storage.getItem('cn-support-dialog-shown:test-app-c')).toBe('1')
	})

	it('reset() clears the flag and re-shows', () => {
		const storage = makeStorage()
		storage.setItem('cn-support-dialog-shown:test-app-d', '1')
		const { visible, reset } = useSupportDialog('test-app-d', { storage })
		expect(visible.value).toBe(false)
		reset()
		expect(visible.value).toBe(true)
		expect(storage.getItem('cn-support-dialog-shown:test-app-d')).toBe(null)
	})

	it('namespaces flags per appSlug so two apps stay independent', () => {
		const storage = makeStorage()
		const a = useSupportDialog('app-alpha', { storage })
		a.hide()
		const b = useSupportDialog('app-beta', { storage })
		expect(b.visible.value).toBe(true)
	})

	it('treats a throwing storage as already-shown (SSR-safe)', () => {
		const broken = {
			getItem() { throw new Error('SecurityError') },
			setItem() { throw new Error('QuotaExceeded') },
			removeItem() { throw new Error('SecurityError') },
		}
		const handle = useSupportDialog('ssr-test', { storage: broken })
		expect(handle.visible.value).toBe(false)
		// hide() and reset() must not throw even when the storage does
		expect(() => handle.hide()).not.toThrow()
		expect(() => handle.reset()).not.toThrow()
	})
})
