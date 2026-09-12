export type ScenarioId = string

export interface RunState {
  runId: string
  revision: number
}

export interface ActionProposal {
  actions: Array<{ id: string; label: string }>
}
