/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * semanticIcons — the fleet-wide semantic icon vocabulary (ADR-077).
 *
 * One concept, one icon. A manifest `icon` field holds an MDI PascalCase name;
 * this table is what makes the same concept read the same way in every
 * Conduction app (Store is always StoreOutline, Dashboard is always
 * ViewDashboardOutline). The mapping is a BIJECTION — no concept has two
 * icons and no icon serves two concepts — which is what stops the historical
 * overloading (one glyph standing for 18 unrelated things).
 *
 * Tier A is universal chrome every app has and MUST match. Tier B is the
 * shared domain vocabulary an app SHOULD use when it has the concept.
 *
 * WHY THIS IS A PURE EXPORT AND NOT AN import-time `registerIcons()` CALL:
 * the published dist's `sideEffects` allowlist has previously tree-shaken
 * import-time side effects out of consumer bundles, which fails SILENTLY
 * (nothing renders, no error). So the rendering components import
 * {@link SEMANTIC_ICON_COMPONENTS} and consult it directly — resolution is
 * guaranteed by the component that needs it, with no side-effect ordering to
 * get wrong and nothing for a bundler to drop.
 *
 * Every name below is verified to exist in `vue-material-design-icons` by
 * tests/components/semanticIcons.spec.js — the check that caught invented
 * names like `LedgerOutline` and `FileSignOutline` already live in manifests.
 *
 * Each icon is imported individually (no wildcard / barrel) so the bundle
 * stays tree-shake-friendly.
 *
 * @spec exclude the vocabulary decision (ADR-077) has no spec in this repository
 */

import { mdiIcon } from './mdiIcon.js'

