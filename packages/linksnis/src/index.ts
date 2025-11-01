export type LinksnisType = 'kil' | 'nau' | 'gal' | 'ina' | 'vie' | 'sau';

export const Linksnis = {
	/**
	 * Name transformation
	 *
	 * @param {string} vardas Lithuanian name or surname
	 * @param {LinksnisType} linksnis shortened name of the case: kil, nau, gal, ina, vie, sau
	 * @return {string}
	 */
	getName(vardas: string, linksnis: LinksnisType = 'sau'): string {
		const vardai = this.sanitizeName(vardas).split(' ');
		return vardai.map(v => this.getLinksnis(v, linksnis)).join(' ') || vardas;
	},

	/**
	 * Name sanitation
	 *
	 * @param {string} vardas Lithuanian name or surname
	 * @return {string}
	 */
	sanitizeName(vardas: string): string {
		// Replace all non-Lithuanian alphabet characters with a space
		vardas = vardas.replace(/[^a-žA-Ž]/g, ' ').replace(/\s+/g, ' ').trim();

		return vardas
			.split(' ')
			.map(word => word.charAt(0).toLocaleUpperCase() + word.slice(1).toLocaleLowerCase())
			.join(' ');
	},


	/**
	 * Name in the case
	 *
	 * @param {string} vardas Lithuanian name or surname
	 * @param {LinksnisType} linksnis shortened name of the case: kil, nau, gal, ina, vie, sau
	 * @return {string}
	 */
	getLinksnis(vardas: string, linksnis: LinksnisType = 'sau'): string {
		const link: Record<LinksnisType, Record<string, string>> = {
			kil: { 'a': 'os', 'as': 'o', 'ė': 'ės', 'tis': 'čio', 'dis': 'džio', 'is': 'io', 'us': 'aus', 'tys': 'čio', 'dys': 'džio', 'ys': 'io' },
			nau: { 'a': 'ai', 'as': 'ui', 'ė': 'ei', 'tis': 'čiui', 'dis': 'džiui', 'is': 'iui', 'us': 'ui', 'tys': 'čiui', 'dys': 'džiui', 'ys': 'iui' },
			gal: { 'a': 'ą', 'as': 'ą', 'ė': 'ę', 'is': 'į', 'us': 'ų', 'ys': 'į' },
			ina: { 'a': 'a', 'as': 'u', 'ė': 'e', 'tis': 'čiu', 'dis': 'džiu', 'is': 'iu', 'us': 'u', 'tys': 'čiu', 'dys': 'džiu', 'ys': 'iu' },
			vie: { 'a': 'oje', 'as': 'e', 'ė': 'ėje', 'is': 'yje', 'us': 'uje', 'ys': 'yje' },
			sau: { 'a': 'a', 'as': 'ai', 'ė': 'e', 'is': 'i', 'us': 'au', 'ys': 'y' }
		};

		for (const [from, to] of Object.entries(link[linksnis])) {
			if (vardas.endsWith(from)) {
				return vardas.slice(0, -from.length) + to;
			}
		}
		return vardas;
	}
};
