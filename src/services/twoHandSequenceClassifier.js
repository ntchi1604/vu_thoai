import { TWO_HAND_SEQUENCE_CONFIG } from '../config/twoHandSequenceConfig.js'
import { getPalmScale } from './landmarkNormalizer.js'

const PALM_INDICES = [0, 5, 9, 13, 17]

export function normalizeTwoHandFrame(hands) {
  return normalizeGestureFrame(hands)
}

export function normalizeGestureFrame(hands) {
  if (!hasValidHands(hands)) return null

  const selectedHands = hands.slice(0, 2)
  const centers = selectedHands.map(getPalmCenter)
  const scales = selectedHands.map(getPalmScale)
  const scale = Math.max(scales.reduce((total, value) => total + value, 0) / scales.length, 1e-6)
  const anchor = {
    x: centers.reduce((total, center) => total + center.x, 0) / centers.length,
    y: centers.reduce((total, center) => total + center.y, 0) / centers.length,
    z: selectedHands.reduce((total, hand) => total + (hand[0].z ?? 0), 0) / selectedHands.length,
  }

  const landmarkVector = selectedHands.flatMap((landmarks) => landmarks.flatMap((point) => [
    (point.x - anchor.x) / scale,
    (point.y - anchor.y) / scale,
    ((point.z ?? 0) - anchor.z) / scale,
  ]))
  while (landmarkVector.length < 126) landmarkVector.push(0)

  return [
    ...landmarkVector,
    anchor.x,
    anchor.y,
    scale,
    selectedHands.length === 2
      ? Math.hypot(centers[1].x - centers[0].x, centers[1].y - centers[0].y) / scale
      : 0,
  ]
}

export function twoHandFrameMotionDistance(frameA, frameB) {
  if (!Array.isArray(frameA) || !Array.isArray(frameB) || frameA.length !== frameB.length) return 0
  const localLength = Math.min(126, frameA.length)
  const localDistance = vectorRmsDistance(frameA.slice(0, localLength), frameB.slice(0, localLength))

  if (frameA.length < 130) return localDistance

  const averageScale = Math.max((frameA[128] + frameB[128]) / 2, 1e-6)
  const globalDistance = Math.hypot(frameA[126] - frameB[126], frameA[127] - frameB[127]) / averageScale
  const scaleChange = Math.abs(frameA[128] - frameB[128]) / averageScale
  return Math.max(localDistance, globalDistance * 0.2, scaleChange * 0.15)
}

export function gestureFrameVisualMotionDistance(frameA, frameB) {
  if (!Array.isArray(frameA) || !Array.isArray(frameB) || frameA.length !== frameB.length) return 0

  const localLength = Math.min(126, frameA.length)
  let planarSum = 0
  let planarCount = 0
  for (let index = 0; index < localLength; index += 1) {
    if (index % 3 === 2) continue
    const difference = frameA[index] - frameB[index]
    planarSum += difference * difference
    planarCount += 1
  }
  const planarDistance = Math.sqrt(planarSum / Math.max(1, planarCount))

  if (frameA.length < 130) return planarDistance

  const averageScale = Math.max((frameA[128] + frameB[128]) / 2, 1e-6)
  const globalDistance = Math.hypot(frameA[126] - frameB[126], frameA[127] - frameB[127]) / averageScale
  const scaleChange = Math.abs(frameA[128] - frameB[128]) / averageScale
  return Math.max(planarDistance, globalDistance * 0.2, scaleChange * 0.15)
}

export function normalizeSequenceTrajectory(sequence) {
  if (!isValidSequence(sequence) || sequence[0].length < 130) {
    return Array.isArray(sequence) ? sequence.map((frame) => [...frame]) : []
  }

  const originX = sequence[0][126]
  const originY = sequence[0][127]
  const originScale = Math.max(sequence[0][128], 1e-6)

  return sequence.map((frame) => {
    const normalized = [...frame]
    normalized[126] = (frame[126] - originX) / originScale
    normalized[127] = (frame[127] - originY) / originScale
    normalized[128] = frame[128] / originScale - 1
    return normalized
  })
}

