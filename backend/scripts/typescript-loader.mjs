import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const FALLBACK_TYPESCRIPT_PATH = '/usr/share/nodejs/typescript/lib/typescript.js';
const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT_URL = pathToFileURL(`${path.resolve(SCRIPT_DIRECTORY, '..')}/`).href;

let typeScriptPromise;

async function loadTypeScript() {
  if (!typeScriptPromise) {
    typeScriptPromise = import('typescript')
      .catch(() => import(pathToFileURL(FALLBACK_TYPESCRIPT_PATH).href))
      .then((module) => module.default ?? module);
  }

  return typeScriptPromise;
}

function isTypeScriptSpecifier(specifier) {
  return specifier.endsWith('.ts');
}

function isTypeScriptUrl(url) {
  return url.startsWith('file:') && url.endsWith('.ts');
}

export async function resolve(specifier, context, nextResolve) {
  if (!isTypeScriptSpecifier(specifier)) {
    return nextResolve(specifier, context);
  }

  if (specifier.startsWith('file:')) {
    return { shortCircuit: true, url: specifier };
  }

  if (specifier.startsWith('/') || specifier.startsWith('./') || specifier.startsWith('../')) {
    return {
      shortCircuit: true,
      url: new URL(specifier, context.parentURL ?? PROJECT_ROOT_URL).href,
    };
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (!isTypeScriptUrl(url)) {
    return nextLoad(url, context);
  }

  const ts = await loadTypeScript();
  const filePath = fileURLToPath(url);
  const source = await fs.readFile(filePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      allowImportingTsExtensions: true,
      esModuleInterop: true,
      isolatedModules: true,
      sourceMap: false,
      inlineSourceMap: true,
    },
    fileName: filePath,
    reportDiagnostics: false,
  });

  return {
    format: 'module',
    shortCircuit: true,
    source: transpiled.outputText,
  };
}
