import './style.css'
import type { AuthMethod, View } from './types'
import { Button, Card, MetricChip, Timeline } from './components'
import {
  appState,
  rateTable,
  requiresAuthentication,
  setAuthSession,
  setApplicantStatus,
  resetApplicant,
  clearAuthSession,
} from './state'
import { refreshApplicationStatus, requestAuthSession, submitApplication } from './services'

const root = (() => {
  const element = document.querySelector<HTMLDivElement>('#app')
  if (!element) {
    throw new Error('Missing root element')
  }
  return element
})()

let toastTimeout: number | undefined

function notify(message: string) {
  if (toastTimeout) {
    window.clearTimeout(toastTimeout)
  }
  appState.lastMessage = message
  render()
  toastTimeout = window.setTimeout(() => {
    appState.lastMessage = undefined
    render()
  }, 3600)
}

function changeView(view: View) {
  if (requiresAuthentication(view) && !appState.isAuthenticated) {
    appState.showAuthModal = true
    appState.pendingView = view
    render()
    return
  }
  appState.currentView = view
  render()
}

function renderHeader() {
  const navButtons = [
    { view: 'landing', label: 'Likmes' },
    { view: 'apply', label: 'Pieteikt depozītu' },
    { view: 'dashboard', label: 'Mans depozīts' },
  ]

  const navHtml = navButtons
    .map(
      (item) => `
        <button class="nav-button ${appState.currentView === item.view ? 'active' : ''}" data-view="${item.view}">
          ${item.label}
        </button>
      `,
    )
    .join('')

  const authHtml = appState.isAuthenticated
    ? `
      <div class="auth-chip">
        <span>${appState.authMethod ?? 'Autentificēts'}</span>
        ${Button({ label: 'Izrakstīties', attributes: { 'data-action': 'sign-out' } })}
      </div>
    `
    : Button({
        label: 'Pieslēgties',
        variant: 'primary',
        attributes: { 'data-action': 'open-auth' },
      })

  return `
    <header class="app-header">
      <div>
        <span class="badge">Industra Bank</span>
        <h1>Industra Depozīti</h1>
        <p class="subtitle">Vienkāršs ceļš līdz depozīta atvēršanai ar kvalificētu attālinātu identifikāciju.</p>
      </div>
      <div class="header-actions">
        <nav class="nav">${navHtml}</nav>
        ${authHtml}
      </div>
    </header>
  `
}

function renderLanding() {
  const tableBody = rateTable
    .map(
      (item) => `
        <tr>
          <td>${item.term}</td>
          <td>${item.rate.toFixed(2)}%</td>
        </tr>
      `,
    )
    .join('')

  const rateCard = Card({
    title: 'Depozītu likmes',
    description:
      'Izvēlieties termiņu un salīdziniet likmes. Galīgās likmes tiek fiksētas pēc identifikācijas un līguma parakstīšanas.',
    body: `
      <table>
        <thead>
          <tr>
            <th>Termiņš</th>
            <th>Likme (gadā)</th>
          </tr>
        </thead>
        <tbody>${tableBody}</tbody>
      </table>
      <div class="cta">
        <p>Gatavs sākt? Pieslēdzieties un aizpildiet pieteikumu.</p>
        ${Button({ label: 'Uzsākt pieteikumu', variant: 'primary', attributes: { 'data-view': 'apply' } })}
      </div>
    `,
  })

  const processCard = Card({
    body: `
      <div class="two-column">
        <div>
          <h3>Procesa soļi</h3>
          <ol>
            <li>Pieslēgšanās ar Smart-ID vai eParaksta kvalificētajiem risinājumiem.</li>
            <li>Automātiskas AML pārbaudes (PMLP, VID, PNP) un datu sinhronizācija ar CRM.</li>
            <li>Depozīta konta atvēršana WALL sistēmā un finansējuma iemaksa.</li>
          </ol>
        </div>
        <div>
          <h3>Priekšrocības</h3>
          <ul>
            <li>Nav obligāta Industra norēķinu konta atvēršana.</li>
            <li>Centralizēta saziņa un dokumentu pārvaldība.</li>
            <li>Elastīga depozīta pagarināšana un atcelšana tiešsaistē.</li>
          </ul>
        </div>
      </div>
    `,
  })

  return `${rateCard}${processCard}`
}

