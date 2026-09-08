export type SingerId = 'voice-a' | 'voice-b' | 'duo'
export type Singer = { id: SingerId; name: string; cssClass: string }
export type KaraokeWord = { text: string; start: number; end: number }
export type KaraokeLine = { singer: SingerId; words: KaraokeWord[] }
export type KaraokeTrack = { title: string; artist: string; singers: Singer[]; lines: KaraokeLine[]; timingVerified: boolean }

/* La piste locale est un accompagnement : ses temps de paroles ne peuvent pas
   être déduits honnêtement sans la version chantée de référence. */
function pendingLine(text: string): KaraokeLine {
  return { singer: 'duo', words: text.split(/\s+/).map((word) => ({ text: word, start: 0, end: 0 })) }
}

const lyrics = `C’est étrange, je ne sais pas ce qui m’arrive ce soir
Je veux qu’on parle de toi avant Kourou
Quatre fois vingt, font quatre-vingt, si je compte bien
Par où commencer ?
Oui quatre-vingt
Dans ton berceau à Salambô
Tu as attrapé un rayon de soleil
Carthage ma belle, je me rappelle, c’était trop beau
Tu l’as placé au plus profond de ton cœur
Oui bien trop beau
Et est devenue tunisienne pour toujours
Jamais fini, le temps des rêves
Les souvenirs je les construis encore aujourd’hui
C’est le vent de Sidi Bou au parfum de jasmin
Qui en t’effleurant t’a faite nomade
Harissa, makrouds et Méchouïa,
Par moments, je ne te comprend pas
C’est sûr j’aime ça mais, j’aime mieux les manger avec d’autres
Qui aiment le vent et le parfum des roses
Oui les mets tendres enrobés de douceur
Se posent dans nos bouches, mais aussi sur nos cœurs
Un souvenir encore
Tunis Goulette Marsa, je suis là
Ecoute-moi
Tunis Goulette Marsa, je suis là
Je t’en prie
Tunis Goulette Marsa, je suis là
Je te jure
Habibi Ya leyli Habibi Ya leyli
Je suis encore à Salambô quand j’entends le vent
Voilà ton destin, rayonner
Rayonner comme quand tu es née
Encore des mots toujours des mots, les mêmes mots
Comme j’aimerais que tu me racontes
Rien que des mots
Que tu racontes au moins une fois
La Oïja, de Saïda, les fricassées
Que dis-tu ? je n’te suis plus…
Assidat zgougou
Raconte tes anim’ de colos, tes cours de conduite en deux-chevaux !
Rien ne t’arrête, quand tu commences
Si tu savais comme j’ai envie d’un thé à la menthe
Raconte-moi encore comment tu as protégé les enfants lors de la crise de Byzerte,
Harissa, makrouds et Méchouïa,
Si tu n’existais pas déjà, je t’inventerais
C’est sûr j’aime ça mais, j’aime mieux les manger avec d’autres
Qui aiment les étoiles sur les dunes
Oui les mets tendres enrobés de douceur
Se posent dans nos bouches, mais aussi sur nos cœurs
Encore un mot, juste un souvenir
Tunis Goulette Marsa, je suis là
Ecoute-moi
Tunis Goulette Marsa, je suis là
Je t’en prie
Tunis Goulette Marsa, je suis là
Je te jure
Habibi Ya leyli Habibi Ya leyli
Je suis encore à Salambô quand j’entends le vent
Que tu es belle
Tunis Goulette Marsa, je suis là
Que tu es belle
Tunis Goulette Marsa, je suis là
Que tu es belle
Tunis Goulette Marsa, je suis là
Que tu es belle
Habibi Ya leyli Habibi Ya leyli
Je suis encore à Salambô quand j’entends le vent`.split('\n')

export const karaokeTrack: KaraokeTrack = {
  title: 'Le nouveau tube des années 80', artist: 'Dalichat & Fabien Deloin', timingVerified: false,
  singers: [
    { id: 'voice-a', name: 'Voix A', cssClass: 'music-rubric--voice-a' },
    { id: 'voice-b', name: 'Voix B', cssClass: 'music-rubric--voice-b' },
    { id: 'duo', name: 'Paroles', cssClass: 'music-rubric--duo' },
  ],
  lines: lyrics.map(pendingLine),
}
