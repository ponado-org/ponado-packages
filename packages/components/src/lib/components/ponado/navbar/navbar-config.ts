// export function createNavbarConfig(user: UserInfo): NavigationMenu[] {
// 	return [
// 		{
// 			trigger: 'S-Admin',
// 			allowMask: UserRole.SUPER_ADMIN,
// 			items: [{ href: '/super-admin/persons', label: 'Asmenys' }]
// 		},
// 		{
// 			trigger: 'Info',
// 			denyMask: UserRole.ADMIN | UserRole.SUPER_ADMIN,
// 			allowMask: UserRole.REGISTERED_USER,
// 			items: [
// 				{ href: '/registered-user/dashboard', label: 'Apžvalga' },
// 				{ href: '/registered-user/documents/templates', label: 'Šablonai' },
// 				{
// 					href: '#',
// 					label: 'Metodiniai centrai',
// 					isVisible: (user) => user.methodicCenterIds.length > 0,
// 					...(user?.methodicCenterIds?.length > 0
// 						? {
// 							children: user.methodicCenterIds.map((id) => ({
// 								href: `/kmc/${id}/persons`,
// 								label: MethodicCenters.find((x) => x.value === id)?.label!
// 							}))
// 						}
// 						: {})
// 				}
// 			]
// 		},
// }
