import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

function App() {
  const [viList, setViList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadVi() {
      const { data, error } = await supabase
        .from('vi')
        .select('*')
        .order('thu_tu')
      
      if (error) {
        console.error('Lỗi:', error)
      } else {
        setViList(data)
      }
      setLoading(false)
    }
    loadVi()
  }, [])

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>🌸 HSMS — Hannah Spa</h1>
      <h2>Test Kết Nối Supabase</h2>
      {loading ? (
        <p>Đang tải...</p>
      ) : viList.length === 0 ? (
        <p style={{ color: 'red' }}>❌ Không load được data</p>
      ) : (
        <ul>
          {viList.map(vi => (
            <li key={vi.id}>
              {vi.icon} {vi.ten}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default App