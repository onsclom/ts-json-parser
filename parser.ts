type ParserInput<I> = {
  input: I[]
  index: number
}

type ParserError<I> = {
  type: "error"
  message: string
  index: number
  input: I[]
}

type ParserSuccess<I, O> = {
  type: "success"
  value: O
  index: number
  input: I[]
}

type ParserResult<I, O> = ParserError<I> | ParserSuccess<I, O>

type Parser<I, O> = (input: ParserInput<I>) => ParserResult<I, O>

function parse<I, O>(parser: Parser<I, O>, input: I[]): ParserResult<I, O> {
  return parser({ input, index: 0 })
}

function parseString<O>(parser: Parser<string, O>, input: string) {
  return parse(parser, input.split(""))
}

function success<I, O>(
  value: O,
  index: number,
  input: I[]
): ParserSuccess<I, O> {
  return {
    type: "success",
    value,
    index,
    input,
  }
}

function failure<I>(
  message: string,
  index: number,
  input: I[]
): ParserError<I> {
  return {
    type: "error",
    message,
    index,
    input,
  }
}

const whitespaceChars = [" ", "\n", "\r", "\t"]
function number(input: ParserInput<string>) {
  const chars = input.input
  let cur = input.index
  let result = ""

  if (chars[cur] === "-") result += chars[cur++]

  if (chars[cur] === "0") result += chars[cur++]
  else if (chars[cur] >= "1" && chars[cur] <= "9")
    while (chars[cur] >= "0" && chars[cur] <= "9") result += chars[cur++]
  else return failure("Expected digit", cur, chars)

  if (chars[cur] === ".") {
    result += chars[cur++]
    if ((chars[cur] >= "0" && chars[cur] <= "9") === false)
      return failure("Expected digit", cur, chars)
    while (chars[cur] >= "0" && chars[cur] <= "9") result += chars[cur++]
  }

  if (chars[cur] === "e" || chars[cur] === "E") {
    result += chars[cur++]
    if (chars[cur] === "+" || chars[cur] === "-") result += chars[cur++]
    if ((chars[cur] >= "0" && chars[cur] <= "9") === false)
      return failure("Expected digit", cur, chars)
    while (chars[cur] >= "0" && chars[cur] <= "9") result += chars[cur++]
  }

  return success(Number(result), cur, chars)
}

const escapeCharsMap = new Map([
  ['"', '"'],
  ["\\", "\\"],
  ["/", "/"],
  ["b", "\b"],
  ["f", "\f"],
  ["n", "\n"],
  ["r", "\r"],
  ["t", "\t"],
])

function string(input: ParserInput<string>) {
  const chars = input.input
  let cur = input.index
  let result = ""

  if (chars[cur] !== '"') return failure("Expected quote", cur, chars)
  cur++

  while (chars[cur] !== '"' && cur < chars.length) {
    if (chars[cur] < " ")
      return failure("Unexpected control character", cur, chars)

    if (chars[cur] === "\\") {
      cur++

      const escapeMapResult = escapeCharsMap.get(chars[cur])
      if (escapeMapResult) {
        result += escapeMapResult
        cur++
      } else if (chars[cur] === "u") {
        cur++
        let code = ""
        for (let i = 0; i < 4; i++) {
          if (chars[cur] && chars[cur].match(/[0-9a-fA-F]/))
            code += chars[cur++]
          else return failure("Expected hex digit", cur, chars)
        }
        result += String.fromCharCode(parseInt(code, 16))
      } else return failure("Expected escape char", cur, chars)
    } else result += chars[cur++]
  }

  if (chars[cur] !== '"') return failure("Expected quote", cur, chars)
  return success(result, cur + 1, chars)
}

// explicit types required to avoid circular type reference
type BasicValue = string | number | boolean | null
type Value = BasicValue | Value[] | { [key: string]: Value }

