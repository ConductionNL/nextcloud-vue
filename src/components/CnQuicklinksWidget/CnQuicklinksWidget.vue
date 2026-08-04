<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div
		class="cn-quicklinks-widget"
		:class="rootClasses"
		:style="rootStyle">
		<div v-if="isEmpty" class="cn-quicklinks-widget__empty" @click="onEmptyClick">
			<button
				type="button"
				class="cn-quicklinks-widget__empty-button"
				:aria-label="t('nextcloud-vue', 'Open quicklinks settings')"
				@click.stop="onEmptyClick">
				<CnWidgetIcon name="Cog" :size="32" />
			</button>
			<p class="cn-quicklinks-widget__empty-text">
				{{ t('nextcloud-vue', 'No quicklinks yet — click the gear icon to add some.') }}
			</p>
		</div>
		<ul v-else class="cn-quicklinks-widget__list" :style="listStyle">
			<li
				v-for="(link, index) in renderedLinks"
				:key="`${link.url}-${index}`"
				class="cn-quicklinks-widget__item">
				<a
					class="cn-quicklinks-widget__link"
					:href="link.href"
					:target="link.target"
					:rel="link.rel"
					:aria-label="link.ariaLabel"
					:title="linkTitleAttr(link, index)"
					:style="link.tileStyle"
					@click="onLinkClick($event, link)">
					<span
						class="cn-quicklinks-widget__icon"
						:style="link.iconWrapperStyle">
						<CnWidgetIcon
							:name="link.iconName"
							:size="iconPx"
							:alt="link.label || ''" />
					</span>
					<span
						v-if="showLabels"
						:ref="`quicklink-label-${index}`"
						class="cn-quicklinks-widget__label"
						:class="labelClasses">
						{{ link.label }}
					</span>
				</a>
			</li>
		</ul>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import CnWidgetIcon from '../CnWidgetGrid/CnWidgetIcon.vue'
import { isExternalUrl, validateUrl } from '../../utils/widgetUrl.js'

const SIZE_PX = Object.freeze({
	small: 32,
	medium: 48,
	large: 64,
	xlarge: 96,
})

const SHAPE_RADIUS = Object.freeze({
	square: '0',
	rounded: '8px',
	circle: '50%',
})

const ALLOWED_HOVER = Object.freeze(['lift', 'fade', 'border', 'none'])
const ALLOWED_TILE_BG = Object.freeze(['transparent', 'solid', 'gradient'])
const ALLOWED_LABEL_POSITIONS = Object.freeze(['below', 'overlay'])

/**
 * CnQuicklinksWidget — renders a flat icon-and-label grid for the `quicklinks`
 * widget type.
 *
 * The widget reads the persisted `content` blob and produces `<a>` elements
 * arranged either as a flex-wrap row (`columns: 'auto'`) or a fixed CSS grid
 * (`columns: 1..12`). External URLs open in a new tab via `window.open(...,
 * '_blank', 'noopener,noreferrer')`; relative Nextcloud URLs navigate in the
 * same tab; the user can override per-link via `openInNewTab`. Click is
 * suppressed in admin/edit mode (`isAdmin === true && canEdit === true`).
 *
 * Icon resolution routes through {@link CnWidgetIcon}: a custom URL renders as
 * `<img>`, a bare MDI name as the icon component, an empty value falls back to
 * a default. Sizes (32/48/64/96 px) and shapes (square/rounded/circle) are
 * widget-level settings applied uniformly.
 *
 * The label always stays reachable via a native `title` tooltip when it isn't
 * fully visible in the tile itself: when `showLabels` is `false` (always), or
 * when `labelPosition` is `below` and the label has actually been measured as
 * ellipsis-truncated (`scrollWidth > clientWidth`, re-checked on mount, on
 * content change, and on container resize — see `measureLabelTruncation`). A
 * short `below` label that fits gets no tooltip. The `overlay` position
 * already reveals the label on hover/focus, so no tooltip is added there.
 *
 * When the link list is empty an `edit` event is emitted on click of the
 * placeholder so a host can open the widget settings.
 *
 * Registered as the `quicklinks` dashboard widget type via the renderer's
 * `index.js`.
 */
