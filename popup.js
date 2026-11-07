const TRASH =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>'
const PENCIL =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>'

let state = { profiles: [], selectedId: null, errors: {} }
let renaming = false

const t = (k, ...subs) => chrome.i18n.getMessage(k, subs)
const uid = () => Math.random().toString(36).slice(2, 10)
const $ = s => document.querySelector(s)
const sel = () => state.profiles.find(p => p.id === state.selectedId)

function newProfile() {
  let n = state.profiles.length + 1
  while (state.profiles.some(p => p.name === t('defaultProfileName', n))) n++
  return {
    id: uid(),
    name: t('defaultProfileName', n),
    enabled: true,
    requestHeaders: [],
    responseHeaders: [],
    filters: [],
  }
}

function save() {
  chrome.storage.local.set({ profiles: state.profiles, selectedId: state.selectedId })
  scheduleValidate()
}
function commit(focus) {
  save()
  render()
  focus?.()
}

// 再描画でフォーカスが失われるため、操作後に戻す先をキーボード利用者向けに指定する
const focusSelected = () => $('.pitem.sel .pname')?.focus()
const focusLast = key => [...document.querySelectorAll(`[data-sec="${key}"]`)].pop()?.focus()
const focusAdd = key => $(`[data-add="${key}"]`)?.focus()

function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag)
  for (const [k, v] of Object.entries(props)) {
    if (k === 'html') e.innerHTML = v
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v)
    else if (k === 'class') e.className = v
    else if (k.startsWith('data-') || k.startsWith('aria-') || k === 'role') e.setAttribute(k, v)
    else e[k] = v
  }
  kids.forEach(c => e.append(c))
  return e
}

const errLine = id => el('p', { class: 'errmsg', id: 'err-' + id })

// エラーキー → 赤くする入力欄 (data-f)
const ERR_FIELD = { errHeaderName: 'name', errFilterComplex: 'pattern', errFilterSyntax: 'pattern' }
const hasErrors = id => Object.keys(state.errors[id] || {}).length > 0

let validateTimer
let validateSeq = 0
function scheduleValidate() {
  clearTimeout(validateTimer)
  validateTimer = setTimeout(validateAll, 150)
}
async function validateAll() {
  const seq = ++validateSeq
  const errors = {}
  for (const p of state.profiles) errors[p.id] = await validateProfile(p)
  if (seq !== validateSeq) return
  state.errors = errors
  applyErrors()
}

// 入力中のフォーカスを保つため、再描画せず DOM を直接更新する
// エラーのあるプロファイルは保存値を変えず、トグルを無効表示で固定する
function applyErrors() {
  for (const item of document.querySelectorAll('.pitem')) {
    const p = state.profiles.find(x => x.id === item.dataset.id)
    if (!p) continue
    const blocked = hasErrors(p.id)
    const sw = item.querySelector('input.sw')
    sw.disabled = blocked
    sw.checked = p.enabled && !blocked
    item.classList.toggle('off', !p.enabled || blocked)
    item.querySelector('.pwarn').hidden = !blocked
  }
  const p = sel()
  if (!p) return
  const errors = state.errors[p.id] || {}
  const blocked = hasErrors(p.id)
  const tg = $('#main .toggle')
  if (tg) {
    tg.disabled = blocked
    tg.classList.toggle('on', p.enabled && !blocked)
    tg.setAttribute('aria-checked', String(p.enabled && !blocked))
  }
  const banner = $('#profile-blocked')
  if (banner) banner.textContent = blocked ? t('profileBlocked') : ''
  for (const row of document.querySelectorAll('#main .row[data-item]')) {
    const key = errors[row.dataset.item]
    row.querySelectorAll('.field[data-f]').forEach(f => {
      const bad = !!key && ERR_FIELD[key] === f.dataset.f
      f.classList.toggle('invalid', bad)
      f.setAttribute('aria-invalid', String(bad))
    })
    const msg = $('#err-' + row.dataset.item)
    if (msg) msg.textContent = key ? t(key) : ''
  }
}

