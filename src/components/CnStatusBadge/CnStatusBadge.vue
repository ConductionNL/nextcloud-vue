<template>
	<span
		class="cn-status-badge"
		:class="badgeClasses">
		<slot>
			<slot name="icon" />
			{{ label }}
		</slot>
	</span>
</template>

<script>
/**
 * CnStatusBadge — Color-coded pill badge for status, priority, or category display.
 *
 * Replaces the various .status-badge / .priority-badge CSS patterns duplicated
 * across Pipelinq and Procest. Supports a colorMap for automatic variant lookup.
 *
 * <CnStatusBadge label="Open" variant="success" />
 * <CnStatusBadge label="Urgent" variant="error" size="small" />
 *
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
		 * Use solid background with white text instead of light background with colored text.
		 * Useful when the badge is placed on a colored background (e.g., an active card).
		 */
		solid: {
			type: Boolean,
			default: false,
		},
		/**
		 * Map of label values to variants. When provided, the variant is resolved
		 * from this map using the label (case-insensitive). Falls back to the variant prop.
		 * { open: 'success', closed: 'default', overdue: 'error' }
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
				const normalizedColorMap = Object.fromEntries(Object.entries(this.colorMap).map(([k, v]) => [k.toLowerCase(), v]))
				return normalizedColorMap[key] || this.variant
			}
			return this.variant
		},

		badgeClasses() {
			return {
				['cn-status-badge--' + this.resolvedVariant]: true,
				'cn-status-badge--small': this.size === 'small',
				'cn-status-badge--solid': this.solid,
			}
		},
	},
}
</script>
