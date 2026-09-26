// All dialogue lives here. Each entry returns an array of [speaker, text].
// Speakers: family ids, npc ids, 'kooka' | 'duck' | 'ibis', or 'sign' for narration.
// `c` is a context object: { who, name, area, map, q (quest state), n (feathers found), times }

const NAMES = { dan: 'Dad', jarency: 'Mum', jessia: 'Jess', finn: 'Finn' };
const pick = (arr, i) => arr[i % arr.length];

export const INTRO = {
  dan: c => [
    ['finn', 'Dad. Emergency.'],
    ['dan', 'Actual emergency or goose emergency?'],
    ['finn', 'Goose emergency.'],
    ['dan', 'Right. Worse.'],
    ['finn', 'My five lucky feathers are gone. I had them this morning. Now I have zero feathers.'],
    ['dan', 'Did you check your pockets?'],
    ['finn', 'Geese don’t have pockets, Dad.'],
    ['dan', 'Fair. Okay. We’ll have a look around. Pond, bush track, school, the shops.'],
  ],
  jessia: c => [
    ['finn', 'Jess. Emergency.'],
    ['jessia', 'Is it a real one or a goose one?'],
    ['finn', '…Goose one.'],
    ['jessia', 'Cool. I’ll finish my song first.'],
    ['finn', 'JESS.'],
    ['jessia', 'Fine. What did you lose.'],
    ['finn', 'All five of my lucky feathers.'],
    ['jessia', 'Okay. That’s actually bad. Let’s look.'],
  ],
  jarency: c => [
    ['finn', 'Mum. Emergency.'],
    ['jarency', 'Deep breath, darling. What happened?'],
    ['finn', 'My lucky feathers. All five. Gone.'],
    ['jarency', 'Okay. We’ll find them together. Pond, bush track, school, the shops.'],
    ['jarency', 'Snacks after.'],
    ['finn', 'Snacks during?'],
    ['jarency', 'Snacks after.'],
  ],
  finn: c => [
    ['sign', 'Finn has lost five lucky feathers. According to Finn, this is the worst thing that has ever happened.'],
    ['finn', 'Right. Think like a feather. Where would I go?'],
    ['finn', 'Pond. Bush. School. Shops. Everywhere, basically. Cool cool cool.'],
  ],
};

export const TIP = [
  ['sign', 'Walk up to people, animals and odd-looking things. When a prompt appears, press E (or tap the big button) to interact.'],
  ['sign', 'Tap a family portrait at the top to swap who you’re playing. Everyone has something different to say.'],
];