function renderList() {
  const list = $('#profileList')
  list.replaceChildren(
    ...state.profiles.map(p =>
      el(
        'div',
        {
          class: 'pitem' + (p.id === state.selectedId ? ' sel' : '') + (p.enabled ? '' : ' off'),
          'data-id': p.id,
          onclick: () => {
            state.selectedId = p.id
            renaming = false
            commit(focusSelected)
          },
        },
        el('input', {
          type: 'checkbox',
          class: 'sw',
          role: 'switch',
          checked: p.enabled,
          title: t('toggle'),
          'aria-label': p.name,
          onclick: e => e.stopPropagation(),
          onchange: e => {
            p.enabled = e.target.checked
            save()
            applyErrors()
          },
        }),
        el(
          'div',
          { class: 'pinfo' },
          el('button', { class: 'pname', textContent: p.name, 'aria-current': String(p.id === state.selectedId) }),
        ),
        el('span', {
          class: 'pwarn',
          textContent: '!',
          hidden: true,
          role: 'img',
          title: t('profileBlocked'),
          'aria-label': t('profileBlocked'),
        }),
        el('button', {
          class: 'icon',
          title: t('delete'),
          'aria-label': t('delete') + ': ' + p.name,
          html: TRASH,
          onclick: e => {
            e.stopPropagation()
            state.profiles = state.profiles.filter(x => x.id !== p.id)
            if (state.selectedId === p.id) state.selectedId = state.profiles[0]?.id ?? null
            commit(() => ($('.pitem.sel .pname') || $('#addProfile')).focus())
          },
        }),
      ),
    ),
  )
}

// ヘッダー一覧セクション (key: 'requestHeaders' | 'responseHeaders')
function renderHeaders(p, key, label) {
  const sec = el(
    'div',
    { class: 'sec' },
    el('h3', { id: 'h-' + key, textContent: label }),
    el('button', {
      class: 'btn',
      'data-add': key,
      'aria-describedby': 'h-' + key,
      textContent: t('addHeader'),
      onclick: () => {
        p[key].push({ id: uid(), enabled: true, name: '', value: '' })
        commit(() => focusLast(key))
      },
    }),
  )
  const rows = p[key].flatMap(h => [
    el(
      'div',
      { class: 'row' + (h.enabled ? '' : ' dis'), 'data-item': h.id },
      el('input', {
        type: 'checkbox',
        role: 'switch',
        checked: h.enabled,
        title: t('toggleHeader'),
        'aria-label': t('toggleHeader'),
        onchange: e => {
          h.enabled = e.target.checked
          e.target.closest('.row').classList.toggle('dis', !h.enabled)
          save()
        },
      }),
      el('input', {
        class: 'field',
        'data-sec': key,
        'data-f': 'name',
        placeholder: t('headerName'),
        'aria-label': t('headerName'),
        'aria-describedby': 'err-' + h.id,
        value: h.name,
        oninput: e => {
          h.name = e.target.value
          save()
        },
      }),
      el('span', { class: 'colon', textContent: ':', 'aria-hidden': 'true' }),
      el('input', {
        class: 'field',
        'data-f': 'value',
        placeholder: t('headerValue'),
        'aria-label': t('headerValue'),
        value: h.value,
        oninput: e => {
          h.value = e.target.value
          save()
        },
      }),
      el('button', {
        class: 'icon',
        title: t('delete'),
        'aria-label': t('delete'),
        html: TRASH,
        onclick: () => {
          p[key] = p[key].filter(x => x !== h)
          commit(() => focusAdd(key))
        },
      }),
    ),
    errLine(h.id),
  ])
  if (!rows.length) rows.push(el('p', { class: 'empty', textContent: t('noHeaders') }))
  return [sec, ...rows]
}

