<template>
	<div class="cn-federation-status" data-testid="cn-federation-status">
		<header v-if="title || description" class="cn-federation-status__header">
			<h3 v-if="title" class="cn-federation-status__title">
				{{ title }}
			</h3>
			<p v-if="description" class="cn-federation-status__description">
				{{ description }}
			</p>
		</header>

		<!-- Aggregate counts — the KPI part of this component.

		     Each count is a canonical INLINE KPI (src/css/kpi-card.css): the
		     card's number weight, colour and label scale at the compact size,
		     because a roll-up above a list is one line of context rather than
		     four tiles. Splitting the count and the label into their own spans
		     is what lets them take those two different treatments; before,
		     both sat in one text node at one size and the number read as prose.

		     The per-node list below is deliberately NOT a KPI surface — see the
		     note in the stylesheet block. -->
		<div v-if="!hideSummary" class="cn-federation-status__summary" data-testid="cn-federation-status-summary">
			<span class="cn-federation-status__summary-item cn-federation-status__summary-item--up cn-kpi-inline cn-kpi-inline--success">
				<span class="cn-federation-status__dot cn-federation-status__dot--up" />
				<span class="cn-kpi-inline__value">{{ counts.up }}</span>
				<span class="cn-kpi-inline__label">{{ upLabel }}</span>
			</span>
			<span class="cn-federation-status__summary-item cn-federation-status__summary-item--degraded cn-kpi-inline cn-kpi-inline--warning">
				<span class="cn-federation-status__dot cn-federation-status__dot--degraded" />
				<span class="cn-kpi-inline__value">{{ counts.degraded }}</span>
				<span class="cn-kpi-inline__label">{{ degradedLabel }}</span>
			</span>
			<span class="cn-federation-status__summary-item cn-federation-status__summary-item--down cn-kpi-inline cn-kpi-inline--error">
				<span class="cn-federation-status__dot cn-federation-status__dot--down" />
				<span class="cn-kpi-inline__value">{{ counts.down }}</span>
				<span class="cn-kpi-inline__label">{{ downLabel }}</span>
			</span>
			<span v-if="counts.unknown > 0"
				class="cn-federation-status__summary-item cn-federation-status__summary-item--unknown cn-kpi-inline cn-kpi-inline--muted">
				<span class="cn-federation-status__dot cn-federation-status__dot--unknown" />
				<span class="cn-kpi-inline__value">{{ counts.unknown }}</span>
				<span class="cn-kpi-inline__label">{{ unknownLabel }}</span>
			</span>
		</div>

		<!-- Empty state. -->
		<p v-if="nodes.length === 0" class="cn-federation-status__empty">
			{{ emptyLabel }}
		</p>

		<!-- Per-node list. -->
		<ul v-else class="cn-federation-status__list">
			<li v-for="node in sortedNodes"
				:key="node.id || node.name"
				class="cn-federation-status__node"
				:class="'cn-federation-status__node--' + normaliseStatus(node.status)"
				:data-status="normaliseStatus(node.status)"
				@click="onNodeClick(node)">
				<!-- `__dot` as well as `__node-dot`: the size, the shape and the
				     accent-driven fill all live on `__dot`, and the row's dot
				     carried only the `--status` modifier — which after this change
				     sets a custom property and nothing else. Without the base class
				     the row's dot was a zero-by-zero span the whole time: a
				     coloured background on an empty inline element paints nothing.
				     Same class, same dot, in the strip and in the row. -->
				<span class="cn-federation-status__node-dot cn-federation-status__dot"
					:class="'cn-federation-status__dot--' + normaliseStatus(node.status)" />
				<div class="cn-federation-status__node-body">
					<span class="cn-federation-status__node-name">{{ node.name || node.id }}</span>
					<small v-if="node.url" class="cn-federation-status__node-url">{{ node.url }}</small>
					<small v-if="node.message" class="cn-federation-status__node-message">{{ node.message }}</small>
					<small v-if="node.lastChecked" class="cn-federation-status__node-checked">
						{{ lastCheckedLabel }}: {{ formatTimestamp(node.lastChecked) }}
					</small>
				</div>
				<span class="cn-federation-status__node-label">{{ statusLabel(node.status) }}</span>
			</li>
		</ul>
	</div>
</template>

<script>
// The canonical KPI scale (`--cn-kpi-*`) lives in one stylesheet. Imported
// here as well as from css/index.css so the tokens resolve even when the
// consuming app pulls in components individually.
import '../../css/kpi-card.css'
/**
 * CnFederationStatus — Federation-status widget for federated
 * directories. Renders an aggregate summary (`up` / `degraded` /
 * `down` / `unknown` counts) and a per-node list with status dot,
 * URL, last-checked timestamp, and click-emit for drilldown.
 *
 * Status values are normalised: `up` / `online` / `ok` map to `up`;
 * `degraded` / `partial` map to `degraded`; `down` / `offline` /
 * `error` map to `down`; anything else maps to `unknown`. Unknown
 * statuses are tolerated so consumers can ship without an
 * exhaustive enum.
 *
 * ```vue
 * <CnFederationStatus
 *   title="Federation directory"
 *   :nodes="[
 *     { id: 'a', name: 'Node A', url: 'https://a.example.org', status: 'up' },
 *     { id: 'b', name: 'Node B', url: 'https://b.example.org', status: 'degraded', message: 'High latency' },
 *     { id: 'c', name: 'Node C', url: 'https://c.example.org', status: 'down', lastChecked: '2026-05-20T11:00:00Z' },
 *   ]"
 *   @node-click="openNodeDetail" />
 * ```
 */