// ---------- family chatter ----------
export const FAMILY_TALK = {
  dan: c => {
    if (c.map === 'manly') return c.q.ch2.photo
      ? [['dan', 'Best day. I’m calling it. Best day this year.']]
      : pick([
        [['dan', 'I’ve got my coffee, I’ve got the beach. I’m a simple bear.']],
        [['dan', 'Jess says she’ll race me to the lookout. I have chosen to walk with dignity.']],
        [['dan', c.who === 'finn' ? 'Go find your duck, mate. I believe in you.' : 'Finn’s duck is apparently near the rock pools. I didn’t ask follow-up questions.']],
      ], c.times);
    if (c.q.ch1.done) return [['dan', 'Bus stop’s up by the shops. I’ll bring the towels. And the coffee. Mostly the coffee.']];
    if (c.who === 'jessia') return pick([[['dan', 'Jess, if you find a feather, you can pick the music in the car.'], ['jessia', 'I always pick the music in the car.'], ['dan', 'Then you can keep picking it.']]], c.times);
    if (c.who === 'finn') return pick([[['dan', 'How many so far, mate?'], ['finn', `${c.n}. Out of five. Which is not five.`]], [['dan', 'Have you tried retracing your steps?'], ['finn', 'I’ve been EVERYWHERE, Dad. That’s the problem.']]], c.times);
    return pick([
      [['dan', 'Coffee first, adventure second. Well. Adventure with coffee.']],
      [['dan', 'The kookaburra near the start of the track sees everything. Nosy bird.']],
      [['dan', 'I might take the guitar down to the pond later. The ducks love it.'], ['sign', 'The ducks do not love it.']],
    ], c.times);
  },
  finn: c => {
    if (c.map === 'manly') return c.q.ch2.duck
      ? [['finn', 'Best duck. Best rock pool. Best day.']]
      : [['finn', 'There’s a duck. At the BEACH. It went toward the rocks. I saw it.'], ['finn', 'Ask the lifeguard if you don’t believe me.']];
    if (c.q.ch1.done) return [['finn', 'Five out of five. The goose is whole again.'], ['finn', 'Now: BEACH.']];
    const left = 5 - c.n;
    return pick([
      [['finn', c.n === 0 ? 'Zero feathers. ZERO.' : `I’m up to ${c.n}. ${left} to go. Not that I’m counting. I am counting.`]],
      [['finn', 'Bev next door finds everything in her garden. Once she found a whole bike.']],
      [['finn', 'The ducks at the pond are my friends. Well. Colleagues.']],
      [['finn', c.who === 'jessia' ? 'Jess, you have long ears. Can you hear feathers?' : 'If you were a feather, where would you hide?'], ...(c.who === 'jessia' ? [['jessia', 'That’s not how ears work.']] : [])],
    ], c.times);
  },
  jessia: c => {
    if (c.map === 'manly') return c.q.ch2.lookout
      ? [['jessia', 'Told you I’d win. You all owe me gelato.']]
      : [['jessia', 'Race you to the lookout. Track starts past the kiosk at Shelly.'], ['jessia', 'Loser carries the towels.']];
    if (c.q.ch1.done) return [['jessia', 'Manly? Fine. I’m bringing my headphones in case everyone sings on the bus.']];
    if (c.who === 'dan') return pick([[['jessia', 'Dad, please don’t sing near the pond. The ducks have been through enough.']], [['jessia', 'Ms Aroha said something about the sandpit at school. I don’t know. I wasn’t listening. I was listening a little.']]], c.times);
    return pick([
      [['jessia', 'The ducks keep looking at me like I owe them bread. I don’t. Bread’s bad for them.']],
      [['jessia', 'Ms Aroha said one of the little kids found a “magic feather” in the sandpit. Could be Finn’s. Could be a magic feather.']],
      [['jessia', 'I’m writing a song about this. It’s called “Goose Emergency”. It’s mostly one chord.']],
    ], c.times);
  },
  jarency: c => {
    if (c.map === 'manly') return c.q.ch2.photo
      ? [['jarency', 'Look at us. A proper family photo. I’m framing it.']]
      : [['jarency', 'Duck first, then the lookout for a photo. I want everyone in it, and everyone smiling. Ish.']];
    if (c.q.ch1.done) return [['jarency', 'Everyone to the bus stop by the shops. Hats, water, sunscreen. Yes, Finn, you too.']];
    if (c.who === 'finn') return pick([[['jarency', 'We’ll find them, darling. Have you eaten anything?'], ['finn', 'I had a leaf.'], ['jarency', 'We’ll get you a proper snack.']]], c.times);
    return pick([
      [['jarency', 'Bev lost her secateurs again. If you help her, she’ll help you. That’s how Starkey Street works.']],
      [['jarency', 'Mo says the ibis has been living in the bins by the bakery. Bold bird.']],
      [['jarency', 'Take your time. It’s a nice day to be out together.']],
    ], c.times);
  },
};

// ---------- neighbours ----------
export const NPC_TALK = {
  mo: c => {
    const order = {
      dan: 'Large flat white, Dan? You look like a large flat white.',
      jessia: 'Iced chocolate, extra ice, minimal conversation. I remember.',
      finn: 'Babyccino with a marshmallow? Don’t tell your mum.',
      jarency: 'Oat latte, and I put a sourdough aside for you.',
    }[c.who];
    return pick([
      [['mo', order], ['mo', 'That kookaburra’s been watching the shops all morning. Bird knows everything that happens round here.']],
      [['mo', 'The ibis got into the bins again. I’ve named him Kevin. Kevin has no fear.']],
      [['mo', 'Busy day. Everyone’s heading to the beach.']],
    ], c.times);
  },
  aroha: c => c.q.ch1.feathers.includes('school')
    ? [['aroha', 'You found it? Lovely. The Year 2s will be devastated it wasn’t an angel feather.']]
    : [['aroha', 'Kia ora! A feather? One of the Year 2s swore they saw an angel feather in the sandpit.'], ['aroha', 'I’m not digging. This is my good cardigan.']],
  kez: c => c.q.ch2.duck
    ? [['kez', 'Your duck’s in the rock pool? Mate, that’s not even the weirdest thing I’ve seen today.']]
    : pick([
      [['kez', 'G’day. Swim between the red and yellow flags, yeah?'], ['kez', 'A duck? Yeah, saw one waddle past toward the rock pools near Shelly. Looked like it knew exactly where it was going.']],
      [['kez', 'Rock pools are just past the end of the beach walk. Watch your step, the rocks are slippery.']],
    ], c.times),
  bev: c => {
    const b = c.q.ch1.bev;
    if (b === 0) return [['bev', 'Oh, hello, love. You haven’t seen my secateurs, have you? Red handles.'], ['bev', 'I was pruning on the Garigal track this morning and put them down near that big old grass tree. Silly me.'], ['bev', 'Bring them back and I’ll swap you. Found a lovely white feather in my roses.']];
    if (b === 1) return [['bev', 'Near the big grass tree on the track, love. The one that looks like it’s having a bad hair day.']];
    if (b === 3) return pick([[['bev', 'Roses are looking lovely, aren’t they? Mind the magpie on your way out. He’s in a mood.']], [['bev', 'Say hi to your mum for me.']]], c.times);
    return [];
  },
};