export default {
	name: 'CnQuicklinksWidget',

	components: { CnWidgetIcon },

	props: {
		/**
		 * Persisted widget content: `{links, iconSize, iconShape, showLabels,
		 * labelPosition, columns, tileBackgroundStyle, hoverEffect}`.
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * Whether the current user is an admin. Combined with `canEdit` to
		 * suppress click handlers in edit mode.
		 *
		 * @type {boolean}
		 */
		isAdmin: {
			type: Boolean,
			default: false,
		},
		/**
		 * Whether the surrounding dashboard shell is in edit mode.
		 *
		 * @type {boolean}
		 */
		canEdit: {
			type: Boolean,
			default: false,
		},
	},

	emits: [
		/**
		 * Emitted when the empty-state placeholder is clicked so a host can
		 * open the widget settings.
		 *
		 * @event edit
		 */
		'edit',
	],

	data() {
		return {
			/**
			 * Per-index truncation state for `below`-position label spans, keyed
			 * by the link's index in `renderedLinks`. Populated by
			 * {@link measureLabelTruncation}.
			 */
			truncatedLabels: {},
		}
	},

	computed: {
		/** The sanitised list of link objects from content. */
		links() {
			const raw = this.content?.links
			if (!Array.isArray(raw)) {
				return []
			}
			return raw.filter((link) => link && typeof link === 'object')
		},

		/** Whether there are no links to render. */
		isEmpty() {
			return this.links.length === 0
		},

		/** Resolved icon-size key (default `medium`). */
		iconSize() {
			const declared = this.content?.iconSize
			return Object.prototype.hasOwnProperty.call(SIZE_PX, declared) ? declared : 'medium'
		},

		/** The pixel size for the active icon-size key. */
		iconPx() {
			return SIZE_PX[this.iconSize]
		},

		/** Resolved icon-shape key (default `rounded`). */
		iconShape() {
			const declared = this.content?.iconShape
			return Object.prototype.hasOwnProperty.call(SHAPE_RADIUS, declared) ? declared : 'rounded'
		},

		/** The CSS border-radius for the active shape. */
		iconRadius() {
			return SHAPE_RADIUS[this.iconShape]
		},

		/** Whether labels are shown (default true). */
		showLabels() {
			return this.content?.showLabels !== false
		},

		/** Resolved label position (default `below`). */
		labelPosition() {
			const declared = this.content?.labelPosition
			return ALLOWED_LABEL_POSITIONS.includes(declared) ? declared : 'below'
		},

		/** Resolved column count (`'auto'` or 1..12). */
		columns() {
			const declared = this.content?.columns
			if (declared === 'auto' || declared === undefined || declared === null) {
				return 'auto'
			}
			const n = Number(declared)
			if (!Number.isInteger(n) || n < 1 || n > 12) {
				return 'auto'
			}
			return n
		},

		/** Resolved tile background style (default `transparent`). */
		tileBackgroundStyle() {
			const declared = this.content?.tileBackgroundStyle
			return ALLOWED_TILE_BG.includes(declared) ? declared : 'transparent'
		},

		/** Resolved hover effect (default `lift`). */
		hoverEffect() {
			const declared = this.content?.hoverEffect
			return ALLOWED_HOVER.includes(declared) ? declared : 'lift'
		},

		/** Whether the dashboard is in edit mode (clicks suppressed). */
		isInEditMode() {
			return this.isAdmin === true && this.canEdit === true
		},

		/** Label CSS class for the active position. */
		labelClasses() {
			return [
				`cn-quicklinks-widget__label--${this.labelPosition}`,
			]
		},

		/** Root CSS class list (hover / background / shape / edit modifiers). */
		rootClasses() {
			return [
				`cn-quicklinks-widget--hover-${this.hoverEffect}`,
				`cn-quicklinks-widget--bg-${this.tileBackgroundStyle}`,
				`cn-quicklinks-widget--shape-${this.iconShape}`,
				{ 'cn-quicklinks-widget--edit-mode': this.isInEditMode },
			]
		},

		/** Root inline CSS custom properties for icon size / radius. */
		rootStyle() {
			return {
				'--cn-quicklinks-icon-size': `${this.iconPx}px`,
				'--cn-quicklinks-icon-radius': this.iconRadius,
			}
		},

		/** Inline style for the list (flex-wrap or fixed grid). */
		listStyle() {
			if (this.columns === 'auto') {
				return {
					display: 'flex',
					'flex-wrap': 'wrap',
				}
			}
			return {
				display: 'grid',
				// minmax(0, 1fr), not a bare 1fr: a bare `1fr` track is
				// `minmax(auto, 1fr)`, so a long unbroken label would still
				// blow the column past its fair share instead of truncating.
				'grid-template-columns': `repeat(${this.columns}, minmax(0, 1fr))`,
			}
		},

		/** The decorated list of links ready for rendering. */
		renderedLinks() {
			return this.links.map((link) => this.decorateLink(link))
		},
	},

	watch: {
		/**
		 * Re-measure truncation whenever the persisted content changes — link
		 * count, labels, icon size, and columns can all change which labels
		 * fit, and none of that is caught by the resize observer below (the
		 * widget's own box size may not change).
		 */
		content: {
			deep: true,
			handler() {
				this.$nextTick(() => this.measureLabelTruncation())
			},
		},
	},

	mounted() {
		this.$nextTick(() => this.measureLabelTruncation())
		// The dashboard grid (GridStack) lets users resize this widget without
		// remounting it, which changes how many labels fit — re-measure whenever
		// that happens. Guarded for environments/tests without ResizeObserver.
		if (typeof ResizeObserver !== 'undefined') {
			this._resizeObserver = new ResizeObserver(() => this.measureLabelTruncation())
			this._resizeObserver.observe(this.$el)
		}
	},

	beforeDestroy() {
		if (this._resizeObserver) {
			this._resizeObserver.disconnect()
		}
	},

	methods: {
		t,

		/**
		 * Decorate a raw link into a render-ready entry with computed href,
		 * target, rel, aria-label, and icon styling.
		 *
		 * @param {object} link the raw link entry.
		 * @return {object} the decorated link.
		 */
		decorateLink(link) {
			const url = typeof link.url === 'string' ? link.url : ''
			const label = typeof link.label === 'string' ? link.label : ''
			const icon = typeof link.icon === 'string' ? link.icon : ''
			const color = typeof link.color === 'string' ? link.color : ''
			const isExternal = isExternalUrl(url)
			const opensNewTab = typeof link.openInNewTab === 'boolean'
				? link.openInNewTab
				: isExternal

			// An empty icon falls back to a default link icon via CnWidgetIcon.
			const iconName = icon === '' ? 'Link' : icon

			const showSolid = this.tileBackgroundStyle === 'solid'
			const tileColor = showSolid && color !== '' ? color : ''

			const ariaLabel = this.computeAriaLabel(url, label)

			return {
				url,
				label,
				icon,
				iconName,
				color,
				href: url || '#',
				target: opensNewTab ? '_blank' : '_self',
				rel: opensNewTab ? 'noopener noreferrer' : null,
				ariaLabel,
				opensNewTab,
				isExternal,
				iconWrapperStyle: this.computeIconWrapperStyle(tileColor),
				tileStyle: {},
			}
		},

		/**
		 * Compute the native `title` tooltip for a rendered link. When labels
		 * are hidden entirely (`showLabels: false`) the tooltip always carries
		 * the label, since it's otherwise invisible. When labels are shown
		 * `below`, the tooltip is added only once the label span has actually
		 * been measured as ellipsis-truncated ({@link measureLabelTruncation})
		 * — a short label that fits needs no tooltip. The `overlay` position
		 * already reveals the label on hover/focus, so no tooltip is added
		 * there.
		 *
		 * @param {object} link the decorated link.
		 * @param {number} index the link's index in `renderedLinks`.
		 * @return {string|null} the title attribute value, or null to omit it.
		 */
		linkTitleAttr(link, index) {
			if (link.label === '') {
				return null
			}
			if (!this.showLabels) {
				return link.label
			}
			if (this.labelPosition === 'below' && this.truncatedLabels[index]) {
				return link.label
			}
			return null
		},

		/**
		 * Measure which `below`-position label spans are actually
		 * ellipsis-truncated (`scrollWidth > clientWidth`) and update
		 * {@link truncatedLabels} accordingly. Runs after mount, after any
		 * content change that could alter link count / sizing, and on
		 * container resize (dashboard widgets are user-resizable via
		 * GridStack). A no-op outside the `below` label position.
		 *
		 * @return {void}
		 */
		measureLabelTruncation() {
			if (this.labelPosition !== 'below') {
				return
			}
			this.renderedLinks.forEach((_, index) => {
				const el = this.$refs[`quicklink-label-${index}`]
				const target = Array.isArray(el) ? el[0] : el
				if (!target) {
					return
				}
				const isTruncated = target.scrollWidth > target.clientWidth
				if (this.truncatedLabels[index] !== isTruncated) {
					this.$set(this.truncatedLabels, index, isTruncated)
				}
			})
		},

		/**
		 * Compute the icon-wrapper inline style (size, radius, tile bg).
		 *
		 * @param {string} tileColor a per-link solid background colour, or ''.
		 * @return {object} the icon-wrapper style object.
		 */
		computeIconWrapperStyle(tileColor) {
			const style = {
				width: `${this.iconPx}px`,
				height: `${this.iconPx}px`,
				'border-radius': this.iconRadius,
			}
			if (this.tileBackgroundStyle === 'solid') {
				style['background-color'] = tileColor !== '' ? tileColor : 'var(--color-background-hover)'
			} else if (this.tileBackgroundStyle === 'gradient') {
				style['background-image'] = 'linear-gradient(135deg, var(--color-primary-light), var(--color-background-hover))'
			}
			return style
		},

		/**
		 * Compute the accessible label for a link.
		 *
		 * @param {string} url the link URL.
		 * @param {string} label the link label.
		 * @return {string} the aria-label.
		 */
		computeAriaLabel(url, label) {
			if (this.showLabels && this.labelPosition === 'below' && label !== '') {
				return label
			}
			const host = this.extractHostname(url)
			if (host !== '') {
				return `${t('nextcloud-vue', 'Link to')} ${host}`
			}
			return label !== '' ? label : t('nextcloud-vue', 'Link')
		},

		/**
		 * Extract a hostname from an absolute URL (empty for relative paths).
		 *
		 * @param {string} url the URL.
		 * @return {string} the hostname, or ''.
		 */
		extractHostname(url) {
			if (typeof url !== 'string' || url === '') {
				return ''
			}
			try {
				if (url.startsWith('/')) {
					return ''
				}
				const parsed = new URL(url)
				return parsed.hostname
			} catch (_err) {
				return ''
			}
		},

		/**
		 * Handle a link click: suppress in edit mode / for invalid URLs, and
		 * open in a new tab via `window.open` when the link opens externally.
		 *
		 * @param {Event} event the click event.
		 * @param {object} link the decorated link.
		 * @return {void}
		 */
		onLinkClick(event, link) {
			if (this.isInEditMode) {
				event.preventDefault()
				return
			}
			if (!validateUrl(link.url)) {
				event.preventDefault()
				return
			}
			if (link.opensNewTab) {
				event.preventDefault()
				window.open(link.url, '_blank', 'noopener,noreferrer')
			}
			// Relative Nextcloud URL — let the browser follow the href.
		},

		/**
		 * Emit `edit` when the empty placeholder is clicked.
		 *
		 * @return {void}
		 */
		onEmptyClick() {
			this.$emit('edit')
		},
	},
}
</script>