export function resampleSequence(sequence, targetFrames = TWO_HAND_SEQUENCE_CONFIG.targetFrames) {
  if (!isValidSequence(sequence) || targetFrames < 2) return []
  if (sequence.length === targetFrames) return sequence.map((frame) => [...frame])
  if (sequence.length === 1) return Array.from({ length: targetFrames }, () => [...sequence[0]])

  return Array.from({ length: targetFrames }, (_, targetIndex) => {
    const position = (targetIndex / (targetFrames - 1)) * (sequence.length - 1)
    const lowerIndex = Math.floor(position)
    const upperIndex = Math.min(sequence.length - 1, Math.ceil(position))
    const ratio = position - lowerIndex

    return sequence[lowerIndex].map((value, valueIndex) => {
      const upperValue = sequence[upperIndex][valueIndex]
      return value + (upperValue - value) * ratio
    })
  })
}

export function dynamicTimeWarpingDistance(sequenceA, sequenceB) {
  if (!isValidSequence(sequenceA) || !isValidSequence(sequenceB)) return Infinity
  if (sequenceA[0].length !== sequenceB[0].length) return Infinity

  const rowCount = sequenceA.length
  const columnCount = sequenceB.length
  let previous = new Float64Array(columnCount + 1).fill(Infinity)
  let current = new Float64Array(columnCount + 1).fill(Infinity)
  previous[0] = 0

  for (let row = 1; row <= rowCount; row += 1) {
    current.fill(Infinity)

    for (let column = 1; column <= columnCount; column += 1) {
      const cost = vectorRmsDistance(sequenceA[row - 1], sequenceB[column - 1])
      current[column] = cost + Math.min(
        previous[column],
        current[column - 1],
        previous[column - 1],
      )
    }

    const swap = previous
    previous = current
    current = swap
  }

  return previous[columnCount] / Math.max(rowCount, columnCount)
}

export function calculateSequenceTravel(sequence) {
  if (!isValidSequence(sequence) || sequence.length < 2) return 0

  let travel = 0
  for (let index = 1; index < sequence.length; index += 1) {
    travel += sequenceFrameDistance(sequence[index - 1], sequence[index])
  }
  return travel
}