// ---------- quest moments ----------
export const LINES = {
  bevReturn: [['bev', 'My secateurs! You’re a treasure.'], ['bev', 'Here you go. It was sitting in the roses, bold as brass.']],
  grassTreeFind: [['sign', 'Tucked under the grass tree’s skirt: a pair of red-handled secateurs.']],
  grassTree: [['sign', 'A grass tree. Some of these are hundreds of years old. It is in no hurry at all.']],
  kookaFirst: c => [
    ['kooka', 'Hoo-hoo-hoo-HAA-HAA-HAA.'],
    ['sign', 'The kookaburra finishes laughing. It clearly finds something very funny.'],
    ['kooka', 'A feather? White one? Saw it blow down past the shops.'],
    ['kooka', 'Last I saw, the ibis had it. Ibis takes everything. Chips. Sandwiches. Dignity.'],
  ],
  kookaAgain: [['kooka', 'Go on, then. Ibis. Bins by the bakery. Follow the smell.']],
  kookaDone: [['kooka', 'Hoo-hoo-HAA. Nice work.']],
  ibisBefore: [['sign', 'An ibis is standing directly in the bin. It looks at you. It does not move.']],
  ibisGive: c => c.who === 'finn'
    ? [['finn', 'Excuse me. That’s mine.'], ['ibis', '…'], ['finn', 'HONK.'], ['sign', 'The ibis drops the feather immediately.']]
    : [['ibis', '…'], ['sign', 'The ibis stares. You stare back. Somewhere, a car alarm goes off.'], ['sign', 'Slowly, the ibis places a slightly soggy white feather on the ground and wanders off, as if this was its idea.']],
  ibisAfter: [['ibis', '…'], ['sign', 'The ibis has found half a sausage roll. It is at peace.']],
  duckNest: c => c.who === 'finn'
    ? [['finn', 'Hello, friend. May I?'], ['duck', 'Quack.'], ['sign', 'The duck shuffles aside. Geese and ducks have an understanding.']]
    : [['sign', 'A duck is sitting very firmly on something white.'], [c.who, 'Excuse me. Are you… sitting on a feather?'], ['duck', 'Quack.'], ['sign', 'The duck stands, stretches one leg, and waddles off into the pond. Underneath: a lucky feather.']],
  sandpit: c => [
    ['sign', 'Someone has built a very ambitious sandcastle here. There’s something white in the moat.'],
    ['sign', c.who === 'finn' ? 'Finn digs with great enthusiasm and very little technique.' : 'You dig carefully around the moat.'],
  ],
  sandpitEmpty: [['sign', 'Just sand now. And a small plastic spade.']],
  ledge: c => [
    ['sign', 'Up on the sandstone ledge above the waterfall, a white feather is caught in the ferns.'],
    ['sign', {
      finn: 'Finn flaps twice, gets about forty centimetres off the ground, and grabs it on the way down.',
      dan: 'Dan reaches up. Being a bear has its advantages.',
      jessia: 'Jessia hops onto a rock, grabs it, and acts like that was easy.',
      jarency: 'Jarency is up and back down in one smooth move. Of course she is.',
    }[c.who]],
  ],
  allFeathers: [
    ['finn', 'FIVE. Five out of five! Look at them. Perfect.'],
    ['jarency', 'Well done, team. Since we’re all out anyway…'],
    ['dan', 'Beach?'],
    ['jessia', 'Beach.'],
    ['jarency', 'Manly. Bus from the stop by the shops. Last one there buys gelato.'],
  ],
  busLocked: c => [['sign', 'B-LINE to MANLY. Every ten minutes or so.'], [c.who, c.who === 'finn' ? 'I can’t leave. My feathers are still out there.' : 'Not yet. Finn would never forgive us.']],
  manlyArrive: [
    ['sign', 'Manly. Salt air, Norfolk pines, and a lifeguard who has seen everything.'],
    ['finn', 'Dad. Emergency.'],
    ['dan', 'Already?'],
    ['finn', 'There’s a DUCK. At the BEACH.'],
    ['jessia', 'Ducks are allowed at the beach, Finn.'],
    ['finn', 'Not like THIS.'],
    ['jarency', 'Go on then, find your duck. Then everyone up to the Shelly Beach lookout for a photo.'],
    ['jessia', 'Race you to the lookout. Loser carries the towels.'],
  ],
  rockDuck: c => c.who === 'finn'
    ? [['finn', 'A duck. In a rock pool. Just living its best life.'], ['duck', 'Quack.'], ['finn', 'I respect it so much.']]
    : [[c.who, 'Finn was right. There is a duck in the rock pool.'], ['duck', 'Quack.'], ['sign', 'It looks extremely pleased with itself.']],
  rockDuckAgain: [['duck', 'Quack.'], ['sign', 'The duck is having a lovely time.']],
  lookout: c => c.who === 'jessia'
    ? [['jessia', 'Won. Obviously.'], ['sign', 'The whole of Manly is spread out below: the beach, the pines, the ferry heading for the city.']]
    : [[c.who, 'Made it!'], ['jessia', 'Took your time.'], ['sign', 'The whole of Manly is spread out below: the beach, the pines, the ferry heading for the city.']],
  photoLocked: c => c.q.ch2.duck ? [['sign', 'The camera is set up. First, get everyone up to the lookout.']] : [['finn', 'We can’t take the photo yet. My duck isn’t in it. I mean, we haven’t found the duck.']],
  photo: [
    ['jarency', 'Everyone in. Finn, face the camera. Dan, coffee down.'],
    ['dan', 'Coffee is part of my look.'],
    ['jessia', 'Just press the button.'],
    ['finn', 'Say “GOOSE”!'],
  ],
};