const AccountArrowRightOutlineIcon = mdiIcon('AccountArrowRightOutline')
const AccountBoxOutlineIcon = mdiIcon('AccountBoxOutline')
const AccountGroupOutlineIcon = mdiIcon('AccountGroupOutline')
const AccountKeyOutlineIcon = mdiIcon('AccountKeyOutline')
const AccountMinusOutlineIcon = mdiIcon('AccountMinusOutline')
const AccountMultipleOutlineIcon = mdiIcon('AccountMultipleOutline')
const AccountOutlineIcon = mdiIcon('AccountOutline')
const AccountPlusOutlineIcon = mdiIcon('AccountPlusOutline')
const AccountSchoolOutlineIcon = mdiIcon('AccountSchoolOutline')
const AccountSearchOutlineIcon = mdiIcon('AccountSearchOutline')
const AccountStarOutlineIcon = mdiIcon('AccountStarOutline')
const AccountSwitchOutlineIcon = mdiIcon('AccountSwitchOutline')
const AccountTieOutlineIcon = mdiIcon('AccountTieOutline')
const AlertCircleOutlineIcon = mdiIcon('AlertCircleOutline')
const ApiIcon = mdiIcon('Api')
const ApplicationOutlineIcon = mdiIcon('ApplicationOutline')
const BankOutlineIcon = mdiIcon('BankOutline')
const BankTransferIcon = mdiIcon('BankTransfer')
const BellOutlineIcon = mdiIcon('BellOutline')
const BookOpenPageVariantOutlineIcon = mdiIcon('BookOpenPageVariantOutline')
const BookOpenVariantOutlineIcon = mdiIcon('BookOpenVariantOutline')
const BookshelfIcon = mdiIcon('Bookshelf')
const BrainIcon = mdiIcon('Brain')
const BriefcaseOutlineIcon = mdiIcon('BriefcaseOutline')
const CalculatorVariantOutlineIcon = mdiIcon('CalculatorVariantOutline')
const CalendarAccountOutlineIcon = mdiIcon('CalendarAccountOutline')
const CalendarClockOutlineIcon = mdiIcon('CalendarClockOutline')
const CalendarOutlineIcon = mdiIcon('CalendarOutline')
const CalendarPlusOutlineIcon = mdiIcon('CalendarPlusOutline')
const CalendarRemoveOutlineIcon = mdiIcon('CalendarRemoveOutline')
const CalendarTextOutlineIcon = mdiIcon('CalendarTextOutline')
const CalendarWeekendOutlineIcon = mdiIcon('CalendarWeekendOutline')
const CarOutlineIcon = mdiIcon('CarOutline')
const CartArrowDownIcon = mdiIcon('CartArrowDown')
const CartOutlineIcon = mdiIcon('CartOutline')
const CashSyncIcon = mdiIcon('CashSync')
const CertificateOutlineIcon = mdiIcon('CertificateOutline')
const ChartBarIcon = mdiIcon('ChartBar')
const ChartBoxOutlineIcon = mdiIcon('ChartBoxOutline')
const ChartLineVariantIcon = mdiIcon('ChartLineVariant')
const ChartSankeyIcon = mdiIcon('ChartSankey')
const ChartTimelineVariantIcon = mdiIcon('ChartTimelineVariant')
const CheckboxMarkedCircleOutlineIcon = mdiIcon('CheckboxMarkedCircleOutline')
const CheckCircleOutlineIcon = mdiIcon('CheckCircleOutline')
const CheckDecagramOutlineIcon = mdiIcon('CheckDecagramOutline')
const ClipboardAccountOutlineIcon = mdiIcon('ClipboardAccountOutline')
const ClipboardCheckOutlineIcon = mdiIcon('ClipboardCheckOutline')
const ClipboardListOutlineIcon = mdiIcon('ClipboardListOutline')
const ClipboardPulseOutlineIcon = mdiIcon('ClipboardPulseOutline')
const ClipboardTextOutlineIcon = mdiIcon('ClipboardTextOutline')
const ClockAlertOutlineIcon = mdiIcon('ClockAlertOutline')
const ClockCheckOutlineIcon = mdiIcon('ClockCheckOutline')
const ClockOutlineIcon = mdiIcon('ClockOutline')
const CloseCircleOutlineIcon = mdiIcon('CloseCircleOutline')
const CloudUploadOutlineIcon = mdiIcon('CloudUploadOutline')
const CogOutlineIcon = mdiIcon('CogOutline')
const CommentOutlineIcon = mdiIcon('CommentOutline')
const CommentQuestionOutlineIcon = mdiIcon('CommentQuestionOutline')
const ContentCopyIcon = mdiIcon('ContentCopy')
const ContentSaveIcon = mdiIcon('ContentSave')
const CreditCardOutlineIcon = mdiIcon('CreditCardOutline')
const CubeOutlineIcon = mdiIcon('CubeOutline')
const CurrencyEurIcon = mdiIcon('CurrencyEur')
const DatabaseArrowRightOutlineIcon = mdiIcon('DatabaseArrowRightOutline')
const DatabaseExportOutlineIcon = mdiIcon('DatabaseExportOutline')
const DatabaseImportOutlineIcon = mdiIcon('DatabaseImportOutline')
const DatabaseOutlineIcon = mdiIcon('DatabaseOutline')
const DeleteOutlineIcon = mdiIcon('DeleteOutline')
const DesktopTowerMonitorIcon = mdiIcon('DesktopTowerMonitor')
const DomainIcon = mdiIcon('Domain')
const DotsHorizontalIcon = mdiIcon('DotsHorizontal')
const DownloadIcon = mdiIcon('Download')
const EmailOutlineIcon = mdiIcon('EmailOutline')
const EyeOffOutlineIcon = mdiIcon('EyeOffOutline')
const EyeOutlineIcon = mdiIcon('EyeOutline')
const FileAlertOutlineIcon = mdiIcon('FileAlertOutline')
const FileChartOutlineIcon = mdiIcon('FileChartOutline')
const FileCheckOutlineIcon = mdiIcon('FileCheckOutline')
const FileDocumentMultipleOutlineIcon = mdiIcon('FileDocumentMultipleOutline')
const FileDocumentOutlineIcon = mdiIcon('FileDocumentOutline')
const FileLockOutlineIcon = mdiIcon('FileLockOutline')
const FileReplaceOutlineIcon = mdiIcon('FileReplaceOutline')
const FileSignIcon = mdiIcon('FileSign')
const FileTreeOutlineIcon = mdiIcon('FileTreeOutline')
const FilterVariantIcon = mdiIcon('FilterVariant')
const FolderAccountOutlineIcon = mdiIcon('FolderAccountOutline')
const FolderCogOutlineIcon = mdiIcon('FolderCogOutline')
const FolderOutlineIcon = mdiIcon('FolderOutline')
const FormatListChecksIcon = mdiIcon('FormatListChecks')
const ForumOutlineIcon = mdiIcon('ForumOutline')
const GaugeIcon = mdiIcon('Gauge')
const GavelIcon = mdiIcon('Gavel')
const HandHeartOutlineIcon = mdiIcon('HandHeartOutline')
const HandshakeOutlineIcon = mdiIcon('HandshakeOutline')
const HistoryIcon = mdiIcon('History')
const ImageOutlineIcon = mdiIcon('ImageOutline')
const InboxOutlineIcon = mdiIcon('InboxOutline')
const InformationOutlineIcon = mdiIcon('InformationOutline')
const KeyOutlineIcon = mdiIcon('KeyOutline')
const LayersOutlineIcon = mdiIcon('LayersOutline')
const LinkVariantIcon = mdiIcon('LinkVariant')
const LockOutlineIcon = mdiIcon('LockOutline')
const MagnifyIcon = mdiIcon('Magnify')
const MapMarkerOutlineIcon = mdiIcon('MapMarkerOutline')
const MapMarkerPathIcon = mdiIcon('MapMarkerPath')
const MapOutlineIcon = mdiIcon('MapOutline')
const MedalOutlineIcon = mdiIcon('MedalOutline')
const MessageTextOutlineIcon = mdiIcon('MessageTextOutline')
const NotebookOutlineIcon = mdiIcon('NotebookOutline')
const OfficeBuildingOutlineIcon = mdiIcon('OfficeBuildingOutline')
const OpenInNewIcon = mdiIcon('OpenInNew')
const PackageVariantClosedIcon = mdiIcon('PackageVariantClosed')
const PaperclipIcon = mdiIcon('Paperclip')
const PencilOutlineIcon = mdiIcon('PencilOutline')
const PercentOutlineIcon = mdiIcon('PercentOutline')
const PlayCircleOutlineIcon = mdiIcon('PlayCircleOutline')
const PlayOutlineIcon = mdiIcon('PlayOutline')
const PlusIcon = mdiIcon('Plus')
const PrinterOutlineIcon = mdiIcon('PrinterOutline')
const PulseIcon = mdiIcon('Pulse')
const PuzzleOutlineIcon = mdiIcon('PuzzleOutline')
const ReceiptOutlineIcon = mdiIcon('ReceiptOutline')
const ReceiptTextOutlineIcon = mdiIcon('ReceiptTextOutline')
const RefreshIcon = mdiIcon('Refresh')
const RobotOutlineIcon = mdiIcon('RobotOutline')
const ScaleBalanceIcon = mdiIcon('ScaleBalance')
const SchoolOutlineIcon = mdiIcon('SchoolOutline')
const ShareVariantOutlineIcon = mdiIcon('ShareVariantOutline')
const ShieldAccountOutlineIcon = mdiIcon('ShieldAccountOutline')
const ShieldAlertOutlineIcon = mdiIcon('ShieldAlertOutline')
const ShieldCheckOutlineIcon = mdiIcon('ShieldCheckOutline')
const ShieldCrownOutlineIcon = mdiIcon('ShieldCrownOutline')
const ShieldKeyOutlineIcon = mdiIcon('ShieldKeyOutline')
const ShieldLockOutlineIcon = mdiIcon('ShieldLockOutline')
const ShieldOutlineIcon = mdiIcon('ShieldOutline')
const SignatureFreehandIcon = mdiIcon('SignatureFreehand')
const SitemapOutlineIcon = mdiIcon('SitemapOutline')
const SourceBranchIcon = mdiIcon('SourceBranch')
const SpeedometerIcon = mdiIcon('Speedometer')
const StoreOutlineIcon = mdiIcon('StoreOutline')
const SwapHorizontalIcon = mdiIcon('SwapHorizontal')
const TableClockIcon = mdiIcon('TableClock')
const TagOutlineIcon = mdiIcon('TagOutline')
const TextBoxOutlineIcon = mdiIcon('TextBoxOutline')
const ToolboxOutlineIcon = mdiIcon('ToolboxOutline')
const TransitConnectionVariantIcon = mdiIcon('TransitConnectionVariant')
const TrayFullIcon = mdiIcon('TrayFull')
const TrendingUpIcon = mdiIcon('TrendingUp')
const UploadIcon = mdiIcon('Upload')
const VectorPolylinePlusIcon = mdiIcon('VectorPolylinePlus')
const ViewColumnOutlineIcon = mdiIcon('ViewColumnOutline')
const ViewDashboardOutlineIcon = mdiIcon('ViewDashboardOutline')
const ViewGridOutlineIcon = mdiIcon('ViewGridOutline')
const WarehouseIcon = mdiIcon('Warehouse')
const WebhookIcon = mdiIcon('Webhook')