function renderApplicationForm() {
  const applicant = appState.applicant
  const termOptions = rateTable
    .map(
      (item) => `
        <option value="${item.months}" ${applicant.termMonths === item.months ? 'selected' : ''}>
          ${item.term}
        </option>
      `,
    )
    .join('')

  return Card({
    title: 'Pieteikuma forma',
    description: 'Aizpildiet pamatdatus. Identifikācija un līguma parakstīšana tiks nodrošināta nākamajā solī.',
    body: `
      <form id="application-form" class="form-grid">
        <div class="form-group">
          <label for="fullName">Vārds, Uzvārds *</label>
          <input id="fullName" name="fullName" value="${applicant.fullName}" required ${appState.loading ? 'disabled' : ''} />
        </div>
        <div class="form-group">
          <label for="personalCode">Personas kods *</label>
          <input id="personalCode" name="personalCode" value="${applicant.personalCode}" required ${appState.loading ? 'disabled' : ''} />
        </div>
        <div class="form-group">
          <label for="email">E-pasts *</label>
          <input id="email" name="email" type="email" value="${applicant.email}" required ${appState.loading ? 'disabled' : ''} />
        </div>
        <div class="form-group">
          <label for="phone">Telefons *</label>
          <input id="phone" name="phone" value="${applicant.phone}" required ${appState.loading ? 'disabled' : ''} />
        </div>
        <div class="form-group">
          <label for="residency">Rezidences valsts *</label>
          <input id="residency" name="residency" value="${applicant.residency}" required ${appState.loading ? 'disabled' : ''} />
        </div>
        <div class="form-group">
          <label for="depositType">Depozīta veids *</label>
          <select id="depositType" name="depositType" ${appState.loading ? 'disabled' : ''}>
            <option value="Depozīts ar procentu izmaksu termiņa beigās"
              ${applicant.depositType === 'Depozīts ar procentu izmaksu termiņa beigās' ? 'selected' : ''}>
              Depozīts ar procentu izmaksu termiņa beigās
            </option>
            <option value="Depozīts ar procentu izmaksu katru mēnesi"
              ${applicant.depositType === 'Depozīts ar procentu izmaksu katru mēnesi' ? 'selected' : ''}>
              Depozīts ar procentu izmaksu katru mēnesi
            </option>
          </select>
        </div>
        <div class="form-group">
          <label for="amount">Summa (EUR) *</label>
          <input id="amount" name="amount" type="number" min="1000" step="100" value="${applicant.amount}" required ${appState.loading ? 'disabled' : ''} />
        </div>
        <div class="form-group">
          <label for="termMonths">Termiņš *</label>
          <select id="termMonths" name="termMonths" ${appState.loading ? 'disabled' : ''}>
            ${termOptions}
          </select>
        </div>
        <div class="form-group">
          <label for="interestRate">Gada procentu likme (%) *</label>
          <input id="interestRate" name="interestRate" type="number" step="0.01" value="${applicant.interestRate}" required ${appState.loading ? 'disabled' : ''} />
        </div>
        <div class="form-group">
          <label for="payoutAccount">Konta Nr. izmaksām *</label>
          <input id="payoutAccount" name="payoutAccount" placeholder="LV.." value="${applicant.payoutAccount}" required ${appState.loading ? 'disabled' : ''} />
        </div>
        <div class="form-check">
          <input id="terms" type="checkbox" required ${appState.loading ? 'disabled' : ''} />
          <label for="terms">Apstiprinu noteikumus un AML anketu.</label>
        </div>
        <div class="form-actions">
          ${Button({ label: appState.loading ? 'Nosūtīšana...' : 'Iesniegt pieteikumu', variant: 'primary', attributes: { type: 'submit', ...(appState.loading ? { disabled: 'true' } : {}) } })}
          ${Button({ label: 'Atgriezties', attributes: { 'data-view': 'landing', type: 'button' } })}
        </div>
      </form>
    `,
  })
}

