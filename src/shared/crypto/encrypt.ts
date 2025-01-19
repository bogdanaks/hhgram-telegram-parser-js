import crypto from "crypto"
import config from "config"

const algorithm = "aes-256-cbc"
const ivLength = 16

export const encryptString = (text: string): { encryptedString: string; iv: string } => {
  if (!config.app.encryptionKey) {
    throw new Error("Encryption key is not set in the configuration")
  }

  if (!text) {
    throw new Error("Text to encrypt is empty")
  }

  const iv = crypto.randomBytes(ivLength)
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(config.app.encryptionKey, "hex"), iv)
  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")
  return { encryptedString: encrypted, iv: iv.toString("hex") }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [text] = process.argv.slice(2)

  if (!text) {
    console.error("Usage: npm run encrypt <string>")
    process.exit(1)
  }

  try {
    const encrypted = encryptString(text)
    console.log("Encrypted String:", encrypted)
  } catch (error) {
    const err = error as Error
    console.error("Failed to encrypt string:", err.message)
    process.exit(1)
  }
}
