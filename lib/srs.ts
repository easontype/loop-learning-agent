export interface SM2State {
  ease_factor: number
  interval: number
  repetitions: number
  lapses: number
}

export interface SM2Result extends SM2State {
  next_review: number
  last_quality: number
  last_reviewed: number
}

// SM-2 algorithm. quality: 0=blackout, 5=perfect recall
export function sm2(state: SM2State, quality: number): SM2Result {
  const q = Math.max(0, Math.min(5, quality))
  const now = Math.floor(Date.now() / 1000)

  let { ease_factor, interval, repetitions, lapses } = state

  if (q >= 3) {
    if (repetitions === 0) interval = 1
    else if (repetitions === 1) interval = 6
    else interval = Math.round(interval * ease_factor)

    repetitions++
    ease_factor = Math.max(1.3, ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
  } else {
    lapses++
    repetitions = 0
    interval = 1
  }

  return {
    ease_factor,
    interval,
    repetitions,
    lapses,
    next_review: now + interval * 86400,
    last_quality: q,
    last_reviewed: now,
  }
}

export function defaultSM2(): SM2State {
  return { ease_factor: 2.5, interval: 1, repetitions: 0, lapses: 0 }
}
