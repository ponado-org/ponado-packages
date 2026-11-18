import { spawn } from 'child_process';
import path from 'path';
import crypto from 'node:crypto';
import os from 'node:os';
import fs from 'node:fs/promises';

/**
 * Checks if a given program (binary) is available in the system PATH.
 * Works cross-platform (Windows, macOS, Linux).
 *
 * @param program - Name of the program to check (e.g. "git", "node")
 * @returns true if the program is found in PATH, false otherwise
 */
export async function isInPath(program: string): Promise<boolean> {
	const { exec } = await import('node:child_process');
	const { promisify } = await import('node:util');
	const execAsync = promisify(exec);
	const command = process.platform === 'win32' ? `where ${program}` : `command -v ${program}`;
	try {
		await execAsync(command);
		return true;
	} catch {
		return false;
	}
}
/**
 * Executes a CLI program with file-based input/output using temporary files.
 *
 * This function handles the complete lifecycle of running an external program that
 * requires file-based I/O: creates temporary input/output files, executes the program,
 * processes the output, and cleans up temporary files afterwards.
 *
 * @template Input - The input data type (string, Buffer, or ArrayBufferView)
 * @template Output - The output data type after processing
 *
 * @param program - The name or path of the CLI program to execute (must be in PATH)
 * @param input - The input data to write to the temporary input file
 * @param opts - Configuration options for execution
 * @param opts.buildArgs - Function that generates CLI arguments, receiving input and output file paths
 * @param opts.prepareInput - Optional transform to apply before writing input (e.g., string to Buffer)
 * @param opts.processOutput - Optional function to process the output file and return typed result
 * @param opts.inputExt - File extension for the temporary input file (default: 'tmp')
 * @param opts.outputExt - File extension for the temporary output file (default: 'tmp')
 * @param opts.env - Additional environment variables to pass to the program
 *
 * @returns Promise resolving to the processed output
 *
 * @throws {Error} If the program is not found in PATH
 * @throws {Error} If the program exits with a non-zero exit code
 *
 * @example
 * // Convert image format using ImageMagick
 * const output = await executeCliWithFiles<Buffer, Buffer>(
 *   'convert',
 *   imageBuffer,
 *   {
 *     buildArgs: (input, output) => [input, '-resize', '50%', output],
 *     inputExt: 'png',
 *     outputExt: 'jpg',
 *     processOutput: async (file) => await fs.readFile(file)
 *   }
 * );
 *
 * @example
 * // Process text with a custom tool
 * const result = await executeCliWithFiles<string, string>(
 *   'my-text-processor',
 *   'input text',
 *   {
 *     buildArgs: (input, output) => ['--input', input, '--output', output],
 *     inputExt: 'txt',
 *     outputExt: 'txt',
 *     processOutput: async (file) => await fs.readFile(file, 'utf-8')
 *   }
 * );
 */
export async function executeCliWithFiles<
	Input extends string | Buffer | NodeJS.ArrayBufferView,
	Output
>(
	program: string,
	input: Input,
	opts: {
		/** Optional transform before writing input file (e.g., string -> Buffer) */
		prepareInput?: (input: Input) => Buffer | string;
		/** Optional function to generate arguments for the program */
		buildArgs: (inputFile: string, outputFile: string, opts?: unknown) => string[];
		/** Optional cleanup or post-processing of output file */
		processOutput?: (outputFile: string) => Promise<Output>;
		/** Default file extension for input file */
		inputExt?: string;
		/** Default file extension for output file */
		outputExt?: string;
		/** Additional environment variables */
		env?: NodeJS.ProcessEnv;
	}
): Promise<Output> {
	const inPath = await isInPath(program);

	if (!inPath) {
		throw new Error(`Program: ${program}, was not found in path`);
	}

	const timestamp = Date.now();
	const random = crypto.randomBytes(4).toString('hex');

	const inputExt = opts.inputExt ?? 'tmp';
	const outputExt = opts.outputExt ?? 'tmp';

	const baseName = `workflow_${timestamp}_${random}`;
	const inputFile = path.join(os.tmpdir(), `${baseName}.${inputExt}`);
	const outputFile = path.join(os.tmpdir(), `${baseName}.${outputExt}`);

	try {
		// Write input to file
		const content = opts.prepareInput ? opts.prepareInput(input) : input;
		await fs.writeFile(inputFile, content);

		// Build arguments
		const args = opts.buildArgs(inputFile, outputFile, opts);

		const proc = spawn(program, args, {
			stdio: ['ignore', 'pipe', 'pipe'],
			env: { ...process.env, ...opts.env }
		});

		const result = await new Promise<{
			stderr: string;
			exitCode: number | null;
		}>((resolve, reject) => {
			let stderrData = '';
			proc.stderr.on('data', (data: Buffer) => {
				stderrData += data.toString();
			});

			proc.on('error', reject);

			proc.on('exit', (code) => {
				resolve({ stderr: stderrData, exitCode: code });
			});
		});

		if (result.exitCode !== 0) {
			console.error(`❌ ${program} failed:`, result.stderr);
			throw new Error(`${program} exited with code ${result.exitCode}`);
		}

		// Process output
		if (opts.processOutput) {
			return await opts.processOutput(outputFile);
		} else {
			return (await fs.readFile(outputFile)) as unknown as Output;
		}
	} finally {
		// Cleanup
		try {
			await fs.unlink(inputFile);
		} catch {
			console.error('Failed to unlink input file');
		}
		try {
			await fs.unlink(outputFile);
		} catch {
			console.error('Failed to unlink output file');
		}
	}
}
