import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CATALOG, thumb, posterFor } from './catalog.js'
import { supabase, fetchProfileState } from './supabase.js'
import { Capacitor } from '@capacitor/core'
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in'

// Web OAuth client ID from the Google Cloud project backing Supabase Google sign-in.
// The native plugin always wants the web client ID, even on iOS/Android.
const GOOGLE_WEB_CLIENT_ID = '71192269693-lc8qepuls5k5i07cqa2nd3quvv28huiq.apps.googleusercontent.com'

const catalogIds = new Set(CATALOG.map((c) => c.id))
const validKey = (k) => catalogIds.has(String(k).split(':')[0])
// Drop saved state that points at titles no longer in the catalog, so counts match what is shown.
const sanitizeState = (s) => ({
  myList: (s?.myList || []).filter((id) => catalogIds.has(id)),
  ratings: Object.fromEntries(Object.entries(s?.ratings || {}).filter(([k, v]) => v && catalogIds.has(k))),
  progress: Object.fromEntries(Object.entries(s?.progress || {}).filter(([k]) => validKey(k))),
})

const fmt = (min) => (min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min} min`)

function Badge({ children, color = 'bg-white/15' }) {
  return (
    <span className={`${color} text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded`}>
      {children}
    </span>
  )
}

function PosterCard({ item, progress, onOpen }) {
  const p = progress[item.id]
  return (
    <button onClick={() => onOpen(item)} className="shrink-0 w-32 text-left group">
      <div className="relative w-32 h-[4.5rem] rounded-md overflow-hidden bg-neutral-800">
        <img src={posterFor(item)} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
        {item.award && (
          <span className="absolute top-1 left-1 bg-amber-400 text-black text-[9px] font-bold px-1 py-0.5 rounded">
            {item.award}
          </span>
        )}
        {p && p.d > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30">
            <div className="h-full bg-brand" style={{ width: `${Math.min(100, (p.t / p.d) * 100)}%` }} />
          </div>
        )}
      </div>
      <div className="mt-1 text-xs font-medium leading-tight line-clamp-1">{item.title}</div>
      <div className="text-[10px] text-neutral-400">
        {item.type === 'series' ? `${item.episodes.length} episodes` : fmt(item.runtime)}
      </div>
    </button>
  )
}

function Row({ title, items, progress, onOpen }) {
  if (!items.length) return null
  return (
    <section className="mt-6">
      <h2 className="px-4 text-sm font-semibold mb-2">{title}</h2>
      <div className="flex gap-2 overflow-x-auto px-4 no-scrollbar">
        {items.map((it) => (
          <PosterCard key={it.id} item={it} progress={progress} onOpen={onOpen} />
        ))}
      </div>
    </section>
  )
}

function Hero({ item, inList, onPlay, onToggleList, onOpen }) {
  return (
    <div className="relative">
      <button onClick={() => onOpen(item)} className="block w-full">
        <img src={posterFor(item)} alt={item.title} className="w-full aspect-video object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
      </button>
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="flex gap-1.5 mb-1.5">
          {item.award && <Badge color="bg-amber-400 text-black">{item.award}</Badge>}
          <Badge>{fmt(item.runtime)}</Badge>
        </div>
        <h1 className="text-2xl font-extrabold drop-shadow">{item.title}</h1>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onPlay(item)}
            className="flex-1 bg-white text-black font-bold py-2 rounded flex items-center justify-center gap-1.5"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M8 5v14l11-7z" /></svg>
            Play
          </button>
          <button
            onClick={() => onToggleList(item)}
            className="flex-1 bg-white/20 backdrop-blur font-bold py-2 rounded flex items-center justify-center gap-1.5"
          >
            {inList ? (
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.4-1.4z" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" /></svg>
            )}
            My List
          </button>
        </div>
      </div>
    </div>
  )
}

function useFullscreen() {
  const rootRef = useRef(null)
  const [full, setFull] = useState(false)
  const [fill, setFill] = useState(false)
  useEffect(() => {
    const onChange = () => setFull(!!(document.fullscreenElement || document.webkitFullscreenElement))
    const onKey = (e) => { if (e.key === 'Escape') setFill(false) }
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
      document.removeEventListener('keydown', onKey)
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {})
      if (screen.orientation && screen.orientation.unlock) try { screen.orientation.unlock() } catch (e) {}
    }
  }, [])
  const exit = async () => {
    setFill(false)
    try {
      if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen()
      else if (document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen()
      if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock()
    } catch (e) {}
  }
  const enter = async () => {
    const el = rootRef.current
    try {
      if (el.requestFullscreen) await el.requestFullscreen()
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
      else throw new Error('nofs')
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {})
    } catch (e) {
      setFill(true)
    }
  }
  const active = full || fill
  return { rootRef, active, fill, enter, exit, toggle: () => (active ? exit() : enter()) }
}

const IconBack = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7 fill-none stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
)
const IconPlay = ({ cls = 'w-9 h-9' }) => (<svg viewBox="0 0 24 24" className={`${cls} fill-current`}><path d="M8 5v14l11-7z" /></svg>)
const IconPause = ({ cls = 'w-9 h-9' }) => (<svg viewBox="0 0 24 24" className={`${cls} fill-current`}><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>)
const IconSkip = ({ dir }) => (
  <svg viewBox="0 0 24 24" className="w-9 h-9 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <g transform={dir < 0 ? '' : 'translate(24,0) scale(-1,1)'}>
      <path d="M12 5V2L7.5 6 12 10V7a6 6 0 1 1-6 6" />
    </g>
    <text x="12" y="16.5" fontSize="6.5" textAnchor="middle" className="fill-current stroke-none" fontWeight="700">10</text>
  </svg>
)
const IconFull = ({ exit }) => (
  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {exit ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
  </svg>
)

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

// iOS Safari can't start unmuted playback through the iframe API (no user activation crosses
// the embed boundary), so on iPhone/iPad we use YouTube's native controls instead of ours.
const isIOS = typeof navigator !== 'undefined' && (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

function Scrubber({ pos, onSeek }) {
  const pct = pos.d > 0 ? Math.min(100, (pos.t / pos.d) * 100) : 0
  return (
    <div className="flex items-center gap-3 w-full">
      <input
        type="range" min="0" max={pos.d || 1} step="0.1" value={pos.t}
        onChange={(e) => onSeek(parseFloat(e.target.value))}
        className="flex-1 h-1 accent-red-600 cursor-pointer"
        style={{ background: `linear-gradient(to right,#e50914 ${pct}%,rgba(255,255,255,.3) ${pct}%)`, appearance: 'none', borderRadius: 4 }}
        aria-label="Seek"
      />
      <span className="text-xs tabular-nums text-neutral-200 w-20 text-right">{mmss(pos.t)} / {pos.d ? mmss(pos.d) : '--:--'}</span>
    </div>
  )
}

