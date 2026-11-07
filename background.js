importScripts('shared.js')

const RESOURCE_TYPES = [
  'main_frame',
  'sub_frame',
  'stylesheet',
  'script',
  'image',
  'font',
  'object',
  'xmlhttprequest',
  'ping',
  'csp_report',
  'media',
  'websocket',
  'other',
]

function toHeaderInfo(headers) {
  return headers
    .filter(h => h.enabled && h.name.trim())
    .map(h => ({ header: h.name.trim(), operation: 'set', value: h.value }))
}

function updateBadge(count, error) {
  chrome.action.setBadgeText({ text: error ? '!' : count ? String(count) : '' })
  chrome.action.setBadgeBackgroundColor({ color: error ? '#c62828' : '#1b7f3b' })
}

async function syncRules() {
  const { profiles = [] } = await chrome.storage.local.get('profiles')
  const addRules = []
  let id = 1
  let active = 0
  let failed = false

  for (const p of profiles) {
    if (!p.enabled) continue
    // 不正な項目があるプロファイルは丸ごと適用しない (フィルターだけ外れて全リクエストに適用されるのを防ぐ)
    if (Object.keys(await validateProfile(p)).length) {
      failed = true
      continue
    }
    active++
    // DNR は空配列を受け付けないため、ヘッダーがある側だけ指定する
    const action = { type: 'modifyHeaders' }
    const requestHeaders = toHeaderInfo(p.requestHeaders)
    const responseHeaders = toHeaderInfo(p.responseHeaders)
    if (requestHeaders.length) action.requestHeaders = requestHeaders
    if (responseHeaders.length) action.responseHeaders = responseHeaders
    if (!requestHeaders.length && !responseHeaders.length) continue

    // フィルターごとに 1 ルール。有効なフィルターが 0 件なら全リクエストにマッチ
    const filters = p.filters.filter(f => f.enabled && (f.pattern.trim() || f.method))
    const conditions = filters.length
      ? filters.map(f => {
          const condition = { resourceTypes: RESOURCE_TYPES }
          if (f.method) condition.requestMethods = [f.method.toLowerCase()]
          const pattern = f.pattern.trim()
          if (pattern) {
            condition.regexFilter = patternToRegexSource(pattern)
            condition.isUrlFilterCaseSensitive = false
          }
          return condition
        })
      : [{ resourceTypes: RESOURCE_TYPES }]
    for (const condition of conditions) addRules.push({ id: id++, priority: 1, action, condition })
  }

  const existing = await chrome.declarativeNetRequest.getDynamicRules()
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existing.map(r => r.id),
      addRules,
    })
  } catch (e) {
    failed = true
    console.error('LiveHeader: ルール更新失敗', e)
  }
  updateBadge(active, failed)
}

// 入力ごとに並行実行すると同じルール ID の追加が衝突して更新が失敗するため直列化する
let syncChain = Promise.resolve()
function queueSync() {
  syncChain = syncChain.then(syncRules, syncRules)
}

chrome.runtime.onInstalled.addListener(queueSync)
chrome.runtime.onStartup.addListener(queueSync)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.profiles) queueSync()
})
