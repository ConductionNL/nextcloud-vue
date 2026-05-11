<template>
	<article class="cn-roadmap-item">
		<header class="cn-roadmap-item__header">
			<NcAvatar
				v-if="item.user && item.user.login"
				:user="item.user.login"
				:url="item.user.avatar_url"
				:size="24"
				class="cn-roadmap-item__avatar" />
			<div class="cn-roadmap-item__meta">
				<a
					:href="item.html_url"
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

		<!-- Sanitized markdown body — DOMPurify-cleaned HTML from marked.
		     v-html is intentional here AND safe: the value flows through
		     SAFE_MARKDOWN_DOMPURIFY_CONFIG which strips <script>, on* attrs,
		     javascript: URLs, <iframe>, <style>. Never bind raw item.body. -->
		<div
			v-if="sanitizedBody !== ''"
			class="cn-roadmap-item__body"
			v-html="sanitizedBody" />

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
 * Spec: features-roadmap-component — Requirement "RoadmapItem".
 */
import DOMPurify from 'dompurify'
import { NcAvatar } from '@nextcloud/vue'
import ThumbUpOutline from 'vue-material-design-icons/ThumbUpOutline.vue'

import { cnRenderMarkdown } from '../../composables/cnRenderMarkdown.js'
import { SAFE_MARKDOWN_DOMPURIFY_CONFIG } from '../../utils/safeMarkdownDompurifyConfig.js'
import { ROADMAP_LABEL_BLOCKLIST } from '../../utils/roadmapLabelBlocklist.js'

export default {
	name: 'RoadmapItem',

	components: { NcAvatar, ThumbUpOutline },

	props: {
		/**
		 * Sanitized issue object from the OpenRegister GitHub proxy.
		 * Shape: {number, title, body, html_url, user.{login, avatar_url},
		 *        reactions.{total_count, +1}, created_at, updated_at,
		 *        labels[].{name, color}}.
		 * @type {Object}
		 */
		item: {
			type: Object,
			required: true,
		},
	},

	computed: {
		sanitizedBody() {
			const html = cnRenderMarkdown(this.item.body || '')
			return DOMPurify.sanitize(html, SAFE_MARKDOWN_DOMPURIFY_CONFIG)
		},

		thumbsUpCount() {
			return (this.item.reactions && this.item.reactions['+1']) || 0
		},

		visibleLabels() {
			const labels = Array.isArray(this.item.labels) ? this.item.labels : []
			return labels.filter(
				(label) => label && typeof label.name === 'string' && !ROADMAP_LABEL_BLOCKLIST.some((re) => re.test(label.name))
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
	padding: 16px;
	border-bottom: 1px solid var(--color-border);
}

.cn-roadmap-item__header {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 8px;
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
}

.cn-roadmap-item__body :deep(p) { margin: 4px 0; }
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
