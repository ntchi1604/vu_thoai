import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  calculateSequenceTravel,
  classifyTwoHandSequence,
  dynamicTimeWarpingDistance,
  gestureFrameVisualMotionDistance,
  normalizeGestureFrame,
  normalizeTwoHandFrame,
  normalizeSequenceTrajectory,
  twoHandFrameMotionDistance,
  TwoHandSequenceRecognizer,
} from './twoHandSequenceClassifier.js'

const TEST_CONFIG = {
  classificationIntervalMs: 0,
  confirmationCount: 2,
  maxDistance: 0.62,
  minDurationMs: 300,
  minFrames: 6,
  minMargin: 0.02,
  minTemplatesPerLabel: 2,
  targetFrames: 20,
}

test('two-hand frame normalization is invariant to translation and scale', () => {
  const original = normalizeTwoHandFrame(makeHandPair(0.5, 0.5, 0.08))
  const transformed = normalizeTwoHandFrame(makeHandPair(0.3, 0.7, 0.14))

  assert.equal(original.length, 130)
  assert.ok(vectorRms(original.slice(0, 126), transformed.slice(0, 126)) < 1e-10)
})

test('one-hand frame uses the shared sequence format', () => {
  const frame = normalizeGestureFrame([makeHand(0.5, 0.5, 0.08)])

  assert.equal(frame.length, 130)
  assert.deepEqual(frame.slice(63, 126), new Array(63).fill(0))
})

test('setup stability ignores depth-only landmark jitter', () => {
  const original = normalizeGestureFrame([makeHand(0.5, 0.5, 0.08)])
  const depthJitter = original.map((value, index) => (
    index < 126 && index % 3 === 2 ? value + 0.25 : value
  ))

  assert.equal(gestureFrameVisualMotionDistance(original, depthJitter), 0)
  assert.ok(twoHandFrameMotionDistance(original, depthJitter) > 0.1)
})

test('sequence trajectory keeps shared two-hand movement and normalizes its scale', () => {
  const small = normalizeSequenceTrajectory([
    normalizeTwoHandFrame(makeHandPair(0.5, 0.5, 0.08)),
    normalizeTwoHandFrame(makeHandPair(0.54, 0.5, 0.08)),
  ])
  const large = normalizeSequenceTrajectory([
    normalizeTwoHandFrame(makeHandPair(0.3, 0.7, 0.14)),
    normalizeTwoHandFrame(makeHandPair(0.37, 0.7, 0.14)),
  ])

  assert.ok(Math.abs(small[1][126] - large[1][126]) < 1e-10)
  assert.ok(twoHandFrameMotionDistance(small[0], small[1]) > 0.012)
})

test('DTW matches the same gesture performed at a different speed', () => {
  const fast = makeMotionSequence('x', 14, 0)
  const slow = makeMotionSequence('x', 25, 0.03)
  const different = makeMotionSequence('y', 25, 0)

  assert.ok(dynamicTimeWarpingDistance(fast, slow) < dynamicTimeWarpingDistance(fast, different))
})

test('does not accept a held opening movement as a completed gesture', () => {
  const templates = [
    makeTemplate('HORIZONTAL', 'Chuyển động ngang.', 'x', 0),
    makeTemplate('HORIZONTAL', 'Chuyển động ngang.', 'x', 0.02),
  ]
  const fullSequence = makeMotionSequence('x', 18, 0.01)
  const opening = fullSequence.slice(0, 6)
  const heldOpening = [
    ...opening,
    ...Array.from({ length: 8 }, () => [...opening.at(-1)]),
  ]

  const result = classifyTwoHandSequence(heldOpening, templates, TEST_CONFIG)

  assert.equal(result.gesture, 'UNKNOWN')
  assert.ok(result.completion < 0.68)
  assert.ok(calculateSequenceTravel(heldOpening) < calculateSequenceTravel(fullSequence))
})

