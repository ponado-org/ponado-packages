import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: {
		email: 'src/email/index.ts',
		'google-calendar': 'src/google-calendar/index.ts',
		s3: 'src/s3/index.ts',
		stockx: 'src/stockx/index.ts',
		storage: 'src/storage/index.ts'
	},
	format: 'esm',
	dts: true,
	deps: {
		neverBundle: [
			'@aws-sdk/client-s3',
			'@aws-sdk/client-sesv2',
			'@aws-sdk/s3-request-presigner',
			'@googleapis/calendar',
			'file-type',
			'google-auth-library',
			'nodemailer',
			'zod'
		]
	}
});
