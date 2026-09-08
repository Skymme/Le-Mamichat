/**
 * Flipbook — moteur de tourne-page.
 *
 * Deux modes, choisis automatiquement selon la largeur de la fenetre :
 *  - "spread" : double page, la feuille pivote en 3D autour de la reliure ;
 *  - "single" : une page a la fois, transition laterale (mobile / ecrans etroits).
 *
 * Le DOM attendu est un `.book` contenant des `.sheet`, chaque feuille
 * portant deux `.face` (recto puis verso).
 */

export type FlipMode = 'spread' | 'single'

export interface FlipbookState {
  mode: FlipMode
  /** Index de la page visible (celle de droite en double page). */
  page: number
  pageCount: number
  /** Nombre de feuilles tournees. */
  spread: number
  spreadCount: number
  canPrev: boolean
  canNext: boolean
  /** Avancement dans le journal, de 0 a 1. */
  progress: number
}

export interface FlipbookOptions {
  /** En dessous de cette largeur on bascule en page unique. */
  singleBreakpoint?: number
  onChange?: (state: FlipbookState) => void
}

const SWIPE_THRESHOLD = 48

export class Flipbook {
  private readonly book: HTMLElement
  private readonly sheets: HTMLElement[]
  private readonly faces: HTMLElement[]
  private readonly onChange?: (state: FlipbookState) => void
  private readonly media: MediaQueryList

  private mode: FlipMode = 'spread'
  /** Feuilles tournees (mode double page). */
  private turned = 0
  /** Page courante (mode page unique). */
  private pageIndex = 0
  private busy = false
  private pointerStartX: number | null = null
  private pointerStartY: number | null = null

  constructor(book: HTMLElement, options: FlipbookOptions = {}) {
    this.book = book
    this.onChange = options.onChange
    this.sheets = Array.from(book.querySelectorAll<HTMLElement>('.sheet'))
    this.faces = this.sheets.flatMap((sheet) =>
      Array.from(sheet.querySelectorAll<HTMLElement>('.face')),
    )

    if (this.sheets.length === 0) {
      throw new Error('Flipbook : aucune feuille (.sheet) trouvee dans le livre.')
    }

    this.faces.forEach((face, index) => {
      face.dataset.page = String(index)
      face.setAttribute('role', 'group')
      face.setAttribute('aria-label', `Page ${index + 1} sur ${this.faces.length}`)
    })

    const breakpoint = options.singleBreakpoint ?? 900
    this.media = window.matchMedia(`(max-width: ${breakpoint}px)`)
    this.media.addEventListener('change', this.handleMediaChange)

    this.bindPointer()
    this.bindKeyboard()

    this.setMode(this.media.matches ? 'single' : 'spread', { silent: true })
    this.render()
  }

  // --- Lecture d'etat -----------------------------------------------------

  get pageCount(): number {
    return this.faces.length
  }

  get spreadCount(): number {
    return this.sheets.length
  }

  /** Page consideree comme "courante" quel que soit le mode. */
  get currentPage(): number {
    if (this.mode === 'single') return this.pageIndex
    return Math.min(this.turned * 2, this.pageCount - 1)
  }

  get state(): FlipbookState {
    const isSingle = this.mode === 'single'
    const position = isSingle ? this.pageIndex : this.turned
    const total = isSingle ? this.pageCount - 1 : this.spreadCount

    return {
      mode: this.mode,
      page: this.currentPage,
      pageCount: this.pageCount,
      spread: this.turned,
      spreadCount: this.spreadCount,
      canPrev: position > 0,
      canNext: position < total,
      progress: total === 0 ? 1 : position / total,
    }
  }

  // --- Navigation ---------------------------------------------------------

  next(): void {
    if (this.mode === 'single') this.goToPage(this.pageIndex + 1)
    else this.goToSpread(this.turned + 1)
  }

  prev(): void {
    if (this.mode === 'single') this.goToPage(this.pageIndex - 1)
    else this.goToSpread(this.turned - 1)
  }

  first(): void {
    if (this.mode === 'single') this.goToPage(0)
    else this.goToSpread(0)
  }

  last(): void {
    if (this.mode === 'single') this.goToPage(this.pageCount - 1)
    else this.goToSpread(this.spreadCount)
  }

  /** Positionne le journal sur une feuille donnee (0 = couverture fermee). */
  goToSpread(target: number): void {
    const next = clamp(target, 0, this.spreadCount)
    if (next === this.turned || this.busy) return

    const direction = next > this.turned ? 1 : -1
    // La feuille qui bouge passe au-dessus de la pile pendant la rotation.
    const moving = this.sheets[direction > 0 ? this.turned : next]
    this.turned = next

    if (moving && this.mode === 'spread') {
      this.busy = true
      moving.style.zIndex = String(this.sheets.length + 5)
      window.setTimeout(() => {
        this.busy = false
        this.applyStack()
      }, readDuration(this.book))
    }

    this.pageIndex = next === 0 ? 0 : Math.min(next * 2 - 1, this.pageCount - 1)
    this.render(moving)
  }

  /** Positionne le journal sur une page precise (mode unique). */
  goToPage(target: number): void {
    const next = clamp(target, 0, this.pageCount - 1)
    if (next === this.pageIndex) return

    this.book.dataset.dir = next > this.pageIndex ? 'forward' : 'back'
    this.pageIndex = next
    this.turned = next === 0 ? 0 : Math.ceil(next / 2)
    this.render()
  }

