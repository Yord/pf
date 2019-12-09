![pf header][header]

`pf` (parser functions) is a fast and extensible command-line data (e.g. JSON) processor similar to `jq` and `fx`.

[![npm version](https://img.shields.io/npm/v/fx.svg?color=orange)](https://www.npmjs.com/package/fx)
[![license](https://img.shields.io/badge/license-MIT-blue.svg?color=green)][license]

## Installation

`pf` requires **node v8.3.0** or higher.

Installation is done using the [global `npm install` command][npm].

```bash
$ npm install --global @pf/cli
```

Try `pf --help` to see if the installation was successful.

## Features

+   **Blazing fast:** >2x faster than `jq` and >10x faster than `fx` in transforming json.
+   **Highly extensible:** Trivial to write and use parser, lexer, and marshaller plugins.
+   **Not limited to JSON:** Also supports parsing and writing other data formats via plugins (i.a. [CSV][pf-csv], [XML][pf-xml]).
+   **Configurable DSL:** Add Ramda, Lodash or any other library for transforming JSON.
+   **Streaming support:** Supports streaming JSON out of the box.

## Sample Usage

Using `pf` to select all Unix timestamps from a large file containing all seconds of 2019 (602 MB, 31536000 lines) in JSON format takes ~18 seconds (macOS 10.15, 2.8 GHz i7 processor):

```bash
$ pf "json => json.time" < 2019.jsonl > out.jsonl
```

`jq` takes 2.5x longer (~46 seconds) and `fx` takes 16x longer (~290 seconds).
See the performance section for details.

`pf` also works on JSON streams:

```json
$ curl -s "https://swapi.co/api/films/" |
  pf "json => json.results" -l jsonStream -a flatMap -s '["episode_id","title"]' |
  sort

{"episode_id":1,"title":"The Phantom Menace"}
{"episode_id":2,"title":"Attack of the Clones"}
{"episode_id":3,"title":"Revenge of the Sith"}
{"episode_id":4,"title":"A New Hope"}
{"episode_id":5,"title":"The Empire Strikes Back"}
{"episode_id":6,"title":"Return of the Jedi"}
{"episode_id":7,"title":"The Force Awakens"}
```

See the usage and performance sections below for more examples.

## Parser Functions

`pf` is a command-line tool for processing data from large files and streams.
Simply put, it works like this:

```javascript
function pf (chunk) {            // Data chunks are passed to pf from stdin.
  const tokens = lex(chunk)      // The chunks are lexed and tokens are identified.
  const jsons  = parse(tokens)   // The tokens get parsed into JSON objects. 
  const jsons2 = apply(f, jsons) // f is applied to each object and new JSON objects are returned.
  const string = marshal(jsons2) // The new objects are converted to a string.
  process.stdout.write(string)   // The string is written to stdout.
}
```

Lexing, parsing, and marshalling JSON is provided by the [`pf-json`][pf-json] plugin.

### Plugins

The following plugins are available:

|                             | Lexers       | Parsers                  | Applicators                      | Marshallers      | in `pf` |
|-----------------------------|--------------|--------------------------|----------------------------------|------------------|:-------:|
| [`@pf/core`][pf-core]       | `id`, `line` | `id`                     | `map`, `flatMap`, `filter`, `id` | `toString`, `id` |    ✓    |
| [`@pf/json`][pf-json]       | `jsonStream` | `jsonSingle`, `jsonBulk` |                                  | `jsonStringify`  |    ✓    |
| [`@pf/csv`][pf-csv]         | ???          | ???                      | ???                              | ???              |    ✕    |
| [`@pf/xml`][pf-xml]         | ???          | ???                      | ???                              | ???              |    ✕    |
| [`@pf/geojson`][pf-geojson] | ???          | ???                      | ???                              | `geojson`        |    ✕    |
| [`@pf/sample`][pf-sample]   | `sample`     | `sample`                 | `sample`                         | `sample`         |    ✕    |

The last column tells what plugins come preinstalled in `pf`.
Refer to the `.pfrc` Module section to see how to enable other plugins.

### Performance

`pf-json`s lexers and parsers are build for speed and beat [`jq`][jq] and [`fx`][fx] in several benchmarks (see medium post (TODO) for details):

|                 | `pf` (time) | `jq` (time) | `fx` (time) | `jq` (RAM) | `pf` (RAM) | `fx` (RAM) | all (CPU) |
|-----------------|------------:|------------:|------------:|-----------:|-----------:|-----------:|----------:|
| **Benchmark A** |     **18s** |         46s |        290s |     **1M** |        46M |        54M |  **100%** |
| **Benchmark B** |     **42s** |        164s |        463s |     **1M** |        48M |        73M |  **100%** |
| **Benchmark C** |     **14s** |         44s |         96s |     **1M** |        48M |        51M |  **100%** |

`pf` beats `jq` and `fx` in processing speed in all three benchmarks.
Since `jq` is written in C, it easily beats `pf` and `fx` in RAM usage.
All three run single-threaded and use 100% of one CPU core.

## `.pfrc` Module

Users may extend and modify `pf` by providing a `.pfrc` module.
If you wish to do that, create a `~/.pfrc/index.js` file and insert the following base structure:

```js
module.exports = {
  plugins:  [],
  context:  {},
  defaults: {}
}
```

### Writing Custom Plugins

You may write custom `pf` plugins in `~/.pfrc/index.js`.
Writing your own extensions is straightforward:

```js
const sampleLexer = {
  name: 'sample',
  desc: 'is a sample lexer.',
  func: (verbose, failEarly, argv) => (data, prevLines) => (
    {err: '', tokens: [data], lines: [], lastLine: -1, rest: ''}
  )
}

const sampleParser = {
  name: 'sample',
  desc: 'is a sample parser.',
  func: (verbose, failEarly, argv) => (tokens, lines) => (
    {err: '', jsons: tokens}
  )
}

const sampleApplicator = {
  name: 'sample',
  desc: 'is a sample applicator.',
  func: (verbose, failEarly, fs, argv) => (jsons, lines) => (
    {err: '', jsons: jsons}
  )
}

const sampleMarshaller = {
  name: 'sample',
  desc: 'is a sample marshaller.',
  func: (verbose, failEarly, argv) => jsons => (
    {err: '', str: jsons.map(json => json.toString()).join('')}
  )
}
```

The `name` is used by `pf` to select your extension,
the `desc` is displayed in the options section of `pf --help`, and
the `func` is called by `pf` to transform data.

The sample extensions are bundled to the sample plugin, as follows:

```js
const samplePlugin = {
  lexers:      [sampleLexer],
  parsers:     [sampleParser],
  applicators: [sampleApplicator],
  marshallers: [sampleMarshaller]
}
```

### Extending `pf` with Plugins

Plugins can come from two sources.
They are either written by users, as shown in the previous section, or they are installed in `~/.pfrc/` as follows:

```bash
npm install @pf/sample
```

If a plugin was installed from `npm`, it has to be imported into `~/.pfrc/index.js`:

```js
const samplePlugin = require('@pf/sample')
```

Regardless of whether a plugin was defined by the user or installed from `npm`,
all plugins are added to the `.pfrc` module the same way:

```js
module.exports = {
  plugins:  [samplePlugin],
  context:  {},
  defaults: {}
}
```

`pf --help` should now list the sample plugin extensions in the options section.

### Including Libraries like Ramda or Lodash

Libraries like [Ramda][ramda] and [Lodash][lodash] are of immense help when writing functions to transform JSON objects.
But different people have different preferences, which is why `pf` lets the user decide which libraries to use.

First, install your preferred library in `~/.pfrc/`:

```bash
npm install ramda
npm install lodash
```

Next, add the libraries to `~/.pfrc/index.js`:

```js
const R = require('ramda')
const L = require('lodash')

module.exports = {
  plugins:  [],
  context:  Object.assign({}, R, {_: L}),
  defaults: {}
}
```

You may now use all ramda functions without prefix, and all lodash functions with prefix `_`:

```bash
$ pf "prop('time')" < 2019.jsonl > out.jsonl
$ pf "json => _.get(json, 'time')" < 2019.jsonl > out.jsonl
```

> :warning: Using Ramda and Lodash may have a **negative impact on performance**!

### Changing `pf` Defaults

You may **globally** change default lexers, parsers, applicators, and marshallers in `~/.pfrc/index.js`, as follows:

```js
module.exports = {
  plugins:  [],
  context:  {},
  defaults: {
    lexer:      'sample',
    parser:     'sample',
    applicator: 'sample',
    marshaller: 'sample'
  }
}
```

> :warning: Defaults are assigned **globally** and changing them may **break existing `pf` scripts**!

## Usage

Selecting all Unix timestamps from a file containing all seconds of 2019 (602 MB, 31536000 lines) in JSON format (e.g. `{"time":1546300800}`) takes ~18 seconds (macOS 10.15, 2.8 GHz i7 processor):

```bash
$ pf "json => json.time" < 2019.jsonl > out.jsonl

1546300800
1546300801
...
1577836798
1577836799
```

Transforming Unix timestamps to an ISO string from the same file (602MB) takes ~42 seconds:

```bash
$ pf "json => (json.iso = new Date(json.time * 1000).toISOString(), json)" < 2019.jsonl > out.jsonl

{"time":1546300800,"iso":"2019-01-01T00:00:00.000Z"}
{"time":1546300801,"iso":"2019-01-01T00:00:01.000Z"}
...
{"time":1577836798,"iso":"2019-12-31T23:59:58.000Z"}
{"time":1577836799,"iso":"2019-12-31T23:59:59.000Z"}
```

Selecting all entries from May the 4th from the same file (602MB) takes 14 seconds:

```bash
$ pf "({time}) => time >= 1556928000 && time <= 1557014399" -a filter < 2019.jsonl > out.jsonl

{"time":1556928000}
{"time":1556928001}
...
{"time":1557014398}
{"time":1557014399}
```

### Example: Way to go Anakin!

Select the name, height, and mass of the first ten Star Wars characters:

```json
$ curl -s "https://swapi.co/api/people/" |
  pf "json => json.results" -l jsonStream -a flatMap -s '["name","height","mass"]'

{"name":"Luke Skywalker","height":"172","mass":"77"}
{"name":"C-3PO","height":"167","mass":"75"}
{"name":"R2-D2","height":"96","mass":"32"}
{"name":"Darth Vader","height":"202","mass":"136"}
{"name":"Leia Organa","height":"150","mass":"49"}
{"name":"Owen Lars","height":"178","mass":"120"}
{"name":"Beru Whitesun lars","height":"165","mass":"75"}
{"name":"R5-D4","height":"97","mass":"32"}
{"name":"Biggs Darklighter","height":"183","mass":"84"}
{"name":"Obi-Wan Kenobi","height":"182","mass":"77"}
```

Compute all character's [BMI][BMI]:

```json
$ curl -s "https://swapi.co/api/people/" |
  pf "json => json.results" -l jsonStream -a flatMap -s '["name","height","mass"]' |
  pf "ch => (ch.bmi = ch.mass / (ch.height / 100) ** 2, ch)" -s '["name","bmi"]'

{"name":"Luke Skywalker","bmi":26.027582477014604}
{"name":"C-3PO","bmi":26.89232313815483}
{"name":"R2-D2","bmi":34.72222222222222}
{"name":"Darth Vader","bmi":33.33006567983531}
{"name":"Leia Organa","bmi":21.77777777777778}
{"name":"Owen Lars","bmi":37.87400580734756}
{"name":"Beru Whitesun lars","bmi":27.548209366391188}
{"name":"R5-D4","bmi":34.009990434690195}
{"name":"Biggs Darklighter","bmi":25.082863029651524}
{"name":"Obi-Wan Kenobi","bmi":23.24598478444632}
```

Select only obese Star Wars characters:

```json
$ curl -s "https://swapi.co/api/people/" |
  pf "json => json.results" -l jsonStream -a flatMap -s '["name","height","mass"]' |
  pf "ch => (ch.bmi = ch.mass / (ch.height / 100) ** 2, ch)" -s '["name","bmi"]' |
  pf "ch => ch.bmi >= 30" -a filter -s '["name"]'

{"name":"R2-D2"}
{"name":"Darth Vader"}
{"name":"Owen Lars"}
{"name":"R5-D4"}
```

Turns out, Anakin could use some training!

## Related

+   [`jq`][jq]: Command-line JSON processor.
+   [`fx`][fx]: Command-line tool and terminal JSON viewer.

## License

This project is under the [MIT][license] license.

[header]: ./header.gif
[npm]: https://docs.npmjs.com/downloading-and-installing-packages-globally
[BMI]: https://en.wikipedia.org/wiki/Body_mass_index
[fx]: https://github.com/antonmedv/fx
[jq]: https://github.com/stedolan/jq
[pf-core]: https://github.com/Yord/pf-core
[pf-json]: https://github.com/Yord/pf-json
[pf-csv]: https://github.com/Yord/pf-cli
[pf-xml]: https://github.com/Yord/pf-cli
[pf-geojson]: https://github.com/Yord/pf-cli
[pf-sample]: https://github.com/Yord/pf-sample
[ramda]: https://ramdajs.com/
[lodash]: https://lodash.com/
[license]: https://github.com/Yord/pf-cli/blob/master/LICENSE