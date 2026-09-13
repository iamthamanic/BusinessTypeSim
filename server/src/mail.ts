/** Provider-neutral mail adapter — console/dev stub; no SMTP in this slice. */
export type MailMessage = {
  to: string
  subject: string
  text: string
  /** Opaque token for verification/reset — never log in production adapters. */
  purpose: 'verify_email' | 'reset_password'
  token: string
}

export interface MailAdapter {
  send(message: MailMessage): Promise<void>
}

/** Dev/default adapter: logs non-secret metadata; token only when capture enabled. */
export class ConsoleMailAdapter implements MailAdapter {
  constructor(private readonly exposeToken: boolean) {}

  async send(message: MailMessage): Promise<void> {
    const tokenPart = this.exposeToken ? ` token=${message.token}` : ''
    console.info(`[mail] to=${message.to} purpose=${message.purpose} subject=${message.subject}${tokenPart}`)
  }
}

/** Test/E2E capture — keeps last message per purpose (exactly one send recorded per call). */
export class CapturingMailAdapter implements MailAdapter {
  readonly sent: MailMessage[] = []

  async send(message: MailMessage): Promise<void> {
    this.sent.push(message)
  }

  last(purpose?: MailMessage['purpose']): MailMessage | null {
    const list = purpose ? this.sent.filter((item) => item.purpose === purpose) : this.sent
    return list.at(-1) ?? null
  }

  clear(): void {
    this.sent.length = 0
  }
}

let activeMail: MailAdapter | null = null

export function setMailAdapter(adapter: MailAdapter): void {
  activeMail = adapter
}

export function getMailAdapter(): MailAdapter {
  if (activeMail) return activeMail
  const expose = process.env.AUTH_DEV_CAPTURE === '1'
  activeMail = new ConsoleMailAdapter(expose)
  return activeMail
}
