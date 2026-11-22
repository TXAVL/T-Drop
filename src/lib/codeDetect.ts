/**
 * codeDetect.ts — Fast heuristic syntax and language detection for clipboard text.
 */
import { isMarkdown, isStrongMarkdown } from './txa-markdown/detect'

export interface CodeDetectionResult {
  isCode: boolean
  language: string
  displayName: string
}

export const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  tsx: 'TSX',
  typescript: 'TypeScript',
  jsx: 'JSX',
  javascript: 'JavaScript',
  json: 'JSON',
  css: 'CSS',
  html: 'HTML',
  python: 'Python',
  bash: 'Bash',
  sql: 'SQL',
  rust: 'Rust',
  go: 'Go',
  cpp: 'C++',
  c: 'C',
  csharp: 'C#',
  yaml: 'YAML',
  markdown: 'Markdown',
  graphql: 'GraphQL',
  txa: 'TXA',
  kotlin: 'Kotlin',
  swift: 'Swift',
  java: 'Java',
  php: 'PHP',
  ruby: 'Ruby',
  dart: 'Dart',
  lua: 'Lua',
  zig: 'Zig',
  mojo: 'Mojo',
  gleam: 'Gleam',
  elixir: 'Elixir',
  haskell: 'Haskell',
  julia: 'Julia',
  nim: 'Nim',
  odin: 'Odin',
  v: 'V',
  scala: 'Scala',
  toml: 'TOML',
  powershell: 'PowerShell',
  dockerfile: 'Dockerfile',
  react: 'React',
  nextjs: 'Next.js',
  vue: 'Vue',
  svelte: 'Svelte',
  angular: 'Angular',
  astro: 'Astro',
  express: 'Express',
}

/**
 * Languages whose Prism grammar is not bundled map to the closest bundled one,
 * so comments and strings still get colour. Anything else renders as plain text.
 */
const GRAMMAR_FALLBACK: Record<string, string> = {
  csharp: 'clike', java: 'clike', php: 'clike', dart: 'clike', zig: 'clike', scala: 'kotlin',
  react: 'tsx', nextjs: 'tsx', vue: 'markup', svelte: 'markup', astro: 'markup', angular: 'typescript', express: 'javascript',
  ruby: 'clike', lua: 'clike',
  v: 'go', odin: 'go', gleam: 'rust', mojo: 'python', toml: 'yaml', dockerfile: 'yaml',
}

/** The Prism grammar id to highlight a detected language with. */
export function prismGrammar(language: string): string {
  return GRAMMAR_FALLBACK[language] ?? language
}

/**
 * Detects if a given text string is a code snippet, and infers its programming language.
 */
