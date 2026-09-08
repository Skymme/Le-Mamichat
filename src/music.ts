import {
  karaokeTrack,
  type KaraokeLine,
  type KaraokeWord,
  type Singer,
  type SingerId,
} from './music-karaoke-data'

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'

  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)

  return `${mins}:${String(secs).padStart(2, '0')}`
}

function getLineStart(line: KaraokeLine): number {
  return line.words[0]?.start ?? 0
}

function getLineEnd(line: KaraokeLine): number {
  const lastWord = line.words[line.words.length - 1]
  return lastWord?.end ?? getLineStart(line)
}


function findActiveLine(time: number): number {
  let active = -1

  for (let i = 0; i < karaokeTrack.lines.length; i += 1) {
    const line = karaokeTrack.lines[i]
    const next = karaokeTrack.lines[i + 1]

    const start = getLineStart(line)
    const end = next ? getLineStart(next) : getLineEnd(line) + 1

    if (time >= start && time < end) {
      active = i
      break
    }
  }

  return active
}

function wordProgress(word: KaraokeWord, time: number): number {
  if (time <= word.start) return 0
  if (time >= word.end) return 1

  const duration = Math.max(0.001, word.end - word.start)
  return Math.max(0, Math.min(1, (time - word.start) / duration))
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false

  return (
      target.isContentEditable ||
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLButtonElement ||
      target instanceof HTMLAnchorElement
  )
}

export function setupMusicPlayer(): void {
  document
      .querySelectorAll<HTMLElement>('[data-music-player]')
      .forEach((root) => setupOnePlayer(root))
}