export default {
	name: 'CnFederationStatus',
	props: {
		/**
		 * Federation nodes to render. Each entry:
		 * `{ id?, name?, url?, status, message?, lastChecked? }`.
		 * Either `id` or `name` is required for the v-for key.
		 *
		 * @type {Array<{id?:string,name?:string,url?:string,status:string,message?:string,lastChecked?:string}>}
		 */
		nodes: { type: Array, default: () => [] },
		/** Optional widget title rendered as `<h3>`. */
		title: { type: String, default: '' },
		/** Optional widget description rendered under the title. */
		description: { type: String, default: '' },
		/** Hide the aggregate summary row. */
		hideSummary: { type: Boolean, default: false },
		/** Label for the `up` summary chip. */
		upLabel: { type: String, default: 'up' },
		/** Label for the `degraded` summary chip. */
		degradedLabel: { type: String, default: 'degraded' },
		/** Label for the `down` summary chip. */
		downLabel: { type: String, default: 'down' },
		/** Label for the `unknown` summary chip. */
		unknownLabel: { type: String, default: 'unknown' },
		/** Empty-state text when `nodes[]` is empty. */
		emptyLabel: { type: String, default: 'No federation nodes registered.' },
		/** Label preceding the per-node last-checked timestamp. */
		lastCheckedLabel: { type: String, default: 'Last checked' },
		/**
		 * Sort key. `'status'` puts `down` first, then `degraded`,
		 * then `unknown`, then `up`. `'name'` sorts alphabetically.
		 * `'none'` keeps the input order.
		 *
		 * @type {'status'|'name'|'none'}
		 */
		sort: { type: String, default: 'status' },
	},
	emits: ['node-click'],
	computed: {
		/**
		 * Status counts across all nodes.
		 *
		 * @return {{up:number,degraded:number,down:number,unknown:number}}
		 */
		counts() {
			const out = { up: 0, degraded: 0, down: 0, unknown: 0 }
			for (const n of this.nodes) {
				const s = this.normaliseStatus(n.status)
				out[s] = (out[s] || 0) + 1
			}
			return out
		},
		/**
		 * Nodes sorted per the `sort` prop.
		 *
		 * @return {Array} The sorted nodes.
		 */
		sortedNodes() {
			if (this.sort === 'none') return this.nodes
			const arr = [...this.nodes]
			if (this.sort === 'name') {
				arr.sort((a, b) => (a.name || a.id || '').localeCompare(b.name || b.id || ''))
				return arr
			}
			const order = { down: 0, degraded: 1, unknown: 2, up: 3 }
			arr.sort((a, b) => {
				const sa = this.normaliseStatus(a.status)
				const sb = this.normaliseStatus(b.status)
				return (order[sa] - order[sb]) || (a.name || '').localeCompare(b.name || '')
			})
			return arr
		},
	},
	methods: {
		/**
		 * Map a free-form status string to the normalised
		 * `up | degraded | down | unknown` set.
		 *
		 * @param {string} status Raw status from the node.
		 * @return {'up'|'degraded'|'down'|'unknown'} Normalised.
		 */
		normaliseStatus(status) {
			const s = (status || '').toLowerCase()
			if (['up', 'online', 'ok', 'healthy', 'available'].includes(s)) return 'up'
			if (['degraded', 'partial', 'slow', 'warning'].includes(s)) return 'degraded'
			if (['down', 'offline', 'error', 'failed', 'unhealthy'].includes(s)) return 'down'
			return 'unknown'
		},
		/**
		 * Render-friendly label for a status value.
		 *
		 * @param {string} status Raw status.
		 * @return {string} The label to show in the per-node row.
		 */
		statusLabel(status) {
			const norm = this.normaliseStatus(status)
			if (norm === 'up') return this.upLabel
			if (norm === 'degraded') return this.degradedLabel
			if (norm === 'down') return this.downLabel
			return this.unknownLabel
		},
		/**
		 * Format an ISO timestamp into a short locale string.
		 *
		 * @param {string} iso ISO datetime string.
		 * @return {string} Locale-formatted timestamp, or the
		 *   original string if parsing fails.
		 */
		formatTimestamp(iso) {
			try {
				const d = new Date(iso)
				if (Number.isNaN(d.getTime())) return iso
				return d.toLocaleString()
			} catch (e) {
				return iso
			}
		},
		/**
		 * Forward a node click as a `@node-click` event.
		 *
		 * @param {object} node The clicked node.
		 * @return {void}
		 */
		onNodeClick(node) {
			/**
			 * @event node-click Emitted when the user clicks a
			 *   node row. Payload is the original node object.
			 * @type {object}
			 */
			this.$emit('node-click', node)
		},
	},
}
</script>

