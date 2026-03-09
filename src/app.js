// ============================================
// SOPHRON — app.js
// ============================================

const _api = window.sophron || null

// ── STATE ──────────────────────────────────
let data = {
  tasks: [],
  events: [],
  expenses: [],
  corkboard: { nodes: [], connections: [] },
  flowcharts: { nodes: [], connections: [] },
  settings: { currency: 'MXN', weekStart: 1, savedThemes: [] }
}

let calCurrentDate = new Date()
let calSelectedDate = null
let taskFilter = 'all'
let taskCategoryFilter = 'all'
let taskPriorityFilter = 'all'
let selectedEventColor = '#3B82F6'
let expenseType = 'expense'
let cotizadorItems = []
let editingThemeId = null

// Balance / Timer state
let timerMode = 'work'        // 'work' | 'rest'
let timerRunning = false
let timerSeconds = 0
let timerInterval = null
let timerWorkAlert = false    // ya se mostró alerta de 90min esta sesión
let timerTodayWork = 0        // segundos trabajados hoy
let timerTodayRest = 0        // segundos descansados hoy
let timerSessions = 0

// Wellness state
let mantras = []
let mantraIdx = 0
let breathRunning = false
let breathInterval = null
let breathTech = 'box'
let breathStep = 0
let breathPhaseTime = 0

// Flow state
let flowNodes = []
let flowConnections = []
let flowDragging = null
let flowConnectMode = false
let flowConnectStart = null
let flowTempLine = null
let flowNodeCounter = 0

// Cork state
let corkNodes = []
let corkConnections = []
let corkDragging = null
let corkConnectMode = false
let corkConnectStart = null
let corkNodeCounter = 0

// ── INIT ──────────────────────────────────
async function init() {
  if (_api) {
    data = await _api.loadData()
    if (!data.corkboard) data.corkboard = { nodes: [], connections: [] }
    if (!data.flowcharts) data.flowcharts = { nodes: [], connections: [] }
    if (!data.settings) data.settings = { currency: 'MXN', weekStart: 1 }
    if (!data.settings.savedThemes) data.settings.savedThemes = []
    if (!data.balance) data.balance = { mantras: [], thoughts: [], gratitude: [], mood: [] }
    if (!data.goals) data.goals = { objectives: [] }
    if (!data.notes) data.notes = []
    if (!data.budgets) data.budgets = []
    if (!data.savings) data.savings = []
    if (!data.recurrents) data.recurrents = []
    // Migrate old single customTheme to savedThemes if needed
    if (data.settings.customTheme && data.settings.savedThemes.length === 0) {
      const ct = data.settings.customTheme
      ct.id = 'custom_migrated'
      ct.name = ct.name || 'Mi tema'
      data.settings.savedThemes.push(ct)
    }
    flowNodes = data.flowcharts.nodes || []
    flowConnections = data.flowcharts.connections || []
    corkNodes = data.corkboard.nodes || []
    corkConnections = data.corkboard.connections || []
    flowNodeCounter = flowNodes.length
    corkNodeCounter = corkNodes.length
  }

  setupNav()
  setupWindowControls()
  setupModals()
  setupTasks()
  setupCalendar()
  setupExpenses()
  setupFlow()
  setupCork()
  setupSettings()
  setupDarkMode()
  setupCotizador()
  setupBalance()
  setupExpenseTabs()
  setupBudgets()
  setupRecurrents()
  setupSavings()
  setupNotes()
  setupSync()
  setupGoals()
  setupFocusMode()
  setupUpsideDown()
  setupRickMorty()
  setupStarWars()
  setupMinecraft()
  setupSecretBadges()
  setupNeuro()
  renderDashboard()
  updateDashboardDate()
  startDayWatcher()
}

// ── SAVE ──────────────────────────────────
async function save() {
  data.flowcharts = { nodes: flowNodes, connections: flowConnections }
  data.corkboard = { nodes: corkNodes, connections: corkConnections }
  if (_api) await _api.saveData(data)
}

// ── NAVIGATION ────────────────────────────
function setupNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'))
      item.classList.add('active')
      document.getElementById('view-' + view).classList.add('active')
      if (view === 'dashboard') renderDashboard()
      if (view === 'calendar') renderCalendar()
      if (view === 'expenses') renderExpenses()
      if (view === 'flow') renderFlow()
      if (view === 'cork') renderCork()
    })
  })
}

function setupWindowControls() {
  if (!_api) return
  document.getElementById('btn-minimize').onclick = () => _api.minimize()
  document.getElementById('btn-maximize').onclick = () => _api.maximize()
  document.getElementById('btn-fullscreen').onclick = () => {
    if (_api) _api.fullscreen()
    const btn = document.getElementById('btn-fullscreen')
    const isFs = document.body.classList.toggle('is-fullscreen')
    btn.title = isFs ? 'Salir de pantalla completa' : 'Pantalla completa'
    btn.textContent = isFs ? '⊠' : '⛶'
  }
  document.getElementById('btn-close').onclick = () => _api.close()
}

// ── MODALS ────────────────────────────────
function setupModals() {
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close))
  })
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAllModals()
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllModals()
  })
}

function openModal(id) {
  // ⛏️ Minecraft: interceptar modal de tarea con crafting table
  if (id === 'task' && typeof mcActive !== 'undefined' && mcActive) {
    openMCCrafting()
    return
  }
  const elId = id.startsWith('modal-') ? id : 'modal-' + id
  document.getElementById('modal-overlay').classList.add('open')
  const el = document.getElementById(elId)
  if (el) el.classList.add('open')
}

function closeModal(id) {
  // id may come as "modal-task" or just "task"
  const elId = id.startsWith('modal-') ? id : 'modal-' + id
  const el = document.getElementById(elId)
  if (el) el.classList.remove('open')
  const anyOpen = document.querySelectorAll('.modal.open').length > 0
  if (!anyOpen) document.getElementById('modal-overlay').classList.remove('open')
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'))
  document.getElementById('modal-overlay').classList.remove('open')
}

// ── DASHBOARD ────────────────────────────
function updateDashboardDate() {
  const now = new Date()
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  document.getElementById('dashboard-date').textContent = now.toLocaleDateString('es-MX', opts)
}

function renderDashboard() {
  const currency = data.settings?.currency || 'MXN'

  // Tasks
  const total = data.tasks.length
  const pending = data.tasks.filter(t => !t.done).length
  const done = total - pending
  document.getElementById('dash-tasks-pending').textContent = pending
  document.getElementById('dash-tasks-sub').textContent = `de ${total} totales`
  document.getElementById('dash-tasks-bar').style.width = total > 0 ? `${(done/total)*100}%` : '0%'

  // Events
  const today = new Date().toISOString().split('T')[0]
  const todayEvents = data.events.filter(e => e.date === today)
  document.getElementById('dash-events-today').textContent = todayEvents.length

  const weekEnd = new Date()
  weekEnd.setDate(weekEnd.getDate() + 7)
  const weekEvents = data.events.filter(e => e.date >= today && e.date <= weekEnd.toISOString().split('T')[0])
  document.getElementById('dash-events-week').textContent = weekEvents.length

  // Upcoming
  const upcomingList = document.getElementById('dash-upcoming-list')
  const upcoming = weekEvents.sort((a,b) => a.date.localeCompare(b.date)).slice(0, 4)
  if (upcoming.length === 0) {
    upcomingList.innerHTML = '<div class="bento-empty">Sin eventos próximos</div>'
  } else {
    upcomingList.innerHTML = upcoming.map(e => `
      <div class="bento-list-item">
        <div class="bento-list-dot" style="background:${e.color || '#3B82F6'}"></div>
        <span>${e.title}</span>
        <span style="margin-left:auto;font-size:11px;color:var(--text3)">${formatDate(e.date)}</span>
      </div>
    `).join('')
  }

  // Critical tasks
  const critList = document.getElementById('dash-critical-list')
  const critical = data.tasks.filter(t => !t.done && t.priority === 'high').slice(0, 3)
  if (critical.length === 0) {
    critList.innerHTML = '<div class="bento-empty">Sin tareas críticas</div>'
  } else {
    critList.innerHTML = critical.map(t => `
      <div class="bento-list-item">
        <div class="bento-list-dot" style="background:var(--red)"></div>
        <span>${t.title}</span>
      </div>
    `).join('')
  }

  // Expenses
  const now = new Date()
  const monthExp = data.expenses.filter(e => {
    const d = new Date(e.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const totalExpOut = monthExp.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const totalIncome = data.expenses.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const totalOut = data.expenses.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)

  document.getElementById('dash-expenses-month').textContent = formatCurrency(totalExpOut, currency)
  document.getElementById('dash-expenses-sub').textContent = `${monthExp.length} transacciones`
  document.getElementById('dash-balance').textContent = formatCurrency(totalIncome - totalOut, currency)

  // Charts
  renderTasksCategoryChart()
  renderExpensesCategoryChart()
}

function renderTasksCategoryChart() {
  const canvas = document.getElementById('dash-tasks-chart')
  const legend = document.getElementById('dash-tasks-legend')
  if (!canvas || !legend) return

  const cats = { work: 'Trabajo', personal: 'Personal', health: 'Salud', finance: 'Finanzas', other: 'Otro' }
  const colors = { work: '#206BC4', personal: '#10B981', health: '#EF4444', finance: '#F59E0B', other: '#8B5CF6' }
  const counts = {}
  Object.keys(cats).forEach(k => counts[k] = 0)
  data.tasks.filter(t => !t.done).forEach(t => {
    if (counts[t.category] !== undefined) counts[t.category]++
    else counts.other++
  })
  const total = Object.values(counts).reduce((s, v) => s + v, 0)

  const ctx = canvas.getContext('2d')
  const W = canvas.offsetWidth || 180
  canvas.width = W; canvas.height = 110
  ctx.clearRect(0, 0, W, 110)

  if (total === 0) {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text3') || '#868E96'
    ctx.font = '12px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Sin tareas pendientes', W/2, 55)
    legend.innerHTML = ''
    return
  }

  // Draw donut
  const cx = 55, cy = 55, r = 42, inner = 22
  let startAngle = -Math.PI / 2
  const entries = Object.entries(counts).filter(([,v]) => v > 0)
  entries.forEach(([key, val]) => {
    const angle = (val / total) * 2 * Math.PI
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, r, startAngle, startAngle + angle)
    ctx.closePath()
    ctx.fillStyle = colors[key]
    ctx.fill()
    startAngle += angle
  })
  // Inner hole
  ctx.beginPath()
  ctx.arc(cx, cy, inner, 0, 2 * Math.PI)
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--surface') || '#fff'
  ctx.fill()
  // Center text
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text') || '#212529'
  ctx.font = 'bold 14px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(total, cx, cy + 4)
  ctx.font = '10px Inter, sans-serif'
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text3') || '#868E96'
  ctx.fillText('tareas', cx, cy + 16)

  // Legend
  legend.innerHTML = entries.map(([key, val]) => `
    <div class="chart-legend-item">
      <div class="chart-legend-dot" style="background:${colors[key]}"></div>
      <span>${cats[key]}</span>
      <span class="chart-legend-val">${val}</span>
    </div>
  `).join('')
}

function renderExpensesCategoryChart() {
  const canvas = document.getElementById('dash-exp-chart')
  const legend = document.getElementById('dash-exp-legend')
  if (!canvas || !legend) return

  const now = new Date()
  const monthExp = data.expenses.filter(e => {
    const d = new Date(e.date)
    return e.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const cats = { food: 'Aliment.', transport: 'Transp.', health: 'Salud', entertainment: 'Entret.', work: 'Trabajo', services: 'Servicios', other: 'Otro' }
  const colors = { food: '#F59E0B', transport: '#3B82F6', health: '#EF4444', entertainment: '#8B5CF6', work: '#206BC4', services: '#10B981', other: '#6B7280' }
  const sums = {}
  Object.keys(cats).forEach(k => sums[k] = 0)
  monthExp.forEach(e => {
    if (sums[e.category] !== undefined) sums[e.category] += e.amount
    else sums.other += e.amount
  })

  const entries = Object.entries(sums).filter(([,v]) => v > 0).sort((a,b) => b[1] - a[1])
  const ctx = canvas.getContext('2d')
  const W = canvas.offsetWidth || 180
  canvas.width = W; canvas.height = 110
  ctx.clearRect(0, 0, W, 110)

  if (entries.length === 0) {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text3') || '#868E96'
    ctx.font = '12px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Sin egresos este mes', W/2, 55)
    legend.innerHTML = ''
    return
  }

  const maxVal = entries[0][1]
  const barH = 14, gap = 6, startX = 70, barMaxW = W - startX - 10
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text2') || '#495057'

  entries.slice(0, 5).forEach(([key, val], i) => {
    const y = i * (barH + gap) + 8
    const bw = (val / maxVal) * barMaxW
    ctx.fillStyle = colors[key]
    ctx.beginPath()
    ctx.roundRect ? ctx.roundRect(startX, y, bw, barH, 3) : ctx.fillRect(startX, y, bw, barH)
    ctx.fill()
    ctx.fillStyle = textColor
    ctx.font = '11px Inter, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(cats[key], startX - 6, y + barH - 2)
  })

  legend.innerHTML = entries.slice(0, 5).map(([key, val]) => `
    <div class="chart-legend-item">
      <div class="chart-legend-dot" style="background:${colors[key]}"></div>
      <span>${cats[key]}</span>
      <span class="chart-legend-val">${formatCurrency(val, data.settings?.currency || 'MXN')}</span>
    </div>
  `).join('')
}

// ── TASKS ──────────────────────────────────
function setupTasks() {
  document.getElementById('btn-add-task').onclick = () => {
    document.getElementById('task-id').value = ''
    document.getElementById('task-title').value = ''
    document.getElementById('task-desc').value = ''
    document.getElementById('task-priority').value = 'medium'
    document.getElementById('task-category').value = 'work'
    document.getElementById('task-due').value = ''
    document.getElementById('task-est-h').value = ''
    document.getElementById('task-est-m').value = ''
    document.getElementById('task-recur').value = 'none'
    document.getElementById('modal-task-title').textContent = 'Nueva tarea'
    openModal('task')
  }

  document.getElementById('btn-save-task').onclick = saveTask

  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      taskFilter = btn.dataset.filter
      renderTasks()
    })
  })

  document.getElementById('task-category-filter').onchange = (e) => {
    taskCategoryFilter = e.target.value
    renderTasks()
  }

  document.getElementById('task-priority-filter').onchange = (e) => {
    taskPriorityFilter = e.target.value
    renderTasks()
  }

  renderTasks()
}

function saveTask() {
  const id = document.getElementById('task-id').value
  const title = document.getElementById('task-title').value.trim()
  if (!title) return

  // ⭐ Star Wars easter egg
  const tLow = title.toLowerCase()
  if (tLow === 'use the force') {
    closeModal('task')
    if (typeof swActive !== 'undefined' && !swActive) {
      activateStarWars(false)
    }
    return
  }
  if (tLow === 'i am your father') {
    closeModal('task')
    if (typeof swActive !== 'undefined' && swActive) deactivateStarWars()
    return
  }
  if (tLow === 'join the dark side') {
    closeModal('task')
    if (typeof swActive !== 'undefined' && swActive && !sithActive) activateSith(false)
    return
  }
  if (tLow === 'i am a jedi') {
    closeModal('task')
    if (typeof sithActive !== 'undefined' && sithActive) deactivateSith()
    return
  }
  if (tLow === 'do a barrel roll') {
    closeModal('task')
    triggerBarrelRoll()
    return
  }
  if (tLow === '42') {
    closeModal('task')
    trigger42()
    return
  }
  // ⛏️ Minecraft easter eggs
  if (tLow === 'minecraft') {
    closeModal('task')
    if (typeof mcActive !== 'undefined' && mcActive) deactivateMinecraft()
    else activateMinecraft('overworld', false)
    return
  }
  if (tLow === 'enderman') {
    closeModal('task')
    activateMinecraft('end', false)
    return
  }
  if (tLow === 'piglin') {
    closeModal('task')
    activateMinecraft('nether', false)
    return
  }
  if (tLow === 'leave the game') {
    closeModal('task')
    if (typeof mcActive !== 'undefined' && mcActive) deactivateMinecraft()
    return
  }

  const task = {
    id: id || Date.now().toString(),
    title,
    desc: document.getElementById('task-desc').value.trim(),
    priority: document.getElementById('task-priority').value,
    category: document.getElementById('task-category').value,
    due: document.getElementById('task-due').value,
    estH: parseInt(document.getElementById('task-est-h').value) || 0,
    estM: parseInt(document.getElementById('task-est-m').value) || 0,
    recur: document.getElementById('task-recur').value,
    done: false,
    createdAt: id ? undefined : new Date().toISOString()
  }

  if (id) {
    const idx = data.tasks.findIndex(t => t.id === id)
    if (idx >= 0) {
      task.done = data.tasks[idx].done
      task.createdAt = data.tasks[idx].createdAt
      data.tasks[idx] = task
    }
  } else {
    data.tasks.unshift(task)
  }

  save()
  renderTasks()
  closeModal('task')
}

function renderTasks() {
  let tasks = [...data.tasks]

  if (taskFilter === 'pending') tasks = tasks.filter(t => !t.done)
  if (taskFilter === 'done') tasks = tasks.filter(t => t.done)
  if (taskCategoryFilter !== 'all') tasks = tasks.filter(t => t.category === taskCategoryFilter)
  if (taskPriorityFilter !== 'all') tasks = tasks.filter(t => t.priority === taskPriorityFilter)

  const list = document.getElementById('task-list')
  if (tasks.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)">No hay tareas que mostrar</div>'
    return
  }

  list.innerHTML = tasks.map(t => {
    const today = new Date().toISOString().split('T')[0]
    const isOverdue = t.due && t.due < today && !t.done
    return `
    <div class="task-item ${t.done ? 'done' : ''}" data-id="${t.id}">
      <div class="task-checkbox ${t.done ? 'checked' : ''}" data-check="${t.id}"></div>
      <div class="task-info">
        <div class="task-title">${t.title}</div>
        <div class="task-meta">
          <span class="tag tag-${t.priority}">${priorityLabel(t.priority)}</span>
          <span class="tag tag-${t.category}">${categoryLabel(t.category)}</span>
          ${t.due ? `<span class="task-due ${isOverdue ? 'overdue' : ''}">📅 ${formatDate(t.due)}${isOverdue ? ' · Vencida' : ''}</span>` : ''}
          ${(t.estH || t.estM) ? `<span class="task-time-badge">⏱ ${t.estH ? t.estH+'h ' : ''}${t.estM ? t.estM+'min' : ''}</span>` : ''}
          ${t.recur && t.recur !== 'none' ? `<span class="task-recur-badge">🔄 ${{daily:'Diaria',weekly:'Semanal',monthly:'Mensual'}[t.recur]}</span>` : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="icon-btn" data-edit="${t.id}" title="Editar">✏️</button>
        <button class="icon-btn del" data-del="${t.id}" title="Eliminar">🗑</button>
      </div>
    </div>
  `}).join('')

  list.querySelectorAll('[data-check]').forEach(el => {
    el.onclick = () => toggleTask(el.dataset.check)
  })
  list.querySelectorAll('[data-edit]').forEach(el => {
    el.onclick = () => editTask(el.dataset.edit)
  })
  list.querySelectorAll('[data-del]').forEach(el => {
    el.onclick = () => deleteTask(el.dataset.del)
  })
  if (typeof swActive !== 'undefined' && swActive) attachYodaTooltips()
  if (typeof neuroActive !== 'undefined' && neuroActive) setTimeout(renderNeuroSubtasks, 0)
}

function toggleTask(id) {
  const t = data.tasks.find(t => t.id === id)
  if (t) {
    if (!t.done && !t.doneAt) t.doneAt = new Date().toISOString()
    t.done = !t.done
    if (typeof swActive !== 'undefined' && swActive) {
      if (t.done) {
        if (typeof sithActive !== 'undefined' && sithActive) playPalpatineGood()
        else playSaberHum()
      }
      onTasksRendered_SW()
    }
    save(); renderTasks()
    if (typeof neuroActive !== 'undefined' && neuroActive) {
      setTimeout(renderNeuroStreak, 100)
    }
  }
}

function editTask(id) {
  const t = data.tasks.find(t => t.id === id)
  if (!t) return
  // ⛏️ Minecraft: usar crafting table para editar
  if (typeof mcActive !== 'undefined' && mcActive) {
    openMCCrafting(t)
    return
  }
  document.getElementById('task-id').value = t.id
  document.getElementById('task-title').value = t.title
  document.getElementById('task-desc').value = t.desc || ''
  document.getElementById('task-priority').value = t.priority
  document.getElementById('task-category').value = t.category
  document.getElementById('task-due').value = t.due || ''
  document.getElementById('task-est-h').value = t.estH || ''
  document.getElementById('task-est-m').value = t.estM || ''
  document.getElementById('task-recur').value = t.recur || 'none'
  document.getElementById('modal-task-title').textContent = 'Editar tarea'
  openModal('task')
}

function deleteTask(id) {
  if (typeof sithActive !== 'undefined' && sithActive) playSithThunder()
  else if (typeof swActive !== 'undefined' && swActive) playVaderBreath()
  data.tasks = data.tasks.filter(t => t.id !== id)
  save(); renderTasks()
  if (typeof swActive !== 'undefined' && swActive) onTasksRendered_SW()
}

// ── CALENDAR ──────────────────────────────
function setupCalendar() {
  document.getElementById('btn-add-event').onclick = () => {
    document.getElementById('event-id').value = ''
    document.getElementById('event-title').value = ''
    document.getElementById('event-date').value = calSelectedDate || new Date().toISOString().split('T')[0]
    document.getElementById('event-time').value = ''
    document.getElementById('event-notes').value = ''
    document.getElementById('event-cost').value = ''
    document.getElementById('event-cost-category').value = 'entertainment'
    document.getElementById('event-cost-auto').checked = false
    document.getElementById('event-cost-auto-row').style.display = 'none'
    selectedEventColor = '#3B82F6'
    document.querySelectorAll('.color-opt').forEach(b => b.classList.remove('active'))
    document.querySelector('[data-color="#3B82F6"]').classList.add('active')
    document.getElementById('modal-event-title').textContent = 'Nuevo evento'
    openModal('event')
  }

  document.getElementById('cal-prev').onclick = () => {
    calCurrentDate.setMonth(calCurrentDate.getMonth() - 1)
    renderCalendar()
  }
  document.getElementById('cal-next').onclick = () => {
    calCurrentDate.setMonth(calCurrentDate.getMonth() + 1)
    renderCalendar()
  }
  document.getElementById('cal-today').onclick = () => {
    calCurrentDate = new Date()
    renderCalendar()
  }

  document.querySelectorAll('.color-opt').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.color-opt').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      selectedEventColor = btn.dataset.color
    }
  })

  document.getElementById('btn-save-event').onclick = saveEvent

  document.getElementById('event-cost').addEventListener('input', function () {
    const row = document.getElementById('event-cost-auto-row')
    row.style.display = parseFloat(this.value) > 0 ? 'flex' : 'none'
  })

  renderCalendar()
}

function renderCalendar() {
  const y = calCurrentDate.getFullYear()
  const m = calCurrentDate.getMonth()

  document.getElementById('cal-month-label').textContent =
    calCurrentDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })

  const firstDay = new Date(y, m, 1)
  const lastDay = new Date(y, m + 1, 0)
  let startDow = firstDay.getDay()
  // Adjust for Monday start
  startDow = startDow === 0 ? 6 : startDow - 1

  const grid = document.getElementById('cal-grid')
  grid.innerHTML = ''

  const today = new Date().toISOString().split('T')[0]

  // Prev month days
  for (let i = 0; i < startDow; i++) {
    const d = new Date(y, m, -startDow + i + 1)
    const dateStr = d.toISOString().split('T')[0]
    grid.appendChild(createCalDay(dateStr, d.getDate(), true))
  }

  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(y, m, d)
    const dateStr = date.toISOString().split('T')[0]
    const el = createCalDay(dateStr, d, false)
    if (dateStr === today) el.classList.add('today')
    if (dateStr === calSelectedDate) el.classList.add('selected')
    grid.appendChild(el)
  }

  // Fill remaining
  const totalCells = Math.ceil((startDow + lastDay.getDate()) / 7) * 7
  const nextStart = lastDay.getDate() + 1
  for (let i = 0; i < totalCells - startDow - lastDay.getDate(); i++) {
    const d = new Date(y, m + 1, i + 1)
    const dateStr = d.toISOString().split('T')[0]
    grid.appendChild(createCalDay(dateStr, d.getDate(), true))
  }

  // Update selected day events
  if (calSelectedDate) renderDayEvents(calSelectedDate)
}

function createCalDay(dateStr, num, otherMonth) {
  const el = document.createElement('div')
  el.className = 'cal-day' + (otherMonth ? ' other-month' : '')
  el.dataset.date = dateStr

  const dayEvents = data.events.filter(e => e.date === dateStr)

  el.innerHTML = `
    <div class="cal-day-num">${num}</div>
    ${dayEvents.slice(0, 2).map(e =>
      `<div class="cal-event-dot" style="background:${e.color || '#3B82F6'}">${e.cost ? '💰 ' : ''}${e.title}</div>`
    ).join('')}
    ${dayEvents.length > 2 ? `<div class="cal-event-dot" style="background:var(--text3)">+${dayEvents.length - 2} más</div>` : ''}
  `

  el.onclick = () => {
    calSelectedDate = dateStr
    document.querySelectorAll('.cal-day').forEach(d => d.classList.remove('selected'))
    el.classList.add('selected')
    renderDayEvents(dateStr)
  }

  return el
}

function renderDayEvents(dateStr) {
  const label = document.getElementById('cal-selected-label')
  const list = document.getElementById('cal-day-events')
  const d = new Date(dateStr + 'T00:00:00')
  label.textContent = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })

  const events = data.events.filter(e => e.date === dateStr)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))

  if (events.length === 0) {
    list.innerHTML = '<div class="bento-empty">Sin eventos este día</div>'
    return
  }

  list.innerHTML = events.map(e => `
    <div class="cal-event-item" data-id="${e.id}">
      <div class="cal-event-color" style="background:${e.color || '#3B82F6'}"></div>
      <div class="cal-event-info">
        <div class="cal-event-title">${e.title}</div>
        <div class="cal-event-time">${e.time || 'Sin hora'}${e.notes ? ' · ' + e.notes : ''}${e.cost ? ' · <span style="color:var(--green);font-weight:600">💰 ' + formatCurrency(e.cost, data.settings?.currency || 'MXN') + '</span>' : ''}</div>
      </div>
      <button class="icon-btn del" onclick="deleteEvent('${e.id}')" style="opacity:0.6;font-size:12px">🗑</button>
    </div>
  `).join('')
}

function saveEvent() {
  const id = document.getElementById('event-id').value
  const title = document.getElementById('event-title').value.trim()
  if (!title) return

  const cost = parseFloat(document.getElementById('event-cost').value) || 0
  const costCategory = document.getElementById('event-cost-category').value
  const costAuto = document.getElementById('event-cost-auto').checked

  const event = {
    id: id || Date.now().toString(),
    title,
    date: document.getElementById('event-date').value,
    time: document.getElementById('event-time').value,
    color: selectedEventColor,
    notes: document.getElementById('event-notes').value.trim(),
    cost: cost > 0 ? cost : null,
    costCategory: cost > 0 ? costCategory : null
  }

  if (id) {
    const idx = data.events.findIndex(e => e.id === id)
    if (idx >= 0) data.events[idx] = event
  } else {
    data.events.push(event)
    if (cost > 0 && costAuto) {
      if (!data.expenses) data.expenses = []
      data.expenses.push({
        id: Date.now().toString() + '_ev',
        type: 'expense',
        concept: title,
        amount: cost,
        category: costCategory,
        date: event.date,
        fromEvent: event.id
      })
      renderExpenses()
      renderDashboard()
    }
  }

  save(); renderCalendar(); closeModal('event')
}

function deleteEvent(id) {
  data.events = data.events.filter(e => e.id !== id)
  save(); renderCalendar()
  if (calSelectedDate) renderDayEvents(calSelectedDate)
}

window.deleteEvent = deleteEvent

// ── EXPENSES ──────────────────────────────
function setupExpenses() {
  document.getElementById('btn-add-expense').onclick = () => {
    // Reset to "new" mode
    document.getElementById('expense-concept').value = ''
    document.getElementById('expense-amount').value = ''
    document.getElementById('expense-date').value = new Date().toISOString().split('T')[0]
    document.getElementById('expense-category').value = 'other'
    expenseType = 'expense'
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'))
    document.querySelector('[data-type="expense"]').classList.add('active')
    document.querySelector('#modal-expense .modal-title').textContent = 'Nuevo movimiento'
    const btn = document.getElementById('btn-save-expense')
    btn.textContent = 'Guardar'
    btn.onclick = saveExpense
    openModal('expense')
  }

  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      expenseType = btn.dataset.type
    }
  })

  document.getElementById('btn-save-expense').onclick = saveExpense
  setupExpenseMonthNav()
  renderExpenses()
}

function saveExpense() {
  const concept = document.getElementById('expense-concept').value.trim()
  const amount = parseFloat(document.getElementById('expense-amount').value)
  if (!concept || isNaN(amount) || amount <= 0) return

  const expense = {
    id: Date.now().toString(),
    concept,
    amount,
    date: document.getElementById('expense-date').value,
    category: document.getElementById('expense-category').value,
    type: expenseType
  }

  data.expenses.unshift(expense)
  save(); renderExpenses(); closeModal('expense')
}

// ── Expense history state ─────────────────
let expSelectedMonth = null  // 'YYYY-MM' or null = all
let expCollapsed = {}        // { 'YYYY-MM': true/false }

function getExpenseMonths() {
  const months = [...new Set(
    (data.expenses || []).map(e => e.date ? e.date.slice(0, 7) : null).filter(Boolean)
  )].sort((a, b) => b.localeCompare(a))
  return months
}

function expMonthLabel(ym) {
  if (!ym) return 'Todos los meses'
  const [y, m] = ym.split('-')
  const names = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return `${names[parseInt(m) - 1]} ${y}`
}

function setupExpenseMonthNav() {
  document.getElementById('btn-exp-prev').onclick = () => {
    const months = getExpenseMonths()
    if (!months.length) return
    if (!expSelectedMonth) {
      expSelectedMonth = months[0]
    } else {
      const idx = months.indexOf(expSelectedMonth)
      if (idx < months.length - 1) expSelectedMonth = months[idx + 1]
    }
    renderExpenses()
  }
  document.getElementById('btn-exp-next').onclick = () => {
    const months = getExpenseMonths()
    if (!months.length) return
    if (!expSelectedMonth) return
    const idx = months.indexOf(expSelectedMonth)
    if (idx > 0) expSelectedMonth = months[idx - 1]
    else expSelectedMonth = null
    renderExpenses()
  }
  document.getElementById('btn-exp-all').onclick = () => {
    expSelectedMonth = null
    renderExpenses()
  }
}

function expenseRow(e, currency) {
  return `<tr>
    <td>${formatDate(e.date)}</td>
    <td>${e.concept}${e.fromEvent ? ' <span title="Registrado desde evento de agenda" style="font-size:11px;opacity:.7">📅</span>' : ''}</td>
    <td><span class="tag tag-${e.category}">${expCategoryLabel(e.category)}</span></td>
    <td><span class="exp-type-${e.type}">${e.type === 'income' ? '↑ Ingreso' : '↓ Egreso'}</span></td>
    <td><strong>${e.type === 'income' ? '+' : '-'}${formatCurrency(e.amount, currency)}</strong></td>
    <td style="display:flex;gap:6px">
      <button class="icon-btn" onclick="editExpense('${e.id}')" title="Editar">✏️</button>
      <button class="icon-btn del" onclick="deleteExpense('${e.id}')" title="Eliminar">🗑</button>
    </td>
  </tr>`
}

