import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const root = new URL('../', import.meta.url);

// Test actual source while replacing external service boundaries.
export function loadSource(file, mocks = {}, cache = new Map()) {
  if (cache.has(file)) return cache.get(file);
  const compiledModule = { exports: {} };
  cache.set(file, compiledModule.exports);
  const source = ts.transpileModule(readFileSync(new URL(file, root), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const localRequire = (name) => Object.hasOwn(mocks, name) ? mocks[name]
    : name.startsWith('@/') ? loadSource(`src/${name.slice(2)}.ts`, mocks, cache) : require(name);
  new Function('require', 'module', 'exports', source)(localRequire, compiledModule, compiledModule.exports);
  cache.set(file, compiledModule.exports);
  return compiledModule.exports;
}
