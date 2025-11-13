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
