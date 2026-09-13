/** Auth routes: register / login / me — email+password JWT (no SMTP required). */
import { Hono } from 'hono'
import { z } from 'zod'
import {
  createUser,
  findUserByEmail,
  issueToken,
  requireAuth,
  verifyPassword,
  type AppVariables,
} from '../auth.ts'

const credentialsSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
})

export const authRoutes = new Hono<{ Variables: AppVariables }>()

authRoutes.post('/register', async (c) => {
  const parsed = credentialsSchema.safeParse(await c.req.json())
  if (!parsed.success) return c.json({ error: 'INVALID_INPUT' }, 400)
  const existing = await findUserByEmail(parsed.data.email)
  if (existing) return c.json({ error: 'EMAIL_TAKEN' }, 409)
  try {
    const user = await createUser(parsed.data.email, parsed.data.password)
    const token = await issueToken(user)
    return c.json({ token, user: { id: user.id, email: user.email } }, 201)
  } catch (error) {
    console.error('register failed', error instanceof Error ? error.message : 'unknown')
    return c.json({ error: 'REGISTER_FAILED' }, 500)
  }
})

authRoutes.post('/login', async (c) => {
  const parsed = credentialsSchema.safeParse(await c.req.json())
  if (!parsed.success) return c.json({ error: 'INVALID_INPUT' }, 400)
  const user = await findUserByEmail(parsed.data.email)
  if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) {
    return c.json({ error: 'INVALID_CREDENTIALS' }, 401)
  }
  const token = await issueToken({ id: user.id, email: user.email })
  return c.json({ token, user: { id: user.id, email: user.email } })
})

authRoutes.get('/me', requireAuth, (c) => {
  const user = c.get('user')
  return c.json({ user: { id: user.id, email: user.email } })
})
