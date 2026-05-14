import { useRef, useState, useEffect } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

function Mapper() {
  const canvasRef = useRef(null) // PDF que no lo toca el render
  const overlayRef = useRef(null) // capa superior para los marcos 
  const pageRef = useRef(null)

  // El corrimiento lo guardo en refs para no volver a renderizar cada vez 
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const curX = useRef(0)
  const curY = useRef(0)
  const animFrameRef = useRef(null)

  const [fields, setFields] = useState([])
  const [pendingRect, setPendingRect] = useState(null) // esperando para un nombre de campo
  const SCALE = 1.5

  // guardamos referencia del fields para evitar cierres de entorno (stale clousures)
  const fieldsRef = useRef([])
  useEffect(() => {
    fieldsRef.current = fields
    drawOverlay()
  }, [fields])

  // ── Cargando PDF ──────────────────────────────────────────────────────────────
  // renderiza el PDF en la capa inferior nada más 

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const page = await pdf.getPage(1)
    pageRef.current = page
    await renderPage()
  }

  async function renderPage() {
    const page = pageRef.current
    if (!page) return
    const viewport = page.getViewport({ scale: SCALE })
    const canvas = canvasRef.current
    const overlay = overlayRef.current

    // Ambos canvas identicamente escaladas 
    canvas.width = viewport.width
    canvas.height = viewport.height
    overlay.width = viewport.width
    overlay.height = viewport.height

    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    drawOverlay()
  }

  // ── Ayuda a Escribir en el Overlay ───────────────────────────────────────────────────────────

  // Solo vuelve a dibujar los campos seleccionados
  // Llama despues de que el PDF renderize para que los marcadores esten por encima 
  function drawOverlay(dragRect = null) {
    const overlay = overlayRef.current
    if (!overlay) return
    const ctx = overlay.getContext('2d')

    //limpio el overlay completo 
    ctx.clearRect(0, 0, overlay.width, overlay.height)

    //Dibujo todos los campos guardados
    fieldsRef.current.forEach(f => {
      ctx.strokeStyle = '#e63946'
      ctx.lineWidth = 2
      ctx.setLineDash([])
      ctx.strokeRect(f.canvasX, f.canvasY, f.canvasW, f.canvasH)
      ctx.fillStyle = '#e63946'
      ctx.font = 'bold 11px sans-serif'
      ctx.fillText(f.name, f.canvasX + 3, f.canvasY + 13)
    })

    // pre-vista del rectángulo
    if (dragRect) {
      ctx.strokeStyle = '#457b9d'
      ctx.lineWidth = 1.5
      ctx.setLineDash([5, 4])
      ctx.strokeRect(dragRect.x, dragRect.y, dragRect.w, dragRect.h)
      ctx.setLineDash([])
    }
  }

  // -- solo actualiza el overlay, la canvas con el PDF no se toca --- 

  function updateCanvas() {
    if (!isDragging.current) return
    const x = Math.min(startX.current, curX.current)
    const y = Math.min(startY.current, curY.current)
    const w = Math.abs(curX.current - startX.current)
    const h = Math.abs(curY.current - startY.current)
    drawOverlay({ x, y, w, h })
    animFrameRef.current = requestAnimationFrame(updateCanvas)
  }

  // ── Eventos del Mouse ──────────────────────────────────────────────────────────────

  function onMouseDown(e) {
    if (!pageRef.current) return
    isDragging.current = true
    startX.current = e.nativeEvent.offsetX
    startY.current = e.nativeEvent.offsetY
    curX.current = e.nativeEvent.offsetX
    curY.current = e.nativeEvent.offsetY
    animFrameRef.current = requestAnimationFrame(updateCanvas)
  }

  function onMouseMove(e) {
    if (!isDragging.current) return
    curX.current = e.nativeEvent.offsetX
    curY.current = e.nativeEvent.offsetY
  }

  function onMouseUp(e) {
    if (!isDragging.current) return
    isDragging.current = false
    cancelAnimationFrame(animFrameRef.current)

    // Construyo el rectangulo final 
    const canvasX = Math.min(startX.current, e.nativeEvent.offsetX)
    const canvasY = Math.min(startY.current, e.nativeEvent.offsetY)
    const canvasW = Math.abs(e.nativeEvent.offsetX - startX.current)
    const canvasH = Math.abs(e.nativeEvent.offsetY - startY.current)

    // ignoro los accidentes pequeños con el cursor 
    if (canvasW < 5 || canvasH < 5) {
      drawOverlay()
      return
    }

    // converto lo seleccionado a algo rellenable en el PDF!!!!
    const pdfX = canvasX / SCALE
    const pdfY = (canvasRef.current.height - (canvasY + canvasH)) / SCALE

    setPendingRect({ canvasX, canvasY, canvasW, canvasH, pdfX, pdfY })
  }

  // ── Guardo el campo una vez que selecciona el nombre  ───────────────────────────────────────

  function saveField(name) {
    if (!name.trim() || !pendingRect) return
    setFields(prev => [...prev, { name: name.trim(), ...pendingRect }])
    setPendingRect(null)
  }

  function cancelPending() {
    setPendingRect(null)
    drawOverlay() // clear the pending rect from overlay
  }

// exportamos a JSON
  function exportJSON() {
  const config = fields.map(f => ({
    name: f.name,
    pdfX: Math.round(f.pdfX),
    pdfY: Math.round(f.pdfY),
    pdfW: Math.round(f.canvasW / SCALE),
    pdfH: Math.round(f.canvasH / SCALE),
  }))

  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'field-map.json'
  a.click()
  URL.revokeObjectURL(url)
  }


  // ── UI ────────────────────────────────────────────────────────────────────────

  return (
    <div>
      <h1>PDF Mapper</h1>
      <input type="file" accept=".pdf" onChange={handleFileUpload} />
      <br />

      {/* puse ambas canvas una encima de la otra */}
      <div style={{ position: 'relative', display: 'inline-block', marginTop: '1rem' }}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', border: '1px solid black' }}
        />
        <canvas
          ref={overlayRef}
          style={{ position: 'absolute', top: 0, left: 0, cursor: 'crosshair' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
        />
      </div>

      {pendingRect && (
        <div style={{ marginTop: '1rem' }}>
          <p>Selected area — give it a name:</p>
          <input
            autoFocus
            type="text"
            placeholder="e.g. nombre"
            id="fieldNameInput"
          />
          <button onClick={() => saveField(document.getElementById('fieldNameInput').value)}>
            Save field
          </button>
          <button onClick={() => { setPendingRect(null); renderPage() }}>
            Cancel
          </button>
        </div>
      )}

      {fields.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h2>Mapped fields</h2>
          <ul>
            {fields.map((f, i) => (
              <li key={i}>{f.name} — pdf x: {Math.round(f.pdfX)}, pdf y: {Math.round(f.pdfY)}</li>
            ))}
          </ul>
          <button onClick={exportJSON}>Export JSON</button>
        </div>
      )}
    </div>
  )
}

export default Mapper