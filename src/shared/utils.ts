import assert from "assert"
import { distance } from "fastest-levenshtein"
import readline from "readline"

export const checkEnv = (variable: string) => {
  assert(process.env[variable], `Env ${variable} undefined`)
}

export const input = (query: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close()
      resolve(ans)
    })
  )
}

export const compareText = (text1: string, text2: string) => {
  const levenshteinDistance = distance(text1, text2)
  const maxLength = Math.max(text1.length, text2.length)
  if (maxLength === 0) return true
  const similarity = ((maxLength - levenshteinDistance) / maxLength) * 100

  return similarity >= 95
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const random = (from: number, to: number) =>
  Math.floor(Math.random() * (to - from + 1) + from)

export async function waiter(
  checkCondition: () => Promise<boolean> | boolean,
  interval: number
): Promise<void> {
  return new Promise((resolve) => {
    const timer = setInterval(async () => {
      const conditionMet = await checkCondition()
      if (conditionMet) {
        clearInterval(timer)
        resolve()
      }
    }, interval)
  })
}
