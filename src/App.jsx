import { useRef, useState, useEffect } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

// necesitamos un worker file para procesar los PDF en el fondo 

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

function App() {
  const canvasRef = useRef(null)
  const pageRef = useRef(null)
  const [pdfDoc, setPdfDoc] = useState(null)
  const [fields, setFields] = useState([])
  const [pendingClick, setPendingClick] = useState(null)
  const SCALE = 1.5

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise

    setPdfDoc(pdf)
    renderPage(pdf, 1)
  }

  async function renderPage(pdf, pageNumber) {
    const page = await pdf.getPage(pageNumber)
    pageRef.current = page
    const viewport = page.getViewport({ scale: SCALE })

    const canvas = canvasRef.current
    canvas.width = viewport.width
    canvas.height = viewport.height

    await page.render({
      canvasContext: canvas.getContext('2d'),
      viewport,
    }).promise

    drawMarkers(fields)
  }

  function drawMarkers(currentFields, preview = null) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    currentFields.forEach(f => {
      const canvasX = f.x * SCALE
      const canvasY = canvas.height - f.y * SCALE

      ctx.strokeStyle = '#e63946'
      ctx.lineWidth = 2
      ctx.strokeRect(canvasX - 4, canvasY - 12, 120, 18)

      ctx.fillStyle = '#e63946'
      ctx.font = '11px sans-serif'
      ctx.fillText(f.name, canvasX, canvasY)
    })

    if (preview) {
      const canvasX = preview.x * SCALE
      const canvasY = canvas.height - preview.y * SCALE

      ctx.strokeStyle = '#457b9d'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 3])
      ctx.strokeRect(canvasX - 4, canvasY - 12, 120, 18)
      ctx.setLineDash([])
    }
  }

  function handleCanvasClick(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()

    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    const pdfX = clickX / SCALE
    const pdfY = (canvas.height - clickY) / SCALE

    setPendingClick({ x: Math.round(pdfX), y: Math.round(pdfY) })
  }

  function handleCanvasHover(e) {
    if (!pageRef.current) return
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()

    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    const pdfX = clickX / SCALE
    const pdfY = (canvas.height - clickY) / SCALE

    const viewport = pageRef.current.getViewport({ scale: SCALE })
    pageRef.current.render({
      canvasContext: canvas.getContext('2d'),
      viewport,
    }).promise.then(() => drawMarkers(fields, { x: Math.round(pdfX), y: Math.round(pdfY) }))
  }

  useEffect(() => {
  if (!pageRef.current) return

  const canvas = canvasRef.current
  const viewport = pageRef.current.getViewport({ scale: SCALE })

  pageRef.current.render({
    canvasContext: canvas.getContext('2d'),
    viewport,
  }).promise.then(() => drawMarkers(fields))
  }, [fields])
    
  return (
    <div>
      <h1>PDF Mapper</h1>
      <input type="file" accept=".pdf" onChange={handleFileUpload} />
      <br />

      <canvas
        ref={canvasRef}
        style={{ border: '1px solid black', marginTop: '1rem', cursor: 'crosshair' }}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasHover}
      />

      {pendingClick && (
        <div style={{ marginTop: '1rem' }}>
          <p>Clicked at: x={pendingClick.x}, y={pendingClick.y}</p>
          <input
            type="text"
            placeholder="Field name (e.g. nombre)"
            id="fieldNameInput"
          />
          <button onClick={() => {
            const name = document.getElementById('fieldNameInput').value.trim()
            if (!name) return
            setFields(prev => [...prev, { name, x: pendingClick.x, y: pendingClick.y }])
            setPendingClick(null)
          }}>
            Save field
          </button>
          <button onClick={() => setPendingClick(null)}>Cancel</button>
        </div>
      )}

      {fields.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h2>Mapped fields</h2>
          <ul>
            {fields.map((f, i) => (
              <li key={i}>{f.name} — x: {f.x}, y: {f.y}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )

}

export default App