// Downloads country and element facts that `build-trivia.mjs` turns into questions.
// Countries: mledoze/countries via the world-countries package (ODbL 1.0). Elements: names, symbols
// and atomic numbers, which are plain facts. Output is committed to scripts/sources/facts.json.
// Run: node scripts/fetch-facts.mjs                      (downloads)
//      node scripts/fetch-facts.mjs <countries> <elements> (reads files already downloaded)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const fetchJson = (url) => JSON.parse(execFileSync('curl', ['-s', '-L', '-m', '120', url]).toString());
const [countriesFile, elementsFile] = process.argv.slice(2);
const countries = countriesFile ? JSON.parse(readFileSync(countriesFile, 'utf8')) : fetchJson('https://cdn.jsdelivr.net/npm/world-countries@5.1.0/countries.json');
const elements = (elementsFile ? JSON.parse(readFileSync(elementsFile, 'utf8')) : fetchJson('https://raw.githubusercontent.com/Bowserinator/Periodic-Table-JSON/master/PeriodicTableJSON.json')).elements;

const byCode = new Map(countries.map((c) => [c.cca3, c.name.common]));
const out = {
  attribution: 'Country facts from mledoze/countries (ODbL 1.0).',
  countries: countries
    .filter((c) => c.independent && c.unMember)
    .map((c) => ({
      name: c.name.common,
      capital: c.capital?.length === 1 ? c.capital[0] : null,
      currency: Object.values(c.currencies ?? {}).length === 1 ? Object.values(c.currencies)[0].name : null,
      region: c.region,
      subregion: c.subregion,
      landlocked: !!c.landlocked,
      borders: (c.borders ?? []).map((b) => byCode.get(b)).filter(Boolean),
      tld: c.tld?.[0] ?? null,
      calling: c.idd?.suffixes?.length === 1 ? `${c.idd.root}${c.idd.suffixes[0]}` : null,
      area: c.area
    })),
  elements: elements.map((e) => ({ name: e.name, symbol: e.symbol, number: e.number }))
};
writeFileSync('scripts/sources/facts.json', JSON.stringify(out));
console.log(out.countries.length, 'countries', out.elements.length, 'elements');
