/**
 * Le film, quand il n'est pas la.
 *
 * La video d'Antarctique pese 170 Mo : elle ne tient pas dans le quota de
 * l'hebergement, et elle n'est donc pas toujours en ligne. Un <video> dont la
 * source manque affiche un lecteur casse ; on le remplace alors par un bloc
 * dessine, qui dit ce que c'est et ou le trouver.
 *
 * Le jour ou le fichier est depose, il n'y a rien a changer : le lecteur se
 * charge et ce module ne fait rien.
 */

function placeholder(video: HTMLVideoElement): void {
  const label = video.dataset.fallbackLabel ?? 'Vidéo indisponible'
  const slot = document.createElement('div')
  slot.className = 'photo__slot photo__slot--wide film__missing'
  slot.innerHTML = `
    <svg class="photo__mark" aria-hidden="true"><use href="#vg-manchot" /></svg>
    <span class="photo__hint">${label}</span>
  `
  video.replaceWith(slot)
}

export function setupFilm(): void {
  document.querySelectorAll<HTMLVideoElement>('.player').forEach((video) => {
    // `error` sur <video> ne remonte pas : on ecoute en phase de capture.
    video.addEventListener('error', () => placeholder(video), true)

    // Seul le film historique a besoin de cette verification supplementaire :
    // les lecteurs distants peuvent mettre plus de quatre secondes a charger
    // leurs metadonnees sans etre en erreur.
    window.setTimeout(() => {
      if (video.dataset.fallbackCheck === 'true' && video.isConnected && video.readyState === 0) {
        placeholder(video)
      }
    }, 4000)
  })
}
