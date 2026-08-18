const EPSILON = 1e-6
const PALM_INDICES = [0, 5, 9, 13, 17]

export function normalizeLandmarks(landmarks, handedness = '') {
  if (!Array.isArray(landmarks) || landmarks.length !== 21) {
    return {
      landmarks: [],
      scale: 1,
      vector: [],
    }
  }

  const wrist = landmarks[0]
  const shouldMirror = isLeftHand(handedness)
  const scale = getPalmScale(landmarks)

  const normalized = landmarks.map((point) => ({
    x: ((point.x - wrist.x) / scale) * (shouldMirror ? -1 : 1),
    y: (point.y - wrist.y) / scale,
    z: ((point.z ?? 0) - (wrist.z ?? 0)) / scale,
  }))

  return {
    landmarks: normalized,
    scale,
    vector: normalized.flatMap((point) => [point.x, point.y, point.z]),
  }
}

export function getPalmScale(landmarks) {
  if (!Array.isArray(landmarks) || landmarks.length !== 21) {
    return 1
  }

  const wrist = landmarks[0]
  const palmDistances = PALM_INDICES.slice(1).map((index) => euclideanDistance3d(wrist, landmarks[index]))
  const averagePalmDistance =
    palmDistances.reduce((total, value) => total + value, 0) / Math.max(1, palmDistances.length)
  const bbox = getBoundingBox(landmarks)
  const bboxDiagonal = Math.hypot(bbox.width, bbox.height)

  return Math.max(averagePalmDistance, bboxDiagonal * 0.35, EPSILON)
}

export function getBoundingBox(landmarks) {
  if (!Array.isArray(landmarks) || landmarks.length === 0) {
    return {
      area: 0,
      height: 0,
      width: 0,
    }
  }

  const xs = landmarks.map((point) => point.x)
  const ys = landmarks.map((point) => point.y)
  const width = Math.max(...xs) - Math.min(...xs)
  const height = Math.max(...ys) - Math.min(...ys)

  return {
    area: width * height,
    height,
    width,
  }
}

export function selectPrimaryHand(landmarksList, gestureScores) {
  if (!Array.isArray(landmarksList) || landmarksList.length === 0) {
    return -1
  }

  if (Array.isArray(gestureScores) && gestureScores.length === landmarksList.length) {
    return landmarksList.reduce((bestIndex, landmarks, index) => {
      if (bestIndex === -1) {
        return index
      }

      const score = gestureScores[index] ?? 0
      const bestScore = gestureScores[bestIndex] ?? 0

      if (score !== bestScore) {
        return score > bestScore ? index : bestIndex
      }

      return getBoundingBox(landmarks).area > getBoundingBox(landmarksList[bestIndex]).area ? index : bestIndex
    }, -1)
  }

  return landmarksList.reduce((bestIndex, landmarks, index) => {
    if (bestIndex === -1) {
      return index
    }

    return getBoundingBox(landmarks).area > getBoundingBox(landmarksList[bestIndex]).area ? index : bestIndex
  }, -1)
}

function isLeftHand(handedness) {
  return String(handedness).toLowerCase().includes('left')
}

function euclideanDistance3d(pointA, pointB) {
  const dz = (pointA.z ?? 0) - (pointB.z ?? 0)
  return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y, dz)
}
