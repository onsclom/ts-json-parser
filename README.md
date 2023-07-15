# ts-json-parser

A JSON parser in TypeScript made from scratch without `JSON.parse` or `eval`.

## Usage

`parser.ts` exports the parse function as its default export.

## Example

```ts
import parse from "./parser.ts"

const result = parse(`{
  "hello": "world",
  "foo": "bar"
}`)

console.log(result) // { "hello": "world", "foo": "bar" }

parse(`{ "hello": "world", "foo": }`) // Error: Expected value at index 27
```

## Testing

This parser passes 100% of the tests in [JSON Parsing Test Suite](https://github.com/nst/JSONTestSuite).

To run tests locally, install [Deno](https://deno.land/). Make a folder called `tests` in this projects root directory. Copy the tests from [test_parsing](https://github.com/nst/JSONTestSuite/tree/master/test_parsing) into `tests`. Run `deno run test.ts`. 

This checks that: 
1. the parser errors on invalid json
2. the parser succeeds on valid json
3. on valid json, the resulting value matches `JSON.parse`

## Why

`JSON.parse` already exists, so I really just did this for fun! The awesome railroad diagrams on [json.org](https://www.json.org/json-en.html) made it really appealing.
