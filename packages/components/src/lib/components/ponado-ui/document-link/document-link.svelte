<script lang="ts">
	import { Download, Eye, Loader } from '@lucide/svelte';
	import { Tooltip } from '$ponado-ui/tooltip/index.js';
	import { Button, type ButtonVariant } from '$scn/button/index.js';
	import { toast } from 'svelte-sonner';

	interface Props {
		fileId: string;
		variant?: ButtonVariant;
		isDownload?: boolean;
	}

	const { fileId, isDownload = false, variant = 'ghost' }: Props = $props();

	let isDownloading = $state(false);

	const getSignedUrl = async (fileId: string) => {
		try {
			// Validate fileId
			if (!fileId || (typeof fileId !== 'string' && typeof fileId !== 'number')) {
				toast.error('Neteisingas failo identifikatorius');
				return;
			}

			// Prevent double-clicking/multiple simultaneous downloads
			if (isDownloading) {
				return;
			}

			const params = new URLSearchParams();
			params.set('fileId', String(fileId));
			isDownloading = true;

			// Add timeout to prevent hanging requests
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

			try {
				// Get signed URL with timeout
				const r = await fetch('/api/documents/get-signed-url?' + params, {
					signal: controller.signal,
					headers: {
						Accept: 'application/json'
					}
				});

				clearTimeout(timeoutId);

				if (!r.ok) {
					const errorText = await r.text().catch(() => 'Nežinoma klaida');
					console.error('Failed to get signed URL:', r.status, errorText);
					toast.error('Nepavyko gauti failo nuorodos');
					return;
				}

				const responseData = await r.json();
				const { signedUrl } = responseData;

				// Validate signed URL
				if (!signedUrl || typeof signedUrl !== 'string') {
					toast.error('Gauta neteisinga failo nuoroda');
					return;
				}

				// Basic URL validation
				try {
					const url = new URL(signedUrl);
					// Only allow https URLs (or http for localhost in development)
					if (
						url.protocol !== 'https:' &&
						!(url.protocol === 'http:' && url.hostname === 'localhost')
					) {
						throw new Error('Unsafe URL protocol');
					}
				} catch (urlError: unknown) {
					console.error('Invalid signed URL:', urlError);
					toast.error('Gauta neteisinga failo nuoroda');
					return;
				}

				if (isDownload) {
					// Download mode - fetch file and force download
					const downloadController = new AbortController();
					const downloadTimeoutId = setTimeout(() => downloadController.abort(), 60000); // 60 second timeout for download

					const fileR = await fetch(signedUrl, {
						signal: downloadController.signal,
						headers: {
							Accept: '*/*'
						}
					});

					clearTimeout(downloadTimeoutId);

					if (!fileR.ok) {
						console.error('Failed to download file:', fileR.status, fileR.statusText);
						toast.error('Nepavyko atsisiųsti failo');
						return;
					}

					// Check content type if available
					const contentType = fileR.headers.get('content-type');
					if (contentType && contentType.startsWith('text/html')) {
						// This might be an error page instead of a file
						toast.error('Gautas neteisingas failo tipas');
						return;
					}

					const blob = await fileR.blob();

					// Validate blob
					if (!blob || blob.size === 0) {
						toast.error('Gautas tuščias failas');
						return;
					}

					const url = URL.createObjectURL(blob);

					// Clean up the object URL after a delay to ensure download completes
					// const cleanup = () => {
					// 	setTimeout(() => {
					// 		URL.revokeObjectURL(url);
					// 	}, 1000);
					// };

					// Try to get filename from response headers
					const contentDisposition = fileR.headers.get('content-disposition');
					let filename = 'download';
					if (contentDisposition) {
						const filenameMatch = contentDisposition.match(
							/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
						);
						if (filenameMatch) {
							filename = filenameMatch[1].replace(/['"]/g, '');
						}
					}

					// Force download
					const link = document.createElement('a');
					link.href = url;
					link.download = filename;
					link.style.display = 'none';
					document.body.appendChild(link);
					link.click();
					document.body.removeChild(link);

					// cleanup();
					toast.success('Failas sėkmingai atsisiųstas');
				} else {
					// Preview mode - open in new tab
					window.open(signedUrl, '_blank');
					// toast.success('Failas atidaromas naujame skirtuke');
				}
			} catch (fetchError: unknown) {
				clearTimeout(timeoutId);
				if (fetchError instanceof Error && fetchError.name === 'AbortError') {
					toast.error('Atsisiuntimas nutrauktas - per ilgai užtruko');
				} else {
					console.error('Download error:', fetchError);
					toast.error('Atsisiunčiant failą įvyko klaida');
				}
			}
		} catch (error: unknown) {
			console.error('Unexpected error in getSignedUrl:', error);
			toast.error('Įvyko netikėta klaida');
		} finally {
			isDownloading = false;
		}
	};
</script>

<Tooltip text={isDownload ? 'Atsisiųsti dokumentą' : 'Peržiūrėti dokumentą'}>
	<Button {variant} class="size-8" onclick={() => getSignedUrl(fileId)}>
		{#if isDownloading}
			<Loader class="animate-spin dark:text-white" />
		{:else if isDownload}
			<Download class="dark:text-white" />
		{:else}
			<Eye class="dark:text-white" />
		{/if}
	</Button>
</Tooltip>