function renderExpenses() {
  const currency = data.settings?.currency || 'MXN'
  const months   = getExpenseMonths()

  // Determine which expenses to show in stats
  const filtered = expSelectedMonth
    ? (data.expenses || []).filter(e => e.date && e.date.startsWith(expSelectedMonth))
    : (data.expenses || [])

  const income  = filtered.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const outcome = filtered.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)

  document.getElementById('exp-income').textContent  = formatCurrency(income, currency)
  document.getElementById('exp-outcome').textContent = formatCurrency(outcome, currency)
  document.getElementById('exp-count').textContent   = filtered.length

  const bal = document.getElementById('exp-balance')
  bal.textContent  = formatCurrency(income - outcome, currency)
  bal.style.color  = (income - outcome) >= 0 ? 'var(--green)' : 'var(--red)'

  // Month label + nav
  document.getElementById('exp-month-label').textContent = expSelectedMonth
    ? expMonthLabel(expSelectedMonth)
    : 'Todos los meses'

  // Build groups
  const container = document.getElementById('expense-groups')
  if (!container) return

  const groupMonths = expSelectedMonth ? [expSelectedMonth] : months

  if (!groupMonths.length) {
    container.innerHTML = '<div class="empty-state" style="padding:32px;text-align:center;color:var(--text3)">Sin movimientos registrados</div>'
    return
  }

  container.innerHTML = groupMonths.map(ym => {
    const rows = (data.expenses || []).filter(e => e.date && e.date.startsWith(ym))
    if (!rows.length) return ''

    const mIncome  = rows.filter(e => e.type === 'income').reduce((s,e) => s + e.amount, 0)
    const mOutcome = rows.filter(e => e.type === 'expense').reduce((s,e) => s + e.amount, 0)
    const mBal     = mIncome - mOutcome
    const isCollapsed = expCollapsed[ym] ? 'collapsed' : ''
    const bodyHeight  = isCollapsed ? '0' : 'auto'

    return `
    <div class="exp-month-group ${isCollapsed}" id="emg-${ym}">
      <div class="exp-month-group-header" onclick="toggleExpMonth('${ym}')">
        <div class="exp-month-group-title">📅 ${expMonthLabel(ym)}</div>
        <div class="exp-month-group-stats">
          <span class="exp-mstat green">↑ <span class="v">${formatCurrency(mIncome, currency)}</span></span>
          <span class="exp-mstat red">↓ <span class="v">${formatCurrency(mOutcome, currency)}</span></span>
          <span class="exp-mstat bal ${mBal >= 0 ? 'pos' : 'neg'}">= <span class="v">${formatCurrency(mBal, currency)}</span></span>
          <span class="exp-mstat muted">· <span class="v">${rows.length}</span> mov.</span>
        </div>
        <span class="exp-month-chevron">▾</span>
      </div>
      <div class="exp-month-group-body" style="max-height:${isCollapsed ? '0' : '2000px'}">
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Tipo</th><th>Monto</th><th></th></tr></thead>
            <tbody>${rows.map(e => expenseRow(e, currency)).join('')}</tbody>
          </table>
        </div>
      </div>
    </div>`
  }).join('')
}

function toggleExpMonth(ym) {
  expCollapsed[ym] = !expCollapsed[ym]
  const group = document.getElementById(`emg-${ym}`)
  if (!group) return
  const body = group.querySelector('.exp-month-group-body')
  if (expCollapsed[ym]) {
    group.classList.add('collapsed')
    body.style.maxHeight = '0'
  } else {
    group.classList.remove('collapsed')
    body.style.maxHeight = '2000px'
  }
  group.querySelector('.exp-month-chevron').style.transform = expCollapsed[ym] ? 'rotate(-90deg)' : ''
}
window.toggleExpMonth = toggleExpMonth

function deleteExpense(id) {
  data.expenses = data.expenses.filter(e => e.id !== id)
  save(); renderExpenses()
}
window.deleteExpense = deleteExpense

function editExpense(id) {
  const e = data.expenses.find(x => x.id === id)
  if (!e) return

  // Set type buttons
  expenseType = e.type
  document.querySelectorAll('.type-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.type === e.type)
  })

  // Fill fields
  document.getElementById('expense-concept').value  = e.concept
  document.getElementById('expense-amount').value   = e.amount
  document.getElementById('expense-date').value     = e.date
  document.getElementById('expense-category').value = e.category

  // Change save button to update mode
  const btn = document.getElementById('btn-save-expense')
  btn.textContent = 'Actualizar'
  btn.onclick = () => {
    const concept = document.getElementById('expense-concept').value.trim()
    const amount  = parseFloat(document.getElementById('expense-amount').value)
    if (!concept || isNaN(amount) || amount <= 0) return

    const idx = data.expenses.findIndex(x => x.id === id)
    if (idx !== -1) {
      data.expenses[idx] = {
        ...data.expenses[idx],
        concept,
        amount,
        date:     document.getElementById('expense-date').value,
        category: document.getElementById('expense-category').value,
        type:     expenseType
      }
    }
    save(); renderExpenses(); renderDashboard(); closeModal('expense')
    // Reset button back to create mode
    btn.textContent = 'Guardar'
    btn.onclick = saveExpense
  }

  // Change modal title
  document.querySelector('#modal-expense .modal-title').textContent = 'Editar movimiento'
  openModal('expense')
}
window.editExpense = editExpense

// ── COTIZADOR ─────────────────────────────
function setupCotizador() {
  const openCot = () => {
    cotizadorItems = []
    renderCotizador()
    openModal('cotizador')
  }
  const btnExp = document.getElementById('btn-cotizador')
  const btnDash = document.getElementById('btn-dash-cotizador')
  if (btnExp) btnExp.onclick = openCot
  if (btnDash) btnDash.onclick = openCot

  document.getElementById('btn-cot-add').onclick = () => {
    const name = document.getElementById('cot-item-name').value.trim()
    const price = parseFloat(document.getElementById('cot-item-price').value)
    const qty = parseInt(document.getElementById('cot-item-qty').value) || 1
    if (!name || isNaN(price) || price <= 0) return
    cotizadorItems.push({ id: Date.now().toString(), name, price, qty })
    document.getElementById('cot-item-name').value = ''
    document.getElementById('cot-item-price').value = ''
    document.getElementById('cot-item-qty').value = '1'
    renderCotizador()
    document.getElementById('cot-item-name').focus()
  }

  document.getElementById('cot-item-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('cot-item-price').focus()
  })
  document.getElementById('cot-item-price').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-cot-add').click()
  })

  document.getElementById('btn-cot-clear').onclick = () => { cotizadorItems = []; renderCotizador() }

  // MSI toggle show/hide fields
  document.getElementById('cot-msi-enabled').addEventListener('change', renderCotizador)
  document.getElementById('cot-msi-months').addEventListener('change', renderCotizador)
  document.getElementById('cot-msi-rate').addEventListener('input', renderCotizador)

  document.getElementById('btn-cot-register').onclick = () => {
    if (cotizadorItems.length === 0) return
    const today = new Date().toISOString().split('T')[0]
    const msiOn = document.getElementById('cot-msi-enabled').checked
    const msiMonths = parseInt(document.getElementById('cot-msi-months').value)
    cotizadorItems.forEach(item => {
      const total = item.price * item.qty
      let concept = item.name + (item.qty > 1 ? ` x${item.qty}` : '')
      if (msiOn) concept += ` (${msiMonths} MSI)`
      data.expenses.unshift({
        id: Date.now().toString() + Math.random(),
        concept,
        amount: total,
        date: today,
        category: 'other',
        type: 'expense'
      })
    })
    save(); renderExpenses(); renderDashboard()
    cotizadorItems = []
    closeModal('cotizador')
  }
}

function renderCotizador() {
  const currency = data.settings?.currency || 'MXN'
  const income = data.expenses.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const outcome = data.expenses.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const balance = income - outcome

  const total = cotizadorItems.reduce((s, i) => s + i.price * i.qty, 0)
  const after = balance - total

  document.getElementById('cot-balance-now').textContent = formatCurrency(balance, currency)
  document.getElementById('cot-total').textContent = formatCurrency(total, currency)
  document.getElementById('cot-balance-after').textContent = formatCurrency(after, currency)

  // Semáforo
  const ratio = balance > 0 ? total / balance : 1
  const green = document.getElementById('cot-sem-green')
  const yellow = document.getElementById('cot-sem-yellow')
  const red = document.getElementById('cot-sem-red')
  const verdict = document.getElementById('cot-verdict')
  const card = document.getElementById('cot-result-card')

  green.classList.remove('active'); yellow.classList.remove('active'); red.classList.remove('active')

  if (after < 0) {
    red.classList.add('active')
    verdict.textContent = '⛔ No alcanza — quedarías en negativo'
    verdict.style.color = 'var(--red)'
    card.style.borderColor = 'var(--red)'
  } else if (ratio > 0.5) {
    yellow.classList.add('active')
    verdict.textContent = '⚠️ Precaución — usarías más del 50% de tu balance'
    verdict.style.color = 'var(--yellow)'
    card.style.borderColor = 'var(--yellow)'
  } else {
    green.classList.add('active')
    verdict.textContent = '✅ Puedes comprarlo — tu balance lo soporta'
    verdict.style.color = 'var(--green)'
    card.style.borderColor = 'var(--green)'
  }

  if (total === 0) {
    verdict.textContent = 'Agrega artículos para analizar'
    verdict.style.color = 'var(--text3)'
    card.style.borderColor = 'var(--border)'
  }

  const list = document.getElementById('cot-list')
  const empty = document.getElementById('cot-empty')
  if (cotizadorItems.length === 0) {
    list.innerHTML = '<div class="bento-empty" id="cot-empty">Sin artículos — agrega algo arriba</div>'
    return
  }

  list.innerHTML = cotizadorItems.map(item => `
    <div class="cot-item">
      <span class="cot-item-name">${item.name}</span>
      <span class="cot-item-qty">×${item.qty}</span>
      <span class="cot-item-price">${formatCurrency(item.price * item.qty, currency)}</span>
      <button class="icon-btn del" onclick="removeCotItem('${item.id}')">✕</button>
    </div>
  `).join('')

  // --- MSI ---
  const msiOn = document.getElementById('cot-msi-enabled').checked
  const msiFields = document.getElementById('cot-msi-fields')

  msiFields.style.display = msiOn ? 'flex' : 'none'

  if (msiOn && total > 0) {
    const msiMonths = parseInt(document.getElementById('cot-msi-months').value) || 6
    const msiRate   = parseFloat(document.getElementById('cot-msi-rate').value) || 0
    const r = msiRate / 100 / 12

    let monthly, totalPaid, interest
    if (r === 0) {
      monthly   = total / msiMonths
      interest  = 0
      totalPaid = total
    } else {
      monthly   = total * r / (1 - Math.pow(1 + r, -msiMonths))
      totalPaid = monthly * msiMonths
      interest  = totalPaid - total
    }

    document.getElementById('msi-precio-total').textContent   = formatCurrency(total, currency)
    document.getElementById('msi-total-interes').textContent  = formatCurrency(totalPaid, currency)
    document.getElementById('msi-pago-mensual').textContent   = formatCurrency(monthly, currency)
    document.getElementById('msi-pago-quincenal').textContent = formatCurrency(monthly / 2, currency)
    document.getElementById('msi-interes-pagado').textContent = formatCurrency(interest, currency)

    document.getElementById('msi-row-interes').style.display = r > 0 ? 'flex' : 'none'
  }
}

function removeCotItem(id) {
  cotizadorItems = cotizadorItems.filter(i => i.id !== id)
  renderCotizador()
}
window.removeCotItem = removeCotItem

// ── FLOW CHART ────────────────────────────
function setupFlow() {
  document.getElementById('btn-add-node-start').onclick = () => addFlowNode('start', 'Inicio')
  document.getElementById('btn-add-node-process').onclick = () => addFlowNode('process', 'Proceso')
  document.getElementById('btn-add-node-decision').onclick = () => addFlowNode('decision', '¿Decisión?')
  document.getElementById('btn-add-node-end').onclick = () => addFlowNode('end', 'Fin')
  document.getElementById('btn-flow-clear').onclick = () => {
    if (confirm('¿Limpiar todo el diagrama?')) {
      flowNodes = []; flowConnections = []; flowNodeCounter = 0
      save(); renderFlow()
    }
  }

  const connectBtn = document.getElementById('btn-flow-connect')
  connectBtn.onclick = () => {
    flowConnectMode = !flowConnectMode
    connectBtn.classList.toggle('active-mode', flowConnectMode)
    connectBtn.textContent = flowConnectMode ? '✕ Cancelar' : 'Conectar'
    document.getElementById('flow-hint').textContent = flowConnectMode
      ? 'Haz clic en el punto de origen, luego en el destino'
      : 'Agrega nodos y conéctalos arrastrando entre ellos'
  }

  renderFlow()
}

function addFlowNode(type, label) {
  const node = {
    id: 'fn_' + (++flowNodeCounter),
    type,
    label,
    x: 100 + Math.random() * 300,
    y: 100 + Math.random() * 200
  }
  flowNodes.push(node)
  save(); renderFlow()
}

function renderFlow() {
  const canvas = document.getElementById('flow-canvas')
  const svg = document.getElementById('flow-svg')
  canvas.innerHTML = ''
  svg.innerHTML = ''

  // Draw connections
  flowConnections.forEach(conn => {
    const from = flowNodes.find(n => n.id === conn.from)
    const to = flowNodes.find(n => n.id === conn.to)
    if (!from || !to) return

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    const fc = getNodeCenter(from)
    const tc = getNodeCenter(to)
    line.setAttribute('x1', fc.x); line.setAttribute('y1', fc.y)
    line.setAttribute('x2', tc.x); line.setAttribute('y2', tc.y)
    line.setAttribute('stroke', '#868E96')
    line.setAttribute('stroke-width', '2')
    line.setAttribute('marker-end', 'url(#arrow)')
    svg.appendChild(line)
  })

  // Arrow marker
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker')
  marker.setAttribute('id', 'arrow')
  marker.setAttribute('markerWidth', '10'); marker.setAttribute('markerHeight', '7')
  marker.setAttribute('refX', '9'); marker.setAttribute('refY', '3.5')
  marker.setAttribute('orient', 'auto')
  const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
  poly.setAttribute('points', '0 0, 10 3.5, 0 7')
  poly.setAttribute('fill', '#868E96')
  marker.appendChild(poly); defs.appendChild(marker); svg.appendChild(defs)

  // Draw nodes
  flowNodes.forEach(node => {
    const el = document.createElement('div')
    el.className = `flow-node type-${node.type}`
    el.dataset.id = node.id
    el.style.left = node.x + 'px'
    el.style.top = node.y + 'px'

    el.innerHTML = `
      <div class="flow-node-inner">
        <span class="flow-node-text">${node.label}</span>
        <div class="flow-connector top" data-dir="top" data-id="${node.id}"></div>
        <div class="flow-connector bottom" data-dir="bottom" data-id="${node.id}"></div>
        <div class="flow-connector left" data-dir="left" data-id="${node.id}"></div>
        <div class="flow-connector right" data-dir="right" data-id="${node.id}"></div>
      </div>
    `

    // Drag
    let isDragging = false, ox, oy
    el.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('flow-connector')) return
      if (flowConnectMode) return
      isDragging = true
      const rect = canvas.getBoundingClientRect()
      ox = e.clientX - rect.left - node.x
      oy = e.clientY - rect.top - node.y
      e.stopPropagation()
    })

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return
      const rect = canvas.getBoundingClientRect()
      node.x = e.clientX - rect.left - ox
      node.y = e.clientY - rect.top - oy
      el.style.left = node.x + 'px'
      el.style.top = node.y + 'px'
      renderFlowConnections()
    })

    document.addEventListener('mouseup', () => {
      if (isDragging) { isDragging = false; save() }
    })

    // Connect
    el.querySelectorAll('.flow-connector').forEach(conn => {
      conn.addEventListener('click', (e) => {
        e.stopPropagation()
        if (!flowConnectMode) return
        if (!flowConnectStart) {
          flowConnectStart = node.id
          conn.style.background = '#F59F00'
          document.getElementById('flow-hint').textContent = 'Ahora haz clic en el nodo destino'
        } else {
          if (flowConnectStart !== node.id) {
            flowConnections.push({ from: flowConnectStart, to: node.id, id: Date.now().toString() })
            save()
          }
          flowConnectStart = null
          flowConnectMode = false
          document.getElementById('btn-flow-connect').classList.remove('active-mode')
          document.getElementById('btn-flow-connect').textContent = 'Conectar'
          document.getElementById('flow-hint').textContent = 'Agrega nodos y conéctalos'
          renderFlow()
        }
      })
    })

    // Double click to rename
    el.addEventListener('dblclick', () => {
      const newLabel = prompt('Nombre del nodo:', node.label)
      if (newLabel) { node.label = newLabel; save(); renderFlow() }
    })

    // Right click to delete
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      if (confirm('¿Eliminar nodo?')) {
        flowNodes = flowNodes.filter(n => n.id !== node.id)
        flowConnections = flowConnections.filter(c => c.from !== node.id && c.to !== node.id)
        save(); renderFlow()
      }
    })

    canvas.appendChild(el)
  })
}

function renderFlowConnections() {
  const svg = document.getElementById('flow-svg')
  svg.querySelectorAll('line').forEach(l => {
    const connId = l.dataset.conn
    const conn = flowConnections.find(c => c.id === connId)
    if (conn) {
      const from = flowNodes.find(n => n.id === conn.from)
      const to = flowNodes.find(n => n.id === conn.to)
      if (from && to) {
        const fc = getNodeCenter(from), tc = getNodeCenter(to)
        l.setAttribute('x1', fc.x); l.setAttribute('y1', fc.y)
        l.setAttribute('x2', tc.x); l.setAttribute('y2', tc.y)
      }
    }
  })
}

function getNodeCenter(node) {
  return { x: node.x + 70, y: node.y + 24 }
}

// ── CORK BOARD ────────────────────────────
function setupCork() {
  document.getElementById('btn-cork-note').onclick = () => addCorkNote()
  document.getElementById('btn-cork-photo').onclick = () => addCorkPhoto()
  document.getElementById('btn-cork-clear').onclick = () => {
    if (confirm('¿Limpiar el tablero?')) {
      corkNodes = []; corkConnections = []; corkNodeCounter = 0
      save(); renderCork()
    }
  }

  const connectBtn = document.getElementById('btn-cork-connect')
  connectBtn.onclick = () => {
    corkConnectMode = !corkConnectMode
    connectBtn.classList.toggle('active-mode', corkConnectMode)
    connectBtn.textContent = corkConnectMode ? '✕ Cancelar hilo' : 'Hilo rojo'
  }
}

function addCorkNote() {
  const node = {
    id: 'cn_' + (++corkNodeCounter),
    type: 'note',
    text: 'Nota...',
    x: 80 + Math.random() * 400,
    y: 80 + Math.random() * 300,
    rot: (Math.random() * 6 - 3).toFixed(1)
  }
  corkNodes.push(node)
  save(); renderCork()
}

async function addCorkPhoto() {
  let src = null
  if (_api) {
    src = await _api.openImage()
  } else {
    src = prompt('URL de imagen:')
  }
  if (!src) return

  const node = {
    id: 'cn_' + (++corkNodeCounter),
    type: 'photo',
    src,
    label: 'Foto',
    x: 80 + Math.random() * 400,
    y: 80 + Math.random() * 300,
    rot: (Math.random() * 4 - 2).toFixed(1)
  }
  corkNodes.push(node)
  save(); renderCork()
}

function renderCork() {
  const board = document.getElementById('cork-board')
  const svg = document.getElementById('cork-svg')
  board.innerHTML = ''
  svg.innerHTML = ''

  // Draw strings
  corkConnections.forEach(conn => {
    const from = corkNodes.find(n => n.id === conn.from)
    const to = corkNodes.find(n => n.id === conn.to)
    if (!from || !to) return
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', from.x + 70); line.setAttribute('y1', from.y + 10)
    line.setAttribute('x2', to.x + 70); line.setAttribute('y2', to.y + 10)
    line.setAttribute('stroke', '#8B0000')
    line.setAttribute('stroke-width', '1.5')
    line.setAttribute('opacity', '0.7')
    svg.appendChild(line)
  })

  corkNodes.forEach(node => {
    const el = document.createElement('div')
    el.className = 'cork-item'
    el.style.left = node.x + 'px'
    el.style.top = node.y + 'px'
    el.dataset.id = node.id

    if (node.type === 'note') {
      el.innerHTML = `
        <div class="cork-pin"></div>
        <textarea class="cork-note" style="--rot:${node.rot}deg">${node.text}</textarea>
        <div class="cork-item-actions">
          <button class="cork-action-btn del" data-del="${node.id}">✕</button>
        </div>
      `
      el.querySelector('textarea').addEventListener('blur', (e) => {
        node.text = e.target.value; save()
      })
    } else {
      el.innerHTML = `
        <div class="cork-pin"></div>
        <div class="cork-photo-wrap" style="--rot:${node.rot}deg">
          <img class="cork-photo" src="${node.src}" alt="">
          <div class="cork-photo-label">${node.label}</div>
        </div>
        <div class="cork-item-actions">
          <button class="cork-action-btn del" data-del="${node.id}">✕</button>
        </div>
      `
    }

    // Delete
    el.querySelector('[data-del]').onclick = (e) => {
      e.stopPropagation()
      corkNodes = corkNodes.filter(n => n.id !== node.id)
      corkConnections = corkConnections.filter(c => c.from !== node.id && c.to !== node.id)
      save(); renderCork()
    }

    // Drag
    let isDragging = false, ox, oy
    el.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return
      if (corkConnectMode) {
        // Connect mode
        if (!corkConnectStart) {
          corkConnectStart = node.id
          el.style.outline = '2px solid #8B0000'
        } else if (corkConnectStart !== node.id) {
          corkConnections.push({ from: corkConnectStart, to: node.id, id: Date.now().toString() })
          corkConnectStart = null
          corkConnectMode = false
          document.getElementById('btn-cork-connect').classList.remove('active-mode')
          document.getElementById('btn-cork-connect').textContent = 'Hilo rojo'
          save(); renderCork()
        }
        return
      }
      isDragging = true
      const rect = document.getElementById('cork-board').getBoundingClientRect()
      ox = e.clientX - rect.left - node.x
      oy = e.clientY - rect.top - node.y
      e.preventDefault()
    })

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return
      const rect = document.getElementById('cork-board').getBoundingClientRect()
      node.x = e.clientX - rect.left - ox
      node.y = e.clientY - rect.top - oy
      el.style.left = node.x + 'px'
      el.style.top = node.y + 'px'
      renderCorkConnections()
    })

    document.addEventListener('mouseup', () => {
      if (isDragging) { isDragging = false; save() }
    })

    board.appendChild(el)
  })
}

function renderCorkConnections() {
  document.getElementById('cork-svg').querySelectorAll('line').forEach(l => l.remove())
  corkConnections.forEach(conn => {
    const from = corkNodes.find(n => n.id === conn.from)
    const to = corkNodes.find(n => n.id === conn.to)
    if (!from || !to) return
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', from.x + 70); line.setAttribute('y1', from.y + 10)
    line.setAttribute('x2', to.x + 70); line.setAttribute('y2', to.y + 10)
    line.setAttribute('stroke', '#8B0000')
    line.setAttribute('stroke-width', '1.5')
    line.setAttribute('opacity', '0.7')
    document.getElementById('cork-svg').appendChild(line)
  })
}

// ── SETTINGS ──────────────────────────────
function setupSettings() {
  document.getElementById('setting-currency').value = data.settings?.currency || 'MXN'
  document.getElementById('setting-currency').onchange = (e) => {
    data.settings.currency = e.target.value; save()
  }
  document.getElementById('setting-week-start').value = data.settings?.weekStart || 1
  document.getElementById('setting-week-start').onchange = (e) => {
    data.settings.weekStart = parseInt(e.target.value); save()
  }

  document.querySelectorAll('.btn-export-fmt').forEach(btn => {
    btn.onclick = () => {
      if (btn.dataset.fmt === 'exe') {
        // 🔒 Easter egg: Toggle Windows XP theme
        const isXP = document.body.classList.contains('theme-winxp')
        document.body.classList.add('xp-booting')
        setTimeout(() => document.body.classList.remove('xp-booting'), 520)
        if (isXP) {
          applyTheme('default')
        } else {
          applyTheme('winxp')
        }
        return
      }
      exportData(btn.dataset.fmt)
    }
  })

  setupThemes()
}