export function classifyTwoHandSequence(sequence, templates, config = TWO_HAND_SEQUENCE_CONFIG) {
  const options = { ...TWO_HAND_SEQUENCE_CONFIG, ...config }
  const normalizedSequence = resampleSequence(normalizeSequenceTrajectory(sequence), options.targetFrames)
  const validTemplates = getValidTemplates(templates, options)

  if (normalizedSequence.length === 0) {
    return createUnknownResult('Chuỗi landmark không hợp lệ.')
  }

  if (validTemplates.length === 0) {
    return createUnknownResult('Chưa có nhãn nào đủ mẫu hai tay.')
  }

  const distancesByLabel = new Map()
  const latestPhraseByLabel = new Map(validTemplates.map((template) => [template.label, template.phrase]))
  const queryDescriptor = createSequenceDescriptor(normalizedSequence)
  const queryTravel = calculateSequenceTravel(normalizedSequence)
  const candidates = validTemplates
    .map((template) => {
      const templateSequence = resampleSequence(
        normalizeSequenceTrajectory(template.frames),
        options.targetFrames,
      )
      return {
        coarseDistance: vectorRmsDistance(queryDescriptor, createSequenceDescriptor(templateSequence)),
        template,
        templateSequence,
        templateTravel: calculateSequenceTravel(templateSequence),
      }
    })
    .sort((a, b) => a.coarseDistance - b.coarseDistance)
    .slice(0, options.dtwCandidateLimit)

  candidates.forEach(({ template, templateSequence, templateTravel }) => {
    const distance = dynamicTimeWarpingDistance(normalizedSequence, templateSequence)
    if (!Number.isFinite(distance)) return

    const entries = distancesByLabel.get(template.label) ?? []
    entries.push({ distance, phrase: template.phrase, templateTravel })
    distancesByLabel.set(template.label, entries)
  })

  const ranked = [...distancesByLabel.entries()]
    .map(([label, entries]) => {
      const nearest = entries.sort((a, b) => a.distance - b.distance).slice(0, 3)
      return {
        completion: getCompletionRatio(queryTravel, nearest, options),
        distance: weightedNearestDistance(nearest),
        label,
        phrase: latestPhraseByLabel.get(label) || label,
      }
    })
    .sort((a, b) => a.distance - b.distance)

  if (ranked.length === 0) return createUnknownResult('Không có khoảng cách DTW hợp lệ.')

  const best = ranked[0]
  const second = ranked[1]
  const margin = second ? second.distance - best.distance : Infinity
  const confidence = Math.max(0, Math.min(1, 1 - best.distance / options.maxDistance))

  if (best.completion < options.minCompletionTravelRatio) {
    return createUnknownResult(
      `Động tác mới hoàn thành ${Math.round(best.completion * 100)}% quãng chuyển động.`,
      {
        completion: best.completion,
        confidence,
        distance: best.distance,
        margin,
        topLabel: best.label,
      },
    )
  }

  if (best.distance > options.maxDistance) {
    return createUnknownResult(`Khoảng cách DTW quá lớn: ${best.distance.toFixed(3)}.`, {
      confidence,
      distance: best.distance,
      margin,
      topLabel: best.label,
    })
  }

  if (margin < options.minMargin) {
    return createUnknownResult(`Hai nhãn quá giống nhau: margin ${margin.toFixed(3)}.`, {
      confidence,
      distance: best.distance,
      margin,
      topLabel: best.label,
    })
  }

  return {
    completion: best.completion,
    confidence,
    distance: best.distance,
    gesture: best.label,
    margin,
    method: 'two-hand-dtw',
    phrase: best.phrase,
    unknownReason: '',
  }
}

export function createSequenceDescriptor(sequence) {
  if (!isValidSequence(sequence)) return []
  const vectorLength = sequence[0].length
  const descriptor = []

  for (let valueIndex = 0; valueIndex < vectorLength; valueIndex += 1) {
    const values = sequence.map((frame) => frame[valueIndex])
    const mean = values.reduce((total, value) => total + value, 0) / values.length
    const variance = values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length
    descriptor.push(mean, Math.sqrt(variance), values[0], values.at(-1))
  }

  return descriptor
}

export class TwoHandSequenceRecognizer {
  constructor(config = {}) {
    this.config = { ...TWO_HAND_SEQUENCE_CONFIG, ...config }
    this.reset()
  }

