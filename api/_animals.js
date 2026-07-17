// Shared animal metadata used by the serverless API for validation,
// baseline ordering, and weekly poll selection. Keep in sync with the
// ANIMALS array in index.html (id, name, chadScore only — the API
// never needs the rest of the profile data).
const ANIMALS = [
  {"id":"gorilla","name":"Mountain Gorilla","chadScore":96},
  {"id":"razorbill","name":"Razorbill","chadScore":91},
  {"id":"lion","name":"African Lion","chadScore":98},
  {"id":"secretarybird","name":"Secretary Bird","chadScore":88},
  {"id":"harpyeagle","name":"Harpy Eagle","chadScore":85},
  {"id":"orca","name":"Transient (Bigg's) Orca","chadScore":94},
  {"id":"elephant","name":"African Elephant","chadScore":82},
  {"id":"jaguar","name":"Amazonian Jaguar","chadScore":93},
  {"id":"gharial","name":"Gharial","chadScore":74},
  {"id":"grizzly","name":"Grizzly Bear","chadScore":87},
  {"id":"ram","name":"Bighorn Sheep","chadScore":78},
  {"id":"peacock","name":"Indian Peafowl","chadScore":89},
  {"id":"greatwhite","name":"Great White Shark","chadScore":90},
  {"id":"shoebill","name":"Shoebill","chadScore":79},
  {"id":"muskox","name":"Barren-ground Muskox","chadScore":76},
  {"id":"stallion","name":"Horse","chadScore":92},
  {"id":"marabou","name":"Marabou Stork","chadScore":69},
  {"id":"bison","name":"Plains Bison","chadScore":81},
  {"id":"tiger","name":"Bengal Tiger","chadScore":95},
  {"id":"rhino","name":"Indian Rhinoceros","chadScore":80},
  {"id":"mandrill","name":"Mandrill","chadScore":73},
  {"id":"cassowary","name":"Southern Cassowary","chadScore":77},
  {"id":"wolf","name":"Arctic Wolf","chadScore":86},
  {"id":"kingeider","name":"King Eider","chadScore":71},
  {"id":"baldeagle","name":"Northern Bald Eagle","chadScore":83},
  {"id":"zebra","name":"Plains Zebra","chadScore":75},
  {"id":"snowleopard","name":"Snow Leopard","chadScore":84},
  {"id":"panther","name":"Melanistic African Leopard","chadScore":72},
  {"id":"elk","name":"Rocky Mountain Elk","chadScore":68},
  {"id":"komodo","name":"Komodo Dragon","chadScore":70}
];

const ANIMAL_IDS = ANIMALS.map(a => a.id);
const ANIMAL_BY_ID = Object.fromEntries(ANIMALS.map(a => [a.id, a]));

function baselineOrder(){
  return ANIMALS.slice()
    .sort((a, b) => b.chadScore - a.chadScore || a.name.localeCompare(b.name))
    .map(a => a.id);
}

module.exports = { ANIMALS, ANIMAL_IDS, ANIMAL_BY_ID, baselineOrder };