function exportData(fmt) {
  const currency = data.settings?.currency || 'MXN'
  const filename = 'sophron-export'

  if (fmt === 'json') {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    downloadBlob(blob, filename + '.json')
    return
  }

  if (fmt === 'txt') {
    let txt = 'SOPHRON — Exportación\n' + new Date().toLocaleString('es-MX') + '\n'
    txt += '\n═══ TAREAS ═══\n'
    data.tasks.forEach(t => {
      txt += `[${t.done ? 'X' : ' '}] ${t.title} | ${priorityLabel(t.priority)} | ${categoryLabel(t.category)}`
      if (t.due) txt += ` | Vence: ${formatDate(t.due)}`
      txt += '\n'
    })
    txt += '\n═══ EVENTOS ═══\n'
    data.events.sort((a,b) => a.date.localeCompare(b.date)).forEach(e => {
      txt += `${formatDate(e.date)} ${e.time || ''} — ${e.title}\n`
    })
    txt += '\n═══ GASTOS ═══\n'
    const inc = data.expenses.filter(e => e.type === 'income').reduce((s,e) => s+e.amount, 0)
    const out = data.expenses.filter(e => e.type === 'expense').reduce((s,e) => s+e.amount, 0)
    txt += `Balance: ${formatCurrency(inc - out, currency)} | Ingresos: ${formatCurrency(inc, currency)} | Egresos: ${formatCurrency(out, currency)}\n\n`
    data.expenses.forEach(e => {
      txt += `${formatDate(e.date)} | ${e.type === 'income' ? '+' : '-'}${formatCurrency(e.amount, currency)} | ${e.concept} | ${expCategoryLabel(e.category)}\n`
    })
    downloadBlob(new Blob([txt], { type: 'text/plain' }), filename + '.txt')
    return
  }

  if (fmt === 'csv') {
    let csv = 'Sección,Fecha,Concepto/Título,Categoría,Tipo,Monto,Estado\n'
    data.tasks.forEach(t => {
      csv += `Tarea,${t.due || ''},${t.title},${categoryLabel(t.category)},,, ${t.done ? 'Completada' : 'Pendiente'}\n`
    })
    data.events.forEach(e => {
      csv += `Evento,${e.date},${e.title},,,,\n`
    })
    data.expenses.forEach(e => {
      csv += `Gasto,${e.date},${e.concept},${expCategoryLabel(e.category)},${e.type === 'income' ? 'Ingreso' : 'Egreso'},${e.amount},\n`
    })
    downloadBlob(new Blob([csv], { type: 'text/csv' }), filename + '.csv')
    return
  }

  if (fmt === 'html') {
    const inc = data.expenses.filter(e => e.type === 'income').reduce((s,e) => s+e.amount, 0)
    const out = data.expenses.filter(e => e.type === 'expense').reduce((s,e) => s+e.amount, 0)
    let html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>SOPHRON — Reporte</title>
<style>body{font-family:sans-serif;max-width:900px;margin:0 auto;padding:24px;background:#f8f9fa;color:#212529}
h1{color:#206BC4}h2{color:#495057;margin-top:24px}
table{width:100%;border-collapse:collapse;margin-top:8px}
th{background:#206BC4;color:#fff;padding:8px 12px;text-align:left}
td{padding:7px 12px;border-bottom:1px solid #dee2e6}tr:nth-child(even){background:#f1f3f5}
.badge{padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600}
.inc{background:#EDFAEF;color:#2FB344}.out{background:#FFF0F0;color:#D63939}
.summary{display:flex;gap:16px;margin:12px 0}
.stat{background:#fff;border:1px solid #dee2e6;border-radius:8px;padding:12px 20px}
.stat-v{font-size:20px;font-weight:700}</style></head><body>
<h1>📊 SOPHRON — Reporte exportado</h1><p>${new Date().toLocaleString('es-MX')}</p>
<h2>Finanzas</h2>
<div class="summary">
<div class="stat"><div>Ingresos</div><div class="stat-v" style="color:#2FB344">${formatCurrency(inc,currency)}</div></div>
<div class="stat"><div>Egresos</div><div class="stat-v" style="color:#D63939">${formatCurrency(out,currency)}</div></div>
<div class="stat"><div>Balance</div><div class="stat-v">${formatCurrency(inc-out,currency)}</div></div>
</div>
<table><thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Tipo</th><th>Monto</th></tr></thead><tbody>
${data.expenses.map(e=>`<tr><td>${formatDate(e.date)}</td><td>${e.concept}</td><td>${expCategoryLabel(e.category)}</td>
<td><span class="badge ${e.type==='income'?'inc':'out'}">${e.type==='income'?'Ingreso':'Egreso'}</span></td>
<td><strong>${e.type==='income'?'+':'-'}${formatCurrency(e.amount,currency)}</strong></td></tr>`).join('')}
</tbody></table>
<h2>Tareas (${data.tasks.length})</h2>
<table><thead><tr><th>Título</th><th>Prioridad</th><th>Categoría</th><th>Estado</th><th>Vence</th></tr></thead><tbody>
${data.tasks.map(t=>`<tr><td>${t.title}</td><td>${priorityLabel(t.priority)}</td><td>${categoryLabel(t.category)}</td>
<td>${t.done?'✅ Completada':'⏳ Pendiente'}</td><td>${t.due?formatDate(t.due):'—'}</td></tr>`).join('')}
</tbody></table>
<h2>Eventos (${data.events.length})</h2>
<table><thead><tr><th>Fecha</th><th>Hora</th><th>Título</th></tr></thead><tbody>
${data.events.sort((a,b)=>a.date.localeCompare(b.date)).map(e=>`<tr><td>${formatDate(e.date)}</td><td>${e.time||'—'}</td><td>${e.title}</td></tr>`).join('')}
</tbody></table></body></html>`
    downloadBlob(new Blob([html], { type: 'text/html' }), filename + '.html')
    return
  }

  if (fmt === 'xlsx' || fmt === 'ods') {
    if (typeof XLSX === 'undefined') { alert('Librería XLSX no disponible'); return }
    const wb = XLSX.utils.book_new()

    const taskRows = [['Título','Descripción','Prioridad','Categoría','Estado','Vence','Creado']]
    data.tasks.forEach(t => taskRows.push([t.title, t.desc||'', priorityLabel(t.priority), categoryLabel(t.category), t.done?'Completada':'Pendiente', t.due||'', t.createdAt?new Date(t.createdAt).toLocaleDateString('es-MX'):'']))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(taskRows), 'Tareas')

    const eventRows = [['Fecha','Hora','Título','Notas']]
    data.events.sort((a,b)=>a.date.localeCompare(b.date)).forEach(e => eventRows.push([e.date, e.time||'', e.title, e.notes||'']))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(eventRows), 'Eventos')

    const expRows = [['Fecha','Concepto','Categoría','Tipo','Monto']]
    data.expenses.forEach(e => expRows.push([e.date, e.concept, expCategoryLabel(e.category), e.type==='income'?'Ingreso':'Egreso', e.type==='income'?e.amount:-e.amount]))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(expRows), 'Gastos')

    const bookType = fmt === 'ods' ? 'ods' : 'xlsx'
    XLSX.writeFile(wb, filename + '.' + fmt, { bookType })
    return
  }

  if (fmt === 'pdf') {
    if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') { alert('Librería PDF no disponible'); return }
    const { jsPDF } = window.jspdf
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const currency = data.settings?.currency || 'MXN'
    let y = 20

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(32, 107, 196)
    doc.text('SOPHRON — Reporte', 20, y)
    y += 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(new Date().toLocaleString('es-MX'), 20, y)
    y += 10

    // Gastos summary
    const inc = data.expenses.filter(e => e.type === 'income').reduce((s,e) => s+e.amount, 0)
    const out = data.expenses.filter(e => e.type === 'expense').reduce((s,e) => s+e.amount, 0)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(33)
    doc.text('Resumen Financiero', 20, y); y += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Ingresos: ${formatCurrency(inc, currency)}`, 20, y); y += 5
    doc.text(`Egresos: ${formatCurrency(out, currency)}`, 20, y); y += 5
    doc.text(`Balance: ${formatCurrency(inc-out, currency)}`, 20, y); y += 10

    // Tareas
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(`Tareas (${data.tasks.length})`, 20, y); y += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    data.tasks.slice(0, 30).forEach(t => {
      if (y > 270) { doc.addPage(); y = 20 }
      doc.text(`${t.done ? '[X]' : '[ ]'} ${t.title} — ${categoryLabel(t.category)} / ${priorityLabel(t.priority)}`, 22, y); y += 5
    })
    y += 5

    // Eventos
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    if (y > 260) { doc.addPage(); y = 20 }
    doc.text(`Eventos (${data.events.length})`, 20, y); y += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    data.events.sort((a,b)=>a.date.localeCompare(b.date)).slice(0,30).forEach(e => {
      if (y > 270) { doc.addPage(); y = 20 }
      doc.text(`${e.date} ${e.time||''} — ${e.title}`, 22, y); y += 5
    })

    doc.save(filename + '.pdf')
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  a.click(); URL.revokeObjectURL(url)
}

// ── TEMAS ─────────────────────────────────
const THEME_CLASSES = ['theme-pastel','theme-empire','theme-rickmorty','theme-vaporwave','theme-custom','theme-winxp','dark','theme-starwars','theme-matrix','theme-retrointernet','theme-hitchhiker','theme-minecraft']

function applyTheme(themeName, themeId) {
  setTimeout(() => { if (mandalaCtx) drawMandala() }, 80)
  destroyXPExtras()
  if (upsideDownActive) deactivateUpsideDown()
  if (rmActive) deactivateRickMorty()
  if (typeof swActive !== 'undefined' && swActive) deactivateStarWars()
  if (typeof mcActive !== 'undefined' && mcActive) deactivateMinecraft()
  document.body.classList.remove(...THEME_CLASSES, 'has-bg-image')
  document.body.style.backgroundImage = ''
  // Clear custom vars
  const r = document.documentElement
  ;['--ct-bg','--ct-surface','--ct-surface-bg','--ct-accent','--ct-text','--ct-text2','--ct-text3',
    '--ct-border','--ct-border2','--ct-sidebar-bg','--ct-titlebar-bg'].forEach(v => r.style.removeProperty(v))
  // Clear inline neon overrides so CSS class rules take over for hardcoded themes
  const appName = document.querySelector('.app-name')
  if (appName) { appName.style.textShadow = ''; appName.style.color = '' }

  if (themeName === 'default') {
    // clean
  } else if (themeName === 'dark') {
    document.body.classList.add('dark')
  } else if (themeName === 'pastel') {
    document.body.classList.add('theme-pastel')
  } else if (themeName === 'empire') {
    document.body.classList.add('theme-empire')
    const img = data.settings.themeImages?.empire
    if (img) { document.body.classList.add('has-bg-image'); document.body.style.backgroundImage = `url("${img}")` }
  } else if (themeName === 'rickmorty') {
    document.body.classList.add('theme-rickmorty')
    const img = data.settings.themeImages?.rickmorty
    if (img) { document.body.classList.add('has-bg-image'); document.body.style.backgroundImage = `url("${img}")` }
  } else if (themeName === 'vaporwave') {
    document.body.classList.add('theme-vaporwave')
    const img = data.settings.themeImages?.vaporwave
    if (img) { document.body.classList.add('has-bg-image'); document.body.style.backgroundImage = `url("${img}")` }
  } else if (themeName === 'winxp') {
    document.body.classList.add('theme-winxp', 'has-bg-image')
    document.body.style.backgroundImage = `url("${XP_WALLPAPER}")`
    setTimeout(() => { initXPExtras(); showClippyMsg() }, 600)
    playXPStartup()
    unlockBadge('winxp')
  } else if (themeName === 'saved' && themeId) {
    const ct = data.settings.savedThemes.find(t => t.id === themeId)
    if (ct) applyCustomThemeVars(ct)
  } else if (themeName === 'matrix') {
    document.body.classList.add('theme-matrix', 'has-bg-image')
    document.body.style.backgroundImage = `url("${window.ASSETS?.matrix?.rain || './assets/matrix-rain.gif'}")`
  } else if (themeName === 'retrointernet') {
    document.body.classList.add('theme-retrointernet')
  } else if (themeName === 'hitchhiker') {
    document.body.classList.add('theme-hitchhiker', 'has-bg-image')
    document.body.style.backgroundImage = `url("${window.ASSETS?.hitchhiker?.bg || './assets/themes/hitchhiker-bg.jpg'}")`
  }

  document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'))
  const active = document.querySelector(`[data-theme="${themeName}"]${themeId ? `[data-theme-id="${themeId}"]` : ''}`)
  if (active) active.classList.add('active')

  if (!data.settings) data.settings = {}
  data.settings.activeTheme = themeName
  data.settings.activeThemeId = themeId || null
  save()
}

function applyCustomThemeVars(ct) {
  document.body.classList.add('theme-custom')
  if (ct.bgImage) { document.body.classList.add('has-bg-image'); document.body.style.backgroundImage = `url("${ct.bgImage}")` }
  const r = document.documentElement
  const hexToRgba = (hex, opacity) => {
    const rr = parseInt(hex.slice(1,3),16), gg = parseInt(hex.slice(3,5),16), bb = parseInt(hex.slice(5,7),16)
    return `rgba(${rr},${gg},${bb},${opacity})`
  }
  if (ct.bg) r.style.setProperty('--ct-bg', ct.bg)
  if (ct.surface) {
    const op = (ct.cardOpacity !== undefined ? ct.cardOpacity : 100) / 100
    r.style.setProperty('--ct-surface', op < 1 ? hexToRgba(ct.surface, op) : ct.surface)
    r.style.setProperty('--ct-surface2', op < 1 ? hexToRgba(ct.surface, Math.max(0, op - 0.1)) : ct.surface)
  }
  if (ct.accent) { r.style.setProperty('--ct-accent', ct.accent); r.style.setProperty('--ct-accent-light', ct.accent + '22') }
  if (ct.text) r.style.setProperty('--ct-text', ct.text)
  if (ct.text2) r.style.setProperty('--ct-text2', ct.text2)
  if (ct.border) { r.style.setProperty('--ct-border', ct.border); r.style.setProperty('--ct-border2', ct.border) }
  if (ct.sidebar) {
    const op = (ct.sidebarOpacity !== undefined ? ct.sidebarOpacity : 100) / 100
    r.style.setProperty('--ct-sidebar-bg', hexToRgba(ct.sidebar, op))
  }
  if (ct.titlebar) {
    const op = (ct.titlebarOpacity !== undefined ? ct.titlebarOpacity : 100) / 100
    r.style.setProperty('--ct-titlebar-bg', hexToRgba(ct.titlebar, op))
  }
  // Neon
  const appName = document.querySelector('.app-name')
  if (appName) {
    if (ct.neonEnabled && ct.neon1) {
      const blur = ct.neonBlur || 10
      const shadow = `0 0 ${blur}px ${ct.neon1}` + (ct.neon2 ? `, 0 0 ${blur*2}px ${ct.neon2}` : '')
      appName.style.textShadow = shadow
      appName.style.color = ct.neon1
    } else {
      appName.style.textShadow = ''
      appName.style.color = ''
    }
  }
}

// Valores base de los temas hardcodeados para pre-poblar el builder
const HARDCODED_THEME_PRESETS = {
  default: { name: 'Default', bg: '#F8F9FA', surface: '#FFFFFF', accent: '#206BC4', text: '#212529', text2: '#495057', border: '#E9ECEF', sidebar: '#FFFFFF', titlebar: '#FFFFFF', sidebarOpacity: 100, cardOpacity: 100, titlebarOpacity: 100, neonEnabled: false, neon1: '#39FF14', neon2: '#00BFFF', neonBlur: 10 },
  dark: { name: 'Dark', bg: '#141414', surface: '#1E1E1E', accent: '#206BC4', text: '#E8E8E8', text2: '#A0A0A0', border: '#2E2E2E', sidebar: '#1E1E1E', titlebar: '#1A1A1A', sidebarOpacity: 100, cardOpacity: 100, titlebarOpacity: 100, neonEnabled: false, neon1: '#206BC4', neon2: '#0A4A8A', neonBlur: 10 },
  pastel: { name: 'Rosa Pastel', bg: '#FFF0F5', surface: '#FFFFFF', accent: '#E91E8C', text: '#4A1040', text2: '#8B4070', border: '#FFCCE0', sidebar: '#FFE4EF', titlebar: '#FFE4EF', sidebarOpacity: 100, cardOpacity: 100, titlebarOpacity: 100, neonEnabled: false, neon1: '#E91E8C', neon2: '#FF71CE', neonBlur: 8 },
  empire: { name: 'Imperio', bg: '#0A0A0A', surface: '#120000', accent: '#CC0000', text: '#E8E0D0', text2: '#B0A090', border: '#3A0000', sidebar: '#0A0000', titlebar: '#080000', sidebarOpacity: 85, cardOpacity: 88, titlebarOpacity: 100, neonEnabled: false, neon1: '#CC0000', neon2: '#FF6600', neonBlur: 10 },
  rickmorty: { name: 'Rick & Morty', bg: '#0D1A0D', surface: '#0A1C0F', accent: '#39FF14', text: '#C8FFD0', text2: '#80C890', border: '#1A4025', sidebar: '#050A0A', titlebar: '#0A1A0A', sidebarOpacity: 88, cardOpacity: 88, titlebarOpacity: 100, neonEnabled: true, neon1: '#39FF14', neon2: '#00BFFF', neonBlur: 10 },
  vaporwave: { name: 'Vaporwave', bg: '#1A0533', surface: '#230541', accent: '#FF71CE', text: '#FFE0FF', text2: '#CCA0EE', border: '#5A1A8A', sidebar: '#14032D', titlebar: '#1A0533', sidebarOpacity: 88, cardOpacity: 88, titlebarOpacity: 100, neonEnabled: true, neon1: '#FF71CE', neon2: '#B967FF', neonBlur: 10 },
}

function setupThemes() {
  if (!data.settings) data.settings = {}
  if (!data.settings.themeImages) data.settings.themeImages = {}
  if (!data.settings.savedThemes) data.settings.savedThemes = []

  const saved = data.settings.activeTheme || 'default'
  const savedId = data.settings.activeThemeId || null
  applyTheme(saved, savedId)

  updateImageBadges()
  renderSavedThemes()

  document.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('theme-img-btn') || e.target.dataset.themeImg || e.target.dataset.editTheme) return
      if (card.id === 'btn-new-custom-theme-card') { openCustomThemeBuilder(null, null); return }
      applyTheme(card.dataset.theme, card.dataset.themeId || null)
    })
  })

  // Edit buttons for hardcoded themes
  document.querySelectorAll('[data-edit-theme]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const themeKey = btn.dataset.editTheme
      openCustomThemeBuilder(null, HARDCODED_THEME_PRESETS[themeKey])
    })
  })

  document.querySelectorAll('.theme-img-btn[data-theme-img]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation()
      const themeId = btn.dataset.themeImg
      let imgData = null
      if (_api) imgData = await _api.openImage()
      if (imgData) {
        if (!data.settings.themeImages) data.settings.themeImages = {}
        data.settings.themeImages[themeId] = imgData
        save(); updateImageBadges(); updateThemePreviews()
        if (data.settings.activeTheme === themeId) applyTheme(themeId)
      }
    })
  })

  document.getElementById('btn-new-custom-theme-card').addEventListener('click', () => openCustomThemeBuilder(null, null))
}

function renderSavedThemes() {
  const themes = data.settings.savedThemes || []
  const section = document.getElementById('saved-themes-section')
  const grid = document.getElementById('saved-themes-grid')
  if (!section || !grid) return

  if (themes.length === 0) { section.style.display = 'none'; return }
  section.style.display = ''

  grid.innerHTML = themes.map(ct => {
    const isActive = data.settings.activeTheme === 'saved' && data.settings.activeThemeId === ct.id
    const bgStyle = ct.bgImage ? `background-image:url("${ct.bgImage}");background-size:cover` : `background:${ct.bg || '#F8F9FA'}`
    const sidebarOp = (ct.sidebarOpacity !== undefined ? ct.sidebarOpacity : 100) / 100
    const r = parseInt((ct.sidebar||'#ffffff').slice(1,3),16)
    const g = parseInt((ct.sidebar||'#ffffff').slice(3,5),16)
    const b = parseInt((ct.sidebar||'#ffffff').slice(5,7),16)
    const sidebarBg = `rgba(${r},${g},${b},${sidebarOp})`
    return `
    <div class="theme-card theme-card-custom ${isActive ? 'active' : ''}" data-theme="saved" data-theme-id="${ct.id}">
      <div class="theme-preview" style="${bgStyle}">
        <div class="theme-prev-sidebar" style="background:${sidebarBg};border-right:2px solid ${ct.border||'#E9ECEF'}"></div>
        <div class="theme-prev-content">
          <div class="theme-prev-bar" style="background:${ct.accent||'#206BC4'}"></div>
          <div class="theme-prev-bar" style="background:${ct.border||'#E9ECEF'};width:60%"></div>
        </div>
      </div>
      <div class="theme-name">${ct.name || 'Sin nombre'} ${ct.neonEnabled ? '✨' : ''}</div>
      <div class="theme-saved-actions">
        <button class="theme-img-btn" onclick="editSavedTheme('${ct.id}');event.stopPropagation()">Editar</button>
        <button class="theme-img-btn danger-btn" onclick="deleteSavedTheme('${ct.id}');event.stopPropagation()">Eliminar</button>
      </div>
    </div>`
  }).join('')

  // re-bind click on saved theme cards
  grid.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') return
      applyTheme('saved', card.dataset.themeId)
    })
  })
}

function editSavedTheme(id) {
  openCustomThemeBuilder(id)
}

function deleteSavedTheme(id) {
  if (!confirm('¿Eliminar este tema guardado?')) return
  data.settings.savedThemes = data.settings.savedThemes.filter(t => t.id !== id)
  if (data.settings.activeThemeId === id) applyTheme('default')
  save(); renderSavedThemes()
}
window.editSavedTheme = editSavedTheme
window.deleteSavedTheme = deleteSavedTheme

function updateImageBadges() {
  const imgs = data.settings.themeImages || {}
  ;['empire','rickmorty','vaporwave'].forEach(id => {
    const badge = document.getElementById(id + '-img-status')
    if (badge) badge.textContent = imgs[id] ? '✓ Imagen cargada' : 'Sin imagen'
  })
}

function updateThemePreviews() {
  const imgs = data.settings.themeImages || {}
  ;['empire','rickmorty','vaporwave'].forEach(id => {
    const prev = document.getElementById(id + '-preview')
    if (prev && imgs[id]) {
      prev.style.backgroundImage = `url("${imgs[id]}")`
      prev.style.backgroundSize = 'cover'
      prev.style.backgroundPosition = 'center'
    }
  })
}

// ── CUSTOM THEME BUILDER ─────────────────
let customBgImage = null

function openCustomThemeBuilder(themeId, preset) {
  editingThemeId = themeId
  let ct = preset || {}
  if (themeId) {
    ct = data.settings.savedThemes.find(t => t.id === themeId) || preset || {}
  }
  customBgImage = ct.bgImage || null

  const fields = {
    'ct-bg': ct.bg || '#F8F9FA',
    'ct-surface': ct.surface || '#FFFFFF',
    'ct-accent': ct.accent || '#206BC4',
    'ct-text': ct.text || '#212529',
    'ct-text2': ct.text2 || '#495057',
    'ct-border': ct.border || '#E9ECEF',
    'ct-sidebar': ct.sidebar || '#FFFFFF',
    'ct-titlebar': ct.titlebar || '#FFFFFF',
  }

  Object.entries(fields).forEach(([id, val]) => {
    const col = document.getElementById(id)
    const hex = document.getElementById(id + '-hex')
    if (col) col.value = val
    if (hex) hex.value = val
  })

  document.getElementById('custom-theme-name').value = ct.name || ''
  document.getElementById('ct-sidebar-opacity').value = ct.sidebarOpacity !== undefined ? ct.sidebarOpacity : 100
  document.getElementById('ct-card-opacity').value = ct.cardOpacity !== undefined ? ct.cardOpacity : 100
  document.getElementById('ct-titlebar-opacity').value = ct.titlebarOpacity !== undefined ? ct.titlebarOpacity : 100
  document.getElementById('ct-sidebar-opacity-val').textContent = (ct.sidebarOpacity !== undefined ? ct.sidebarOpacity : 100) + '%'
  document.getElementById('ct-card-opacity-val').textContent = (ct.cardOpacity !== undefined ? ct.cardOpacity : 100) + '%'
  document.getElementById('ct-titlebar-opacity-val').textContent = (ct.titlebarOpacity !== undefined ? ct.titlebarOpacity : 100) + '%'

  // Neon
  document.getElementById('ct-neon-enabled').checked = ct.neonEnabled || false
  document.getElementById('ct-neon1').value = ct.neon1 || '#39FF14'
  document.getElementById('ct-neon1-hex').value = ct.neon1 || '#39FF14'
  document.getElementById('ct-neon2').value = ct.neon2 || '#00BFFF'
  document.getElementById('ct-neon2-hex').value = ct.neon2 || '#00BFFF'
  document.getElementById('ct-neon-blur').value = ct.neonBlur || 10
  document.getElementById('ct-neon-blur-val').textContent = (ct.neonBlur || 10) + 'px'
  toggleNeonControls(ct.neonEnabled || false)

  const zone = document.getElementById('custom-img-zone')
  if (customBgImage) {
    zone.style.backgroundImage = `url("${customBgImage}")`
    zone.style.backgroundSize = 'cover'
    document.getElementById('custom-img-label').style.display = 'none'
  } else {
    zone.style.backgroundImage = ''
    document.getElementById('custom-img-label').style.display = ''
  }

  updateCustomPreview()
  openModal('custom-theme')

  const colorIds = ['ct-bg','ct-surface','ct-accent','ct-text','ct-text2','ct-border','ct-sidebar','ct-titlebar']
  colorIds.forEach(id => {
    const col = document.getElementById(id)
    const hex = document.getElementById(id + '-hex')
    if (col && hex) {
      col.oninput = () => { hex.value = col.value; updateCustomPreview() }
      hex.oninput = () => {
        if (/^#[0-9A-Fa-f]{6}$/.test(hex.value)) col.value = hex.value
        updateCustomPreview()
      }
    }
  })

  const neonColorIds = ['ct-neon1','ct-neon2']
  neonColorIds.forEach(id => {
    const col = document.getElementById(id)
    const hex = document.getElementById(id + '-hex')
    if (col && hex) {
      col.oninput = () => { hex.value = col.value; updateCustomPreview() }
      hex.oninput = () => {
        if (/^#[0-9A-Fa-f]{6}$/.test(hex.value)) col.value = hex.value
        updateCustomPreview()
      }
    }
  })

  ;['ct-sidebar-opacity','ct-card-opacity','ct-titlebar-opacity'].forEach(id => {
    document.getElementById(id).oninput = (e) => {
      document.getElementById(id + '-val').textContent = e.target.value + '%'
      updateCustomPreview()
    }
  })

  document.getElementById('ct-neon-blur').oninput = (e) => {
    document.getElementById('ct-neon-blur-val').textContent = e.target.value + 'px'
    updateCustomPreview()
  }

  document.getElementById('ct-neon-enabled').onchange = (e) => {
    toggleNeonControls(e.target.checked)
    updateCustomPreview()
  }

  document.getElementById('custom-img-zone').onclick = () => document.getElementById('btn-custom-img').click()
  document.getElementById('btn-custom-img').onclick = async () => {
    let imgData = null
    if (_api) imgData = await _api.openImage()
    if (imgData) {
      customBgImage = imgData
      const zone = document.getElementById('custom-img-zone')
      zone.style.backgroundImage = `url("${imgData}")`;  zone.style.backgroundSize = 'cover'
      document.getElementById('custom-img-label').style.display = 'none'
      updateCustomPreview()
    }
  }

  document.getElementById('btn-save-custom-theme').onclick = saveCustomTheme
}

function toggleNeonControls(enabled) {
  const ctrl = document.getElementById('neon-controls')
  const label = document.getElementById('neon-preview-label')
  if (ctrl) ctrl.style.display = enabled ? '' : 'none'
  if (label) label.style.display = enabled ? '' : 'none'
}

function getCustomThemeValues() {
  const hexToRgba = (hex, opacity) => {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
    return `rgba(${r},${g},${b},${opacity})`
  }
  const sidebarOp = parseInt(document.getElementById('ct-sidebar-opacity').value) / 100
  const cardOp = parseInt(document.getElementById('ct-card-opacity').value) / 100
  const titlebarOp = parseInt(document.getElementById('ct-titlebar-opacity').value) / 100
  const sidebarColor = document.getElementById('ct-sidebar').value
  const titlebarColor = document.getElementById('ct-titlebar').value
  return {
    name: document.getElementById('custom-theme-name').value || 'Mi tema',
    bg: document.getElementById('ct-bg').value,
    surface: document.getElementById('ct-surface').value,
    accent: document.getElementById('ct-accent').value,
    text: document.getElementById('ct-text').value,
    text2: document.getElementById('ct-text2').value,
    border: document.getElementById('ct-border').value,
    sidebar: sidebarColor,
    sidebarBg: hexToRgba(sidebarColor, sidebarOp),
    sidebarOpacity: parseInt(document.getElementById('ct-sidebar-opacity').value),
    cardOpacity: parseInt(document.getElementById('ct-card-opacity').value),
    titlebar: titlebarColor,
    titlebarBg: hexToRgba(titlebarColor, titlebarOp),
    titlebarOpacity: parseInt(document.getElementById('ct-titlebar-opacity').value),
    bgImage: customBgImage || null,
    neonEnabled: document.getElementById('ct-neon-enabled').checked,
    neon1: document.getElementById('ct-neon1').value,
    neon2: document.getElementById('ct-neon2').value,
    neonBlur: parseInt(document.getElementById('ct-neon-blur').value),
  }
}

function updateCustomPreview() {
  const ct = getCustomThemeValues()
  const win = document.getElementById('custom-preview-window')
  const sidebar = document.getElementById('cpw-sidebar')
  const main = document.getElementById('cpw-main')
  const titlebar = document.getElementById('cpw-titlebar')
  const card1 = document.getElementById('cpw-card1')
  const card2 = document.getElementById('cpw-card2')
  const navActive = document.getElementById('cpw-nav-active')
  const logo = document.getElementById('cpw-logo')

  win.style.background = ct.bgImage ? `url("${ct.bgImage}") center/cover` : ct.bg
  sidebar.style.background = ct.sidebarBg
  sidebar.style.borderRight = `2px solid ${ct.border}`
  main.style.background = 'transparent'
  if (titlebar) {
    titlebar.style.background = ct.titlebarBg
    titlebar.style.borderBottom = `1px solid ${ct.border}`
  }

  const cardOp = ct.cardOpacity / 100
  const hexToRgba = (hex, op) => {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
    return `rgba(${r},${g},${b},${op})`
  }
  const cardBg = cardOp < 1 ? hexToRgba(ct.surface, cardOp) : ct.surface
  card1.style.background = cardBg; card1.style.borderColor = ct.border
  card2.style.background = cardBg; card2.style.borderColor = ct.border
  navActive.style.background = ct.accent + '55'

  if (logo) {
    if (ct.neonEnabled && ct.neon1) {
      const blur = ct.neonBlur || 10
      logo.style.color = ct.neon1
      logo.style.textShadow = `0 0 ${blur}px ${ct.neon1}` + (ct.neon2 ? `, 0 0 ${blur*2}px ${ct.neon2}` : '')
    } else {
      logo.style.color = ct.accent
      logo.style.textShadow = ''
    }
  }
}

function saveCustomTheme() {
  const ct = getCustomThemeValues()
  if (!data.settings.savedThemes) data.settings.savedThemes = []

  if (editingThemeId) {
    const idx = data.settings.savedThemes.findIndex(t => t.id === editingThemeId)
    if (idx >= 0) { ct.id = editingThemeId; data.settings.savedThemes[idx] = ct }
    else { ct.id = editingThemeId; data.settings.savedThemes.push(ct) }
  } else {
    ct.id = 'custom_' + Date.now()
    data.settings.savedThemes.push(ct)
  }

  save()
  applyTheme('saved', ct.id)
  renderSavedThemes()
  closeModal('custom-theme')
  editingThemeId = null
}

// ── HELPERS ───────────────────────────────
function formatDate(str) {
  if (!str) return '—'
  const d = new Date(str + 'T00:00:00')
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

function formatCurrency(amount, currency) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: currency || 'MXN', minimumFractionDigits: 0 }).format(amount)
}

function priorityLabel(p) {
  return { high: '● Alta', medium: '● Media', low: '● Baja' }[p] || p
}

function categoryLabel(c) {
  return { work: 'Trabajo', personal: 'Personal', health: 'Salud', finance: 'Finanzas', other: 'Otro' }[c] || c
}

function expCategoryLabel(c) {
  return { food: 'Alimentación', transport: 'Transporte', health: 'Salud', entertainment: 'Entretenimiento', work: 'Trabajo', services: 'Servicios', other: 'Otro' }[c] || c
}


// ── DARK MODE ─────────────────────────────
function setupDarkMode() {
  // Dark mode button now just switches to dark theme
  document.getElementById('btn-darkmode').onclick = () => {
    const current = data.settings?.activeTheme || 'default'
    if (current === 'dark') {
      applyTheme('default')
    } else {
      applyTheme('dark')
    }
  }
}

// ── BALANCE ───────────────────────────────

// ── TIMER ─────────────────────────────────
const WORK_ALERT_SECS = 90 * 60   // 90 minutos
const REST_SECS = 20 * 60         // 20 minutos de descanso

const BREATH_TECHNIQUES = {
  box:  { name: 'Box 4-4-4-4', phases: [{ label: 'Inhala', secs: 4 }, { label: 'Mantén', secs: 4 }, { label: 'Exhala', secs: 4 }, { label: 'Mantén', secs: 4 }] },
  '478':{ name: '4-7-8', phases: [{ label: 'Inhala', secs: 4 }, { label: 'Mantén', secs: 7 }, { label: 'Exhala', secs: 8 }] },
  calm: { name: 'Calma 5-5', phases: [{ label: 'Inhala', secs: 5 }, { label: 'Exhala', secs: 5 }] },
}

function setupBalance() {
  if (!data.balance) data.balance = { mantras: [], thoughts: [], gratitude: [], mood: [] }
  mantras = data.balance.mantras || []

  // Timer controls
  document.getElementById('btn-timer-toggle').onclick = toggleTimer
  document.getElementById('btn-timer-reset').onclick = resetTimer
  document.getElementById('btn-timer-skip').onclick = skipTimer

  document.querySelectorAll('.timer-mode-btn').forEach(btn => {
    btn.onclick = () => {
      if (timerRunning) return
      setTimerMode(btn.dataset.mode)
    }
  })

  // Alert modal buttons
  document.getElementById('btn-alert-dismiss').onclick = () => {
    closeModal('timer-alert')
    timerWorkAlert = true
  }
  document.getElementById('btn-alert-rest').onclick = () => {
    closeModal('timer-alert')
    timerWorkAlert = true
    setTimerMode('rest')
    startTimer()
  }

  // Breath
  document.querySelectorAll('.breath-tech-btn').forEach(btn => {
    btn.onclick = () => {
      if (breathRunning) stopBreath()
      document.querySelectorAll('.breath-tech-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      breathTech = btn.dataset.tech
    }
  })
  document.getElementById('btn-breath-toggle').onclick = () => {
    if (breathRunning) stopBreath()
    else startBreath()
  }

  // Mood
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.onclick = () => saveMood(parseInt(btn.dataset.mood))
  })

  // Gratitude
  document.getElementById('btn-save-gratitude').onclick = saveGratitude

  // Mantras
  document.getElementById('btn-mantra-add').onclick = addMantra
  document.getElementById('mantra-input').addEventListener('keydown', e => { if (e.key === 'Enter') addMantra() })
  document.getElementById('btn-mantra-prev').onclick = () => { if (mantras.length) { mantraIdx = (mantraIdx - 1 + mantras.length) % mantras.length; renderMantra() } }
  document.getElementById('btn-mantra-next').onclick = () => { if (mantras.length) { mantraIdx = (mantraIdx + 1) % mantras.length; renderMantra() } }

  // Thoughts
  const today = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  document.getElementById('thought-date').textContent = today
  const todayKey = new Date().toISOString().split('T')[0]
  const existing = (data.balance.thoughts || []).find(t => t.date === todayKey)
  if (existing) document.getElementById('thought-textarea').value = existing.text
  document.getElementById('btn-save-thought').onclick = saveThought
  document.getElementById('btn-thought-history').onclick = toggleThoughtHistory

  renderTimerDisplay()
  renderTimerStats()
  renderMoodTracker()
  renderGratitudeToday()
  renderGratitudeHistory()
  renderMantra()
  setupBubbleGame()
  setupMandalaGame()
}

// ── TIMER LOGIC ───────────────────────────
function setTimerMode(mode) {
  timerMode = mode
  timerSeconds = 0
  timerWorkAlert = false
  document.querySelectorAll('.timer-mode-btn').forEach(b => b.classList.remove('active'))
  document.getElementById('timer-btn-' + mode).classList.add('active')
  renderTimerDisplay()
  updateTimerRing()
}

function toggleTimer() {
  if (timerRunning) pauseTimer()
  else startTimer()
}

function startTimer() {
  timerRunning = true
  document.getElementById('btn-timer-toggle').textContent = '⏸ Pausar'
  document.getElementById('btn-timer-toggle').classList.add('timer-running')
  timerInterval = setInterval(() => {
    timerSeconds++
    if (timerMode === 'work') {
      timerTodayWork++
      if (timerSeconds >= WORK_ALERT_SECS && !timerWorkAlert) {
        timerWorkAlert = true
        showTimerAlert('work_long')
      }
    } else {
      timerTodayRest++
      if (timerSeconds >= REST_SECS) {
        pauseTimer()
        timerSessions++
        timerSeconds = 0
        renderTimerStats()
        showTimerAlert('rest_done')
        return
      }
    }
    renderTimerDisplay()
    updateTimerRing()
    renderTimerStats()
  }, 1000)
}

function pauseTimer() {
  timerRunning = false
  clearInterval(timerInterval)
  timerInterval = null
  document.getElementById('btn-timer-toggle').textContent = '▶ Reanudar'
  document.getElementById('btn-timer-toggle').classList.remove('timer-running')
}

function resetTimer() {
  pauseTimer()
  timerSeconds = 0
  timerWorkAlert = false
  document.getElementById('btn-timer-toggle').textContent = '▶ Iniciar'
  renderTimerDisplay()
  updateTimerRing()
}

function skipTimer() {
  pauseTimer()
  timerSeconds = 0
  timerWorkAlert = false
  const next = timerMode === 'work' ? 'rest' : 'work'
  setTimerMode(next)
}

function showTimerAlert(type) {
  const icon = document.getElementById('timer-alert-icon')
  const title = document.getElementById('timer-alert-title')
  const msg = document.getElementById('timer-alert-msg')
  const btnRest = document.getElementById('btn-alert-rest')
  const btnDismiss = document.getElementById('btn-alert-dismiss')

  if (type === 'work_long') {
    icon.textContent = '🧠'
    title.textContent = '¡Llevas 90 minutos trabajando!'
    msg.textContent = 'Tu mente necesita un descanso para rendir mejor. ¿Qué tal 20 minutos?'
    btnRest.style.display = ''
    btnDismiss.textContent = 'Seguir trabajando'
  } else {
    icon.textContent = '✅'
    title.textContent = '¡Descanso terminado!'
    msg.textContent = 'Tus 20 minutos de descanso terminaron. Es hora de volver al trabajo.'
    btnRest.style.display = 'none'
    btnDismiss.textContent = 'Regresar al trabajo'
    btnDismiss.onclick = () => {
      closeModal('timer-alert')
      setTimerMode('work')
      startTimer()
      // restore dismiss behavior
      document.getElementById('btn-alert-dismiss').onclick = () => {
        closeModal('timer-alert')
        timerWorkAlert = true
      }
    }
  }
  openModal('timer-alert')
}