// ---------- fishing, snorkelling, ferry, harbour ----------
export const MORE = {
  shedFirst: c => [
    ['sign', 'The garden shed. Smells like sunscreen, two-stroke and old cricket pads.'],
    ['sign', 'Leaning in the corner: the family fishing rod.'],
    [c.who, c.who === 'finn' ? 'I promise not to catch any ducks.' : 'Right. Let’s see what’s biting.'],
    ['sign', 'Stand at the edge of any water, face it, and press the button to cast. When the float plunges under, press again!'],
  ],
  shedAgain: [['sign', 'Garden shed. The mower is judging you.']],
  kezSnorkel: [
    ['kez', 'Reckon you lot deserve a snorkel after all that. Cabbage Tree Bay, right off Shelly Beach.'],
    ['kez', 'It’s an aquatic reserve, so look but don’t touch. Groper, wobbegongs, cuttlefish, the lot.'],
    ['kez', 'Here, masks and snorkels from the surf club. Just swim out from Shelly.'],
  ],
  kezSnorkelAgain: c => [['kez', `Spotted ${c.q.ch3.spotted.length} so far? The groper usually hangs round the middle of the bay.`]],
  ch3Done: [
    ['jessia', 'Okay. That was actually amazing.'],
    ['finn', 'The groper looked right at me. We’re friends now.'],
    ['jarency', 'Next weekend: the ferry into the city?'],
    ['dan', 'Why wait? The ferry’s at the wharf at the end of the Corso. It’s still light.'],
  ],
  ferryLocked: c => [['sign', 'MANLY WHARF. Ferries to Circular Quay every half hour.'], [c.who, 'Another day. There’s still stuff to do here.']],
  harbourArrive: [
    ['sign', 'Thirty minutes on the Manly ferry: past the Heads, past the little beaches, and into the harbour.'],
    ['finn', 'Dad. Emergency.'],
    ['dan', 'Again?'],
    ['finn', 'The ferry is the best thing that has ever happened to me.'],
    ['jarency', 'Plan: Jess busks at the Quay, somebody catches a fish off the wharf, then a family photo on the big steps.'],
    ['jessia', 'I did not agree to busking.'],
    ['dan', 'You brought the guitar.'],
    ['jessia', '…Fine.'],
  ],
  rodSpare: [['dan', 'Brought the rod from the shed, just in case.']],
  busk: c => c.who === 'dan'
    ? [['jessia', 'Don’t sing.'], ['sign', 'Dan sings. Jessia sighs, then joins in on harmonies. It’s… actually lovely.'], ['sign', 'A tourist drops a two-dollar coin in the case. A gull tries to take it.']]
    : c.who === 'jessia'
      ? [['sign', 'Jessia plays the song she wrote this morning. It’s called “Goose Emergency”. It has a second chord now.'], ['sign', 'A small crowd claps. Finn bows, for some reason.']]
      : [['jessia', 'One song. Then we never speak of this.'], ['sign', 'Jessia plays. People stop to listen. A few coins land in the case.'], ['jessia', 'Okay. That was fun. Tell no one.']],
  buskAgain: [['jessia', 'I’m on a break. Artists need breaks.']],
  harbourFish: [['sign', 'A harbour catch! Everyone on the wharf is impressed. Even the gulls.']],
  photoLocked4: c => [[c.who, c.q.ch4.busk ? 'Somebody still has to catch a fish off the wharf.' : 'Jess hasn’t busked yet. She’s pretending she forgot.']],
  photo4: [
    ['jarency', 'Everyone on the steps. Bridge behind us. Perfect.'],
    ['finn', 'Can the ferry be in it?'],
    ['dan', 'The ferry is in every photo from today, mate.'],
    ['jessia', 'Say “goose emergency”.'],
    ['finn', 'GOOSE EMERGENCY!'],
  ],
  ibisHarbour: [['ibis', '…'], ['sign', 'A city ibis. It has clearly seen things.']],
};

