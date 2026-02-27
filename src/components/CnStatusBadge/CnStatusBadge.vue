<template>
	<span
		class="cn-status-badge"
		:class="badgeClasses">
		<slot>{{ label }}</slot>
	</span>
</template>

<script>
/**
 * CnStatusBadge — Color-coded pill badge for status, priority, or category display.
 *
 * Replaces the various .status-badge / .priority-badge CSS patterns duplicated
 * across Pipelinq and Procest. Supports a colorMap for automatic variant lookup.
 *
 * @example
 * <CnStatusBadge label="Open" variant="success" />
 * <CnStatusBadge label="Urgent" variant="error" size="small" />
 *
 * @example
 * <!-- With colorMap: variant auto-resolved from label -->
 * <CnStatusBadge
 *   label="overdue"
 *   :color-map="{ open: 'success', closed: 'default', overdue: 'error' }" />
 */
export default {
	name: 'CnStatusBadge',

	props: {
		/** Badge label text */
		label: {
			type: String,
			default: '',
		},
		/**
		 * Color variant: 'default', 'primary', 'success', 'warning', 'error', 'info'
		 */
		variant: {
			type: String,
			default: 'default',
			validator: (v) => ['default', 'primary', 'success', 'warning', 'error', 'info'].includes(v),
		},
		/** Size: 'small' or 'medium' */
		size: {
			type: String,
			default: 'medium',
			validator: (v) => ['small', 'medium'].includes(v),
		},
		/**
		 * Map of label values to variants. When provided, the variant is resolved
		 * from this map using the label (case-insensitive). Falls back to the variant prop.
		 * @example { open: 'success', closed: 'default', overdue: 'error' }
		 */
		colorMap: {
			type: Object,
			default: null,
		},
	},

	computed: {
		resolvedVariant() {
			if (this.colorMap && this.label) {
				const key = this.label.toLowerCase()
				return this.colorMap[key] || this.variant
			}
			return this.variant
		},

		badgeClasses() {
			return {
				['cn-status-badge--' + this.resolvedVariant]: true,
				'cn-status-badge--small': this.size === 'small',
			}
		},
	},
}
</script>