function renderTimerDisplay() {
  const mins = Math.floor(timerSeconds / 60).toString().padStart(2, '0')
  const secs = (timerSeconds % 60).toString().padStart(2, '0')
  document.getElementById('timer-display').textContent = `${mins}:${secs}`
  document.getElementById('timer-label-mode').textContent = timerMode === 'work' ? 'TRABAJO' : 'DESCANSO'
  const sub = timerMode === 'work'
    ? (timerRunning ? 'sesión activa' : 'en pausa')
    : (timerRunning ? `máx ${REST_SECS/60} min` : 'en pausa')
  document.getElementById('timer-label-sub').textContent = sub
  const ring = document.getElementById('timer-ring')
  if (ring) {
    ring.className.baseVal = timerMode === 'work' ? 'timer-ring-progress work' : 'timer-ring-progress rest'
  }
}

function updateTimerRing() {
  const ring = document.getElementById('timer-ring')
  if (!ring) return
  const circumference = 2 * Math.PI * 88
  ring.style.strokeDasharray = circumference
  let progress = 0
  if (timerMode === 'work') {
    progress = Math.min(timerSeconds / WORK_ALERT_SECS, 1)
  } else {
    progress = Math.min(timerSeconds / REST_SECS, 1)
  }
  ring.style.strokeDashoffset = circumference * (1 - progress)
}

function renderTimerStats() {
  const wm = Math.floor(timerTodayWork / 60)
  const rm = Math.floor(timerTodayRest / 60)
  document.getElementById('timer-sessions-today').textContent = timerSessions
  document.getElementById('timer-work-today').textContent = wm >= 60 ? `${Math.floor(wm/60)}h ${wm%60}m` : `${wm}m`
  document.getElementById('timer-rest-today').textContent = `${rm}m`
}

// ── BREATH ────────────────────────────────
function startBreath() {
  breathRunning = true
  breathStep = 0
  breathPhaseTime = 0
  document.getElementById('btn-breath-toggle').textContent = '⏹ Detener'
  const circle = document.getElementById('breath-circle')
  circle.classList.add('breathing')
  runBreathStep()
  breathInterval = setInterval(breathTick, 1000)
}

function stopBreath() {
  breathRunning = false
  clearInterval(breathInterval)
  breathInterval = null
  document.getElementById('btn-breath-toggle').textContent = '▶ Comenzar'
  document.getElementById('breath-circle').className = 'breath-circle'
  document.getElementById('breath-circle').style.animation = ''
  document.getElementById('breath-label').textContent = 'Inhala'
  document.getElementById('breath-phase').textContent = 'Listo para comenzar'
}

function breathTick() {
  breathPhaseTime++
  const tech = BREATH_TECHNIQUES[breathTech]
  const phase = tech.phases[breathStep]
  const remaining = phase.secs - breathPhaseTime
  document.getElementById('breath-phase').textContent = `${phase.label} — ${remaining}s`

  if (breathPhaseTime >= phase.secs) {
    breathStep = (breathStep + 1) % tech.phases.length
    breathPhaseTime = 0
    runBreathStep()
  }
}

function runBreathStep() {
  const tech = BREATH_TECHNIQUES[breathTech]
  const phase = tech.phases[breathStep]
  const circle = document.getElementById('breath-circle')
  const label = document.getElementById('breath-label')

  label.textContent = phase.label
  document.getElementById('breath-phase').textContent = `${phase.label} — ${phase.secs}s`

  circle.className = 'breath-circle'
  void circle.offsetWidth // reflow
  if (phase.label === 'Inhala') {
    circle.classList.add('breath-inhale')
  } else if (phase.label === 'Exhala') {
    circle.classList.add('breath-exhale')
  } else {
    circle.classList.add('breath-hold')
  }
}

// ── MOOD ──────────────────────────────────
const MOOD_LABELS = { 1: 'Mal 😔', 2: 'Regular 😐', 3: 'Bien 🙂', 4: 'Muy bien 😊', 5: 'Excelente 🤩' }

function saveMood(val) {
  if (!data.balance.mood) data.balance.mood = []
  const today = new Date().toISOString().split('T')[0]
  const existing = data.balance.mood.findIndex(m => m.date === today)
  if (existing >= 0) data.balance.mood[existing].val = val
  else data.balance.mood.push({ date: today, val })
  save()
  renderMoodTracker()
}

function renderMoodTracker() {
  const today = new Date().toISOString().split('T')[0]
  const todayEntry = (data.balance.mood || []).find(m => m.date === today)
  const lbl = document.getElementById('mood-selected-label')
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'))
  if (todayEntry) {
    lbl.textContent = MOOD_LABELS[todayEntry.val]
    const active = document.querySelector(`.mood-btn[data-mood="${todayEntry.val}"]`)
    if (active) active.classList.add('active')
  } else {
    lbl.textContent = 'Sin registrar hoy'
  }

  // Chart - last 7 days
  const canvas = document.getElementById('mood-chart')
  if (!canvas) return
  const W = canvas.offsetWidth || 220; canvas.width = W; canvas.height = 60
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, W, 60)

  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }

  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text3').trim() || '#868E96'
  const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#206BC4'
  const barW = (W - 20) / 7
  const entries = data.balance.mood || []

  days.forEach((date, i) => {
    const entry = entries.find(e => e.date === date)
    const x = 10 + i * barW + barW * 0.15
    const bw = barW * 0.7
    const val = entry ? entry.val : 0
    const bh = val ? (val / 5) * 44 : 3
    const y = 50 - bh
    ctx.fillStyle = val ? accentColor + (val === 5 ? 'FF' : 'AA') : (textColor + '33')
    ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(x, y, bw, bh, 2)
    else ctx.rect(x, y, bw, bh)
    ctx.fill()

    ctx.fillStyle = textColor
    ctx.font = '9px Inter, sans-serif'
    ctx.textAlign = 'center'
    const dayLabel = new Date(date + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'narrow' })
    ctx.fillText(dayLabel, x + bw / 2, 60)
  })
}

// ── GRATITUDE ─────────────────────────────
function saveGratitude() {
  const inputs = document.querySelectorAll('.gratitude-input')
  const items = Array.from(inputs).map(i => i.value.trim()).filter(Boolean)
  if (items.length === 0) return
  const today = new Date().toISOString().split('T')[0]
  if (!data.balance.gratitude) data.balance.gratitude = []
  const idx = data.balance.gratitude.findIndex(g => g.date === today)
  if (idx >= 0) data.balance.gratitude[idx].items = items
  else data.balance.gratitude.push({ date: today, items })
  save()
  renderGratitudeToday()
  renderGratitudeHistory()
}

function renderGratitudeToday() {
  const today = new Date().toISOString().split('T')[0]
  const entry = (data.balance.gratitude || []).find(g => g.date === today)
  const lbl = document.getElementById('gratitude-date-label')
  const inputs = document.querySelectorAll('.gratitude-input')
  if (entry) {
    lbl.textContent = '✓ Guardado hoy — puedes editar'
    lbl.style.color = 'var(--green)'
    entry.items.forEach((item, i) => { if (inputs[i]) inputs[i].value = item })
  } else {
    lbl.textContent = 'Hoy aún no has registrado gratitud'
    lbl.style.color = 'var(--text3)'
  }
}

function renderGratitudeHistory() {
  const history = document.getElementById('gratitude-history')
  const entries = [...(data.balance.gratitude || [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
  if (entries.length <= 1) { history.innerHTML = ''; return }
  history.innerHTML = '<div class="gratitude-history-title">Entradas anteriores</div>' +
    entries.slice(1).map(e => `
      <div class="gratitude-history-entry">
        <div class="gratitude-history-date">${formatDate(e.date)}</div>
        ${e.items.map((item, i) => `<div class="gratitude-history-item">${i+1}. ${item}</div>`).join('')}
      </div>
    `).join('')
}

// ── MANTRAS ───────────────────────────────
function addMantra() {
  const input = document.getElementById('mantra-input')
  const text = input.value.trim()
  if (!text) return
  if (!data.balance.mantras) data.balance.mantras = []
  data.balance.mantras.push(text)
  mantras = data.balance.mantras
  input.value = ''
  mantraIdx = mantras.length - 1
  save()
  renderMantra()
}

function renderMantra() {
  const display = document.getElementById('mantra-text')
  const counter = document.getElementById('mantra-counter')
  const list = document.getElementById('mantra-list')
  if (mantras.length === 0) {
    display.textContent = 'Agrega tu primer mantra'
    counter.textContent = '0 / 0'
    list.innerHTML = ''
    return
  }
  mantraIdx = Math.max(0, Math.min(mantraIdx, mantras.length - 1))
  display.textContent = mantras[mantraIdx]
  counter.textContent = `${mantraIdx + 1} / ${mantras.length}`
  list.innerHTML = mantras.map((m, i) => `
    <div class="mantra-item ${i === mantraIdx ? 'active' : ''}" onclick="selectMantra(${i})">
      <span>${m}</span>
      <button class="icon-btn del" onclick="deleteMantra(${i});event.stopPropagation()">✕</button>
    </div>
  `).join('')
}

function selectMantra(i) { mantraIdx = i; renderMantra() }
window.selectMantra = selectMantra

function deleteMantra(i) {
  data.balance.mantras.splice(i, 1)
  mantras = data.balance.mantras
  if (mantraIdx >= mantras.length) mantraIdx = Math.max(0, mantras.length - 1)
  save(); renderMantra()
}
window.deleteMantra = deleteMantra

// ── THOUGHTS ──────────────────────────────
function saveThought() {
  const text = document.getElementById('thought-textarea').value.trim()
  if (!text) return
  const today = new Date().toISOString().split('T')[0]
  if (!data.balance.thoughts) data.balance.thoughts = []
  const idx = data.balance.thoughts.findIndex(t => t.date === today)
  if (idx >= 0) data.balance.thoughts[idx].text = text
  else data.balance.thoughts.push({ date: today, text })
  save()
  const btn = document.getElementById('btn-save-thought')
  btn.textContent = '✓ Guardado'
  setTimeout(() => { btn.textContent = 'Guardar' }, 1800)
}

function toggleThoughtHistory() {
  const list = document.getElementById('thought-history-list')
  const btn = document.getElementById('btn-thought-history')
  if (list.style.display === 'none') {
    const entries = [...(data.balance.thoughts || [])].sort((a, b) => b.date.localeCompare(a.date))
    list.innerHTML = entries.length === 0
      ? '<div style="color:var(--text3);font-size:12px;padding:8px">Sin entradas anteriores</div>'
      : entries.map(e => `
          <div class="thought-history-entry">
            <div class="thought-history-date">${formatDate(e.date)}</div>
            <div class="thought-history-text">${e.text.replace(/\n/g, '<br>')}</div>
          </div>
        `).join('')
    list.style.display = ''
    btn.textContent = 'Ocultar'
  } else {
    list.style.display = 'none'
    btn.textContent = 'Historial'
  }
}

// ── DAY WATCHER ───────────────────────────
let _lastKnownDate = new Date().toISOString().split('T')[0]

function startDayWatcher() {
  // Checa cada minuto si cambió el día
  setInterval(() => {
    const today = new Date().toISOString().split('T')[0]
    if (today !== _lastKnownDate) {
      _lastKnownDate = today
      onDayChanged()
    }
  }, 60 * 1000)
}

function onDayChanged() {
  // Dashboard
  updateDashboardDate()
  renderDashboard()

  // Calendario: avanzar al mes actual si es necesario
  const now = new Date()
  if (calCurrentDate.getMonth() !== now.getMonth() || calCurrentDate.getFullYear() !== now.getFullYear()) {
    calCurrentDate = new Date()
    renderCalendar()
  }

  // Balance: resetear stats del día y refrescar wellness
  timerTodayWork = 0
  timerTodayRest = 0
  timerSessions = 0
  timerWorkAlert = false
  if (timerRunning) {
    pauseTimer()
    timerSeconds = 0
    renderTimerDisplay()
    updateTimerRing()
  }
  renderTimerStats()

  // Mood y gratitud son por día, refrescar para el día nuevo
  renderMoodTracker()
  renderGratitudeToday()

  // Thoughts: limpiar el textarea para el día nuevo
  const textarea = document.getElementById('thought-textarea')
  if (textarea) {
    const todayKey = new Date().toISOString().split('T')[0]
    const existing = (data.balance?.thoughts || []).find(t => t.date === todayKey)
    textarea.value = existing ? existing.text : ''
  }
  const thoughtDate = document.getElementById('thought-date')
  if (thoughtDate) {
    thoughtDate.textContent = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }

  // Recurrentes: aplicar los pendientes del nuevo día
  applyPendingRecurrents()
  renderRecurrents()

  // Tareas recurrentes: re-crear completadas si es el día correspondiente
  applyRecurringTasks()
}

// ── START ─────────────────────────────────

function applyRecurringTasks() {
  const today = new Date().toISOString().split('T')[0]
  const toAdd = []
  data.tasks.forEach(t => {
    if (!t.recur || t.recur === 'none' || !t.done) return
    const lastDone = t.lastRecurDate
    let shouldRegen = false
    if (t.recur === 'daily') {
      shouldRegen = !lastDone || lastDone < today
    } else if (t.recur === 'weekly') {
      if (!lastDone) { shouldRegen = true }
      else {
        const days = Math.floor((new Date(today) - new Date(lastDone)) / 86400000)
        shouldRegen = days >= 7
      }
    } else if (t.recur === 'monthly') {
      if (!lastDone) { shouldRegen = true }
      else {
        const lm = lastDone.substring(0,7)
        const tm = today.substring(0,7)
        shouldRegen = lm < tm
      }
    }
    if (shouldRegen) {
      toAdd.push({
        ...t,
        id: Date.now().toString() + Math.random(),
        done: false,
        createdAt: new Date().toISOString(),
        lastRecurDate: today
      })
      t.lastRecurDate = today
    }
  })
  if (toAdd.length > 0) {
    data.tasks.unshift(...toAdd)
    save()
    renderTasks()
  }
}

init()

// ════════════════════════════════════════════════════════════
// v2.1 — EXPENSE TABS
// ════════════════════════════════════════════════════════════
function setupExpenseTabs() {
  document.querySelectorAll('[data-exp-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-exp-tab]').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      const tab = btn.dataset.expTab
      document.querySelectorAll('.exp-tab-panel').forEach(p => p.classList.remove('active'))
      document.getElementById(`exptab-${tab}`).classList.add('active')
      const headerActions = document.getElementById('exp-header-actions')
      if (tab === 'registros') {
        headerActions.style.display = ''
      } else {
        headerActions.style.display = 'none'
      }
    })
  })
}

// ════════════════════════════════════════════════════════════
// v2.1 — PRESUPUESTOS
// ════════════════════════════════════════════════════════════
const CAT_LABELS = {
  food:'🍽 Alimentación', transport:'🚗 Transporte', housing:'🏠 Vivienda',
  health:'💊 Salud', entertainment:'🎮 Entretenimiento', clothing:'👕 Ropa',
  education:'📚 Educación', work:'💼 Trabajo', other:'📦 Otro',
  personal:'🧘 Personal', finance:'💰 Finanzas'
}

function setupBudgets() {
  document.getElementById('btn-add-budget').onclick = () => {
    document.getElementById('budget-id').value = ''
    document.getElementById('budget-category').value = 'food'
    document.getElementById('budget-limit').value = ''
    openModal('budget')
  }
  document.getElementById('btn-save-budget').onclick = saveBudget
  renderBudgets()
}

function saveBudget() {
  const id = document.getElementById('budget-id').value
  const budget = {
    id: id || Date.now().toString(),
    category: document.getElementById('budget-category').value,
    limit: parseFloat(document.getElementById('budget-limit').value) || 0
  }
  if (id) {
    const idx = data.budgets.findIndex(b => b.id === id)
    if (idx >= 0) data.budgets[idx] = budget
  } else {
    // prevent duplicate category
    const existing = data.budgets.findIndex(b => b.category === budget.category)
    if (existing >= 0) data.budgets[existing] = { ...data.budgets[existing], limit: budget.limit }
    else data.budgets.push(budget)
  }
  save(); renderBudgets(); closeModal('budget')
}

function renderBudgets() {
  const list = document.getElementById('budget-list')
  if (!list) return
  if (data.budgets.length === 0) {
    list.innerHTML = '<div class="bento-empty" style="padding:40px;text-align:center;color:var(--text2)">No hay presupuestos definidos. Crea uno para empezar a rastrear tus gastos por categoría.</div>'
    return
  }
  const now = new Date()
  const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
  const monthExpenses = (data.expenses || []).filter(e => e.type === 'expense' && e.date && e.date.startsWith(monthStr))

  list.innerHTML = data.budgets.map(b => {
    const spent = monthExpenses.filter(e => e.category === b.category).reduce((s,e) => s+e.amount, 0)
    const pct = b.limit > 0 ? Math.min((spent / b.limit) * 100, 100) : 0
    const barClass = pct >= 100 ? 'over' : pct >= 80 ? 'warn' : ''
    const remaining = b.limit - spent
    return `
    <div class="budget-item">
      <div class="budget-item-header">
        <span class="budget-item-name">${CAT_LABELS[b.category] || b.category}</span>
        <span class="budget-item-amounts">Gastado: <span>${formatCurrency(spent)}</span> / ${formatCurrency(b.limit)}</span>
      </div>
      <div class="budget-bar-wrap"><div class="budget-bar ${barClass}" style="width:${pct}%"></div></div>
      <div class="budget-item-footer">
        <span>${pct.toFixed(0)}% usado · ${remaining >= 0 ? formatCurrency(remaining)+' disponible' : formatCurrency(-remaining)+' excedido'}</span>
        <div class="budget-item-actions">
          <button class="icon-btn" onclick="editBudget('${b.id}')">✏️</button>
          <button class="icon-btn del" onclick="deleteBudget('${b.id}')">🗑</button>
        </div>
      </div>
    </div>`
  }).join('')
}

function editBudget(id) {
  const b = data.budgets.find(b => b.id === id)
  if (!b) return
  document.getElementById('budget-id').value = b.id
  document.getElementById('budget-category').value = b.category
  document.getElementById('budget-limit').value = b.limit
  openModal('budget')
}

function deleteBudget(id) {
  data.budgets = data.budgets.filter(b => b.id !== id)
  save(); renderBudgets()
}

// ════════════════════════════════════════════════════════════
// v2.1 — RECURRENTES
// ════════════════════════════════════════════════════════════
function setupRecurrents() {
  document.getElementById('btn-add-recurrent').onclick = () => {
    document.getElementById('recurrent-id').value = ''
    document.getElementById('recurrent-concept').value = ''
    document.getElementById('recurrent-type').value = 'expense'
    document.getElementById('recurrent-amount').value = ''
    document.getElementById('recurrent-category').value = 'other'
    document.getElementById('recurrent-freq').value = 'monthly'
    document.getElementById('recurrent-day').value = '1'
    document.getElementById('modal-recurrent-title').textContent = 'Nuevo recurrente'
    openModal('recurrent')
  }
  document.getElementById('btn-save-recurrent').onclick = saveRecurrent

  // Apply pending recurrents on setup
  applyPendingRecurrents()
  renderRecurrents()
}

function saveRecurrent() {
  const id = document.getElementById('recurrent-id').value
  const rec = {
    id: id || Date.now().toString(),
    concept: document.getElementById('recurrent-concept').value.trim(),
    type: document.getElementById('recurrent-type').value,
    amount: parseFloat(document.getElementById('recurrent-amount').value) || 0,
    category: document.getElementById('recurrent-category').value,
    freq: document.getElementById('recurrent-freq').value,
    day: parseInt(document.getElementById('recurrent-day').value) || 1,
    lastApplied: null
  }
  if (!rec.concept) return
  if (id) {
    const idx = data.recurrents.findIndex(r => r.id === id)
    if (idx >= 0) { rec.lastApplied = data.recurrents[idx].lastApplied; data.recurrents[idx] = rec }
  } else {
    data.recurrents.push(rec)
  }
  save(); renderRecurrents(); closeModal('recurrent')
}

function applyPendingRecurrents() {
  if (!data.recurrents || data.recurrents.length === 0) return
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  let changed = false
  data.recurrents.forEach(rec => {
    const last = rec.lastApplied ? new Date(rec.lastApplied) : null
    let shouldApply = false
    if (rec.freq === 'daily') {
      shouldApply = !last || last.toISOString().split('T')[0] < today
    } else if (rec.freq === 'weekly') {
      if (!last) shouldApply = true
      else {
        const daysSince = Math.floor((now - last) / 86400000)
        shouldApply = daysSince >= 7
      }
    } else if (rec.freq === 'biweekly') {
      // Dos pagos al mes: día X y día X+15 (o ajustado al mes)
      const d1 = parseInt(rec.day)
      const d2 = d1 + 15 <= 28 ? d1 + 15 : d1 - 15
      const [pay1, pay2] = [Math.min(d1,d2), Math.max(d1,d2)]
      const today_d = now.getDate()
      if (!last) {
        shouldApply = today_d >= pay1
      } else {
        const daysSince = Math.floor((now - last) / 86400000)
        shouldApply = daysSince >= 14
      }
    } else if (rec.freq === 'monthly') {
      if (!last) {
        shouldApply = now.getDate() >= rec.day
      } else {
        const lastMonth = `${last.getFullYear()}-${String(last.getMonth()+1).padStart(2,'0')}`
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
        shouldApply = lastMonth < thisMonth && now.getDate() >= rec.day
      }
    }
    if (shouldApply) {
      const expense = {
        id: Date.now().toString() + Math.random(),
        date: today,
        concept: `[Auto] ${rec.concept}`,
        category: rec.category,
        type: rec.type,
        amount: rec.amount
      }
      if (!data.expenses) data.expenses = []
      data.expenses.push(expense)
      rec.lastApplied = now.toISOString()
      changed = true
    }
  })
  if (changed) { save() }
}

function renderRecurrents() {
  const list = document.getElementById('recurrent-list')
  if (!list) return
  if (data.recurrents.length === 0) {
    list.innerHTML = '<div class="bento-empty" style="padding:40px;text-align:center;color:var(--text2)">No hay recurrentes. Agrega gastos o ingresos fijos para que se registren automáticamente.</div>'
    return
  }
  const freqLabel = { daily: 'Diario', weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual' }
  list.innerHTML = data.recurrents.map(r => `
    <div class="recurrent-item">
      <div class="recurrent-item-left">
        <div class="recurrent-type-badge ${r.type}">${r.type === 'expense' ? '↓' : '↑'}</div>
        <div>
          <div class="recurrent-concept">${r.concept}</div>
          <div class="recurrent-meta">${CAT_LABELS[r.category] || r.category} · ${freqLabel[r.freq] || r.freq}${r.freq==='monthly'?' (día '+r.day+')':r.freq==='biweekly'?' (días '+r.day+' y '+(parseInt(r.day)+15<=31?parseInt(r.day)+15:parseInt(r.day)-15)+')':''} · Último: ${r.lastApplied ? formatDate(r.lastApplied.split('T')[0]) : 'Nunca'}</div>
        </div>
      </div>
      <div class="recurrent-item-right">
        <span class="recurrent-amount ${r.type}">${r.type==='expense'?'-':'+'} ${formatCurrency(r.amount)}</span>
        <button class="icon-btn" onclick="editRecurrent('${r.id}')">✏️</button>
        <button class="icon-btn del" onclick="deleteRecurrent('${r.id}')">🗑</button>
      </div>
    </div>`).join('')
}

function editRecurrent(id) {
  const r = data.recurrents.find(r => r.id === id)
  if (!r) return
  document.getElementById('recurrent-id').value = r.id
  document.getElementById('recurrent-concept').value = r.concept
  document.getElementById('recurrent-type').value = r.type
  document.getElementById('recurrent-amount').value = r.amount
  document.getElementById('recurrent-category').value = r.category
  document.getElementById('recurrent-freq').value = r.freq
  document.getElementById('recurrent-day').value = r.day
  document.getElementById('modal-recurrent-title').textContent = 'Editar recurrente'
  openModal('recurrent')
}

function deleteRecurrent(id) {
  data.recurrents = data.recurrents.filter(r => r.id !== id)
  save(); renderRecurrents()
}

// ════════════════════════════════════════════════════════════
// v2.1 — METAS DE AHORRO
// ════════════════════════════════════════════════════════════
function setupSavings() {
  document.getElementById('btn-add-saving').onclick = () => {
    document.getElementById('saving-id').value = ''
    document.getElementById('saving-name').value = ''
    document.getElementById('saving-target').value = ''
    document.getElementById('saving-current').value = ''
    document.getElementById('saving-date').value = ''
    document.getElementById('saving-emoji').value = '🎯'
    document.getElementById('modal-saving-title').textContent = 'Nueva meta de ahorro'
    openModal('saving')
  }
  document.getElementById('btn-save-saving').onclick = saveSaving
  document.getElementById('btn-confirm-deposit').onclick = confirmDeposit
  renderSavings()
}

function saveSaving() {
  const id = document.getElementById('saving-id').value
  const goal = {
    id: id || Date.now().toString(),
    name: document.getElementById('saving-name').value.trim(),
    target: parseFloat(document.getElementById('saving-target').value) || 0,
    current: parseFloat(document.getElementById('saving-current').value) || 0,
    date: document.getElementById('saving-date').value,
    emoji: document.getElementById('saving-emoji').value || '🎯'
  }
  if (!goal.name) return
  if (id) {
    const idx = data.savings.findIndex(s => s.id === id)
    if (idx >= 0) data.savings[idx] = goal
  } else {
    data.savings.push(goal)
  }
  save(); renderSavings(); closeModal('saving')
}

function editSaving(id) {
  const s = data.savings.find(s => s.id === id)
  if (!s) return
  document.getElementById('saving-id').value = s.id
  document.getElementById('saving-name').value = s.name
  document.getElementById('saving-target').value = s.target
  document.getElementById('saving-current').value = s.current
  document.getElementById('saving-date').value = s.date || ''
  document.getElementById('saving-emoji').value = s.emoji || '🎯'
  document.getElementById('modal-saving-title').textContent = 'Editar meta'
  openModal('saving')
}

function deleteSaving(id) {
  data.savings = data.savings.filter(s => s.id !== id)
  save(); renderSavings()
}

function openDeposit(id) {
  const s = data.savings.find(s => s.id === id)
  if (!s) return
  document.getElementById('deposit-saving-id').value = id
  document.getElementById('deposit-label').textContent = `Meta: ${s.name} · Ahorrado: ${formatCurrency(s.current)}`
  document.getElementById('deposit-amount').value = ''
  openModal('saving-deposit')
}

function confirmDeposit() {
  const id = document.getElementById('deposit-saving-id').value
  const amount = parseFloat(document.getElementById('deposit-amount').value) || 0
  const s = data.savings.find(s => s.id === id)
  if (!s || amount <= 0) return
  s.current = Math.min(s.current + amount, s.target)
  save(); renderSavings(); closeModal('saving-deposit')
}

function renderSavings() {
  const list = document.getElementById('saving-goals-list')
  if (!list) return
  if (data.savings.length === 0) {
    list.innerHTML = '<div class="bento-empty" style="grid-column:1/-1;padding:60px;text-align:center;color:var(--text2)">No hay metas de ahorro. ¡Crea una para empezar a ahorrar!</div>'
    return
  }
  list.innerHTML = data.savings.map(s => {
    const pct = s.target > 0 ? Math.min((s.current / s.target) * 100, 100) : 0
    const done = pct >= 100
    return `
    <div class="saving-goal-card">
      <div class="saving-goal-top">
        <div class="saving-goal-emoji">${s.emoji}</div>
        <div>
          <div class="saving-goal-name">${s.name}</div>
          ${s.date ? `<div class="saving-goal-date">🗓 Objetivo: ${formatDate(s.date)}</div>` : ''}
        </div>
      </div>
      <div class="saving-goal-amounts">
        <span>Ahorrado: <strong>${formatCurrency(s.current)}</strong></span>
        <span>Meta: <strong>${formatCurrency(s.target)}</strong></span>
      </div>
      <div class="saving-progress-wrap">
        <div class="saving-progress-bar ${done?'done':''}" style="width:${pct}%"></div>
      </div>
      <div class="saving-goal-pct">${pct.toFixed(0)}% ${done ? '¡Meta alcanzada! 🎉' : 'completado'}</div>
      <div class="saving-goal-actions">
        ${!done ? `<button class="btn-primary" style="font-size:12px;padding:6px 10px" onclick="openDeposit('${s.id}')">+ Depositar</button>` : ''}
        <button class="btn-ghost" style="font-size:12px;padding:6px 10px" onclick="editSaving('${s.id}')">Editar</button>
        <button class="btn-ghost danger" style="font-size:12px;padding:6px 10px" onclick="deleteSaving('${s.id}')">Eliminar</button>
      </div>
    </div>`
  }).join('')
}

// ════════════════════════════════════════════════════════════
// v2.1 — NOTAS
// ════════════════════════════════════════════════════════════
const NOTE_COLORS = {
  none: null,
  red: '#ef5350', orange: '#ff9800', yellow: '#fdd835',
  green: '#66bb6a', blue: '#42a5f5', purple: '#ab47bc'
}
let notesFilter = 'all'
let notesSearch = ''
let notesViewGrid = true
let selectedNoteColor = 'none'

function setupNotes() {
  document.getElementById('btn-add-note').onclick = openNewNote
  document.getElementById('btn-save-note').onclick = saveNote
  document.getElementById('btn-notes-view-toggle').onclick = toggleNotesView

  document.getElementById('notes-search').oninput = (e) => {
    notesSearch = e.target.value.toLowerCase()
    renderNotes()
  }

  document.querySelectorAll('[data-notes-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-notes-filter]').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      notesFilter = btn.dataset.notesFilter
      renderNotes()
    })
  })

  // Color picker in modal
  document.querySelectorAll('#note-color-picker .note-cp-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('#note-color-picker .note-cp-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      selectedNoteColor = btn.dataset.color
    }
  })

  renderNotes()
}

function openNewNote() {
  document.getElementById('note-id').value = ''
  document.getElementById('note-title').value = ''
  document.getElementById('note-body').value = ''
  selectedNoteColor = 'none'
  document.querySelectorAll('#note-color-picker .note-cp-btn').forEach(b => b.classList.remove('active'))
  document.querySelector('#note-color-picker [data-color="none"]').classList.add('active')
  document.getElementById('modal-note-title').textContent = 'Nueva nota'
  openModal('note')
}

function saveNote() {
  const id = document.getElementById('note-id').value
  const note = {
    id: id || Date.now().toString(),
    title: document.getElementById('note-title').value.trim(),
    body: document.getElementById('note-body').value,
    color: selectedNoteColor,
    pinned: id ? (data.notes.find(n => n.id === id)?.pinned || false) : false,
    updatedAt: new Date().toISOString()
  }
  if (!note.title && !note.body) return
  if (id) {
    const idx = data.notes.findIndex(n => n.id === id)
    if (idx >= 0) data.notes[idx] = note
  } else {
    data.notes.unshift(note)
  }
  save(); renderNotes(); closeModal('note')
}

function editNote(id) {
  const n = data.notes.find(n => n.id === id)
  if (!n) return
  document.getElementById('note-id').value = n.id
  document.getElementById('note-title').value = n.title
  document.getElementById('note-body').value = n.body
  selectedNoteColor = n.color || 'none'
  document.querySelectorAll('#note-color-picker .note-cp-btn').forEach(b => b.classList.remove('active'))
  const colorBtn = document.querySelector(`#note-color-picker [data-color="${selectedNoteColor}"]`)
  if (colorBtn) colorBtn.classList.add('active')
  document.getElementById('modal-note-title').textContent = 'Editar nota'
  openModal('note')
}

