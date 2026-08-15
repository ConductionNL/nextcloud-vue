<template>
	<article class="cn-roadmap-item">
		<header class="cn-roadmap-item__header">
			<img
				v-if="item.user && item.user.avatar_url"
				:src="item.user.avatar_url"
				:alt="item.user.login || ''"
				width="24"
				height="24"
				referrerpolicy="no-referrer"
				class="cn-roadmap-item__avatar">
			<div class="cn-roadmap-item__meta">
				<a
					:href="safeHref(item.html_url)"
					target="_blank"
					rel="noopener noreferrer"
					class="cn-roadmap-item__title-link">
					{{ item.title }}
				</a>
				<div class="cn-roadmap-item__submitter">
					<span v-if="item.user && item.user.login">{{ item.user.login }}</span>
					<span class="cn-roadmap-item__separator">·</span>
					<span>{{ relativeCreatedAt }}</span>
				</div>
			</div>
			<div class="cn-roadmap-item__reactions">
				<ThumbUpOutline :size="16" />
				<span>{{ thumbsUpCount }}</span>
			</div>
		</header>

		<div
			v-if="sanitizedBody !== ''"
			class="cn-roadmap-item__body"
			v-html="sanitizedBody" /><!-- eslint-disable-line vue/no-v-html -- sanitizedBody comes from cnRenderMarkdown(), which sanitises through DOMPurify -->

		<footer v-if="visibleLabels.length > 0" class="cn-roadmap-item__labels">
			<span
				v-for="label in visibleLabels"
				:key="label.name"
				class="cn-roadmap-item__label-chip"
				:style="chipStyle(label)">
				{{ label.name }}
			</span>
		</footer>
	</article>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * RoadmapItem — single roadmap card. Renders an issue's title (linking to
 * the GitHub URL in a new tab), submitter avatar + login + relative time,
 * reaction count, sanitized markdown body, and filtered label chips.
 *
 * Markdown safety: the body flows through `cnRenderMarkdown` (existing
 * `marked` wrapper) → `DOMPurify.sanitize(html, SAFE_MARKDOWN_DOMPURIFY_CONFIG)`.
 * Labels are filtered through `ROADMAP_LABEL_BLOCKLIST` so hydra workflow
 * labels never appear on the card.
 *
 * Template notes (kept here, NOT as `<!-- -->` comments inside `<template>`:
 * the Vue 3 SFC compiler preserves template comments as real DOM comment
 * nodes in dev builds, where Vue 2's compiler stripped them — so anything
 * written there leaks into the rendered markup):
 *
 *   - The avatar is a plain `<img>` rather than `<NcAvatar>`: the GitHub login
 *     is not a Nextcloud user, and NcAvatar's resolution path triggers an
 *     `/avatar/<user>` lookup that returns 404 + initials instead of using the
 *     GitHub-hosted `avatar_url`. CSP `img-src *` allows external images here.
 *   - The avatar is eager-loaded: `loading="lazy"` deferred the fetch
 *     indefinitely for cards below the fold, leaving a broken-image glyph.
 *     These are 24px images, so eager is cheap.
 *   - `v-html` on the body is intentional AND safe: `cnRenderMarkdown` runs
 *     `marked` then sanitises with SAFE_MARKDOWN_DOMPURIFY_CONFIG (strips
 *     script elements, `on...` handler attributes, `javascript:` URLs, and
 *     iframe + style elements). Never bind raw `item.body`.
 *
 * Spec: features-roadmap-component — Requirement "RoadmapItem".
 */
import ThumbUpOutline from 'vue-material-design-icons/ThumbUpOutline.vue'

import { cnRenderMarkdown } from '../../composables/cnRenderMarkdown.js'
import { ROADMAP_LABEL_BLOCKLIST } from '../../utils/roadmapLabelBlocklist.js'
import { safeHref } from '../../utils/safeHref.js'

