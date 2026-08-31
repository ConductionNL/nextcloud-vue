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
 * @spec openspec/architecture/adr-077-semantic-icon-vocabulary.md
 */

import AccountArrowRightOutlineIcon from 'vue-material-design-icons/AccountArrowRightOutline.vue'
import AccountBoxOutlineIcon from 'vue-material-design-icons/AccountBoxOutline.vue'
import AccountGroupOutlineIcon from 'vue-material-design-icons/AccountGroupOutline.vue'
import AccountKeyOutlineIcon from 'vue-material-design-icons/AccountKeyOutline.vue'
import AccountMinusOutlineIcon from 'vue-material-design-icons/AccountMinusOutline.vue'
import AccountMultipleOutlineIcon from 'vue-material-design-icons/AccountMultipleOutline.vue'
import AccountOutlineIcon from 'vue-material-design-icons/AccountOutline.vue'
import AccountPlusOutlineIcon from 'vue-material-design-icons/AccountPlusOutline.vue'
import AccountSchoolOutlineIcon from 'vue-material-design-icons/AccountSchoolOutline.vue'
import AccountSearchOutlineIcon from 'vue-material-design-icons/AccountSearchOutline.vue'
import AccountStarOutlineIcon from 'vue-material-design-icons/AccountStarOutline.vue'
import AccountSwitchOutlineIcon from 'vue-material-design-icons/AccountSwitchOutline.vue'
import AccountTieOutlineIcon from 'vue-material-design-icons/AccountTieOutline.vue'
import AlertCircleOutlineIcon from 'vue-material-design-icons/AlertCircleOutline.vue'
import ApiIcon from 'vue-material-design-icons/Api.vue'
import ApplicationOutlineIcon from 'vue-material-design-icons/ApplicationOutline.vue'
import BankOutlineIcon from 'vue-material-design-icons/BankOutline.vue'
import BankTransferIcon from 'vue-material-design-icons/BankTransfer.vue'
import BellOutlineIcon from 'vue-material-design-icons/BellOutline.vue'
import BookOpenPageVariantOutlineIcon from 'vue-material-design-icons/BookOpenPageVariantOutline.vue'
import BookOpenVariantOutlineIcon from 'vue-material-design-icons/BookOpenVariantOutline.vue'
import BookshelfIcon from 'vue-material-design-icons/Bookshelf.vue'
import BrainIcon from 'vue-material-design-icons/Brain.vue'
import BriefcaseOutlineIcon from 'vue-material-design-icons/BriefcaseOutline.vue'
import CalculatorVariantOutlineIcon from 'vue-material-design-icons/CalculatorVariantOutline.vue'
import CalendarAccountOutlineIcon from 'vue-material-design-icons/CalendarAccountOutline.vue'
import CalendarClockOutlineIcon from 'vue-material-design-icons/CalendarClockOutline.vue'
import CalendarOutlineIcon from 'vue-material-design-icons/CalendarOutline.vue'
import CalendarRemoveOutlineIcon from 'vue-material-design-icons/CalendarRemoveOutline.vue'
import CalendarTextOutlineIcon from 'vue-material-design-icons/CalendarTextOutline.vue'
import CalendarWeekendOutlineIcon from 'vue-material-design-icons/CalendarWeekendOutline.vue'
import CarOutlineIcon from 'vue-material-design-icons/CarOutline.vue'
import CartArrowDownIcon from 'vue-material-design-icons/CartArrowDown.vue'
import CartOutlineIcon from 'vue-material-design-icons/CartOutline.vue'
import CashSyncIcon from 'vue-material-design-icons/CashSync.vue'
import CertificateOutlineIcon from 'vue-material-design-icons/CertificateOutline.vue'
import ChartBarIcon from 'vue-material-design-icons/ChartBar.vue'
import ChartBoxOutlineIcon from 'vue-material-design-icons/ChartBoxOutline.vue'
import ChartLineVariantIcon from 'vue-material-design-icons/ChartLineVariant.vue'
import ChartSankeyIcon from 'vue-material-design-icons/ChartSankey.vue'
import ChartTimelineVariantIcon from 'vue-material-design-icons/ChartTimelineVariant.vue'
import CheckCircleOutlineIcon from 'vue-material-design-icons/CheckCircleOutline.vue'
import CheckDecagramOutlineIcon from 'vue-material-design-icons/CheckDecagramOutline.vue'
import CheckboxMarkedCircleOutlineIcon from 'vue-material-design-icons/CheckboxMarkedCircleOutline.vue'
import ClipboardAccountOutlineIcon from 'vue-material-design-icons/ClipboardAccountOutline.vue'
import ClipboardCheckOutlineIcon from 'vue-material-design-icons/ClipboardCheckOutline.vue'
import ClipboardListOutlineIcon from 'vue-material-design-icons/ClipboardListOutline.vue'
import ClipboardPulseOutlineIcon from 'vue-material-design-icons/ClipboardPulseOutline.vue'
import ClipboardTextOutlineIcon from 'vue-material-design-icons/ClipboardTextOutline.vue'
import ClockAlertOutlineIcon from 'vue-material-design-icons/ClockAlertOutline.vue'
import ClockCheckOutlineIcon from 'vue-material-design-icons/ClockCheckOutline.vue'
import ClockOutlineIcon from 'vue-material-design-icons/ClockOutline.vue'
import CloseCircleOutlineIcon from 'vue-material-design-icons/CloseCircleOutline.vue'
import CloudUploadOutlineIcon from 'vue-material-design-icons/CloudUploadOutline.vue'
import CogOutlineIcon from 'vue-material-design-icons/CogOutline.vue'
import CommentOutlineIcon from 'vue-material-design-icons/CommentOutline.vue'
import CommentQuestionOutlineIcon from 'vue-material-design-icons/CommentQuestionOutline.vue'
import ContentCopyIcon from 'vue-material-design-icons/ContentCopy.vue'
import ContentSaveIcon from 'vue-material-design-icons/ContentSave.vue'
import CreditCardOutlineIcon from 'vue-material-design-icons/CreditCardOutline.vue'
import CubeOutlineIcon from 'vue-material-design-icons/CubeOutline.vue'
import CurrencyEurIcon from 'vue-material-design-icons/CurrencyEur.vue'
import DatabaseArrowRightOutlineIcon from 'vue-material-design-icons/DatabaseArrowRightOutline.vue'
import DatabaseExportOutlineIcon from 'vue-material-design-icons/DatabaseExportOutline.vue'
import DatabaseImportOutlineIcon from 'vue-material-design-icons/DatabaseImportOutline.vue'
import DatabaseOutlineIcon from 'vue-material-design-icons/DatabaseOutline.vue'
import DeleteOutlineIcon from 'vue-material-design-icons/DeleteOutline.vue'
import DesktopTowerMonitorIcon from 'vue-material-design-icons/DesktopTowerMonitor.vue'
import DomainIcon from 'vue-material-design-icons/Domain.vue'
import DotsHorizontalIcon from 'vue-material-design-icons/DotsHorizontal.vue'
import DownloadIcon from 'vue-material-design-icons/Download.vue'
import EmailOutlineIcon from 'vue-material-design-icons/EmailOutline.vue'
import EyeOffOutlineIcon from 'vue-material-design-icons/EyeOffOutline.vue'
import EyeOutlineIcon from 'vue-material-design-icons/EyeOutline.vue'
import FileAlertOutlineIcon from 'vue-material-design-icons/FileAlertOutline.vue'
import FileChartOutlineIcon from 'vue-material-design-icons/FileChartOutline.vue'
import FileCheckOutlineIcon from 'vue-material-design-icons/FileCheckOutline.vue'
import FileDocumentMultipleOutlineIcon from 'vue-material-design-icons/FileDocumentMultipleOutline.vue'
import FileDocumentOutlineIcon from 'vue-material-design-icons/FileDocumentOutline.vue'
import FileLockOutlineIcon from 'vue-material-design-icons/FileLockOutline.vue'
import FileReplaceOutlineIcon from 'vue-material-design-icons/FileReplaceOutline.vue'
import FileSignIcon from 'vue-material-design-icons/FileSign.vue'
import FileTreeOutlineIcon from 'vue-material-design-icons/FileTreeOutline.vue'
import FilterVariantIcon from 'vue-material-design-icons/FilterVariant.vue'
import FolderAccountOutlineIcon from 'vue-material-design-icons/FolderAccountOutline.vue'
import FolderCogOutlineIcon from 'vue-material-design-icons/FolderCogOutline.vue'
import FolderOutlineIcon from 'vue-material-design-icons/FolderOutline.vue'
import FormatListChecksIcon from 'vue-material-design-icons/FormatListChecks.vue'
import ForumOutlineIcon from 'vue-material-design-icons/ForumOutline.vue'
import GaugeIcon from 'vue-material-design-icons/Gauge.vue'
import GavelIcon from 'vue-material-design-icons/Gavel.vue'
import HandHeartOutlineIcon from 'vue-material-design-icons/HandHeartOutline.vue'
import HandshakeOutlineIcon from 'vue-material-design-icons/HandshakeOutline.vue'
import HistoryIcon from 'vue-material-design-icons/History.vue'
import ImageOutlineIcon from 'vue-material-design-icons/ImageOutline.vue'
import InformationOutlineIcon from 'vue-material-design-icons/InformationOutline.vue'
import KeyOutlineIcon from 'vue-material-design-icons/KeyOutline.vue'
import LayersOutlineIcon from 'vue-material-design-icons/LayersOutline.vue'
import LinkVariantIcon from 'vue-material-design-icons/LinkVariant.vue'
import LockOutlineIcon from 'vue-material-design-icons/LockOutline.vue'
import MagnifyIcon from 'vue-material-design-icons/Magnify.vue'
import MapMarkerOutlineIcon from 'vue-material-design-icons/MapMarkerOutline.vue'
import MapMarkerPathIcon from 'vue-material-design-icons/MapMarkerPath.vue'
import MapOutlineIcon from 'vue-material-design-icons/MapOutline.vue'
import MedalOutlineIcon from 'vue-material-design-icons/MedalOutline.vue'
import MessageTextOutlineIcon from 'vue-material-design-icons/MessageTextOutline.vue'
import NotebookOutlineIcon from 'vue-material-design-icons/NotebookOutline.vue'
import OfficeBuildingOutlineIcon from 'vue-material-design-icons/OfficeBuildingOutline.vue'
import OpenInNewIcon from 'vue-material-design-icons/OpenInNew.vue'
import PackageVariantClosedIcon from 'vue-material-design-icons/PackageVariantClosed.vue'
import PaperclipIcon from 'vue-material-design-icons/Paperclip.vue'
import PencilOutlineIcon from 'vue-material-design-icons/PencilOutline.vue'
import PercentOutlineIcon from 'vue-material-design-icons/PercentOutline.vue'
import PlayCircleOutlineIcon from 'vue-material-design-icons/PlayCircleOutline.vue'
import PlayOutlineIcon from 'vue-material-design-icons/PlayOutline.vue'
import PlusIcon from 'vue-material-design-icons/Plus.vue'
import PrinterOutlineIcon from 'vue-material-design-icons/PrinterOutline.vue'
import PulseIcon from 'vue-material-design-icons/Pulse.vue'
import PuzzleOutlineIcon from 'vue-material-design-icons/PuzzleOutline.vue'
import ReceiptOutlineIcon from 'vue-material-design-icons/ReceiptOutline.vue'
import ReceiptTextOutlineIcon from 'vue-material-design-icons/ReceiptTextOutline.vue'
import RefreshIcon from 'vue-material-design-icons/Refresh.vue'
import RobotOutlineIcon from 'vue-material-design-icons/RobotOutline.vue'
import ScaleBalanceIcon from 'vue-material-design-icons/ScaleBalance.vue'
import SchoolOutlineIcon from 'vue-material-design-icons/SchoolOutline.vue'
import ShareVariantOutlineIcon from 'vue-material-design-icons/ShareVariantOutline.vue'
import ShieldAccountOutlineIcon from 'vue-material-design-icons/ShieldAccountOutline.vue'
import ShieldAlertOutlineIcon from 'vue-material-design-icons/ShieldAlertOutline.vue'
import ShieldCheckOutlineIcon from 'vue-material-design-icons/ShieldCheckOutline.vue'
import ShieldCrownOutlineIcon from 'vue-material-design-icons/ShieldCrownOutline.vue'
import ShieldKeyOutlineIcon from 'vue-material-design-icons/ShieldKeyOutline.vue'
import ShieldLockOutlineIcon from 'vue-material-design-icons/ShieldLockOutline.vue'
import ShieldOutlineIcon from 'vue-material-design-icons/ShieldOutline.vue'
import SignatureFreehandIcon from 'vue-material-design-icons/SignatureFreehand.vue'
import SitemapOutlineIcon from 'vue-material-design-icons/SitemapOutline.vue'
import SourceBranchIcon from 'vue-material-design-icons/SourceBranch.vue'
import SpeedometerIcon from 'vue-material-design-icons/Speedometer.vue'
import StoreOutlineIcon from 'vue-material-design-icons/StoreOutline.vue'
import SwapHorizontalIcon from 'vue-material-design-icons/SwapHorizontal.vue'
import TableClockIcon from 'vue-material-design-icons/TableClock.vue'
import TagOutlineIcon from 'vue-material-design-icons/TagOutline.vue'
import TextBoxOutlineIcon from 'vue-material-design-icons/TextBoxOutline.vue'
import ToolboxOutlineIcon from 'vue-material-design-icons/ToolboxOutline.vue'
import TransitConnectionVariantIcon from 'vue-material-design-icons/TransitConnectionVariant.vue'
import TrayFullIcon from 'vue-material-design-icons/TrayFull.vue'
import TrendingUpIcon from 'vue-material-design-icons/TrendingUp.vue'
import UploadIcon from 'vue-material-design-icons/Upload.vue'
import VectorPolylinePlusIcon from 'vue-material-design-icons/VectorPolylinePlus.vue'
import ViewColumnOutlineIcon from 'vue-material-design-icons/ViewColumnOutline.vue'
import ViewDashboardOutlineIcon from 'vue-material-design-icons/ViewDashboardOutline.vue'
import ViewGridOutlineIcon from 'vue-material-design-icons/ViewGridOutline.vue'
import WarehouseIcon from 'vue-material-design-icons/Warehouse.vue'
import WebhookIcon from 'vue-material-design-icons/Webhook.vue'

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
	'my-work': 'ClipboardAccountOutline',
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