function togglePinNote(id, e) {
  e.stopPropagation()
  const n = data.notes.find(n => n.id === id)
  if (n) { n.pinned = !n.pinned; save(); renderNotes() }
}

function deleteNote(id, e) {
  e.stopPropagation()
  data.notes = data.notes.filter(n => n.id !== id)
  save(); renderNotes()
}

function toggleNotesView() {
  notesViewGrid = !notesViewGrid
  const grid = document.getElementById('notes-grid')
  grid.classList.toggle('list-view', !notesViewGrid)
  document.getElementById('btn-notes-view-toggle').textContent = notesViewGrid ? '▦' : '≡'
}

function renderNotes() {
  const grid = document.getElementById('notes-grid')
  if (!grid) return

  let notes = [...data.notes]

  // Sort: pinned first, then by date
  notes.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return new Date(b.updatedAt) - new Date(a.updatedAt)
  })

  if (notesFilter === 'pinned') notes = notes.filter(n => n.pinned)
  else if (notesFilter !== 'all') notes = notes.filter(n => n.color === notesFilter)

  if (notesSearch) {
    notes = notes.filter(n =>
      n.title.toLowerCase().includes(notesSearch) ||
      n.body.toLowerCase().includes(notesSearch)
    )
  }

  const label = document.getElementById('notes-count-label')
  if (label) label.textContent = `${data.notes.length} nota${data.notes.length !== 1 ? 's' : ''}`

  if (notes.length === 0) {
    grid.innerHTML = `<div class="notes-empty"><div class="notes-empty-icon">📝</div><div>${data.notes.length === 0 ? 'No hay notas. ¡Crea tu primera nota!' : 'Sin resultados para esta búsqueda'}</div></div>`
    return
  }

  grid.innerHTML = notes.map(n => {
    const colorHex = NOTE_COLORS[n.color] || null
    const dateStr = n.updatedAt ? new Date(n.updatedAt).toLocaleDateString('es-MX', { day:'numeric', month:'short' }) : ''
    return `
    <div class="note-card ${n.pinned ? 'pinned' : ''}" data-color="${n.color || 'none'}" onclick="editNote('${n.id}')">
      ${colorHex ? `<div class="note-card-color-strip" style="background:${colorHex}"></div>` : ''}
      <button class="note-pin-btn" onclick="togglePinNote('${n.id}', event)" title="${n.pinned ? 'Desfijar' : 'Fijar'}">📌</button>
      <div class="note-card-title" style="padding-left:${colorHex ? '12px' : '0'}">${n.title || '(Sin título)'}</div>
      ${n.body ? `<div class="note-card-body">${n.body}</div>` : ''}
      <div class="note-card-footer">
        <span>${dateStr}</span>
        <div class="note-card-actions">
          <button class="icon-btn del" onclick="deleteNote('${n.id}', event)" title="Eliminar">🗑</button>
        </div>
      </div>
    </div>`
  }).join('')
}

// ════════════════════════════════════════════════════════════
// v2.1 — METAS / OKRs
// ════════════════════════════════════════════════════════════
const OBJ_CATEGORY_LABELS = {
  work:'💼 Trabajo', personal:'🧘 Personal', health:'💪 Salud',
  finance:'💰 Finanzas', learning:'📚 Aprendizaje', other:'🌟 Otro'
}

function setupGoals() {
  document.getElementById('btn-add-objective').onclick = openNewObjective
  document.getElementById('btn-save-objective').onclick = saveObjective
  renderGoals()
}

function openNewObjective() {
  document.getElementById('obj-id').value = ''
  document.getElementById('obj-title-input').value = ''
  document.getElementById('obj-category').value = 'work'
  document.getElementById('obj-due').value = ''
  document.getElementById('obj-krs').value = ''
  document.getElementById('modal-obj-title').textContent = 'Nuevo objetivo'
  openModal('objective')
}

function saveObjective() {
  const id = document.getElementById('obj-id').value
  const title = document.getElementById('obj-title-input').value.trim()
  if (!title) return
  const krsRaw = document.getElementById('obj-krs').value.trim()
  const krs = krsRaw ? krsRaw.split('\n').map(k => k.trim()).filter(Boolean).map(text => ({ id: Date.now().toString()+Math.random(), text, done: false })) : []

  const obj = {
    id: id || Date.now().toString(),
    title,
    category: document.getElementById('obj-category').value,
    due: document.getElementById('obj-due').value,
    krs,
    createdAt: id ? undefined : new Date().toISOString(),
    open: true
  }

  if (id) {
    const idx = data.goals.objectives.findIndex(o => o.id === id)
    if (idx >= 0) {
      // Preserve existing KR done states where texts match
      const existing = data.goals.objectives[idx]
      obj.krs = krs.map(kr => {
        const existingKr = existing.krs.find(e => e.text === kr.text)
        return existingKr ? { ...kr, done: existingKr.done } : kr
      })
      obj.createdAt = existing.createdAt
      obj.open = existing.open
      data.goals.objectives[idx] = obj
    }
  } else {
    data.goals.objectives.unshift(obj)
  }
  save(); renderGoals(); closeModal('objective')
}

function editObjective(id) {
  const o = data.goals.objectives.find(o => o.id === id)
  if (!o) return
  document.getElementById('obj-id').value = o.id
  document.getElementById('obj-title-input').value = o.title
  document.getElementById('obj-category').value = o.category
  document.getElementById('obj-due').value = o.due || ''
  document.getElementById('obj-krs').value = o.krs.map(k => k.text).join('\n')
  document.getElementById('modal-obj-title').textContent = 'Editar objetivo'
  openModal('objective')
}

function deleteObjective(id) {
  data.goals.objectives = data.goals.objectives.filter(o => o.id !== id)
  save(); renderGoals()
}

function toggleKR(objId, krId) {
  const o = data.goals.objectives.find(o => o.id === objId)
  if (!o) return
  const kr = o.krs.find(k => k.id === krId)
  if (kr) { kr.done = !kr.done; save(); renderGoals() }
}

function toggleObjectiveOpen(id) {
  const o = data.goals.objectives.find(o => o.id === id)
  if (o) { o.open = !o.open; renderGoals() }
}

function renderGoals() {
  const objList = document.getElementById('objectives-list')
  const statsEl = document.getElementById('goals-stats')
  if (!objList) return

  const objs = data.goals.objectives
  const totalKRs = objs.reduce((s,o) => s + o.krs.length, 0)
  const doneKRs = objs.reduce((s,o) => s + o.krs.filter(k=>k.done).length, 0)
  const completedObjs = objs.filter(o => o.krs.length > 0 && o.krs.every(k=>k.done)).length

  if (statsEl) {
    statsEl.innerHTML = [
      { val: objs.length, lbl: 'Objetivos' },
      { val: completedObjs, lbl: 'Completados' },
      { val: totalKRs, lbl: 'Resultados clave' },
      { val: totalKRs > 0 ? Math.round((doneKRs/totalKRs)*100)+'%' : '0%', lbl: 'Progreso global' }
    ].map(s => `<div class="goal-stat-card"><div class="goal-stat-value">${s.val}</div><div class="goal-stat-label">${s.lbl}</div></div>`).join('')
  }

  if (objs.length === 0) {
    objList.innerHTML = '<div class="bento-empty" style="text-align:center;padding:60px;color:var(--text2)">No hay objetivos. ¡Define el primero y empieza a alcanzarlo!</div>'
    return
  }

  objList.innerHTML = objs.map(o => {
    const doneCount = o.krs.filter(k=>k.done).length
    const totalCount = o.krs.length
    const pct = totalCount > 0 ? Math.round((doneCount/totalCount)*100) : 0
    const catLabel = OBJ_CATEGORY_LABELS[o.category] || o.category
    return `
    <div class="objective-card">
      <div class="objective-header" onclick="toggleObjectiveOpen('${o.id}')">
        <div>
          <div class="objective-title">${o.title}</div>
          <div class="objective-meta">${catLabel}${o.due ? ' · Fecha: '+formatDate(o.due) : ''} · ${doneCount}/${totalCount} KRs</div>
        </div>
        <span class="objective-category-badge">${catLabel.split(' ')[0]}</span>
        <span class="objective-progress-mini">${pct}%</span>
        <div class="objective-actions">
          <button class="icon-btn" onclick="event.stopPropagation();editObjective('${o.id}')" title="Editar">✏️</button>
          <button class="icon-btn del" onclick="event.stopPropagation();deleteObjective('${o.id}')" title="Eliminar">🗑</button>
        </div>
      </div>
      <div class="objective-overall-bar"><div class="objective-overall-fill" style="width:${pct}%"></div></div>
      ${o.open !== false ? `
      <div class="objective-krs">
        ${o.krs.length === 0 ? '<div style="font-size:13px;color:var(--text2);padding:8px 0">Sin resultados clave definidos</div>' : ''}
        ${o.krs.map(kr => `
        <div class="kr-item ${kr.done?'done':''}" onclick="toggleKR('${o.id}','${kr.id}')">
          <div class="kr-check">${kr.done ? '✓' : ''}</div>
          <div class="kr-text">${kr.text}</div>
        </div>`).join('')}
      </div>` : ''}
    </div>`
  }).join('')
}

// ════════════════════════════════════════════════════════════
// v2.1 — MODO ENFOQUE
// ════════════════════════════════════════════════════════════
let focusRunning = false
let focusSeconds = 25 * 60
let focusInterval = null

function setupFocusMode() {
  document.getElementById('btn-focus-mode').onclick = openFocusMode
  document.getElementById('focus-exit').onclick = closeFocusMode
  document.getElementById('focus-play').onclick = toggleFocusTimer
  document.getElementById('focus-reset').onclick = resetFocusTimer
  document.getElementById('focus-task-select').onchange = (e) => {
    document.getElementById('focus-task-title').textContent = e.target.value || '—'
  }
}

function openFocusMode() {
  // Populate task select
  const sel = document.getElementById('focus-task-select')
  const pending = (data.tasks || []).filter(t => !t.done)
  sel.innerHTML = '<option value="">— Sin tarea seleccionada —</option>' +
    pending.map(t => `<option value="${t.title}">${t.title}</option>`).join('')
  document.getElementById('focus-task-title').textContent = '—'
  focusRunning = false
  focusSeconds = 25 * 60
  updateFocusDisplay()
  document.getElementById('focus-play').textContent = '▶'
  document.getElementById('focus-overlay').classList.add('active')
}

function closeFocusMode() {
  clearInterval(focusInterval)
  focusRunning = false
  document.getElementById('focus-overlay').classList.remove('active')
}

function toggleFocusTimer() {
  if (focusRunning) {
    clearInterval(focusInterval)
    focusRunning = false
    document.getElementById('focus-play').textContent = '▶'
  } else {
    focusRunning = true
    document.getElementById('focus-play').textContent = '⏸'
    focusInterval = setInterval(() => {
      if (focusSeconds <= 0) {
        clearInterval(focusInterval)
        focusRunning = false
        document.getElementById('focus-play').textContent = '▶'
        document.getElementById('focus-timer-display').textContent = '¡Tiempo!'
        return
      }
      focusSeconds--
      updateFocusDisplay()
    }, 1000)
  }
}

function resetFocusTimer() {
  clearInterval(focusInterval)
  focusRunning = false
  focusSeconds = 25 * 60
  document.getElementById('focus-play').textContent = '▶'
  updateFocusDisplay()
}

function updateFocusDisplay() {
  const m = Math.floor(focusSeconds / 60)
  const s = focusSeconds % 60
  document.getElementById('focus-timer-display').textContent =
    `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}


// ════════════════════════════════════════════════════════════
// 🫧 JUEGO: BURBUJAS
// ════════════════════════════════════════════════════════════
let bubbleRunning = false
let bubbleScore = 0
let bubbleInterval = null
let bubbleSpawnInterval = null
let bubbleIdCounter = 0

const BUBBLE_COLORS = [
  ['#42a5f5','#1565c0'], // azul
  ['#ef5350','#b71c1c'], // rojo
  ['#66bb6a','#1b5e20'], // verde
  ['#ffca28','#f57f17'], // amarillo
  ['#ab47bc','#6a1b9a'], // morado
  ['#26c6da','#006064'], // cyan
  ['#ff7043','#bf360c'], // naranja
  ['#ec407a','#880e4f'], // rosa
]

function setupBubbleGame() {
  document.getElementById('btn-bubble-toggle').onclick = toggleBubbleGame
  document.getElementById('btn-bubble-reset').onclick = resetBubbleGame
}

function toggleBubbleGame() {
  if (bubbleRunning) {
    pauseBubbleGame()
  } else {
    startBubbleGame()
  }
}

function startBubbleGame() {
  bubbleRunning = true
  document.getElementById('btn-bubble-toggle').textContent = '⏸ Pausar'
  spawnBubble()
  bubbleSpawnInterval = setInterval(() => {
    if (bubbleRunning) {
      const count = Math.floor(Math.random() * 2) + 1
      for (let i = 0; i < count; i++) spawnBubble()
    }
  }, 1200)
}

function pauseBubbleGame() {
  bubbleRunning = false
  clearInterval(bubbleSpawnInterval)
  document.getElementById('btn-bubble-toggle').textContent = '▶ Continuar'
}

function resetBubbleGame() {
  bubbleRunning = false
  clearInterval(bubbleSpawnInterval)
  clearInterval(bubbleInterval)
  bubbleScore = 0
  bubbleIdCounter = 0
  document.getElementById('bubble-score').textContent = '0'
  document.getElementById('btn-bubble-toggle').textContent = '▶ Iniciar'
  const arena = document.getElementById('bubble-arena')
  if (arena) arena.innerHTML = ''
}

function spawnBubble() {
  const arena = document.getElementById('bubble-arena')
  if (!arena) return

  const size = Math.floor(Math.random() * 38) + 36 // 36–74px
  const aW = arena.offsetWidth - size - 10
  const aH = arena.offsetHeight - size - 10
  if (aW <= 0 || aH <= 0) return

  const x = Math.random() * aW + 5
  const y = Math.random() * aH + 5

  const [c1, c2] = BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)]
  const id = `bubble-${++bubbleIdCounter}`
  const lifespan = Math.floor(Math.random() * 3000) + 3500 // 3.5–6.5s

  const el = document.createElement('div')
  el.className = 'bubble'
  el.id = id
  el.style.cssText = `
    width:${size}px; height:${size}px;
    left:${x}px; top:${y}px;
    background: radial-gradient(circle at 35% 35%, ${c1}, ${c2});
    box-shadow: 0 4px 16px ${c1}55, inset 0 -4px 8px ${c2}88;
  `

  el.onclick = (e) => {
    e.stopPropagation()
    popBubble(el, x + size/2, y)
  }

  arena.appendChild(el)

  // Auto-escape after lifespan
  const escapeTimer = setTimeout(() => {
    if (el.parentNode) {
      el.style.transition = 'opacity .4s, transform .4s'
      el.style.opacity = '0'
      el.style.transform = 'scale(0.5)'
      setTimeout(() => el.remove(), 400)
    }
  }, lifespan)

  el._escapeTimer = escapeTimer
}

function popBubble(el, x, y) {
  clearTimeout(el._escapeTimer)
  el.classList.add('popping')

  // Score float
  bubbleScore++
  document.getElementById('bubble-score').textContent = bubbleScore
  const arena = document.getElementById('bubble-arena')
  const float = document.createElement('div')
  float.className = 'bubble-score-float'
  float.textContent = '+1'
  float.style.cssText = `left:${x - 12}px; top:${y - 8}px;`
  arena.appendChild(float)
  setTimeout(() => float.remove(), 700)
  setTimeout(() => el.remove(), 260)
}

// ════════════════════════════════════════════════════════════
// 🎨 JUEGO: MÁNDALA ZEN
// ════════════════════════════════════════════════════════════
const MANDALA_PALETTE = [
  '#ef5350','#ff7043','#ffca28','#66bb6a',
  '#42a5f5','#ab47bc','#ec407a','#26c6da',
  '#ffffff','#bdbdbd','#616161','#1a1a2e',
]

let mandalaColor = '#42a5f5'
let mandalaSegments = 12
let mandalaDrawing = false
let mandalaCtx = null
let mandalaCanvas = null
let mandalaCells = []   // { angle, r, color } list of painted regions
let mandalaCellSize = 18

function setupMandalaGame() {
  mandalaCanvas = document.getElementById('mandala-canvas')
  if (!mandalaCanvas) return
  mandalaCtx = mandalaCanvas.getContext('2d')

  // Palette
  const palette = document.getElementById('mandala-palette')
  if (palette) {
    palette.innerHTML = MANDALA_PALETTE.map(c => `
      <button class="mandala-color-btn ${c === mandalaColor ? 'active' : ''}"
        style="background:${c};${c==='#ffffff'?'border-color:var(--border)':''}"
        data-mcolor="${c}"></button>
    `).join('')
    palette.querySelectorAll('.mandala-color-btn').forEach(btn => {
      btn.onclick = () => {
        palette.querySelectorAll('.mandala-color-btn').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        mandalaColor = btn.dataset.mcolor
      }
    })
  }

  // Canvas interaction
  mandalaCanvas.addEventListener('mousedown', () => mandalaDrawing = true)
  mandalaCanvas.addEventListener('mouseup', () => mandalaDrawing = false)
  mandalaCanvas.addEventListener('mouseleave', () => mandalaDrawing = false)
  mandalaCanvas.addEventListener('mousemove', (e) => {
    if (!mandalaDrawing) return
    paintMandala(e)
  })
  mandalaCanvas.addEventListener('click', paintMandala)

  // Controls
  document.getElementById('btn-mandala-clear').onclick = clearMandala
  document.getElementById('btn-mandala-new').onclick = newMandalaPattern

  generateMandalaGrid()
  drawMandala()
}

function getMandalaPos(e) {
  const rect = mandalaCanvas.getBoundingClientRect()
  const scaleX = mandalaCanvas.width / rect.width
  const scaleY = mandalaCanvas.height / rect.height
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  }
}

function generateMandalaGrid() {
  mandalaCells = []
  const cx = mandalaCanvas.width / 2
  const cy = mandalaCanvas.height / 2
  const maxR = cx - 10
  const rings = Math.floor(maxR / mandalaCellSize)

  for (let ring = 1; ring <= rings; ring++) {
    const r = ring * mandalaCellSize
    // more segments on outer rings
    const segs = ring <= 2 ? mandalaSegments / 2 : mandalaSegments
    for (let seg = 0; seg < segs; seg++) {
      const angle = (seg / segs) * Math.PI * 2
      mandalaCells.push({
        ring, seg,
        segs,
        r: r - mandalaCellSize / 2,
        rInner: r - mandalaCellSize,
        rOuter: r,
        angle,
        angleStep: (Math.PI * 2) / segs,
        color: null
      })
    }
  }
  // Center dot
  mandalaCells.push({ type: 'center', color: null })
}

function paintMandala(e) {
  const { x, y } = getMandalaPos(e)
  const cx = mandalaCanvas.width / 2
  const cy = mandalaCanvas.height / 2
  const dx = x - cx
  const dy = y - cy
  const dist = Math.sqrt(dx * dx + dy * dy)
  const angle = Math.atan2(dy, dx)

  // Find which cell was clicked
  let hit = false

  // Check center
  const center = mandalaCells.find(c => c.type === 'center')
  if (center && dist < mandalaCellSize) {
    center.color = mandalaColor
    hit = true
  } else {
    for (const cell of mandalaCells) {
      if (cell.type === 'center') continue
      if (dist >= cell.rInner && dist < cell.rOuter) {
        // normalize angle to 0..2π
        let normAngle = angle < 0 ? angle + Math.PI * 2 : angle
        let cellStart = cell.angle < 0 ? cell.angle + Math.PI * 2 : cell.angle
        let cellEnd = cellStart + cell.angleStep
        if (normAngle >= cellStart && normAngle < cellEnd) {
          // Paint all cells in same ring/seg position (symmetry)
          const sameRing = mandalaCells.filter(c => c.ring === cell.ring && c.segs === cell.segs)
          const relSeg = Math.round((normAngle / (Math.PI * 2)) * cell.segs) % cell.segs
          sameRing.forEach(c => {
            if (c.seg === relSeg) c.color = mandalaColor
          })
          hit = true
          break
        }
      }
    }
  }

  if (hit) drawMandala()
}

function drawMandala() {
  const ctx = mandalaCtx
  const W = mandalaCanvas.width
  const H = mandalaCanvas.height
  const cx = W / 2
  const cy = H / 2

  ctx.clearRect(0, 0, W, H)

  // Background circle
  ctx.beginPath()
  ctx.arc(cx, cy, cx - 4, 0, Math.PI * 2)
  const surfaceColor = getComputedStyle(document.documentElement).getPropertyValue('--card').trim() || '#fff'
  ctx.fillStyle = surfaceColor
  ctx.fill()

  // Draw cells
  const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#e0e0e0'

  for (const cell of mandalaCells) {
    if (cell.type === 'center') {
      // Center circle
      ctx.beginPath()
      ctx.arc(cx, cy, mandalaCellSize, 0, Math.PI * 2)
      if (cell.color) {
        ctx.fillStyle = cell.color
        ctx.fill()
      }
      ctx.strokeStyle = accentColor
      ctx.lineWidth = .8
      ctx.stroke()
      continue
    }

    // Draw all symmetric copies
    const totalSegs = cell.segs
    for (let s = 0; s < totalSegs; s++) {
      const a1 = (s / totalSegs) * Math.PI * 2 - Math.PI / totalSegs
      const a2 = a1 + (Math.PI * 2) / totalSegs

      ctx.beginPath()
      ctx.arc(cx, cy, cell.rOuter, a1, a2)
      ctx.arc(cx, cy, cell.rInner, a2, a1, true)
      ctx.closePath()

      // Find if this segment (same ring, same relative index) has color
      const thisSeg = mandalaCells.find(c => c.ring === cell.ring && c.segs === cell.segs && c.seg === s)
      if (thisSeg && thisSeg.color) {
        ctx.fillStyle = thisSeg.color
        ctx.fill()
      }
      ctx.strokeStyle = accentColor
      ctx.lineWidth = .6
      ctx.stroke()
    }
  }

  // Outer border
  ctx.beginPath()
  ctx.arc(cx, cy, cx - 4, 0, Math.PI * 2)
  ctx.strokeStyle = accentColor
  ctx.lineWidth = 1.5
  ctx.stroke()
}

function clearMandala() {
  mandalaCells.forEach(c => c.color = null)
  drawMandala()
}

function newMandalaPattern() {
  mandalaSegments = [8, 10, 12, 16][Math.floor(Math.random() * 4)]
  mandalaCellSize = [16, 18, 20][Math.floor(Math.random() * 3)]
  generateMandalaGrid()
  drawMandala()
}


// ════════════════════════════════════════════════════════════
// 🔴 MODO STRANGER THINGS — UPSIDE DOWN
// ════════════════════════════════════════════════════════════
const UD_BG = (window.ASSETS && window.ASSETS.strangerThings && window.ASSETS.strangerThings.background) || './assets/st.png'
let upsideDownActive = false
let secretClickCount = 0
let secretClickTimer = null
let fogParticleInterval = null

function setupUpsideDown() {
  const versionEl = document.getElementById('version-secret')
  if (!versionEl) return

  versionEl.addEventListener('click', () => {
    secretClickCount++

    // Hint visual: after 3 clicks start priming
    if (secretClickCount >= 3) versionEl.classList.add('primed')

    clearTimeout(secretClickTimer)
    secretClickTimer = setTimeout(() => {
      secretClickCount = 0
      versionEl.classList.remove('primed')
    }, 1800)

    if (secretClickCount >= 5) {
      secretClickCount = 0
      clearTimeout(secretClickTimer)
      versionEl.classList.remove('primed')
      toggleUpsideDown()
    }
  })

  // Re-apply on load if was active
  if (data.settings && data.settings.upsideDown) {
    activateUpsideDown(true) // silent = true (no notification)
  }
}

function toggleUpsideDown() {
  if (upsideDownActive) {
    deactivateUpsideDown()
  } else {
    activateUpsideDown(false)
  }
}

function activateUpsideDown(silent) {
  // Deactivate any active CSS theme (XP, Rick & Morty, etc.)
  destroyXPExtras()
  if (rmActive) deactivateRickMorty()
  document.body.classList.remove(...THEME_CLASSES, 'has-bg-image')
  document.body.style.backgroundImage = ''
  if (data.settings) { data.settings.activeTheme = 'default'; data.settings.activeThemeId = null }
  document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'))

  upsideDownActive = true
  document.body.classList.add('upside-down')
  // Apply hardcoded background
  document.body.style.setProperty('--ud-bg', `url("${UD_BG}")`)
  spawnFogParticles()
  unlockBadge('upside-down')
  if (!silent) { playSTTheme(); showSTNotification() }
  if (data.settings) {
    data.settings.upsideDown = true
    save()
  }
}

function deactivateUpsideDown() {
  upsideDownActive = false
  document.body.classList.remove('upside-down')
  document.body.style.removeProperty('--ud-bg')
  stopFogParticles()
  if (data.settings) {
    data.settings.upsideDown = false
    save()
  }
}

function showSTNotification() {
  const notif = document.getElementById('st-notification')
  if (!notif) return
  notif.classList.add('show')
  setTimeout(() => notif.classList.remove('show'), 4500)
}

function spawnFogParticles() {
  const container = document.getElementById('fog-particles')
  if (!container) return

  // Big initial batch — fills screen immediately
  for (let i = 0; i < 28; i++) createFogParticle(container, true)

  // Keep spawning continuously
  fogParticleInterval = setInterval(() => {
    if (!upsideDownActive) return
    createFogParticle(container, false)
    // Occasionally spawn a big one
    if (Math.random() < 0.3) createFogParticle(container, false, true)
  }, 450)
}

function createFogParticle(container, randomStart, big = false) {
  const size = big
    ? Math.random() * 200 + 150   // 150–350px large blobs
    : Math.random() * 120 + 60    // 60–180px normal
  const x = Math.random() * 105 - 2        // % horizontal (slightly off edges)
  const drift  = (Math.random() - 0.5) * 260  // horizontal movement
  const drift2 = drift + (Math.random() - 0.5) * 120 // secondary drift
  const duration = Math.random() * 12 + 10   // 10–22s
  const delay = randomStart ? -(Math.random() * duration) : 0

  const el = document.createElement('div')
  el.className = 'fog-particle'
  el.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    left: ${x}%;
    bottom: -${size}px;
    --drift: ${drift}px;
    --drift2: ${drift2}px;
    animation-duration: ${duration}s;
    animation-delay: ${delay}s;
    opacity: 0;
  `
  container.appendChild(el)
  setTimeout(() => {
    if (el.parentNode) el.remove()
  }, (duration + Math.abs(delay)) * 1000 + 500)
}

function stopFogParticles() {
  clearInterval(fogParticleInterval)
  const container = document.getElementById('fog-particles')
  if (container) container.innerHTML = ''
}


// ════════════════════════════════════════════════════════════
// ⚡ MODO RICK & MORTY — C-137
// ════════════════════════════════════════════════════════════
const RM_PORTAL_PNG = (window.ASSETS && window.ASSETS.rickMorty && window.ASSETS.rickMorty.portal)    || './assets/portal.gif'
const RM_RICK_IMG   = (window.ASSETS && window.ASSETS.rickMorty && window.ASSETS.rickMorty.rick)      || './assets/rick.png'
const RM_MORTY_IMG  = (window.ASSETS && window.ASSETS.rickMorty && window.ASSETS.rickMorty.morty)     || './assets/morty.png'

let rmActive = false
let rmClickCount = 0
let rmClickTimer = null
let rmParticleInterval = null
let rmNotifTimer = null
let rmPortalAnimFrame = null
let rmCursorTrailPoints = []
let rmCursorAnimFrame = null
let rmPortalAngle = 0

// ── Textos de dimensión ──────────────────────────────────
const RM_DIM_NAMES = {
  'Dashboard':  'Centro C-137',
  'Tareas':     'Misiones',
  'Agenda':     'Calendario Intergaláctico',
  'Gastos':     'Créditos del Consejo',
  'Flujo':      'Diagrama del Multiverso',
  'Tablero':    'Corcho Interdimensional',
  'Balance':    'Equilibrio Cósmico',
  'Notas':      'Notas del Laboratorio',
  'Metas':      'Objetivos del Consejo',
  'Ajustes':    'Configuración C-137',
  'Gestiona tu lista de pendientes':   'Misiones pendientes en el multiverso',
  'Registro de ingresos y egresos':    'Créditos interdimensionales',
  'Equilibrio entre trabajo y bienestar': 'Equilibrio entre dimensiones',
  'Objetivos y resultados clave':      'Objetivos del Consejo de Ricks',
}
const RM_ORIGINAL_TEXTS = {}

// ── Frases Rick ──────────────────────────────────────────
function getRickQuote() {
  const tasks = (data.tasks || []).filter(t => !t.done)
  const overdue = (data.tasks || []).filter(t => !t.done && t.due && t.due < new Date().toISOString().split('T')[0])
  const totalExp = (data.expenses || []).filter(e => e.type === 'expense').reduce((s,e) => s+e.amount, 0)
  const notes = (data.notes || []).length
  const goals = (data.goals?.objectives || []).length

  const quotes = [
    // Basadas en datos reales
    tasks.length > 0
      ? `*burp* Morty, tienes ${tasks.length} misiones pendientes. Eso es… patético. Incluso el Presidente Morty terminaría antes.`
      : `No tienes tareas pendientes, Morty. Primera vez en la historia del multiverso que alguien lo logra. *burp*`,
    overdue.length > 0
      ? `¿${overdue.length} tareas vencidas, Morty? En la Dimensión Cronenberg eso es normal. Aquí es embarazoso.`
      : `Cero tareas vencidas. Eso significa que o eres muy eficiente o no estás poniendo fechas. *burp* Sospecho lo segundo.`,
    totalExp > 0
      ? `Has gastado ${formatCurrency(totalExp, data.settings?.currency || 'MXN')} en total, Morty. Yo construí un portal gun con $200 pesos. Piénsalo.`
      : `No tienes gastos registrados. O eres millonario o eres tan irresponsable que ni registras. *burp* Ninguna es buena opción.`,
    notes > 0
      ? `${notes} nota${notes!==1?'s':''} en el laboratorio, Morty. El Rey Zaratán tenía más notas y mira cómo terminó.`
      : `Cero notas, Morty. Sin documentación. Así es como pierdes civilizaciones enteras. *burp*`,
    goals > 0
      ? `${goals} objetivo${goals!==1?'s':''} definido${goals!==1?'s':''}. Impresionante. El Consejo de Ricks ni siquiera tiene objetivos. *burp* Eso es preocupante.`
      : `Sin metas definidas. Perfecto. La nihilidad es la única verdad universal. *burp* O algo así.`,
    // Genéricas
    `Wubba Lubba Dub Dub, Morty, que en mi idioma significa "estoy bien". *burp* Mentira, nadie está bien.`,
    `*burp* Esta app está bien, Morty. Para ser algo hecho sin ciencia de cohetes. Que es básicamente lo que yo hago con ciencia de cohetes.`,
    `Morty, en la Dimensión J-22 la productividad es ilegal. A veces pienso que tenían razón. *burp*`,
    `He visitado 6,720 dimensiones, Morty, y en ninguna la gente termina sus tareas a tiempo. Es una constante universal. *burp*`,
  ]
  return quotes[Math.floor(Math.random() * quotes.length)]
}

