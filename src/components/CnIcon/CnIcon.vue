<template>
	<component :is="resolvedComponent" :size="size" />
</template>

<script>
import AccountGroup from 'vue-material-design-icons/AccountGroup.vue'
import AccountHardHat from 'vue-material-design-icons/AccountHardHat.vue'
import BadgeAccountOutline from 'vue-material-design-icons/BadgeAccountOutline.vue'
import BriefcaseOutline from 'vue-material-design-icons/BriefcaseOutline.vue'
import BriefcaseVariantOutline from 'vue-material-design-icons/BriefcaseVariantOutline.vue'
import CardAccountDetails from 'vue-material-design-icons/CardAccountDetails.vue'
import CheckboxMarkedOutline from 'vue-material-design-icons/CheckboxMarkedOutline.vue'
import DatabaseSearch from 'vue-material-design-icons/DatabaseSearch.vue'
import FileDocumentMultipleOutline from 'vue-material-design-icons/FileDocumentMultipleOutline.vue'
import FileDocumentOutline from 'vue-material-design-icons/FileDocumentOutline.vue'
import FlagCheckered from 'vue-material-design-icons/FlagCheckered.vue'
import FlagOutline from 'vue-material-design-icons/FlagOutline.vue'
import FormatListBulletedType from 'vue-material-design-icons/FormatListBulletedType.vue'
import Gavel from 'vue-material-design-icons/Gavel.vue'
import HelpCircleOutline from 'vue-material-design-icons/HelpCircleOutline.vue'
import ListStatus from 'vue-material-design-icons/ListStatus.vue'
import OfficeBuildingOutline from 'vue-material-design-icons/OfficeBuildingOutline.vue'
import Pipe from 'vue-material-design-icons/Pipe.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import Refresh from 'vue-material-design-icons/Refresh.vue'
import ScaleBalance from 'vue-material-design-icons/ScaleBalance.vue'
import TrendingUp from 'vue-material-design-icons/TrendingUp.vue'

/**
 * Static map of icon names to vue-material-design-icons components.
 *
 * To add a new icon:
 * 1. Import it from vue-material-design-icons
 * 2. Add an entry to this object (key = PascalCase icon name)
 *
 * @see https://pictogrammers.com/library/mdi/
 */
export const ICON_MAP = {
	AccountGroup,
	AccountHardHat,
	BadgeAccountOutline,
	BriefcaseOutline,
	BriefcaseVariantOutline,
	CardAccountDetails,
	CheckboxMarkedOutline,
	DatabaseSearch,
	FileDocumentMultipleOutline,
	FileDocumentOutline,
	FlagCheckered,
	FlagOutline,
	FormatListBulletedType,
	Gavel,
	HelpCircleOutline,
	ListStatus,
	OfficeBuildingOutline,
	Pipe,
	Plus,
	Refresh,
	ScaleBalance,
	TrendingUp,
}

/**
 * CnIcon — Maps a Material Design Icons string name to a Vue component.
 *
 * @example
 * <CnIcon name="AccountGroup" :size="24" />
 */
export default {
	name: 'CnIcon',

	props: {
		/** MDI icon name in PascalCase (e.g. "AccountGroup") */
		name: {
			type: String,
			required: true,
		},
		/** Icon pixel size */
		size: {
			type: Number,
			default: 20,
		},
		/** Fallback icon name if `name` is not found in the registry */
		fallback: {
			type: String,
			default: 'HelpCircleOutline',
		},
	},

	computed: {
		resolvedComponent() {
			return ICON_MAP[this.name] || ICON_MAP[this.fallback] || HelpCircleOutline
		},
	},
}
</script>
