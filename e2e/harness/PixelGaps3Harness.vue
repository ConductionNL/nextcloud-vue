<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  Layout facts from the Zuiddrecht pixel-gap round 3 that only a real browser
  can measure (?pixgaps3=greeting|bar|header|kicker|nav). `&plain=1` mounts the
  same surface without the round-3 key, as the control. The stages labels run
  on StagesHarness (?stageswidget=1&variant=bars).
-->
<template>
	<div class="pixgaps3">
		<!-- A ground greeting with a view switch in a cell taller than it, as
		     on the dossiq dashboard (a 2-row grid cell). -->
		<div v-if="scenario === 'greeting'" class="pixgaps3__cell" data-testid="pixgaps3-greeting">
			<CnHeaderWidget :content="greeting" :now="now" />
		</div>

		<!-- A stacked bar in a dashboard card, which renders its widgets flush. -->
		<div v-else-if="scenario === 'bar'" class="pixgaps3__card" data-testid="pixgaps3-bar">
			<CnWidgetWrapper title="My cases per step" flush>
				<CnStackedBarWidget :content="bar" />
			</CnWidgetWrapper>
		</div>

		<!-- A detail header that holds a widget, with a long title. The markup
		     is CnDetailPage's own header classes; the claim is about
		     detail-page.css. -->
		<div
			v-else-if="scenario === 'header'"
			class="cn-detail-page__header cn-detail-page__header--card cn-detail-page__header--with-widget"
			data-testid="pixgaps3-header">
			<div class="cn-detail-page__header-left">
				<div class="cn-detail-page__header-text">
					<h2 class="cn-detail-page__title" data-testid="pixgaps3-title">
						Basislijn: Woo-verzoek windpark Noordzee over de aanleg, de vergunningen en de compensatie voor de visserij
					</h2>
				</div>
			</div>
			<div class="cn-detail-page__header-actions" data-testid="pixgaps3-actions">
				<button type="button">
					Generate document
				</button>
				<button type="button">
					Log contact
				</button>
				<button type="button">
					More
				</button>
			</div>
			<div class="cn-detail-page__header-widget">
				<div class="pixgaps3__stages" />
			</div>
		</div>

		<!-- The next-step card in a 15px context, as on a Nextcloud page. -->
		<div v-else-if="scenario === 'kicker'" class="pixgaps3__kicker" data-testid="pixgaps3-kicker">
			<CnNextStepCard
				title="What now? Handle the case"
				:items="[{ label: 'Choose a handler' }, { label: 'Complete the case details', done: true }]"
				actionLabel="Next step" />
		</div>

		<!-- LpStart: the emblem beside the greeting, an agenda without the
		     calendar's chrome, and a tile with a second caption line. -->
		<div v-else-if="scenario === 'lpstart'" class="pixgaps3__lp" data-testid="pixgaps3-lpstart">
			<CnHeaderWidget :content="lpGreeting" :now="now" />
			<div class="pixgaps3__lp-row">
				<div class="pixgaps3__lp-tile">
					<CnStatWidget :content="lpTile" />
				</div>
				<div class="pixgaps3__lp-cal">
					<CnCalendarWidget :content="lpCalendar" />
				</div>
			</div>
		</div>

		<!-- decidiq's counters as stacked stats blocks. -->
		<div v-else-if="scenario === 'stats'" class="pixgaps3__stats" data-testid="pixgaps3-stats">
			<CnStatsBlock
				v-for="tile in statTiles"
				:key="tile.title"
				:title="tile.title"
				:count="tile.count"
				countLabel="decisions"
				:layout="plain ? '' : 'stacked'"
				:showZeroCount="true" />
		</div>

		<!-- The case page breadcrumb: the case number after a slash. -->
		<div v-else-if="scenario === 'crumbs'" class="pixgaps3__crumbs" data-testid="pixgaps3-crumbs">
			<CnBreadcrumbs
				:crumbs="[{ label: 'All cases', href: '#cases' }, { label: plain ? 'Lighting Lindelaan' : '2026-0082' }]"
				rootText
				:separator="plain ? '' : '/'" />
		</div>

		<!-- The case list header and its first rows. -->
		<div v-else-if="scenario === 'index'" class="pixgaps3__index" data-testid="pixgaps3-index">
			<CnIndexPage
				title="All cases"
				:schema="indexSchema"
				:objects="indexRows"
				:columns="indexColumns"
				:pagination="{ total: 48, page: 1, limit: 20, pages: 3 }"
				showTitle
				countSubtitle="{total} open cases in your teams"
				:showTitleIcon="plain"
				:showCount="plain"
				:headerButtons="plain ? [] : [{ label: 'Export', action: 'export' }, { label: 'New case', action: 'add', variant: 'primary' }]"
				:allowSavedViews="false"
				:viewModes="['table']" />
		</div>

		<!-- dossiq's case entries: two share the Cases route. -->
		<div v-else-if="scenario === 'nav'" class="pixgaps3__nav" data-testid="pixgaps3-nav">
			<CnAppNav :manifest="navManifest" :translate="(key) => key" />
		</div>
	</div>
</template>