  update(frame, timestamp, templates, handCount = 2) {
    if (!Array.isArray(frame)) {
      return this.handleRelease(timestamp)
    }

    const normalizedHandCount = handCount === 1 ? 1 : 2
    if (this.handCount && this.handCount !== normalizedHandCount) {
      this.blockedGesture = ''
      this.resetTracking()
    }
    this.handCount = normalizedHandCount

    this.releasedSince = null
    if (!this.visibleSince) this.visibleSince = timestamp

    const movement = this.previousFrame ? twoHandFrameMotionDistance(frame, this.previousFrame) : 0
    this.previousFrame = frame
    this.preRoll.push({ frame, timestamp })
    if (this.preRoll.length > this.config.preRollFrames) this.preRoll.shift()

    if (this.latchedGesture && timestamp - this.latchedAt >= this.config.latchMaxMs) {
      this.clearLatchedGesture()
    }

    let resumedCaptureAfterEmit = false
    if (this.awaitingPostEmitRest) {
      if (movement >= this.config.motionContinueThreshold) this.lastMotionAt = timestamp

      if (movement >= this.config.motionStartThreshold) this.motionStartFrames += 1
      else this.motionStartFrames = Math.max(0, this.motionStartFrames - 1)

      if (this.motionStartFrames >= this.config.motionStartFrames) {
        this.awaitingPostEmitRest = false
        this.clearLatchedGesture()
        this.isCapturing = true
        this.frames = this.preRoll.slice(-this.config.recordingPreRollFrames)
        this.lastMotionAt = timestamp
        this.motionStartFrames = 0
        resumedCaptureAfterEmit = true
      } else if (timestamp - this.lastMotionAt < this.config.motionEndHoldMs) {
        return this.createState({ movement })
      } else {
        this.awaitingPostEmitRest = false
        this.clearLatchedGesture()
        this.resetCapture(frame, timestamp)
        return this.createState({ movement })
      }
    }

    const staticCandidateReady =
      !this.isCapturing &&
      !this.blockedGesture &&
      timestamp - this.visibleSince >= this.config.staticStartHoldMs &&
      this.preRoll.length >= this.config.minFrames

    if (!this.isCapturing) {
      if (movement >= this.config.motionStartThreshold) this.motionStartFrames += 1
      else this.motionStartFrames = Math.max(0, this.motionStartFrames - 1)
    }
    const motionCandidateReady = this.motionStartFrames >= this.config.motionStartFrames

    if (!this.isCapturing && (motionCandidateReady || staticCandidateReady)) {
      this.clearLatchedGesture()
      if (motionCandidateReady) this.blockedGesture = ''
      this.isCapturing = true
      this.frames = staticCandidateReady
        ? [...this.preRoll]
        : this.preRoll.slice(-this.config.recordingPreRollFrames)
      this.lastMotionAt = timestamp
      this.motionStartFrames = 0
    } else if (this.isCapturing && !resumedCaptureAfterEmit) {
      this.frames.push({ frame, timestamp })
    }

    if (this.isCapturing && movement >= this.config.motionContinueThreshold) {
      this.lastMotionAt = timestamp
    }

    this.frames = this.frames.filter((entry) => timestamp - entry.timestamp <= this.config.maxWindowMs)

    const matchingTemplates = getTemplatesForHandCount(templates, normalizedHandCount)
    const readyLabels = getReadyLabels(matchingTemplates, this.config.minTemplatesPerLabel)
    if (readyLabels.length === 0) return this.createState()

    if (!this.isCapturing) return this.createState({ movement })

    const durationMs = this.frames.at(-1).timestamp - this.frames[0].timestamp
    if (this.frames.length < this.config.minFrames || durationMs < this.config.minDurationMs) {
      return this.createState({ durationMs, isAnalyzing: true, movement })
    }

    if (timestamp - this.lastClassifiedAt < this.config.classificationIntervalMs) {
      return this.createState({ durationMs, isAnalyzing: true, movement })
    }

    this.lastClassifiedAt = timestamp
    const result = classifyTwoHandSequence(
      this.frames.map((entry) => entry.frame),
      matchingTemplates,
      { ...this.config, handCount: normalizedHandCount },
    )

    if (result.gesture === 'UNKNOWN') {
      this.candidateGesture = 'UNKNOWN'
      this.confirmations = 0
      return this.createState({
        ...result,
        durationMs,
        isAnalyzing: true,
        movement,
      })
    }

    if (result.gesture === this.candidateGesture) this.confirmations += 1
    else {
      this.candidateGesture = result.gesture
      this.confirmations = 1
    }

    if (result.gesture !== this.blockedGesture) this.blockedGesture = ''
    const motionHasEnded = timestamp - this.lastMotionAt >= this.config.motionEndHoldMs
    const isStrongEarlyMatch =
      result.completion >= this.config.earlyCompletionTravelRatio &&
      result.distance <= this.config.earlyMaxDistance &&
      result.margin >= this.config.earlyMinMargin
    const isConfirmed =
      this.confirmations >= this.config.confirmationCount &&
      (motionHasEnded || isStrongEarlyMatch)
    const isBlockedRepeat = isConfirmed && result.gesture === this.blockedGesture
    if (isBlockedRepeat) {
      this.awaitingPostEmitRest = true
      this.resetCapture(frame, timestamp)
      return this.createState({
        ...result,
        gesture: 'UNKNOWN',
        isAnalyzing: false,
        unknownReason: 'Ký hiệu đang được giữ, chờ động tác mới.',
      })
    }

    const shouldEmit = isConfirmed
    const confirmedCount = this.confirmations
    if (shouldEmit) {
      this.blockedGesture = result.gesture
      this.awaitingPostEmitRest = true
      this.latchedAt = timestamp
      this.latchedGesture = result.gesture
      this.latchedPhrase = result.phrase
      this.latchedConfidence = result.confidence
      this.resetCapture(frame, timestamp)
    }

    return this.createState({
      ...result,
      confirmations: confirmedCount,
      durationMs,
      gesture: shouldEmit ? result.gesture : 'UNKNOWN',
      isActive: shouldEmit,
      isAnalyzing: !shouldEmit,
      movement,
      shouldEmit,
    })
  }

