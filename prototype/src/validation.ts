import { depositConstraints, rateTable } from './config'
import type { Applicant, ApplicantField, ApplicantInputField, FormErrors } from './types'

type ValidationContext = {
  termsAccepted: boolean
}

const namePattern = /^\p{L}+(?:[\s'-]\p{L}+)+$/u
const personalCodePattern = /^(\d{2})(\d{2})(\d{2})-?(\d{5})$/
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^\+?[0-9]{8,15}$/
const ibanPattern = /^LV\d{2}[A-Z0-9]{17}$/

export const applicantInputFields: ApplicantInputField[] = [
  'fullName',
  'personalCode',
  'email',
  'phone',
  'residency',
  'depositType',
  'amount',
  'termMonths',
  'interestRate',
  'payoutAccount',
]

export const formValidationFields: ApplicantField[] = [...applicantInputFields, 'terms']

function validateFullName(fullName: string) {
  if (!fullName.trim()) {
    return 'Ievadiet pilnu vārdu un uzvārdu.'
  }
  if (!namePattern.test(fullName.trim())) {
    return 'Lietojiet vismaz divus vārdus (piem., Vārds Uzvārds).'
  }
  return
}

function isValidDate(day: number, month: number, year: number) {
  const date = new Date(year, month - 1, day)
  return date.getFullYear() % 100 === year && date.getMonth() === month - 1 && date.getDate() === day
}

function validatePersonalCode(personalCode: string) {
  const trimmed = personalCode.trim()
  if (!trimmed) {
    return 'Ievadiet personas kodu.'
  }
  const match = personalCodePattern.exec(trimmed)
  if (!match) {
    return 'Formāts XXMMGG-XXXXX (piem., 010101-12345).'
  }
  const [, dd, mm, yy] = match
  if (!isValidDate(Number(dd), Number(mm), Number(yy))) {
    return 'Personas koda dzimšanas datums nav derīgs.'
  }
  return
}

function validateEmail(email: string) {
  const trimmed = email.trim()
  if (!trimmed) {
    return 'Norādiet e-pastu saziņai.'
  }
  if (!emailPattern.test(trimmed)) {
    return 'E-pasta adrese nav derīga.'
  }
  return
}

function validatePhone(phone: string) {
  const trimmed = phone.trim()
  if (!trimmed) {
    return 'Norādiet kontakta tālruni.'
  }
  if (!phonePattern.test(trimmed)) {
    return 'Tālrunim jāsatur 8–15 ciparus un var sākties ar +.'
  }
  return
}

function validateResidency(residency: string) {
  if (!residency.trim()) {
    return 'Izvēlieties rezidences valsti.'
  }
  return
}

function validateDepositType(depositType: string) {
  if (!depositType.trim()) {
    return 'Izvēlieties depozīta veidu.'
  }
  return
}

function validateAmount(amount: number) {
  if (!Number.isFinite(amount)) {
    return 'Norādiet depozīta summu.'
  }
  if (amount < depositConstraints.min) {
    return `Minimālais depozīts ir ${depositConstraints.min.toLocaleString('lv-LV')} EUR.`
  }
  if (amount > depositConstraints.max) {
    return 'Lielākai summai, lūdzu, sazinieties ar banku.'
  }
  if (amount % depositConstraints.step !== 0) {
    return `Summai jābūt dalāmai ar ${depositConstraints.step} EUR.`
  }
  return
}

export function getRateForTerm(months: number) {
  return rateTable.find((item) => item.months === months)?.rate
}

function validateTerm(months: number) {
  if (!Number.isFinite(months) || months <= 0) {
    return 'Izvēlieties depozīta termiņu.'
  }
  if (!getRateForTerm(months)) {
    return 'Termiņš nav pieejams piedāvājumā.'
  }
  return
}

function validateInterestRate(months: number, interestRate: number) {
  const expected = getRateForTerm(months)
  if (!Number.isFinite(interestRate)) {
    return 'Likmei jābūt skaitlim.'
  }
  if (typeof expected === 'number' && Math.abs(expected - interestRate) > 0.01) {
    return 'Likme neatbilst aktuālajai tarifu tabulai.'
  }
  return
}

function sanitizeIban(iban: string) {
  return iban.replace(/\s+/g, '').toUpperCase()
}

function isValidIban(iban: string) {
  const normalised = sanitizeIban(iban)
  if (!ibanPattern.test(normalised)) {
    return false
  }
  const rearranged = normalised.slice(4) + normalised.slice(0, 4)
  const converted = rearranged.replace(/[A-Z]/g, (char) => (char.charCodeAt(0) - 55).toString())
  let remainder = 0
  for (let i = 0; i < converted.length; i += 1) {
    remainder = (remainder * 10 + Number(converted[i])) % 97
  }
  return remainder === 1
}

function validatePayoutAccount(account: string) {
  const trimmed = account.trim()
  if (!trimmed) {
    return 'Norādiet izmaksu kontu (IBAN).'
  }
  if (!isValidIban(trimmed)) {
    return 'IBAN formāts nav derīgs (piem., LV00BANK00000000000).'
  }
  return
}

function validateTerms(termsAccepted: boolean) {
  if (!termsAccepted) {
    return 'Lai turpinātu, jāapstiprina noteikumi un AML informācija.'
  }
  return
}

export function validateField(
  field: ApplicantField,
  applicant: Applicant,
  context: ValidationContext,
): string | undefined {
  switch (field) {
    case 'fullName':
      return validateFullName(applicant.fullName)
    case 'personalCode':
      return validatePersonalCode(applicant.personalCode)
    case 'email':
      return validateEmail(applicant.email)
    case 'phone':
      return validatePhone(applicant.phone)
    case 'residency':
      return validateResidency(applicant.residency)
    case 'depositType':
      return validateDepositType(applicant.depositType)
    case 'amount':
      return validateAmount(applicant.amount)
    case 'termMonths':
      return validateTerm(applicant.termMonths)
    case 'interestRate':
      return validateInterestRate(applicant.termMonths, applicant.interestRate)
    case 'payoutAccount':
      return validatePayoutAccount(applicant.payoutAccount)
    case 'terms':
      return validateTerms(context.termsAccepted)
    default:
      return
  }
}

export function validateApplicant(applicant: Applicant, context: ValidationContext): FormErrors {
  return formValidationFields.reduce<FormErrors>((errors, field) => {
    const message = validateField(field, applicant, context)
    if (message) {
      errors[field] = message
    }
    return errors
  }, {})
}

export function isFormValid(errors: FormErrors) {
  return Object.keys(errors).length === 0
}

export function formatIban(account: string) {
  const sanitized = sanitizeIban(account)
  return sanitized.replace(/(.{4})/g, '$1 ').trim()
}