function setupOnePlayer(root: HTMLElement): void {
  const audio = root.querySelector<HTMLAudioElement>('[data-audio]')
  const transport = root.querySelector<HTMLButtonElement>('[data-transport]')
  const playIcon = root.querySelector<SVGElement>('[data-icon-play]')
  const pauseIcon = root.querySelector<SVGElement>('[data-icon-pause]')
  const seek = root.querySelector<HTMLInputElement>('[data-seek]')
  const current = root.querySelector<HTMLElement>('[data-current]')
  const duration = root.querySelector<HTMLElement>('[data-duration]')
  const lyricsWindow = root.querySelector<HTMLElement>('[data-lyrics-window]')
  const lyricsDrawer = root.querySelector<HTMLElement>('[data-lyrics-drawer]')
  const lyricsToggle = root.querySelector<HTMLButtonElement>('[data-lyrics-toggle]')
  const lyricsClose = root.querySelector<HTMLButtonElement>('[data-lyrics-close]')
  const ambientLine = root.querySelector<HTMLElement>('[data-ambient-line]')
  const ambientSinger = root.querySelector<HTMLElement>('[data-ambient-singer]')

  if (
      !audio ||
      !transport ||
      !playIcon ||
      !pauseIcon ||
      !seek ||
      !lyricsWindow
  ) {
    return
  }

  const audioEl = audio
  const transportEl = transport
  const playIconEl = playIcon
  const pauseIconEl = pauseIcon
  const seekEl = seek
  const lyricsWindowEl = lyricsWindow

  const singerById = new Map<SingerId, Singer>(
      karaokeTrack.singers.map((singer) => [singer.id, singer]),
  )

  let activeLineIndex = -1
  let raf = 0
  let seeking = false
  let ambientWordElements: HTMLSpanElement[] = []

  const renderedLines = karaokeTrack.lines.map((line, lineIndex) => {
    const singer = singerById.get(line.singer)

    const button = document.createElement('button')
    button.type = 'button'

    button.className = `music-rubric__lyric-line ${singer?.cssClass ?? ''}`
    button.dataset.lineIndex = String(lineIndex)

    const singerLabel = document.createElement('span')
    singerLabel.className = 'music-rubric__lyric-singer'
    singerLabel.textContent = singer ? `(${singer.name})` : ''

    const text = document.createElement('span')
    text.className = 'music-rubric__lyric-text'

    const wordElements = line.words.map((word, wordIndex) => {
      const span = document.createElement('span')
      span.className = 'music-rubric__karaoke-word'
      span.dataset.wordIndex = String(wordIndex)
      span.textContent = word.text
      span.style.setProperty('--word-progress', '0%')

      text.append(span)

      if (wordIndex < line.words.length - 1) {
        text.append(document.createTextNode(' '))
      }

      return span
    })

    button.append(singerLabel, text)

    button.addEventListener('click', () => {
      if (!karaokeTrack.timingVerified) return
      audioEl.currentTime = getLineStart(line)
      update(true)
    })

    lyricsWindowEl.append(button)

    return {
      button,
      line,
      singer,
      wordElements,
    }
  })

  function setTransportState(playing: boolean): void {
    root.dataset.playing = playing ? 'true' : 'false'

    transportEl.setAttribute(
        'aria-label',
        playing ? 'Mettre en pause' : 'Lire',
    )

    transportEl.setAttribute(
        'aria-pressed',
        playing ? 'true' : 'false',
    )

    if (playing) {
      playIconEl.setAttribute('hidden', '')
      pauseIconEl.removeAttribute('hidden')
    } else {
      playIconEl.removeAttribute('hidden')
      pauseIconEl.setAttribute('hidden', '')
    }
  }

  function setDrawer(open: boolean): void {
    root.dataset.lyricsOpen = open ? 'true' : 'false'

    lyricsDrawer?.setAttribute(
        'aria-hidden',
        open ? 'false' : 'true',
    )

    lyricsToggle?.setAttribute(
        'aria-expanded',
        open ? 'true' : 'false',
    )

    if (open) {
      requestAnimationFrame(() => {
        renderedLines[activeLineIndex]?.button.scrollIntoView({
          block: 'center',
          behavior: 'auto',
        })
      })
    }
  }

  function setAmbientLyrics(index: number): void {
    const rendered = renderedLines[index]

    ambientWordElements = []

    if (!rendered) {
      ambientLine?.replaceChildren()
      if (ambientSinger) ambientSinger.textContent = ''
      return
    }

    const color =
        rendered.line.singer === 'voice-a'
            ? 'var(--voice-a)'
            : rendered.line.singer === 'voice-b'
                ? 'var(--voice-b)'
                : 'var(--voice-duo)'

    if (ambientLine) {
      ambientLine.style.setProperty('--ambient-color', color)

      const fragment = document.createDocumentFragment()

      rendered.line.words.forEach((word, wordIndex) => {
        const span = document.createElement('span')
        span.className = 'music-rubric__ambient-word'
        span.textContent = word.text
        span.style.setProperty('--word-progress', '0%')

        ambientWordElements.push(span)
        fragment.append(span)

        if (wordIndex < rendered.line.words.length - 1) {
          fragment.append(document.createTextNode(' '))
        }
      })

      ambientLine.replaceChildren(fragment)
    }

    if (ambientSinger) {
      ambientSinger.textContent = rendered.singer?.name ?? ''
      ambientSinger.style.color = color
    }
  }

  function updateAmbientWords(time: number): void {
    const rendered = renderedLines[activeLineIndex]
    if (!rendered || ambientWordElements.length === 0) return

    ambientWordElements.forEach((element, wordIndex) => {
      const word = rendered.line.words[wordIndex]
      if (!word) return

      const progress = wordProgress(word, time)

      element.style.setProperty(
          '--word-progress',
          `${(progress * 100).toFixed(2)}%`,
      )
    })
  }

  function setActiveLine(index: number, forceScroll = false): void {
    if (index === activeLineIndex && !forceScroll) return

    activeLineIndex = index

    renderedLines.forEach((rendered, i) => {
      const distance = Math.abs(i - index)

      rendered.button.dataset.active = i === index ? 'true' : 'false'
      rendered.button.dataset.near = distance === 1 ? 'true' : 'false'
      rendered.button.dataset.past = i < index ? 'true' : 'false'
    })

    setAmbientLyrics(index)

    const rendered = renderedLines[index]

    if (rendered && root.dataset.lyricsOpen === 'true') {
      rendered.button.scrollIntoView({
        block: 'center',
        behavior: forceScroll ? 'auto' : 'smooth',
      })
    }
  }

  function updateWords(time: number): void {
    renderedLines.forEach((rendered, lineIndex) => {
      const isActiveLine = lineIndex === activeLineIndex

      rendered.wordElements.forEach((element, wordIndex) => {
        const word = rendered.line.words[wordIndex]

        const progress = isActiveLine
            ? wordProgress(word, time)
            : time >= word.end
                ? 1
                : 0

        element.style.setProperty(
            '--word-progress',
            `${(progress * 100).toFixed(2)}%`,
        )

        element.dataset.sung = progress >= 1 ? 'true' : 'false'
        element.dataset.current =
            progress > 0 && progress < 1 ? 'true' : 'false'
      })
    })

    updateAmbientWords(time)
  }

  function setSeekVisual(time: number): void {
    const total = audioEl.duration || 0

    const ratio =
        total > 0
            ? Math.max(0, Math.min(1, time / total))
            : 0

    seekEl.value = String(Math.round(ratio * 1000))
    seekEl.style.setProperty(
        '--music-progress',
        `${ratio * 100}%`,
    )

    if (current) current.textContent = formatTime(time)
    if (duration) duration.textContent = formatTime(total)
  }

  function seekToSliderValue(): void {
    if (
        !Number.isFinite(audioEl.duration) ||
        audioEl.duration <= 0
    ) {
      return
    }

    const ratio = Number(seekEl.value) / 1000
    audioEl.currentTime = ratio * audioEl.duration

    setSeekVisual(audioEl.currentTime)
    setActiveLine(
        findActiveLine(audioEl.currentTime),
        true,
    )
    updateWords(audioEl.currentTime)
  }

  function update(forceScroll = false): void {
    if (!karaokeTrack.timingVerified) return
    const time = audioEl.currentTime || 0

    if (!seeking) {
      setSeekVisual(time)
    }

    const lineIndex = findActiveLine(time)

    setActiveLine(lineIndex, forceScroll)
    updateWords(time)
  }

  function frame(): void {
    update()

    if (!audioEl.paused && !audioEl.ended) {
      raf = requestAnimationFrame(frame)
    }
  }

  async function togglePlayback(): Promise<void> {
    if (audioEl.paused || audioEl.ended) {
      if (audioEl.ended) {
        audioEl.currentTime = 0
      }

      try {
        await audioEl.play()
      } catch {
        return
      }
    } else {
      audioEl.pause()
    }
  }

  transportEl.addEventListener('click', () => {
    void togglePlayback()
  })

  /*
   * Espace = Play/Pause.
   * On ignore volontairement Espace quand l'utilisateur écrit,
   * manipule un bouton, un lien ou un input.
   */
  document.addEventListener('keydown', (event) => {
    if (
        event.code !== 'Space' ||
        event.repeat ||
        isTypingTarget(event.target)
    ) {
      return
    }

    event.preventDefault()
    void togglePlayback()
  })

  lyricsToggle?.addEventListener('click', () => {
    setDrawer(root.dataset.lyricsOpen !== 'true')
  })

  lyricsClose?.addEventListener('click', () => {
    setDrawer(false)
  })

  document.addEventListener('keydown', (event) => {
    if (
        event.key === 'Escape' &&
        root.dataset.lyricsOpen === 'true'
    ) {
      setDrawer(false)
    }
  })

  function previewSeek(): void {
    seeking = true
    seekToSliderValue()
  }

  function commitSeek(): void {
    seekToSliderValue()

    seeking = false

    update(true)
  }

  seekEl.addEventListener('pointerdown', () => {
    seeking = true
  })

  seekEl.addEventListener('input', () => {
    previewSeek()
  })

  seekEl.addEventListener('pointerup', () => {
    commitSeek()
  })

  seekEl.addEventListener('pointercancel', () => {
    seeking = false
    update(true)
  })

  /*
   * `change` sert aussi de fallback tactile/clavier.
   */
  seekEl.addEventListener('change', () => {
    if (!seeking) {
      commitSeek()
    }
  })

  audioEl.addEventListener('loadedmetadata', () => {
    setSeekVisual(audioEl.currentTime)
    update(true)
  })

  audioEl.addEventListener('durationchange', () => {
    setSeekVisual(audioEl.currentTime)
  })

  audioEl.addEventListener('seeked', () => {
    update(true)
  })

  audioEl.addEventListener('play', () => {
    setTransportState(true)

    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(frame)
  })

  audioEl.addEventListener('pause', () => {
    setTransportState(false)

    cancelAnimationFrame(raf)
    update()
  })

  audioEl.addEventListener('ended', () => {
    setTransportState(false)

    cancelAnimationFrame(raf)

    setSeekVisual(audioEl.duration || 0)
    update(true)
  })

  setDrawer(false)
  setTransportState(false)
  setSeekVisual(audioEl.currentTime || 0)
  update(true)
}
