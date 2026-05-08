import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Cache đơn giản để không re-fetch mỗi lần render
let _cache = null
let _fetchedAt = 0
const CACHE_TTL = 30_000 // 30 giây

export function useCMS() {
  const [cms, setCms] = useState(_cache || {})
  const [ready, setReady] = useState(!!_cache)

  useEffect(() => {
    const now = Date.now()
    if (_cache && now - _fetchedAt < CACHE_TTL) {
      setCms(_cache)
      setReady(true)
      return
    }
    supabase.from('homepage_config').select('key, value')
      .then(({ data, error }) => {
        if (error || !data) return
        const map = {}
        data.forEach(row => { map[row.key] = row.value })
        _cache = map
        _fetchedAt = Date.now()
        setCms(map)
        setReady(true)
      })
  }, [])

  return { cms, ready }
}
