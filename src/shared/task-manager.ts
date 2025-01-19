import { FloodWaitError } from "telegram/errors"
import { TelegramManager } from "./telegram/manager"
import { Entity } from "telegram/define"

export class TaskManager {
  private sessionLimits: Record<string, number> = {}
  private taskQueue: (() => Promise<any>)[] = []
  public countLimit: number

  constructor(private telegramManager: TelegramManager) {
    this.countLimit = 200
  }

  async enqueueTask<T>(task: () => Promise<T>) {
    this.taskQueue.push(task)
    if (this.taskQueue.length === 1) {
      return await this.runTask()
    }
  }

  private async runTask(): Promise<Entity | undefined> {
    if (this.taskQueue.length === 0) return

    const task = this.taskQueue[0]
    try {
      const result = await task()
      this.taskQueue.shift()
      return result
    } catch (err) {
      if (err instanceof FloodWaitError) {
        await this.telegramManager.switchSession()
        this.taskQueue.unshift(task)
        return await this.runTask()
      } else {
        throw err
      }
    }
  }

  async trackRequest(sessionId: string) {
    if (!this.sessionLimits[sessionId]) {
      this.sessionLimits[sessionId] = 0
    }
    this.sessionLimits[sessionId]++
    if (this.sessionLimits[sessionId] >= this.countLimit) {
      await this.telegramManager.switchSession()
    }
  }
}