  rearm() {
    this.reset()
  }

  clearLatchedGesture() {
    this.latchedConfidence = 0
    this.latchedGesture = ''
    this.latchedPhrase = ''
    this.latchedAt = 0
  }

  resetCapture(frame, timestamp) {
    this.candidateGesture = 'UNKNOWN'
    this.confirmations = 0
    this.frames = []
    this.isCapturing = false
    this.lastClassifiedAt = -Infinity
    this.lastMotionAt = timestamp
    this.motionStartFrames = 0
    this.preRoll = [{ frame, timestamp }]
    this.previousFrame = frame
    this.visibleSince = timestamp
  }

  reset() {
    this.blockedGesture = ''
    this.handCount = 0
    this.resetTracking()
  }

  resetTracking() {
    this.awaitingPostEmitRest = false
    this.candidateGesture = 'UNKNOWN'
    this.confirmations = 0
    this.frames = []
    this.isCapturing = false
    this.lastClassifiedAt = -Infinity
    this.latchedConfidence = 0
    this.latchedAt = 0
    this.latchedGesture = ''
    this.latchedPhrase = ''
    this.lastMotionAt = 0
    this.motionStartFrames = 0
    this.preRoll = []
    this.previousFrame = null
    this.releasedSince = null
    this.visibleSince = 0
  }

  handleRelease(timestamp) {
    this.awaitingPostEmitRest = false
    this.frames = []
    this.isCapturing = false
    this.preRoll = []
    this.previousFrame = null
    this.visibleSince = 0
    this.candidateGesture = 'UNKNOWN'
    this.confirmations = 0
    this.motionStartFrames = 0

    if (this.releasedSince === null) this.releasedSince = timestamp
    if (timestamp - this.releasedSince >= this.config.releaseMs) {
      this.latchedConfidence = 0
      this.latchedGesture = ''
      this.latchedPhrase = ''
      this.blockedGesture = ''
    }

    return this.createState()
  }

  createState(overrides = {}) {
    return {
      confidence: 0,
      confirmations: this.confirmations,
      distance: Infinity,
      durationMs: 0,
      gesture: this.latchedGesture || 'UNKNOWN',
      isActive: Boolean(this.latchedGesture),
      isAnalyzing: false,
      margin: 0,
      movement: 0,
      phrase: this.latchedPhrase,
      sampleCount: this.frames.length,
      shouldEmit: false,
      unknownReason: '',
      ...overrides,
    }
  }
}