export default {
	name: 'CnRoadmapItem',

	components: { ThumbUpOutline },

	props: {
		/**
		 * Sanitized issue object from the OpenRegister GitHub proxy.
		 * Shape: {number, title, body, html_url, user.{login, avatar_url},
		 *        reactions.{total_count, +1}, created_at, updated_at,
		 *        labels[].{name, color}}.
		 * @type {object}
		 */
		item: {
			type: Object,
			required: true,
		},
	},

	computed: {
		sanitizedBody() {
			// cnRenderMarkdown already sanitises via DOMPurify internally —
			// no second pass needed (L1: double-sanitisation removed).
			return cnRenderMarkdown(this.item.body || '')
		},

		thumbsUpCount() {
			return (this.item.reactions && this.item.reactions['+1']) || 0
		},

		visibleLabels() {
			const labels = Array.isArray(this.item.labels) ? this.item.labels : []
			return labels.filter(
				(label) => label && typeof label.name === 'string' && !ROADMAP_LABEL_BLOCKLIST.some((re) => re.test(label.name)),
			)
		},

		relativeCreatedAt() {
			if (!this.item.created_at) {
				return ''
			}
			const created = new Date(this.item.created_at)
			const diffSec = Math.floor((Date.now() - created.getTime()) / 1000)
			if (diffSec < 60) return `${diffSec}s`
			if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`
			if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`
			if (diffSec < 2592000) return `${Math.floor(diffSec / 86400)}d`
			return created.toLocaleDateString()
		},
	},

	methods: {
		safeHref,

		chipStyle(label) {
			if (!label.color) {
				return {}
			}
			return {
				backgroundColor: '#' + label.color,
				color: this.contrastTextColor(label.color),
			}
		},
		contrastTextColor(hexColor) {
			// Simple luminance check — dark text on bright bg, white on dark.
			const r = parseInt(hexColor.slice(0, 2), 16)
			const g = parseInt(hexColor.slice(2, 4), 16)
			const b = parseInt(hexColor.slice(4, 6), 16)
			const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
			return lum > 0.55 ? '#000' : '#fff'
		},
	},
}
</script>

<style scoped>
.cn-roadmap-item {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 16px;
	/* Position anchor for the ::after overlay that expands the title link's
	   click area to the whole card. Inner anchors stay above the overlay
	   via z-index: 2 so the body's inline links still work. */
	position: relative;
}

.cn-roadmap-item__title-link::after {
	content: "";
	position: absolute;
	inset: 0;
	z-index: 1;
	border-radius: inherit;
}

.cn-roadmap-item__body :deep(a),
.cn-roadmap-item__labels {
	position: relative;
	z-index: 2;
}

.cn-roadmap-item__header {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 8px;
}

.cn-roadmap-item__avatar {
	width: 24px;
	height: 24px;
	border-radius: 50%;
	flex-shrink: 0;
	object-fit: cover;
	background: var(--color-background-darker);
}

.cn-roadmap-item__meta {
	flex: 1;
}

.cn-roadmap-item__title-link {
	display: block;
	color: var(--color-main-text);
	font-weight: 600;
	text-decoration: none;
}

.cn-roadmap-item__title-link:hover {
	color: var(--color-primary-element);
	text-decoration: underline;
}

.cn-roadmap-item__submitter {
	font-size: 0.85em;
	color: var(--color-text-light);
}

.cn-roadmap-item__separator {
	margin: 0 4px;
}

.cn-roadmap-item__reactions {
	display: flex;
	align-items: center;
	gap: 4px;
	color: var(--color-text-light);
}

.cn-roadmap-item__body {
	color: var(--color-main-text);
	font-size: 0.95em;
	line-height: 1.4;
	/* Cap the rendered markdown so cards stay roughly feature-card-sized.
	   Full body is reachable via the title link to the GitHub issue. */
	max-height: 8.4em;
	overflow: hidden;
	position: relative;
	mask-image: linear-gradient(to bottom, black 70%, transparent);
	-webkit-mask-image: linear-gradient(to bottom, black 70%, transparent);
}

.cn-roadmap-item__body :deep(p) { margin: 4px 0; }
.cn-roadmap-item__body :deep(h1),
.cn-roadmap-item__body :deep(h2),
.cn-roadmap-item__body :deep(h3) {
	font-size: 1em;
	margin: 4px 0;
	font-weight: 600;
}
.cn-roadmap-item__body :deep(pre) { background: var(--color-background-hover); padding: 8px; border-radius: 4px; overflow-x: auto; }
.cn-roadmap-item__body :deep(code) { background: var(--color-background-hover); padding: 2px 4px; border-radius: 3px; }

.cn-roadmap-item__labels {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	margin-top: 8px;
}

.cn-roadmap-item__label-chip {
	padding: 2px 8px;
	border-radius: 10px;
	font-size: 0.8em;
}
</style>
