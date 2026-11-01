import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// サーバー側API専用。RLSをバイパスするため、クライアント（ブラウザ）には絶対に渡さないこと。
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
