/**
 * Translation supplement: strings that are not (yet) part of the big per-language
 * dictionaries in src/i18n/translations.ts. One JSON per language, generated and
 * kept in sync by `npm run i18n:sync` (scripts/i18n-sync.ts).
 *
 * Lookup order used by the app: dictionary[lang] -> supplement[lang] -> dictionary.en -> supplement.en.
 * Shared by the renderer and the Electron main process.
 */
import en from './en.json'
import es from './es.json'
import fr from './fr.json'
import de from './de.json'
import it from './it.json'
import pt from './pt.json'
import ru from './ru.json'
import ja from './ja.json'
import ko from './ko.json'
import zhCN from './zh-CN.json'
import zhTW from './zh-TW.json'
import hi from './hi.json'
import ar from './ar.json'
import fa from './fa.json'
import bn from './bn.json'
import tr from './tr.json'
import vi from './vi.json'
import pl from './pl.json'
import nl from './nl.json'
import sv from './sv.json'
import id from './id.json'
import uk from './uk.json'
import el from './el.json'
import cs from './cs.json'
import ro from './ro.json'
import hu from './hu.json'
import da from './da.json'
import fi from './fi.json'
import th from './th.json'
import he from './he.json'
import no from './no.json'

export type SupplementTree = { [key: string]: string | SupplementTree }

export const SUPPLEMENT: Record<string, SupplementTree> = {
  'en': en,
  'es': es,
  'fr': fr,
  'de': de,
  'it': it,
  'pt': pt,
  'ru': ru,
  'ja': ja,
  'ko': ko,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'hi': hi,
  'ar': ar,
  'fa': fa,
  'bn': bn,
  'tr': tr,
  'vi': vi,
  'pl': pl,
  'nl': nl,
  'sv': sv,
  'id': id,
  'uk': uk,
  'el': el,
  'cs': cs,
  'ro': ro,
  'hu': hu,
  'da': da,
  'fi': fi,
  'th': th,
  'he': he,
  'no': no,
}

/** Reads "a.b.c" from a nested tree; undefined when missing or not a string. */
export function readPath(tree: unknown, path: string): string | undefined {
  let cur: unknown = tree
  for (const part of path.split('.')) {
    if (!cur || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return typeof cur === 'string' ? cur : undefined
}

/** Replaces {name} placeholders. */
export function fillParams(text: string, params?: Record<string, string | number>): string {
  if (!params) return text
  let out = text
  for (const [k, v] of Object.entries(params)) out = out.split(`{${k}}`).join(String(v))
  return out
}
