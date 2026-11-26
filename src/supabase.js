import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bpvvgiptldpbvzlqxfck.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_em7sKXJpRDv_tqmqUElaPA_L-qc4mc0'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Loads one profile's saved state from the database.
export async function fetchProfileState(profileId) {
  const [list, ratings, progress] = await Promise.all([
    supabase.from('list_items').select('film_id').eq('profile_id', profileId),
    supabase.from('ratings').select('film_id, rating').eq('profile_id', profileId),
    supabase.from('watch_progress').select('item_key, position_seconds, duration_seconds').eq('profile_id', profileId),
  ])
  const err = list.error || ratings.error || progress.error
  if (err) throw err
  return {
    myList: list.data.map((r) => r.film_id),
    ratings: Object.fromEntries(ratings.data.map((r) => [r.film_id, r.rating])),
    progress: Object.fromEntries(progress.data.map((r) => [r.item_key, { t: r.position_seconds, d: r.duration_seconds }])),
  }
}
