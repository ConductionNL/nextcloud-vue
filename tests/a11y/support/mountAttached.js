/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * `axe-core` refuses to run against a detached DOM tree ("No elements
 * found for include in page Context") — it needs `getComputedStyle` and
 * friends, which only resolve for nodes connected to `document`. Vue Test
 * Utils v1's `mount()` renders into a detached container by default (no
 * `attachTo`), which is fine for behavioural specs but breaks every
 * `expectAccessible()` call.
 *
 * `mountAttached` is `@vue/test-utils`'s `mount` plus: attach a fresh
 * `<div>` to `document.body` first, mount into it, and return a wrapper
 * whose `destroy()` also removes that container — so specs get a normal
 * `afterEach(() => wrapper.destroy())` without leaking `<div>`s across
 * tests in the same file.
 */

const { mount } = require('@vue/test-utils')

/**
 * Mount a component attached to `document.body`, required for `axe-core`.
 *
 * @param {object} Component The Vue component (or options object) to mount.
 * @param {object} [options] `@vue/test-utils` mount options (propsData, slots, stubs, ...).
 * @return {object} The Vue Test Utils wrapper, with `destroy()` overridden to also clean up its container.
 */
function mountAttached(Component, options = {}) {
	const container = document.createElement('div')
	document.body.appendChild(container)

	const wrapper = mount(Component, { ...options, attachTo: container })
	const originalDestroy = wrapper.destroy.bind(wrapper)
	wrapper.destroy = () => {
		originalDestroy()
		container.remove()
	}
	return wrapper
}

module.exports = { mountAttached }
