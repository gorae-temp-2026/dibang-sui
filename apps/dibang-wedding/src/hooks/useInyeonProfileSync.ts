import { useEffect, useCallback } from 'react'
import { useInyeonProfile } from '../stores/inyeonProfile'
import { useZkLogin } from '../providers/ZkLoginProvider'
import { getSupabaseClient } from '../lib/supabase'

const TABLE = 'v3_inyeon_profiles'

export function useInyeonProfileSync() {
  const { address } = useZkLogin()
  const extraPhotos = useInyeonProfile((s) => s.extraPhotos)
  const bio = useInyeonProfile((s) => s.bio)
  const setFromRemote = useCallback((photos: string[], remoteBio: string) => {
    useInyeonProfile.setState({ extraPhotos: photos, bio: remoteBio })
  }, [])

  useEffect(() => {
    if (!address) return
    const client = getSupabaseClient()
    if (!client) return
    client.from(TABLE).select('extra_photos, bio').eq('sui_address', address).maybeSingle().then(({ data }) => {
      if (data) {
        const photos = Array.isArray(data.extra_photos) ? data.extra_photos as string[] : []
        setFromRemote(photos, (data.bio as string) ?? '')
      }
    })
  }, [address, setFromRemote])

  const save = useCallback(async () => {
    if (!address) return
    const client = getSupabaseClient()
    if (!client) return
    await client.from(TABLE).upsert({
      sui_address: address,
      extra_photos: extraPhotos,
      bio,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'sui_address' })
  }, [address, extraPhotos, bio])

  useEffect(() => {
    if (!address) return
    const timer = setTimeout(() => { void save() }, 1000)
    return () => clearTimeout(timer)
  }, [address, extraPhotos, bio, save])

  return { save }
}

export async function fetchInyeonProfiles(addresses: string[]): Promise<Map<string, { extraPhotos: string[]; bio: string }>> {
  const client = getSupabaseClient()
  if (!client || addresses.length === 0) return new Map()
  const { data } = await client.from(TABLE).select('sui_address, extra_photos, bio').in('sui_address', addresses)
  const map = new Map<string, { extraPhotos: string[]; bio: string }>()
  if (data) {
    for (const row of data) {
      map.set(row.sui_address as string, {
        extraPhotos: Array.isArray(row.extra_photos) ? row.extra_photos as string[] : [],
        bio: (row.bio as string) ?? '',
      })
    }
  }
  return map
}