function Player({ play, onClose, onProgress, onNext }) {
  const ref = useRef(null)
  const fs = useFullscreen()
  const isVimeo = play.provider === 'vimeo'
  const isIG = play.provider === 'instagram'
  const useNative = isIOS && !isVimeo && !isIG
  const playerRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(true)
  const [pos, setPos] = useState({ t: 0, d: 0 })
  const [showUI, setShowUI] = useState(true)
  const hideTimer = useRef(null)
  const lastTap = useRef({ t: 0, x: 0 })

  const poke = () => {
    setShowUI(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowUI(false), 3200)
  }
  useEffect(() => { poke(); return () => clearTimeout(hideTimer.current) }, [fs.active])
  useEffect(() => {
    if (!fs.active || !playing) { clearTimeout(hideTimer.current); setShowUI(true) }
    else poke()
  }, [playing])

  useEffect(() => {
    if (isVimeo || isIG) return
    let interval
    let cancelled = false
    const mount = () => {
      if (cancelled || !ref.current) return
      playerRef.current = new window.YT.Player(ref.current, {
        videoId: play.videoId,
        playerVars: useNative
          ? { autoplay: 0, controls: 1, fs: 1, rel: 0, modestbranding: 1, playsinline: 1 }
          : { autoplay: 1, controls: 0, disablekb: 1, fs: 0, rel: 0, modestbranding: 1, playsinline: 1, iv_load_policy: 3 },
        events: {
          onReady: () => setReady(true),
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.PLAYING) setPlaying(true)
            if (e.data === window.YT.PlayerState.PAUSED) setPlaying(false)
            if (e.data === window.YT.PlayerState.ENDED) {
              const pl = playerRef.current
              if (pl && pl.getDuration) onProgress(play.key, pl.getDuration(), pl.getDuration())
              if (onNext) onNext()
            }
          },
        },
      })
      interval = setInterval(() => {
        const pl = playerRef.current
        if (pl && pl.getCurrentTime && pl.getDuration) {
          const t = pl.getCurrentTime()
          const d = pl.getDuration() || 0
          setPos({ t, d })
          onProgress(play.key, t, d)
        }
      }, 500)
    }
    if (window.YT && window.YT.Player) {
      mount()
    } else {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        if (prev) prev()
        mount()
      }
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement('script')
        tag.src = 'https://www.youtube.com/iframe_api'
        document.body.appendChild(tag)
      }
    }
    return () => {
      cancelled = true
      clearInterval(interval)
      if (playerRef.current && playerRef.current.destroy) playerRef.current.destroy()
    }
  }, [play.videoId])

  const skip = (delta) => {
    const pl = playerRef.current
    if (pl && pl.getCurrentTime) pl.seekTo(Math.max(0, pl.getCurrentTime() + delta), true)
    poke()
  }
  const seekTo = (t) => {
    const pl = playerRef.current
    if (pl && pl.seekTo) { pl.seekTo(t, true); setPos((p) => ({ ...p, t })) }
    poke()
  }
  const toggle = () => {
    const pl = playerRef.current
    if (!pl) return
    if (playing) pl.pauseVideo()
    else pl.playVideo()
  }
  const closeAll = () => { if (fs.active) fs.exit(); onClose() }
  const back = () => (fs.active ? fs.exit() : onClose())

  // Tap on the video: double-tap left/right skips 10s; single tap shows/hides controls
  const onTap = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const now = Date.now()
    const lt = lastTap.current
    if (now - lt.t < 320 && Math.abs(x - lt.x) < 0.3 && (x < 0.35 || x > 0.65)) {
      skip(x < 0.5 ? -10 : 10)
      lastTap.current = { t: 0, x }
      return
    }
    lastTap.current = { t: now, x }
    if (fs.active) {
      if (showUI) { clearTimeout(hideTimer.current); setShowUI(false) } else poke()
    } else if (!isVimeo && !isIG) {
      toggle()
    }
  }

  const rootCls = fs.fill ? 'fixed inset-0 z-[60] bg-black fs-fill' : 'fixed inset-0 z-50 bg-black'
  const videoCls = fs.active ? 'absolute inset-0 bg-black' : 'relative w-full aspect-video max-h-[55vh] bg-neutral-900'
  const uiCls = `transition-opacity duration-300 ${showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'}`

  return (
    <div ref={fs.rootRef} className={`${rootCls} ${fs.active ? '' : 'flex flex-col'} select-none fs-root`} onMouseMove={fs.active ? poke : undefined}>
      {!fs.active && (
        <div className="flex items-center justify-between p-3">
          <button onClick={onClose} className="flex items-center gap-1 text-sm font-semibold pr-3 min-w-0" aria-label="Back">
            <IconBack /><span className="truncate">{play.label}</span>
          </button>
          <button onClick={closeAll} className="text-2xl leading-none px-2" aria-label="Close">&times;</button>
        </div>
      )}
      <div className={videoCls}>
        {isVimeo || isIG ? (
          <iframe
            src={
              isIG
                ? `https://www.instagram.com/reel/${play.videoId}/embed`
                : `https://player.vimeo.com/video/${play.videoId}?autoplay=1&playsinline=1&title=0`
            }
            className="w-full h-full" frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={play.label}
          />
        ) : (
          <div ref={ref} className="w-full h-full" />
        )}
        {/* YouTube: transparent layer takes taps so our controls replace the native ones */}
        {!isVimeo && !isIG && !useNative && <div className="absolute inset-0 z-10" onClick={onTap} />}

        {fs.active && !isVimeo && !isIG && !useNative && (
          <div className={`absolute inset-0 z-20 pointer-events-none ${uiCls}`}>
            <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-black/80 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 h-36 bg-gradient-to-t from-black/85 to-transparent" />
            <div className="absolute top-0 inset-x-0 flex items-center gap-2 px-4 pt-4 pointer-events-auto">
              <button onClick={fs.exit} className="p-2 -ml-2 rounded-full bg-black/40" aria-label="Exit full screen"><IconBack /></button>
              <div className="text-base font-semibold truncate">{play.label}</div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center gap-14">
              <button onClick={() => skip(-10)} className="pointer-events-auto p-2" aria-label="Back 10 seconds"><IconSkip dir={-1} /></button>
              <button onClick={toggle} className="pointer-events-auto p-3 rounded-full bg-black/40" aria-label={playing ? 'Pause' : 'Play'}>
                {playing ? <IconPause cls="w-12 h-12" /> : <IconPlay cls="w-12 h-12" />}
              </button>
              <button onClick={() => skip(10)} className="pointer-events-auto p-2" aria-label="Forward 10 seconds"><IconSkip dir={1} /></button>
            </div>
            <div className="absolute bottom-0 inset-x-0 px-5 pb-5 pointer-events-auto">
              <Scrubber pos={pos} onSeek={seekTo} />
              <div className="flex items-center justify-between mt-2">
                {onNext ? (
                  <button onClick={onNext} className="text-sm font-semibold">Next episode</button>
                ) : <span />}
                <button onClick={fs.exit} className="flex items-center gap-1 text-sm font-semibold" aria-label="Exit full screen"><IconFull exit /> Exit full screen</button>
              </div>
            </div>
          </div>
        )}

        {fs.active && (isVimeo || isIG) && (
          <div className="absolute top-0 inset-x-0 z-20 flex items-center gap-2 px-3 pt-3 pointer-events-none">
            <button onClick={fs.exit} className="pointer-events-auto flex items-center gap-1 rounded-full bg-black/60 pl-1 pr-4 py-1.5 text-sm font-semibold" aria-label="Exit full screen">
              <IconBack /> Back
            </button>
          </div>
        )}
      </div>

      {!fs.active && (
        <div className="p-4">
          {!isVimeo && !isIG && !useNative && (
            <>
              <Scrubber pos={pos} onSeek={seekTo} />
              <div className="flex items-center justify-center gap-8 mt-3">
                <button onClick={() => skip(-10)} aria-label="Back 10 seconds"><IconSkip dir={-1} /></button>
                <button onClick={toggle} disabled={!ready} className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center disabled:opacity-40" aria-label={playing ? 'Pause' : 'Play'}>
                  {playing ? <IconPause cls="w-6 h-6" /> : <IconPlay cls="w-6 h-6" />}
                </button>
                <button onClick={() => skip(10)} aria-label="Forward 10 seconds"><IconSkip dir={1} /></button>
              </div>
            </>
          )}
          <button onClick={fs.enter} className="mt-4 w-full bg-white/10 py-2.5 rounded font-semibold text-sm flex items-center justify-center gap-2">
            <IconFull /> Full screen
          </button>
          {onNext && !isVimeo && !isIG && (
            <button onClick={onNext} className="mt-3 w-full bg-white/10 py-2 rounded font-semibold text-sm">Next episode</button>
          )}
          <p className="mt-4 text-center text-[11px] text-neutral-500">
            {isIG
              ? 'Real video, streamed with the official Instagram embed. Watch progress is not saved for these.'
              : isVimeo
                ? "Real video, streamed with the film's official Vimeo embed."
                : "Real video, streamed from the film's official YouTube channel."}
          </p>
        </div>
      )}
    </div>
  )
}