function renderDashboard() {
  const applicant = appState.applicant
  if (applicant.status === 'Draft') {
    return Card({
      title: 'Depozīta pieteikuma statuss',
      body: `
        <p>Vēl nav iesniegta neviens pieteikums. Aizpildiet formu un sekojiet statusam reāllaikā.</p>
        ${Button({ label: 'Izveidot pieteikumu', variant: 'primary', attributes: { 'data-view': 'apply' } })}
      `,
    })
  }

  const metrics = `
    <div class="metric-grid">
      ${MetricChip({ label: 'Summa', value: `${applicant.amount.toLocaleString('lv-LV')} EUR` })}
      ${MetricChip({ label: 'Termiņš', value: `${applicant.termMonths} mēneši` })}
      ${MetricChip({ label: 'Likme', value: `${applicant.interestRate}%` })}
    </div>
  `

  const timeline = Timeline([
    {
      label: 'Pieteikums saņemts',
      timestamp: appState.submittedAt?.toLocaleString('lv-LV'),
      done: true,
    },
    {
      label: 'AML un CRM pārbaudes',
      note: 'Integrācijas ar PMLP, VID, Creatio CRM.',
      done: ['In Review', 'Approved'].includes(applicant.status),
    },
    {
      label: 'Depozīta konts WALL sistēmā',
      note: 'Instrukcija par finansējumu tiks nosūtīta e-pastā.',
      done: applicant.status === 'Approved',
    },
  ])

  const actions = `
    <div class="form-actions">
      ${Button({
        label: appState.loading ? 'Atjauno...' : 'Atjaunot statusu',
        variant: 'primary',
        attributes: {
          'data-action': 'refresh-status',
          ...(appState.loading ? { disabled: 'true' } : {}),
        },
      })}
      ${Button({ label: 'Lejupielādēt līgumu', attributes: { disabled: 'true', title: 'Būs pieejams pēc integrācijas ar dokumentu servisu' } })}
    </div>
  `

  return Card({
    title: 'Depozīta pieteikuma statuss',
    body: `
        <div class="status-summary">
          <div>
            <h3>${applicant.depositType}</h3>
            <p>${metrics}</p>
            <p>Konta nr. izmaksām: <strong>${applicant.payoutAccount || 'Nav norādīts'}</strong></p>
          </div>
          <div class="status-badge">${applicant.status}</div>
        </div>
        ${timeline}
        ${Card({
          title: 'Nākamie soļi',
          tone: 'secondary',
          body: `
            <ul>
              <li>Pārbaudiet e-pastu — nepieciešama elektroniskā paraksta darbība.</li>
              <li>Veiciet pārskaitījumu 3 dienu laikā pēc konta atvēršanas.</li>
              <li>Pārvaldiet depozīta pagarināšanu vai pārtraukšanu šajā portālā.</li>
            </ul>
          `,
        })}
        ${actions}
      `,
  })
}

function renderFooter() {
  return `
    <footer class="footer">
      <div>
        <strong>Atbalsts:</strong> armand.vingrovskis@industra.finance · +371 20234158
      </div>
      <div>
        <strong>Drošība:</strong> Visa darbība tiek auditēta un glabāta Industra Bank sistēmās.
      </div>
    </footer>
  `
}

function renderAuthModal() {
  if (!appState.showAuthModal) {
    return ''
  }

  return `
    <div class="modal-backdrop">
      <div class="modal">
        <h2>Pieslēgšanās</h2>
        <p>Izvēlieties identificēšanās veidu. Šis ir prototips — netiek veikta reāla autentifikācija.</p>
        <div class="auth-methods">
          <button class="auth-option" data-method="Smart-ID" ${appState.loading ? 'disabled' : ''}>Smart-ID (kvalificēts)</button>
          <button class="auth-option" data-method="eParaksts" ${appState.loading ? 'disabled' : ''}>eParaksts</button>
        </div>
        <div class="modal-actions">
          <button class="outline" id="auth-close" ${appState.loading ? 'disabled' : ''}>Atcelt</button>
        </div>
        ${appState.loading ? '<p class="modal-note">Notiek identifikācijas simulācija...</p>' : ''}
      </div>
    </div>
  `
}