// value surrounded by optional whitespace
function value(input: ParserInput<string>): ParserResult<string, Value> {
  const chars = input.input
  let cur = input.index

  while (whitespaceChars.includes(chars[cur])) cur++

  const valueResult = _value({ input: chars, index: cur })
  if (valueResult.type === "error") return valueResult

  while (whitespaceChars.includes(chars[valueResult.index])) valueResult.index++
  return valueResult
}

// value without whitespace
function _value(input: ParserInput<string>) {
  const { input: chars, index: cur } = input
  if (chars[cur] === '"') return string(input)
  if (chars[cur] === "[") return array(input)
  if (chars[cur] === "{") return object(input)
  if (chars[cur] && chars[cur].match(/[0-9]|-/)) return number(input)

  const maxLiteralLength = 5
  const slice = chars.slice(cur, cur + maxLiteralLength).join("")
  if (slice.startsWith("true")) return success(true, cur + 4, chars)
  if (slice.startsWith("false")) return success(false, cur + 5, chars)
  if (slice.startsWith("null")) return success(null, cur + 4, chars)

  return failure("Expected value", cur, chars)
}

function array(input: ParserInput<string>) {
  const chars = input.input
  let cur = input.index

  if (chars[cur] !== "[") return failure("Expected [", cur, chars)
  cur++
  const results: Value[] = []

  const firstValueResult = value({ input: chars, index: cur })
  if (firstValueResult.type === "success") {
    results.push(firstValueResult.value)
    cur = firstValueResult.index

    while (chars[cur] === ",") {
      cur++
      const valueResult = value({ input: chars, index: cur })
      if (valueResult.type === "error") return valueResult
      results.push(valueResult.value)
      cur = valueResult.index
    }
  }

  if (chars[cur] !== "]") return failure("Expected ]", cur, chars)
  return success(results, cur + 1, chars)
}

function object(input: ParserInput<string>) {
  const chars = input.input
  let cur = input.index

  if (chars[cur] !== "{") return failure("Expected {", cur, chars)
  cur++
  const results: { [key: string]: Value } = {}

  const firstKeyValResult = keyValPair({ input: chars, index: cur })
  if (firstKeyValResult.type === "success") {
    const keyValResult = keyValPair({ input: chars, index: cur })
    if (keyValResult.type === "error") return keyValResult
    results[keyValResult.value.key] = keyValResult.value.val
    cur = keyValResult.index
    while (chars[cur] === ",") {
      cur++
      const keyValResult = keyValPair({ input: chars, index: cur })
      if (keyValResult.type === "error") return keyValResult
      results[keyValResult.value.key] = keyValResult.value.val
      cur = keyValResult.index
    }
  }

  if (chars[cur] !== "}") return failure("Expected }", cur, chars)
  return success(results, cur + 1, chars)
}

function keyValPair(input: ParserInput<string>) {
  const chars = input.input
  let cur = input.index

  while (whitespaceChars.includes(chars[cur])) cur++

  chars[cur]
  const keyResult = string({ input: chars, index: cur })
  if (keyResult.type === "error") return keyResult
  cur = keyResult.index

  while (whitespaceChars.includes(chars[cur])) cur++

  if (chars[cur] !== ":") return failure("Expected :", cur, chars)
  cur++

  const valResult: ParserResult<string, Value> = value({
    input: chars,
    index: cur,
  })
  if (valResult.type === "error") return valResult
  cur = valResult.index

  return success(
    {
      key: keyResult.value,
      val: valResult.value,
    },
    cur,
    chars
  )
}

function generateErrorMessage(message: string, index: number) {
  return `${message} at index ${index}`
}

function parseJson(json: string) {
  try {
    const result = parseString(value, json)
    if (result.type === "success" && result.index !== json.length)
      return failure("Expected end of input", result.index, json.split(""))
    return result
  } catch (e) {
    // TODO: handle max nesting limit better
    if (e instanceof RangeError)
      return failure("JSON passes nesting limit", 0, json.split(""))
    throw e
  }
}

export default (json: string) => {
  const result = parseJson(json)
  if (result.type === "error")
    throw new Error(generateErrorMessage(result.message, result.index))
  return result.value
}
