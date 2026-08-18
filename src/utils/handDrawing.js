const HAND_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
]

export function clearHandCanvas(canvas) {
  const context = canvas?.getContext('2d')
  if (!canvas || !context) {
    return
  }

  context.clearRect(0, 0, canvas.width, canvas.height)
}

export function drawHandLandmarks(canvas, hands) {
  const context = canvas?.getContext('2d')
  if (!canvas || !context) {
    return
  }

  context.clearRect(0, 0, canvas.width, canvas.height)

  hands.forEach((landmarks) => {
    drawConnections(context, canvas, landmarks)
    drawPoints(context, canvas, landmarks)
  })
}

function drawConnections(context, canvas, landmarks) {
  context.save()
  context.lineWidth = Math.max(3, canvas.width * 0.004)
  context.lineCap = 'round'
  context.strokeStyle = '#38bdf8'

  HAND_CONNECTIONS.forEach(([startIndex, endIndex]) => {
    const start = landmarks[startIndex]
    const end = landmarks[endIndex]

    context.beginPath()
    context.moveTo(start.x * canvas.width, start.y * canvas.height)
    context.lineTo(end.x * canvas.width, end.y * canvas.height)
    context.stroke()
  })

  context.restore()
}

function drawPoints(context, canvas, landmarks) {
  context.save()
  context.fillStyle = '#facc15'
  context.strokeStyle = '#0f172a'
  context.lineWidth = Math.max(2, canvas.width * 0.002)

  landmarks.forEach((point) => {
    const radius = Math.max(4, canvas.width * 0.006)
    const x = point.x * canvas.width
    const y = point.y * canvas.height

    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
    context.stroke()
  })

  context.restore()
}
