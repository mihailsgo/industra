type ButtonVariant = 'primary' | 'outline'

type ButtonOptions = {
  label: string
  variant?: ButtonVariant
  attributes?: Record<string, string | undefined>
}

export function Button({ label, variant = 'outline', attributes = {} }: ButtonOptions) {
  const attributeString = Object.entries(attributes)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')

  const classes = ['btn', variant === 'primary' ? 'primary' : 'outline'].join(' ')
  return `<button class="${classes}" ${attributeString}>${label}</button>`
}

type CardOptions = {
  title?: string
  description?: string
  body: string
  tone?: 'default' | 'secondary'
  extraClasses?: string
}

export function Card({ title, description, body, tone = 'default', extraClasses = '' }: CardOptions) {
  const toneClass = tone === 'secondary' ? 'secondary' : ''
  return `
    <section class="card ${toneClass} ${extraClasses}">
      ${title ? `<h2>${title}</h2>` : ''}
      ${description ? `<p class="description">${description}</p>` : ''}
      ${body}
    </section>
  `
}

type TimelineItem = {
  label: string
  note?: string
  done?: boolean
  timestamp?: string
}

export function Timeline(items: TimelineItem[]) {
  return `
    <ol class="timeline">
      ${items
        .map(
          (item) => `
          <li class="${item.done ? 'done' : ''}">
            <span>${item.label}</span>
            ${item.timestamp ? `<small>${item.timestamp}</small>` : ''}
            ${item.note ? `<small>${item.note}</small>` : ''}
          </li>
        `,
        )
        .join('')}
    </ol>
  `
}

type MetricChipOptions = {
  label: string
  value: string
}

export function MetricChip({ label, value }: MetricChipOptions) {
  return `<div class="metric-chip"><span>${label}</span><strong>${value}</strong></div>`
}

