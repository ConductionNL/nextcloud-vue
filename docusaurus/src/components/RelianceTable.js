/**
 * RelianceTable: the OpenRegister reliance of every component, filterable by
 * tier and searchable by name, read from the JSON that
 * scripts/openregister-reliance.js generates before every docs build.
 *
 * It also shows where each component goes in the buildiq parity project,
 * nc-vue or Tables, in which ISO week, and whether it has a screenshot. That
 * comes from data/component-destinations.json, a copy of the project document
 * in ConductionNL/tables.
 *
 * Usage in MDX:
 *
 *     import RelianceTable from '@site/src/components/RelianceTable'
 *
 *     <RelianceTable />
 */

import Link from '@docusaurus/Link'
import React, { useMemo, useState } from 'react'
import reliance from '../../../docs/components/_generated/reliance.json'
import destinations from '../../data/component-destinations.json'

const TIERS = ['none', 'light', 'medium', 'heavy']
const DESTINATIONS = ['tables', 'nc-vue', 'none']
const WEEKS = Object.keys(destinations.weeks)

const DESTINATION_HELP = {
	tables: 'Goes to the Tables app, the open builder.',
	'nc-vue': 'Proposed to Nextcloud\'s own Vue library.',
	none: 'Dropped: an OpenRegister-only concept or out of scope.',
}

const TIER_HELP = {
	none: 'No OpenRegister reference, directly or through imports. Transfer candidates.',
	light: '1 to 3 references in total.',
	medium: '4 to 10 references in total.',
	heavy: '11 or more references in total.',
}

export default function RelianceTable() {
	const [tier, setTier] = useState('all')
	const [destination, setDestination] = useState('')
	const [week, setWeek] = useState('')
	const [screenshot, setScreenshot] = useState('')
	const [query, setQuery] = useState('')

	const rows = useMemo(() => Object.entries(reliance.components)
		.map(([name, entry]) => ({ name, ...entry, plan: destinations.components[name] || null }))
		.filter((row) => (tier === 'all' || row.tier === tier)
			&& (!destination || row.plan?.destination === destination)
			&& (!week || row.plan?.week === week)
			&& (!screenshot || row.plan?.screenshot === screenshot)
			&& row.name.toLowerCase().includes(query.trim().toLowerCase()))
		.sort((a, b) => (a.direct + a.transitive) - (b.direct + b.transitive) || a.name.localeCompare(b.name)), [tier, destination, week, screenshot, query])

	const counts = useMemo(() => Object.values(reliance.components).reduce((acc, entry) => ({ ...acc, [entry.tier]: (acc[entry.tier] || 0) + 1 }), {}), [])

	return (
		<div className="reliance-table">
			<div className="reliance-table__controls" role="group" aria-label="Filter components by OpenRegister reliance">
				{['all', ...TIERS].map((option) => (
					<button
						key={option}
						type="button"
						className={'button button--sm ' + (tier === option ? 'button--primary' : 'button--secondary')}
						aria-pressed={tier === option}
						title={TIER_HELP[option]}
						onClick={() => setTier(option)}
					>
						{option === 'all' ? `All (${Object.keys(reliance.components).length})` : `${option} (${counts[option] || 0})`}
					</button>
				))}
				<select aria-label="Filter by destination" value={destination} onChange={(event) => setDestination(event.target.value)}>
					<option value="">Every destination</option>
					{DESTINATIONS.map((option) => <option key={option} value={option}>{option}</option>)}
				</select>
				<select aria-label="Filter by week" value={week} onChange={(event) => setWeek(event.target.value)}>
					<option value="">Every week</option>
					{WEEKS.map((option) => <option key={option} value={option}>{`W${option}, ${destinations.weeks[option]}`}</option>)}
				</select>
				<select aria-label="Filter by screenshot" value={screenshot} onChange={(event) => setScreenshot(event.target.value)}>
					<option value="">Screenshot: any</option>
					<option value="captured">captured</option>
					<option value="needs an example">needs an example</option>
					<option value="not needed">not needed</option>
					<option value="example does not render">example does not render</option>
				</select>
				<input
					type="search"
					aria-label="Search components by name"
					placeholder="Search by name"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
				/>
			</div>
			{tier !== 'all' && <p className="reliance-table__help">{TIER_HELP[tier]}</p>}
			{destination && <p className="reliance-table__help">{DESTINATION_HELP[destination]}</p>}
			<table>
				<thead>
					<tr>
						<th>Component</th>
						<th>Tier</th>
						<th>Direct</th>
						<th>Through imports</th>
						<th>Via</th>
						<th>Destination</th>
						<th>Week</th>
						<th>Screenshot</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<tr key={row.name}>
							<td>{row.page ? <Link to={`/docs/components/${row.page}`}>{row.name}</Link> : row.name}</td>
							<td>{row.tier}</td>
							<td>{row.direct}</td>
							<td>{row.transitive}</td>
							<td>
								{row.via.slice(0, 4).join(', ')}
								{row.via.length > 4 ? ` and ${row.via.length - 4} more` : ''}
							</td>
							<td>{row.plan ? row.plan.destination : ''}</td>
							<td>{row.plan?.week ? `W${row.plan.week}` : ''}</td>
							<td>{row.plan ? row.plan.screenshot : ''}</td>
						</tr>
					))}
				</tbody>
			</table>
			{rows.length === 0 && <p>No component matches.</p>}
		</div>
	)
}
