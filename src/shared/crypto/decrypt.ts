import config from "config"
import crypto from "crypto"

const algorithm = "aes-256-cbc"

export const decryptString = (encryptedString: string, iv: string): string => {
  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(config.app.encryptionKey, "hex"),
    Buffer.from(iv, "hex")
  )
  let decrypted = decipher.update(encryptedString, "hex", "utf8")
  decrypted += decipher.final("utf8")
  return decrypted
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [encryptedString, iv] = process.argv.slice(2)

  if (!encryptedString || !iv) {
    console.error("Usage: npm run decrypt <encryptedString> <iv>")
    process.exit(1)
  }

  try {
    const decrypted = decryptString(encryptedString, iv)
    console.log("Decrypted String:", decrypted)
  } catch (error) {
    const err = error as Error
    console.error("Failed to decrypt string:", err.message)
    process.exit(1)
  }
}