/**
 * Tier A — universal chrome. An app that has the concept MUST use this icon.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const SEMANTIC_ICONS_TIER_A = Object.freeze({
	dashboard: 'ViewDashboardOutline',
	documentation: 'BookOpenVariantOutline',
	'features-roadmap': 'MapMarkerPath',
	settings: 'CogOutline',
	admin: 'ShieldAccountOutline',
	search: 'Magnify',
	store: 'StoreOutline',
	tutorial: 'PlayCircleOutline',
	about: 'InformationOutline',
	notifications: 'BellOutline',
	activity: 'Pulse',
	'audit-trail': 'History',
	'my-work': 'InboxOutline',
})

/**
 * Tier B — shared domain vocabulary. An app SHOULD use this icon when it has
 * the concept; a genuinely new concept is added here, never invented locally.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const SEMANTIC_ICONS_TIER_B = Object.freeze({
	// data & records
	data: 'DatabaseOutline',
	schema: 'FileTreeOutline',
	record: 'CubeOutline',
	'data-quality': 'ClipboardPulseOutline',
	import: 'DatabaseImportOutline',
	export: 'DatabaseExportOutline',
	migration: 'DatabaseArrowRightOutline',
	mapping: 'SwapHorizontal',
	log: 'TextBoxOutline',
	job: 'ClockOutline',
	// documents & files
	document: 'FileDocumentOutline',
	documents: 'FileDocumentMultipleOutline',
	folder: 'FolderOutline',
	template: 'FileReplaceOutline',
	catalogue: 'Bookshelf',
	signing: 'SignatureFreehand',
	contract: 'FileSign',
	correspondence: 'EmailOutline',
	attachment: 'Paperclip',
	// cases & process
	case: 'FolderAccountOutline',
	'case-type': 'FolderCogOutline',
	task: 'CheckboxMarkedCircleOutline',
	tasks: 'FormatListChecks',
	workflow: 'SitemapOutline',
	board: 'ViewColumnOutline',
	approval: 'CheckDecagramOutline',
	decision: 'Gavel',
	queue: 'TrayFull',
	deadline: 'ClockAlertOutline',
	objection: 'FileAlertOutline',
	appeal: 'ScaleBalance',
	// communication
	chat: 'MessageTextOutline',
	comment: 'CommentOutline',
	meeting: 'CalendarAccountOutline',
	agenda: 'CalendarTextOutline',
	appointment: 'CalendarClockOutline',
	calendar: 'CalendarOutline',
	consultation: 'CommentQuestionOutline',
	forum: 'ForumOutline',
	// people & organisations
	person: 'AccountOutline',
	people: 'AccountMultipleOutline',
	group: 'AccountGroupOutline',
	role: 'AccountKeyOutline',
	organisation: 'OfficeBuildingOutline',
	'organisation-unit': 'Domain',
	partner: 'HandshakeOutline',
	client: 'AccountStarOutline',
	employee: 'AccountTieOutline',
	lead: 'AccountArrowRightOutline',
	prospect: 'AccountSearchOutline',
	substitution: 'AccountSwitchOutline',
	// commerce & finance
	sales: 'CartOutline',
	purchasing: 'CartArrowDown',
	product: 'PackageVariantClosed',
	inventory: 'Warehouse',
	order: 'ClipboardListOutline',
	invoice: 'ReceiptTextOutline',
	payment: 'CreditCardOutline',
	payroll: 'CashSync',
	expense: 'ReceiptOutline',
	bank: 'BankOutline',
	'bank-transaction': 'BankTransfer',
	bookkeeping: 'NotebookOutline',
	tax: 'PercentOutline',
	budget: 'CalculatorVariantOutline',
	forecast: 'ChartTimelineVariant',
	revenue: 'CurrencyEur',
	pricing: 'TagOutline',
	subsidy: 'HandHeartOutline',
	// reporting & monitoring
	report: 'FileChartOutline',
	reporting: 'ChartBoxOutline',
	analytics: 'ChartLineVariant',
	kpi: 'Speedometer',
	monitoring: 'Gauge',
	statistics: 'ChartBar',
	'process-mining': 'ChartSankey',
	// security & compliance
	security: 'ShieldOutline',
	compliance: 'ClipboardCheckOutline',
	policy: 'ShieldCheckOutline',
	vulnerability: 'ShieldAlertOutline',
	certificate: 'CertificateOutline',
	vault: 'LockOutline',
	key: 'KeyOutline',
	authorization: 'ShieldKeyOutline',
	privacy: 'ShieldLockOutline',
	anonymization: 'EyeOffOutline',
	consent: 'FileCheckOutline',
	confidentiality: 'FileLockOutline',
	retention: 'CalendarRemoveOutline',
	governance: 'ShieldCrownOutline',
	// integration & technology
	integration: 'Api',
	connection: 'TransitConnectionVariant',
	webhook: 'Webhook',
	automation: 'VectorPolylinePlus',
	agent: 'RobotOutline',
	ai: 'Brain',
	tool: 'ToolboxOutline',
	apps: 'ViewGridOutline',
	module: 'PuzzleOutline',
	source: 'SourceBranch',
	// location & geo
	location: 'MapMarkerOutline',
	map: 'MapOutline',
	'map-layer': 'LayersOutline',
	// learning
	course: 'BookOpenPageVariantOutline',
	learning: 'SchoolOutline',
	competency: 'MedalOutline',
	timetable: 'TableClock',
	progress: 'TrendingUp',
	portfolio: 'BriefcaseOutline',
	exam: 'ClipboardTextOutline',
	student: 'AccountSchoolOutline',
	// Publish, Test connection).
	view: 'EyeOutline',
	create: 'Plus',
	edit: 'PencilOutline',
	delete: 'DeleteOutline',
	run: 'PlayOutline',
	test: 'CheckCircleOutline',
	upload: 'Upload',
	publish: 'CloudUploadOutline',
	download: 'Download',
	refresh: 'Refresh',
	'open-external': 'OpenInNew',
	copy: 'ContentCopy',
	share: 'ShareVariantOutline',
	filter: 'FilterVariant',
	print: 'PrinterOutline',
	image: 'ImageOutline',
	link: 'LinkVariant',
	more: 'DotsHorizontal',
	save: 'ContentSave',
	cancel: 'CloseCircleOutline',
	alert: 'AlertCircleOutline',
	// hr
	leave: 'CalendarWeekendOutline',
	hours: 'ClockCheckOutline',
	onboarding: 'AccountPlusOutline',
	offboarding: 'AccountMinusOutline',
	vacancy: 'AccountBoxOutline',
	asset: 'DesktopTowerMonitor',
	fleet: 'CarOutline',
})

/**
 * The whole vocabulary — concept slug to canonical MDI name.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const SEMANTIC_ICONS = Object.freeze({
	...SEMANTIC_ICONS_TIER_A,
	...SEMANTIC_ICONS_TIER_B,
})

/**
 * Which tier a concept belongs to — `'A'` (MUST) or `'B'` (SHOULD). Consumed by
 * hydra's icon-vocabulary gate to decide hard-fail vs warn.
 *
 * @type {Readonly<Record<string, 'A'|'B'>>}
 */
