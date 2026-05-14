import { useState } from 'react'
import * as XLSX from 'xlsx'

function Filler() {
  const [rows, setRows] = useState([])         // parsed Excel rows
  const [headers, setHeaders] = useState([])   // column names
  const [template, setTemplate] = useState(null)     // the blank PDF file
  const [fieldMap, setFieldMap] = useState(null)     // the field-map.json file
  const [loading, setLoading] = useState(null)       // which row is generating

  // ── Parse Excel ──────────────────────────────────────────────────────────────

  function handleExcelUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const workbook = XLSX.read(evt.target.result, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(sheet, { defval: '' })
      setHeaders(Object.keys(data[0] || {}))
      setRows(data)
    }
    reader.readAsArrayBuffer(file)
  }

  // ── Load template PDF ────────────────────────────────────────────────────────

  function handleTemplateUpload(e) {
    setTemplate(e.target.files[0])
  }

  // ── Load field map JSON ──────────────────────────────────────────────────────

  function handleFieldMapUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => setFieldMap(JSON.parse(evt.target.result))
    reader.readAsText(file)
  }

  // ── Generate filled PDF for one row ─────────────────────────────────────────

  async function generatePDF(row, index) {
    if (!template || !fieldMap) {
      alert('Please upload a template PDF and field map first.')
      return
    }

    setLoading(index)

    const formData = new FormData()
    formData.append('template', template)
    formData.append('field_map', JSON.stringify(fieldMap))
    formData.append('row_data', JSON.stringify(row))

    try {
      const response = await fetch('http://localhost:8000/fill-pdf', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('API error')

      // Turn the response into a downloadable file
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `filled_row_${index + 1}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Something went wrong generating the PDF.')
      console.error(err)
    } finally {
      setLoading(null)
    }
  }

  // ── UI ───────────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '2rem' }}>
      <h1>PDF Filler</h1>

      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div>
          <p><strong>1. Blank PDF template</strong></p>
          <input type="file" accept=".pdf" onChange={handleTemplateUpload} />
          {template && <p style={{ color: 'green' }}>✓ {template.name}</p>}
        </div>

        <div>
          <p><strong>2. Field map JSON</strong></p>
          <input type="file" accept=".json" onChange={handleFieldMapUpload} />
          {fieldMap && <p style={{ color: 'green' }}>✓ {fieldMap.length} fields loaded</p>}
        </div>

        <div>
          <p><strong>3. Excel file with responses</strong></p>
          <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} />
          {rows.length > 0 && <p style={{ color: 'green' }}>✓ {rows.length} rows loaded</p>}
        </div>
      </div>

      {rows.length > 0 && (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={th}>#</th>
              {headers.map(h => <th key={h} style={th}>{h}</th>)}
              <th style={th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td style={td}>{i + 1}</td>
                {headers.map(h => <td key={h} style={td}>{row[h]}</td>)}
                <td style={td}>
                  <button
                    onClick={() => generatePDF(row, i)}
                    disabled={loading === i}
                  >
                    {loading === i ? 'Generating...' : 'Download PDF'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const th = { border: '1px solid #ccc', padding: '8px', background: '#f5f5f5', textAlign: 'left' }
const td = { border: '1px solid #ccc', padding: '8px' }

export default Filler