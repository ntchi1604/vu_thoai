import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

const WASM_BASE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

let landmarkerPromise

export async function getHandLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = createHandLandmarker()
  }

  return landmarkerPromise
}

async function createHandLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL)

  return HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
    },
    numHands: 2,
    runningMode: 'VIDEO',
  })
}
