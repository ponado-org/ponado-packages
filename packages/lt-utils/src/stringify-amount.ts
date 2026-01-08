
const groupsNumber = 4;

const smallNumbers = [
	"nulis", "vienas", "du", "trys", "keturi",
	"penki", "šeši", "septyni", "aštuoni", "devyni",
	"dešimt", "vienuolika", "dvylika", "trylika", "keturiolika",
	"penkiolika", "šešiolika", "septyniolika", "aštuoniolika", "devyniolika",
];

const tens = [
	"", "", "dvidešimt", "trisdešimt", "keturiasdešimt", "penkiasdešimt",
	"šešiasdešimt", "septyniasdešimt", "aštuoniasdešimt", "devyniasdešimt",
];

const scaleNumbers = [
	"", "tūkstan", "milijon", "milijard",
];

type DigitGroup = number;

export function getVerbalAmount(number: number): string {
	return convert(number);
}

function convert(number: number): string {
	if (number === 0) {
		return smallNumbers[0] as string;
	}

	const groups: DigitGroup[] = Array(groupsNumber).fill(0);
	let positive = Math.abs(number);

	for (let i = 0; i < groupsNumber; i++) {
		groups[i] = positive % 1000;
		positive = Math.floor(positive / 1000);
	}

	const textGroup: string[] = groups.map(digitGroupToText);
	let combined = textGroup[0] as string;

	for (let i = 1; i < groupsNumber; i++) {
		if (groups[i] !== 0) {
			const isThousands = i === 1;
			let prefix = `${textGroup[i]} ${scaleNumbers[i]}${getEnding(groups[i] as number, isThousands)}`;

			if (combined.length > 0) {
				prefix += " ";
			}

			combined = prefix + combined;
		}
	}

	if (number < 0) {
		combined = `minus ${combined}`;
	}

	return combined;
}

function digitGroupToText(group: DigitGroup): string {
	let result = "";

	const hundreds = Math.floor(group / 100);
	const tensUnits = group % 100;

	if (hundreds !== 0) {
		result += `${smallNumbers[hundreds]} šimt${getEnding(hundreds, false)}`;

		if (tensUnits !== 0) {
			result += " ";
		}
	}

	const tensValue = Math.floor(tensUnits / 10);
	const units = tensUnits % 10;

	if (tensValue >= 2) {
		result += tens[tensValue];

		if (units !== 0) {
			result += ` ${smallNumbers[units]}`;
		}
	} else if (tensUnits !== 0) {
		result += smallNumbers[tensUnits];
	}

	return result;
}

function getEnding(scale: number, isThousand: boolean): string {
	if (scale >= 100) {
		scale %= 100;
	}

	if ((scale > 9 && scale <= 20) || scale % 10 === 0) {
		return isThousand ? "čių" : "ai";
	}

	if (scale % 10 === 1) {
		return isThousand ? "tis" : "as";
	}

	return isThousand ? "čiai" : "ai";
}