function getValidTemplates(templates, config) {
  const readyLabels = new Set(getReadyLabels(templates, config.minTemplatesPerLabel))
  return Array.isArray(templates)
    ? templates.filter((template) => readyLabels.has(template.label) && isValidSequence(template.frames))
    : []
}

function getTemplatesForHandCount(templates, handCount) {
  return Array.isArray(templates)
    ? templates.filter((template) => getTemplateHandCount(template) === handCount)
    : []
}

function getTemplateHandCount(template) {
  const raw = template?.handCount ?? template?.hand_count
  return raw === 1 ? 1 : 2
}

function getReadyLabels(templates, minimumCount) {
  const counts = new Map()
  if (!Array.isArray(templates)) return []

  templates.forEach((template) => {
    if (!template?.label || !isValidSequence(template.frames)) return
    counts.set(template.label, (counts.get(template.label) ?? 0) + 1)
  })

  return [...counts.entries()]
    .filter(([, count]) => count >= minimumCount)
    .map(([label]) => label)
}

function createUnknownResult(unknownReason, details = {}) {
  return {
    completion: details.completion ?? 0,
    confidence: details.confidence ?? 0,
    distance: details.distance ?? Infinity,
    gesture: 'UNKNOWN',
    margin: details.margin ?? 0,
    method: 'two-hand-dtw',
    phrase: '',
    topLabel: details.topLabel ?? 'UNKNOWN',
    unknownReason,
  }
}

function hasValidHands(hands) {
  return Array.isArray(hands) && hands.length >= 1 && hands.slice(0, 2).every(
    (landmarks) => Array.isArray(landmarks) && landmarks.length === 21,
  )
}

function getCompletionRatio(queryTravel, nearest, options) {
  const templateTravel = nearest.reduce(
    (total, entry) => total + entry.templateTravel,
    0,
  ) / nearest.length
  if (templateTravel <= options.staticTravelThreshold) return 1
  return queryTravel / Math.max(templateTravel, 1e-6)
}

function weightedNearestDistance(entries) {
  const weights = [0.65, 0.25, 0.1]
  let weightedTotal = 0
  let totalWeight = 0

  entries.forEach((entry, index) => {
    const weight = weights[index] ?? 0
    weightedTotal += entry.distance * weight
    totalWeight += weight
  })

  return weightedTotal / Math.max(totalWeight, 1e-6)
}

function isValidSequence(sequence) {
  if (!Array.isArray(sequence) || sequence.length === 0) return false
  const vectorLength = sequence[0]?.length
  return Number.isInteger(vectorLength) && vectorLength > 0 && sequence.every(
    (frame) => Array.isArray(frame) && frame.length === vectorLength && frame.every(Number.isFinite),
  )
}

function getPalmCenter(landmarks) {
  const total = PALM_INDICES.reduce(
    (sum, index) => ({ x: sum.x + landmarks[index].x, y: sum.y + landmarks[index].y }),
    { x: 0, y: 0 },
  )
  return { x: total.x / PALM_INDICES.length, y: total.y / PALM_INDICES.length }
}

function vectorRmsDistance(vectorA, vectorB) {
  let sum = 0
  for (let index = 0; index < vectorA.length; index += 1) {
    const difference = vectorA[index] - vectorB[index]
    sum += difference * difference
  }
  return Math.sqrt(sum / vectorA.length)
}

function sequenceFrameDistance(frameA, frameB) {
  const localLength = Math.min(126, frameA.length)
  const localDistance = vectorRmsDistance(frameA.slice(0, localLength), frameB.slice(0, localLength))

  if (frameA.length < 130) return localDistance

  const globalDistance = Math.hypot(frameA[126] - frameB[126], frameA[127] - frameB[127])
  const scaleChange = Math.abs(frameA[128] - frameB[128])
  return Math.max(localDistance, globalDistance * 0.2, scaleChange * 0.15)
}
