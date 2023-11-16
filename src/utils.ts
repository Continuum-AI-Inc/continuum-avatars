import * as fs from 'fs';
import * as path from 'path'
import sharp from 'sharp';

export function* walkSync(dir: string): IterableIterator<[string, string[], string[]]> {
	const files = fs.readdirSync(dir);

	let subdirs = files.filter(file => fs.statSync(path.join(dir, file)).isDirectory());
	const filenames = files.filter(file => !subdirs.includes(file));

	yield [dir, subdirs, filenames];

	for (const subdir of subdirs) {
			yield* walkSync(path.join(dir, subdir));
	}
}

export function natsort(array: string[]): string[] {
	return array.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
}