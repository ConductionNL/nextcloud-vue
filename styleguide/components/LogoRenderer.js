const React = require('react')

// Read mutable state from globals set by setup.js — they bridge
// from the Vue mock into this React tree.
function getCurrentLang() {
	return (window.__nclLang) || 'en'
}

const LANGUAGES = [
	{ code: 'en', label: 'EN' },
	{ code: 'nl', label: 'NL' },
]

const HELP_TEXT = 'Switching language re-renders most components live. '
	+ 'A few components cache translated strings on creation and will only '
	+ 'update once you navigate to another page (or reload).'

function InfoIcon() {
	const [hover, setHover] = React.useState(false)

	const wrapperStyle = {
		position: 'relative',
		display: 'inline-flex',
		alignItems: 'center',
		marginLeft: 6,
	}

	const iconStyle = {
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		width: 16,
		height: 16,
		borderRadius: '50%',
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: '#888',
		color: '#555',
		fontSize: 11,
		fontWeight: 600,
		fontFamily: 'system-ui, sans-serif',
		cursor: 'help',
		userSelect: 'none',
		lineHeight: 1,
	}

	const tooltipStyle = {
		position: 'absolute',
		top: '100%',
		left: -110,
		marginTop: 6,
		width: 240,
		padding: '8px 10px',
		background: '#222',
		color: '#fff',
		fontSize: 12,
		lineHeight: 1.4,
		borderRadius: 4,
		boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
		zIndex: 10,
		pointerEvents: 'none',
		whiteSpace: 'normal',
	}

	return React.createElement(
		'span',
		{
			style: wrapperStyle,
			onMouseEnter: () => setHover(true),
			onMouseLeave: () => setHover(false),
		},
		React.createElement(
			'span',
			{
				style: iconStyle,
				'aria-label': HELP_TEXT,
				role: 'img',
			},
			'i',
		),
		hover && React.createElement('span', { style: tooltipStyle, role: 'tooltip' }, HELP_TEXT),
	)
}

function LanguageSwitcher() {
	const [current, setCurrent] = React.useState(getCurrentLang())

	const select = (code) => {
		if (code === current) return
		// switchLanguage is exposed by setup.js
		if (typeof window.switchLanguage === 'function') {
			window.switchLanguage(code)
		}
		setCurrent(code)
	}

	const baseBtn = {
		padding: '4px 10px',
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: '#d0d0d0',
		background: 'transparent',
		borderRadius: 4,
		cursor: 'pointer',
		fontSize: 13,
		color: '#222',
	}
	const activeBtn = {
		...baseBtn,
		background: '#00679e',
		borderColor: '#00679e',
		color: '#fff',
	}

	return React.createElement(
		'div',
		{ style: { display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8 } },
		...LANGUAGES.map(lang =>
			React.createElement(
				'button',
				{
					key: lang.code,
					onClick: () => select(lang.code),
					style: current === lang.code ? activeBtn : baseBtn,
					'aria-pressed': current === lang.code,
				},
				lang.label,
			),
		),
		React.createElement(InfoIcon),
	)
}

function LogoRenderer({ children }) {
	return React.createElement(
		'div',
		{
			style: {
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'flex-start',
				gap: 4,
			},
		},
		React.createElement(
			'h1',
			{ style: { margin: 0, fontSize: 18, fontWeight: 600, color: '#222' } },
			children,
		),
		React.createElement(LanguageSwitcher),
	)
}

module.exports = LogoRenderer