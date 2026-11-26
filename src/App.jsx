import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CATALOG, thumb, posterFor } from './catalog.js'

function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key)
      return raw ? JSON.parse(raw) : initial
    } catch {
      return initial
    }
  })
  const set = (v) => {
    setValue((prev) => {
      const next = typeof v === 'function' ? v(prev) : v
      try {
        window.localStorage.setItem(key, JSON.stringify(next))
      } catch {}
      return next
    })
  }
  return [value, set]
}

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
  const useNative = isIOS && !isVimeo
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
    if (isVimeo) return
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
    } else if (!isVimeo) {
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
        {isVimeo ? (
          <iframe
            src={`https://player.vimeo.com/video/${play.videoId}?autoplay=1&playsinline=1&title=0`}
            className="w-full h-full" frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={play.label}
          />
        ) : (
          <div ref={ref} className="w-full h-full" />
        )}
        {/* YouTube: transparent layer takes taps so our controls replace the native ones */}
        {!isVimeo && !useNative && <div className="absolute inset-0 z-10" onClick={onTap} />}

        {fs.active && !isVimeo && !useNative && (
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

        {fs.active && isVimeo && (
          <div className="absolute top-0 inset-x-0 z-20 flex items-center gap-2 px-3 pt-3 pointer-events-none">
            <button onClick={fs.exit} className="pointer-events-auto flex items-center gap-1 rounded-full bg-black/60 pl-1 pr-4 py-1.5 text-sm font-semibold" aria-label="Exit full screen">
              <IconBack /> Back
            </button>
          </div>
        )}
      </div>

      {!fs.active && (
        <div className="p-4">
          {!isVimeo && !useNative && (
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
          {onNext && !isVimeo && (
            <button onClick={onNext} className="mt-3 w-full bg-white/10 py-2 rounded font-semibold text-sm">Next episode</button>
          )}
          <p className="mt-4 text-center text-[11px] text-neutral-500">
            {isVimeo ? "Real video, streamed with the film's official Vimeo embed." : "Real video, streamed from the film's official YouTube channel."}
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

export default function App() {
  const [tab, setTab] = useState('home')
  const [chip, setChip] = useState('All')
  const [detailId, setDetailId] = useState(() => {
    const t = new URLSearchParams(window.location.search).get('title')
    return t && CATALOG.some((c) => c.id === t) ? t : null
  })
  const [play, setPlay] = useState(null) // { videoId, key, label, seriesId?, epIndex? }
  const [query, setQuery] = useState('')
  const [myList, setMyList] = useLocalStorage('sf_mylist', [])
  const [progress, setProgress] = useLocalStorage('sf_progress', {})
  const [ratings, setRatings] = useLocalStorage('sf_ratings', {})

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

  const toggleList = (item) =>
    setMyList(myList.includes(item.id) ? myList.filter((i) => i !== item.id) : [...myList, item.id])

  const rate = (item, r) => setRatings({ ...ratings, [item.id]: r })

  const openPlay = (item, epIndex = null) => {
    if (item.type === 'series' && epIndex !== null) {
      const ep = item.episodes[epIndex]
      setPlay({ videoId: ep.videoId, key: `${item.id}:${ep.id}`, label: `${item.title}: ${ep.title}`, seriesId: item.id, epIndex })
    } else if (item.type === 'series') {
      const ep = item.episodes[0]
      setPlay({ videoId: ep.videoId, key: `${item.id}:${ep.id}`, label: `${item.title}: ${ep.title}`, seriesId: item.id, epIndex: 0 })
    } else {
      setPlay({ videoId: item.videoId, key: item.id, label: item.title, provider: item.provider })
    }
  }

  const saveProgress = (key, t, d) => {
    setProgress((prev) => {
      const next = { ...prev, [key]: { t, d } }
      try {
        window.localStorage.setItem('sf_progress', JSON.stringify(next))
      } catch {}
      return next
    })
  }

  // Deep link: ?play=<id> opens the player on load.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('play')
    if (!p) return
    const item = CATALOG.find((c) => c.id === p)
    if (item) openPlay(item)
  }, [])

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

  return (
    <div className="min-h-full bg-[#0a0a0a] text-white pb-20 max-w-xl mx-auto">
      {tab === 'home' && (
        <>
          <header className="sticky top-0 z-20 bg-gradient-to-b from-black to-transparent px-4 pt-3 pb-2 flex items-center justify-between">
            <div className="text-brand font-extrabold text-xl tracking-tight">SHORTFLIX</div>
            <div className="flex gap-1">
              {['All', 'Films', 'Series'].map((c) => (
                <button
                  key={c}
                  onClick={() => setChip(c)}
                  className={`text-xs px-3 py-1 rounded-full border ${chip === c ? 'bg-white text-black border-white' : 'border-white/30 text-neutral-300'}`}
                >
                  {c}
                </button>
              ))}
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
          <h1 className="text-xl font-bold">Me</h1>
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
          <p className="text-xs text-neutral-500 mt-6 leading-relaxed">
            Shortflix prototype. Every film streams free from its official YouTube channel. Your list, ratings and watch
            progress stay in this browser.
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
          onClose={() => setPlay(null)}
          onProgress={saveProgress}
          onNext={nextEpisode() || undefined}
        />
      )}

      <BottomNav tab={tab} setTab={setTab} />
    </div>
  )
}