<style scoped>
/*
 * TWO densities on purpose, and only ONE of them is a KPI.
 *
 * The summary strip IS a KPI surface, so it uses the canonical inline KPI from
 * src/css/kpi-card.css — the card's number weight, its accent colours and its
 * label scale, one size down. Nothing about it is declared locally except the
 * dot.
 *
 * The per-node list is NOT, and forcing it into KPI cards would be a false
 * uniformity. A KPI tile answers "how many?" with one number a reader takes in
 * at a glance; a node row answers "which one, where, and when was it last
 * checked?" — a name, a URL, a message and a timestamp, four fields that only
 * make sense read line by line. Boxing each of those in a 2rem-number card
 * would show a directory of forty nodes as forty tiles with no number on them.
 * What the list DOES share is the vocabulary: the same status dot, in the same
 * accent colours, so the strip and the rows agree on what "degraded" looks
 * like.
 */

.cn-federation-status {
	display: flex;
	flex-direction: column;
	gap: var(--cn-kpi-stack-gap, 12px);
	padding: var(--cn-kpi-padding, 16px);
	border: 1px solid var(--color-border);
	border-radius: var(--cn-kpi-radius, 10px);
	background: var(--color-main-background);
}

.cn-federation-status__title {
	margin: 0;
	font-size: var(--cn-kpi-section-title-size, 14px);
	font-weight: var(--cn-kpi-title-weight, 600);
}

.cn-federation-status__description {
	margin: 4px 0 0;
	font-size: var(--cn-kpi-label-size, 13px);
	color: var(--cn-kpi-label-color, var(--color-text-maxcontrast));
}

.cn-federation-status__summary {
	display: flex;
	gap: var(--cn-kpi-grid-gap, 16px);
	flex-wrap: wrap;
	align-items: baseline;
}

/* Layout and typography come from `cn-kpi-inline`, which every summary item
   also carries. The only thing left to say here is that the dot sits on the
   text baseline rather than on the number's. */
.cn-federation-status__summary-item {
	align-items: center;
}

/* One dot rule, four colours, no repetition: each status modifier re-points
   the SAME accent token the inline KPI's number reads, so a dot can never be
   amber next to a red number. */
.cn-federation-status__dot {
	width: 10px;
	height: 10px;
	border-radius: 50%;
	display: inline-block;
	flex-shrink: 0;
	background: var(--cn-kpi-accent, var(--color-text-maxcontrast));
}

.cn-federation-status__dot--up {
	--cn-kpi-accent: var(--color-success);
}

.cn-federation-status__dot--degraded {
	--cn-kpi-accent: var(--color-warning);
}

.cn-federation-status__dot--down {
	--cn-kpi-accent: var(--color-error);
}

.cn-federation-status__dot--unknown {
	--cn-kpi-accent: var(--color-text-maxcontrast);
}

.cn-federation-status__empty {
	font-size: var(--cn-kpi-label-size, 13px);
	color: var(--cn-kpi-label-color, var(--color-text-maxcontrast));
	font-style: italic;
	text-align: center;
	margin: 16px 0;
}

.cn-federation-status__list {
	margin: 0;
	padding: 0;
	list-style: none;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-federation-status__node {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	padding: 8px 12px;
	border-radius: var(--border-radius);
	cursor: pointer;
	background: var(--color-background-hover);
}

.cn-federation-status__node:hover {
	background: var(--color-background-darker, var(--color-background-hover));
}

.cn-federation-status__node-dot {
	margin-top: 6px;
	flex-shrink: 0;
}

.cn-federation-status__node-body {
	display: flex;
	flex-direction: column;
	gap: 2px;
	flex: 1 1 auto;
	min-width: 0;
}

.cn-federation-status__node-name {
	font-size: var(--cn-kpi-title-size, 14px);
	font-weight: var(--cn-kpi-title-weight, 600);
}

.cn-federation-status__node-url {
	font-family: monospace;
	font-size: var(--cn-kpi-label-size, 13px);
	color: var(--cn-kpi-label-color, var(--color-text-maxcontrast));
}

.cn-federation-status__node-message {
	font-size: var(--cn-kpi-label-size, 13px);
	color: var(--cn-kpi-label-color, var(--color-text-maxcontrast));
}

.cn-federation-status__node-checked {
	font-size: var(--cn-kpi-label-size, 13px);
	color: var(--cn-kpi-label-color, var(--color-text-maxcontrast));
}

.cn-federation-status__node-label {
	font-size: var(--cn-kpi-label-size, 13px);
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--cn-kpi-label-color, var(--color-text-maxcontrast));
	margin-top: 6px;
}
</style>
