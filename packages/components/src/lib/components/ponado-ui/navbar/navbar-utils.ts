import type { NavbarItem, NavbarMenu, UserInfo } from '$ponado-ui/shared-types.js';

export const isItemVisible = (item: NavbarItem, user: UserInfo): boolean => {
	// Custom visibility function takes precedence
	if (item.isVisible) {
		return item.isVisible(user);
	}

	// Check denied roles first
	if (item.denyMask && item.denyMask & user.roleMask) {
		return false;
	}

	// Check allowed roles
	if (item.allowMask && !(item.allowMask & user.roleMask)) {
		return false;
	}

	// If no role restrictions, item is visible
	return true;
};

export const isMenuVisible = (menu: NavbarMenu, user: UserInfo): boolean => {
	// Custom visibility function takes precedence
	if (menu.isVisible) {
		return menu.isVisible(user);
	}

	// Check denied roles first
	if (menu.denyMask && menu.denyMask & user.roleMask) {
		return false;
	}

	// Check allowed roles
	if (menu.allowMask && !(menu.allowMask & user.roleMask)) {
		return false;
	}

	if (menu.allowedPersonGroups && menu.allowedPersonGroups.length > 0) {
		return menu.allowedPersonGroups.some((r) => user.personGroups.includes(r));
	}

	// Check if at least one item in the menu is visible
	const visibleItems = getVisibleItems(menu.items, user);
	return visibleItems.length > 0;
};

export const getVisibleItems = (items: NavbarItem[], user: UserInfo): NavbarItem[] => {
	return items
		.filter((item) => isItemVisible(item, user))
		.map((item) => {
			// If item has children, filter them too
			if (item.children) {
				const visibleChildren = getVisibleItems(item.children, user);
				// Only include parent if it has visible children
				return visibleChildren.length > 0 ? { ...item, children: visibleChildren } : null;
			}
			return item;
		})
		.filter(Boolean) as NavbarItem[];
};

export const getVisibleMenus = (menus: NavbarMenu[], user: UserInfo): NavbarMenu[] => {
	return menus
		.filter((menu) => isMenuVisible(menu, user))
		.map((menu) => ({
			...menu,
			items: getVisibleItems(menu.items, user)
		}));
};
