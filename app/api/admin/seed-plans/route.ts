/**
 * POST /api/admin/seed-plans
 * Seeds realistic public Bible reading plans for testing.
 * Requires the user to be logged in. Safe to call multiple times (skips duplicates by title).
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/authOptions';
import connectMongoDB from '../../../../lib/mongodb';
import BiblePlan from '../../../../models/BiblePlan.js';
import User from '../../../../models/User.js';

// ── Plan definitions ──────────────────────────────────────────────────────────

const PLANS = [
  {
    title: 'Evangelie van Johannes in 21 dagen',
    description: 'Lees het volledige Evangelie van Johannes in 21 dagen. Johannes schrijft opdat u gelooft dat Jezus de Christus is, de Zoon van God.',
    duration: 21,
    category: 'evangelie',
    readings: Array.from({ length: 21 }, (_, i) => ({
      day: i + 1,
      book: 'Johannes',
      chapter: i + 1,
      title: [
        'Het Woord was God', 'De eerste discipelen', 'De bruiloft te Kana',
        'Het gesprek met Nicodemus', 'De vrouw bij de put', 'Genezing op de sabbat',
        'De vermenigvuldiging van brood', 'Jezus loopt op het water', 'Levend water',
        'De overspelige vrouw', 'Het licht van de wereld', 'De blinde man geneest',
        'De goede Herder', 'Lazarus opgewekt', 'Maria zalft de voeten',
        'De intocht in Jeruzalem', 'Het laatste avondmaal', 'Jezus troost zijn discipelen',
        'Jezus de ware wijnstok', 'Het hogepriesterlijk gebed', 'Het lijden en de opstanding',
      ][i],
    })),
  },
  {
    title: 'Psalmen - Lofzang en Gebed',
    description: 'Dertig geselecteerde Psalmen die samen een compleet beeld geven van het geestelijk leven: lofprijzing, klaagzang, berouw en vertrouwen.',
    duration: 30,
    category: 'psalmen',
    readings: [
      1, 8, 19, 22, 23, 24, 27, 32, 34, 37,
      40, 46, 51, 63, 84, 90, 91, 100, 103, 104,
      110, 116, 119, 121, 130, 133, 139, 145, 146, 150,
    ].map((ch, i) => ({
      day: i + 1,
      book: 'Psalmen',
      chapter: ch,
      title: [
        'De rechtvaardige en de goddeloze', 'Gods heerlijkheid in de schepping',
        'De wet en de natuur', 'Mijn God, mijn God', 'De goede Herder',
        'Wie mag de berg beklimmen?', 'Eén ding bid ik', 'Zalig de vergeefde',
        'Proef en zie dat de Heere goed is', 'Vertrouw op de Heere',
        'Verwachting', 'God is onze toevlucht', 'Ontferming over een zondaar',
        'Mijn ziel dorst naar U', 'Hoe lieflijk zijn Uw woningen',
        'Een gebed van Mozes', 'In de schaduw van de Almachtige',
        'Juicht voor de Heere', 'Loof de Heere, mijn ziel',
        'De Heere in Zijn schepping', 'De Priester-Koning',
        'De beker der verlossing', 'Hoe lieflijk is Uw wet',
        'Mijn hulp is van de Heere', 'Uit de diepten roep ik',
        'Broederlijke eenheid', 'Heere, U doorgrondt mij',
        'De Heere is nabij', 'Prijs de Heere, mijn ziel',
        'Halleluja!',
      ][i],
    })),
  },
  {
    title: 'Spreuken - Wijsheid voor Dagelijks Leven',
    description: 'Vijftien dagelijkse lessen uit het boek Spreuken. Praktische Bijbelse wijsheid voor werk, relaties, taal en karakter.',
    duration: 15,
    category: 'proverbs',
    readings: [
      { day: 1,  ch: 1,  t: 'De roep van de Wijsheid' },
      { day: 2,  ch: 2,  t: 'De vrucht van wijsheid' },
      { day: 3,  ch: 3,  t: 'Vertrouw op de Heere' },
      { day: 4,  ch: 4,  t: 'Het pad van de rechtvaardige' },
      { day: 5,  ch: 5,  t: 'Trouw in het huwelijk' },
      { day: 6,  ch: 8,  t: 'Wijsheid roept luid' },
      { day: 7,  ch: 10, t: 'Woorden van rechtvaardigheid' },
      { day: 8,  ch: 12, t: 'De tong van de wijze' },
      { day: 9,  ch: 15, t: 'Een zacht antwoord' },
      { day: 10, ch: 16, t: 'De Heere bestuurt de harten' },
      { day: 11, ch: 17, t: 'Een vriend in alle tijden' },
      { day: 12, ch: 20, t: 'Eerlijkheid en integriteit' },
      { day: 13, ch: 22, t: 'Een goede naam' },
      { day: 14, ch: 27, t: 'Vriendschap en beproeving' },
      { day: 15, ch: 31, t: 'De deugdzame vrouw' },
    ].map(({ day, ch, t }) => ({ day, book: 'Spreuken', chapter: ch, title: t })),
  },
  {
    title: 'Brieven van Paulus aan Timotheüs',
    description: 'Paulus schrijft aan zijn geestelijk kind Timotheüs: over leiderschap, gezonde leer, volharding en het goede gevecht van het geloof.',
    duration: 10,
    category: 'brieven',
    readings: [
      { day: 1,  book: '1 Timotheüs', ch: 1, t: 'Genade voor de grootste zondaar' },
      { day: 2,  book: '1 Timotheüs', ch: 2, t: 'Gebed en orde in de gemeente' },
      { day: 3,  book: '1 Timotheüs', ch: 3, t: 'Eisen voor opzieners en diakenen' },
      { day: 4,  book: '1 Timotheüs', ch: 4, t: 'Een goed dienaar van Christus' },
      { day: 5,  book: '1 Timotheüs', ch: 5, t: 'Zorg voor weduwen en ouderlingen' },
      { day: 6,  book: '1 Timotheüs', ch: 6, t: 'Godsvrucht met tevredenheid' },
      { day: 7,  book: '2 Timotheüs', ch: 1, t: 'Onbeschaamd voor het Evangelie' },
      { day: 8,  book: '2 Timotheüs', ch: 2, t: 'Een goed soldaat van Christus' },
      { day: 9,  book: '2 Timotheüs', ch: 3, t: 'Het nut van de Heilige Schrift' },
      { day: 10, book: '2 Timotheüs', ch: 4, t: 'Verkondig het Woord' },
    ].map(({ day, book, ch, t }) => ({ day, book, chapter: ch, title: t })),
  },
  {
    title: 'Jesaja - De Profeet van de Verlossing',
    description: 'Veertien dagelijkse lessen uit het boek Jesaja. Oordeel en troost, de knecht des Heeren, en de heerlijke toekomst die God belooft.',
    duration: 14,
    category: 'profeten',
    readings: [
      { day: 1,  ch: 1,  t: 'Israël in opstand' },
      { day: 2,  ch: 5,  t: 'Het lied van de wijngaard' },
      { day: 3,  ch: 6,  t: 'Jesaja\'s roeping' },
      { day: 4,  ch: 7,  t: 'De belofte van Immanuël' },
      { day: 5,  ch: 9,  t: 'Een Kind is ons geboren' },
      { day: 6,  ch: 11, t: 'De vredevorst en Zijn rijk' },
      { day: 7,  ch: 25, t: 'Het feest op de berg van God' },
      { day: 8,  ch: 40, t: 'Troost, troost Mijn volk' },
      { day: 9,  ch: 42, t: 'De eerste knecht des Heeren' },
      { day: 10, ch: 49, t: 'De tweede knecht des Heeren' },
      { day: 11, ch: 52, t: 'Hoe lieflijk zijn de voeten' },
      { day: 12, ch: 53, t: 'De lijdende knecht' },
      { day: 13, ch: 55, t: 'Kom, koop zonder geld' },
      { day: 14, ch: 61, t: 'De Geest des Heeren is op Mij' },
    ].map(({ day, ch, t }) => ({ day, book: 'Jesaja', chapter: ch, title: t })),
  },
  {
    title: 'Openbaring - Hoop voor de Eindtijd',
    description: 'Een dagelijkse lezing door het boek Openbaring. Jezus overwint, de gemeente wordt bemoedigd, en God maakt alles nieuw.',
    duration: 22,
    category: 'apocalyps',
    readings: Array.from({ length: 22 }, (_, i) => ({
      day: i + 1,
      book: 'Openbaring',
      chapter: i + 1,
      title: [
        'De openbaring van Jezus Christus', 'Brieven aan Efeze en Smyrna',
        'Brieven aan Pergamus en Thyatira', 'Brieven aan Sardis en Filadelfia',
        'De brief aan Laodicea', 'De troon in de hemel',
        'Het boekrol en het Lam', 'De zeven zegels geopend',
        'De stilte en de zeven bazuinen', 'De engel met het boekje',
        'De twee getuigen', 'De zevende bazuin',
        'De vrouw en de draak', 'De twee beesten',
        'Het Lam op de berg Sion', 'De drie engelen',
        'De oogst van de aarde', 'De zeven schalen',
        'Het oordeel over Babylon', 'De val van Babylon',
        'Het duizendjarig rijk', 'Het nieuwe Jeruzalem',
      ][i],
    })),
  },
  {
    title: 'De Bergrede - Verdiepingsstudie',
    description: 'Zeven dagen intensief studie door Mattheüs 5-7. Leer wat Jezus bedoelde met de zaligsprekingen, het gebed, de Wet en het koninkrijk.',
    duration: 7,
    category: 'evangelie',
    readings: [
      { day: 1, ch: 5,  v: '1-12',  t: 'De zaligsprekingen' },
      { day: 2, ch: 5,  v: '13-32', t: 'Zout en licht; de wet' },
      { day: 3, ch: 5,  v: '33-48', t: 'Eed, liefde voor vijanden' },
      { day: 4, ch: 6,  v: '1-18',  t: 'Aalmoezen, gebed en vasten' },
      { day: 5, ch: 6,  v: '19-34', t: 'Schatten en zorgen' },
      { day: 6, ch: 7,  v: '1-20',  t: 'Oordelen en bidden' },
      { day: 7, ch: 7,  v: '21-29', t: 'Het huis op de rots' },
    ].map(({ day, ch, t }) => ({ day, book: 'Mattheüs', chapter: ch, title: t })),
  },
  {
    title: 'Efeziërs & Filippenzen - Leven vanuit Genade',
    description: 'Paulus schrijft vanuit de gevangenis over de rijkdom in Christus en de vreugde die geen omstandigheid kan wegnemen.',
    duration: 10,
    category: 'brieven',
    readings: [
      { day: 1,  book: 'Efeziërs', ch: 1, t: 'Zegen in de hemelse gewesten' },
      { day: 2,  book: 'Efeziërs', ch: 2, t: 'Dood door zonden, levend in Christus' },
      { day: 3,  book: 'Efeziërs', ch: 3, t: 'Het verborgen geheimenis' },
      { day: 4,  book: 'Efeziërs', ch: 4, t: 'De eenheid van de Geest' },
      { day: 5,  book: 'Efeziërs', ch: 5, t: 'Wandel als kinderen van het licht' },
      { day: 6,  book: 'Efeziërs', ch: 6, t: 'De wapenrusting Gods' },
      { day: 7,  book: 'Filippenzen', ch: 1, t: 'Leven is Christus' },
      { day: 8,  book: 'Filippenzen', ch: 2, t: 'Gelijkgezind in Christus' },
      { day: 9,  book: 'Filippenzen', ch: 3, t: 'Alles schade voor Christus' },
      { day: 10, book: 'Filippenzen', ch: 4, t: 'De vrede die alle verstand te boven gaat' },
    ].map(({ day, book, ch, t }) => ({ day, book, chapter: ch, title: t })),
  },
];

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectMongoDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const results: string[] = [];

    for (const plan of PLANS) {
      const exists = await BiblePlan.findOne({ title: plan.title });
      if (exists) {
        results.push(`SKIP: "${plan.title}" (already exists)`);
        continue;
      }

      await BiblePlan.create({
        ...plan,
        isPublic: true,
        createdBy: user._id,
        enrolledUsers: [],
        progress: [],
      });
      results.push(`CREATED: "${plan.title}"`);
    }

    return NextResponse.json({ message: 'Seed complete', results });
  } catch (err) {
    console.error('[seed-plans]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
