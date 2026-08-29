<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div
		class="cn-widget-empty-state"
		:class="{ 'cn-widget-empty-state--compact': compact }"
		data-testid="cn-widget-empty-state"
		role="note">
		<div class="cn-widget-empty-state__icon" :style="iconStyle" aria-hidden="true">
			<!-- @slot icon Replace the default outline icon. Keep it a single
			     line-art glyph — the circle around it is drawn by this
			     component, not by the icon. -->
			<slot name="icon">
				<component :is="iconComponent" :size="compact ? 20 : 28" />
			</slot>
		</div>
		<p class="cn-widget-empty-state__name">
			{{ name }}
		</p>
		<p v-if="description" class="cn-widget-empty-state__description">
			{{ description }}
		</p>
		<div v-if="$slots.action" class="cn-widget-empty-state__action">
			<!-- @slot action A single call to action — the thing that would
			     make the widget non-empty (e.g. "+ Add"). Omit it when the
			     user cannot act on the emptiness. -->
			<slot name="action" />
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import TrayRemove from 'vue-material-design-icons/TrayRemove.vue'

/**
 * Semantic variant → CSS colour token for the empty-state icon. Tokens only,
 * so the nldesign app's variable overrides re-theme it (NL Design System).
 *
 * @type {Record<string, string>}
 */
const VARIANT_COLORS = {
	primary: 'var(--color-primary-element)',
	success: 'var(--color-success)',
	warning: 'var(--color-warning)',
	error: 'var(--color-error)',
	neutral: 'var(--color-text-maxcontrast)',
}

/**
 * CnWidgetEmptyState — the designed empty state for a dashboard widget.
 *
 * An empty widget used to render whatever its content component happened to
 * leave behind — most visibly a bare table header, which paints as a grey bar
 * floating in the middle of an otherwise blank card. This component replaces
 * that with something deliberate: a tinted circular icon, a short headline,
 * an optional explanatory line, and an optional single call to action. It
 * sizes to the widget rather than claiming a fixed 64px block, so a short
 * tile gets the `compact` treatment instead of overflowing.
 *
 * ```vue
 * <CnWidgetEmptyState
 *   :name="t('myapp', 'No open cases')"
 *   :description="t('myapp', 'Cases assigned to you will appear here.')">
 *   <template #action>
 *     <NcButton @click="create">{{ t('myapp', 'New case') }}</NcButton>
 *   </template>
 * </CnWidgetEmptyState>
 * ```
 */
export default {
	name: 'CnWidgetEmptyState',

	components: { TrayRemove },

	props: {
		/** Headline — what is empty, in the user's words. */
		name: {
			type: String,
			default: () => t('nextcloud-vue', 'Nothing here yet'),
		},
		/** Optional second line explaining what would fill the widget. */
		description: {
			type: String,
			default: '',
		},
		/**
		 * Icon component rendered inside the circle. Defaults to an
		 * empty-tray outline.
		 *
		 * @type {object|Function|null}
		 */
		icon: {
			type: [Object, Function],
			default: null,
		},
		/**
		 * Semantic colour for the icon and its tint, matching the widget
		 * header's `titleIconVariant` so an empty widget still reads as the
		 * same widget.
		 *
		 * @type {'primary'|'success'|'warning'|'error'|'neutral'}
		 */
		variant: {
			type: String,
			default: 'neutral',
			validator: (v) => ['primary', 'success', 'warning', 'error', 'neutral'].includes(v),
		},
		/**
		 * Shrink to a single quiet line-height block — for short tiles where
		 * a full empty state would be taller than the widget.
		 */
		compact: {
			type: Boolean,
			default: false,
		},
	},

	computed: {
		/**
		 * The icon component to render (the `icon` prop, else the default).
		 *
		 * @return {object|Function}
		 */
		iconComponent() {
			return this.icon || TrayRemove
		},

		/**
		 * Icon colour + tinted circle, both derived from one token so the
		 * pair can never drift. `color-mix` keeps the tint honest under a
		 * re-themed palette instead of freezing an rgba() literal.
		 *
		 * @return {object}
		 */
		iconStyle() {
			const c = VARIANT_COLORS[this.variant] || VARIANT_COLORS.neutral
			return {
				color: c,
				background: `color-mix(in srgb, ${c} 12%, transparent)`,
			}
		},
	},
}
</script>

<style scoped>
.cn-widget-empty-state {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 6px;
	/* No fixed height: the state fits whatever the widget cell left over
	   (ADR-062 — the cell is the budget), and `min-height: 0` keeps it from
	   forcing a scrollbar on a short tile. */
	min-height: 0;
	padding: 16px 12px;
	text-align: center;
}

.cn-widget-empty-state__icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 48px;
	height: 48px;
	border-radius: 50%;
	flex-shrink: 0;
}

.cn-widget-empty-state__icon :deep(svg) {
	fill: currentcolor;
}

.cn-widget-empty-state__name {
	margin: 0;
	font-size: 14px;
	font-weight: 600;
	color: var(--color-main-text);
}

.cn-widget-empty-state__description {
	margin: 0;
	font-size: 13px;
	color: var(--color-text-maxcontrast);
	max-width: 32ch;
}

.cn-widget-empty-state__action {
	margin-top: 4px;
}

/* Compact: one muted row, icon inline — for tiles too short for the stack. */
.cn-widget-empty-state--compact {
	flex-direction: row;
	gap: 8px;
	padding: 8px 12px;
}

.cn-widget-empty-state--compact .cn-widget-empty-state__icon {
	width: 28px;
	height: 28px;
}

.cn-widget-empty-state--compact .cn-widget-empty-state__name {
	font-weight: 400;
	color: var(--color-text-maxcontrast);
}
</style>