<style scoped>
.cn-quicklinks-widget {
	width: 100%;
	height: 100%;
	padding: 8px;
	box-sizing: border-box;
	overflow: auto;
}

.cn-quicklinks-widget__list {
	gap: 12px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-quicklinks-widget__item {
	list-style: none;
	/* Without this, flex/grid give the item an automatic minimum size equal
	   to its unbreakable (nowrap) label text, overriding max-width below and
	   silently defeating the label's ellipsis truncation. */
	min-width: 0;
}

.cn-quicklinks-widget__link {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-start;
	gap: 4px;
	padding: 6px;
	box-sizing: border-box;
	margin: 0 auto;
	max-width: calc(var(--cn-quicklinks-icon-size) * 2);
	color: var(--color-main-text);
	text-decoration: none;
	border-radius: var(--border-radius, 4px);
	transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.15s ease,
		outline 0.1s ease;
	position: relative;
	cursor: pointer;
}

.cn-quicklinks-widget__link:focus-visible {
	outline: 2px solid var(--color-primary);
	outline-offset: 2px;
}

.cn-quicklinks-widget__icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
}

.cn-quicklinks-widget__icon img {
	max-width: 100%;
	max-height: 100%;
	display: block;
}

.cn-quicklinks-widget__label {
	font-size: 12px;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
}

