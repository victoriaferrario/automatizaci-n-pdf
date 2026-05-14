import { useState } from 'react'
import Mapper from './Mapper'    // rename your current App content to Mapper.jsx
import Filler from './Filler'

function App() {
  const [page, setPage] = useState('filler')

  return (
    <div>
      <nav style={{ padding: '1rem', borderBottom: '1px solid #ccc', display: 'flex', gap: '1rem' }}>
        <button onClick={() => setPage('mapper')}>Template Mapper</button>
        <button onClick={() => setPage('filler')}>PDF Filler</button>
      </nav>
      {page === 'mapper' ? <Mapper /> : <Filler />}
    </div>
  )
}

export default App