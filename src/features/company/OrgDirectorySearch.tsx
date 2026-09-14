/**
 * Full-text department directory search for Firma → Team.
 * Location: src/features/company/OrgDirectorySearch.tsx
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PlayerDepartmentView, PlayerKeyPersonView } from '../../domain'
import { formatPercent } from '../../shared/format'

type DirectoryPerson = Pick<PlayerKeyPersonView, 'id' | 'name' | 'role' | 'departmentId' | 'flightRiskBps'>

export function OrgDirectorySearch({
  departments,
  people,
}: {
  departments: PlayerDepartmentView[]
  people: DirectoryPerson[]
}) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const rows = useMemo(() => {
    return departments.map((dept) => {
      const members = people.filter((person) => person.departmentId === dept.id)
      const haystack = [
        dept.name,
        dept.focus,
        ...members.map((person) => `${person.name} ${person.role}`),
      ]
        .join(' ')
        .toLowerCase()
      return { dept, members, haystack }
    })
  }, [departments, people])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => row.haystack.includes(q))
  }, [query, rows])

  const selected = rows.find((row) => row.dept.id === selectedId) ?? null

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null
      if (!target || rootRef.current?.contains(target)) return
      setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [])

  return (
    <div className={`org-directory${open ? ' is-open' : ''}`} ref={rootRef} data-testid="org-directory">
      <div className="org-directory__toolbar">
        <label className="org-directory__search">
          <span className="sr-only">Abteilung suchen</span>
          <input
            type="search"
            value={query}
            placeholder="Abteilung oder Person suchen…"
            autoComplete="off"
            data-testid="org-directory-search"
            aria-expanded={open}
            aria-controls="org-directory-listbox"
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value)
              setOpen(true)
            }}
          />
        </label>
        <button
          type="button"
          className={`org-directory__chevron${open ? ' is-open' : ''}`}
          aria-label={open ? 'Abteilungsliste schließen' : 'Abteilungsliste öffnen'}
          aria-expanded={open}
          aria-controls="org-directory-listbox"
          data-testid="org-directory-chevron"
          onClick={() => setOpen((current) => !current)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="m6 9 6 6 6-6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {open ? (
        <ul
          id="org-directory-listbox"
          className="org-directory__dropdown"
          role="listbox"
          aria-label="Abteilungen"
          data-testid="org-directory-dropdown"
        >
          {filtered.length === 0 ? (
            <li className="org-directory__empty">Keine Treffer</li>
          ) : (
            filtered.map(({ dept, members }) => (
              <li key={dept.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selectedId === dept.id}
                  className={`org-directory__option${selectedId === dept.id ? ' is-active' : ''}`}
                  onClick={() => {
                    setSelectedId(dept.id)
                    setQuery(dept.name)
                    setOpen(false)
                  }}
                >
                  <strong>{dept.name}</strong>
                  <span>
                    {dept.headcount} MA · {dept.focus}
                    {members.length > 0 ? ` · ${members.length} Kontakte` : ''}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}

      {selected ? (
        <div className="org-directory__detail" data-testid="org-directory-detail">
          <div className="org-directory__detail-head">
            <strong>{selected.dept.name}</strong>
            <span>
              {selected.dept.headcount} MA · {selected.dept.focus}
            </span>
          </div>
          {selected.members.length > 0 ? (
            <ul className="fact-list" data-testid="player-key-people">
              {selected.members.map((person) => (
                <li key={person.id}>
                  {person.name} · {person.role}
                  {person.flightRiskBps !== undefined
                    ? ` · Flight risk ${formatPercent(person.flightRiskBps)}`
                    : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p className="org-directory__empty">Keine sichtbaren Führungskontakte in dieser Abteilung.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
