// import { CustomMessageHandler } from "./handlers/custom"
import DefaultMessageHandler from "./handlers/default"
import path from "path"
import fs from "fs"
import { BaseMessageHandler } from "./types"
import { Logger } from "winston"

const __filename = new URL(import.meta.url).pathname
const __dirname = path.dirname(__filename)

export class MessageHandlerFactory {
  private logger: Logger
  private handlersMap = new Map<string, BaseMessageHandler>()

  constructor({ logger }: { logger: Logger }) {
    this.logger = logger
    this.handlersMap.set("default", new DefaultMessageHandler())
    this.loadHandlers()
  }

  getHandler(id: string): BaseMessageHandler {
    return this.handlersMap.get(id) || new DefaultMessageHandler()
  }

  private async loadHandlers() {
    const handlersDir = path.resolve(__dirname, "handlers")
    const files = fs.readdirSync(handlersDir)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const filePath = path.join(handlersDir, file)

      if (file.endsWith(".ts") && fs.statSync(filePath).isFile()) {
        const handlerId = path.basename(file, ".ts")

        try {
          const module = await import(filePath)

          if (module.default) {
            const handler: BaseMessageHandler = new module.default()
            this.handlersMap.set(handlerId, handler)
          }
        } catch (err) {
          this.logger.error(`Error loading handler for ${handlerId}:`, err)
        }
      }
    }
    this.logger.info(`${files.length} message handlers loaded`)
  }
}
