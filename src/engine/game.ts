import { measured } from './geometry.ts';
import { clampT, identifyPoints, ratioOf, repairPointsForRatio } from './scoring.ts';
import type { Mode, ResolvedScene, RoundResult, RunState, Variant } from './types.ts';

export type Action =
  | { type: 'select'; id: string }
  | { type: 'confirm' }
  | { type: 'setT'; t: number }
  | { type: 'lock' }
  | { type: 'next' };

export function newRun(o: { mode: Mode; variant: Variant; date: string; seed?: string; puzzleKey: string; sceneRefs: string[] }): RunState {
  return {
    v: 1,
    mode: o.mode,
    variant: o.variant,
    date: o.date,
    seed: o.seed ?? '',
    puzzleKey: o.puzzleKey,
    sceneRefs: o.sceneRefs,
    round: 0,
    phase: o.variant === 'A' ? 'identify' : 'repair',
    selectedId: null,
    pending: o.variant === 'A' ? null : { pickedId: null, identified: null, idPoints: 0 },
    t: 0,
    results: [],
    completed: false,
  };
}

/**
 * Pure state machine: intro → identify → repair → reveal → next identify or results.
 * Any action that is not legal in the current phase returns the same state object,
 * so a double click can never score twice or undo a committed decision.
 */
export function reduce(state: RunState, action: Action, scenes: ResolvedScene[]): RunState {
  const scene = scenes[state.round];
  if (!scene || state.completed) return state;

  switch (action.type) {
    case 'select': {
      if (state.phase !== 'identify') return state;
      if (!scene.objects.some((o) => o.id === action.id)) return state;
      if (state.selectedId === action.id) return state;
      return { ...state, selectedId: action.id };
    }
    case 'confirm': {
      if (state.phase !== 'identify' || !state.selectedId) return state;
      const identified = state.selectedId === scene.misfitId;
      return {
        ...state,
        phase: 'repair',
        pending: { pickedId: state.selectedId, identified, idPoints: identifyPoints(identified) },
        t: 0,
      };
    }
    case 'setT': {
      if (state.phase !== 'repair') return state;
      const t = clampT(action.t);
      return t === state.t ? state : { ...state, t };
    }
    case 'lock': {
      if (state.phase !== 'repair' || !state.pending) return state;
      const misfit = scene.objects.find((o) => o.id === scene.misfitId);
      if (!misfit) return state;
      let ratio: number;
      let points: number;
      try {
        const truth = measured(misfit);
        ratio = ratioOf(truth * scene.distortion * Math.exp(state.t), truth);
        points = repairPointsForRatio(ratio);
      } catch {
        return state; // invalid content never produces a score
      }
      const result: RoundResult = {
        sceneRef: scene.ref,
        pickedId: state.pending.pickedId,
        identified: state.pending.identified,
        idPoints: state.pending.idPoints,
        t: state.t,
        ratio,
        repairPoints: points,
      };
      return { ...state, phase: 'reveal', results: [...state.results, result] };
    }
    case 'next': {
      if (state.phase !== 'reveal') return state;
      if (state.round + 1 >= scenes.length) {
        return { ...state, phase: 'results', completed: true, selectedId: null, pending: null };
      }
      return {
        ...state,
        round: state.round + 1,
        phase: state.variant === 'A' ? 'identify' : 'repair',
        selectedId: null,
        pending: state.variant === 'A' ? null : { pickedId: null, identified: null, idPoints: 0 },
        t: 0,
      };
    }
  }
}
