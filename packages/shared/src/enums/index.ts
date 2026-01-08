import { BadgeProps } from "../types";

export enum FileRejectedReason {
	TOO_LARGE = 1,
	NOT_ALLOWED_FILE_TYPE,
	TOO_MUCH_FILES,
	MISSING_TEMPLATE_FIELDS,
	VALIDATION_FAILED
}

export const FileRejectedReasonMessages: Record<FileRejectedReason, string> = {
	[FileRejectedReason.TOO_LARGE]: 'Per didelis failas',
	[FileRejectedReason.NOT_ALLOWED_FILE_TYPE]: 'Neleistinas failo tipas',
	[FileRejectedReason.TOO_MUCH_FILES]: 'Per didelis failų kiekis',
	[FileRejectedReason.MISSING_TEMPLATE_FIELDS]: 'Trūksta šablono reikšmių',
	[FileRejectedReason.VALIDATION_FAILED]: 'Netinkamas failas'
};


export enum ActionType {
	CREATE = 1,
	UPDATE,
	DELETE
}

export const PersonActionTypeBadges: Record<ActionType, BadgeProps> = {
	[ActionType.CREATE]: { text: '+ pridėjo', variant: 'green' },
	[ActionType.UPDATE]: { text: '~ atnaujino', variant: 'yellow' },
	[ActionType.DELETE]: { text: '- pašalino', variant: 'red' }
};
