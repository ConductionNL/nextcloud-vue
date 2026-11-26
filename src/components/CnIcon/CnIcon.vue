<template>
	<component :is="resolvedComponent" :size="size" />
</template>

<script>
import HelpCircleOutline from 'vue-material-design-icons/HelpCircleOutline.vue'
import { DASHBOARD_ICONS } from '../CnIconPicker/dashboardIcons.js'
import { bridgedMdiForCssIcon } from './cssIconBridge.js'
import { SEMANTIC_ICON_COMPONENTS, SEMANTIC_ICONS } from './semanticIcons.js'

/**
 * Mutable icon registry.
 *
 * Pre-populated with HelpCircleOutline (the default fallback).
 * Apps extend this at boot via registerIcons() — import only the
 * icons you need, keeping bundles small.
 *
 * import { registerIcons } from '@conduction/nextcloud-vue'
 * import Sword from 'vue-material-design-icons/Sword.vue'
 * registerIcons({ Sword })
 */
const _registry = {
	HelpCircleOutline,
}

/**
 * Register one or more MDI icon components for use with CnIcon.
 *
 * Call this in your app's main.js before mounting the Vue instance.
 * Each key must be the PascalCase icon name matching the
 * vue-material-design-icons file name (e.g. "Sword" for Sword.vue).
 *
 * @param {Record<string, import('vue').Component>} icons - Map of PascalCase icon names to Vue components
 *
 * import { registerIcons } from '@conduction/nextcloud-vue'
 * import Sword from 'vue-material-design-icons/Sword.vue'
 * import MagicStaff from 'vue-material-design-icons/MagicStaff.vue'
 * registerIcons({ Sword, MagicStaff })
 */
export function registerIcons(icons) {
	Object.assign(_registry, icons)
}

/**
 * Read-only reference to the current icon registry.
 * Useful for checking which icons are available.
 *
 * @type {Record<string, import('vue').Component>}
 */
export const ICON_MAP = _registry

/**
 * Look a name up in the registry, the semantic vocabulary and the dashboard
 * set, in that order. Own keys only, so `constructor` and friends never match.
 *
 * @param {string} name An exact PascalCase icon name.
 * @return {object|undefined} The component, or undefined when none holds it.
 */
function lookupIcon(name) {
	for (const table of [_registry, SEMANTIC_ICON_COMPONENTS, DASHBOARD_ICONS]) {
		if (Object.hasOwn(table, name)) {
			return table[name]
		}
	}
	return undefined
}

/**
 * Turn a lowercase or kebab-case MDI name into its PascalCase file name
 * (`calendar` to `Calendar`, `link-variant` to `LinkVariant`).
 *
 * @param {string} name The authored icon name.
 * @return {string} The PascalCase form.
 */
function toPascalCase(name) {
	return name
		.split(/[-_\s]+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join('')
}

/**
 * Resolve an authored icon name to a component. Tries the exact name, then a
 * legacy Nextcloud `icon-*` class, then the PascalCase form of a lowercase or
 * kebab-case MDI name, then the name as a concept of the semantic vocabulary
 * (`folder` to FolderOutline).
 *
 * @param {unknown} name The icon name from a prop or manifest.
 * @return {object|null} The component, or null when nothing resolves it.
 */
export function resolveIcon(name) {
	if (typeof name !== 'string' || name === '') {
		return null
	}
	const direct = lookupIcon(name) || (name.startsWith('icon-') ? bridgedMdiForCssIcon(name) : undefined)
	if (direct) {
		return direct
	}
	const pascal = lookupIcon(toPascalCase(name))
	if (pascal) {
		return pascal
	}
	const concept = name.toLowerCase()
	if (Object.hasOwn(SEMANTIC_ICONS, concept)) {
		return lookupIcon(SEMANTIC_ICONS[concept]) || null
	}
	return null
}

/**
 * CnIcon — Renders a Material Design Icon by PascalCase name.
 *
 * Looks up the name in the shared registry. If not found, renders
 * the fallback icon (HelpCircleOutline by default).
 *
 * ```vue
 * <CnIcon name="AccountGroup" :size="24" />
 * ```
 *
 * @see https://pictogrammers.com/library/mdi/
 */
export default {
	name: 'CnIcon',

	props: {
		/**
		 * MDI icon name: PascalCase (`AccountGroup`), lowercase or kebab-case
		 * (`calendar`, `link-variant`), a semantic concept (`folder`) or a
		 * Nextcloud `icon-*` class.
		 */
		name: {
			type: String,
			required: true,
		},

		/** Icon pixel size */
		size: {
			type: Number,
			default: 20,
		},

		/** Fallback icon name if `name` resolves to nothing; resolved the same way. */
		fallback: {
			type: String,
			default: 'HelpCircleOutline',
		},
	},

	computed: {
		resolvedComponent() {
			// Registered icons win; then the ADR-077 semantic vocabulary; then
			// the dashboard-icon set the picker offers; then a legacy `icon-*`
			// class through the bridge; then the lowercase / concept forms.
			// The fallback name resolves the same way.
			return resolveIcon(this.name)
				|| resolveIcon(this.fallback)
				|| HelpCircleOutline
		},
	},
}
</script>
