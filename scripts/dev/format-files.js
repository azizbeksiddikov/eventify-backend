// Does what the editor does when you save a TypeScript file:
// 1. "organize imports" (sort, merge and remove unused imports; TypeScript's own action),
// 2. Prettier (uses .prettierrc).
// Usage: npm run format:files -- <file> [<file> ...]   (run from the repo root)
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const root = process.cwd();
const files = process.argv
	.slice(2)
	.map((f) => path.resolve(root, f))
	.filter((f) => fs.existsSync(f));
if (files.length === 0) {
	console.error('Usage: npm run format:files -- <file> [<file> ...]');
	process.exit(2);
}
const ts = require(require.resolve('typescript', { paths: [root] }));

const cfgPath = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
const cfg = ts.parseJsonConfigFileContent(ts.readConfigFile(cfgPath, ts.sys.readFile).config, ts.sys, root);
const host = {
	getScriptFileNames: () => [...new Set([...cfg.fileNames, ...files])],
	getScriptVersion: () => '0',
	getScriptSnapshot: (f) => (fs.existsSync(f) ? ts.ScriptSnapshot.fromString(fs.readFileSync(f, 'utf8')) : undefined),
	getCurrentDirectory: () => root,
	getCompilationSettings: () => cfg.options,
	getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
	fileExists: ts.sys.fileExists,
	readFile: ts.sys.readFile,
	readDirectory: ts.sys.readDirectory,
	directoryExists: ts.sys.directoryExists,
	getDirectories: ts.sys.getDirectories,
};
const ls = ts.createLanguageService(host, ts.createDocumentRegistry());
const format = { tabSize: 2, indentSize: 2, convertTabsToSpaces: false, newLineCharacter: '\n' };

for (const file of files.filter((f) => /\.(ts|tsx)$/.test(f))) {
	const original = fs.readFileSync(file, 'utf8');
	const edits = ls
		.organizeImports({ type: 'file', fileName: file, mode: ts.OrganizeImportsMode.All }, format, {})
		.filter((c) => path.resolve(c.fileName) === file)
		.flatMap((c) => c.textChanges)
		.sort((a, b) => b.span.start - a.span.start);
	let text = original;
	for (const e of edits) text = text.slice(0, e.span.start) + e.newText + text.slice(e.span.start + e.span.length);
	if (text !== original) fs.writeFileSync(file, text);
}
const result = spawnSync('npx', ['prettier', '--write', ...files], { cwd: root, stdio: 'inherit' });
process.exit(result.status ?? 1);