// Family chatter for later in the game (after Chapter 2 at home, and at the harbour).
export const LATER = {
  home: {
    dan: c => pick([[['dan', 'Rod’s in the shed if you want a fish at the pond. Catch and release, yeah?']], [['dan', 'I could get used to weekends like this.']]], c.times),
    finn: c => pick([[['finn', 'Did you know there are yabbies in the creek? YABBIES.']], [['finn', 'I’m keeping a fish log. It’s mostly boots so far.']]], c.times),
    jessia: c => pick([[['jessia', 'Fishing is just sitting still with extra steps. I love it.']], [['jessia', 'I added a bridge to “Goose Emergency”. The song, not a real bridge.']]], c.times),
    jarency: c => pick([[['jarency', 'Take a photo of the jacaranda for the album. It’s showing off today.']], [['jarency', 'Look at this place in the golden hour. Worth it.']]], c.times),
  },
  harbour: {
    dan: c => pick([[['dan', 'Best view in Sydney, and I’ve got a coffee. Perfect.']], [['dan', 'Fish bite best off the end of the wharves. Allegedly.']]], c.times),
    finn: c => pick([[['finn', 'That ibis has a whole sandwich. Respect.']], [['finn', 'Can we live on the ferry?']]], c.times),
    jessia: c => [['jessia', c.q.ch4.busk ? 'My hands still smell like guitar strings and chips.' : 'If I busk, nobody films it. Deal?']],
    jarency: c => pick([[['jarency', c.q.ch4.photo ? 'Two family photos in one weekend. New record.' : 'Photo on the big steps once we’re done. Bridge in the background.']], [['jarency', 'Look at the light on the sails.']]], c.times),
  },
};

export const EXAMINE = {
  mailbox: c => [['sign', 'Letterbox. Two pizza menus, a council newsletter and a postcard from Nana.']],
  hoist: c => [['sign', 'The Hills Hoist turns slowly in the breeze. Somebody’s socks have been out there since Tuesday.']],
  guitar: c => c.who === 'dan' ? [['dan', 'My guitar. I know four songs. All of them are about the beach.']] : c.who === 'jessia' ? [['jessia', 'Dad’s guitar. Slightly out of tune. It’s always slightly out of tune.']] : [['sign', 'Dan’s guitar. He knows four songs.']],
  car: c => [['sign', 'The family car. There is still sand in it from 2019.']],
  bench: c => [['sign', 'A little plaque: “For Shirley, who loved these ducks (and never fed them bread).”']],
  trackSign: c => [['sign', 'GARIGAL NATIONAL PARK. Stay on the track. Take only photos, leave only footprints.']],
  school: c => [['sign', 'Forestville Primary. It’s the weekend, so it’s very quiet. Somewhere, a forgotten lunchbox is developing a personality.']],
  kiosk: c => [['sign', 'Hot chips, gelato, and a gull who is clearly the manager.']],
  pelican: c => [['sign', 'A pelican. It is pretending not to want your chips. It wants your chips.']],
  surfFlags: c => [['sign', 'Red and yellow flags. Swim between them.']],
  cafe: c => [['sign', 'The Bush Bean. It smells like coffee and banana bread.']],
  sails: c => [['sign', 'The great white sails catch the afternoon light. Up close, they’re made of thousands of little tiles.']],
  customs: c => [['sign', 'An old sandstone building with a clock. It has watched a lot of ferries come and go.']],
  fig: c => [['sign', 'A giant Moreton Bay fig. Its roots look like they’re holding the whole garden down.']],
};

export { NAMES };