function renderToast() {
  if (!appState.lastMessage) {
    return ''
  }
  return `<div class="toast">${appState.lastMessage}</div>`
}

function render() {
  const viewRenderers: Record<View, () => string> = {
    landing: renderLanding,
    apply: renderApplicationForm,
    dashboard: renderDashboard,
  }

  root.innerHTML = `
    <div class="app-container">
      ${renderHeader()}
      <main>${viewRenderers[appState.currentView]()}</main>
      ${renderFooter()}
    </div>
    ${renderAuthModal()}
    ${renderToast()}
  `

  root.querySelectorAll<HTMLButtonElement>('button[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      const view = button.dataset.view as View
      changeView(view)
    })
  })

  root.querySelectorAll<HTMLButtonElement>('button[data-action="open-auth"]').forEach((button) => {
    button.addEventListener('click', () => {
      appState.showAuthModal = true
      render()
    })
  })

  const form = root.querySelector<HTMLFormElement>('#application-form')
  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      await handleApplicationSubmit(form)
    })
  }

  root.querySelectorAll<HTMLButtonElement>('.auth-option').forEach((button) => {
    button.addEventListener('click', async () => {
      const method = button.dataset.method as AuthMethod
      await handleAuth(method)
    })
  })

  const closeButton = root.querySelector<HTMLButtonElement>('#auth-close')
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      if (appState.loading) return
      appState.showAuthModal = false
      render()
    })
  }

  const refreshButton = root.querySelector<HTMLButtonElement>('button[data-action="refresh-status"]')
  if (refreshButton) {
    refreshButton.addEventListener('click', async () => {
      await handleStatusRefresh()
    })
  }

  const signOutButton = root.querySelector<HTMLButtonElement>('button[data-action="sign-out"]')
  if (signOutButton) {
    signOutButton.addEventListener('click', () => {
      clearAuthSession()
      resetApplicant()
      notify('Sesija slēgta.')
      changeView('landing')
    })
  }
}

async function handleAuth(method: AuthMethod) {
  if (appState.loading) return
  appState.loading = true
  render()
  const result = await requestAuthSession(method)
  appState.loading = false
  if (result.success) {
    setAuthSession(method)
    notify(result.message)
    const nextView = appState.pendingView ?? 'dashboard'
    changeView(nextView)
  } else {
    appState.showAuthModal = false
    notify('Neizdevās identificēties. Mēģiniet vēlreiz.')
    render()
  }
}

async function handleApplicationSubmit(form: HTMLFormElement) {
  if (appState.loading) return
  appState.loading = true
  render()

  const formData = new FormData(form)
  appState.applicant = {
    fullName: formData.get('fullName')?.toString().trim() ?? '',
    personalCode: formData.get('personalCode')?.toString().trim() ?? '',
    email: formData.get('email')?.toString().trim() ?? '',
    phone: formData.get('phone')?.toString().trim() ?? '',
    residency: formData.get('residency')?.toString().trim() ?? '',
    depositType: formData.get('depositType')?.toString().trim() ?? 'Depozīts ar procentu izmaksu termiņa beigās',
    amount: Number(formData.get('amount') ?? 0),
    termMonths: Number(formData.get('termMonths') ?? 0),
    interestRate: Number(formData.get('interestRate') ?? 0),
    payoutAccount: formData.get('payoutAccount')?.toString().trim() ?? '',
    status: 'Submitted',
  }

  const response = await submitApplication(appState.applicant)
  setApplicantStatus(response.status)
  appState.submissionId = response.id
  appState.submittedAt = new Date()
  appState.loading = false

  notify(response.message)
  changeView('dashboard')
}

async function handleStatusRefresh() {
  if (!appState.submissionId || appState.loading) return
  appState.loading = true
  render()
  const response = await refreshApplicationStatus(appState.submissionId)
  setApplicantStatus(response.status)
  appState.loading = false
  notify(response.message)
  render()
}

render()