<script>
import CnAppNav from '../../src/components/CnAppNav/CnAppNav.vue'
import CnBreadcrumbs from '../../src/components/CnBreadcrumbs/CnBreadcrumbs.vue'
import CnCalendarWidget from '../../src/components/CnCalendarWidget/CnCalendarWidget.vue'
import CnHeaderWidget from '../../src/components/CnHeaderWidget/CnHeaderWidget.vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import CnNextStepCard from '../../src/components/CnNextStepCard/CnNextStepCard.vue'
import CnStackedBarWidget from '../../src/components/CnStackedBarWidget/CnStackedBarWidget.vue'
import CnStatsBlock from '../../src/components/CnStatsBlock/CnStatsBlock.vue'
import CnStatWidget from '../../src/components/CnStatWidget/CnStatWidget.vue'
import CnWidgetWrapper from '../../src/components/CnWidgetWrapper/CnWidgetWrapper.vue'

import '../../src/css/actions-bar.css'
import '../../src/css/detail-page.css'
import '../../src/css/index-page.css'
import '../../src/css/kpi-card.css'
import '../../src/css/page-header.css'

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()

export default {
	name: 'PixelGaps3Harness',

	components: { CnAppNav, CnCalendarWidget, CnStatWidget, CnBreadcrumbs, CnIndexPage, CnHeaderWidget, CnNextStepCard, CnStackedBarWidget, CnStatsBlock, CnWidgetWrapper },

	data() {
		const plain = params.get('plain') === '1'
		return {
			plain,
			lpGreeting: { greeting: true, showDate: true, ground: true, ...(plain ? {} : { emblem: true }) },
			lpTile: { label: 'dossiq · Cases', value: 14, caption: 'open cases', layout: 'stacked', ...(plain ? {} : { note: '3 deadlines this week', noteVariant: 'danger' }) },
			lpCalendar: { viewMode: 'agenda', ...(plain ? {} : { showTitle: false, showViewModes: false }) },
			statTiles: [{ title: 'Proposals under way', count: 7 }, { title: 'Waiting for my initials', count: 2 }, { title: 'Meetings this week', count: 2 }],
			indexSchema: { title: 'Case', icon: 'FolderAccountOutline', properties: { title: { type: 'string', title: 'Case' }, caseType: { type: 'string', title: 'Type' } } },
			indexColumns: [{ key: 'title', label: 'Case', secondary: '{identifier} · {requester}' }, { key: 'caseType', label: 'Type' }],
			indexRows: [
				{ id: '1', title: 'Parking permits city centre', identifier: '2026-0061', requester: 'M. de Graaf', caseType: 'Woo request' },
				{ id: '2', title: 'Shed Molenweg 3', identifier: '2026-0002', requester: '', caseType: 'Permit' },
			],

			scenario: params.get('pixgaps3') || 'greeting',
			now: new Date('2026-10-05T14:00:00'),
			greeting: {
				greeting: true,
				showDate: true,
				ground: !plain,
				plain,
				...(plain ? {} : { kicker: 'Customer contact' }),
				views: { options: [{ label: 'My work', route: 'Dashboard' }, { label: 'My team', route: 'Queue' }] },
			},

			bar: {
				segments: [
					{ key: 'received', label: 'Received', value: 3 },
					{ key: 'handling', label: 'In handling', value: 6 },
					{ key: 'decision', label: 'Decision', value: 3 },
					{ key: 'publish', label: 'Publish', value: 2 },
				],

				...(plain ? {} : { inset: true }),
			},

			navManifest: {
				version: '1.0.0',
				pages: [],
				menu: [
					{ id: 'dashboard', label: 'Dashboard', route: 'Dashboard', order: 1 },
					{ id: 'cases', label: 'All cases', route: 'Cases', order: 2 },
					{ id: 'board', label: 'Board', route: 'Board', order: 3 },
					{ id: 'woo', label: 'Woo requests', route: 'Cases', query: { caseType: 'woo' }, order: 4 },
				],
			},
		}
	},
}
</script>

<style scoped>
.pixgaps3 {
	width: 1100px;
	font-size: 15px;
}

.pixgaps3__cell {
	height: 200px;
}

.pixgaps3__card {
	width: 732px;
	border: 1px solid #e4e6ea;
}

.pixgaps3__stages {
	height: 40px;
}

.pixgaps3__lp {
	--nldesign-emblem-url: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 52'%3E%3Cpath d='M2 2h36v30c0 10-9 16-18 18C11 48 2 42 2 32z' fill='%23c00'/%3E%3C/svg%3E");
}

.pixgaps3__lp-row {
	display: flex;
	gap: 16px;
	margin-top: 28px;
}

.pixgaps3__lp-tile,
.pixgaps3__lp-cal {
	flex: 1;
	padding: 20px;
	border: 1px solid #e4e6ea;
	border-radius: 12px;
}

.pixgaps3__stats {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 16px;
}

.pixgaps3__stats > * {
	border: 1px solid #e4e6ea;
	border-radius: 12px;
}

.pixgaps3__index {
	height: 420px;
	background: #f5f6f8;
}

.pixgaps3__nav {
	display: flex;
	height: 600px;
}
</style>