test('classifies multiple two-hand labels from sequence templates', () => {
  const templates = [
    makeTemplate('HORIZONTAL', 'Chuyển động ngang.', 'x', 0),
    makeTemplate('HORIZONTAL', 'Chuyển động ngang.', 'x', 0.03),
    makeTemplate('HANDS_UP_DOWN', 'Hai tay di chuyển lên xuống.', 'y', 0),
    makeTemplate('HANDS_UP_DOWN', 'Hai tay di chuyển lên xuống.', 'y', -0.03),
  ]

  const result = classifyTwoHandSequence(makeMotionSequence('y', 18, 0.015), templates, TEST_CONFIG)

  assert.equal(result.gesture, 'HANDS_UP_DOWN')
  assert.equal(result.phrase, 'Hai tay di chuyển lên xuống.')
  assert.ok(result.confidence > 0.5)
})

test('recognizes learned one-hand motion and static poses', () => {
  const movingFrames = makeOneHandMotionSequence(16)
  const staticFrame = normalizeGestureFrame([makeHand(0.5, 0.5, 0.08)])
  const templates = [
    { frames: movingFrames, handCount: 1, id: 'wave-1', label: 'WAVE', phrase: 'Xin chào.' },
    { frames: makeOneHandMotionSequence(18, 0.02), handCount: 1, id: 'wave-2', label: 'WAVE', phrase: 'Xin chào.' },
    { frames: Array.from({ length: 16 }, () => staticFrame), handCount: 1, id: 'still-1', label: 'STILL', phrase: 'Đứng yên.' },
    { frames: Array.from({ length: 18 }, () => staticFrame), handCount: 1, id: 'still-2', label: 'STILL', phrase: 'Đứng yên.' },
  ]

  const movingResult = classifyTwoHandSequence(makeOneHandMotionSequence(20, 0.01), templates.slice(0, 2), TEST_CONFIG)
  const staticResult = classifyTwoHandSequence(
    Array.from({ length: 14 }, () => staticFrame),
    templates.slice(2),
    TEST_CONFIG,
  )

  assert.equal(movingResult.gesture, 'WAVE')
  assert.equal(staticResult.gesture, 'STILL')
})

test('held static gesture emits once until recognition is explicitly rearmed', () => {
  const staticFrame = normalizeGestureFrame([makeHand(0.5, 0.5, 0.08)])
  const templates = [
    {
      frames: Array.from({ length: 16 }, () => staticFrame),
      handCount: 1,
      id: 'still-1',
      label: 'STILL',
      phrase: 'Äá»©ng yÃªn.',
    },
    {
      frames: Array.from({ length: 18 }, () => staticFrame),
      handCount: 1,
      id: 'still-2',
      label: 'STILL',
      phrase: 'Äá»©ng yÃªn.',
    },
  ]
  const recognizer = new TwoHandSequenceRecognizer({
    ...TEST_CONFIG,
    latchMaxMs: 400,
    staticStartHoldMs: 400,
  })

  let emissions = 0
  for (let index = 0; index < 70; index += 1) {
    if (recognizer.update(staticFrame, index * 80, templates, 1).shouldEmit) emissions += 1
  }

  assert.equal(emissions, 1)

  recognizer.rearm()
  for (let index = 0; index < 14; index += 1) {
    if (recognizer.update(staticFrame, 6000 + index * 80, templates, 1).shouldEmit) emissions += 1
  }

  assert.equal(emissions, 2)
})

test('sequence recognizer emits once and blocks a held learned gesture', () => {
  const templates = [
    makeTemplate('HORIZONTAL', 'Chuyển động ngang.', 'x', 0),
    makeTemplate('HORIZONTAL', 'Chuyển động ngang.', 'x', 0.02),
  ]
  const recognizer = new TwoHandSequenceRecognizer(TEST_CONFIG)
  const sequence = makeMotionSequence('x', 18, 0.01)
  let emitted = false
  let emittedAt = -1
  let state

  sequence.forEach((frame, index) => {
    state = recognizer.update(frame, index * 80, templates)
    emitted ||= state.shouldEmit
    if (state.shouldEmit && emittedAt === -1) emittedAt = index
  })

  assert.equal(emitted, true)
  assert.ok(emittedAt < sequence.length - 1)
  assert.equal(state.shouldEmit, false)
  assert.equal(recognizer.update(sequence.at(-1), 1600, templates).shouldEmit, false)
})

