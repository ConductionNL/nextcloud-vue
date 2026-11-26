/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A stub for a component a page registers through lazyComponent(). A `true`
 * stub copies the lazy wrapper, which declares no props, so `props()` reads
 * nothing; this stub carries the real component's name, props and emits.
 */

/**
 * @param {object} component The real component definition.
 * @return {object} A rendering-free stub with the same public interface.
 */
function lazyStub(component) {
	return {
		name: component.name,
		props: component.props,
		emits: component.emits,
		template: '<div />',
	}
}

module.exports = { lazyStub }
