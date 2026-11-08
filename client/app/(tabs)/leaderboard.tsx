import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { FlatList, Text, View } from 'react-native'

type LeaderboardRow = {
  profile_id: string
  rank: number
  sidequests_went_on: number
  username?: string | null
  name?: string | null
}

export default function LeaderboardScreen() {
  const [rows, setRows] = useState<LeaderboardRow[]>([])

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('sidequest_leaderboard')
        .select('*')
        .order('sidequests_went_on', { ascending: false })
        .limit(10)

      if (!error) {
        setRows((data ?? []) as LeaderboardRow[])
      }
    }

    load()
  }, [])

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 12 }}>Leaderboard</Text>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.profile_id}
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
            <Text>#{item.rank}</Text>
            <Text>{item.username ?? item.name ?? 'Unknown user'}</Text>
            <Text>{item.sidequests_went_on}</Text>
          </View>
        )}
      />
    </View>
  )
}