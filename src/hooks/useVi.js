import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useVi() {
  const [viList,  setViList]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('vi').select('*').order('thu_tu')
        if (error) throw error
        setViList(data || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { viList, loading, error }
}
