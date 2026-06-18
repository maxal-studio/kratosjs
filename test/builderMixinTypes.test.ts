import { describe, expect, it } from 'vitest';
import * as ts from 'typescript';
import * as path from 'node:path';

/**
 * Regression test for the self-typing mixin ("concern") pattern.
 *
 * Form/table builders compose behaviour through mixin functions that return an
 * anonymous class. Historically TypeScript could not represent a polymorphic
 * `this` return type on such an anonymous class inside an intersection, so the
 * generated `.d.ts` collapsed every chainable method to `/*elided* / any`. The
 * workaround was a hand-written `export interface X { ... }` after every final
 * class, which silently drifted from the implementation.
 *
 * The fix gives each concern an explicit, *named* return type
 * (`TBase & Constructor<NamedInterface>`). A `this` declared on a named
 * interface survives declaration emit, so the per-class interface merges are no
 * longer needed.
 *
 * This test emits declarations for representative builder entry points straight
 * from source and asserts:
 *   1. no method is emitted as the tell-tale `/*elided* / any`
 *   2. chainable concern methods are emitted with a real `: this` return
 */
describe('self-typing mixin declaration emit', () => {
	const srcDir = path.resolve(__dirname, '../src');
	const rootNames = [
		path.join(srcDir, 'formbuilder/form/Field.ts'),
		path.join(srcDir, 'formbuilder/form/components/TextInput.ts'),
		path.join(srcDir, 'tablebuilder/Column.ts'),
		path.join(srcDir, 'tablebuilder/table/columns/TextColumn.ts'),
	];

	const options: ts.CompilerOptions = {
		declaration: true,
		emitDeclarationOnly: true,
		module: ts.ModuleKind.NodeNext,
		moduleResolution: ts.ModuleResolutionKind.NodeNext,
		target: ts.ScriptTarget.ES2020,
		strict: true,
		skipLibCheck: true,
		noEmitOnError: false,
		baseUrl: srcDir,
		paths: { '@/*': ['*'] },
	};

	// Emit all declarations once, into an in-memory map keyed by file name.
	const emitted = new Map<string, string>();
	const program = ts.createProgram(rootNames, options);
	const emitResult = program.emit(undefined, (fileName, contents) => {
		emitted.set(fileName, contents);
	});

	const allDts = Array.from(emitted.values()).join('\n');

	it('emits declarations without skipping', () => {
		expect(emitResult.emitSkipped).toBe(false);
		expect(emitted.size).toBeGreaterThan(0);
	});

	it('never collapses a chainable method to `/*elided*/ any`', () => {
		const offenders = Array.from(emitted.entries())
			.filter(([, contents]) => contents.includes('/*elided*/'))
			.map(([fileName]) => fileName);
		expect(offenders).toEqual([]);
	});

	it('preserves `: this` on chainable concern methods (named interfaces)', () => {
		// formbuilder concerns
		expect(allDts).toContain('afterStateUpdated(callback: AfterStateUpdatedCallback): this;');
		expect(allDts).toContain('columnSpan(span: number | string | Record<string, number | string>): this;');
		expect(allDts).toMatch(/required\(condition\?: Resolvable<boolean>\): this;/);
		// tablebuilder concerns
		expect(allDts).toMatch(/sortable\(condition\?: Resolvable<boolean>\): this;/);
		expect(allDts).toMatch(/color\(color: Resolvable<Color>\): this;/);
	});

	it('composes final classes from named concern constructors, not inline elided classes', () => {
		const fieldDts = emitted.get(path.join(srcDir, 'formbuilder/form/Field.d.ts'));
		expect(fieldDts).toBeDefined();
		expect(fieldDts!).toContain('Constructor<HasAfterStateUpdated>');
		expect(fieldDts!).not.toContain('/*elided*/');
	});
});
