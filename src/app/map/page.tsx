'use client'

import { useEffect, useRef, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { isWithinDays, extractPrefecture, calcRiskLevel, RISK_LEVEL_STYLE, PREFECTURES, getPrefectureCoords } from '@/lib/prefectures'
import { getMyAreas, matchesMyAreas } from '@/lib/myAreas'
import { buildReportText } from '@/lib/reportText'
import Bear from '@/components/kuma/Bear'
import PostSuccessShare from '@/components/kuma/PostSuccessShare'

type BearSighting = {
  id: number
  lat: number
  lng: number
  photo_url: string | null
  description: string | null
  ai_size_estimate: string | null
  ai_individual_id: string | null
  ai_species_confidence: number | null
  status: string
  urgent: boolean
  report_count: number
  area: string | null
  prefecture: string | null
  source: string
  sighted_at: string
  created_at: string
}

type IndividualMatch = {
  id: number
  sighting_id: number
  matched_sighting_id: number
  confidence: 'high' | 'medium'
  reason: string | null
}

function trustScore(count: number): { stars: number; label: string; color: string } {
  if (count >= 5) return { stars: 3, label: '高信頼', color: '#10B981' }
  if (count >= 3) return { stars: 2, label: '複数確認', color: '#F5A524' }
  if (count >= 2) return { stars: 1, label: '確認あり', color: '#6B7A98' }
  return { stars: 0, label: '未確認', color: '#4B5563' }
}

type FilterKey = '全て' | '緊急' | '目撃情報' | '対応中' | '完了'
type TimeRangeKey = '全期間' | '24時間' | '7日間' | '30日間' | 'リアルタイム'

const TIME_RANGE_DAYS: Record<Exclude<TimeRangeKey, '全期間' | 'リアルタイム'>, number> = {
  '24時間': 1,
  '7日間': 7,
  '30日間': 30,
}

const REALTIME_WINDOW_DAYS = 3 / 24 // 「リアルタイム」タブは直近3時間以内の目撃のみ表示する

const STATUS_CONFIG: Record<string, { emoji: string; color: string }> = {
  '目撃情報': { emoji: '🐻', color: '#D97706' },
  '対応中': { emoji: '🚨', color: '#3B82F6' },
  '確保済み': { emoji: '✅', color: '#10B981' },
  '駆除済み': { emoji: '⚪', color: '#6B7280' },
}

const FILTERS: { key: FilterKey; label: string; icon: string; color: string }[] = [
  { key: '全て', label: '全て', icon: '🐻', color: '#6B7A98' },
  { key: '緊急', label: '緊急', icon: '🆘', color: '#EF4444' },
  { key: '目撃情報', label: '目撃情報', icon: '🐻', color: '#D97706' },
  { key: '対応中', label: '対応中', icon: '🚨', color: '#3B82F6' },
  { key: '完了', label: '確保・駆除済み', icon: '✅', color: '#10B981' },
]

const TIME_RANGES: Exclude<TimeRangeKey, 'リアルタイム'>[] = ['全期間', '24時間', '7日間', '30日間']

// フィルター（ステータス・期間・自分のエリアのみ）の判定を一箇所に集約する。
// addMarkersToMap・filteredSightings・リアルタイム反映の3箇所で同じ基準を使うため。
function passesSightingFilters(
  s: BearSighting,
  filterKey: FilterKey,
  rangeKey: TimeRangeKey,
  onlyMine: boolean,
  myAreasList: string[],
): boolean {
  if (filterKey === '緊急' && !s.urgent) return false
  if (filterKey === '目撃情報' && s.status !== '目撃情報') return false
  if (filterKey === '対応中' && s.status !== '対応中') return false
  if (filterKey === '完了' && !(s.status === '確保済み' || s.status === '駆除済み')) return false
  if (rangeKey === 'リアルタイム') {
    if (!isWithinDays(s.sighted_at, REALTIME_WINDOW_DAYS)) return false
  } else if (rangeKey !== '全期間' && !isWithinDays(s.sighted_at, TIME_RANGE_DAYS[rangeKey])) return false
  if (onlyMine && !matchesMyAreas(s.area, myAreasList)) return false
  return true
}

// 「24時間」はおすすめのデフォルト表示として他の期間タブより目立たせる
function timeRangeButtonClass(key: TimeRangeKey, active: boolean): string {
  if (key === '24時間') {
    return active
      ? 'bg-kuma-primary text-kuma-primary-text border-kuma-primary font-bold'
      : 'bg-kuma-primary/10 text-kuma-primary border-kuma-primary/60 hover:bg-kuma-primary/20 font-bold'
  }
  return active
    ? 'bg-kuma-primary text-kuma-primary-text border-kuma-primary font-bold'
    : 'bg-kuma-field text-kuma-sub border-kuma-line hover:text-kuma-ink'
}

function MapPageInner() {
  const searchParams = useSearchParams()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)

  const [sightings, setSightings] = useState<BearSighting[]>([])
  const [selected, setSelected] = useState<BearSighting | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [shareText, setShareText] = useState('')
  const [clickPos, setClickPos] = useState<{ lat: number; lng: number } | null>(null)
  const [form, setForm] = useState({ description: '', area: '', urgent: false })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterKey>('全て')
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('24時間')
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [showList, setShowList] = useState(false)
  const [noGeoMode, setNoGeoMode] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ area: '', description: '', urgent: false })
  const [copySuccess, setCopySuccess] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportCopied, setReportCopied] = useState(false)
  const [showSOS, setShowSOS] = useState(false)
  const [sosLocation, setSosLocation] = useState<{ lat: number; lng: number; address: string } | null>(null)
  const [sosGetting, setSosGetting] = useState(false)
  const [sosSending, setSosSending] = useState(false)
  const [sosSent, setSosSent] = useState(false)
  const [sosContact, setSosContact] = useState<string | null>(null)
  const [myPostToken, setMyPostToken] = useState<string | null>(null)
  const [confirmedThisSighting, setConfirmedThisSighting] = useState(false)
  const [relatedMatches, setRelatedMatches] = useState<IndividualMatch[]>([])
  const [watcherCount, setWatcherCount] = useState(0)
  const [myAreas, setMyAreas] = useState<string[]>([])
  const [onlyMyAreas, setOnlyMyAreas] = useState(false)
  const [postReportText, setPostReportText] = useState('')
  const [postPrefecture, setPostPrefecture] = useState<string | null>(null)
  const [postSightingId, setPostSightingId] = useState<number | null>(null)
  const filterRef = useRef<FilterKey>('全て')
  const timeRangeRef = useRef<TimeRangeKey>('24時間')
  const onlyMyAreasRef = useRef(false)
  const myAreasRef = useRef<string[]>([])

  // 「自分のエリア」登録（localStorage）はクライアント専用データのため、SSRとの不一致を避けてマウント後に読み込む
  useEffect(() => { setMyAreas(getMyAreas()) }, [])

  const MY_POSTS_KEY = 'kuma_my_posts'
  const CONFIRMED_KEY = 'kuma_confirmed'

  const saveConfirmed = (id: number) => {
    try {
      const list = JSON.parse(localStorage.getItem(CONFIRMED_KEY) || '{}')
      list[String(id)] = true
      localStorage.setItem(CONFIRMED_KEY, JSON.stringify(list))
    } catch {}
  }

  const getConfirmed = (id: number): boolean => {
    try {
      const list = JSON.parse(localStorage.getItem(CONFIRMED_KEY) || '{}')
      return !!list[String(id)]
    } catch { return false }
  }

  const saveMyPost = (id: number, token: string) => {
    try {
      const posts = JSON.parse(localStorage.getItem(MY_POSTS_KEY) || '{}')
      posts[String(id)] = token
      localStorage.setItem(MY_POSTS_KEY, JSON.stringify(posts))
    } catch {}
  }

  const getMyPostToken = (id: number): string | null => {
    try {
      const posts = JSON.parse(localStorage.getItem(MY_POSTS_KEY) || '{}')
      return posts[String(id)] ?? null
    } catch { return null }
  }

  // 選択した投稿が自分のものか・確認済みかチェック
  useEffect(() => {
    if (!selected) { setMyPostToken(null); setConfirmedThisSighting(false); return }
    setMyPostToken(getMyPostToken(selected.id))
    setConfirmedThisSighting(getConfirmed(selected.id))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  const createMarkerIcon = (emoji: string, bgColor: string) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="54" viewBox="0 0 44 54">
      <ellipse cx="22" cy="50" rx="7" ry="3.5" fill="rgba(0,0,0,0.18)"/>
      <path d="M22 2C12.06 2 4 10.06 4 20c0 13 18 32 18 32S40 33 40 20C40 10.06 31.94 2 22 2z" fill="${bgColor}" stroke="white" stroke-width="2"/>
      <text x="22" y="23" text-anchor="middle" dominant-baseline="middle" font-size="18">${emoji}</text>
    </svg>`
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new window.google.maps.Size(44, 54),
      anchor: new window.google.maps.Point(22, 54),
    }
  }

  const addMarkersToMap = useCallback((data: BearSighting[], currentFilter: FilterKey, currentTimeRange: TimeRangeKey, onlyMine: boolean = false, myAreasList: string[] = []) => {
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []
    data.forEach(s => {
      if (!passesSightingFilters(s, currentFilter, currentTimeRange, onlyMine, myAreasList)) return

      const cfg = STATUS_CONFIG[s.status] ?? { emoji: '🐻', color: '#9CA3AF' }
      const bgColor = s.urgent ? '#EF4444' : cfg.color
      const marker = new window.google.maps.Marker({
        position: { lat: s.lat, lng: s.lng },
        map: mapInstance.current,
        title: s.area || s.status,
        icon: createMarkerIcon(cfg.emoji, bgColor),
      })
      marker.addListener('click', () => {
        setSelected(s)
        setIsAdding(false)
      })
      markersRef.current.push(marker)
    })
  }, [])

  const loadSightings = useCallback(async (currentFilter: FilterKey = '全て', currentTimeRange: TimeRangeKey = '全期間', onlyMine: boolean = false, myAreasList: string[] = []) => {
    const { data } = await supabase.from('bear_sightings').select('*').order('sighted_at', { ascending: false })
    if (data) {
      setSightings(data)
      addMarkersToMap(data, currentFilter, currentTimeRange, onlyMine, myAreasList)
    }
  }, [addMarkersToMap])

  useEffect(() => { filterRef.current = filter }, [filter])
  useEffect(() => { timeRangeRef.current = timeRange }, [timeRange])
  useEffect(() => { onlyMyAreasRef.current = onlyMyAreas }, [onlyMyAreas])
  useEffect(() => { myAreasRef.current = myAreas }, [myAreas])

  // リアルタイム反映：新規投稿を即座に地図・一覧へ反映し、「現在○人が見守り中」もPresenceで表示する
  useEffect(() => {
    const channel = supabase
      .channel('bear-map-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bear_sightings' },
        (payload) => {
          const newSighting = payload.new as BearSighting
          setSightings(prev => (prev.some(s => s.id === newSighting.id) ? prev : [newSighting, ...prev]))

          const passesFilter = passesSightingFilters(
            newSighting, filterRef.current, timeRangeRef.current, onlyMyAreasRef.current, myAreasRef.current
          )

          if (passesFilter && mapInstance.current) {
            const cfg = STATUS_CONFIG[newSighting.status] ?? { emoji: '🐻', color: '#9CA3AF' }
            const bgColor = newSighting.urgent ? '#EF4444' : cfg.color
            const marker = new window.google.maps.Marker({
              position: { lat: newSighting.lat, lng: newSighting.lng },
              map: mapInstance.current,
              title: newSighting.area || newSighting.status,
              icon: createMarkerIcon(cfg.emoji, bgColor),
              animation: window.google.maps.Animation.DROP,
            })
            marker.addListener('click', () => {
              setSelected(newSighting)
              setIsAdding(false)
            })
            markersRef.current.push(marker)
          }
        }
      )
      .on('presence', { event: 'sync' }, () => {
        setWatcherCount(Object.keys(channel.presenceState()).length)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await channel.track({ online_at: Date.now() })
      })

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFilterChange = useCallback((newFilter: FilterKey) => {
    setFilter(newFilter)
    setSelected(null)
    setSightings(prev => {
      addMarkersToMap(prev, newFilter, timeRange, onlyMyAreas, myAreas)
      return prev
    })
  }, [addMarkersToMap, timeRange, onlyMyAreas, myAreas])

  const handleTimeRangeChange = useCallback((newRange: TimeRangeKey) => {
    setTimeRange(newRange)
    setSelected(null)
    setSightings(prev => {
      addMarkersToMap(prev, filter, newRange, onlyMyAreas, myAreas)
      return prev
    })
  }, [addMarkersToMap, filter, onlyMyAreas, myAreas])

  const handleOnlyMyAreasToggle = useCallback((next: boolean) => {
    setOnlyMyAreas(next)
    setSelected(null)
    setSightings(prev => {
      addMarkersToMap(prev, filter, timeRange, next, myAreas)
      return prev
    })
  }, [addMarkersToMap, filter, timeRange, myAreas])

  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current) return
      // テスターフィードバック対応（2026-10-19）：地図を開いた際、登録済みの自分のエリアを起点に表示する
      const registeredAreas = getMyAreas()
      const firstAreaPref = registeredAreas.length > 0 ? extractPrefecture(registeredAreas[0]) : null
      const prefCoords = firstAreaPref ? getPrefectureCoords(firstAreaPref) : null
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: prefCoords ?? { lat: 38.0, lng: 139.0 },
        zoom: prefCoords ? 10 : 6,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      })
      geocoderRef.current = new window.google.maps.Geocoder()
      if (registeredAreas.length > 0) {
        // 都道府県中心よりさらに市区町村単位まで精度を上げられる場合は補正する
        geocoderRef.current.geocode({ address: `${registeredAreas[0]}, 日本` }, (results, status) => {
          if (status === 'OK' && results?.[0]) {
            mapInstance.current?.panTo(results[0].geometry.location)
            mapInstance.current?.setZoom(12)
          }
        })
      }
      mapInstance.current.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return
        const lat = e.latLng.lat()
        const lng = e.latLng.lng()
        setClickPos({ lat, lng })
        setIsAdding(true)
        setSelected(null)
        setForm({ description: '', area: '', urgent: false })
        setImageFile(null)
        setImagePreview(null)
        setImageError(null)
        geocoderRef.current?.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const comp = results[0].address_components
            const pref = comp.find(c => c.types.includes('administrative_area_level_1'))?.long_name
            const city = comp.find(c => c.types.includes('locality') || c.types.includes('administrative_area_level_2'))?.long_name
            const town = comp.find(c => c.types.includes('sublocality_level_1') || c.types.includes('sublocality'))?.long_name
            const area = [pref, city, town].filter(Boolean).join(' ')
            if (area) setForm(f => ({ ...f, area }))
          }
        })
      })
      loadSightings('全て', '24時間')
      setMapReady(true)
    }

    const timer = setInterval(() => {
      if (window.google?.maps) {
        clearInterval(timer)
        initMap()
      }
    }, 200)
    return () => clearInterval(timer)
  }, [loadSightings])

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
  const MAX_SIZE_MB = 5

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageError(null)
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(heic|heif)$/i)) {
      setImageError('JPEG・PNG・WebP・GIF・HEICのみ対応しています')
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setImageError(`ファイルサイズは${MAX_SIZE_MB}MB以下にしてください`)
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleGeoRegister = () => {
    if (!navigator.geolocation) {
      setGeoError('このブラウザは位置情報に対応していません')
      return
    }
    setGeoLoading(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false)
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setClickPos({ lat, lng })
        setIsAdding(true)
        setSelected(null)
        setForm({ description: '', area: '', urgent: false })
        setImageFile(null)
        setImagePreview(null)
        setImageError(null)
        mapInstance.current?.panTo({ lat, lng })
        mapInstance.current?.setZoom(14)
        geocoderRef.current?.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const comp = results[0].address_components
            const pref = comp.find(c => c.types.includes('administrative_area_level_1'))?.long_name
            const city = comp.find(c => c.types.includes('locality') || c.types.includes('administrative_area_level_2'))?.long_name
            const town = comp.find(c => c.types.includes('sublocality_level_1') || c.types.includes('sublocality'))?.long_name
            const area = [pref, city, town].filter(Boolean).join(' ')
            if (area) setForm(f => ({ ...f, area }))
          }
        })
      },
      () => {
        setGeoLoading(false)
        setGeoError('位置情報を取得できませんでした。設定を確認してください。')
      },
      { timeout: 10000 }
    )
  }

  // ?report=true でバナーからアクセスした場合、マップ準備完了後に自動で現在地報告を起動
  useEffect(() => {
    if (!mapReady || typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('report') === 'true') {
      handleGeoRegister()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady])

  // ?sos=open でトップページSOSボタンからアクセスした場合にSOSを自動起動
  useEffect(() => {
    if (!mapReady || typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('sos') === 'open') {
      openSOS()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady])

  const handleNoGeoReport = () => {
    setNoGeoMode(true)
    setClickPos({ lat: 36.5, lng: 138.0 }) // フォールバック座標（日本中心付近）
    setIsAdding(true)
    setSelected(null)
    setForm({ description: '', area: '', urgent: false })
    setImageFile(null)
    setImagePreview(null)
    setImageError(null)
  }

  const handleReportAgain = async () => {
    if (!selected || confirmedThisSighting || myPostToken) return
    const res = await fetch('/api/confirm-sighting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected.id }),
    })
    const json = await res.json()
    if (json.ok) {
      saveConfirmed(selected.id)
      setConfirmedThisSighting(true)
      const updated = { ...selected, report_count: json.report_count }
      setSelected(updated)
      setSightings(prev => prev.map(s => s.id === selected.id ? updated : s))
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!selected) return
    const res = await fetch('/api/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected.id, status: newStatus }),
    })
    const json = await res.json()
    if (json.ok) {
      setSelected({ ...selected, status: newStatus })
      loadSightings(filter, timeRange)
    }
  }

  const handleUrgentToggle = async () => {
    if (!selected) return
    const newUrgent = !selected.urgent
    const res = await fetch('/api/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected.id, urgent: newUrgent }),
    })
    const json = await res.json()
    if (json.ok) {
      setSelected({ ...selected, urgent: newUrgent })
      loadSightings(filter, timeRange)
    }
  }

  const openSOS = () => {
    const contact = localStorage.getItem('kuma_sos_contact')
    setSosContact(contact)
    setSosLocation(null)
    setSosSent(false)
    setShowSOS(true)
    setSosGetting(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        let address = `緯度 ${lat.toFixed(5)}、経度 ${lng.toFixed(5)}`
        try {
          const gc = new window.google.maps.Geocoder()
          await new Promise<void>(resolve => {
            gc.geocode({ location: { lat, lng } }, (results, status) => {
              if (status === 'OK' && results?.[0]) address = results[0].formatted_address
              resolve()
            })
          })
        } catch { /* geocode失敗時はGPS座標のまま */ }
        setSosLocation({ lat, lng, address })
        setSosGetting(false)
      },
      () => {
        setSosGetting(false)
        setSosLocation({ lat: 0, lng: 0, address: '位置情報の取得に失敗しました' })
      },
      { timeout: 8000, enableHighAccuracy: true }
    )
  }

  const sendSOSEmail = async () => {
    if (!sosContact || !sosLocation) return
    setSosSending(true)
    try {
      await fetch('/api/sos-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sosLocation, contactEmail: sosContact }),
      })
      setSosSent(true)
    } catch { /* 送信失敗 */ }
    setSosSending(false)
  }

  const handleDelete = async () => {
    if (!selected || !myPostToken) return
    if (!window.confirm('この目撃情報を削除しますか？この操作は取り消せません。')) return
    const res = await fetch('/api/delete-sighting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected.id, posterToken: myPostToken }),
    })
    const json = await res.json()
    if (!json.ok) {
      alert('削除できませんでした: ' + (json.error || '不明なエラー'))
      return
    }
    setSelected(null)
    setMyPostToken(null)
    setShowReport(false)
    loadSightings(filter, timeRange)
  }

  const startEdit = () => {
    if (!selected) return
    setEditForm({ area: selected.area || '', description: selected.description || '', urgent: selected.urgent })
    setIsEditing(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected || !myPostToken) return
    const res = await fetch('/api/edit-sighting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selected.id,
        posterToken: myPostToken,
        area: editForm.area,
        description: editForm.description,
        urgent: editForm.urgent,
      }),
    })
    const json = await res.json()
    if (json.ok) {
      setSelected({ ...selected, area: editForm.area || null, description: editForm.description || null, urgent: editForm.urgent })
      setIsEditing(false)
      loadSightings(filter, timeRange)
    } else {
      alert('修正できませんでした: ' + (json.error || '不明なエラー'))
    }
  }

  const copyReportText = async (s: BearSighting) => {
    try {
      await navigator.clipboard.writeText(buildReportText(s))
      setReportCopied(true)
      setTimeout(() => setReportCopied(false), 2500)
    } catch {}
  }

  const buildShareText = (s: BearSighting) => {
    const place = s.area || '場所不明'
    const urgentMark = s.urgent ? '【緊急】' : ''
    return `${urgentMark}🐻 ${place}で熊が目撃されました！\n安全確認はこちら👇\nhttps://kuma-oru.hana.trickster.biz\n#くまおる #熊出没`
  }

  const shareToX = (s: BearSighting) => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(buildShareText(s))}`, '_blank', 'noopener')
  }

  const shareToLine = (s: BearSighting) => {
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(buildShareText(s))}`, '_blank', 'noopener')
  }

  const copyShareUrl = async (s: BearSighting) => {
    try {
      await navigator.clipboard.writeText(buildShareText(s))
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch {}
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clickPos) return
    setLoading(true)

    let photo_url: string | null = null
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `${Date.now()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('bear-images')
        .upload(path, imageFile, { upsert: false })
      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage.from('bear-images').getPublicUrl(uploadData.path)
        photo_url = urlData.publicUrl
      }
    }

    let aiAnalysis: { ai_species_confidence: number | null; ai_size_estimate: string | null; ai_individual_id: string | null } = {
      ai_species_confidence: null,
      ai_size_estimate: null,
      ai_individual_id: null,
    }
    if (photo_url) {
      setAnalyzing(true)
      try {
        const res = await fetch('/api/analyze-bear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoUrl: photo_url, urgent: form.urgent }),
        })
        const json = await res.json()
        if (json.ok) aiAnalysis = json.result
      } catch {
        // AI分析に失敗しても投稿は継続する
      }
      setAnalyzing(false)
    }

    // 位置情報なしモードの場合、エリア名から都道府県座標にフォールバック
    let finalLat = clickPos.lat
    let finalLng = clickPos.lng
    if (noGeoMode && form.area) {
      const pref = extractPrefecture(form.area)
      const prefData = PREFECTURES.find(p => p.name === pref)
      if (prefData) { finalLat = prefData.lat; finalLng = prefData.lng }
    }

    const posterToken = crypto.randomUUID()

    const { data: inserted, error } = await supabase.from('bear_sightings').insert({
      lat: finalLat,
      lng: finalLng,
      photo_url,
      description: form.description || null,
      area: form.area || null,
      prefecture: extractPrefecture(form.area),
      urgent: form.urgent,
      poster_token: posterToken,
      ...aiAnalysis,
    }).select().single()

    setLoading(false)
    if (!error) {
      if (inserted?.id) saveMyPost(inserted.id, posterToken)
      setIsAdding(false)
      setNoGeoMode(false)
      const postedArea = form.area
      const postedUrgent = form.urgent
      setForm({ description: '', area: '', urgent: false })
      setImageFile(null)
      setImagePreview(null)
      setImageError(null)
      setClickPos(null)
      loadSightings(filter, timeRange, onlyMyAreas, myAreas)
      setShareText(
        `${postedUrgent ? '🚨緊急：' : '🐻'}${postedArea ? `${postedArea}で` : ''}熊の目撃情報を投稿しました。みんなで見守ろう #くまおる`
      )
      setPostReportText(buildReportText({
        area: postedArea || null,
        sighted_at: new Date().toISOString(),
        description: form.description || null,
        urgent: postedUrgent,
        ai_size_estimate: aiAnalysis.ai_size_estimate,
      }))
      setPostPrefecture(extractPrefecture(postedArea))
      setPostSightingId(inserted?.id ?? null)

      if (form.area) {
        fetch('/api/area-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            area: form.area,
            description: form.description,
            urgent: form.urgent,
            sightingId: inserted?.id,
          }),
        }).catch(() => {})
      }

      if (inserted?.id && aiAnalysis.ai_individual_id) {
        fetch('/api/match-individual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sightingId: inserted.id,
            prefecture: extractPrefecture(form.area),
            aiIndividualId: aiAnalysis.ai_individual_id,
          }),
        }).catch(() => {})
      }
    }
  }

  const urgentCount = sightings.filter(s => s.urgent).length

  const filteredSightings = sightings.filter(s => passesSightingFilters(s, filter, timeRange, onlyMyAreas, myAreas))

  const selectedPref = selected ? extractPrefecture(selected.area) : null
  const selectedRisk = selectedPref
    ? calcRiskLevel(sightings.filter(s => extractPrefecture(s.area) === selectedPref && isWithinDays(s.sighted_at, 30)).length)
    : null

  useEffect(() => {
    if (!selected) { setRelatedMatches([]); return }
    supabase
      .from('bear_individual_matches')
      .select('*')
      .or(`sighting_id.eq.${selected.id},matched_sighting_id.eq.${selected.id}`)
      .then(({ data }) => setRelatedMatches((data ?? []) as IndividualMatch[]))
  }, [selected?.id])

  const goTo = (s: BearSighting) => {
    setSelected(s)
    mapInstance.current?.panTo({ lat: s.lat, lng: s.lng })
    mapInstance.current?.setZoom(14)
  }

  return (
    <main className="relative w-screen h-screen overflow-hidden flex bg-kuma-bg">
      {/* PC左サイドバー */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[360px] lg:h-full lg:border-r lg:border-kuma-line lg:bg-kuma-card lg:shrink-0">
        <div className="px-5 py-4 border-b border-kuma-line flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Bear size={28} />
            <span className="font-extrabold text-sm text-kuma-primary">くま！おる！熊！</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/areas" title="地域別ランキング" className="text-base text-kuma-sub hover:text-kuma-ink transition-colors">📊</Link>
            <Link href="/guide" title="安全ガイド" className="text-base text-kuma-sub hover:text-kuma-ink transition-colors">📖</Link>
            <Link href="/links" title="公式リンク集" className="text-base text-kuma-sub hover:text-kuma-ink transition-colors">🗾</Link>
          </div>
        </div>

        <div className="px-5 py-3 border-b border-kuma-line space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-kuma-sub">🐻 {sightings.length}件{urgentCount > 0 && <span className="text-kuma-accent font-bold ml-1">（緊急{urgentCount}）</span>}</span>
            {watcherCount > 0 && (
              <span className="text-[11px] text-kuma-faint" title="現在この画面を開いている人数（リアルタイム）">👀 現在{watcherCount}人が見守り中</span>
            )}
            <Link href="/notify" className="rounded-lg px-3 py-1.5 text-[11px] font-extrabold bg-kuma-primary text-kuma-primary-text hover:opacity-90 transition-opacity">🔔 通知登録</Link>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {FILTERS.map(({ key, label, icon, color }) => (
              <button
                key={key}
                onClick={() => handleFilterChange(key)}
                className="text-xs px-3 py-1 rounded-full border transition-colors font-bold"
                style={filter === key
                  ? { background: color, borderColor: color, color: '#fff' }
                  : { background: 'var(--color-kuma-field)', borderColor: 'var(--color-kuma-line)', color: 'var(--color-kuma-sub)' }}
              >
                {icon} {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-kuma-faint shrink-0">表示期間:</span>
            {TIME_RANGES.map(key => (
              <button
                key={key}
                onClick={() => handleTimeRangeChange(key)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${timeRangeButtonClass(key, timeRange === key)}`}
              >
                {key}
              </button>
            ))}
          </div>
          <button
            onClick={() => handleTimeRangeChange('リアルタイム')}
            className={`w-full flex items-center justify-center gap-2 text-sm px-3 py-2.5 rounded-xl border transition-colors font-bold ${
              timeRange === 'リアルタイム'
                ? 'bg-kuma-accent text-white border-kuma-accent'
                : 'bg-kuma-accent/10 text-kuma-accent border-kuma-accent/60 hover:bg-kuma-accent/20'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            🔴 リアルタイム{timeRange === 'リアルタイム' ? '（3時間以内表示中）' : 'で見る'}
          </button>
          {/* 自分のエリアのみ表示（テスターフィードバック対応・2026-10-19：自分のエリアの情報をわかりやすく） */}
          {myAreas.length > 0 ? (
            <button
              onClick={() => handleOnlyMyAreasToggle(!onlyMyAreas)}
              className={`w-full flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-xl border transition-colors font-bold ${
                onlyMyAreas
                  ? 'bg-kuma-primary text-kuma-primary-text border-kuma-primary'
                  : 'bg-kuma-primary/10 text-kuma-primary border-kuma-primary/60 hover:bg-kuma-primary/20'
              }`}
            >
              📍 自分のエリアのみ表示{onlyMyAreas ? '中' : ''}
            </button>
          ) : (
            <Link
              href="/notify"
              className="block w-full text-center text-xs bg-kuma-field border border-kuma-line text-kuma-sub hover:text-kuma-ink px-3 py-2 rounded-lg transition-colors"
            >
              🔔 自分のエリアを登録すると絞り込めます →
            </Link>
          )}
          <button
            onClick={handleGeoRegister}
            disabled={geoLoading}
            className="w-full text-xs bg-kuma-field border border-kuma-line text-kuma-ink hover:border-kuma-primary disabled:opacity-50 px-3 py-2 rounded-lg transition-colors font-bold"
          >
            {geoLoading ? '取得中…' : '📍 現在地で報告する'}
          </button>
          <button
            onClick={handleNoGeoReport}
            className="w-full text-xs bg-kuma-field border border-kuma-line text-kuma-sub hover:border-kuma-primary hover:text-kuma-ink px-3 py-2 rounded-lg transition-colors"
          >
            📝 位置情報なしで報告する
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredSightings.length === 0 ? (
            <p className="text-sm text-kuma-faint text-center py-10">まだ目撃情報がありません</p>
          ) : (
            filteredSightings.map(s => {
              const cfg = STATUS_CONFIG[s.status] ?? { emoji: '🐻', color: '#9CA3AF' }
              return (
                <button
                  key={s.id}
                  onClick={() => goTo(s)}
                  className={`w-full flex items-center gap-3 px-5 py-3 text-left border-b border-kuma-line hover:bg-kuma-panel transition-colors ${selected?.id === s.id ? 'bg-kuma-panel' : ''}`}
                >
                  <span className="text-xl shrink-0">{s.urgent ? '🆘' : cfg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-kuma-ink truncate">{s.area || '場所未設定'}</p>
                    <p className="text-xs text-kuma-faint">
                      {new Date(s.sighted_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {' · '}{s.status}{s.urgent ? ' · 🆘緊急' : ''}
                    </p>
                  </div>
                  {(() => {
                    const t = trustScore(s.report_count)
                    return (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-bold shrink-0"
                        style={{ color: t.color, background: `${t.color}22` }}
                      >
                        {'★'.repeat(t.stars)}{'☆'.repeat(3 - t.stars)}
                      </span>
                    )
                  })()}
                </button>
              )
            })
          )}
        </div>

        <div className="px-5 py-3 border-t border-kuma-line">
          <button onClick={() => setShowDisclaimer(true)} className="text-xs text-kuma-faint hover:text-kuma-sub transition-colors">免責事項</button>
        </div>
      </aside>

      {/* 地図エリア */}
      <div className="relative flex-1 h-full">
        <div ref={mapRef} className="w-full h-full" />

        {/* モバイルヘッダー */}
        <div className="lg:hidden absolute top-0 left-0 right-0 bg-kuma-bg/90 backdrop-blur-sm border-b border-kuma-line px-4 py-2.5 z-10">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <Bear size={26} />
              <span className="text-sm font-extrabold text-kuma-primary">くま！おる！熊！</span>
            </Link>
            <div className="ml-auto flex items-center gap-3">
              <Link href="/areas" title="地域別ランキング" className="text-base">📊</Link>
              <Link href="/guide" title="安全ガイド" className="text-base">📖</Link>
              <Link href="/notify" title="通知登録" className="text-base">🔔</Link>
              <Link href="/links" title="公式リンク集" className="text-base">🗾</Link>
              <button onClick={() => setShowDisclaimer(true)} className="text-[11px] text-kuma-faint hover:text-kuma-sub">免責事項</button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-kuma-sub">🐻 {sightings.length}件{urgentCount > 0 && <span className="text-kuma-accent font-bold ml-1">（緊急{urgentCount}）</span>}</span>
            {watcherCount > 0 && (
              <span className="text-[11px] text-kuma-faint" title="現在この画面を開いている人数（リアルタイム）">👀 現在{watcherCount}人が見守り中</span>
            )}
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => setShowList(true)}
                className="text-xs bg-kuma-field border border-kuma-line text-kuma-sub hover:text-kuma-ink px-3 py-1.5 rounded-full transition-colors"
              >
                📋 一覧
              </button>
              <button
                onClick={handleGeoRegister}
                disabled={geoLoading}
                className="text-xs bg-kuma-primary hover:opacity-90 disabled:opacity-50 text-kuma-primary-text px-3 py-1.5 rounded-full font-bold transition-opacity"
              >
                {geoLoading ? '取得中…' : '📍 現在地で報告'}
              </button>
              <button
                onClick={handleNoGeoReport}
                className="text-xs bg-kuma-field border border-kuma-line text-kuma-sub hover:text-kuma-ink px-3 py-1.5 rounded-full transition-colors"
              >
                📝 位置情報なし
              </button>
            </div>
          </div>
          <div className="flex gap-2 mt-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {FILTERS.map(({ key, label, icon, color }) => (
              <button
                key={key}
                onClick={() => handleFilterChange(key)}
                className="shrink-0 text-xs px-3 py-1 rounded-full border transition-colors font-bold"
                style={filter === key
                  ? { background: color, borderColor: color, color: '#fff' }
                  : { background: 'var(--color-kuma-field)', borderColor: 'var(--color-kuma-line)', color: 'var(--color-kuma-sub)' }}
              >
                {icon} {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-1.5 overflow-x-auto pb-1 scrollbar-hide">
            <span className="text-xs text-kuma-faint shrink-0">表示期間:</span>
            {TIME_RANGES.map(key => (
              <button
                key={key}
                onClick={() => handleTimeRangeChange(key)}
                className={`shrink-0 text-xs px-3 py-1 rounded-full border transition-colors ${timeRangeButtonClass(key, timeRange === key)}`}
              >
                {key}
              </button>
            ))}
          </div>
          <button
            onClick={() => handleTimeRangeChange('リアルタイム')}
            className={`w-full mt-1.5 flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-xl border transition-colors font-bold ${
              timeRange === 'リアルタイム'
                ? 'bg-kuma-accent text-white border-kuma-accent'
                : 'bg-kuma-accent/10 text-kuma-accent border-kuma-accent/60 hover:bg-kuma-accent/20'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            🔴 リアルタイム{timeRange === 'リアルタイム' ? '（3時間以内表示中）' : 'で見る'}
          </button>
          {myAreas.length > 0 && (
            <button
              onClick={() => handleOnlyMyAreasToggle(!onlyMyAreas)}
              className={`w-full mt-1.5 flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-xl border transition-colors font-bold ${
                onlyMyAreas
                  ? 'bg-kuma-primary text-kuma-primary-text border-kuma-primary'
                  : 'bg-kuma-primary/10 text-kuma-primary border-kuma-primary/60 hover:bg-kuma-primary/20'
              }`}
            >
              📍 自分のエリアのみ表示{onlyMyAreas ? '中' : ''}
            </button>
          )}
        </div>

        {/* 詳細パネル（モバイル：ボトムシート／PC：右カード） */}
        {selected && (
          <div className="absolute bottom-0 left-0 right-0 lg:bottom-6 lg:right-6 lg:left-auto lg:top-6 lg:w-[360px] bg-kuma-card border border-kuma-line rounded-t-2xl lg:rounded-2xl shadow-xl z-10 max-h-[70vh] lg:max-h-[calc(100%-3rem)] overflow-y-auto max-w-lg mx-auto lg:mx-0">
            {selected.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.photo_url}
                alt="目撃時の写真"
                className="w-full h-48 object-contain bg-kuma-field rounded-t-2xl lg:rounded-t-2xl"
              />
            )}
            <div className="p-5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="text-lg font-bold text-kuma-ink">{selected.area || '場所未設定'}</h2>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <span className="text-xs px-2 py-1 rounded-full text-white font-bold" style={{ background: STATUS_CONFIG[selected.status]?.color ?? '#9CA3AF' }}>
                      {STATUS_CONFIG[selected.status]?.emoji ?? '🐻'} {selected.status}
                    </span>
                    {selected.urgent && (
                      <span className="text-xs bg-kuma-accent text-white px-2 py-1 rounded-full font-bold">🆘 緊急</span>
                    )}
                    {selected.source === 'news_auto' && (
                      <span className="text-xs bg-kuma-field text-kuma-sub border border-kuma-line px-2 py-1 rounded-full" title="ニュース報道をもとにAIが自動登録した情報です">
                        📰 ニュースより自動登録
                      </span>
                    )}
                    {selected.source === 'x_auto' && (
                      <span className="text-xs bg-kuma-field text-kuma-sub border border-kuma-line px-2 py-1 rounded-full" title="X（旧Twitter）の投稿をもとにAIが自動登録した情報です">
                        🐦 Xより自動登録
                      </span>
                    )}
                    {(() => {
                      const t = trustScore(selected.report_count)
                      return (
                        <span
                          className="text-xs px-2 py-1 rounded-full font-bold"
                          style={{ color: t.color, background: `${t.color}22`, border: `1px solid ${t.color}55` }}
                          title="複数の目撃報告が集まるほど信頼度が上がります"
                        >
                          {'★'.repeat(t.stars)}{'☆'.repeat(3 - t.stars)} {t.label}・{selected.report_count}件
                        </span>
                      )
                    })()}
                    {selectedRisk && (
                      <span
                        className="text-xs px-2 py-1 rounded-full font-bold"
                        style={{ color: RISK_LEVEL_STYLE[selectedRisk].color, background: RISK_LEVEL_STYLE[selectedRisk].bg }}
                        title={`${selectedPref}の直近30日の出没投稿数に基づく簡易リスクレベル`}
                      >
                        {selectedPref}: リスク{selectedRisk}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => { setSelected(null); setShowReport(false) }} className="text-kuma-faint hover:text-kuma-ink text-2xl leading-none ml-2">×</button>
              </div>
              {selected.description && <p className="text-sm text-kuma-sub mt-2">{selected.description}</p>}
              {selected.ai_species_confidence !== null && selected.ai_species_confidence < 0.4 && (
                <div className="mt-2 text-xs text-kuma-primary bg-kuma-field border border-kuma-line rounded-lg p-2">
                  ⚠️ AIはこの写真が熊である確信度が低いと判定しています（確信度 {Math.round(selected.ai_species_confidence * 100)}%）。誤投稿の可能性があります。
                </div>
              )}
              {(selected.ai_size_estimate || selected.ai_individual_id) && (
                <div className="mt-2 text-xs text-kuma-sub bg-kuma-field rounded-lg p-2 space-y-1 border border-kuma-line">
                  <p className="font-bold text-kuma-primary">🤖 AI画像分析</p>
                  {selected.ai_size_estimate && <p>推定サイズ: {selected.ai_size_estimate}</p>}
                  {selected.ai_individual_id && <p>個体特徴（追跡用）: {selected.ai_individual_id}</p>}
                  {selected.ai_species_confidence !== null && (
                    <p>熊である確信度: {Math.round(selected.ai_species_confidence * 100)}%</p>
                  )}
                </div>
              )}
              {relatedMatches.length > 0 && (
                <div className="mt-2 text-xs text-kuma-sub bg-kuma-field rounded-lg p-2 space-y-1.5 border border-kuma-line">
                  <p className="font-bold text-kuma-primary">🔁 同一個体の可能性</p>
                  {relatedMatches.map(m => {
                    const otherId = m.sighting_id === selected.id ? m.matched_sighting_id : m.sighting_id
                    const other = sightings.find(s => s.id === otherId)
                    return (
                      <div key={m.id} className="flex items-center justify-between gap-2">
                        <span>
                          {m.confidence === 'high' ? '高い確度' : '中程度の確度'}で関連
                          {other && <>（{other.area ?? '地域不明'}・{new Date(other.sighted_at).toLocaleDateString('ja-JP')}）</>}
                        </span>
                        {other && (
                          <button type="button" onClick={() => goTo(other)} className="shrink-0 text-kuma-primary underline">見る</button>
                        )}
                      </div>
                    )
                  })}
                  <p className="text-[10px] text-kuma-faint">※AIによる特徴記述の文章比較に基づく参考情報です。写真の照合を保証するものではありません。</p>
                </div>
              )}
              <p className="text-xs text-kuma-faint mt-2">
                最終目撃：{new Date(selected.sighted_at).toLocaleString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleReportAgain}
                  disabled={confirmedThisSighting || !!myPostToken}
                  className={`flex-1 text-xs rounded-lg py-2 border transition-colors font-bold ${
                    confirmedThisSighting
                      ? 'bg-green-900/30 border-green-600 text-green-400 cursor-default'
                      : myPostToken
                      ? 'bg-kuma-field border-kuma-line text-kuma-faint cursor-default'
                      : 'bg-kuma-field border-kuma-line text-kuma-ink hover:border-kuma-primary'
                  }`}
                >
                  {confirmedThisSighting ? '✅ 目撃を確認済み' : myPostToken ? '👤 自分の投稿' : '👀 ここでも目撃した'}
                </button>
                <button
                  onClick={handleUrgentToggle}
                  className={`flex-1 text-xs rounded-lg py-2 border transition-colors font-bold ${
                    selected.urgent
                      ? 'bg-kuma-accent border-kuma-accent text-white'
                      : 'bg-kuma-field border-kuma-line text-kuma-accent hover:border-kuma-accent'
                  }`}
                >
                  {selected.urgent ? '🆘 緊急中' : '🆘 緊急にする'}
                </button>
              </div>

              <div className="mt-3">
                <p className="text-xs text-kuma-sub mb-1">対応状況を更新</p>
                <div className="flex gap-2 flex-wrap">
                  {Object.keys(STATUS_CONFIG).map(s => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors font-bold ${
                        selected.status === s
                          ? 'text-white border-transparent'
                          : 'bg-kuma-field text-kuma-sub border-kuma-line hover:text-kuma-ink'
                      }`}
                      style={selected.status === s ? { background: STATUS_CONFIG[s].color } : undefined}
                    >
                      {STATUS_CONFIG[s].emoji} {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3">
                <p className="text-xs text-kuma-sub mb-2">シェアする</p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => shareToLine(selected)}
                    className="flex-1 flex flex-col items-center gap-1 rounded-2xl py-2.5 text-white hover:opacity-80 transition-opacity"
                    style={{ background: '#06C755' }}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
                    <span className="text-[10px] font-bold">LINE</span>
                  </button>
                  <button
                    onClick={() => shareToX(selected)}
                    className="flex-1 flex flex-col items-center gap-1 rounded-2xl py-2.5 text-white hover:opacity-80 transition-opacity"
                    style={{ background: '#000' }}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    <span className="text-[10px] font-bold">X</span>
                  </button>
                  <button
                    onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://kuma-oru.hana.trickster.biz')}`, '_blank', 'noopener')}
                    className="flex-1 flex flex-col items-center gap-1 rounded-2xl py-2.5 text-white hover:opacity-80 transition-opacity"
                    style={{ background: '#1877F2' }}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    <span className="text-[10px] font-bold">Facebook</span>
                  </button>
                  <button
                    onClick={() => copyShareUrl(selected)}
                    className="flex-1 flex flex-col items-center gap-1 rounded-2xl py-2.5 text-white hover:opacity-80 transition-opacity"
                    style={{ background: '#FF0000' }}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                    <span className="text-[10px] font-bold">YouTube</span>
                  </button>
                  <button
                    onClick={() => copyShareUrl(selected)}
                    className="flex-1 flex flex-col items-center gap-1 rounded-2xl py-2.5 text-white hover:opacity-80 transition-opacity"
                    style={{ background: '#010101' }}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                    <span className="text-[10px] font-bold">TikTok</span>
                  </button>
                  <button
                    onClick={() => copyShareUrl(selected)}
                    className="flex-1 flex flex-col items-center gap-1 rounded-2xl py-2.5 text-white hover:opacity-80 transition-opacity"
                    style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
                    <span className="text-[10px] font-bold">Instagram</span>
                  </button>
                </div>
                {copySuccess && <p className="text-[11px] text-green-500 mt-1.5 text-center">✅ テキストをコピーしました。アプリに貼り付けて投稿してください。</p>}
              </div>

              {/* 通報補助 */}
              <div className="mt-3 border border-kuma-accent/40 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowReport(v => !v)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-kuma-accent/10 hover:bg-kuma-accent/20 transition-colors text-kuma-accent text-sm font-bold"
                >
                  <span>📞 警察・自治体に通報する</span>
                  <span className="text-xs">{showReport ? '▲' : '▼'}</span>
                </button>
                {showReport && (
                  <div className="p-3 space-y-3 bg-kuma-field/50">
                    {/* 電話ボタン */}
                    <div>
                      <p className="text-xs text-kuma-sub mb-1.5 font-bold">📞 ワンタップ通報</p>
                      <div className="flex gap-2">
                        <a
                          href="tel:110"
                          className="flex-1 text-center text-xs font-extrabold bg-kuma-accent text-white rounded-lg py-2.5 hover:opacity-85 transition-opacity"
                        >
                          110<br /><span className="font-normal text-[10px]">警察（緊急）</span>
                        </a>
                        <a
                          href="tel:#9110"
                          className="flex-1 text-center text-xs font-extrabold bg-kuma-field border border-kuma-accent text-kuma-accent rounded-lg py-2.5 hover:bg-kuma-accent hover:text-white transition-colors"
                        >
                          #9110<br /><span className="font-normal text-[10px]">警察相談窓口</span>
                        </a>
                        <a
                          href={`tel:${selected.prefecture ? '' : ''}`}
                          onClick={e => { e.preventDefault(); copyReportText(selected) }}
                          className="flex-1 text-center text-xs font-extrabold bg-kuma-field border border-kuma-line text-kuma-ink rounded-lg py-2.5 hover:border-kuma-primary transition-colors"
                        >
                          📋<br /><span className="font-normal text-[10px]">テキストコピー</span>
                        </a>
                      </div>
                    </div>

                    {/* 自動生成通報テキスト */}
                    <div>
                      <p className="text-xs text-kuma-sub mb-1 font-bold">📄 通報テキスト（自治体・猟友会向け）</p>
                      <pre className="text-xs text-kuma-ink bg-kuma-card border border-kuma-line rounded-lg p-2.5 whitespace-pre-wrap leading-relaxed font-sans">
                        {buildReportText(selected)}
                      </pre>
                      <button
                        onClick={() => copyReportText(selected)}
                        className="mt-1.5 w-full text-xs bg-kuma-primary text-kuma-primary-text rounded-lg py-1.5 hover:opacity-90 transition-opacity font-bold"
                      >
                        {reportCopied ? '✅ コピーしました！' : '📋 テキストをコピーする'}
                      </button>
                    </div>

                    {/* 都道府県公式情報リンク */}
                    {selected.prefecture && (
                      <a
                        href={`/links#${selected.prefecture}`}
                        className="flex items-center justify-between bg-kuma-primary/10 border border-kuma-primary/40 rounded-xl px-3 py-2 hover:bg-kuma-primary/20 transition-colors"
                      >
                        <span className="text-xs font-bold text-kuma-primary">🗾 {selected.prefecture}の公式出没情報を見る</span>
                        <span className="text-[10.5px] text-kuma-primary shrink-0">→</span>
                      </a>
                    )}
                    <a
                      href="/partnership"
                      className="flex items-center justify-between bg-kuma-field border border-kuma-line rounded-xl px-3 py-2 hover:border-kuma-primary transition-colors"
                    >
                      <span className="text-xs font-bold text-kuma-sub">🏛️ 行政・猟友会の方はこちら（連携窓口）</span>
                      <span className="text-[10.5px] text-kuma-faint shrink-0">→</span>
                    </a>

                    {/* 注意書き */}
                    <p className="text-[10.5px] text-kuma-faint leading-relaxed">
                      ⚠️ 熊と遭遇した場合や至近距離にいる場合は、まず安全な場所に移動してから110番通報してください。お住まいの市区町村役場や農林水産担当窓口への連絡も有効です。
                    </p>

                    {/* クマ対策グッズ誘導 */}
                    <a
                      href="https://www.amazon.co.jp/s?k=クマ対策グッズ&tag=hanakuma22-22"
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      className="flex items-center justify-between bg-[#FF9900]/10 border border-[#FF9900]/40 rounded-xl px-3 py-2 hover:bg-[#FF9900]/20 transition-colors"
                    >
                      <span className="text-xs font-bold text-kuma-ink">🛡️ クマ対策グッズを準備する</span>
                      <span className="text-[10.5px] text-[#FF9900] font-bold shrink-0">Amazon →</span>
                    </a>
                    <a
                      href="https://hb.afl.rakuten.co.jp/hgc/125d41f3.458446f1.125d41f4.0158f841/?pc=https%3A%2F%2Fsearch.rakuten.co.jp%2Fsearch%2Fmall%2F%E7%86%8A%E5%AF%BE%E7%AD%96%E3%82%B0%E3%83%83%E3%82%BA%2F&link_type=text&ut=eyJwYWdlIjoidXJsIiwidHlwZSI6InRleHQiLCJjb2wiOjF9"
                      target="_blank"
                      rel="nofollow noopener noreferrer sponsored"
                      className="flex items-center justify-between bg-[#BF0000]/10 border border-[#BF0000]/40 rounded-xl px-3 py-2 hover:bg-[#BF0000]/20 transition-colors"
                    >
                      <span className="text-xs font-bold text-kuma-ink">🛡️ クマ対策グッズを準備する</span>
                      <span className="text-[10.5px] text-[#BF0000] font-bold shrink-0">楽天 →</span>
                    </a>
                  </div>
                )}
              </div>

              {myPostToken && selected.source !== 'news_auto' && selected.source !== 'x_auto' && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={startEdit}
                    className="flex-1 text-xs bg-kuma-field border border-kuma-line text-kuma-ink rounded-lg py-2 hover:border-kuma-primary transition-colors font-bold"
                  >
                    ✏️ 修正する
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 text-xs bg-kuma-field border border-kuma-accent text-kuma-accent rounded-lg py-2 hover:bg-kuma-accent hover:text-white transition-colors font-bold"
                  >
                    🗑️ 削除する
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 投稿フォーム */}
        {isAdding && (
          <div className="absolute inset-0 bg-black/50 z-20 flex items-end lg:items-center lg:justify-center">
            <div className="bg-kuma-card border border-kuma-line rounded-t-2xl lg:rounded-2xl p-5 w-full max-w-lg mx-auto max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="font-bold text-lg text-kuma-ink">🐻 熊の目撃情報を投稿する</h2>
                  {noGeoMode && (
                    <span className="text-[11px] text-kuma-sub bg-kuma-field border border-kuma-line rounded-full px-2.5 py-0.5 mt-1 inline-block">
                      📝 位置情報なしモード（エリア名で登録）
                    </span>
                  )}
                </div>
                <button onClick={() => { setIsAdding(false); setNoGeoMode(false) }} className="text-kuma-faint hover:text-kuma-ink text-2xl leading-none">×</button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="text-sm text-kuma-sub block mb-1">エリア（市区町村・地区名）</label>
                  <input
                    className="w-full bg-kuma-field border border-kuma-line rounded-lg px-3 py-2 text-sm text-kuma-ink placeholder-kuma-faint focus:outline-none focus:ring-2 focus:ring-kuma-primary"
                    placeholder="例：札幌市南区〇〇町"
                    value={form.area}
                    onChange={e => setForm({ ...form, area: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-kuma-faint">地図クリック地点から自動入力されます。必要に応じて修正してください。</p>
                </div>
                <div>
                  <label className="text-sm text-kuma-sub block mb-1">状況（任意）</label>
                  <textarea
                    className="w-full bg-kuma-field border border-kuma-line rounded-lg px-3 py-2 text-sm text-kuma-ink placeholder-kuma-faint focus:outline-none focus:ring-2 focus:ring-kuma-primary"
                    rows={3}
                    placeholder="例：本日朝7時頃、畑の脇を歩いているのを目撃しました。子熊を連れていました。"
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm text-kuma-sub block mb-1">写真（任意・サイズ測定や個体識別に使われます）</label>
                  <div className="text-xs text-kuma-sub bg-kuma-field border border-kuma-line rounded-lg p-2.5 mb-2 leading-relaxed">
                    🐻 環境省が採用する調査手法と同じく、<b className="text-kuma-primary">熊が立ち上がって胸の白い模様（月の輪）が見えている写真</b>があると、AIによる個体識別の精度が大きく上がります。<b className="text-kuma-accent">無理に近づかず、安全な距離から</b>撮影してください。
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer bg-kuma-field border border-kuma-line rounded-lg px-3 py-2 hover:border-kuma-primary transition-colors">
                    <span className="text-2xl">📷</span>
                    <span className="text-sm text-kuma-sub">{imageFile ? imageFile.name : '写真を選ぶ'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                  {imageError && <p className="mt-1 text-xs text-kuma-accent">{imageError}</p>}
                  {imagePreview && (
                    <div className="mt-2 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagePreview} alt="プレビュー" className="w-full h-32 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => { setImageFile(null); setImagePreview(null); setImageError(null) }}
                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >×</button>
                    </div>
                  )}
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.urgent}
                    onChange={e => setForm({ ...form, urgent: e.target.checked })}
                    className="w-4 h-4 accent-kuma-accent"
                  />
                  <span className="text-sm text-kuma-accent font-bold">🆘 今まさに近くにいる（緊急）</span>
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-kuma-primary hover:opacity-90 disabled:opacity-50 text-kuma-primary-text rounded-lg py-3 font-extrabold text-sm transition-opacity"
                >
                  {analyzing ? '🤖 AIが写真を分析中...' : loading ? '投稿中...' : '投稿する'}
                </button>
                {imageFile && (
                  <p className="text-center text-xs text-kuma-faint">
                    写真からAIが熊のサイズ・特徴を自動分析します（少し時間がかかります）
                  </p>
                )}
              </form>
            </div>
          </div>
        )}

        {/* 位置情報エラー */}
        {geoError && (
          <div className="absolute top-24 left-0 right-0 flex justify-center z-20 px-4">
            <div className="bg-kuma-card border border-kuma-accent rounded-xl px-5 py-4 shadow-lg max-w-sm w-full">
              <div className="flex items-start gap-2 mb-3">
                <span className="text-kuma-accent text-lg shrink-0">📍</span>
                <div>
                  <p className="text-kuma-accent text-sm font-bold">位置情報が必要です</p>
                  <p className="text-kuma-faint text-xs mt-1 leading-relaxed">リアルタイム登録には現在地が必要です。ブラウザのアドレスバー横の🔒アイコンから「位置情報」を「許可」に変更してください。</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setGeoError(null); handleGeoRegister() }}
                  className="flex-1 text-xs font-bold bg-kuma-primary text-kuma-primary-text rounded-lg py-2 hover:opacity-90 transition-opacity"
                >
                  🔄 再試行
                </button>
                <button onClick={() => setGeoError(null)} className="text-xs text-kuma-faint hover:text-kuma-ink px-3 py-2">
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ヒント */}
        {!isAdding && !selected && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10 pointer-events-none">
            <div className="bg-kuma-card/90 backdrop-blur-sm border border-kuma-line rounded-full px-4 py-2 shadow text-sm text-kuma-sub">
              地図をタップして熊の目撃情報を投稿
            </div>
          </div>
        )}

        {/* 一覧モーダル */}
        {showList && (
          <div className="absolute inset-0 bg-black/50 z-30 flex items-center justify-center p-4">
            <div className="bg-kuma-card border border-kuma-line rounded-2xl shadow-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-base text-kuma-ink">📋 最近の目撃情報</h2>
                <button onClick={() => setShowList(false)} className="text-kuma-faint hover:text-kuma-ink text-2xl leading-none">×</button>
              </div>
              {sightings.length === 0 ? (
                <p className="text-sm text-kuma-faint text-center py-6">まだ目撃情報がありません</p>
              ) : (
                <div className="space-y-2">
                  {sightings.map((s) => {
                    const cfg = STATUS_CONFIG[s.status] ?? { emoji: '🐻', color: '#9CA3AF' }
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          goTo(s)
                          setShowList(false)
                        }}
                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-kuma-panel text-left transition-colors"
                      >
                        <span className="text-xl">{cfg.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-kuma-ink truncate">{s.area || '場所未設定'}</p>
                          <p className="text-xs text-kuma-faint">
                            {new Date(s.sighted_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            {' · '}{s.status}{s.urgent ? ' · 🆘緊急' : ''}
                          </p>
                        </div>
                        {(() => {
                    const t = trustScore(s.report_count)
                    return (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-bold shrink-0"
                        style={{ color: t.color, background: `${t.color}22` }}
                      >
                        {'★'.repeat(t.stars)}{'☆'.repeat(3 - t.stars)}
                      </span>
                    )
                  })()}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 編集モーダル */}
        {isEditing && selected && (
          <div className="absolute inset-0 bg-black/50 z-30 flex items-end lg:items-center lg:justify-center">
            <div className="bg-kuma-card border border-kuma-line rounded-t-2xl lg:rounded-2xl p-5 w-full max-w-lg mx-auto max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg text-kuma-ink">✏️ 目撃情報を修正する</h2>
                <button onClick={() => setIsEditing(false)} className="text-kuma-faint hover:text-kuma-ink text-2xl leading-none">×</button>
              </div>
              <form onSubmit={handleEditSubmit} className="space-y-3">
                <div>
                  <label className="text-sm text-kuma-sub block mb-1">エリア（市区町村・地区名）</label>
                  <input
                    className="w-full bg-kuma-field border border-kuma-line rounded-lg px-3 py-2 text-sm text-kuma-ink placeholder-kuma-faint focus:outline-none focus:ring-2 focus:ring-kuma-primary"
                    placeholder="例：札幌市南区〇〇町"
                    value={editForm.area}
                    onChange={e => setEditForm({ ...editForm, area: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm text-kuma-sub block mb-1">状況</label>
                  <textarea
                    className="w-full bg-kuma-field border border-kuma-line rounded-lg px-3 py-2 text-sm text-kuma-ink placeholder-kuma-faint focus:outline-none focus:ring-2 focus:ring-kuma-primary"
                    rows={3}
                    value={editForm.description}
                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.urgent}
                    onChange={e => setEditForm({ ...editForm, urgent: e.target.checked })}
                    className="w-4 h-4 accent-kuma-accent"
                  />
                  <span className="text-sm text-kuma-accent font-bold">🆘 緊急情報として登録</span>
                </label>
                <button
                  type="submit"
                  className="w-full bg-kuma-primary hover:opacity-90 text-kuma-primary-text rounded-lg py-3 font-extrabold text-sm transition-opacity"
                >
                  保存する
                </button>
              </form>
            </div>
          </div>
        )}

        {/* SOS固定ボタン */}
        {!showSOS && !isAdding && (
          <button
            onClick={openSOS}
            className="absolute bottom-16 right-4 z-20 w-16 h-16 rounded-full flex flex-col items-center justify-center shadow-2xl font-extrabold text-white animate-pulse hover:animate-none hover:scale-110 transition-transform"
            style={{ background: 'linear-gradient(135deg,#900000,#FF0000)', boxShadow: '0 0 20px rgba(255,0,0,0.6)' }}
          >
            <span className="text-2xl leading-none">🆘</span>
            <span className="text-[10px] mt-0.5">SOS</span>
          </button>
        )}

        {/* SOSモーダル */}
        {showSOS && (
          <div className="absolute inset-0 bg-black/70 z-30 flex items-center justify-center p-4">
            <div className="bg-[#1a0000] border-2 border-[#FF4444] rounded-2xl shadow-2xl w-full max-w-sm">
              {/* ヘッダー */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#FF4444]/40">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🆘</span>
                  <span className="font-extrabold text-[#FF4444] text-lg">緊急SOS</span>
                </div>
                <button onClick={() => setShowSOS(false)} className="text-kuma-faint hover:text-white text-2xl leading-none">×</button>
              </div>

              <div className="p-5 space-y-4">
                {/* 現在地表示 */}
                <div className="bg-[#2d0000] border border-[#FF4444]/40 rounded-xl p-4">
                  <p className="text-xs text-[#FF4444] font-bold mb-2">📍 現在地</p>
                  {sosGetting ? (
                    <p className="text-sm text-kuma-sub animate-pulse">GPS取得中…</p>
                  ) : sosLocation ? (
                    <div>
                      <p className="text-sm font-bold text-white leading-relaxed">{sosLocation.address}</p>
                      {sosLocation.lat !== 0 && (
                        <p className="text-xs text-kuma-faint mt-1">{sosLocation.lat.toFixed(5)}, {sosLocation.lng.toFixed(5)}</p>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* 110番ボタン */}
                <a
                  href="tel:110"
                  className="flex items-center justify-center gap-3 w-full py-4 rounded-xl font-extrabold text-white text-lg transition-opacity hover:opacity-85"
                  style={{ background: 'linear-gradient(135deg,#900000,#FF0000)' }}
                >
                  <span className="text-2xl">📞</span>
                  <span>110番に発信する</span>
                </a>

                {/* #9110 */}
                <a
                  href="tel:#9110"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-[#FF4444] border border-[#FF4444]/60 text-sm hover:bg-[#FF4444]/10 transition-colors"
                >
                  📞 #9110（警察相談窓口）
                </a>

                {/* LINEシェア */}
                {sosLocation && sosLocation.lat !== 0 && (
                  <a
                    href={`https://line.me/R/share?text=${encodeURIComponent(`🆘緊急！現在地：${sosLocation.address}\nhttps://maps.google.com/?q=${sosLocation.lat},${sosLocation.lng}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-white text-sm hover:opacity-85 transition-opacity"
                    style={{ background: '#06C755' }}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
                    LINEで現在地を送る
                  </a>
                )}

                {/* メール送信 */}
                {sosContact ? (
                  <button
                    onClick={sendSOSEmail}
                    disabled={sosSending || sosSent || !sosLocation || sosLocation.lat === 0}
                    className="w-full py-3 rounded-xl font-bold text-sm transition-opacity disabled:opacity-50"
                    style={{ background: sosSent ? '#166534' : '#7C3AED', color: '#fff' }}
                  >
                    {sosSent ? '✅ メール送信しました' : sosSending ? '送信中…' : `✉️ ${sosContact} にメールを送る`}
                  </button>
                ) : (
                  <Link
                    href="/sos-setup"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-kuma-line text-kuma-sub text-sm hover:border-[#FF4444] hover:text-white transition-colors"
                  >
                    ⚙️ 緊急連絡先を登録する（未設定）
                  </Link>
                )}

                <p className="text-[10px] text-kuma-faint text-center leading-relaxed">
                  ※ まず安全な場所に移動してから操作してください。<br />緊急時は必ず110番に通報してください。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 免責事項モーダル */}
        {showDisclaimer && (
          <div className="absolute inset-0 bg-black/50 z-30 flex items-center justify-center p-4">
            <div className="bg-kuma-card border border-kuma-line rounded-2xl shadow-xl p-6 max-w-sm w-full">
              <h2 className="font-bold text-base text-kuma-ink mb-3">免責事項</h2>
              <div className="text-xs text-kuma-sub space-y-2">
                <p>本サービス「くま！おる！熊！」に掲載されている情報は、ユーザーからの投稿に基づくものであり、情報の正確性・完全性・最新性を保証するものではありません。</p>
                <p>熊に遭遇した場合は、まずご自身の安全を最優先に確保し、必要に応じて警察（110番）や自治体へご連絡ください。本アプリは公的な通報手段を代替するものではありません。</p>
                <p>掲載情報に起因するトラブル・損害について、当サービスは一切の責任を負いません。</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => setShowDisclaimer(false)}
                  className="w-full bg-kuma-primary text-kuma-primary-text text-xs font-extrabold rounded-lg py-2 hover:opacity-90 transition-opacity"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}
        {shareText && (
          <PostSuccessShare
            text={shareText}
            reportText={postReportText}
            prefecture={postPrefecture}
            sightingId={postSightingId}
            onClose={() => {
              setShareText('')
              setPostReportText('')
              setPostPrefecture(null)
              setPostSightingId(null)
            }}
          />
        )}
      </div>
    </main>
  )
}

export default function MapPage() {
  return (
    <Suspense fallback={null}>
      <MapPageInner />
    </Suspense>
  )
}
