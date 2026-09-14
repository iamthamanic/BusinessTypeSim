/**
 * Build org-directory contacts from live advisors + non-conflicting world key people.
 * Location: src/features/company/orgDirectoryPeople.ts
 */
import type { PlayerDepartmentView, PlayerKeyPersonView } from '../../domain'
import { advisorPersona, advisorPersonaKey, matchDepartmentId } from '../../shared/advisorPersona'

export type OrgDirectoryPerson = Pick<
  PlayerKeyPersonView,
  'id' | 'name' | 'role' | 'departmentId' | 'flightRiskBps'
>

/** Prefer current advisor roster; drop stale world C-levels like Jonas Berg · CTO. */
export function buildOrgDirectoryPeople(
  advisors: Array<{ id: string; role: string }>,
  departments: PlayerDepartmentView[],
  keyPeople: PlayerKeyPersonView[],
): OrgDirectoryPerson[] {
  const coveredKeys = new Set(
    advisors.map((advisor) => advisorPersonaKey(advisor.role)).filter((key) => key !== 'adalbert-assistent'),
  )

  const fromAdvisors: OrgDirectoryPerson[] = advisors.flatMap((advisor) => {
    const persona = advisorPersona(advisor.role)
    if (persona.dept === 'Assistent') return []
    const departmentId = matchDepartmentId(departments, persona.dept)
    return [
      {
        id: `advisor:${advisor.id}`,
        name: persona.name,
        role: persona.dept,
        ...(departmentId ? { departmentId } : {}),
      },
    ]
  })

  const extras = keyPeople.filter((person) => {
    const key = advisorPersonaKey(person.role)
    if (coveredKeys.has(key)) return false
    const nameKey = advisorPersonaKey(person.name)
    if (coveredKeys.has(nameKey) && nameKey !== 'adalbert-assistent') return false
    return true
  })

  return [...fromAdvisors, ...extras]
}