function Detail({ item, inList, rating, progress, onClose, onPlay, onToggleList, onRate, onOpenEpisode, onOpenSimilar }) {
  const similar = CATALOG.filter(
    (c) => c.id !== item.id && c.genres.some((g) => item.genres.includes(g)),
  ).slice(0, 8)
  return (
    <div className="fixed inset-0 z-40 bg-[#0a0a0a] overflow-y-auto">
      <div className="relative">
        <img src={posterFor(item)} alt={item.title} className="w-full aspect-video object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-black/40" />
        <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-xl" aria-label="Back">
          &times;
        </button>
      </div>
      <div className="p-4 -mt-6 relative">
        <h1 className="text-2xl font-extrabold">{item.title}</h1>
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {item.award && <Badge color="bg-amber-400 text-black">{item.award}</Badge>}
          {item.year && <Badge>{item.year}</Badge>}
          {item.type === 'series' ? <Badge>{item.episodes.length} episodes</Badge> : <Badge>{fmt(item.runtime)}</Badge>}
          {item.genres.map((g) => (
            <Badge key={g}>{g}</Badge>
          ))}
        </div>
        {item.type === 'film' && (
          <button
            onClick={() => onPlay(item)}
            className="mt-4 w-full bg-white text-black font-bold py-2.5 rounded flex items-center justify-center gap-2"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M8 5v14l11-7z" /></svg>
            Play
          </button>
        )}
        <div className="flex gap-2 mt-2">
          <button onClick={() => onToggleList(item)} className="flex-1 bg-white/10 py-2.5 rounded font-semibold text-sm">
            {inList ? 'In My List' : '+ My List'}
          </button>
          <button
            onClick={() => onRate(item, rating === 'up' ? null : 'up')}
            className={`px-4 rounded font-semibold text-sm ${rating === 'up' ? 'bg-brand' : 'bg-white/10'}`}
            aria-label="Thumbs up"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M2 21h4V9H2v12zM23 10c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" /></svg>
          </button>
          <button
            onClick={() => onRate(item, rating === 'down' ? null : 'down')}
            className={`px-4 rounded font-semibold text-sm ${rating === 'down' ? 'bg-brand' : 'bg-white/10'}`}
            aria-label="Thumbs down"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current rotate-180"><path d="M2 21h4V9H2v12zM23 10c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" /></svg>
          </button>
        </div>
        <p className="mt-4 text-sm text-neutral-300 leading-relaxed">{item.synopsis}</p>
        <p className="mt-2 text-xs text-neutral-500">
          {item.credit
            ? <>Free on {item.channel}, by {item.credit}.{' '}
                <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="underline">Watch on Vimeo</a></>
            : `Free on the ${item.channel} YouTube channel.`}
        </p>

        {item.type === 'series' && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold mb-2">Episodes</h2>
            {item.episodes.map((ep, i) => {
              const p = progress[`${item.id}:${ep.id}`]
              return (
                <button
                  key={ep.id}
                  onClick={() => onOpenEpisode(item, i)}
                  className="w-full flex items-center gap-3 py-2 text-left"
                >
                  <span className="text-neutral-500 w-4 text-sm">{i + 1}</span>
                  <div className="relative w-24 h-14 rounded overflow-hidden bg-neutral-800 shrink-0">
                    <img src={thumb(ep.videoId)} alt={ep.title} className="w-full h-full object-cover" loading="lazy" />
                    {p && p.d > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/30">
                        <div className="h-full bg-brand" style={{ width: `${Math.min(100, (p.t / p.d) * 100)}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{ep.title}</div>
                    <div className="text-xs text-neutral-400">{fmt(ep.runtime)}</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {similar.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold mb-2">More Like This</h2>
            <div className="grid grid-cols-3 gap-2">
              {similar.map((s) => (
                <button key={s.id} onClick={() => onOpenSimilar(s)} className="text-left">
                  <img src={posterFor(s)} alt={s.title} className="w-full aspect-video object-cover rounded" loading="lazy" />
                  <div className="mt-1 text-[11px] font-medium line-clamp-1">{s.title}</div>
                  <div className="text-[10px] text-neutral-500">{s.type === 'series' ? 'Series' : fmt(s.runtime)}</div>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="h-8" />
      </div>
    </div>
  )
}

function BottomNav({ tab, setTab }) {
  const Item = ({ id, label, icon }) => (
    <button
      onClick={() => setTab(id)}
      className={`flex-1 flex flex-col items-center py-2 ${tab === id ? 'text-white' : 'text-neutral-500'}`}
    >
      {icon}
      <span className="text-[10px] mt-0.5">{label}</span>
    </button>
  )
  const cls = 'w-6 h-6 fill-current'
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-black/90 backdrop-blur border-t border-white/10 flex">
      <Item id="home" label="Home" icon={<svg viewBox="0 0 24 24" className={cls}><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>} />
      <Item id="search" label="Search" icon={<svg viewBox="0 0 24 24" className={cls}><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z" /></svg>} />
      <Item id="list" label="My List" icon={<svg viewBox="0 0 24 24" className={cls}><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h10v2H4z" /></svg>} />
      <Item id="me" label="Me" icon={<svg viewBox="0 0 24 24" className={cls}><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-3.34 0-10 1.67-10 5v3h20v-3c0-3.33-6.66-5-10-5z" /></svg>} />
    </nav>
  )
}

const AVATARS = [
  { id: 'red', cls: 'bg-red-600' },
  { id: 'blue', cls: 'bg-sky-600' },
  { id: 'green', cls: 'bg-emerald-600' },
  { id: 'purple', cls: 'bg-violet-600' },
  { id: 'amber', cls: 'bg-amber-500' },
  { id: 'pink', cls: 'bg-pink-600' },
]
const avatarCls = (id) => (AVATARS.find((a) => a.id === id) || AVATARS[0]).cls

function AvatarBadge({ profile, size = 'w-7 h-7 text-xs' }) {
  return (
    <span className={`${size} ${avatarCls(profile.avatar)} rounded-full flex items-center justify-center font-bold uppercase select-none`}>
      {(profile.name || '?').slice(0, 1)}
    </span>
  )
}

function AuthScreen() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [error, setError] = useState(null)
  const googleSignIn = async () => {
    setGoogleBusy(true)
    setError(null)
    try {
      if (Capacitor.isNativePlatform()) {
        // Inside the app, Google's policy blocks OAuth in a webview, so use the
        // native Google Sign-In sheet and hand Supabase the resulting ID token.
        await GoogleSignIn.initialize({ clientId: GOOGLE_WEB_CLIENT_ID })
        const { idToken } = await GoogleSignIn.signIn()
        const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin + window.location.pathname },
        })
        if (error) throw error
      }
    } catch (e) {
      setError(e.message || 'Google sign-in failed')
    }
    setGoogleBusy(false)
  }
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    })
    setBusy(false)
    if (error) setError(error.message)
    else setSent(true)
  }
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-6">
      <div className="text-brand font-extrabold text-3xl tracking-tight mb-2">SHORTFLIX</div>
      <p className="text-sm text-neutral-400 mb-8 text-center max-w-xs">
        Great short films, free. Sign in to keep your list, ratings and watch progress on every device.
      </p>
      {sent ? (
        <div className="text-center max-w-xs">
          <div className="text-lg font-semibold mb-2">Check your email</div>
          <p className="text-sm text-neutral-400">
            We sent a sign-in link to <span className="text-white">{email}</span>. Open it on this device to continue.
          </p>
          <button onClick={() => setSent(false)} className="mt-6 text-sm text-neutral-400 underline">
            Use a different email
          </button>
        </div>
      ) : (
        <>
        <div className="w-full max-w-xs">
          <button
            onClick={googleSignIn}
            disabled={googleBusy}
            className="w-full bg-white text-black font-bold py-3 rounded flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            {googleBusy ? 'Redirecting...' : 'Continue with Google'}
          </button>
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-neutral-800" />
            <span className="text-xs text-neutral-500">or</span>
            <div className="flex-1 h-px bg-neutral-800" />
          </div>
        </div>
        <form onSubmit={submit} className="w-full max-w-xs">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full bg-neutral-800 rounded px-4 py-3 text-sm outline-none placeholder:text-neutral-500"
          />
          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
          <button disabled={busy} className="mt-3 w-full bg-brand text-white font-bold py-3 rounded disabled:opacity-50">
            {busy ? 'Sending...' : 'Continue with email'}
          </button>
          <p className="text-[11px] text-neutral-500 mt-4 text-center">No password needed. We email you a sign-in link.</p>
        </form>
        </>
      )}
    </div>
  )
}

function ProfileGate({ profiles, onSelect, onCreate, onSignOut }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('red')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const create = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    setError(null)
    const err = await onCreate(name.trim(), avatar)
    setBusy(false)
    if (err) setError(err)
  }
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-6">
      <div className="text-brand font-extrabold text-2xl tracking-tight mb-10">SHORTFLIX</div>
      <h1 className="text-xl font-semibold mb-8">Who's watching?</h1>
      <div className="flex flex-wrap justify-center gap-5 max-w-sm">
        {profiles.map((p) => (
          <button key={p.id} onClick={() => onSelect(p)} className="flex flex-col items-center gap-2 group">
            <span className={`w-20 h-20 ${avatarCls(p.avatar)} rounded-lg flex items-center justify-center text-3xl font-extrabold uppercase group-hover:ring-2 ring-white`}>
              {p.name.slice(0, 1)}
            </span>
            <span className="text-sm text-neutral-300 group-hover:text-white max-w-[5.5rem] truncate">{p.name}</span>
          </button>
        ))}
        {!adding && profiles.length < 5 && (
          <button onClick={() => setAdding(true)} className="flex flex-col items-center gap-2 group">
            <span className="w-20 h-20 rounded-lg border-2 border-dashed border-neutral-700 flex items-center justify-center text-3xl text-neutral-500 group-hover:border-neutral-400 group-hover:text-neutral-300">+</span>
            <span className="text-sm text-neutral-500 group-hover:text-neutral-300">Add profile</span>
          </button>
        )}
      </div>
      {adding && (
        <form onSubmit={create} className="mt-8 w-full max-w-xs">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Profile name"
            maxLength={40}
            autoFocus
            className="w-full bg-neutral-800 rounded px-4 py-3 text-sm outline-none placeholder:text-neutral-500"
          />
          <div className="flex justify-center gap-2 mt-4">
            {AVATARS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAvatar(a.id)}
                className={`w-8 h-8 rounded-full ${a.cls} ${avatar === a.id ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`}
                aria-label={a.id}
              />
            ))}
          </div>
          {error && <p className="text-red-400 text-xs mt-3 text-center">{error}</p>}
          <div className="flex gap-2 mt-5">
            <button type="button" onClick={() => setAdding(false)} className="flex-1 bg-white/10 py-2.5 rounded text-sm font-semibold">
              Cancel
            </button>
            <button disabled={busy || !name.trim()} className="flex-1 bg-brand py-2.5 rounded text-sm font-bold disabled:opacity-50">
              {busy ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}
      <button onClick={onSignOut} className="mt-12 text-xs text-neutral-500 underline">Sign out</button>
    </div>
  )
}

function Splash() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
      <div className="text-brand font-extrabold text-3xl tracking-tight animate-pulse">SHORTFLIX</div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = still loading
  const [profiles, setProfiles] = useState(null)
  const [profile, setProfile] = useState(null)

  const [tab, setTab] = useState('home')
  const [chip, setChip] = useState('All')
  const [detailId, setDetailId] = useState(() => {
    const t = new URLSearchParams(window.location.search).get('title')
    return t && CATALOG.some((c) => c.id === t) ? t : null
  })
  const [play, setPlay] = useState(null) // { videoId, key, label, seriesId?, epIndex? }
  const [query, setQuery] = useState('')
  const [myList, setMyList] = useState([])
  const [progress, setProgress] = useState({})
  const [ratings, setRatings] = useState({})

  // Latest values for sync helpers, so async writes never use stale closures.
  const refs = useRef({})
  refs.current = { profile, myList, ratings, progress, play }
  const lastProgressSync = useRef({})

  const cacheState = (pid, s) => {
    try {
      window.localStorage.setItem(`sf_state_${pid}`, JSON.stringify(s))
    } catch {}
  }

  // Auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Profiles for the signed-in user
  useEffect(() => {
    if (!session) {
      setProfiles(null)
      setProfile(null)
      return
    }
    supabase
      .from('profiles')
      .select('id, name, avatar')
      .order('created_at')
      .then(({ data, error }) => {
        const list = error ? [] : data || []
        setProfiles(list)
        // Re-enter the profile that was active on this device, if it still exists.
        try {
          const active = window.localStorage.getItem('sf_active_profile')
          const p = active && list.find((x) => x.id === active)
          if (p) activateProfile(p)
        } catch {}
      })
  }, [session])

  const activateProfile = async (p) => {
    try {
      window.localStorage.setItem('sf_active_profile', p.id)
    } catch {}
    setProfile(p)
    lastProgressSync.current = {}
    // Show this device's cached copy instantly, then replace with the database copy.
    try {
      const raw = window.localStorage.getItem(`sf_state_${p.id}`)
      const s = sanitizeState(raw ? JSON.parse(raw) : null)
      setMyList(s.myList)
      setRatings(s.ratings)
      setProgress(s.progress)
    } catch {
      setMyList([])
      setRatings({})
      setProgress({})
    }
    try {
      const s = sanitizeState(await fetchProfileState(p.id))
      // Only apply if this profile is still the active one.
      if (refs.current.profile?.id !== p.id) return
      setMyList(s.myList)
      setRatings(s.ratings)
      setProgress(s.progress)
      cacheState(p.id, s)
    } catch (e) {
      // Offline or API error: keep the cached copy.
    }
  }

  const createProfile = async (name, avatar) => {
    const { data, error } = await supabase
      .from('profiles')
      .insert({ user_id: session.user.id, name, avatar })
      .select('id, name, avatar')
      .single()
    if (error) return error.message
    const p = data
    // First profile on this account inherits whatever this browser saved before login existed.
    if ((profiles || []).length === 0) {
      try {
        const l = JSON.parse(window.localStorage.getItem('sf_mylist') || '[]').filter((f) => catalogIds.has(f))
        const r = Object.fromEntries(Object.entries(JSON.parse(window.localStorage.getItem('sf_ratings') || '{}')).filter(([k]) => catalogIds.has(k)))
        const pr = Object.fromEntries(Object.entries(JSON.parse(window.localStorage.getItem('sf_progress') || '{}')).filter(([k]) => validKey(k)))
        if (l.length) await supabase.from('list_items').upsert(l.map((f) => ({ profile_id: p.id, film_id: f })))
        const ratingRows = Object.entries(r).filter(([, v]) => v).map(([f, v]) => ({ profile_id: p.id, film_id: f, rating: v }))
        if (ratingRows.length) await supabase.from('ratings').upsert(ratingRows)
        const progRows = Object.entries(pr).map(([k, v]) => ({
          profile_id: p.id,
          item_key: k,
          position_seconds: (v && v.t) || 0,
          duration_seconds: (v && v.d) || 0,
        }))
        if (progRows.length) await supabase.from('watch_progress').upsert(progRows)
        window.localStorage.removeItem('sf_mylist')
        window.localStorage.removeItem('sf_ratings')
        window.localStorage.removeItem('sf_progress')
      } catch {}
    }
    setProfiles((prev) => [...(prev || []), p])
    activateProfile(p)
    return null
  }

  const switchProfile = () => {
    flushProgress()
    try {
      window.localStorage.removeItem('sf_active_profile')
    } catch {}
    setProfile(null)
    setPlay(null)
    setDetailId(null)
    setTab('home')
  }

  const signOut = async () => {
    flushProgress()
    try {
      window.localStorage.removeItem('sf_active_profile')
    } catch {}
    await supabase.auth.signOut()
    setProfile(null)
    setTab('home')
  }

  const detail = CATALOG.find((c) => c.id === detailId) || null
  const featured = CATALOG.find((c) => c.featured) || CATALOG[0]

  const chipFilter = (items) =>
    items.filter((c) => (chip === 'All' ? true : chip === 'Films' ? c.type === 'film' : c.type === 'series'))

  const rows = useMemo(() => {
    const base = chipFilter(CATALOG)
    return {
      continueWatching: base.filter((c) => {
        if (progress[c.id] && progress[c.id].t > 10) return true
        if (c.type === 'series') return c.episodes.some((ep) => (progress[`${c.id}:${ep.id}`] || {}).t > 10)
        return false
      }),
      trending: base.filter((c) => c.trending),
      awarded: base.filter((c) => c.award),
      series: base.filter((c) => c.type === 'series'),
      under5: base.filter((c) => c.type === 'film' && c.runtime <= 5),
      under10: base.filter((c) => c.type === 'film' && c.runtime < 10),
      around20: base.filter((c) => c.type === 'film' && c.runtime >= 15 && c.runtime <= 25),
      feelGood: base.filter((c) => c.genres.includes('Family')),
      laughs: base.filter((c) => c.genres.includes('Comedy')),
      edge: base.filter((c) => c.genres.includes('Horror') || c.genres.includes('Thriller')),
      scifi: base.filter((c) => c.genres.includes('Sci-Fi')),
      animated: base.filter((c) => c.genres.includes('Animation')),
      trueStories: base.filter((c) => c.genres.includes('Documentary')),
      love: base.filter((c) => c.genres.includes('Romance')),
      all: base,
    }
  }, [chip, progress])

  const toggleList = (item) => {
    const { profile: prof, ratings: r, progress: pr } = refs.current
    if (!prof) return
    const has = myList.includes(item.id)
    const next = has ? myList.filter((i) => i !== item.id) : [...myList, item.id]
    setMyList(next)
    cacheState(prof.id, { myList: next, ratings: r, progress: pr })
    const op = has
      ? supabase.from('list_items').delete().eq('profile_id', prof.id).eq('film_id', item.id)
      : supabase.from('list_items').upsert({ profile_id: prof.id, film_id: item.id })
    op.then(({ error }) => error && console.warn('list sync failed', error))
  }

  const rate = (item, r) => {
    const { profile: prof, myList: ml, progress: pr } = refs.current
    if (!prof) return
    const next = { ...ratings, [item.id]: r }
    setRatings(next)
    cacheState(prof.id, { myList: ml, ratings: next, progress: pr })
    const op =
      r == null
        ? supabase.from('ratings').delete().eq('profile_id', prof.id).eq('film_id', item.id)
        : supabase.from('ratings').upsert({ profile_id: prof.id, film_id: item.id, rating: r, updated_at: new Date().toISOString() })
    op.then(({ error }) => error && console.warn('rating sync failed', error))
  }

  const syncProgress = (key, t, d) => {
    const prof = refs.current.profile
    if (!prof) return
    supabase
      .from('watch_progress')
      .upsert({
        profile_id: prof.id,
        item_key: key,
        position_seconds: t,
        duration_seconds: d,
        updated_at: new Date().toISOString(),
      })
      .then(({ error }) => error && console.warn('progress sync failed', error))
  }

  // Called every 500ms while the player runs. Local save is instant; the database
  // gets an update about every 10s per title, plus immediately when nearly finished.
  const saveProgress = (key, t, d) => {
    const { profile: prof, myList: ml, ratings: r } = refs.current
    if (!prof) return
    setProgress((prev) => {
      const next = { ...prev, [key]: { t, d } }
      cacheState(prof.id, { myList: ml, ratings: r, progress: next })
      return next
    })
    const now = Date.now()
    const done = d > 0 && t / d > 0.9
    if (done || now - (lastProgressSync.current[key] || 0) > 10000) {
      lastProgressSync.current[key] = now
      syncProgress(key, t, d)
    }
  }

  function flushProgress() {
    const { profile: prof, progress: pr, play: pl } = refs.current
    if (!prof || !pl) return
    const cur = pr[pl.key]
    if (cur) syncProgress(pl.key, cur.t, cur.d)
  }

  const openPlay = (item, epIndex = null) => {
    if (item.type === 'series' && epIndex !== null) {
      const ep = item.episodes[epIndex]
      setPlay({ videoId: ep.videoId, key: `${item.id}:${ep.id}`, label: `${item.title}: ${ep.title}`, seriesId: item.id, epIndex, provider: ep.provider || item.provider })
    } else if (item.type === 'series') {
      const ep = item.episodes[0]
      setPlay({ videoId: ep.videoId, key: `${item.id}:${ep.id}`, label: `${item.title}: ${ep.title}`, seriesId: item.id, epIndex: 0, provider: ep.provider || item.provider })
    } else {
      setPlay({ videoId: item.videoId, key: item.id, label: item.title, provider: item.provider })
    }
  }

  // Deep link: ?play=<id> opens the player on load.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('play')
    if (!p) return
    const item = CATALOG.find((c) => c.id === p)
    if (item) openPlay(item)
  }, [])

  const closePlayer = () => {
    flushProgress()
    setPlay(null)
  }

  const nextEpisode = () => {
    if (!play || play.seriesId == null) return null
    const series = CATALOG.find((c) => c.id === play.seriesId)
    if (!series || play.epIndex + 1 >= series.episodes.length) return null
    return () => openPlay(series, play.epIndex + 1)
  }

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return CATALOG.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.genres.some((g) => g.toLowerCase().includes(q)) ||
        (c.award || '').toLowerCase().includes(q) ||
        (c.synopsis || '').toLowerCase().includes(q),
    )
  }, [query])

  const listItems = CATALOG.filter((c) => myList.includes(c.id))
  const watchedCount = Object.values(progress).filter((p) => p.d > 0 && p.t / p.d > 0.9).length

  if (session === undefined || (session && profiles === null)) return <Splash />
  if (!session) return <AuthScreen />
  if (!profile) {
    return <ProfileGate profiles={profiles || []} onSelect={activateProfile} onCreate={createProfile} onSignOut={signOut} />
  }

  return (
    <div className="min-h-full bg-[#0a0a0a] text-white pb-20 max-w-xl mx-auto">
      {tab === 'home' && (
        <>
          <header className="sticky top-0 z-20 bg-gradient-to-b from-black to-transparent px-4 pt-3 pb-2 flex items-center justify-between">
            <div className="text-brand font-extrabold text-xl tracking-tight">SHORTFLIX</div>
            <div className="flex gap-1 items-center">
              {['All', 'Films', 'Series'].map((c) => (
                <button
                  key={c}
                  onClick={() => setChip(c)}
                  className={`text-xs px-3 py-1 rounded-full border ${chip === c ? 'bg-white text-black border-white' : 'border-white/30 text-neutral-300'}`}
                >
                  {c}
                </button>
              ))}
              <button onClick={switchProfile} className="ml-1" aria-label="Switch profile" title="Switch profile">
                <AvatarBadge profile={profile} />
              </button>
            </div>
          </header>
          <Hero
            item={featured}
            inList={myList.includes(featured.id)}
            onPlay={() => openPlay(featured)}
            onToggleList={toggleList}
            onOpen={(it) => setDetailId(it.id)}
          />
          <Row title="Continue Watching" items={rows.continueWatching} progress={progress} onOpen={(it) => setDetailId(it.id)} />
          <Row title="Trending Now" items={rows.trending} progress={progress} onOpen={(it) => setDetailId(it.id)} />
          <Row title="Award-Winning Shorts" items={rows.awarded} progress={progress} onOpen={(it) => setDetailId(it.id)} />
          <Row title="Short Film Series" items={rows.series} progress={progress} onOpen={(it) => setDetailId(it.id)} />
          <Row title="Feel-Good Picks" items={rows.feelGood} progress={progress} onOpen={(it) => setDetailId(it.id)} />
          <Row title="Laugh Track" items={rows.laughs} progress={progress} onOpen={(it) => setDetailId(it.id)} />
          <Row title="Edge of Your Seat" items={rows.edge} progress={progress} onOpen={(it) => setDetailId(it.id)} />
          <Row title="Sci-Fi Futures" items={rows.scifi} progress={progress} onOpen={(it) => setDetailId(it.id)} />
          <Row title="Animated Worlds" items={rows.animated} progress={progress} onOpen={(it) => setDetailId(it.id)} />
          <Row title="True Stories" items={rows.trueStories} progress={progress} onOpen={(it) => setDetailId(it.id)} />
          <Row title="Love & Heart" items={rows.love} progress={progress} onOpen={(it) => setDetailId(it.id)} />
          <Row title="Under 5 Minutes" items={rows.under5} progress={progress} onOpen={(it) => setDetailId(it.id)} />
          <Row title="Under 10 Minutes" items={rows.under10} progress={progress} onOpen={(it) => setDetailId(it.id)} />
          <Row title="Around 20 Minutes" items={rows.around20} progress={progress} onOpen={(it) => setDetailId(it.id)} />
          <Row title="Everything" items={rows.all} progress={progress} onOpen={(it) => setDetailId(it.id)} />
        </>
      )}

      {tab === 'search' && (
        <div className="px-4 pt-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles, genres, awards"
            className="w-full bg-neutral-800 rounded px-4 py-3 text-sm outline-none placeholder:text-neutral-500"
            autoFocus
          />
          <div className="grid grid-cols-3 gap-2 mt-4">
            {(query ? searchResults : CATALOG).map((it) => (
              <button key={it.id} onClick={() => setDetailId(it.id)} className="text-left">
                <img src={posterFor(it)} alt={it.title} className="w-full aspect-video object-cover rounded" loading="lazy" />
                <div className="mt-1 text-[11px] font-medium line-clamp-1">{it.title}</div>
                <div className="text-[10px] text-neutral-500">{it.type === 'series' ? 'Series' : fmt(it.runtime)}</div>
              </button>
            ))}
          </div>
          {query && searchResults.length === 0 && (
            <p className="text-sm text-neutral-500 mt-6 text-center">No matches. Try a genre like horror or sci-fi.</p>
          )}
        </div>
      )}

      {tab === 'list' && (
        <div className="px-4 pt-4">
          <h1 className="text-xl font-bold">My List</h1>
          {listItems.length === 0 ? (
            <p className="text-sm text-neutral-500 mt-4">Nothing here yet. Add films from their detail pages.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 mt-4">
              {listItems.map((it) => (
                <button key={it.id} onClick={() => setDetailId(it.id)} className="text-left">
                  <img src={posterFor(it)} alt={it.title} className="w-full aspect-video object-cover rounded" loading="lazy" />
                  <div className="mt-1 text-[11px] font-medium line-clamp-1">{it.title}</div>
                  <div className="text-[10px] text-neutral-500">{it.type === 'series' ? 'Series' : fmt(it.runtime)}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'me' && (
        <div className="px-4 pt-4">
          <div className="flex items-center gap-3">
            <AvatarBadge profile={profile} size="w-11 h-11 text-lg" />
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">{profile.name}</h1>
              <div className="text-xs text-neutral-400 truncate">{session.user.email}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div className="bg-neutral-800 rounded p-4">
              <div className="text-2xl font-extrabold">{myList.length}</div>
              <div className="text-[11px] text-neutral-400">In My List</div>
            </div>
            <div className="bg-neutral-800 rounded p-4">
              <div className="text-2xl font-extrabold">{watchedCount}</div>
              <div className="text-[11px] text-neutral-400">Watched</div>
            </div>
            <div className="bg-neutral-800 rounded p-4">
              <div className="text-2xl font-extrabold">{Object.values(ratings).filter(Boolean).length}</div>
              <div className="text-[11px] text-neutral-400">Rated</div>
            </div>
          </div>
          <button onClick={switchProfile} className="mt-4 w-full bg-white/10 py-2.5 rounded font-semibold text-sm">
            Switch profile
          </button>
          <button onClick={signOut} className="mt-2 w-full bg-white/10 py-2.5 rounded font-semibold text-sm text-neutral-300">
            Sign out
          </button>
          <p className="text-xs text-neutral-500 mt-6 leading-relaxed">
            Shortflix prototype. Every film streams free from its official YouTube channel. Your list, ratings and watch
            progress sync to your account and follow this profile across devices.
          </p>
        </div>
      )}

      {detail && (
        <Detail
          item={detail}
          inList={myList.includes(detail.id)}
          rating={ratings[detail.id] || null}
          progress={progress}
          onClose={() => setDetailId(null)}
          onPlay={(it) => openPlay(it)}
          onToggleList={toggleList}
          onRate={rate}
          onOpenEpisode={(it, i) => openPlay(it, i)}
          onOpenSimilar={(it) => setDetailId(it.id)}
        />
      )}

      {play && (
        <Player
          play={play}
          onClose={closePlayer}
          onProgress={saveProgress}
          onNext={nextEpisode() || undefined}
        />
      )}

      <BottomNav tab={tab} setTab={setTab} />
    </div>
  )
}