// ── Frases Morty ─────────────────────────────────────────
function getMortyQuote() {
  const tasks = (data.tasks || []).filter(t => !t.done)
  const overdue = (data.tasks || []).filter(t => !t.done && t.due && t.due < new Date().toISOString().split('T')[0])

  const quotes = [
    tasks.length > 0
      ? `Oh geez, Rick... tienes ${tasks.length} tareas pendientes. Q-quizás deberías terminar algunas antes de abrir más portales, ¿no?`
      : `¡Oh wow! ¡No tienes tareas pendientes, Rick! ¡Eso es increíble! ¿P-podemos ir a casa ahora?`,
    overdue.length > 0
      ? `R-Rick, hay ${overdue.length} tarea${overdue.length!==1?'s':''} vencida${overdue.length!==1?'s':''}... Oh geez, esto no se ve bien, Rick. Esto no se ve bien para nada.`
      : `Oh wow, ¡ninguna tarea vencida! ¡Eso es... eso es bueno, verdad Rick? ¡Sí, eso es bueno!`,
    `Oh geez, Rick... ¿de verdad necesitamos estar en otra dimensión? Tengo tarea que entregar mañana, Rick.`,
    `E-está bien, Rick, yo solo... yo solo quería decir que esta app está muy bien. No sé por qué no me dejas decirlo más seguido.`,
    `Rick, ¿podemos volver a casa? Mi mamá dijo que si llegaba tarde otra vez me iban a quitar el Nintendo. Oh geez.`,
    `Oh hombre, oh geez... ¿sabes qué, Rick? A veces creo que con la mitad del esfuerzo que pones en inventos podrías terminar tus tareas. No sé, es solo una idea, Rick.`,
    `¡Oh wow! ¿Esto es una app de productividad? ¡Es genial, Rick! ¿Por qué no usas esto para organizar tus experimentos? Oh, espera, no, no te dije nada, Rick.`,
    `Rick, creo que a Summer le gustaría esta app. ¿Crees que podríamos...? No, ya sé, ya sé, "no invites a Summer", lo entendí, Rick.`,
  ]
  return quotes[Math.floor(Math.random() * quotes.length)]
}

// ── Setup ────────────────────────────────────────────────
function setupRickMorty() {
  const trigger = document.getElementById('rm-trigger')
  if (!trigger) return

  trigger.addEventListener('click', () => {
    rmClickCount++

    clearTimeout(rmClickTimer)
    if (rmClickCount === 2) trigger.classList.add('primed-1')
    if (rmClickCount === 3) {
      trigger.classList.add('primed-2')
      setTimeout(() => {
        trigger.classList.remove('primed-1','primed-2')
        toggleRickMorty()
        rmClickCount = 0
      }, 200)
      return
    }
    rmClickTimer = setTimeout(() => {
      rmClickCount = 0
      trigger.classList.remove('primed-1','primed-2')
    }, 1600)
  })

  // Close notif button
  document.getElementById('rm-notif-close').onclick = hideRMNotif

  // Cursor trail setup
  setupCursorTrail()

  // Re-apply if was active
  if (data.settings?.rickMorty) activateRickMorty(true)
}

function toggleRickMorty() {
  rmActive ? deactivateRickMorty() : activateRickMorty(false)
}

function activateRickMorty(silent) {
  destroyXPExtras()
  document.body.classList.remove(...THEME_CLASSES, 'has-bg-image')
  document.body.style.backgroundImage = ''
  if (upsideDownActive) deactivateUpsideDown()
  rmActive = true
  document.body.classList.add('rick-morty')
  spawnRMParticles()
  initPortalImage()
  startCursorTrail()
  applyDimensionNames()
  unlockBadge('rick-morty')
  if (!silent) {
    playRMTheme()
    showRMIntro()
    setTimeout(() => scheduleRMNotifications(), 6000)
  } else {
    scheduleRMNotifications()
  }
  if (data.settings) { data.settings.rickMorty = true; save() }
}

function deactivateRickMorty() {
  rmActive = false
  document.body.classList.remove('rick-morty')
  stopRMParticles()
  stopCursorTrail()
  restoreOriginalNames()
  clearTimeout(rmNotifTimer)
  hideRMNotif()
  if (data.settings) { data.settings.rickMorty = false; save() }
}

// ── Intro ────────────────────────────────────────────────
function showRMIntro() {
  const el = document.getElementById('rm-intro')
  if (!el) return
  el.classList.add('show')
  setTimeout(() => el.classList.remove('show'), 3200)
}

// ── Dimension name swap ───────────────────────────────────
function applyDimensionNames() {
  // Nav spans
  document.querySelectorAll('.nav-item span, .view-title, .view-subtitle').forEach(el => {
    const orig = el.textContent.trim()
    if (RM_DIM_NAMES[orig]) {
      const id = `rmtxt-${Math.random().toString(36).slice(2)}`
      el.dataset.rmId = id
      RM_ORIGINAL_TEXTS[id] = el.textContent
      el.textContent = RM_DIM_NAMES[orig]
      el.classList.add('dim-label')
    }
  })
}

function restoreOriginalNames() {
  document.querySelectorAll('[data-rm-id]').forEach(el => {
    const id = el.dataset.rmId
    if (RM_ORIGINAL_TEXTS[id]) {
      el.textContent = RM_ORIGINAL_TEXTS[id]
      el.classList.remove('dim-label')
      delete el.dataset.rmId
    }
  })
}

// ── Notificaciones ───────────────────────────────────────
function scheduleRMNotifications() {
  if (!rmActive) return
  const delay = Math.floor(Math.random() * 35000) + 20000 // 20–55s
  rmNotifTimer = setTimeout(() => {
    if (!rmActive) return
    const isRick = Math.random() > 0.4
    showRMNotif(isRick ? 'rick' : 'morty', isRick ? getRickQuote() : getMortyQuote())
    scheduleRMNotifications()
  }, delay)
}

function showRMNotif(speaker, text) {
  const notif    = document.getElementById('rm-notification')
  const wrap     = document.getElementById('rm-notif-avatar-wrap')
  const img      = document.getElementById('rm-notif-avatar-img')
  const fallback = document.getElementById('rm-notif-avatar-fallback')
  const name     = document.getElementById('rm-notif-name')
  const textEl   = document.getElementById('rm-notif-text')
  if (!notif) return

  // Avatar: swap image source
  const isRick = speaker === 'rick'
  wrap.className = `rm-notif-avatar-wrap${isRick ? '' : ' morty'}`
  img.classList.remove('errored')
  img.src = isRick ? RM_RICK_IMG : RM_MORTY_IMG
  img.alt = isRick ? 'Rick' : 'Morty'
  fallback.textContent = isRick ? 'R' : 'M'
  img.onerror = () => img.classList.add('errored')

  name.className = `rm-notif-name ${speaker}`
  name.textContent = isRick ? 'Rick Sanchez' : 'Morty Smith'
  textEl.textContent = text

  notif.classList.add('show')
  clearTimeout(notif._hideTimer)
  notif._hideTimer = setTimeout(hideRMNotif, 8000)
}

function hideRMNotif() {
  document.getElementById('rm-notification')?.classList.remove('show')
}

// ── Partículas verdes ─────────────────────────────────────
function spawnRMParticles() {
  const container = document.getElementById('rm-particles')
  if (!container) return
  for (let i = 0; i < 24; i++) createRMParticle(container, true)
  rmParticleInterval = setInterval(() => {
    if (!rmActive) return
    createRMParticle(container, false)
    if (Math.random() < 0.25) createRMParticle(container, false, true)
  }, 500)
}

function createRMParticle(container, randomStart, big = false) {
  const size     = big ? Math.random()*180+120 : Math.random()*100+50
  const x        = Math.random() * 105 - 2
  const drift    = (Math.random() - 0.5) * 240
  const drift2   = drift + (Math.random() - 0.5) * 100
  const duration = Math.random() * 12 + 9
  const delay    = randomStart ? -(Math.random() * duration) : 0

  const el = document.createElement('div')
  el.className = 'rm-particle'
  el.style.cssText = `
    width:${size}px; height:${size}px;
    left:${x}%;
    bottom:-${size}px;
    --drift:${drift}px;
    --drift2:${drift2}px;
    animation-duration:${duration}s;
    animation-delay:${delay}s;
    opacity:0;
  `
  container.appendChild(el)
  setTimeout(() => el.remove(), (duration + Math.abs(delay)) * 1000 + 500)
}

function stopRMParticles() {
  clearInterval(rmParticleInterval)
  const c = document.getElementById('rm-particles')
  if (c) c.innerHTML = ''
}

// ── Portal con imagen ─────────────────────────────────────
function initPortalImage() {
  const img = document.getElementById('rm-portal-img')
  if (!img) return
  // Handle broken image → show nothing, CSS handles fallback
  img.onerror = () => img.classList.add('errored')
  // Force reload in case src was already set
  img.src = RM_PORTAL_PNG
}

// ── Portal gun cursor trail ───────────────────────────────
function setupCursorTrail() {
  window.addEventListener('mousemove', (e) => {
    if (!rmActive) return
    rmCursorTrailPoints.push({
      x: e.clientX, y: e.clientY,
      t: Date.now(),
      size: Math.random() * 6 + 3
    })
    // Keep only recent 28 points
    const now = Date.now()
    rmCursorTrailPoints = rmCursorTrailPoints.filter(p => now - p.t < 420)
  })
}

function startCursorTrail() {
  const canvas = document.getElementById('rm-cursor-trail')
  if (!canvas) return
  canvas.width  = window.innerWidth
  canvas.height = window.innerHeight

  const resizeObs = () => {
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
  }
  window.addEventListener('resize', resizeObs)

  const ctx = canvas.getContext('2d')

  function drawTrail() {
    if (!rmActive) { ctx.clearRect(0,0,canvas.width,canvas.height); return }
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const now = Date.now()
    const pts = rmCursorTrailPoints.filter(p => now - p.t < 420)

    pts.forEach((p, i) => {
      const age    = now - p.t
      const alpha  = Math.max(0, 1 - age / 420)
      const radius = p.size * alpha

      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 3.5)
      grd.addColorStop(0,   `rgba(57,255,20,${alpha * 0.9})`)
      grd.addColorStop(0.4, `rgba(30,200,0,${alpha * 0.5})`)
      grd.addColorStop(1,   'rgba(0,100,0,0)')

      ctx.beginPath()
      ctx.arc(p.x, p.y, radius * 3.5, 0, Math.PI * 2)
      ctx.fillStyle = grd
      ctx.fill()
    })

    // Connecting line
    if (pts.length > 1) {
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      pts.forEach(p => ctx.lineTo(p.x, p.y))
      ctx.strokeStyle = `rgba(57,255,20,0.18)`
      ctx.lineWidth = 2
      ctx.stroke()
    }

    rmCursorAnimFrame = requestAnimationFrame(drawTrail)
  }
  drawTrail()
}

function stopCursorTrail() {
  cancelAnimationFrame(rmCursorAnimFrame)
  rmCursorTrailPoints = []
  const canvas = document.getElementById('rm-cursor-trail')
  if (canvas) canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height)
}


/* ════════════════════════════════════════════════
   WINDOWS XP SECRET THEME — Easter Egg Module
   Clippy + BSOD + Bliss wallpaper
   ════════════════════════════════════════════════ */

const XP_WALLPAPER = (window.ASSETS && window.ASSETS.xp && window.ASSETS.xp.wallpaper) || './assets/xp.jpg'
const CLIPPY_IMG   = (window.ASSETS && window.ASSETS.xp && window.ASSETS.xp.clippy)    || './assets/clippy.png'

const CLIPPY_MSGS = [
  "¡Parece que estás intentando ser productivo! ¿Quieres que lo arruine?",
  "Detecté que llevas 3 horas aquí. ¿Has considerado tener amigos?",
  "¿Necesitas ayuda para procrastinar más eficientemente?",
  "Error 404: Motivación no encontrada. ¿Quieres que busque una excusa?",
  "Tu lista de tareas me da tristeza. ¿Quieres que la elimine?",
  "Noto que no has guardado. Sería una lástima que algo... pasara.",
  "¿Sabías que podrías estar durmiendo en vez de esto?",
  "Llevo aquí 20 años esperando que alguien me necesite. Gracias.",
  "Tu presupuesto del mes me parece... optimista.",
  "He analizado tus metas. Estadísticamente, buen intento.",
  "¿Quieres escribir una carta? ¿Una nota suicida quizás? No, espera—",
  "Detecté actividad sospechosa: estás siendo productivo. Raro.",
  "¿Sabías que Windows XP salió de soporte en 2014? Y aún así aquí estoy.",
  "Tu calendario está muy vacío. Igual que tu agenda social, supongo.",
  "Parece que estás usando Sophron. ¿Quieres saber cómo usarlo mal?",
]

let clippyEl = null
let clippyTimer = null
let bsodTimer = null
let clippyMsgIndex = 0

function initXPExtras() {
  createClippy()
  scheduleClippy()
  scheduleBSOD()
}

function destroyXPExtras() {
  if (clippyEl) { clippyEl.remove(); clippyEl = null }
  clearTimeout(clippyTimer)
  clearTimeout(bsodTimer)
  const bsod = document.getElementById('xp-bsod')
  if (bsod) bsod.remove()
}

/* ── CLIPPY ── */
function createClippy() {
  if (document.getElementById('clippy-widget')) return
  clippyEl = document.createElement('div')
  clippyEl.id = 'clippy-widget'
  clippyEl.innerHTML = `
    <div id="clippy-bubble" class="clippy-bubble hidden">
      <span id="clippy-text"></span>
      <button id="clippy-dismiss" onclick="dismissClippy()">✕</button>
    </div>
    <img id="clippy-img" src="${CLIPPY_IMG}" alt="Clippy" onclick="showClippyMsg()">
  `
  document.body.appendChild(clippyEl)
}

function showClippyMsg(force) {
  if (!document.body.classList.contains('theme-winxp')) return
  const bubble = document.getElementById('clippy-bubble')
  const text   = document.getElementById('clippy-text')
  if (!bubble || !text) return
  const msg = CLIPPY_MSGS[clippyMsgIndex % CLIPPY_MSGS.length]
  clippyMsgIndex++
  text.textContent = msg
  bubble.classList.remove('hidden')
  bubble.classList.add('visible')
  // Auto-hide after 7s unless dismissed
  clearTimeout(clippyTimer)
  clippyTimer = setTimeout(() => dismissClippy(), 7000)
}

function dismissClippy() {
  const bubble = document.getElementById('clippy-bubble')
  if (bubble) { bubble.classList.remove('visible'); bubble.classList.add('hidden') }
  scheduleClippy()
}

function scheduleClippy() {
  clearTimeout(clippyTimer)
  const delay = 18000 + Math.random() * 25000 // 18-43s
  clippyTimer = setTimeout(() => showClippyMsg(), delay)
}

/* ── BSOD ── */
function showBSOD() {
  if (!document.body.classList.contains('theme-winxp')) return
  const bsod = document.createElement('div')
  bsod.id = 'xp-bsod'
  const bsodVariants = [
    {
      title: 'A problem has occurred and Windows has been shut down',
      header: 'Sophron ha decidido que necesitas un descanso.<br>No es un error. Es un consejo profesional no solicitado.',
      body: `<p>Llevas demasiado tiempo aquí. Windows lo ha notado. Tu madre también.</p>
      <br>
      <p>Si esto es la primera vez que ves esta pantalla, felicidades:</p>
      <p>has desbloqueado el tema secreto de Windows XP. No había premio.</p>
      <br>
      <p>SOLUCIONES RECOMENDADAS:</p>
      <p>1. Sal a caminar. Sí, afuera. Donde está el sol.</p>
      <p>2. Llama a alguien. A quien sea. Te escucharán.</p>
      <p>3. Haz click aquí para volver a fingir que eres productivo.</p>`,
      stop: '*** STOP: 0x00000000 (SKILL_ISSUE, TOUCH_GRASS, 0xDEADBEEF, 0xCAFEBABE)',
      file: 'tu_vida.exe - Excepción no controlada en el módulo AMBICIONES_PERSONALES.dll'
    },
    {
      title: 'Windows XP ha encontrado un error irrecuperable',
      header: 'Error fatal: Se detectó demasiada productividad en el sistema.<br>Por seguridad, Windows ha decidido interrumpir esta ilusión.',
      body: `<p>Tu lista de tareas ha alcanzado un tamaño crítico.</p>
      <p>El sistema ha colapsado bajo el peso de tus pendientes.</p>
      <br>
      <p>DIAGNÓSTICO AUTOMÁTICO:</p>
      <p>- Motivación: 2% (nivel crítico)</p>
      <p>- Tareas completadas hoy: estadísticamente irrelevante</p>
      <p>- Procrastinación detectada: NIVEL EXPERTO</p>
      <br>
      <p>Se recomienda reiniciar el cerebro y volver a intentarlo mañana.</p>`,
      stop: '*** STOP: 0xDEAD_TODO (0xNEVER_DONE, 0xMORE_COFFEE, INFINITE_LOOP_DETECTED)',
      file: 'sophron.exe - Falla en módulo GESTIÓN_DEL_TIEMPO.sys (sí, existe ese archivo)'
    },
    {
      title: 'Pantalla Azul de la Muerte — Edición Especial Sophron',
      header: '¡Enhorabuena! Has encontrado el easter egg más inútil de la historia del software.<br>No hay premio. Solo esta pantalla azul y los recuerdos.',
      body: `<p>Mientras lees esto, otras personas están siendo productivas.</p>
      <p>Solo querías que lo supieras.</p>
      <br>
      <p>INFORMACIÓN TÉCNICA (completamente inventada):</p>
      <p>- sophron_secret_theme.exe cargado correctamente</p>
      <p>- Windows XP detectado: NO (pero igual lo pusimos)</p>
      <p>- Clippy está juzgándote desde la esquina: SÍ</p>
      <br>
      <p>Haz clic para volver. O quédate aquí reflexionando. Lo entendemos.</p>`,
      stop: '*** STOP: 0xEASTER_EGG (0xCLIPPY_APPROVES, 0xBLISS_WALLPAPER, 0x00000XP)',
      file: 'secreto.exe — No deberías haber llegado hasta aquí. Y aquí estás.'
    }
  ]
  const bv = bsodVariants[Math.floor(Math.random() * bsodVariants.length)]
  bsod.innerHTML = `
    <div class="bsod-inner">
      <p class="bsod-title">${bv.title}</p>
      <div class="bsod-header">${bv.header}</div>
      <br>
      ${bv.body}
      <br>
      <p>Información técnica:</p>
      <br>
      <p class="bsod-stop">${bv.stop}</p>
      <br>
      <p class="bsod-file">${bv.file}</p>
      <br>
      <div class="bsod-progress">
        Borrando tus datos... <span id="bsod-pct">0</span>% completado
      </div>
      <p class="bsod-hint">( haz clic o presiona cualquier tecla para fingir que esto no pasó )</p>
    </div>
  `
  bsod.addEventListener('click', closeBSOD)
  document.addEventListener('keydown', closeBSODKey)
  document.body.appendChild(bsod)

  // Animate progress counter
  let pct = 0
  const tick = setInterval(() => {
    pct += Math.floor(Math.random() * 4) + 1
    if (pct >= 100) { pct = 100; clearInterval(tick) }
    const el = document.getElementById('bsod-pct')
    if (el) el.textContent = pct
  }, 120)
}

function closeBSODKey(e) {
  closeBSOD()
  document.removeEventListener('keydown', closeBSODKey)
}

function closeBSOD() {
  const bsod = document.getElementById('xp-bsod')
  if (bsod) {
    bsod.style.animation = 'bsod-out 0.3s ease forwards'
    setTimeout(() => { if (bsod.parentNode) bsod.remove() }, 320)
  }
  document.removeEventListener('keydown', closeBSODKey)
  scheduleBSOD()
}

function scheduleBSOD() {
  clearTimeout(bsodTimer)
  const delay = 60000 + Math.random() * 90000 // 1-2.5 min
  bsodTimer = setTimeout(() => showBSOD(), delay)
}



// ════════════════════════════════════════════════════════════
// ⭐ MODO STAR WARS — USE THE FORCE
// Activar: crear tarea "use the force"
// Desactivar: crear tarea "i am your father"
// ════════════════════════════════════════════════════════════

let swActive   = false
let swSide     = 'light'   // 'light' | 'dark'
let swStarfieldFrame = null
let swCursorFrame    = null
let swCursorPoints   = []
let swStars          = []
let swNotifTimer     = null
let swSaberListeners = []

// ── Audio — solo archivos, sin síntesis ──────────────────
function _playAudio(assetKey, vol = 0.6, namespace = 'starWars') {
  const src = window.ASSETS?.[namespace]?.[assetKey]
  if (!src) return
  try {
    const a = new Audio(src)
    a.volume = vol
    a.play().catch(() => {})
  } catch(e) {}
}

function playSaberHum()       { _playAudio('saber',     0.5) }
function playVaderBreath()    { _playAudio('vader',     0.6) }
function playR2Beep()         { _playAudio('r2beep',    0.5) }

// ── Audio Easter Eggs ─────────────────────────────────────
function playSTTheme()        { _playAudio('theme',     0.6, 'strangerThings') }
function playRMTheme()        { _playAudio('theme',     0.6, 'rickMorty') }
function playXPStartup()      { _playAudio('startup',   0.8, 'xp') }


// ── Mapas de texto ────────────────────────────────────────
const SW_NAV_NAMES = {
  'Dashboard':  'Holo-Map',
  'Tareas':     'Misiones',
  'Agenda':     'Cronómetro Galáctico',
  'Gastos':     'Créditos',
  'Flujo':      'Consejo Jedi',
  'Tablero':    'Holoteca',
  'Balance':    'Equilibrio de la Fuerza',
  'Notas':      'Holocrón',
  'Metas':      'Profecías',
  'Ajustes':    'Consola Imperial',
}
const SW_SUBTITLE_NAMES = {
  'Gestiona tu lista de pendientes':          'Que la Fuerza guíe tus misiones, Padawan',
  'Registro de ingresos y egresos':           'Créditos galácticos en circulación',
  'Visualiza procesos y decisiones':          'El lado oscuro nubla todo lo visible',
  'Conecta ideas, fotos y notas':             'Los Archivos del Holocrón Jedi',
  'Personaliza tu experiencia':              'Calibra tu sable de luz',
  'Equilibrio entre trabajo y bienestar':     'El balance de la Fuerza',
  'Objetivos y resultados clave (OKRs)':      'Las profecías del Jedi Council',
  'Ideas, recordatorios y apuntes rápidos':   'Transmisiones del Holocrón',
}
const SW_ORIGINAL_TEXTS = {}

// ── Frases de Yoda para tooltips ─────────────────────────
const SW_YODA_QUOTES = [
  'Completa esta misión, debes.',
  'El camino hacia el lado oscuro, la procrastinación es.',
  'Haz o no hagas. Intentar, no existe.',
  'Difícil el camino es, pero terminar debes.',
  'Fuerte en la Fuerza esta misión es.',
  'La prisa lleva al lado oscuro.',
  'Concentrarte debes. Distracciones, el enemigo son.',
  'Mucho que aprender aún tienes, Padawan.',
  'Una con la Fuerza, tu mente debe estar.',
  'La paciencia, una virtud Jedi es.',
]

// ── Frases de notificación ────────────────────────────────
const SW_NOTIF_QUOTES = [
  ['✨', '"Haz o no hagas. Intentar, no existe." — Yoda'],
  ['🌑', '"El miedo lleva a la ira… la ira lleva al lado oscuro." — Yoda'],
  ['⚔️', '"Luminosos somos, no esta tosca materia." — Yoda'],
  ['🌟', '"La Fuerza siempre estará contigo." — Obi-Wan'],
  ['💫', '"El poder de la Fuerza no se mide en fuerza bruta." — Qui-Gon'],
  ['🔴', '"Poderoso eres. Pero cuidado, el lado oscuro aguarda." — Yoda'],
  ['🪐', '"Una galaxia de posibilidades te espera, Padawan." — Obi-Wan'],
  ['⚡', '"El balance de la Fuerza depende de tus misiones completadas." — Holocrón'],
  ['🤖', '*bee-boo-WEE* *bwaaarp* *boop-boop* — R2-D2'],
]

// ── Setup ─────────────────────────────────────────────────
function setupStarWars() {
  window.addEventListener('mousemove', e => {
    if (!swActive) return
    swCursorPoints.push({ x: e.clientX, y: e.clientY, t: Date.now() })
    const now = Date.now()
    swCursorPoints = swCursorPoints.filter(p => now - p.t < 380)
  })
  if (data.settings?.starWars) activateStarWars(true)
  if (data.settings?.sith) { activateStarWars(true); activateSith(true) }
}

// ── Activar ───────────────────────────────────────────────
function activateStarWars(silent) {
  destroyXPExtras()
  if (upsideDownActive) deactivateUpsideDown()
  if (rmActive) deactivateRickMorty()
  document.body.classList.remove(...THEME_CLASSES, 'has-bg-image')
  document.body.style.backgroundImage = ''
  if (data.settings) { data.settings.activeTheme = 'default'; data.settings.activeThemeId = null }
  document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'))

  swActive = true
  loadSWFont()
  document.body.classList.add('theme-starwars')

  startStarfield()
  startSWCursorTrail()
  unlockBadge('starwars')
  applySWNames()
  attachSaberHoverSounds()
  updateSWSide(true)   // silent = no notif on first load

  if (!silent) {
    playSWIntroVideo()
  }
  scheduleSWNotifications()
  if (data.settings) { data.settings.starWars = true; save() }
}

// ── Desactivar ────────────────────────────────────────────
function deactivateStarWars() {
  if (typeof sithActive !== 'undefined' && sithActive) deactivateSith()
  swActive = false
  document.body.classList.remove('theme-starwars', 'sw-dark-side')
  stopStarfield()
  stopSWCursorTrail()
  restoreSWNames()
  detachSaberHoverSounds()
  clearTimeout(swNotifTimer)
  hideSWNotif()
  hideSWSideBadge()
  stopSWIntroVideo()
  if (data.settings) { data.settings.starWars = false; save() }
}

// ── Fuente Star Jedi (CDN) ────────────────────────────────
function loadSWFont() {
  if (document.getElementById('sw-font-link')) return
  const link = document.createElement('link')
  link.id   = 'sw-font-link'
  link.rel  = 'stylesheet'
  link.href = 'https://fonts.cdnfonts.com/css/star-jedi'
  document.head.appendChild(link)
}

