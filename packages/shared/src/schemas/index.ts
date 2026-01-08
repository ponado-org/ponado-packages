import z from 'zod';

export const getDefaultFileFields = () => z
	.object({ fileIds: z.array(z.string()).default([]) })
	.refine((data) => data.fileIds.length === 0, {
		error: 'Įkelkite failą',
		path: ['fileIds']
	});

export const PaginationSchema = z.object({
	pageIndex: z.coerce.number().optional().default(0),
	pageSize: z.coerce.number().optional().default(20),
	sortCol: z.string().optional().default('id'),
	sortDir: z
		.union([z.literal('desc'), z.literal('asc')])
		.optional()
		.default('desc')
});

/**
 * Creates a Zod schema for a number array that can parse:
 * - a real number array ([12, 14, 53])
 * - a comma-separated string ("12,14,53")
 */
export const zNumberArrayFromString = () =>
	z
		.union([z.array(z.number()), z.string()])
		.transform((val) => {
			if (typeof val === 'string') {
				return val
					.split(',')
					.map((s) => Number(s.trim()))
					.filter((n) => !isNaN(n));
			}
			return val;
		})
		.default([]);


export const UTCDateField = z.union([
	z
		.string()
		.refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), {
			message: "Date must be in YYYY-MM-DD format",
		})
		.transform((val) => {
			const [year, month, day] = val.split("-").map(Number);
			if (year && month && day) {
				return new Date(Date.UTC(year, month - 1, day));
			} else {
				return new Date()
			}
		}),
	z.date(),
]);

export const booleanField = z
	.enum(['true', 'false'])
	.transform((val) => val === 'true');