function renderMain() {
  const main = $('#main')
  const p = sel()
  if (!p) {
    main.replaceChildren(el('p', { class: 'empty', textContent: t('noProfiles') }))
    return
  }

  // ヘッダー部 (名前 + 鉛筆 + 有効/無効トグル)
  let title
  if (renaming) {
    const input = el('input', { class: 'rename', value: p.name, 'aria-label': t('rename') })
    const done = (ok, refocus) => {
      if (!renaming) return
      renaming = false
      if (ok && input.value.trim()) p.name = input.value.trim()
      commit(refocus ? () => $('.head .icon')?.focus() : undefined)
    }
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') done(true, true)
      else if (e.key === 'Escape') done(false, true)
    })
    input.addEventListener('blur', () => done(true))
    title = input
    setTimeout(() => {
      input.focus()
      input.select()
    })
  } else {
    title = el('h1', { textContent: p.name, title: p.name })
  }
  const toggleBtn = el(
    'button',
    {
      class: 'toggle' + (p.enabled ? ' on' : ''),
      role: 'switch',
      title: t('toggle'),
      'aria-checked': String(p.enabled),
      'aria-label': p.name,
      'aria-describedby': 'profile-blocked',
      onclick: () => {
        p.enabled = !p.enabled
        save()
        applyErrors() // 再描画すると transition が効かないため DOM 更新のみ
      },
    },
    el('span', { class: 'tlabel off', textContent: t('inactive'), 'aria-hidden': 'true' }),
    el('span', { class: 'tlabel act', textContent: t('active'), 'aria-hidden': 'true' }),
    el('span', { class: 'knob' }),
  )
  const head = el(
    'div',
    { class: 'head' },
    title,
    renaming
      ? ''
      : el('button', {
          class: 'icon',
          title: t('rename'),
          'aria-label': t('rename'),
          html: PENCIL,
          onclick: () => {
            renaming = true
            renderMain()
            applyErrors()
          },
        }),
    toggleBtn,
  )

  // Filters
  const fSec = el(
    'div',
    { class: 'sec' },
    el(
      'div',
      { class: 'sectitle' },
      el('h3', { id: 'h-filters', textContent: t('filters') }),
      el('span', { class: 'hint', id: 'filterHint', textContent: t('filterHint'), title: t('filterHint') }),
    ),
    el('button', {
      class: 'btn',
      'data-add': 'filters',
      'aria-describedby': 'h-filters',
      textContent: t('addFilter'),
      onclick: () => {
        p.filters.push({ id: uid(), enabled: true, method: '', pattern: '' })
        commit(() => focusLast('filters'))
      },
    }),
  )
  const fRows = p.filters.flatMap(f => [
    el(
      'div',
      { class: 'row' + (f.enabled ? '' : ' dis'), 'data-item': f.id },
      el('input', {
        type: 'checkbox',
        role: 'switch',
        checked: f.enabled,
        title: t('toggleFilter'),
        'aria-label': t('toggleFilter'),
        onchange: e => {
          f.enabled = e.target.checked
          e.target.closest('.row').classList.toggle('dis', !f.enabled)
          save()
        },
      }),
      el(
        'select',
        {
          class: 'field method',
          title: t('httpMethod'),
          'aria-label': t('httpMethod'),
          onchange: e => {
            f.method = e.target.value
            save()
          },
        },
        ...HTTP_METHODS.map(m =>
          el('option', { value: m, textContent: m || t('anyMethod'), selected: (f.method || '') === m }),
        ),
      ),
      el('input', {
        class: 'field',
        'data-sec': 'filters',
        'data-f': 'pattern',
        placeholder: '/api/*/items',
        'aria-label': t('filterPattern'),
        'aria-describedby': 'filterHint err-' + f.id,
        value: f.pattern,
        oninput: e => {
          f.pattern = e.target.value
          save()
        },
      }),
      el('button', {
        class: 'icon',
        title: t('delete'),
        'aria-label': t('delete'),
        html: TRASH,
        onclick: () => {
          p.filters = p.filters.filter(x => x !== f)
          commit(() => focusAdd('filters'))
        },
      }),
    ),
    errLine(f.id),
  ])
  if (!fRows.length) fRows.push(el('p', { class: 'empty', textContent: t('noFilters') }))

  main.replaceChildren(
    head,
    el('p', { class: 'errmsg banner', id: 'profile-blocked' }),
    ...renderHeaders(p, 'requestHeaders', t('requestHeaders')),
    ...renderHeaders(p, 'responseHeaders', t('responseHeaders')),
    fSec,
    ...fRows,
  )
}

function render() {
  renderList()
  renderMain()
  applyErrors()
}

async function init() {
  document.documentElement.lang = chrome.i18n.getUILanguage()
  document.querySelectorAll('[data-i18n]').forEach(e => {
    e.textContent = t(e.dataset.i18n)
  })
  const data = await chrome.storage.local.get(['profiles', 'selectedId'])
  state.profiles = data.profiles || []
  state.selectedId = data.selectedId
  if (!state.profiles.length) {
    const p = newProfile()
    state.profiles.push(p)
    state.selectedId = p.id
    save()
  }
  if (!sel()) state.selectedId = state.profiles[0].id
  $('#addProfile').addEventListener('click', () => {
    const p = newProfile()
    state.profiles.push(p)
    state.selectedId = p.id
    renaming = false
    commit(focusSelected)
  })
  render()
  validateAll()
}
init()
