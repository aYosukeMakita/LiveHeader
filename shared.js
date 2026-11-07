// background.js と popup.js で共有するフィルター処理
// URL でパーセントエンコードされる ASCII 文字
const PERCENT_ENCODED = { ' ': '%20', '"': '%22', '<': '%3C', '>': '%3E' }
// パスではエンコードされ、クエリでは原文のままになりうる文字 (両方に一致させる)
const ENCODED_OR_RAW = { '{': '%7B', '}': '%7D' }

// フィルター文字列 → 部分一致 + ワイルドカード(*) の正規表現ソース
function patternToRegexSource(pattern) {
  return (
    pattern
      .split('*')
      // regexFilter は ASCII のみ許可され、マッチ対象の URL では非 ASCII が UTF-8 パーセントエンコードされる
      .map(s => s.replace(/[^\x00-\x7F]+/g, encodeURIComponent))
      .map(s => s.replace(/[ "<>]/g, c => PERCENT_ENCODED[c]))
      .map(s =>
        s.replace(/[.+?^${}()|[\]\\\/]/g, c => (c in ENCODED_OR_RAW ? `(?:${ENCODED_OR_RAW[c]}|\\${c})` : '\\' + c)),
      )
      .join('.*')
  )
}

// フィルターの HTTP メソッド選択肢 ('' = 全メソッド)
const HTTP_METHODS = ['', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

// 検証関数はエラーメッセージのキー (_locales 参照) を返す。null は問題なし
const HEADER_NAME_RE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/
const regexSupportCache = new Map()

function headerError(h) {
  const name = h.name.trim()
  return name && !HEADER_NAME_RE.test(name) ? 'errHeaderName' : null
}

async function filterError(f) {
  const pattern = f.pattern.trim()
  if (!pattern) return null
  const regex = patternToRegexSource(pattern)
  if (!regexSupportCache.has(regex)) {
    if (regexSupportCache.size > 200) regexSupportCache.clear()
    regexSupportCache.set(regex, await chrome.declarativeNetRequest.isRegexSupported({ regex, isCaseSensitive: false }))
  }
  const r = regexSupportCache.get(regex)
  if (r.isSupported) return null
  return r.reason === 'memoryLimitExceeded' ? 'errFilterComplex' : 'errFilterSyntax'
}

// 有効な項目のうち問題のあるものを { 項目ID: エラーキー } で返す
async function validateProfile(p) {
  const errors = {}
  for (const h of [...p.requestHeaders, ...p.responseHeaders]) {
    const e = h.enabled && headerError(h)
    if (e) errors[h.id] = e
  }
  for (const f of p.filters) {
    const e = f.enabled && (await filterError(f))
    if (e) errors[f.id] = e
  }
  return errors
}