export const SEMANTIC_ICON_TIERS = Object.freeze(Object.fromEntries([
	...Object.keys(SEMANTIC_ICONS_TIER_A).map((c) => [c, 'A']),
	...Object.keys(SEMANTIC_ICONS_TIER_B).map((c) => [c, 'B']),
]))

/**
 * Canonical MDI name to its Vue component, for every icon in the vocabulary.
 * The rendering components consult this so an app never has to register a
 * vocabulary icon itself.
 *
 * @type {Readonly<Record<string, object>>}
 */
export const SEMANTIC_ICON_COMPONENTS = Object.freeze({
	AccountArrowRightOutline: AccountArrowRightOutlineIcon,
	AccountBoxOutline: AccountBoxOutlineIcon,
	AccountGroupOutline: AccountGroupOutlineIcon,
	AccountKeyOutline: AccountKeyOutlineIcon,
	AccountMinusOutline: AccountMinusOutlineIcon,
	AccountMultipleOutline: AccountMultipleOutlineIcon,
	AccountOutline: AccountOutlineIcon,
	AccountPlusOutline: AccountPlusOutlineIcon,
	AccountSchoolOutline: AccountSchoolOutlineIcon,
	AccountSearchOutline: AccountSearchOutlineIcon,
	AccountStarOutline: AccountStarOutlineIcon,
	AccountSwitchOutline: AccountSwitchOutlineIcon,
	AccountTieOutline: AccountTieOutlineIcon,
	AlertCircleOutline: AlertCircleOutlineIcon,
	Api: ApiIcon,
	ApplicationOutline: ApplicationOutlineIcon,
	BankOutline: BankOutlineIcon,
	BankTransfer: BankTransferIcon,
	BellOutline: BellOutlineIcon,
	BookOpenPageVariantOutline: BookOpenPageVariantOutlineIcon,
	BookOpenVariantOutline: BookOpenVariantOutlineIcon,
	Bookshelf: BookshelfIcon,
	Brain: BrainIcon,
	BriefcaseOutline: BriefcaseOutlineIcon,
	CalculatorVariantOutline: CalculatorVariantOutlineIcon,
	CalendarAccountOutline: CalendarAccountOutlineIcon,
	CalendarClockOutline: CalendarClockOutlineIcon,
	CalendarOutline: CalendarOutlineIcon,
	CalendarPlusOutline: CalendarPlusOutlineIcon,
	CalendarRemoveOutline: CalendarRemoveOutlineIcon,
	CalendarTextOutline: CalendarTextOutlineIcon,
	CalendarWeekendOutline: CalendarWeekendOutlineIcon,
	CarOutline: CarOutlineIcon,
	CartArrowDown: CartArrowDownIcon,
	CartOutline: CartOutlineIcon,
	CashSync: CashSyncIcon,
	CertificateOutline: CertificateOutlineIcon,
	ChartBar: ChartBarIcon,
	ChartBoxOutline: ChartBoxOutlineIcon,
	ChartLineVariant: ChartLineVariantIcon,
	ChartSankey: ChartSankeyIcon,
	ChartTimelineVariant: ChartTimelineVariantIcon,
	CheckCircleOutline: CheckCircleOutlineIcon,
	CheckDecagramOutline: CheckDecagramOutlineIcon,
	CheckboxMarkedCircleOutline: CheckboxMarkedCircleOutlineIcon,
	ClipboardAccountOutline: ClipboardAccountOutlineIcon,
	ClipboardCheckOutline: ClipboardCheckOutlineIcon,
	ClipboardListOutline: ClipboardListOutlineIcon,
	ClipboardPulseOutline: ClipboardPulseOutlineIcon,
	ClipboardTextOutline: ClipboardTextOutlineIcon,
	ClockAlertOutline: ClockAlertOutlineIcon,
	ClockCheckOutline: ClockCheckOutlineIcon,
	ClockOutline: ClockOutlineIcon,
	CloseCircleOutline: CloseCircleOutlineIcon,
	CloudUploadOutline: CloudUploadOutlineIcon,
	CogOutline: CogOutlineIcon,
	CommentOutline: CommentOutlineIcon,
	CommentQuestionOutline: CommentQuestionOutlineIcon,
	ContentCopy: ContentCopyIcon,
	ContentSave: ContentSaveIcon,
	CreditCardOutline: CreditCardOutlineIcon,
	CubeOutline: CubeOutlineIcon,
	CurrencyEur: CurrencyEurIcon,
	DatabaseArrowRightOutline: DatabaseArrowRightOutlineIcon,
	DatabaseExportOutline: DatabaseExportOutlineIcon,
	DatabaseImportOutline: DatabaseImportOutlineIcon,
	DatabaseOutline: DatabaseOutlineIcon,
	DeleteOutline: DeleteOutlineIcon,
	DesktopTowerMonitor: DesktopTowerMonitorIcon,
	Domain: DomainIcon,
	DotsHorizontal: DotsHorizontalIcon,
	Download: DownloadIcon,
	EmailOutline: EmailOutlineIcon,
	EyeOffOutline: EyeOffOutlineIcon,
	EyeOutline: EyeOutlineIcon,
	FileAlertOutline: FileAlertOutlineIcon,
	FileChartOutline: FileChartOutlineIcon,
	FileCheckOutline: FileCheckOutlineIcon,
	FileDocumentMultipleOutline: FileDocumentMultipleOutlineIcon,
	FileDocumentOutline: FileDocumentOutlineIcon,
	FileLockOutline: FileLockOutlineIcon,
	FileReplaceOutline: FileReplaceOutlineIcon,
	FileSign: FileSignIcon,
	FileTreeOutline: FileTreeOutlineIcon,
	FilterVariant: FilterVariantIcon,
	FolderAccountOutline: FolderAccountOutlineIcon,
	FolderCogOutline: FolderCogOutlineIcon,
	FolderOutline: FolderOutlineIcon,
	FormatListChecks: FormatListChecksIcon,
	ForumOutline: ForumOutlineIcon,
	Gauge: GaugeIcon,
	Gavel: GavelIcon,
	HandHeartOutline: HandHeartOutlineIcon,
	HandshakeOutline: HandshakeOutlineIcon,
	History: HistoryIcon,
	ImageOutline: ImageOutlineIcon,
	InboxOutline: InboxOutlineIcon,
	InformationOutline: InformationOutlineIcon,
	KeyOutline: KeyOutlineIcon,
	LayersOutline: LayersOutlineIcon,
	LinkVariant: LinkVariantIcon,
	LockOutline: LockOutlineIcon,
	Magnify: MagnifyIcon,
	MapMarkerOutline: MapMarkerOutlineIcon,
	MapMarkerPath: MapMarkerPathIcon,
	MapOutline: MapOutlineIcon,
	MedalOutline: MedalOutlineIcon,
	MessageTextOutline: MessageTextOutlineIcon,
	NotebookOutline: NotebookOutlineIcon,
	OfficeBuildingOutline: OfficeBuildingOutlineIcon,
	OpenInNew: OpenInNewIcon,
	PackageVariantClosed: PackageVariantClosedIcon,
	Paperclip: PaperclipIcon,
	PencilOutline: PencilOutlineIcon,
	PercentOutline: PercentOutlineIcon,
	PlayCircleOutline: PlayCircleOutlineIcon,
	PlayOutline: PlayOutlineIcon,
	Plus: PlusIcon,
	PrinterOutline: PrinterOutlineIcon,
	Pulse: PulseIcon,
	PuzzleOutline: PuzzleOutlineIcon,
	ReceiptOutline: ReceiptOutlineIcon,
	ReceiptTextOutline: ReceiptTextOutlineIcon,
	Refresh: RefreshIcon,
	RobotOutline: RobotOutlineIcon,
	ScaleBalance: ScaleBalanceIcon,
	SchoolOutline: SchoolOutlineIcon,
	ShareVariantOutline: ShareVariantOutlineIcon,
	ShieldAccountOutline: ShieldAccountOutlineIcon,
	ShieldAlertOutline: ShieldAlertOutlineIcon,
	ShieldCheckOutline: ShieldCheckOutlineIcon,
	ShieldCrownOutline: ShieldCrownOutlineIcon,
	ShieldKeyOutline: ShieldKeyOutlineIcon,
	ShieldLockOutline: ShieldLockOutlineIcon,
	ShieldOutline: ShieldOutlineIcon,
	SignatureFreehand: SignatureFreehandIcon,
	SitemapOutline: SitemapOutlineIcon,
	SourceBranch: SourceBranchIcon,
	Speedometer: SpeedometerIcon,
	StoreOutline: StoreOutlineIcon,
	SwapHorizontal: SwapHorizontalIcon,
	TableClock: TableClockIcon,
	TagOutline: TagOutlineIcon,
	TextBoxOutline: TextBoxOutlineIcon,
	ToolboxOutline: ToolboxOutlineIcon,
	TransitConnectionVariant: TransitConnectionVariantIcon,
	TrayFull: TrayFullIcon,
	TrendingUp: TrendingUpIcon,
	Upload: UploadIcon,
	VectorPolylinePlus: VectorPolylinePlusIcon,
	ViewColumnOutline: ViewColumnOutlineIcon,
	ViewDashboardOutline: ViewDashboardOutlineIcon,
	ViewGridOutline: ViewGridOutlineIcon,
	Warehouse: WarehouseIcon,
	Webhook: WebhookIcon,
})

/**
 * Reverse lookup — the concept a canonical icon name stands for.
 *
 * @param {string} name Canonical MDI icon name.
 * @return {string|null} The concept slug, or null when the name is not in the
 *   vocabulary.
 */
export function conceptForIcon(name) {
	for (const [concept, icon] of Object.entries(SEMANTIC_ICONS)) {
		if (icon === name) {
			return concept
		}
	}
	return null
}

/**
 * Resolve a vocabulary icon name to its component.
 *
 * @param {string|null|undefined} name Canonical MDI icon name.
 * @return {object|null} The Vue component, or null when not in the vocabulary.
 */
export function getSemanticIconComponent(name) {
	if (typeof name !== 'string' || name.length === 0) {
		return null
	}
	return SEMANTIC_ICON_COMPONENTS[name] ?? null
}
