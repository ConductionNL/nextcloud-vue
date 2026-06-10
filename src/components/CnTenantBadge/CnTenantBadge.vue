<!--
	CnTenantBadge — compact badge rendering the active organisation's name
	and (optional) icon. Auto-hides when the user has at most ONE
	organisation (single-tenant or no-tenant deployments don't need the
	visual chrome). Wires to `useTenantContext()` so the badge stays
	reactive when an upstream `setActiveTenant()` call switches tenants.

	Spec: openspec/changes/multi-tenancy-context — REQ-MT-4 (UI).
-->
<template>
	<div v-if="visible" :class="['cn-tenant-badge', sizeClass]" :title="badgeTitle">
		<span v-if="iconLetter" class="cn-tenant-badge__icon" :style="iconStyle">{{ iconLetter }}</span>
		<span class="cn-tenant-badge__name">{{ displayName }}</span>
	</div>
</template>

<script>
import { tenantContextMixin } from '../../mixins/tenantContext.js'

export default {
	name: 'CnTenantBadge',

	mixins: [tenantContextMixin],

	props: {
		/**
		 * Full list of organisations the current user belongs to. When
		 * supplied, the badge auto-hides when length <= 1. When unset
		 * (length unknown), the badge always renders if an active
		 * organisation exists.
		 */
		organisations: {
			type: Array,
			default: null,
		},

		/**
		 * Badge size: `'sm'` (default — fits the top-bar) or `'md'`.
		 */
		size: {
			type: String,
			default: 'sm',
			validator: (v) => ['sm', 'md'].includes(v),
		},

		/**
		 * Optional fallback name shown when the active organisation
		 * entity has not been resolved yet (only UUID known).
		 */
		fallbackName: {
			type: String,
			default: '',
		},
	},

	computed: {
		/**
		 * Render gate.
		 *
		 * Auto-hide rules:
		 *   - When `organisations` is a non-null array of length <= 1 → hide.
		 *   - When no active organisation UUID AND no fallback → hide.
		 */
		visible() {
			if (Array.isArray(this.organisations) && this.organisations.length <= 1) {
				return false
			}
			return Boolean(this.activeOrganisationUuid || this.fallbackName)
		},

		/**
		 * Display name — prefer the resolved entity's name, fall back
		 * to `fallbackName`, then the UUID itself.
		 */
		displayName() {
			if (this.activeOrganisation && this.activeOrganisation.name) {
				return this.activeOrganisation.name
			}
			if (this.fallbackName) return this.fallbackName
			return this.activeOrganisationUuid || ''
		},

		/** Single-letter avatar based on the resolved name. */
		iconLetter() {
			const name = this.displayName
			if (!name) return ''
			return name.charAt(0).toUpperCase()
		},

		/** Deterministic colour-from-name for the avatar background. */
		iconStyle() {
			const name = this.displayName
			if (!name) return {}
			let hash = 0
			for (let i = 0; i < name.length; i++) {
				hash = name.charCodeAt(i) + ((hash << 5) - hash)
			}
			const hue = Math.abs(hash) % 360
			return { backgroundColor: `hsl(${hue}, 45%, 40%)` }
		},

		/** Native tooltip text — full org name + uuid hint. */
		badgeTitle() {
			const name = this.displayName
			const uuid = this.activeOrganisationUuid
			if (name && uuid && name !== uuid) return `${name} (${uuid})`
			return name || uuid || ''
		},

		sizeClass() {
			return `cn-tenant-badge--${this.size}`
		},
	},
}
</script>

<style scoped>
.cn-tenant-badge {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 2px 8px;
	border-radius: 12px;
	background: var(--color-background-hover, rgba(127, 127, 127, 0.12));
	color: var(--color-main-text, inherit);
	font-size: 12px;
	line-height: 1.25;
	max-width: 220px;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	cursor: default;
}

.cn-tenant-badge--md {
	font-size: 14px;
	padding: 4px 12px;
}

.cn-tenant-badge__icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 18px;
	height: 18px;
	border-radius: 50%;
	color: #fff;
	font-size: 11px;
	font-weight: 600;
	flex: 0 0 auto;
}

.cn-tenant-badge--md .cn-tenant-badge__icon {
	width: 22px;
	height: 22px;
	font-size: 12px;
}

.cn-tenant-badge__name {
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>
