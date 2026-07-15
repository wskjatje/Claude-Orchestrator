/**
 * 内嵌浏览器 guest preload：元素选取 → 主窗口 IPC
 */
const { ipcRenderer } = require('electron')

let pickerActive = false
let overlay = null
let highlight = null
let badge = null

function ensureOverlay() {
  if (overlay) return overlay
  overlay = document.createElement('div')
  overlay.id = '__workbench_browser_picker'
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:2147483646;cursor:crosshair;background:transparent;'
  highlight = document.createElement('div')
  highlight.style.cssText =
    'position:fixed;pointer-events:none;border:2px solid #2563eb;background:rgba(37,99,235,0.12);z-index:2147483647;display:none;'
  badge = document.createElement('div')
  badge.style.cssText =
    'position:fixed;pointer-events:none;z-index:2147483647;display:none;max-width:280px;padding:2px 8px;border-radius:6px;font:11px/1.4 system-ui,sans-serif;background:#2563eb;color:#fff;'
  overlay.appendChild(highlight)
  overlay.appendChild(badge)
  document.documentElement.appendChild(overlay)
  overlay.addEventListener('mousemove', onMove, true)
  overlay.addEventListener('click', onPick, true)
  return overlay
}

function labelFor(el) {
  const tag = el.tagName.toLowerCase()
  const id = el.id?.trim()
  if (id) return `${id} · ${tag}`
  const cls =
    typeof el.className === 'string'
      ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.')
      : ''
  if (cls) return `${cls} · ${tag}`
  return tag
}

function selectorPath(el) {
  const segments = []
  let node = el
  const root = document.documentElement
  while (node && node !== root && node.nodeType === 1) {
    const tag = node.tagName.toLowerCase()
    if (node.id) {
      segments.unshift(`${tag}#${CSS.escape(node.id)}`)
      break
    }
    const parent = node.parentElement
    if (!parent) {
      segments.unshift(tag)
      break
    }
    const siblings = Array.from(parent.children).filter((c) => c.tagName === node.tagName)
    const idx = siblings.indexOf(node) + 1
    segments.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${idx})` : tag)
    node = parent
  }
  return segments.join(' > ')
}

function onMove(e) {
  if (!pickerActive) return
  const el = document.elementFromPoint(e.clientX, e.clientY)
  if (!el || el === overlay || overlay.contains(el)) {
    highlight.style.display = 'none'
    badge.style.display = 'none'
    return
  }
  const rect = el.getBoundingClientRect()
  highlight.style.display = 'block'
  highlight.style.left = `${rect.x}px`
  highlight.style.top = `${rect.y}px`
  highlight.style.width = `${rect.width}px`
  highlight.style.height = `${rect.height}px`
  badge.style.display = 'block'
  badge.textContent = labelFor(el)
  badge.style.left = `${Math.max(rect.x + 4, 4)}px`
  badge.style.top = `${Math.max(rect.y - 24, 4)}px`
}

function onPick(e) {
  if (!pickerActive) return
  e.preventDefault()
  e.stopPropagation()
  const el = document.elementFromPoint(e.clientX, e.clientY)
  if (!el || el === overlay || overlay.contains(el)) return
  ipcRenderer.send('embedded-browser:element-picked', {
    tag: el.tagName.toLowerCase(),
    label: labelFor(el),
    selector: selectorPath(el),
    textPreview: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200),
    outerHtmlSnippet: (el.outerHTML || '').slice(0, 1200),
    pageUrl: location.href,
  })
  setPicker(false)
}

function setPicker(active) {
  pickerActive = !!active
  if (!pickerActive) {
    overlay?.remove()
    overlay = null
    highlight = null
    badge = null
    return
  }
  ensureOverlay()
}

ipcRenderer.on('embedded-browser:picker', (_e, payload) => {
  setPicker(payload?.active)
})