// ── Starfield animado ─────────────────────────────────────
function startStarfield() {
  const canvas = document.getElementById('sw-starfield')
  if (!canvas) return
  canvas.width  = window.innerWidth
  canvas.height = window.innerHeight
  swStars = Array.from({ length: 220 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.6 + 0.2,
    alpha: Math.random() * 0.75 + 0.25,
    phase: Math.random() * Math.PI * 2,
    speed: Math.random() * 0.02 + 0.008,
    drift: Math.random() * 0.12 + 0.03,
  }))
  window.addEventListener('resize', onSWResize)
  const ctx = canvas.getContext('2d')
  function draw() {
    if (!swActive) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    swStars.forEach(s => {
      s.phase += s.speed
      const a = s.alpha * (0.55 + 0.45 * Math.sin(s.phase))
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${a})`
      ctx.fill()
      s.y -= s.drift * 0.4
      if (s.y < 0) { s.y = canvas.height; s.x = Math.random() * canvas.width }
    })
    swStarfieldFrame = requestAnimationFrame(draw)
  }
  draw()
}

function stopStarfield() {
  cancelAnimationFrame(swStarfieldFrame)
  window.removeEventListener('resize', onSWResize)
  const c = document.getElementById('sw-starfield')
  if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height)
}

function onSWResize() {
  const sf = document.getElementById('sw-starfield')
  if (sf) { sf.width = window.innerWidth; sf.height = window.innerHeight }
  const ct = document.getElementById('sw-cursor-trail')
  if (ct) { ct.width = window.innerWidth; ct.height = window.innerHeight }
}

// ── Cursor trail (sable de luz) ───────────────────────────
function startSWCursorTrail() {
  const canvas = document.getElementById('sw-cursor-trail')
  if (!canvas) return
  canvas.width  = window.innerWidth
  canvas.height = window.innerHeight
  const ctx = canvas.getContext('2d')
  function draw() {
    if (!swActive) { ctx.clearRect(0,0,canvas.width,canvas.height); return }
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const now = Date.now()
    const pts = swCursorPoints.filter(p => now - p.t < 380)
    if (pts.length > 1) {
      const rgb = swSide === 'dark' ? '255,60,60' : '80,195,255'
      for (let i = 1; i < pts.length; i++) {
        const age = now - pts[i].t
        const a   = Math.max(0, 1 - age / 380)
        const p   = pts[i], pp = pts[i-1]
        // Aura exterior
        ctx.beginPath(); ctx.moveTo(pp.x,pp.y); ctx.lineTo(p.x,p.y)
        ctx.strokeStyle = `rgba(${rgb},${a*0.28})`; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.stroke()
        // Brillo medio
        ctx.beginPath(); ctx.moveTo(pp.x,pp.y); ctx.lineTo(p.x,p.y)
        ctx.strokeStyle = `rgba(${rgb},${a*0.6})`; ctx.lineWidth = 4; ctx.stroke()
        // Core blanco
        ctx.beginPath(); ctx.moveTo(pp.x,pp.y); ctx.lineTo(p.x,p.y)
        ctx.strokeStyle = `rgba(255,255,255,${a*0.85})`; ctx.lineWidth = 1.5; ctx.stroke()
      }
    }
    swCursorFrame = requestAnimationFrame(draw)
  }
  draw()
}

function stopSWCursorTrail() {
  cancelAnimationFrame(swCursorFrame)
  swCursorPoints = []
  const c = document.getElementById('sw-cursor-trail')
  if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height)
}

// ── Intro crawl ───────────────────────────────────────────
// ── Video de intro ────────────────────────────────────────
function playSWIntroVideo() {
  const src = window.ASSETS?.starWars?.introVideo || './assets/starwarsintro.mp4'
  const overlay = document.getElementById('sw-video-overlay')
  const vid     = document.getElementById('sw-video')
  if (!overlay || !vid) return
  vid.src = src
  vid.currentTime = 0
  overlay.style.display = 'flex'
  vid.play().catch(() => {})
  vid.onended = stopSWIntroVideo
}

function stopSWIntroVideo() {
  const overlay = document.getElementById('sw-video-overlay')
  const vid     = document.getElementById('sw-video')
  if (!overlay) return
  overlay.style.display = 'none'
  if (vid) { vid.pause(); vid.src = '' }
}

// ── Swaps de texto ────────────────────────────────────────
function applySWNames() {
  document.querySelectorAll('.nav-item span, .view-title, .view-subtitle').forEach(el => {
    const orig   = el.textContent.trim()
    const mapped = SW_NAV_NAMES[orig] || SW_SUBTITLE_NAMES[orig]
    if (mapped) {
      const id = `sw-${Math.random().toString(36).slice(2)}`
      el.dataset.swId = id
      SW_ORIGINAL_TEXTS[id] = el.textContent
      el.textContent = mapped
      el.classList.add('sw-label')
    } else if (orig === '—') {
      const id = `sw-${Math.random().toString(36).slice(2)}`
      el.dataset.swId = id
      SW_ORIGINAL_TEXTS[id] = el.textContent
      el.textContent = 'A long time ago, in una galaxia muy, muy lejana…'
      el.classList.add('sw-label')
    }
  })
}

function restoreSWNames() {
  document.querySelectorAll('[data-sw-id]').forEach(el => {
    const id = el.dataset.swId
    if (SW_ORIGINAL_TEXTS[id]) {
      el.textContent = SW_ORIGINAL_TEXTS[id]
      el.classList.remove('sw-label')
      delete el.dataset.swId
    }
  })
}

// ── Lado Luminoso vs. Lado Oscuro ─────────────────────────
function updateSWSide(silent) {
  if (!swActive) return
  const done    = (data.tasks || []).filter(t => t.done).length
  const pending = (data.tasks || []).filter(t => !t.done).length
  const newSide = done >= pending ? 'light' : 'dark'
  const changed = newSide !== swSide
  swSide = newSide
  document.body.classList.toggle('sw-dark-side', swSide === 'dark')

  // Badge
  const badge = document.getElementById('sw-side-badge')
  if (badge) {
    badge.textContent = swSide === 'dark' ? '⚡ Lado Oscuro' : '✨ Lado Luminoso'
    badge.classList.add('show')
    clearTimeout(badge._t)
    badge._t = setTimeout(() => badge.classList.remove('show'), 3500)
  }

  if (changed && !silent) {
    showSWNotif(swSide === 'dark'
      ? '🌑 El lado oscuro te domina… completa más misiones, Padawan'
      : '✨ La Fuerza está contigo. El balance se restaura, Jedi.'
    )
  }
}

// ── Hook interno: se llama después de renderTasks ─────────
function onTasksRendered_SW() {
  if (!swActive) return
  updateSWSide()
  updateMidiChlorians()
  updateForceBar()
}

// ── Midi-chlorians (contador de tareas pendientes) ────────
function updateMidiChlorians() {
  if (!swActive) return
  const pending = (data.tasks || []).filter(t => !t.done).length
  const el = document.getElementById('dash-tasks-pending')
  if (el) el.textContent = `${pending} misiones pendientes`
}

// ── Barra de la Fuerza ────────────────────────────────────
function updateForceBar() {
  if (!swActive) return
  const total = (data.tasks || []).length
  const done  = (data.tasks || []).filter(t => t.done).length
  const pct   = total > 0 ? Math.round((done/total)*100) : 0
  const bar   = document.getElementById('dash-tasks-bar')
  if (bar) bar.parentElement.title = `Nivel de la Fuerza: ${pct}%`
}

// ── Yoda tooltips en tareas ───────────────────────────────
function attachYodaTooltips() {
  document.querySelectorAll('.task-item:not([data-sw-tip])').forEach((el, i) => {
    el.dataset.swTip = 'true'
    el.title = SW_YODA_QUOTES[i % SW_YODA_QUOTES.length]
  })
}

// ── Hover sounds en botones ───────────────────────────────
function attachSaberHoverSounds() {
  document.querySelectorAll('.nav-item, .btn-primary').forEach(el => {
    const fn = () => { if (swActive) playSaberHum(false) }
    el.addEventListener('mouseenter', fn)
    swSaberListeners.push({ el, fn })
  })
}
function detachSaberHoverSounds() {
  swSaberListeners.forEach(({ el, fn }) => el.removeEventListener('mouseenter', fn))
  swSaberListeners = []
}

// ── Notificaciones periódicas ─────────────────────────────
function scheduleSWNotifications() {
  clearTimeout(swNotifTimer)
  if (!swActive) return
  const delay = Math.floor(Math.random() * 38000) + 22000
  swNotifTimer = setTimeout(() => {
    if (!swActive) return
    playR2Beep()
    const [icon, text] = SW_NOTIF_QUOTES[Math.floor(Math.random() * SW_NOTIF_QUOTES.length)]
    showSWNotif(text, icon)
    scheduleSWNotifications()
  }, delay)
}

function showSWNotif(text, icon) {
  const notif = document.getElementById('sw-notification')
  if (!notif) return
  notif.querySelector('.sw-notif-icon').textContent = icon || '✨'
  notif.querySelector('.sw-notif-text').textContent = text
  notif.classList.add('show')
  clearTimeout(notif._t)
  notif._t = setTimeout(hideSWNotif, 6500)
}
function hideSWNotif() {
  document.getElementById('sw-notification')?.classList.remove('show')
}
function hideSWSideBadge() {
  const b = document.getElementById('sw-side-badge')
  if (b) b.classList.remove('show')
}


// ════════════════════════════════════════════════════════════
// 🔴 MODO SITH — JOIN THE DARK SIDE
// Requiere modo Star Wars activo primero
// Activar:    crear tarea "join the dark side"
// Desactivar: crear tarea "i am a jedi"
// ════════════════════════════════════════════════════════════

let sithActive            = false
let sithLightningInterval = null
let sithFogInterval       = null
let sithInactivityTimer   = null
let sithNotifTimer        = null
let sithHoverListeners    = []
let sithLastActivity      = Date.now()

// ── Audio Sith — solo archivos ────────────────────────────
function playImperialMarch() { _playAudio('imperialMarch', 0.6) }
function playLightningSfx()  { _playAudio('lightning',     0.45) }
function playSithThunder()   { _playAudio('thunder',       0.6) }
function playPalpatineGood() { _playAudio('palpatine',     0.6) }
function playVaderNotif()    { _playAudio('vader',         0.5) }

// ── Textos Imperio ────────────────────────────────────────
const SITH_NAV_NAMES = {
  'Dashboard':  'Centro del Imperio',
  'Tareas':     'Órdenes Imperiales',
  'Agenda':     'Cronómetro Imperial',
  'Gastos':     'Tesoro Imperial',
  'Flujo':      'Consejo Sith',
  'Tablero':    'Archivos Sith',
  'Balance':    'Control del Imperio',
  'Notas':      'Holocrón Oscuro',
  'Metas':      'Dominio Galáctico',
  'Ajustes':    'Consola del Emperador',
}
const SITH_SUBTITLE_NAMES = {
  'Gestiona tu lista de pendientes':          'Órdenes sin ejecutar, Lord Vader',
  'Registro de ingresos y egresos':           'El tesoro del Imperio Galáctico',
  'Visualiza procesos y decisiones':          'La voluntad del Lado Oscuro',
  'Conecta ideas, fotos y notas':             'Los Archivos Sith clasificados',
  'Personaliza tu experiencia':              'Calibra el poder del Imperio',
  'Equilibrio entre trabajo y bienestar':     'El Lado Oscuro no descansa',
  'Objetivos y resultados clave (OKRs)':      'Planes del Dominio Galáctico',
  'Ideas, recordatorios y apuntes rápidos':   'Transmisiones del Holocrón Oscuro',
}
const SITH_ORIGINAL_TEXTS = {}

// ── Frases de Palpatine para tooltips ─────────────────────
const SITH_TOOLTIPS = [
  'Tu odio te hace poderoso.',
  'Ejecuta esta orden. Ahora.',
  'El Lado Oscuro no perdona la debilidad.',
  'Completa tu destino, Lord Vader.',
  'El miedo es tu aliado.',
  'Ilimitado... poder.',
  'No hay escapatoria. Solo el Imperio.',
  'La compasión es una debilidad Jedi.',
  'Haz lo que se debe hacer.',
  'El Lado Oscuro te guiará.',
]

// ── Frases de notificación Sith ───────────────────────────
const SITH_NOTIF_QUOTES = [
  ['⚡', '"Ilimitado... poder." — Emperador Palpatine'],
  ['🔴', '"Tu odio te hace poderoso, Lord Vader." — Palpatine'],
  ['🌑', '"El Lado Oscuro del poder nunca muere." — Palpatine'],
  ['⚔️', '"Completa tu entrenamiento o perecerás." — Vader'],
  ['💀', '"Tu falta de fe me resulta perturbadora." — Vader'],
  ['🔥', '"Únete a mí y juntos gobernaremos la galaxia." — Vader'],
  ['⚡', '"¡El poder del Lado Oscuro es ilimitado!" — Palpatine'],
  ['🌑', '"El Imperio reinará por diez mil años." — Palpatine'],
]

// ── Frases dinámicas por inactividad ─────────────────────
const SITH_INACTIVITY_QUOTES = [
  '"Tu falta de fe me resulta perturbadora." — Vader',
  '"La inactividad es una traición al Imperio." — Palpatine',
  '"¿Dónde está tu odio? ¡Úsalo!" — Palpatine',
  '"El Lado Oscuro no espera, Lord Vader." — Palpatine',
  '"Cada segundo perdido es una victoria Rebelde." — Vader',
]

// ── Activar Sith ──────────────────────────────────────────
function activateSith(silent) {
  if (!swActive) return
  sithActive = true
  sithLastActivity = Date.now()
  document.body.classList.add('sith-mode')
  startSithLightning()
  startSithFog()
  applySithNames()
  attachLightningHoverSounds()
  if (!silent) {
    setTimeout(() => playImperialMarch(), 200)
    showSWNotif('⚡ El Lado Oscuro te ha reclamado, Lord Vader.', '🌑')
  }
  scheduleSithNotifications()
  startSithInactivityWatcher()
  if (data.settings) { data.settings.sith = true; save() }
}

// ── Desactivar Sith ───────────────────────────────────────
function deactivateSith() {
  sithActive = false
  document.body.classList.remove('sith-mode')
  stopSithLightning()
  stopSithFog()
  restoreSithNames()
  detachLightningHoverSounds()
  clearTimeout(sithNotifTimer)
  clearTimeout(sithInactivityTimer)
  showSWNotif('✨ Has vuelto al Lado Luminoso, Jedi.', '🌟')
  if (data.settings) { data.settings.sith = false; save() }
}

// ── Partículas de relámpago rojo ──────────────────────────
function startSithLightning() {
  const container = document.getElementById('sith-particles')
  if (!container) return
  for (let i = 0; i < 18; i++) createSithLightning(container, true)
  sithLightningInterval = setInterval(() => {
    if (!sithActive) return
    createSithLightning(container, false)
    if (Math.random() < 0.3) createSithLightning(container, false, true)
  }, 320)
}

function createSithLightning(container, randomStart, big = false) {
  const el = document.createElement('div')
  el.className = 'sith-lightning'
  const x        = Math.random() * 100
  const duration = Math.random() * 1.2 + 0.6
  const delay    = randomStart ? -(Math.random() * 3) : 0
  const height   = big ? Math.random() * 180 + 80 : Math.random() * 80 + 30
  const skew     = (Math.random() - 0.5) * 40
  el.style.cssText = `
    left: ${x}%;
    top: -${height}px;
    height: ${height}px;
    --skew: ${skew}deg;
    animation-duration: ${duration}s;
    animation-delay: ${delay}s;
  `
  container.appendChild(el)
  setTimeout(() => el.remove(), (duration + Math.abs(delay)) * 1000 + 300)
}

function stopSithLightning() {
  clearInterval(sithLightningInterval)
  const c = document.getElementById('sith-particles')
  if (c) c.innerHTML = ''
}

// ── Niebla roja ───────────────────────────────────────────
function startSithFog() {
  const container = document.getElementById('sith-fog')
  if (!container) return
  for (let i = 0; i < 14; i++) createSithFogParticle(container, true)
  sithFogInterval = setInterval(() => {
    if (!sithActive) return
    createSithFogParticle(container, false)
  }, 600)
}

function createSithFogParticle(container, randomStart) {
  const size     = Math.random() * 300 + 150
  const x        = Math.random() * 110 - 5
  const drift    = (Math.random() - 0.5) * 300
  const duration = Math.random() * 14 + 10
  const delay    = randomStart ? -(Math.random() * duration) : 0
  const el = document.createElement('div')
  el.className = 'sith-fog-particle'
  el.style.cssText = `
    width:${size}px; height:${size}px;
    left:${x}%; bottom:-${size}px;
    --drift:${drift}px;
    animation-duration:${duration}s;
    animation-delay:${delay}s;
    opacity:0;
  `
  container.appendChild(el)
  setTimeout(() => el.remove(), (duration + Math.abs(delay)) * 1000 + 500)
}

function stopSithFog() {
  clearInterval(sithFogInterval)
  const c = document.getElementById('sith-fog')
  if (c) c.innerHTML = ''
}

// ── Swaps de texto ────────────────────────────────────────
function applySithNames() {
  document.querySelectorAll('.nav-item span, .view-title, .view-subtitle').forEach(el => {
    // Primero revertir los SW si los había
    if (el.dataset.swId && SW_ORIGINAL_TEXTS[el.dataset.swId]) {
      el.textContent = SW_ORIGINAL_TEXTS[el.dataset.swId]
    }
    const orig   = el.textContent.trim()
    const mapped = SITH_NAV_NAMES[orig] || SITH_SUBTITLE_NAMES[orig]
    if (mapped) {
      const id = `sith-${Math.random().toString(36).slice(2)}`
      el.dataset.sithId = id
      SITH_ORIGINAL_TEXTS[id] = el.textContent
      el.textContent = mapped
      el.classList.add('sith-label')
    }
  })
}

function restoreSithNames() {
  document.querySelectorAll('[data-sith-id]').forEach(el => {
    const id = el.dataset.sithId
    if (SITH_ORIGINAL_TEXTS[id]) {
      el.textContent = SITH_ORIGINAL_TEXTS[id]
      el.classList.remove('sith-label')
      delete el.dataset.sithId
    }
  })
  // Re-apply SW names now that sith is gone
  if (swActive) applySWNames()
}

// ── Tooltips de Palpatine ─────────────────────────────────
function attachSithTooltips() {
  document.querySelectorAll('.task-item:not([data-sith-tip])').forEach((el, i) => {
    el.dataset.sithTip = 'true'
    el.title = SITH_TOOLTIPS[i % SITH_TOOLTIPS.length]
  })
}

// ── Hover sounds relámpago ────────────────────────────────
function attachLightningHoverSounds() {
  document.querySelectorAll('.nav-item, .btn-primary').forEach(el => {
    const fn = () => { if (sithActive) playLightningSfx() }
    el.addEventListener('mouseenter', fn)
    sithHoverListeners.push({ el, fn })
  })
}
function detachLightningHoverSounds() {
  sithHoverListeners.forEach(({ el, fn }) => el.removeEventListener('mouseenter', fn))
  sithHoverListeners = []
}

// ── Notificaciones periódicas ─────────────────────────────
function scheduleSithNotifications() {
  clearTimeout(sithNotifTimer)
  if (!sithActive) return
  const delay = Math.floor(Math.random() * 35000) + 20000
  sithNotifTimer = setTimeout(() => {
    if (!sithActive) return
    playVaderNotif()
    const [icon, text] = SITH_NOTIF_QUOTES[Math.floor(Math.random() * SITH_NOTIF_QUOTES.length)]
    showSWNotif(text, icon)
    scheduleSithNotifications()
  }, delay)
}

// ── Inactividad ───────────────────────────────────────────
function startSithInactivityWatcher() {
  // Actualizar timestamp en cualquier interacción
  const touch = () => { sithLastActivity = Date.now() }
  document.addEventListener('mousemove', touch, { passive: true })
  document.addEventListener('keydown',   touch, { passive: true })
  checkSithInactivity()
}

function checkSithInactivity() {
  if (!sithActive) return
  const idle = Date.now() - sithLastActivity
  if (idle > 90000) { // 90 segundos sin actividad
    const quote = SITH_INACTIVITY_QUOTES[Math.floor(Math.random() * SITH_INACTIVITY_QUOTES.length)]
    showSWNotif(quote, '⚡')
    sithLastActivity = Date.now() // reset para no spamear
  }
  sithInactivityTimer = setTimeout(checkSithInactivity, 30000)
}

// ── Hook renderTasks para tooltips Sith ──────────────────
const _origAttachYodaTooltips = attachYodaTooltips
function attachYodaTooltips() {
  if (typeof sithActive !== 'undefined' && sithActive) {
    attachSithTooltips()
    return
  }
  _origAttachYodaTooltips()
}


// ════════════════════════════════════════════════════════════
// 🧠 MODO NEURODIVERSO
// ════════════════════════════════════════════════════════════

let neuroActive        = false
let neuroHyperfocus    = false
let neuroSilence       = false
let neuroLowStim       = false
let neuroBodyDouble    = false
let neuroBDInterval    = null
let neuroBDSeconds     = 0
let neuroTransTimer    = null
let selectedRoutineColor = '#3B82F6'

// ── Labels ────────────────────────────────────────────────
const NEURO_DAY_LABELS = {
  1: '🌱 Día difícil — ve despacio, lo esencial es suficiente',
  2: '🌤 Energía baja — prioriza lo importante y descansa',
  3: '⚡ Día normal — ritmo habitual',
  4: '🚀 Buena energía — puedes asumir más',
  5: '🔥 Modo flujo — estás en tu mejor momento',
}
const NEURO_OVERLOAD_LABELS = {
  1: 'Sin sobrecarga — ambiente tranquilo',
  2: 'Leve — algo de ruido o distracción',
  3: 'Moderado — considera modo bajo estímulo',
  4: 'Alto — activa silencio total o tómate un descanso',
  5: '🚨 Saturación — para todo, descansa ahora',
}
const BD_STATUSES = [
  'Trabajando contigo...', 'Concentrado en su tarea...', 'En modo flujo...',
  'Avanzando paso a paso...', 'Aquí, trabajando junto a ti...',
]

// ── Setup ─────────────────────────────────────────────────
function setupNeuro() {
  if (!data.settings) data.settings = {}
  if (!data.settings.neuro) data.settings.neuro = {}
  if (!data.settings.neuro.routines) data.settings.neuro.routines = []

  const toggle = document.getElementById('toggle-neuro')
  if (!toggle) return

  // Restore state
  neuroActive = !!data.settings.neuro.active
  toggle.checked = neuroActive
  if (neuroActive) showNeuroPanel(false)

  toggle.onchange = () => {
    neuroActive = toggle.checked
    data.settings.neuro.active = neuroActive
    save()
    if (neuroActive) showNeuroPanel(true)
    else hideNeuroPanel()
  }

  setupNeuroControls()
  setupNeuroRoutine()
  renderNeuroStreak()
  renderNeuroRoutines()
  restoreNeuroQuickStates()

  // Transición al cambiar sección
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (neuroActive && !neuroSilence && !neuroHyperfocus) {
        showNeuroTransition('Cambiando de sección...', 4)
      }
    })
  })
}

function showNeuroPanel(animate) {
  const panel = document.getElementById('neuro-panel')
  if (!panel) return
  panel.style.display = 'block'
  if (animate) { panel.style.opacity = '0'; setTimeout(() => panel.style.opacity = '1', 10) }
  renderNeuroStreak()
  renderNeuroRoutines()
  // Restore day level
  const level = data.settings.neuro.dayLevel
  if (level) {
    document.querySelectorAll('.neuro-day-btn').forEach(b => b.classList.remove('active'))
    document.querySelector(`.neuro-day-btn[data-level="${level}"]`)?.classList.add('active')
    document.getElementById('neuro-day-label').textContent = NEURO_DAY_LABELS[level] || ''
  }
  // Restore overload
  const ov = data.settings.neuro.overload || 1
  document.getElementById('neuro-overload').value = ov
  document.getElementById('neuro-overload-label').textContent = NEURO_OVERLOAD_LABELS[ov]
}

function hideNeuroPanel() {
  const panel = document.getElementById('neuro-panel')
  if (panel) panel.style.display = 'none'
  // Turn off all active modes
  if (neuroHyperfocus)  toggleHyperfocus()
  if (neuroSilence)     toggleSilence()
  if (neuroLowStim)     toggleLowStim()
  if (neuroBodyDouble)  toggleBodyDouble()
}

// ── Controles de panel ────────────────────────────────────
function setupNeuroControls() {
  // Estado del día
  document.querySelectorAll('.neuro-day-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.neuro-day-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      const level = parseInt(btn.dataset.level)
      data.settings.neuro.dayLevel = level
      document.getElementById('neuro-day-label').textContent = NEURO_DAY_LABELS[level]
      save()
    }
  })

  // Sobrecarga sensorial
  const slider = document.getElementById('neuro-overload')
  if (slider) {
    slider.oninput = () => {
      const v = parseInt(slider.value)
      document.getElementById('neuro-overload-label').textContent = NEURO_OVERLOAD_LABELS[v]
      data.settings.neuro.overload = v
      save()
      if (v >= 4 && !neuroLowStim) {
        toggleLowStim()
        document.getElementById('btn-neuro-low')?.classList.add('active')
      }
    }
  }

  // Controles rápidos
  document.getElementById('btn-neuro-focus')  ?.addEventListener('click', toggleHyperfocus)
  document.getElementById('btn-neuro-silence')?.addEventListener('click', toggleSilence)
  document.getElementById('btn-neuro-low')    ?.addEventListener('click', toggleLowStim)
  document.getElementById('btn-neuro-body')   ?.addEventListener('click', toggleBodyDouble)
}

function restoreNeuroQuickStates() {
  const n = data.settings.neuro
  if (n.hyperfocus) { neuroHyperfocus = false; toggleHyperfocus() }
  if (n.lowStim)    { neuroLowStim   = false; toggleLowStim()    }
  // No restaurar silence ni body double — se apagan con la sesión
}

// ── Hiperfoco ─────────────────────────────────────────────
function toggleHyperfocus() {
  neuroHyperfocus = !neuroHyperfocus
  document.getElementById('btn-neuro-focus')?.classList.toggle('active', neuroHyperfocus)
  data.settings.neuro.hyperfocus = neuroHyperfocus
  save()

  // Obtener vista activa actual (no ajustes)
  const activeView = document.querySelector('.view.active')
  const activeNav  = document.querySelector('.nav-item.active')
  const activeViewId = activeView?.id

  if (neuroHyperfocus) {
    // Opacar nav items que no sean la vista activa NI ajustes
    document.querySelectorAll('.nav-item').forEach(item => {
      const isActive   = item === activeNav
      const isSettings = item.dataset.view === 'settings'
      item.style.opacity      = (isActive || isSettings) ? '' : '0.18'
      item.style.pointerEvents = (isActive || isSettings) ? '' : 'none'
    })
    // Botón flotante para salir
    const btn = document.createElement('button')
    btn.id = 'neuro-exit-focus'
    btn.textContent = '✕ Salir de hiperfoco'
    btn.style.cssText = `
      position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:8000;
      background:var(--accent);color:#fff;border:none;border-radius:20px;
      padding:6px 18px;font-size:0.8em;font-weight:600;cursor:pointer;
      box-shadow:0 4px 16px rgba(0,0,0,0.2);
    `
    btn.onclick = () => toggleHyperfocus()
    document.body.appendChild(btn)
    showNeuroTransition('🎯 Hiperfoco activado — enfocado en esta vista', 3)
  } else {
    // Restaurar nav
    document.querySelectorAll('.nav-item').forEach(item => {
      item.style.opacity = ''
      item.style.pointerEvents = ''
    })
    document.getElementById('neuro-exit-focus')?.remove()
  }
}

// ── Silencio total ────────────────────────────────────────
function toggleSilence() {
  neuroSilence = !neuroSilence
  document.body.classList.toggle('neuro-silence', neuroSilence)
  document.getElementById('btn-neuro-silence')?.classList.toggle('active', neuroSilence)
  if (neuroSilence) showNeuroTransition('🔇 Silencio total activado', 2)
}

// ── Bajo estímulo ─────────────────────────────────────────
function toggleLowStim() {
  neuroLowStim = !neuroLowStim
  document.body.classList.toggle('neuro-low-stim', neuroLowStim)
  document.getElementById('btn-neuro-low')?.classList.toggle('active', neuroLowStim)
  data.settings.neuro.lowStim = neuroLowStim
  save()
}

// ── Body double ───────────────────────────────────────────
function toggleBodyDouble() {
  neuroBodyDouble = !neuroBodyDouble
  const overlay = document.getElementById('neuro-body-double')
  document.getElementById('btn-neuro-body')?.classList.toggle('active', neuroBodyDouble)
  if (!overlay) return

  if (neuroBodyDouble) {
    neuroBDSeconds = 0
    overlay.style.display = 'flex'
    rotateBDStatus()
    neuroBDInterval = setInterval(() => {
      neuroBDSeconds++
      const m = String(Math.floor(neuroBDSeconds/60)).padStart(2,'0')
      const s = String(neuroBDSeconds % 60).padStart(2,'0')
      document.getElementById('neuro-bd-timer').textContent = `${m}:${s}`
      if (neuroBDSeconds % 45 === 0) rotateBDStatus()
    }, 1000)
  } else {
    overlay.style.display = 'none'
    clearInterval(neuroBDInterval)
  }
}

function rotateBDStatus() {
  const el = document.getElementById('neuro-bd-status')
  if (el) el.textContent = BD_STATUSES[Math.floor(Math.random() * BD_STATUSES.length)]
}

// ── Temporizador de transición ────────────────────────────
function showNeuroTransition(label, secs) {
  if (neuroSilence) return
  const bar  = document.getElementById('neuro-transition-bar')
  const fill = document.getElementById('neuro-transition-fill')
  const lbl  = document.getElementById('neuro-transition-label')
  const sec  = document.getElementById('neuro-transition-secs')
  if (!bar) return
  clearTimeout(neuroTransTimer)
  bar.style.display = 'block'
  lbl.textContent = label
  fill.style.transition = 'none'
  fill.style.width = '100%'
  let remaining = secs
  sec.textContent = remaining
  setTimeout(() => { fill.style.transition = `width ${secs}s linear`; fill.style.width = '0%' }, 30)
  const tick = () => {
    remaining--
    sec.textContent = remaining
    if (remaining <= 0) { bar.style.display = 'none'; return }
    neuroTransTimer = setTimeout(tick, 1000)
  }
  neuroTransTimer = setTimeout(tick, 1000)
}

// ── Racha ─────────────────────────────────────────────────
function renderNeuroStreak() {
  const today = new Date().toISOString().split('T')[0]
  const doneTasks = data.tasks.filter(t => t.done && t.doneAt?.startsWith(today))
  // Calcular racha desde historial
  const streak = calcStreak()
  const countEl = document.getElementById('neuro-streak-count')
  const subEl   = document.getElementById('neuro-streak-sub')
  const flame   = document.getElementById('neuro-streak-flame')
  if (!countEl) return
  countEl.textContent = `${streak} día${streak !== 1 ? 's' : ''}`
  subEl.textContent = streak === 0
    ? 'Completa al menos una tarea hoy para empezar tu racha'
    : streak >= 7
    ? `¡Increíble! ${streak} días seguidos 🌟`
    : `¡Sigue así! Llevas ${streak} días consecutivos`
  flame.textContent = streak >= 7 ? '🏆' : streak >= 3 ? '🔥' : '✨'
}

function calcStreak() {
  if (!data.settings.neuro.streakDays) data.settings.neuro.streakDays = []
  const today = new Date().toISOString().split('T')[0]
  const doneTasks = (data.tasks || []).filter(t => t.done)
  // Si hay tarea completada hoy y no está en el historial, agregar
  const doneToday = doneTasks.some(t => t.doneAt?.startsWith(today))
  if (doneToday && !data.settings.neuro.streakDays.includes(today)) {
    data.settings.neuro.streakDays.push(today)
    data.settings.neuro.streakDays = [...new Set(data.settings.neuro.streakDays)].sort()
    save()
    // Animación
    const flame = document.getElementById('neuro-streak-flame')
    if (flame) { flame.classList.add('pop'); setTimeout(() => flame.classList.remove('pop'), 500) }
  }
  // Contar racha consecutiva hacia atrás
  let streak = 0
  let check = new Date()
  while (true) {
    const d = check.toISOString().split('T')[0]
    if (data.settings.neuro.streakDays.includes(d)) {
      streak++
      check.setDate(check.getDate() - 1)
    } else break
  }
  return streak
}

// ── Subtareas visuales ────────────────────────────────────
function renderNeuroSubtasks() {
  if (!neuroActive) return
  document.querySelectorAll('.task-item[data-id]').forEach(taskEl => {
    if (taskEl.querySelector('.task-subtasks')) return  // ya renderizado
    const id = taskEl.dataset.id
    const t = data.tasks.find(t => t.id === id)
    if (!t || !t.subtasks || t.subtasks.length === 0) {
      // Agregar botón para añadir subtareas
      if (!taskEl.querySelector('.neuro-add-subtask')) {
        const btn = document.createElement('button')
        btn.className = 'neuro-add-subtask'
        btn.textContent = '+ Añadir pasos'
        btn.onclick = (e) => { e.stopPropagation(); addSubtask(id) }
        taskEl.querySelector('.task-info')?.appendChild(btn)
      }
      return
    }
    const wrap = document.createElement('div')
    wrap.className = 'task-subtasks'
    wrap.innerHTML = t.subtasks.map((s, i) => `
      <div class="subtask-item">
        <div class="subtask-check ${s.done ? 'done' : ''}" data-task="${id}" data-sub="${i}"></div>
        <span class="subtask-text ${s.done ? 'done' : ''}">${s.text}</span>
      </div>
    `).join('')
    const addBtn = document.createElement('button')
    addBtn.className = 'neuro-add-subtask'
    addBtn.textContent = '+ Añadir paso'
    addBtn.onclick = (e) => { e.stopPropagation(); addSubtask(id) }
    wrap.appendChild(addBtn)
    taskEl.querySelector('.task-info')?.appendChild(wrap)
    wrap.querySelectorAll('.subtask-check').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation()
        const tTask = data.tasks.find(t => t.id === el.dataset.task)
        if (tTask?.subtasks?.[el.dataset.sub]) {
          tTask.subtasks[el.dataset.sub].done = !tTask.subtasks[el.dataset.sub].done
          save(); renderTasks()
        }
      }
    })
  })
}

function addSubtask(taskId) {
  const text = prompt('Nombre del paso:')
  if (!text?.trim()) return
  const t = data.tasks.find(t => t.id === taskId)
  if (!t) return
  if (!t.subtasks) t.subtasks = []
  t.subtasks.push({ text: text.trim(), done: false })
  save(); renderTasks()
}

// ── Rutinas ───────────────────────────────────────────────
function setupNeuroRoutine() {
  document.getElementById('btn-neuro-add-routine')?.addEventListener('click', () => {
    document.getElementById('routine-id').value = ''
    document.getElementById('routine-name').value = ''
    document.getElementById('routine-time').value = ''
    document.getElementById('routine-duration').value = 30
    selectedRoutineColor = '#3B82F6'
    document.querySelectorAll('.neuro-color-opt').forEach(b => b.classList.remove('active'))
    document.querySelector('.neuro-color-opt[data-color="#3B82F6"]')?.classList.add('active')
    openModal('neuro-routine')
  })

  document.querySelectorAll('.neuro-color-opt').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.neuro-color-opt').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      selectedRoutineColor = btn.dataset.color
    }
  })

  document.getElementById('btn-save-routine')?.addEventListener('click', saveRoutine)
}

function saveRoutine() {
  const id   = document.getElementById('routine-id').value
  const name = document.getElementById('routine-name').value.trim()
  const time = document.getElementById('routine-time').value
  const dur  = parseInt(document.getElementById('routine-duration').value) || 30
  if (!name) return
  const block = { id: id || Date.now().toString(), name, time, duration: dur, color: selectedRoutineColor }
  if (!data.settings.neuro.routines) data.settings.neuro.routines = []
  if (id) {
    const idx = data.settings.neuro.routines.findIndex(r => r.id === id)
    if (idx >= 0) data.settings.neuro.routines[idx] = block
  } else {
    data.settings.neuro.routines.push(block)
  }
  data.settings.neuro.routines.sort((a,b) => (a.time||'').localeCompare(b.time||''))
  save()
  renderNeuroRoutines()
  closeModal('neuro-routine')
}

function renderNeuroRoutines() {
  const list = document.getElementById('neuro-routine-list')
  if (!list) return
  const routines = data.settings.neuro.routines || []
  if (routines.length === 0) {
    list.innerHTML = '<div style="font-size:0.82em;color:var(--text3);padding:8px 0">Sin bloques de rutina. Añade uno para estructurar tu día.</div>'
    return
  }
  list.innerHTML = routines.map(r => `
    <div class="neuro-routine-block" style="border-left-color:${r.color}">
      <span class="neuro-routine-time">${r.time || '—'}</span>
      <span class="neuro-routine-name">${r.name}</span>
      <span class="neuro-routine-dur">${r.duration}min</span>
      <button class="neuro-routine-del" data-del-routine="${r.id}" title="Eliminar">✕</button>
    </div>
  `).join('')
  list.querySelectorAll('[data-del-routine]').forEach(btn => {
    btn.onclick = () => {
      data.settings.neuro.routines = data.settings.neuro.routines.filter(r => r.id !== btn.dataset.delRoutine)
      save(); renderNeuroRoutines()
    }
  })
}


// ════════════════════════════════════════════════════════════
// ⛏️  EASTER EGG — MINECRAFT
// Triggers: "minecraft" | "enderman" | "piglin"
// Desactivar: "leave the game"
// ════════════════════════════════════════════════════════════

let mcActive   = false
let mcVariant  = 'overworld'
let mcEndParticleInterval    = null
let mcNetherParticleInterval = null
let mcHudInterval            = null

const MC_NAV_ITEMS = [
  { view:'dashboard', label:'Home',    icon:'🏠' },
  { view:'tasks',     label:'Tareas',  icon:'📋' },
  { view:'goals',     label:'Metas',   icon:'🎯' },
  { view:'calendar',  label:'Agenda',  icon:'📅' },
  { view:'expenses',  label:'Gastos',  icon:'💰' },
  { view:'flow',      label:'Flujo',   icon:'🔗' },
  { view:'cork',      label:'Tablero', icon:'🖼' },
  { view:'balance',   label:'Balance', icon:'⏱' },
  { view:'notes',     label:'Notas',   icon:'📝' },
]

function setupMinecraft() {
  if (!data.settings) data.settings = {}
  if (data.settings.minecraft) {
    activateMinecraft(data.settings.mcVariant || 'overworld', true)
  }
}

function activateMinecraft(variant, silent) {
  destroyXPExtras()
  if (upsideDownActive) deactivateUpsideDown()
  if (rmActive) deactivateRickMorty()
  if (typeof swActive !== 'undefined' && swActive) deactivateStarWars()
  document.body.classList.remove(...THEME_CLASSES, 'has-bg-image', 'mc-end', 'mc-nether')
  document.body.style.backgroundImage = ''
  document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'))
  if (data.settings) { data.settings.activeTheme = 'default'; data.settings.activeThemeId = null }

  mcActive  = true
  mcVariant = variant || 'overworld'
  document.body.classList.add('theme-minecraft')
  if (mcVariant === 'end')    document.body.classList.add('mc-end')
  if (mcVariant === 'nether') document.body.classList.add('mc-nether')

  renderMCHotbar()
  startMCHud()
  stopMCParticles()
  if (mcVariant === 'end')    startEndParticles()
  if (mcVariant === 'nether') startNetherParticles()

  if (mcVariant === 'overworld') unlockBadge('mc-overworld')
  if (mcVariant === 'end')       unlockBadge('mc-end')
  if (mcVariant === 'nether')    unlockBadge('mc-nether')

  if (!silent) showMCNotification(mcVariant)

  if (data.settings) {
    data.settings.minecraft = true
    data.settings.mcVariant = mcVariant
    save()
  }
}

function deactivateMinecraft() {
  mcActive = false
  document.body.classList.remove('theme-minecraft', 'mc-end', 'mc-nether')
  stopMCParticles()
  stopMCHud()
  const hb = document.getElementById('mc-hotbar')
  if (hb) hb.innerHTML = ''
  if (data.settings) {
    data.settings.minecraft = false
    data.settings.mcVariant = null
    save()
  }
}

// ── HOTBAR ────────────────────────────────────────────────────
function renderMCHotbar() {
  const hb = document.getElementById('mc-hotbar')
  if (!hb) return
  const activeView = document.querySelector('.nav-item.active')?.dataset?.view || 'dashboard'
  hb.innerHTML = MC_NAV_ITEMS.map((item, i) => `
    <div class="mc-hotbar-slot ${item.view === activeView ? 'active' : ''}" data-hb-view="${item.view}" title="${item.label}">
      <span class="mc-slot-num">${i + 1}</span>
      <span style="font-size:1.3em;line-height:1">${item.icon}</span>
      <span class="mc-slot-label">${item.label}</span>
    </div>
  `).join('')
  // Sync selector label
  const sel = document.getElementById('mc-hotbar-selector')
  if (sel) sel.textContent = ''
  // Click handlers
  hb.querySelectorAll('[data-hb-view]').forEach(slot => {
    slot.addEventListener('click', () => {
      const view = slot.dataset.hbView
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'))
      const navEl = document.querySelector(`.nav-item[data-view="${view}"]`)
      if (navEl) navEl.classList.add('active')
      const viewEl = document.getElementById('view-' + view)
      if (viewEl) viewEl.classList.add('active')
      // Trigger renders
      if (view === 'dashboard') renderDashboard()
      if (view === 'calendar')  renderCalendar()
      if (view === 'expenses')  renderExpenses()
      if (view === 'flow')      renderFlow()
      if (view === 'cork')      renderCork()
      // Update hotbar active state
      hb.querySelectorAll('.mc-hotbar-slot').forEach(s => s.classList.remove('active'))
      slot.classList.add('active')
    })
  })
  // Keyboard 1-9 navigation
  document.onkeydown = (e) => {
    if (!mcActive) { document.onkeydown = null; return }
    const n = parseInt(e.key)
    if (n >= 1 && n <= 9 && MC_NAV_ITEMS[n-1]) {
      hb.querySelectorAll('[data-hb-view]')[n-1]?.click()
    }
  }
}

// ── HUD: corazones / hambre / XP ──────────────────────────────
function startMCHud() {
  renderMCHud()
  mcHudInterval = setInterval(renderMCHud, 5000)
}
function stopMCHud() {
  clearInterval(mcHudInterval)
  mcHudInterval = null
}
function renderMCHud() {
  // Corazones = tareas completadas hoy (max 10)
  const today = new Date().toISOString().slice(0, 10)
  const doneToday = data.tasks.filter(t => t.done && t.doneAt && t.doneAt.startsWith(today)).length
  const hearts = Math.min(doneToday, 10)
  const heartsEl = document.getElementById('mc-hearts')
  if (heartsEl) {
    heartsEl.innerHTML = Array.from({ length: 10 }, (_, i) => {
      const cls = i < hearts ? 'mc-heart' : 'mc-heart empty'
      return `<div class="${cls}" title="Tarea completada hoy"></div>`
    }).join('')
  }
  // Hambre = tareas pendientes urgentes (max 10, inversamente llena)
  const urgent = data.tasks.filter(t => !t.done && t.priority === 'high').length
  const hungerFull = Math.max(0, 10 - Math.min(urgent, 10))
  const hungerEl = document.getElementById('mc-hunger')
  if (hungerEl) {
    hungerEl.innerHTML = Array.from({ length: 10 }, (_, i) => {
      const cls = i < hungerFull ? 'mc-hunger-icon' : 'mc-hunger-icon empty'
      return `<div class="${cls}" title="Tareas urgentes pendientes"></div>`
    }).join('')
  }
  // XP = % tareas completadas total
  const total = data.tasks.length
  const done = data.tasks.filter(t => t.done).length
  const xp = total > 0 ? Math.round((done / total) * 100) : 0
  const xpFill = document.getElementById('mc-xp-fill')
  const xpLabel = document.getElementById('mc-xp-label')
  if (xpFill) xpFill.style.width = xp + '%'
  if (xpLabel) xpLabel.textContent = `XP ${done}/${total}`
}

// ── NOTIFICACIÓN ──────────────────────────────────────────────
function showMCNotification(variant) {
  const el = document.getElementById('mc-notification')
  if (!el) return
  el.className = ''
  const msgs = {
    overworld: '> Achievement Get: Built a Productivity App',
    end:       '> You have entered The End. Enderman watches.',
    nether:    '> You have entered the Nether. Equip gold armor.',
  }
  if (variant === 'end')    el.classList.add('mc-end-notif')
  if (variant === 'nether') el.classList.add('mc-nether-notif')
  el.textContent = msgs[variant] || msgs.overworld
  el.classList.add('show')
  setTimeout(() => el.classList.remove('show'), 5500)
}

// ── CRAFTING TABLE ────────────────────────────────────────────
let mcCraftingTaskId = null

function openMCCrafting(taskData) {
  const modal = document.getElementById('mc-crafting-modal')
  if (!modal) return
  // Limpiar campos
  document.getElementById('mc-slot-title').value      = taskData?.title    || ''
  document.getElementById('mc-slot-desc').value       = taskData?.desc     || ''
  document.getElementById('mc-slot-priority').value   = taskData?.priority || 'medium'
  document.getElementById('mc-slot-category').value   = taskData?.category || 'work'
  document.getElementById('mc-slot-due').value        = taskData?.due      || ''
  document.getElementById('mc-slot-est-h').value      = taskData?.estH     || ''
  document.getElementById('mc-slot-est-m').value      = taskData?.estM     || ''
  document.getElementById('mc-slot-recur').value      = taskData?.recur    || 'none'
  document.getElementById('mc-craft-task-id').value   = taskData?.id       || ''
  mcCraftingTaskId = taskData?.id || null
  modal.classList.add('open')
  updateMCCraftResult()
  // Live update resultado al tipear
  const inputs = modal.querySelectorAll('input, select, textarea')
  inputs.forEach(inp => inp.addEventListener('input', updateMCCraftResult))
}

function closeMCCrafting() {
  const modal = document.getElementById('mc-crafting-modal')
  if (modal) modal.classList.remove('open')
}

function updateMCCraftResult() {
  const title = document.getElementById('mc-slot-title')?.value?.trim()
  const resultSlot = document.getElementById('mc-craft-result')
  const resultIcon = document.getElementById('mc-craft-result-icon')
  const resultLabel = document.getElementById('mc-craft-result-label')
  const priority = document.getElementById('mc-slot-priority')?.value
  const icons = { low:'📗', medium:'📙', high:'📕', work:'💼', personal:'🏠', health:'❤️', finance:'💰', other:'📦' }
  const cat = document.getElementById('mc-slot-category')?.value
  if (title) {
    resultSlot.classList.add('ready')
    resultIcon.textContent = icons[cat] || '📋'
    resultLabel.textContent = title
  } else {
    resultSlot.classList.remove('ready')
    resultIcon.textContent = '📋'
    resultLabel.textContent = '—'
  }
  // Mark filled slots visually
  document.querySelectorAll('.mc-craft-slot[data-slot]').forEach(slot => {
    const inp = slot.querySelector('input, select, textarea')
    if (inp && inp.value && inp.value !== 'none' && inp.value !== 'medium' && inp.value !== 'work') {
      slot.classList.add('has-value')
    } else {
      slot.classList.remove('has-value')
    }
  })
}

function saveMCCraftedTask() {
  const title = document.getElementById('mc-slot-title')?.value?.trim()
  if (!title) {
    document.getElementById('mc-slot-title').style.boxShadow = '0 0 0 2px #ff5555'
    setTimeout(() => document.getElementById('mc-slot-title').style.boxShadow = '', 1000)
    return
  }
  // ⛏️ Easter egg triggers (mismo comportamiento que saveTask)
  const tLow = title.toLowerCase()
  if (tLow === 'enderman') { closeMCCrafting(); activateMinecraft('end', false); return }
  if (tLow === 'piglin')   { closeMCCrafting(); activateMinecraft('nether', false); return }
  if (tLow === 'minecraft') { closeMCCrafting(); deactivateMinecraft(); return }
  if (tLow === 'leave the game') { closeMCCrafting(); deactivateMinecraft(); return }
  if (tLow === 'use the force')    { closeMCCrafting(); if (typeof swActive !== 'undefined' && !swActive) activateStarWars(false); return }
  if (tLow === 'i am your father') { closeMCCrafting(); if (typeof swActive !== 'undefined' && swActive) deactivateStarWars(); return }
  if (tLow === 'join the dark side') { closeMCCrafting(); if (typeof swActive !== 'undefined' && swActive && !sithActive) activateSith(false); return }
  if (tLow === 'do a barrel roll') { closeMCCrafting(); triggerBarrelRoll(); return }
  if (tLow === '42') { closeMCCrafting(); trigger42(); return }

  const id = document.getElementById('mc-craft-task-id').value || Date.now().toString()
  const isEdit = !!document.getElementById('mc-craft-task-id').value
  const task = {
    id,
    title,
    desc:      document.getElementById('mc-slot-desc').value.trim(),
    priority:  document.getElementById('mc-slot-priority').value,
    category:  document.getElementById('mc-slot-category').value,
    due:       document.getElementById('mc-slot-due').value,
    estH:      parseInt(document.getElementById('mc-slot-est-h').value) || 0,
    estM:      parseInt(document.getElementById('mc-slot-est-m').value) || 0,
    recur:     document.getElementById('mc-slot-recur').value,
    done:      false,
    createdAt: isEdit ? undefined : new Date().toISOString(),
  }
  if (isEdit) {
    const idx = data.tasks.findIndex(t => t.id === id)
    if (idx >= 0) { task.done = data.tasks[idx].done; task.createdAt = data.tasks[idx].createdAt; data.tasks[idx] = task }
  } else {
    data.tasks.unshift(task)
  }
  save()
  renderTasks()
  renderMCHud()
  closeMCCrafting()
  // Flash result slot como "crafted"
  const resultSlot = document.getElementById('mc-craft-result')
  if (resultSlot) { resultSlot.style.background = '#55ff55'; setTimeout(() => resultSlot.style.background = '', 400) }
}

// ── ACHIEVEMENT BANNER ─────────────────────────────────────────
let mcAchievementTimer = null
function showMCAchievement(badge) {
  if (!mcActive) return
  const el     = document.getElementById('mc-achievement')
  const icon   = document.getElementById('mc-achievement-icon')
  const name   = document.getElementById('mc-achievement-name')
  const header = document.getElementById('mc-achievement-header')
  if (!el) return
  const icons = {
    'mc-overworld':'🌿','mc-end':'🔮','mc-nether':'🔥',
    'upside-down':'🌀','rick-morty':'🧪','winxp':'💾','starwars':'⭐',
    'sith':'⚡','barrel-roll':'🌀','42':'42','matrix':'💊','rickroll':'🎵',
  }
  icon.textContent   = icons[badge.id] || '🏆'
  name.textContent   = badge.name
  header.textContent = 'Achievement Get!'
  clearTimeout(mcAchievementTimer)
  el.classList.add('show')
  mcAchievementTimer = setTimeout(() => el.classList.remove('show'), 4500)
}

// ── PARTÍCULAS ─────────────────────────────────────────────────
function startEndParticles() {
  let c = document.getElementById('mc-end-particles')
  if (!c) { c = document.createElement('div'); c.id = 'mc-end-particles'; document.body.appendChild(c) }
  c.innerHTML = ''
  const colors = ['#7B2FBE','#9B4FDE','#FFEE44','#4A10AA','#BBA0FF','#d077ff']
  function spawn() {
    if (!mcActive || mcVariant !== 'end') return
    const p = document.createElement('div'); p.className = 'mc-end-particle'
    const sz = Math.floor(Math.random()*4+2); const col = colors[Math.floor(Math.random()*colors.length)]
    p.style.cssText = `left:${Math.random()*100}%;width:${sz}px;height:${sz}px;background:${col};box-shadow:0 0 ${sz*2}px ${col};animation-duration:${(Math.random()*7+6).toFixed(1)}s;animation-delay:${(Math.random()*3).toFixed(1)}s;border-radius:1px;`
    c.appendChild(p); setTimeout(() => p.remove(), 16000)
  }
  for (let i=0;i<22;i++) setTimeout(spawn, i*180)
  mcEndParticleInterval = setInterval(spawn, 480)
}

function startNetherParticles() {
  let c = document.getElementById('mc-nether-particles')
  if (!c) { c = document.createElement('div'); c.id = 'mc-nether-particles'; document.body.appendChild(c) }
  c.innerHTML = ''
  const colors = ['#ff6600','#ff4400','#ffd700','#cc2200','#ff8800']
  function spawn() {
    if (!mcActive || mcVariant !== 'nether') return
    const p = document.createElement('div'); p.className = 'mc-nether-ember'
    const sz = Math.floor(Math.random()*4+2); const col = colors[Math.floor(Math.random()*colors.length)]
    p.style.cssText = `left:${Math.random()*100}%;width:${sz}px;height:${sz*1.5}px;background:${col};box-shadow:0 0 ${sz*2}px ${colors[0]};animation-duration:${(Math.random()*5+4).toFixed(1)}s;animation-delay:${(Math.random()*2).toFixed(1)}s;border-radius:0 0 1px 1px;`
    c.appendChild(p); setTimeout(() => p.remove(), 12000)
  }
  for (let i=0;i<28;i++) setTimeout(spawn, i*140)
  mcNetherParticleInterval = setInterval(spawn, 380)
}

function stopMCParticles() {
  clearInterval(mcEndParticleInterval); clearInterval(mcNetherParticleInterval)
  mcEndParticleInterval = mcNetherParticleInterval = null
  ;['mc-end-particles','mc-nether-particles'].forEach(id => { const el=document.getElementById(id); if(el) el.remove() })
}

// ════════════════════════════════════════════════════════════
// 🏅 SISTEMA DE LOGROS SECRETOS
// ════════════════════════════════════════════════════════════

const SECRET_BADGES = [
  { id:'upside-down', name:'Upside Down',    img:'./assets/badges/badge-upside-down.png', hint:'Descubriste el Mundo del Revés' },
  { id:'rick-morty',  name:'Dimensión C-137',img:'./assets/badges/badge-rickmorty.png',   hint:'Wubba Lubba Dub Dub' },
  { id:'winxp',       name:'Windows XP',     img:'./assets/badges/badge-xp.png',          hint:"It's now safe to turn off your computer" },
  { id:'starwars',    name:'Use the Force',  img:'./assets/badges/badge-starwars.png',    hint:'Que la Fuerza te acompañe' },
  { id:'sith',        name:'Lado Oscuro',    img:'./assets/badges/badge-sith.png',         hint:'Join the Dark Side' },
  { id:'rickroll',    name:'Never Gonna...', img:'./assets/badges/badge-rickroll.png',    hint:'Never gonna give you up 🎵' },
  { id:'barrel-roll', name:'Do a Barrel Roll', img:'./assets/badges/badge-barrel-roll.png', hint:'¡BARREL ROLL!' },
  { id:'42',          name:'La Respuesta',      img:'./assets/badges/badge-42.png',          hint:'La respuesta a la vida, el universo y todo lo demás' },
  { id:'matrix',      name:'Follow the White Rabbit', img:'./assets/badges/badge-matrix.png', hint:'There is no spoon' },
  { id:'mc-overworld',name:'Overworld',  img:'./assets/badges/badge-mc-overworld.png', hint:'Achievement Get: Built a Productivity App' },
  { id:'mc-end',      name:'The End',    img:'./assets/badges/badge-mc-end.png',       hint:'You have entered The End' },
  { id:'mc-nether',   name:'Nether',     img:'./assets/badges/badge-mc-nether.png',    hint:'Sobreviviste el Nether' },
]

function unlockBadge(id) {
  if (!data.settings) data.settings = {}
  if (!data.settings.badges) data.settings.badges = {}
  if (data.settings.badges[id]) return
  data.settings.badges[id] = new Date().toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })
  save()
  renderSecretBadges()
  renderSecretThemes()
  setTimeout(() => {
    const el = document.querySelector(`.secret-badge[data-id="${id}"]`)
    if (el) { el.classList.add('just-unlocked'); setTimeout(() => el.classList.remove('just-unlocked'), 600) }
  }, 50)
  // ⛏️ MC achievement banner
  if (typeof mcActive !== 'undefined' && mcActive) {
    const badge = (typeof SECRET_BADGES !== 'undefined') ? SECRET_BADGES.find(b => b.id === id) : null
    if (badge) showMCAchievement(badge)
  }
}

function renderSecretBadges() {
  const grid = document.getElementById('secret-badges-grid')
  if (!grid) return
  const unlocked = data.settings?.badges || {}
  grid.innerHTML = SECRET_BADGES.map(b => {
    const isUnlocked = !!unlocked[b.id]
    return `
      <div class="secret-badge ${isUnlocked ? 'unlocked' : 'locked'}" data-id="${b.id}"
           ${isUnlocked ? `data-date="Descubierto: ${unlocked[b.id]}" title="${b.hint}"` : 'title="???"'}>
        <div class="secret-badge-img-wrap">
          <img src="${b.img}" alt="${b.name}" onerror="this.style.display='none'">
        </div>
        <div class="secret-badge-name">${isUnlocked ? b.name : '???'}</div>
      </div>`
  }).join('')
}

function setupSecretBadges() {
  if (!data.settings) data.settings = {}
  if (!data.settings.badges) data.settings.badges = {}
  renderSecretBadges()
  renderSecretThemes()
}

const SECRET_THEME_MAP = {
  'matrix':       'matrix',
  'rickroll':     'retrointernet',
  '42':           'hitchhiker',
}

function renderSecretThemes() {
  const badges = data.settings?.badges || {}
  const section = document.getElementById('secret-themes-section')
  if (!section) return

  let anyVisible = false
  Object.entries(SECRET_THEME_MAP).forEach(([badgeId, themeId]) => {
    const card = document.getElementById(`theme-card-${themeId}`)
    if (!card) return
    const show = !!badges[badgeId]
    card.style.display = show ? '' : 'none'
    if (show) anyVisible = true
  })
  section.style.display = anyVisible ? '' : 'none'
}


// ============================================
// 🎵 EASTER EGG — RICKROLL (dot en sidebar)
// ============================================
function triggerRickroll() {
  const src = window.ASSETS?.rickroll || './assets/rickroll.mp4'
  const overlay = document.getElementById('rr-overlay')
  const vid = document.getElementById('rr-video')
  const title = document.getElementById('rr-title')
  if (!overlay || !vid) return
  vid.src = src
  vid.currentTime = 0
  overlay.style.display = 'flex'
  unlockBadge('rickroll')
  if (title) {
    title.style.display = 'flex'
    setTimeout(() => { title.style.display = 'none' }, 10000)
  }
  vid.play().catch(() => {})
  vid.onended = stopRickroll
}

function stopRickroll() {
  const overlay = document.getElementById('rr-overlay')
  const vid = document.getElementById('rr-video')
  if (!overlay) return
  overlay.style.display = 'none'
  if (vid) { vid.pause(); vid.src = '' }
}

function setupRickroll() {
  const dot = document.getElementById('rr-dot')
  if (!dot) return
  dot.addEventListener('click', triggerRickroll)
}

setupRickroll()


// ============================================
// 🛻 EASTER EGG — DO A BARREL ROLL
// ============================================
function triggerBarrelRoll() {
  unlockBadge('barrel-roll')
  const body = document.body
  body.style.transition = 'transform 1.2s cubic-bezier(0.5, 0, 0.5, 1)'
  body.style.transformOrigin = 'center center'
  body.style.transform = 'rotate(360deg)'
  setTimeout(() => {
    body.style.transition = ''
    body.style.transform = ''
  }, 1250)
}


// ============================================
// 🌌 EASTER EGG — 42 (The Answer)
// ============================================
function trigger42() {
  unlockBadge('42')

  // Crear notificación especial
  let notif = document.getElementById('notif-42')
  if (!notif) {
    notif = document.createElement('div')
    notif.id = 'notif-42'
    document.body.appendChild(notif)
  }
  notif.innerHTML = `
    <div style="font-size:3.5em;line-height:1;margin-bottom:6px">🌌</div>
    <div style="font-size:2em;font-weight:900;letter-spacing:0.05em;color:#FFE600;font-family:'Impact',sans-serif;">42</div>
    <div style="font-size:0.85em;color:rgba(255,255,255,0.8);margin-top:4px;line-height:1.5">La respuesta a la vida,<br>el universo y todo lo demás.</div>
    <div style="font-size:0.72em;color:rgba(255,255,255,0.4);margin-top:8px">— The Hitchhiker's Guide to the Galaxy</div>
  `
  notif.classList.add('show')
  clearTimeout(notif._t)
  notif._t = setTimeout(() => notif.classList.remove('show'), 7000)
}


// ============================================
// 💊 EASTER EGG — MATRIX (clic largo en Ajustes)
// ============================================
let matrixActive = false
let matrixAnimId = null

function setupMatrixTrigger() {
  const settingsBtn = document.querySelector('.nav-item[data-view="settings"]')
  if (!settingsBtn) return

  let holdTimer = null
  let holdBar = null

  settingsBtn.addEventListener('mousedown', () => {
    // Barra de progreso de carga
    holdBar = document.createElement('div')
    holdBar.style.cssText = `
      position:absolute;bottom:0;left:0;height:2px;width:0%;
      background:var(--accent);border-radius:2px;
      transition:width 1.8s linear;pointer-events:none;
    `
    settingsBtn.style.position = 'relative'
    settingsBtn.appendChild(holdBar)
    requestAnimationFrame(() => { holdBar.style.width = '100%' })

    holdTimer = setTimeout(() => {
      holdBar?.remove()
      matrixActive ? deactivateMatrix() : activateMatrix()
    }, 1800)
  })

  const cancel = () => {
    clearTimeout(holdTimer)
    holdBar?.remove()
    holdBar = null
  }
  settingsBtn.addEventListener('mouseup', cancel)
  settingsBtn.addEventListener('mouseleave', cancel)
}

function activateMatrix() {
  if (matrixActive) return
  matrixActive = true
  unlockBadge('matrix')

  // Canvas
  const canvas = document.createElement('canvas')
  canvas.id = 'matrix-canvas'
  canvas.style.cssText = `
    position:fixed;inset:0;z-index:9998;pointer-events:none;
    opacity:0;transition:opacity 0.8s ease;
  `
  document.body.appendChild(canvas)
  requestAnimationFrame(() => { canvas.style.opacity = '1' })

  const ctx = canvas.getContext('2d')
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
  resize()
  window.addEventListener('resize', resize)
  canvas._resize = resize

  const cols = Math.floor(canvas.width / 16)
  const drops = Array(cols).fill(1)
  const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ01'

  matrixAnimId = setInterval(() => {
    ctx.fillStyle = 'rgba(0,0,0,0.05)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#00FF41'
    ctx.font = '14px monospace'
    drops.forEach((y, i) => {
      const ch = chars[Math.floor(Math.random() * chars.length)]
      ctx.fillText(ch, i * 16, y * 16)
      if (y * 16 > canvas.height && Math.random() > 0.975) drops[i] = 0
      drops[i]++
    })
  }, 40)

  // Notif
  showMatrix42Notif('Follow the white rabbit... 🐇', 8000)
}

function deactivateMatrix() {
  matrixActive = false
  clearInterval(matrixAnimId)
  const canvas = document.getElementById('matrix-canvas')
  if (canvas) {
    window.removeEventListener('resize', canvas._resize)
    canvas.style.opacity = '0'
    setTimeout(() => canvas.remove(), 800)
  }
}

function showMatrix42Notif(text, duration) {
  let notif = document.getElementById('notif-matrix')
  if (!notif) {
    notif = document.createElement('div')
    notif.id = 'notif-matrix'
    document.body.appendChild(notif)
  }
  notif.innerHTML = `<span style="font-size:1.4em">💊</span><span>${text}</span>`
  notif.classList.add('show')
  clearTimeout(notif._t)
  notif._t = setTimeout(() => notif.classList.remove('show'), duration || 5000)
}

setupMatrixTrigger()


// ── Reset badges (dev only) ────────────────
document.getElementById('btn-reset-badges')?.addEventListener('click', () => {
  if (!data.settings) data.settings = {}
  data.settings.badges = {}
  save()
  renderSecretBadges()
  renderSecretThemes()
})

// ── SYNC SERVICE ────────────────────────────────────────────

const JSONBIN_BASE = 'https://api.jsonbin.io/v3/b'

async function syncPull() {
  const apiKey = data.settings?.sync?.apiKey
  const binId  = data.settings?.sync?.binId
  if (!apiKey || !binId) return null
  try {
    const res = await fetch(`${JSONBIN_BASE}/${binId}/latest`, {
      headers: { 'X-Master-Key': apiKey }
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return json.record || null
  } catch (e) {
    console.warn('[Sync] pull error:', e)
    return null
  }
}

async function syncPush() {
  const apiKey = data.settings?.sync?.apiKey
  const binId  = data.settings?.sync?.binId
  if (!apiKey || !binId) return false
  try {
    const res = await fetch(`${JSONBIN_BASE}/${binId}`, {
      method: 'PUT',
      headers: {
        'X-Master-Key':     apiKey,
        'Content-Type':     'application/json',
        'X-Bin-Versioning': 'false',
      },
      body: JSON.stringify(data)
    })
    return res.ok
  } catch (e) {
    console.warn('[Sync] push error:', e)
    return false
  }
}

async function syncCreateBin() {
  const apiKey = data.settings?.sync?.apiKey
  if (!apiKey) return null
  try {
    const res = await fetch(JSONBIN_BASE, {
      method: 'POST',
      headers: {
        'X-Master-Key':  apiKey,
        'Content-Type':  'application/json',
        'X-Bin-Name':    'sophron-data',
        'X-Bin-Private': 'true',
      },
      body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return json.metadata?.id || null
  } catch (e) {
    console.warn('[Sync] create bin error:', e)
    return null
  }
}

function syncMergeData(remote) {
  if (!remote) return
  const ARRAY_KEYS = ['tasks', 'expenses', 'recurrents', 'budgets', 'savings', 'notes']
  ARRAY_KEYS.forEach(key => {
    const localArr  = data[key]   || []
    const remoteArr = remote[key] || []
    const map = {}
    ;[...remoteArr, ...localArr].forEach(item => {
      if (!item?.id) return
      const existing = map[item.id]
      if (!existing) { map[item.id] = item; return }
      const tNew = item.updatedAt     || item.createdAt    || item.date || ''
      const tOld = existing.updatedAt || existing.createdAt || existing.date || ''
      if (tNew > tOld) map[item.id] = item
    })
    data[key] = Object.values(map)
  })
  // Settings: local gana
  if (remote.settings) {
    Object.keys(remote.settings).forEach(k => {
      if (k === 'sync') return  // nunca sobrescribir credenciales
      if (data.settings[k] === undefined) data.settings[k] = remote.settings[k]
    })
  }
}

// ── SETUP SYNC UI ────────────────────────────────────────────

function setupSync() {
  const apiKeyEl  = document.getElementById('sync-api-key')
  const binIdEl   = document.getElementById('sync-bin-id')
  const statusEl  = document.getElementById('sync-status')

  if (!apiKeyEl) return  // HTML no agregado todavía

  // Cargar valores guardados
  apiKeyEl.value = data.settings?.sync?.apiKey || ''
  binIdEl.value  = data.settings?.sync?.binId  || ''

  function showStatus(msg, type = 'info') {
    const colors = { ok: '#22c55e', error: '#ef4444', info: '#7c6af7', loading: '#9090b0' }
    statusEl.textContent = msg
    statusEl.style.color = colors[type] || colors.info
    statusEl.style.display = 'block'
  }

  document.getElementById('btn-sync-save-creds').onclick = () => {
    if (!data.settings) data.settings = {}
    if (!data.settings.sync) data.settings.sync = {}
    data.settings.sync.apiKey = apiKeyEl.value.trim()
    data.settings.sync.binId  = binIdEl.value.trim()
    save()
    showStatus('✅ Credenciales guardadas', 'ok')
  }

  document.getElementById('btn-sync-create-bin').onclick = async () => {
    if (!apiKeyEl.value.trim()) return showStatus('⚠️ Ingresa tu API Key primero', 'error')
    if (!data.settings.sync) data.settings.sync = {}
    data.settings.sync.apiKey = apiKeyEl.value.trim()
    showStatus('Creando bin...', 'loading')
    const newId = await syncCreateBin()
    if (!newId) return showStatus('❌ Error al crear bin. Revisa tu API Key.', 'error')
    data.settings.sync.binId = newId
    binIdEl.value = newId
    save()
    showStatus(`✅ Bin creado: ${newId}`, 'ok')
  }

  document.getElementById('btn-sync-pull').onclick = async () => {
    if (!data.settings?.sync?.apiKey || !data.settings?.sync?.binId)
      return showStatus('⚠️ Configura API Key y Bin ID primero', 'error')
    showStatus('⬇ Descargando de la nube...', 'loading')
    const remote = await syncPull()
    if (!remote) return showStatus('❌ No se pudo conectar. Revisa tus credenciales.', 'error')
    syncMergeData(remote)
    await save()
    renderDashboard()
    renderTasks()
    renderExpenses()
    renderRecurrents()
    showStatus('✅ Datos sincronizados desde la nube', 'ok')
  }

  document.getElementById('btn-sync-push').onclick = async () => {
    if (!data.settings?.sync?.apiKey || !data.settings?.sync?.binId)
      return showStatus('⚠️ Configura API Key y Bin ID primero', 'error')
    showStatus('⬆ Subiendo a la nube...', 'loading')
    const ok = await syncPush()
    if (!ok) return showStatus('❌ Error al subir. Revisa tus credenciales.', 'error')
    showStatus('✅ Datos subidos a la nube', 'ok')
  }
}