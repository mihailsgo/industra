import './style.css'
import type { Applicant, ApplicantField, AuthMethod, View } from './types'
import { Button, Card, MetricChip, Timeline } from './components'
import {
  appState,
  clearAuthSession,
  markAllFieldsTouched,
  markFieldTouched,
  requiresAuthentication,
  resetApplicant,
  setApplicant,
  setApplicantStatus,
  setAuthSession,
  setFieldError,
  setFormErrors,
  setSubmissionAttempted,
  setTermsAccepted,
} from './state'
import { depositConstraints, rateTable } from './config'
import { refreshApplicationStatus, requestAuthSession, submitApplication } from './services'
import {
  formatIban,
  getRateForTerm,
  isFormValid,
  validateApplicant,
  validateField,
} from './validation'

const root = (() => {
  const element = document.querySelector<HTMLDivElement>('#app')
  if (!element) {
    throw new Error('Missing root element')
  }
  return element
})()

const residencyOptions = ['Latvija', 'Lietuva', 'Igaunija', 'Vācija', 'Cita ES valsts']
const depositTypeOptions = [
  'Depozīts ar procentu izmaksu termiņa beigās',
  'Depozīts ar procentu izmaksu katru mēnesi',
]

const fieldLabels: Record<ApplicantField, string> = {
  fullName: 'Vārds, uzvārds',
  personalCode: 'Personas kods',
  email: 'E-pasts',
  phone: 'Telefons',
  residency: 'Rezidences valsts',
  depositType: 'Depozīta veids',
  amount: 'Depozīta summa',
  termMonths: 'Termiņš',
  interestRate: 'Procentu likme',
  payoutAccount: 'Izmaksu konts',
  terms: 'Noteikumu apstiprinājums',
}

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
  }, 4200)
}

function changeView(view: View) {
  if (requiresAuthentication(view) && !appState.isAuthenticated) {
    appState.showAuthModal = true
    appState.pendingView = view
    render()
    return
  }
  if (view === 'apply') {
    setSubmissionAttempted(false)
  }
  appState.currentView = view
  render()
}

function shouldShowError(field: ApplicantField) {
  if (!appState.formErrors[field]) return false
  if (appState.submissionAttempted) return true
  return Boolean(appState.touchedFields[field])
}

function renderFieldError(field: ApplicantField) {
  if (!shouldShowError(field)) return ''
  return `<p class="field-error">${appState.formErrors[field]}</p>`
}

