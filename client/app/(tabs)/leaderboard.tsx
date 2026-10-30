import { supabase } from "@/lib/supabase";

const { data, error } = await supabase
  .from('sidequest_leaderboard')
  .select('profile_id, rank, sidequests_went_on, profiles(username, name)')
  .order('sidequests_went_on', { ascending: false })
  .limit(10)