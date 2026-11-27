// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

import { createCommentVNode, h, mergeProps } from 'vue'
import { MDI_PATHS } from './mdiPaths.js'

/**
 * Icon components for the runtime lookup tables (semantic vocabulary, dashboard
 * icons, `icon-*` bridge). Their names arrive from manifests at runtime, so a
 * bundler cannot drop unused ones: importing one vue-material-design-icons SFC
 * per name put ~210 compiled components (~205 KB minified) into every app's
 * first chunk. These share one render over the path strings in mdiPaths.js
 * and render the same DOM, props and click event as the package's SFCs.
 */

const PROPS = Object.freeze({
	title: { type: String },
	fillColor: { type: String, default: 'currentColor' },
	size: { type: Number, default: 24 },
})

const EMITS = Object.freeze(['click'])

const cache = new Map()

/**
 * PascalCase MDI name to the package's class stem (`AlphaABox` -> `alpha-a-box`).
 *
 * @param {string} name PascalCase icon name.
 * @return {string} The kebab-case stem.
 */
export function mdiIconClassStem(name) {
	return name
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
		.toLowerCase()
}

/**
 * The icon component for an MDI name in mdiPaths.js; one shared object per name.
 *
 * @param {string} name PascalCase MDI name, e.g. `AccountOutline`.
 * @return {object} A Vue component equivalent to `vue-material-design-icons/<name>.vue`.
 */
export function mdiIcon(name) {
	let component = cache.get(name)
	if (component) {
		return component
	}
	const d = MDI_PATHS[name]
	const className = `material-design-icon ${mdiIconClassStem(name)}-icon`
	component = {
		name: `${name}Icon`,
		emits: EMITS,
		props: PROPS,
		render() {
			return h('span', mergeProps(this.$attrs, {
				'aria-hidden': this.title ? null : 'true',
				'aria-label': this.title,
				class: className,
				role: 'img',
				onClick: (event) => this.$emit('click', event),
			}), [
				h('svg', {
					fill: this.fillColor,
					class: 'material-design-icon__svg',
					width: this.size,
					height: this.size,
					viewBox: '0 0 24 24',
				}, [
					h('path', { d }, [
						this.title ? h('title', null, this.title) : createCommentVNode('v-if', true),
					]),
				]),
			])
		},
	}
	cache.set(name, component)
	return component
}