  destroy(): void {
    this.media.removeEventListener('change', this.handleMediaChange)
    window.removeEventListener('keydown', this.handleKeydown)
    this.book.removeEventListener('pointerdown', this.handlePointerDown)
    this.book.removeEventListener('pointerup', this.handlePointerUp)
    this.book.removeEventListener('pointercancel', this.handlePointerCancel)
  }

  // --- Rendu --------------------------------------------------------------

  private render(moving?: HTMLElement | null): void {
    if (this.mode === 'spread') this.applySpread(moving)
    else this.applySingle()
    this.onChange?.(this.state)
  }

  private applySpread(moving?: HTMLElement | null): void {
    this.sheets.forEach((sheet, index) => {
      sheet.classList.toggle('is-turned', index < this.turned)
    })
    this.applyStack(moving)

    this.faces.forEach((face, index) => {
      face.classList.remove('is-active')
      const visible = index === this.turned * 2 - 1 || index === this.turned * 2
      face.setAttribute('aria-hidden', visible ? 'false' : 'true')
      face.inert = !visible
    })
  }

  /** Empile les feuilles pour que la reliure reste credible. */
  private applyStack(moving?: HTMLElement | null): void {
    this.sheets.forEach((sheet, index) => {
      if (sheet === moving && this.busy) return
      const isTurned = index < this.turned
      sheet.style.zIndex = String(isTurned ? index + 1 : this.sheets.length - index)
    })
  }

  private applySingle(): void {
    this.sheets.forEach((sheet, index) => {
      sheet.classList.remove('is-turned')
      sheet.style.zIndex = String(index + 1)
    })

    this.faces.forEach((face, index) => {
      const active = index === this.pageIndex
      face.classList.toggle('is-active', active)
      face.setAttribute('aria-hidden', active ? 'false' : 'true')
      face.inert = !active
      if (active) {
        face.dataset.dir = this.book.dataset.dir === 'back' ? 'back' : 'forward'
        // Relance l'animation d'entree meme si la classe etait deja posee.
        face.style.animation = 'none'
        void face.offsetWidth
        face.style.animation = ''
        face.scrollTop = 0
      }
    })
  }

  private setMode(mode: FlipMode, options: { silent?: boolean } = {}): void {
    if (mode === this.mode && options.silent !== true) return
    this.mode = mode
    this.book.classList.toggle('is-single', mode === 'single')

    if (mode === 'single') {
      this.pageIndex = this.turned === 0 ? 0 : Math.min(this.turned * 2 - 1, this.pageCount - 1)
    } else {
      this.turned = this.pageIndex === 0 ? 0 : Math.ceil(this.pageIndex / 2)
    }

    if (options.silent !== true) this.render()
  }

  // --- Interactions -------------------------------------------------------

  private bindKeyboard(): void {
    window.addEventListener('keydown', this.handleKeydown)
  }

  private bindPointer(): void {
    this.book.addEventListener('pointerdown', this.handlePointerDown)
    this.book.addEventListener('pointerup', this.handlePointerUp)
    this.book.addEventListener('pointercancel', this.handlePointerCancel)
  }

  private handleMediaChange = (event: MediaQueryListEvent): void => {
    this.setMode(event.matches ? 'single' : 'spread')
  }

  private handleKeydown = (event: KeyboardEvent): void => {
    const target = event.target as HTMLElement | null
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return

    // Une image ouverte en grand capte le clavier : on ne tourne pas la page
    // derriere elle.
    if (document.querySelector('dialog[open]')) return

    switch (event.key) {
      case 'ArrowRight':
      case 'PageDown':
        event.preventDefault()
        this.next()
        break
      case 'ArrowLeft':
      case 'PageUp':
        event.preventDefault()
        this.prev()
        break
      case 'Home':
        event.preventDefault()
        this.first()
        break
      case 'End':
        event.preventDefault()
        this.last()
        break
      default:
        break
    }
  }

  private handlePointerDown = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse') return

    if (isInteractiveTarget(event.target)) {
      this.pointerStartX = null
      this.pointerStartY = null
      return
    }

    this.pointerStartX = event.clientX
    this.pointerStartY = event.clientY

    // Le doigt quitte souvent le livre avant d'etre releve : sans capture, le
    // pointerup part ailleurs et le balayage est perdu.
    try {
      this.book.setPointerCapture(event.pointerId)
    } catch {
      /* le navigateur peut refuser : on retombe sur le pointerup classique */
    }
  }

  private handlePointerUp = (event: PointerEvent): void => {
    if (this.pointerStartX === null) return

    const dx = event.clientX - this.pointerStartX
    const dy = event.clientY - (this.pointerStartY ?? event.clientY)
    this.pointerStartX = null
    this.pointerStartY = null

    // Un geste plus vertical qu'horizontal, c'est un defilement, pas une page.
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return
    if (dx < 0) this.next()
    else this.prev()
  }

  private handlePointerCancel = (): void => {
    this.pointerStartX = null
    this.pointerStartY = null
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Lit --flip-duration pour resynchroniser le JS avec le CSS. */
function readDuration(element: Element): number {
  const raw = getComputedStyle(element).getPropertyValue('--flip-duration').trim()
  if (raw.endsWith('ms')) return Number.parseFloat(raw) || 0
  if (raw.endsWith('s')) return (Number.parseFloat(raw) || 0) * 1000
  return 900
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false

  return Boolean(
      target.closest(
          [
            '[data-no-flip]',
            '[data-no-page-swipe]',
            'button',
            'input',
            'select',
            'textarea',
            'a[href]',
            'video',
            'audio',
            '[contenteditable]:not([contenteditable="false"])',
          ].join(','),
      ),
  )
}
