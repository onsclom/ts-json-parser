import parse from "./parser.ts"

const files = Deno.readDirSync("./tests")

const incorrectValidity: {
  name: string
  expected: boolean
}[] = []

const incorrectContent: {
  name: string
  expected: string
  actual: string
}[] = []

for (const file of files) {
  const name = file.name
  if (name.startsWith("i")) continue

  const contents = Deno.readTextFileSync(`./tests/${name}`)

  const expectedValid = name.startsWith("y") ? true : false
  let actualValid = true
  let parseResult: unknown
  try {
    parseResult = parse(contents)
  } catch {
    actualValid = false
  }

  if (expectedValid !== actualValid)
    incorrectValidity.push({ name, expected: expectedValid })

  if (actualValid && expectedValid) {
    const actual = parseResult
    const expected = JSON.parse(contents)
    const stringifiedExpected = JSON.stringify(expected)
    const stringifiedActual = JSON.stringify(actual)
    if (stringifiedExpected !== stringifiedActual)
      incorrectContent.push({
        name,
        expected: stringifiedExpected,
        actual: stringifiedActual,
      })
  }
}

for (const { name, expected } of incorrectValidity)
  console.log(
    `Expected ${name} to be ${
      expected ? "valid" : "invalid"
    }, but it was considered ${expected ? "invalid" : "valid"}`
  )

for (const { name, expected, actual } of incorrectContent)
  console.log(
    `Expected ${name} to parse to ${expected}, but it parsed to ${actual}`
  )

if (incorrectValidity.length === 0 && incorrectContent.length === 0)
  console.log("All tests passed! 🎉")