function renderHeader() {
  const navButtons = [
    { view: 'landing', label: 'Piedāvājums' },
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
      <div class="brand">
        <img src="/industra-logo.svg" alt="Industra Bank" class="brand-logo" />
        <div class="brand-copy">
          <span class="badge">Industra Bank · Privātpersonu depozīti</span>
          <h1>Digitālais depozītu centrs</h1>
          <p class="subtitle">Atveriet un pārvaldiet termiņnoguldījumus attālināti ar pilnu AML un auditācijas pārklājumu.</p>
        </div>
      </div>
      <div class="header-actions">
        <nav class="nav">${navHtml}</nav>
        ${authHtml}
      </div>
    </header>
  `
}

function renderLanding() {
  const rateRows = rateTable
    .map(
      (item) => `
        <tr>
          <td>${item.term}</td>
          <td>${item.rate.toFixed(2)}%</td>
        </tr>
      `,
    )
    .join('')

  const timeline = Timeline([
    { label: 'Digitāla identifikācija', note: 'Smart-ID kvalificēts · eParaksts', done: true },
    { label: 'AML verifikācijas', note: 'PMLP · VID ienākumi · PNP reģistrs', done: true },
    { label: 'CRM un WALL integrācija', note: 'Datu sinhronizācija Creatio & Core Banking' },
    { label: 'Depozīta finansēšana', note: 'Instrukcijas un konta atvēršana 24/7' },
  ])

  const metrics = `
    <div class="metric-grid">
      ${MetricChip({ label: 'Identifikācija', value: 'Smart-ID · eParaksts' })}
      ${MetricChip({ label: 'Integrācijas', value: 'Creatio CRM · WALL · eBank' })}
      ${MetricChip({ label: 'Pieejamība', value: 'ES rezidenti · LV IBAN' })}
    </div>
  `

  const hero = `
    <section class="hero">
      <div class="hero-content">
        <h2>Industra depozīti tiešsaistē</h2>
        <p>Vienots kanāls noguldītājiem ar pilnu AML, auditācijas un sadarbības funkcionalitāti. Pieteikums, pārbaudes un konta atvēršana notiek vienotā pieredzē.</p>
        <div class="hero-actions">
          ${Button({ label: 'Sākt pieteikumu', variant: 'primary', attributes: { 'data-view': 'apply' } })}
          ${Button({ label: 'Skatīt manu depozītu', attributes: { 'data-view': 'dashboard' } })}
        </div>
        ${metrics}
      </div>
      <div class="hero-side">
        ${Card({
          title: 'Procesa pārskats',
          body: `
            <p class="process-highlight">Pilna informācijas plūsma starp klientu un Industra sistēmām vien pāris minūšu laikā.</p>
            ${timeline}
          `,
        })}
      </div>
    </section>
  `

  const rateCard = Card({
    title: 'Aktuālās depozītu likmes',
    description: 'Likmes tiek fiksētas pēc identifikācijas un līguma parakstīšanas. Uzņēmuma un lielapjoma depozītiem individuālas likmes.',
    body: `
      <table class="rates-table">
        <thead>
          <tr>
            <th>Termiņš</th>
            <th>Gada likme</th>
          </tr>
        </thead>
        <tbody>${rateRows}</tbody>
      </table>
      <p class="table-footnote">Likmes var tikt pielāgotas atbilstoši tirgus apstākļiem un klienta profilam.</p>
    `,
  })

  const complianceCard = Card({
    title: 'Regulatīvā un operacionālā kontrole',
    body: `
      <div class="compliance-grid">
        <div>
          <h3>Attālināta identifikācija</h3>
          <ul class="icon-list">
            <li><span class="icon-circle">①</span> Smart-ID kvalificēts + eParaksts identifikācija</li>
            <li><span class="icon-circle">②</span> Divu soļu auditēta autentifikācija</li>
          </ul>
        </div>
        <div>
          <h3>AML pārbaudes</h3>
          <ul class="icon-list">
            <li><span class="icon-circle">PMLP</span> Nederīgo dokumentu reģistra pārbaude</li>
            <li><span class="icon-circle">VID</span> Iepriekšējā gada ienākumu validācija</li>
            <li><span class="icon-circle">PNP</span> Politiskās ietekmes reģistrs</li>
          </ul>
        </div>
        <div>
          <h3>Sistēmu integrācijas</h3>
          <ul class="icon-list">
            <li><span class="icon-circle">CRM</span> Creatio procesu automatizācija</li>
            <li><span class="icon-circle">WALL</span> Noguldījuma konta atvēršana</li>
            <li><span class="icon-circle">eBank</span> Statusa un maksājumu pārvaldība</li>
          </ul>
        </div>
      </div>
    `,
  })

  const supportCard = Card({
    tone: 'secondary',
    title: 'Klienta pieredze',
    body: `
      <div class="support-grid">
        <div>
          <h3>Komunikācija</h3>
          <p>Portālā pieejama droša sarakste un automatizēti paziņojumi (e-pasts, SMS) par katru statusu.</p>
          <p><strong>Atkāpšanās</strong> no depozīta 14 dienu laikā bez soda procentiem.</p>
        </div>
        <div>
          <h3>Papildināšana un pagarināšana</h3>
          <p>Papildiniet depozītu noteiktajā termiņā, pagariniet ar procentu kapitalizāciju vai bez tās.</p>
          <p>Automātiska nodokļu ieturēšana un izmaksas uz verificēto kontu.</p>
        </div>
      </div>
    `,
  })

  return `${hero}${rateCard}${complianceCard}${supportCard}`
}

function renderAmountHelper() {
  return `
    <p class="field-helper">
      Pieejamais noguldījumu apjoms: ${depositConstraints.min.toLocaleString('lv-LV')}–${depositConstraints.max.toLocaleString(
        'lv-LV',
      )} EUR · solis ${depositConstraints.step} EUR.
    </p>
  `
}

function renderApplicationForm() {
  const applicant = appState.applicant
  const selectableTerm = Number.isFinite(applicant.termMonths) ? applicant.termMonths : ''
  const interestRate = Number.isFinite(applicant.interestRate) ? applicant.interestRate.toFixed(2) : ''
  const amountValue = Number.isFinite(applicant.amount) ? applicant.amount.toString() : ''
  const formattedAccount = applicant.payoutAccount ? formatIban(applicant.payoutAccount) : ''
  const showSummary = appState.submissionAttempted && !isFormValid(appState.formErrors)

  const termOptions = rateTable
    .map(
      (item) => `
        <option value="${item.months}" ${item.months === selectableTerm ? 'selected' : ''}>${item.term} · ${item.rate.toFixed(2)}%</option>
      `,
    )
    .join('')

  const residencySelect = residencyOptions
    .map((option) => `<option value="${option}" ${applicant.residency === option ? 'selected' : ''}>${option}</option>`)
    .join('')

  const depositTypeSelect = depositTypeOptions
    .map(
      (option) => `
        <option value="${option}" ${applicant.depositType === option ? 'selected' : ''}>
          ${option}
        </option>
      `,
    )
    .join('')

  const summaryList = showSummary
    ? `<ul class="error-summary-list">
        ${Object.entries(appState.formErrors)
          .map(([field, error]) => `<li><strong>${fieldLabels[field as ApplicantField]}:</strong> ${error}</li>`)
          .join('')}
      </ul>`
    : ''

  return Card({
    title: 'Depozīta pieteikums',
    description:
      'Aizpildiet klienta profilēšanas un depozīta parametrus. Identifikācija un līguma parakstīšana tiek simulēta prototipā.',
    body: `
      <form id="application-form" class="form-grid">
        ${showSummary ? `<div class="error-summary">${summaryList}</div>` : ''}
        <section class="form-section">
          <h3>Klienta identifikācija</h3>
          <div class="form-row">
            <div class="form-group ${shouldShowError('fullName') ? 'has-error' : ''}">
              <label for="fullName">Vārds, uzvārds *</label>
              <input id="fullName" name="fullName" autocomplete="name" value="${applicant.fullName}" ${appState.loading ? 'disabled' : ''} />
              ${renderFieldError('fullName')}
            </div>
            <div class="form-group ${shouldShowError('personalCode') ? 'has-error' : ''}">
              <label for="personalCode">Personas kods *</label>
              <input id="personalCode" name="personalCode" placeholder="DDMMGG-XXXXX" value="${applicant.personalCode}" ${appState.loading ? 'disabled' : ''} />
              ${renderFieldError('personalCode')}
            </div>
          </div>
          <div class="form-row">
            <div class="form-group ${shouldShowError('email') ? 'has-error' : ''}">
              <label for="email">E-pasts *</label>
              <input id="email" name="email" type="email" autocomplete="email" value="${applicant.email}" ${appState.loading ? 'disabled' : ''} />
              ${renderFieldError('email')}
            </div>
            <div class="form-group ${shouldShowError('phone') ? 'has-error' : ''}">
              <label for="phone">Telefons *</label>
              <input id="phone" name="phone" placeholder="+371..." value="${applicant.phone}" ${appState.loading ? 'disabled' : ''} />
              ${renderFieldError('phone')}
            </div>
          </div>
          <div class="form-group ${shouldShowError('residency') ? 'has-error' : ''}">
            <label for="residency">Rezidences valsts *</label>
            <select id="residency" name="residency" ${appState.loading ? 'disabled' : ''}>
              ${residencySelect}
            </select>
            ${renderFieldError('residency')}
          </div>
        </section>
        <section class="form-section">
          <h3>Depozīta parametri</h3>
          <div class="form-row">
            <div class="form-group ${shouldShowError('depositType') ? 'has-error' : ''}">
              <label for="depositType">Depozīta veids *</label>
              <select id="depositType" name="depositType" ${appState.loading ? 'disabled' : ''}>
                ${depositTypeSelect}
              </select>
              ${renderFieldError('depositType')}
            </div>
            <div class="form-group ${shouldShowError('termMonths') ? 'has-error' : ''}">
              <label for="termMonths">Termiņš *</label>
              <select id="termMonths" name="termMonths" ${appState.loading ? 'disabled' : ''}>
                <option value="" disabled ${selectableTerm === '' ? 'selected' : ''}>Izvēlieties termiņu</option>
                ${termOptions}
              </select>
              ${renderFieldError('termMonths')}
            </div>
          </div>
          <div class="form-row">
            <div class="form-group ${shouldShowError('amount') ? 'has-error' : ''}">
              <label for="amount">Summa (EUR) *</label>
              <input id="amount" name="amount" type="number" inputmode="decimal" min="${depositConstraints.min}" step="${depositConstraints.step}" value="${amountValue}" ${appState.loading ? 'disabled' : ''} />
              ${renderAmountHelper()}
              ${renderFieldError('amount')}
            </div>
            <div class="form-group ${shouldShowError('interestRate') ? 'has-error' : ''}">
              <label for="interestRate">Likme (%) *</label>
              <input id="interestRate" name="interestRate" value="${interestRate}" readonly />
              <p class="field-helper">Likme tiek automātiski piemērota atbilstoši tarifu tabulai.</p>
              ${renderFieldError('interestRate')}
            </div>
          </div>
          <div class="form-group ${shouldShowError('payoutAccount') ? 'has-error' : ''}">
            <label for="payoutAccount">Izmaksu konts (IBAN) *</label>
            <input id="payoutAccount" name="payoutAccount" placeholder="LV00BANK0000000000" value="${formattedAccount}" ${appState.loading ? 'disabled' : ''} />
            <p class="field-helper">Depozīta izmaksas tiek veiktas uz verificēto kontu. Nepareiza konta gadījumā līdzekļi tiek atgriezti.</p>
            ${renderFieldError('payoutAccount')}
          </div>
        </section>
        <section class="form-section">
          <div class="form-check ${shouldShowError('terms') ? 'has-error' : ''}">
            <input id="terms" name="terms" type="checkbox" ${appState.termsAccepted ? 'checked' : ''} ${appState.loading ? 'disabled' : ''} />
            <label for="terms">
              Apstiprinu Industra Bank depozītu noteikumus un AML anketas sniegto informāciju.
            </label>
          </div>
          ${renderFieldError('terms')}
        </section>
        <div class="form-actions">
          ${Button({
            label: appState.loading ? 'Nosūtīšana...' : 'Iesniegt pieteikumu',
            variant: 'primary',
            attributes: { type: 'submit', ...(appState.loading ? { disabled: 'true' } : {}) },
          })}
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
      title: 'Depozīta statuss',
      body: `
        <p>Jūsu depozīta pieteikums vēl nav iesniegts. Izpildiet formu, izmantojiet drošu identifikāciju un sekojiet statusam reāllaikā.</p>
        ${Button({ label: 'Izveidot pieteikumu', variant: 'primary', attributes: { 'data-view': 'apply' } })}
      `,
    })
  }

  const metrics = `
    <div class="metric-grid">
      ${MetricChip({ label: 'Summa', value: `${applicant.amount.toLocaleString('lv-LV')} EUR` })}
      ${MetricChip({ label: 'Termiņš', value: `${applicant.termMonths} mēneši` })}
      ${MetricChip({ label: 'Likme', value: `${applicant.interestRate.toFixed(2)}%` })}
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
      note: 'Integrācijas ar PMLP, VID un Creatio CRM',
      done: ['In Review', 'Approved'].includes(applicant.status),
    },
    {
      label: 'Depozīta konts WALL sistēmā',
      note: 'Finansēšanas instrukcija nosūtīta droši',
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
      ${Button({
        label: 'Lejupielādēt līgumu',
        attributes: {
          disabled: 'true',
          title: 'Pieejams pēc integrācijas ar dokumentu parakstīšanas servisu',
        },
      })}
    </div>
  `

  return Card({
    title: 'Depozīta pieteikuma statuss',
    body: `
      <div class="status-summary">
        <div>
          <h3>${applicant.depositType}</h3>
          <p>Konta Nr. izmaksām: <strong>${applicant.payoutAccount ? formatIban(applicant.payoutAccount) : 'Nav norādīts'}</strong></p>
          ${metrics}
        </div>
        <div class="status-badge status-${applicant.status.toLowerCase().replace(/\s+/g, '-')}">${applicant.status}</div>
      </div>
      ${timeline}
      ${Card({
        title: 'Nākamie soļi',
        tone: 'secondary',
        body: `
          <ul class="icon-list">
            <li>Parakstiet pieteikumu ar izvēlēto identifikācijas rīku.</li>
            <li>Veiciet pārskaitījumu trīs dienu laikā pēc konta atvēršanas.</li>
            <li>Pārvaldiet pagarināšanu vai izmaksas portālā, saņemot SMS/e-pasta paziņojumus.</li>
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
        <strong>Atbalsts:</strong> klientu.centrs@industra.finance · +371 20234158
      </div>
      <div>
        <strong>Drošība:</strong> Visas darbības auditētas un glabātas Industra Bank sistēmās.
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
        <p>Izvēlieties identificēšanās veidu. Prototipā tiek simulēts kvalificēts elektroniskais paraksts.</p>
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

function sanitizeAccount(account: string) {
  return account.replace(/\s+/g, '').toUpperCase()
}

function collectApplicantFromForm(form: HTMLFormElement): Applicant {
  const formData = new FormData(form)
  const amountRaw = formData.get('amount')?.toString().trim() ?? ''
  const amountValue = amountRaw ? Number(amountRaw) : Number.NaN
  const termRaw = formData.get('termMonths')?.toString().trim() ?? ''
  const termValue = termRaw ? Number(termRaw) : Number.NaN
  const rateForTerm = Number.isFinite(termValue) ? getRateForTerm(termValue) : undefined

  return {
    ...appState.applicant,
    fullName: formData.get('fullName')?.toString().trim() ?? '',
    personalCode: formData.get('personalCode')?.toString().trim() ?? '',
    email: formData.get('email')?.toString().trim().toLowerCase() ?? '',
    phone: formData.get('phone')?.toString().trim() ?? '',
    residency: formData.get('residency')?.toString().trim() ?? '',
    depositType: formData.get('depositType')?.toString().trim() ?? depositTypeOptions[0],
    amount: Number.isFinite(amountValue) ? amountValue : Number.NaN,
    termMonths: Number.isFinite(termValue) ? termValue : Number.NaN,
    interestRate:
      typeof rateForTerm === 'number'
        ? Number(rateForTerm.toFixed(2))
        : Number.isFinite(appState.applicant.interestRate)
          ? appState.applicant.interestRate
          : 0,
    payoutAccount: sanitizeAccount(formData.get('payoutAccount')?.toString() ?? ''),
    status: appState.applicant.status,
  }
}

function refreshFieldValidation(field: ApplicantField, form: HTMLFormElement) {
  const applicant = collectApplicantFromForm(form)
  setApplicant(applicant)
  const termsAccepted = form.querySelector<HTMLInputElement>('#terms')?.checked ?? false
  setTermsAccepted(termsAccepted)
  const message = validateField(field, applicant, { termsAccepted })
  setFieldError(field, message)
}

function bindFormEvents(form: HTMLFormElement) {
  const fieldConfigs: Array<{
    field: ApplicantField
    selector: string
    events: Array<'input' | 'change' | 'blur'>
  }> = [
    { field: 'fullName', selector: '#fullName', events: ['input', 'blur'] },
    { field: 'personalCode', selector: '#personalCode', events: ['input', 'blur'] },
    { field: 'email', selector: '#email', events: ['input', 'blur'] },
    { field: 'phone', selector: '#phone', events: ['input', 'blur'] },
    { field: 'residency', selector: '#residency', events: ['change', 'blur'] },
    { field: 'depositType', selector: '#depositType', events: ['change', 'blur'] },
    { field: 'amount', selector: '#amount', events: ['input', 'blur'] },
    { field: 'termMonths', selector: '#termMonths', events: ['change', 'blur'] },
    { field: 'interestRate', selector: '#interestRate', events: [] },
    { field: 'payoutAccount', selector: '#payoutAccount', events: ['input', 'blur'] },
    { field: 'terms', selector: '#terms', events: ['change'] },
  ]

  fieldConfigs.forEach(({ field, selector, events }) => {
    const element = form.querySelector<HTMLInputElement | HTMLSelectElement>(selector)
    if (!element) return

    events.forEach((eventName) => {
      element.addEventListener(eventName, () => {
        refreshFieldValidation(field, form)
        if (eventName !== 'input') {
          markFieldTouched(field)
        }
        if (field === 'termMonths') {
          const applicant = collectApplicantFromForm(form)
          setApplicant(applicant)
        }
        if (appState.submissionAttempted) {
          const applicant = collectApplicantFromForm(form)
          const errors = validateApplicant(applicant, { termsAccepted: appState.termsAccepted })
          setFormErrors(errors)
          if (isFormValid(errors)) {
            setSubmissionAttempted(false)
          }
        }
        render()
      })
    })
  })
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

  const applicant = collectApplicantFromForm(form)
  setApplicant(applicant)
  const termsAccepted = form.querySelector<HTMLInputElement>('#terms')?.checked ?? false
  setTermsAccepted(termsAccepted)

  const errors = validateApplicant(applicant, { termsAccepted })
  setFormErrors(errors)
  setSubmissionAttempted(true)
  markAllFieldsTouched()

  if (!isFormValid(errors)) {
    notify('Lūdzu, pārbaudiet laukus un labojiet kļūdas.')
    render()
    return
  }

  appState.loading = true
  render()

  const response = await submitApplication({
    ...applicant,
    status: 'Submitted',
  })
  setApplicantStatus(response.status)
  appState.submissionId = response.id
  appState.submittedAt = new Date()
  appState.loading = false
  setSubmissionAttempted(false)
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
    bindFormEvents(form)
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

render()
