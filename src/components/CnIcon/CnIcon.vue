<template>
	<component :is="resolvedComponent" :size="size" />
</template>

<script>
import HelpCircleOutline from 'vue-material-design-icons/HelpCircleOutline.vue'

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
		/** MDI icon name in PascalCase (e.g. "AccountGroup") */
		name: {
			type: String,
			required: true,
		},
		/** Icon pixel size */
		size: {
			type: Number,
			default: 20,
		},
		/** Fallback icon name if `name` is not found in the registry */
		fallback: {
			type: String,
			default: 'HelpCircleOutline',
		},
	},

	computed: {
		resolvedComponent() {
			return _registry[this.name] || _registry[this.fallback] || HelpCircleOutline
		},
	},
}
</script>