test('sequence recognizer rearms after motion ends while both hands remain visible', () => {
  const templates = [
    makeTemplate('HORIZONTAL', 'Chuyển động ngang.', 'x', 0),
    makeTemplate('HORIZONTAL', 'Chuyển động ngang.', 'x', 0.02),
  ]
  const recognizer = new TwoHandSequenceRecognizer(TEST_CONFIG)
  const sequence = makeMotionSequence('x', 18, 0.01)
  let firstEmissions = 0

  sequence.forEach((frame, index) => {
    if (recognizer.update(frame, index * 80, templates).shouldEmit) firstEmissions += 1
  })

  const heldFrame = sequence.at(-1)
  recognizer.update(heldFrame, 1500, templates)
  const released = recognizer.update(heldFrame, 1700, templates)

  assert.equal(firstEmissions, 1)
  assert.equal(released.isActive, false)

  let secondEmissions = 0
  sequence.forEach((frame, index) => {
    if (recognizer.update(frame, 1800 + index * 80, templates).shouldEmit) secondEmissions += 1
  })

  assert.equal(secondEmissions, 1)
})

test('recognizes a different next gesture without hands leaving the camera', () => {
  const templates = [
    makeTemplate('HORIZONTAL', 'Ngang.', 'x', 0),
    makeTemplate('HORIZONTAL', 'Ngang.', 'x', 0.02),
    makeTemplate('VERTICAL', 'Dọc.', 'y', 0),
    makeTemplate('VERTICAL', 'Dọc.', 'y', 0.02),
  ]
  const recognizer = new TwoHandSequenceRecognizer({
    ...TEST_CONFIG,
    latchMaxMs: 10000,
    motionEndHoldMs: 10000,
  })
  const emitted = []

  makeMotionSequence('x', 18, 0.01).forEach((frame, index) => {
    const state = recognizer.update(frame, index * 80, templates, 2)
    if (state.shouldEmit) emitted.push(state.gesture)
  })
  makeMotionSequence('y', 24, 0.01).forEach((frame, index) => {
    const state = recognizer.update(frame, 1500 + index * 80, templates, 2)
    if (state.shouldEmit) emitted.push(state.gesture)
  })

  assert.deepEqual(emitted, ['HORIZONTAL', 'VERTICAL'])
})

function makeTemplate(label, phrase, axis, phase) {
  return {
    frames: makeMotionSequence(axis, 16, phase),
    id: `${label}-${phase}`,
    label,
    phrase,
  }
}

function makeMotionSequence(axis, frameCount, phase) {
  const coordinateOffset = axis === 'x' ? 0 : 1
  return Array.from({ length: frameCount }, (_, frameIndex) => {
    const progress = frameIndex / Math.max(1, frameCount - 1)
    const movement = Math.sin((progress + phase) * Math.PI * 2) * 0.8
    const frame = new Array(126).fill(0)

    for (let handIndex = 0; handIndex < 2; handIndex += 1) {
      for (let pointIndex = 0; pointIndex < 21; pointIndex += 1) {
        const vectorIndex = handIndex * 63 + pointIndex * 3 + coordinateOffset
        frame[vectorIndex] = movement * (handIndex === 0 ? -1 : 1)
      }
    }

    return frame
  })
}

function makeOneHandMotionSequence(frameCount, phase = 0) {
  return Array.from({ length: frameCount }, (_, index) => {
    const progress = index / Math.max(1, frameCount - 1)
    const offset = Math.sin((progress + phase) * Math.PI * 2) * 0.08
    return normalizeGestureFrame([makeHand(0.5 + offset, 0.5, 0.08)])
  })
}

function makeHandPair(centerX, centerY, scale) {
  return [makeHand(centerX - scale * 0.4, centerY, scale), makeHand(centerX + scale * 0.4, centerY, scale)]
}

function makeHand(centerX, centerY, scale) {
  return Array.from({ length: 21 }, (_, index) => ({
    x: centerX + ((index % 5) - 2) * scale * 0.18,
    y: centerY + (Math.floor(index / 5) - 2) * scale * 0.2,
    z: (index % 3) * scale * 0.04,
  }))
}

function vectorRms(vectorA, vectorB) {
  const sum = vectorA.reduce((total, value, index) => total + (value - vectorB[index]) ** 2, 0)
  return Math.sqrt(sum / vectorA.length)
}