.cn-quicklinks-widget__label--below {
	display: block;
	width: 100%;
	/* align-items: center on the tile above does not stretch children to its
	   width by default — without this the label still shrink-wraps to its
	   own content and never hits the overflow/ellipsis rules above. */
	align-self: stretch;
	min-width: 0;
	text-align: center;
}

.cn-quicklinks-widget__label--overlay {
	display: none;
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	padding: 2px 4px;
	background-color: rgba(0, 0, 0, 0.6);
	color: #fff;
	text-align: center;
	border-radius: 0 0 var(--border-radius, 4px) var(--border-radius, 4px);
}

.cn-quicklinks-widget__link:hover .cn-quicklinks-widget__label--overlay,
.cn-quicklinks-widget__link:focus .cn-quicklinks-widget__label--overlay {
	display: block;
}

.cn-quicklinks-widget--edit-mode .cn-quicklinks-widget__link {
	cursor: not-allowed;
}

.cn-quicklinks-widget--hover-lift .cn-quicklinks-widget__link:hover {
	transform: translateY(-3px);
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.cn-quicklinks-widget--hover-fade:hover .cn-quicklinks-widget__link {
	opacity: 0.6;
}

.cn-quicklinks-widget--hover-fade .cn-quicklinks-widget__link:hover {
	opacity: 1;
}

.cn-quicklinks-widget--hover-border .cn-quicklinks-widget__link:hover {
	outline: 2px solid var(--color-primary);
	outline-offset: 1px;
}

.cn-quicklinks-widget--hover-none .cn-quicklinks-widget__link:hover {
	cursor: pointer;
}

.cn-quicklinks-widget__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	gap: 8px;
	color: var(--color-text-maxcontrast);
	cursor: pointer;
	padding: 12px;
	box-sizing: border-box;
}

.cn-quicklinks-widget__empty-button {
	background: transparent;
	border: none;
	cursor: pointer;
	color: inherit;
	padding: 4px;
	border-radius: var(--border-radius, 4px);
}

.cn-quicklinks-widget__empty-button:hover {
	background: var(--color-background-hover);
}

.cn-quicklinks-widget__empty-text {
	margin: 0;
	font-size: 13px;
	text-align: center;
	max-width: 24em;
}
</style>