export function detectCode(raw: string): CodeDetectionResult {
  if (!raw || typeof raw !== 'string') {
    return { isCode: false, language: 'text', displayName: 'Text' }
  }

  const text = raw.trim()

  // Ignore very short single tokens (like "hello" or numbers)
  if (text.length < 4) {
    return { isCode: false, language: 'text', displayName: 'Text' }
  }

  // 0. T-Drop backup archive (.txa): its human-readable banner is the file's signature.
  // Also its banner fragments, a decrypted backup manifest, and txa-repo package files.
  if (
    /^\uFEFF?\s*TXA-ARCHIVE-V\d/.test(raw) ||
    /\[ENCRYPTED T-DROP BACKUP\]/.test(raw) ||
    (/"app"\s*:\s*"T-Drop"/.test(raw) && /"(itemsCount|imagesCount|createdAt)"/.test(raw)) ||
    (/\bTXAVL\.[A-Za-z0-9_.-]+/.test(raw) && /^\s*(id|name|version|installer|manifest|package)\s*[:=]/m.test(raw)) ||
    /^\s*txapm\s+(install|upgrade|which|search|list|uninstall)\b/m.test(raw)
  ) {
    return { isCode: true, language: 'txa', displayName: 'TXA' }
  }

  // 0b. Strong Markdown structures (GFM tables, fenced code blocks, task lists).
  // Checked early so Markdown docs containing code examples aren't misclassified as JS/HTML.
  if (isStrongMarkdown(text)) {
    return { isCode: true, language: 'markdown', displayName: 'Markdown' }
  }

  // 1. JSON Detection
  if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
    try {
      JSON.parse(text)
      // Check if it's a multi-line or formatted JSON object/array
      if (text.includes(':') || text.includes('\n') || text.length > 20) {
        return { isCode: true, language: 'json', displayName: 'JSON' }
      }
    } catch {
      // If it looks like JSON structure with quotes and colons
      if (/^\{[\s\S]*"[a-zA-Z0-9_$-]+"\s*:[\s\S]*\}$/.test(text)) {
        return { isCode: true, language: 'json', displayName: 'JSON' }
      }
    }
  }

  // A script module that returns markup (React components and the like):
  // it starts as code, not as a tag, so the HTML rule below must not win.
  const looksLikeScript = !text.startsWith('<') &&
    /(?:^|\n)\s*(import\s[^\n]*?\bfrom\s+['"]|export\s+(default|const|function|class)\b|(const|let|var)\s+([\w$]+\s*(:[^=\n]+)?=[^=]|[{[])|function\s+[\w$]+\s*\()/.test(text)

  // 1b. JavaScript frameworks. Single-file components start with <template>/<script>,
  // so they must be recognised before the HTML rule below claims them.
  {
    const fwNamed = (language: string, displayName: string) => ({ isCode: true, language, displayName })
    const hasScriptTag = /<script[\s>]/.test(text)
    if (/@(Component|Injectable|NgModule|Directive|Pipe)\s*\(\s*\{/.test(text) || /from\s+['"]@angular\//.test(text) || /\*ng(For|If)=|\(click\)="/.test(text)) {
      return fwNamed('angular', 'Angular')
    }
    if (
      (/<template[\s>]/.test(text) && hasScriptTag && /\b(export\s+default|defineComponent|defineProps|defineEmits|setup)\b/.test(text)) ||
      /from\s+['"]vue['"]|\bdefineComponent\s*\(|\bcreateApp\s*\(|<script\s+setup\b|\bv-(if|for|model|bind|on):?/.test(text)
    ) {
      return fwNamed('vue', 'Vue')
    }
    if (
      (hasScriptTag && /\{#(if|each|await|key)\b|\{:else\b|\bon:[a-z]+=|\bbind:[a-z]+=|^\s*\$:\s/m.test(text)) ||
      /\$(state|derived|props|effect)\s*\(/.test(text) ||
      /from\s+['"]svelte(\/\w+)?['"]/.test(text)
    ) {
      return fwNamed('svelte', 'Svelte')
    }
    if (/^---\s*\n[\s\S]*?\n---/.test(text) && (/\bAstro\.(props|params|request|url)\b/.test(text) || /import\s+.*\s+from\s+['"].*\.astro['"]/.test(text) || /<slot\s*\/?>/.test(text))) {
      return fwNamed('astro', 'Astro')
    }
    if (
      /^\s*['"]use (client|server)['"]/m.test(text) ||
      /from\s+['"]next(\/[\w-]+)*['"]/.test(text) ||
      /\b(getServerSideProps|getStaticProps|getStaticPaths|generateMetadata|NextResponse|NextRequest)\b/.test(text)
    ) {
      return fwNamed('nextjs', 'Next.js')
    }
    if (/require\(\s*['"]express['"]\s*\)|from\s+['"]express['"]|\bexpress\(\s*\)|\bapp\.(get|post|put|delete|use|listen)\s*\(/.test(text)) {
      return fwNamed('express', 'Express')
    }
    if (
      (/\bfrom\s+['"]react['"]|\bReact\.(useState|createElement|FC)\b/.test(text) || /\b(useState|useEffect|useRef|useMemo|useCallback|useReducer|useContext)\s*[<(]/.test(text)) &&
      !/^\s*\$:/m.test(text)
    ) {
      return fwNamed('react', 'React')
    }
  }

  // 2. HTML / XML / SVG Detection
  if (!looksLikeScript && (
    /<!DOCTYPE\s+html/i.test(text) ||
    /<(html|head|body|div|span|p|a|svg|script|style|path|button|input|h[1-6]|table|form|ul|li|section|header|footer|template)\b[^>]*>/i.test(text) ||
    (text.startsWith('<') && text.endsWith('>') && /<\/?[a-z][a-z0-9-]*\b/i.test(text))
  )) {
    return { isCode: true, language: 'html', displayName: 'HTML' }
  }

  // 3. CSS / SCSS Detection
  if (
    /@(media|keyframes|import|supports|font-face|container)\b/.test(text) ||
    /:(root|hover|focus|active|before|after|nth-child)\b/.test(text) ||
    /(?:^|\n)\s*([.#]?[a-zA-Z0-9_#-]+(\s*,\s*[.#]?[a-zA-Z0-9_#-]+)*)\s*\{\s*[\n\r]?(?:\s*[a-zA-Z-]+:\s*[^;]+;\s*[\n\r]?)+\}/.test(text) ||
    /(\b(color|background|padding|margin|display|flex|font-size|border|width|height|opacity|z-index|transform|box-shadow|overflow|position)\s*:\s*[^;]+;)/.test(text)
  ) {
    // If it has CSS properties and brackets/colons
    if (text.includes('{') && text.includes('}') && text.includes(':')) {
      return { isCode: true, language: 'css', displayName: 'CSS' }
    }
  }

  // 4. SQL Detection
  if (
    /^\s*(SELECT\s+[\s\S]+?\s+FROM\s+|INSERT\s+INTO\s+|UPDATE\s+[\s\S]+?\s+SET\s+|DELETE\s+FROM\s+|CREATE\s+(TABLE|INDEX|VIEW|DATABASE)\s+|ALTER\s+TABLE\s+|DROP\s+(TABLE|DATABASE)\s+|WITH\s+\w+\s+AS\s*\()/i.test(text)
  ) {
    return { isCode: true, language: 'sql', displayName: 'SQL' }
  }

  // 4b. Newer and less common languages. Every rule needs a strong marker so
  // they never steal code from the common languages detected further down.
  const named = (language: string, displayName: string) => ({ isCode: true, language, displayName })

  if (/^\s*FROM\s+\S+/m.test(text) && /^\s*(RUN|COPY|CMD|WORKDIR|EXPOSE|ENV|ENTRYPOINT)\b/m.test(text)) {
    return named('dockerfile', 'Dockerfile')
  }
  if (/\b(Get|Set|New|Remove|Invoke|Write|Start|Stop|Import|Test)-[A-Z][A-Za-z]+\b/.test(text) || /\$env:\w+|\bWrite-Host\b/.test(text)) {
    return named('powershell', 'PowerShell')
  }
  if (/<\?(php|=)/.test(text)) return named('php', 'PHP')
  if (/\bimport\s+gleam\/\w+/.test(text) || (/\|>/.test(text) && /\bpub\s+fn\b/.test(text) && /\bcase\b/.test(text))) {
    return named('gleam', 'Gleam')
  }
  if (/@import\s*\(/.test(text) || /\bconst\s+std\s*=\s*@import/.test(text)) return named('zig', 'Zig')
  if (/\b(inout|borrowed|owned)\s+self\b|@value\b/.test(text) || /^\s*fn\s+\w+\([^)]*\)(\s*->\s*[^:{]+)?\s*:\s*$/m.test(text)) {
    return named('mojo', 'Mojo')
  }
  if (/\bimport\s+(SwiftUI|UIKit|Foundation|Combine)\b|\bguard\s+let\b|\bstruct\s+\w+\s*:\s*View\b|@(State|Published|ObservedObject|Binding)\b/.test(text) ||
      /\bfunc\s+\w+\([^)]*\)\s*->\s*[\w<>\[\]?]+\s*\{/.test(text)) {
    return named('swift', 'Swift')
  }
  if (/\bobject\s+\w+\s+extends\s+App\b|\bcase\s+class\b|\bdef\s+\w+\([^)]*\)\s*:\s*[\w\[\], ]+\s*=/.test(text)) {
    return named('scala', 'Scala')
  }
  if (/\bfun\s+\w+\s*\(|\bdata\s+class\s+\w+|\bcompanion\s+object\b|\bval\s+\w+\s*:\s*\w+\s*=/.test(text) && !/\bfunction\b/.test(text)) {
    return named('kotlin', 'Kotlin')
  }
  if (/\bpublic\s+static\s+void\s+main\s*\(|\bSystem\.out\.print(ln)?\s*\(|^\s*import\s+java\.|^\s*package\s+[a-z]+(\.[a-z]+)+\s*;/m.test(text)) {
    return named('java', 'Java')
  }
  if (/\bimport\s+'package:|\bStatefulWidget\b|\bWidget\s+build\s*\(|\bvoid\s+main\s*\(\s*\)\s*(async\s*)?\{/.test(text) && !/\bfmt\./.test(text)) {
    return named('dart', 'Dart')
  }
  if (/\bdefmodule\s+[A-Z][\w.]*\s+do\b|\bdef\s+\w+(\([^)]*\))?\s+do\b|\bIO\.puts\b/.test(text)) {
    return named('elixir', 'Elixir')
  }
  if (/^\s*module\s+[A-Z][\w.]*(\s*\(.*\))?\s+where\b/m.test(text) || /\bimport\s+qualified\b/.test(text) || /^\s*main\s*(::\s*IO\s*\(\))?\s*=\s*do\b/m.test(text)) {
    return named('haskell', 'Haskell')
  }
  if (/\busing\s+(LinearAlgebra|Statistics|Plots|DataFrames|Random)\b/.test(text) || (/\bfunction\s+\w+\([^)]*::\w+[^)]*\)/.test(text) && /^\s*end\s*$/m.test(text))) {
    return named('julia', 'Julia')
  }
  if (/^\s*proc\s+\w+\*?\([^)]*\)\s*(:\s*[\w\[\]]+)?\s*=/m.test(text) || /\bimport\s+std\//.test(text)) {
    return named('nim', 'Nim')
  }
  if (/^\s*\w+\s*::\s*proc\s*\(/m.test(text) || /import\s+(\w+\s+)?"core:\w+"/.test(text)) return named('odin', 'Odin')
  // Lua: score its idioms; two hits (or one very strong one) are enough.
  {
    const lua: [RegExp, number][] = [
      [/^\s*local\s+(function\s+)?[A-Za-z_]\w*/m, 1],
      [/^\s*local\s+function\s+\w+/m, 1],
      [/\bfunction\s+[A-Za-z_][\w.:]*\s*\([^)]*\)/, 1],
      [/\bthen\s*$|\belseif\b/m, 1],
      [/~=/, 1],
      [/\b(ipairs|pairs)\s*\(/, 1],
      [/\bfor\s+\w+(\s*,\s*\w+)?\s+in\s+[\w.]+\s*\(.*\)\s+do\b/, 2],
      [/\brequire\s*\(?\s*["'][\w./-]+["']\s*\)?/, 1],
      [/^\s*--(?!\[\[)(?!-).*$/m, 1],
      [/\bvim\.(api|opt|fn|cmd|keymap)\b|\blove\.(graphics|load|update|draw)\b/, 3],
      [/\bsetmetatable\s*\(|\bself\.\w+\s*=/, 2],
      [/\.\.\s*["'\w]|["'\w)]\s*\.\.\s/, 1]
    ]
    const luaScore = lua.reduce((n, [re, w]) => n + (re.test(text) ? w : 0), 0)
    if (luaScore >= 3 && /\bend\b/.test(text) && !/[{};]\s*$/m.test(text.replace(/\{[^}]*\}/g, ''))) {
      return named('lua', 'Lua')
    }
    if (luaScore >= 3 && /\bvim\.|\blove\./.test(text)) return named('lua', 'Lua')
  }
  // Ruby: idioms and Rails/Bundler vocabulary scored the same way.
  {
    const ruby: [RegExp, number][] = [
      [/^\s*def\s+\w+[?!=]?(\([^)]*\))?\s*$/m, 1],
      [/^\s*end\s*$/m, 1],
      [/\bdo\s*(\|[^|]*\|)?\s*$/m, 1],
      [/^\s*(class\s+[A-Z]\w*(\s*<\s*[A-Z][\w:]*)?|module\s+[A-Z]\w*)\s*$/m, 2],
      [/\b(puts|attr_accessor|attr_reader|attr_writer|require_relative|unless|elsif)\b/, 2],
      [/\brequire\s+['"][\w/.-]+['"]\s*$/m, 1],
      [/(^|[\s(,]):[a-z_]\w*\s*=>|\b\w+:\s*:[a-z_]\w+/, 1],
      [/@[a-z_]\w*\s*(\|\|)?=/, 1],
      [/\.(each|map|select|reject|times|each_with_index)\s*(do|\{)/, 1],
      [/\b(ActiveRecord|ApplicationRecord|Rails\.|has_many|belongs_to|validates|before_action)\b/, 3],
      [/^\s*(gem|source|group)\s+['":]/m, 3],
      [/#\{[^}]+\}/, 1]
    ]
    const rubyScore = ruby.reduce((n, [re, w]) => n + (re.test(text) ? w : 0), 0)
    if (rubyScore >= 3 && !/[;]\s*$/m.test(text) && !/^\s*(def|class)\s+\w+.*:\s*$/m.test(text)) {
      return named('ruby', 'Ruby')
    }
  }
  if (/^\[[\w.-]+(\.[\w.-]+)*\]\s*$/m.test(text) && /^[A-Za-z_][\w.-]*\s*=\s*\S/m.test(text) && !/[{};]/.test(text)) {
    return named('toml', 'TOML')
  }

  // 5. Bash / Shell Script / Terminal Commands
  if (
    /^#!\/bin\/(bash|sh|zsh)/.test(text) ||
    /^\s*(npm|pnpm|yarn|bun|git|curl|docker|sudo|brew|npx|apt-get|systemctl|cargo|cargo-build|pip|pip3|pytest|vitest)\s+[a-zA-Z0-9_./:-]+/m.test(text) ||
    /^\s*(export\s+[A-Z0-9_]+=|chmod\s+\+?[0-9xrw]+|mkdir\s+-p|rm\s+-rf|grep\s+-)/m.test(text)
  ) {
    return { isCode: true, language: 'bash', displayName: 'Bash' }
  }

  // 6. Python Detection
  if (
    /(?:^|\n)\s*def\s+[a-zA-Z_]\w*\s*\(.*?\)\s*(?:->\s*[^:]+)?\s*:/m.test(text) ||
    /(?:^|\n)\s*class\s+[a-zA-Z_]\w*(?:\(.*?\))?\s*:/m.test(text) ||
    /(?:^|\n)\s*from\s+[a-zA-Z_.]+\s+import\s+/m.test(text) ||
    /(?:^|\n)\s*if\s+__name__\s*==\s*['"]__main__['"]\s*:/m.test(text) ||
    /(?:^|\n)\s*elif\s+[^:]+:/m.test(text) ||
    /\bprint\(.*?\)/m.test(text) && /\b(self|elif|import|None|True|False)\b/.test(text)
  ) {
    return { isCode: true, language: 'python', displayName: 'Python' }
  }

  // 7. Rust Detection
  if (
    /\bfn\s+[a-zA-Z_]\w*\s*\(.*?\)\s*(?:->\s*[^\{]+)?\s*\{/.test(text) ||
    /\b(let\s+mut\s+|impl\s+[A-Z]\w*|pub\s+struct\s+[A-Z]\w*|use\s+std::|match\s+\w+\s*\{|println!\()/.test(text)
  ) {
    return { isCode: true, language: 'rust', displayName: 'Rust' }
  }

  // 8. Go Detection
  if (
    /\bpackage\s+[a-zA-Z_]\w*/.test(text) ||
    /\bfunc\s+(?:\([a-zA-Z0-9_* ]+\)\s+)?[a-zA-Z_]\w*\(.*?\)/.test(text) ||
    /\b(import\s*\(\s*[\r\n]+|fmt\.Print|go\s+func\(\))/.test(text)
  ) {
    return { isCode: true, language: 'go', displayName: 'Go' }
  }

  // 9. C / C++ / C#
  if (
    /#include\s+<[a-zA-Z0-9_.]+>/.test(text) ||
    /\bstd::(cout|cin|vector|string|make_unique|make_shared)\b/.test(text) ||
    /\bint\s+main\s*\([^)]*\)\s*\{/.test(text)
  ) {
    return { isCode: true, language: 'cpp', displayName: 'C++' }
  }

  if (
    /\busing\s+System(\.[A-Za-z0-9_]+)*;/.test(text) ||
    /\bnamespace\s+[A-Za-z0-9_.]+\s*\{/.test(text) ||
    /\b(public|private|protected)\s+(class|interface|enum|struct|async\s+Task)\s+[A-Za-z0-9_]+/.test(text)
  ) {
    return { isCode: true, language: 'csharp', displayName: 'C#' }
  }

  // 10. TypeScript / TSX / JavaScript / JSX
  const hasTsTypes = /:\s*(string|number|boolean|any|void|unknown|never|Record<|Array<|Promise<|React\.[A-Za-z]+)\b/.test(text) ||
    /\b(interface\s+[A-Z]\w*|type\s+[A-Z]\w*\s*=|as\s+const\b|<[A-Z]\w*>\s*\()/.test(text)
  const hasJsx = /<[A-Z][a-zA-Z0-9]*\b[^>]*(\/?>|>[\s\S]*?<\/[A-Z][a-zA-Z0-9]*>)/.test(text) ||
    /<>\s*[\s\S]*?<\/>/.test(text) ||
    /\bclassName=/.test(text) ||
    // lowercase tags count only as markup, not inside a string or regex
    (looksLikeScript && /(^|[^'"`/\w])<[a-z][a-z0-9-]*\b[^<>]*>/.test(text))

  const hasJsKeywords = /\b(import\s+.*?from\s+['"]|export\s+(default\s+|const\s+|function\s+|class\s+)|const\s+[a-zA-Z0-9_$]+(\s*:\s*[^=]+)?\s*=|let\s+[a-zA-Z0-9_$]+(\s*:\s*[^=]+)?\s*=|function\s+[a-zA-Z0-9_$]+\s*\(|console\.(log|error|warn|info)|async\s+function|await\s+[a-zA-Z0-9_$]+|=>\s*[\{\(])/.test(text)

  if (hasJsKeywords || hasJsx || hasTsTypes || looksLikeScript) {
    if (hasJsx) {
      return {
        isCode: true,
        language: hasTsTypes ? 'tsx' : 'jsx',
        displayName: hasTsTypes ? 'TSX' : 'JSX'
      }
    }
    if (hasTsTypes) {
      return { isCode: true, language: 'typescript', displayName: 'TypeScript' }
    }
    return { isCode: true, language: 'javascript', displayName: 'JavaScript' }
  }

  // 10b. YAML: mostly "key: value" / "- item" / comment lines, no braces or semicolons
  const nonEmpty = text.split('\n').filter((l) => l.trim())
  if (nonEmpty.length >= 3 && !/[{};]/.test(text)) {
    const yamlLike = nonEmpty.filter((l) => /^\s*(-\s+\S|[\w."'/-]+:(\s|$)|#)/.test(l)).length
    if (yamlLike / nonEmpty.length >= 0.8 && /^\s*[\w."'/-]+:(\s|$)/m.test(text)) {
      return named('yaml', 'YAML')
    }
  }

  // 10c. Markdown (headings, bold/italic, links, lists, blockquotes)
  if (isMarkdown(text)) {
    return { isCode: true, language: 'markdown', displayName: 'Markdown' }
  }

  // 11. General Code Heuristics (e.g. multi-line structured block with brackets and operators)
  const lines = text.split('\n')
  if (lines.length >= 2) {
    let codeScore = 0
    if (/[{}\[\]();]/.test(text)) codeScore += 2
    if (/===|!==|=>|&&|\|\||\+\+|--|\+=|-=|\*=|\/=|::|->/.test(text)) codeScore += 2
    if (/^\s{2,}|\t/m.test(text)) codeScore += 2
    if (/\b(return|if|else|for|while|switch|case|break|try|catch|throw|new|typeof|instanceof)\b/.test(text)) codeScore += 3
    if (/\b(true|false|null|undefined|NaN)\b/.test(text)) codeScore += 1
    if (/(\/\/|#|\/\*|\*\/)/.test(text)) codeScore += 1

    if (codeScore >= 5) {
      return { isCode: true, language: 'javascript', displayName: 'Code' }
    }
  }

  return { isCode: false, language: 'text', displayName: 'Text' }
}
