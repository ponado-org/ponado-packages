import { BadgeProps } from "@ponado/shared/types";
import { Linksnis } from "./lithuanian-declination";

export const LinksnisBadges: Record<Linksnis, BadgeProps> = {
	gal: { text: 'Galininkas', variant: 'green-outline' },
	kil: { text: 'Kilmininkas', variant: 'blue-outline' },
	vie: { text: 'Vietininkas', variant: 'fuchsia-outline' },
	ina: { text: 'Įnagininkas', variant: 'yellow-outline' },
	sau: { text: 'Šauksmininkas', variant: 'orange-outline' },
	nau: { text: 'Naudininkas', variant: 'lime-outline' }
} as const;
