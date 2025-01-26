import winston from "winston"
import DailyRotateFile from "winston-daily-rotate-file"

const customLevels = {
  levels: {
    fatal: 0, // Критическая ошибка
    error: 1, // Ошибка
    warn: 2, // Предупреждение
    info: 3, // Информация
    debug: 4, // Отладка
    trace: 5, // Трассировка
  },
  colors: {
    fatal: "bold red",
    error: "red",
    warn: "yellow",
    info: "blue",
    debug: "gray",
    trace: "magenta",
  },
}

winston.addColors(customLevels.colors)

const colorizer = winston.format.colorize()
const formatCombine = [
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `[${timestamp}] [${level.toUpperCase()}]: ${message}`
  }),
]

const logger = winston.createLogger({
  levels: customLevels.levels,
  level: "trace",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message }) => {
      const coloredLevel = colorizer.colorize(level, level.toUpperCase())
      return `[${timestamp}] [${coloredLevel}]: ${message}`
    })
  ),
  transports: [
    new winston.transports.Console(),
    new DailyRotateFile({
      filename: "logs/error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      level: "error",
      format: winston.format.combine(...formatCombine),
      maxFiles: "14d",
    }),
    new DailyRotateFile({
      filename: "logs/all-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      format: winston.format.combine(...formatCombine),
      maxFiles: "14d",
    }),
  ],
})

declare module "winston" {
  interface Logger {
    fatal(message: string): void
    trace(message: string): void
  }
}

// logger.fatal("This is a fatal message")
// logger.error("This is an error message")
// logger.warn("This is a warning message")
// logger.info("This is an info message")
// logger.debug("This is a debug message")
// logger.trace("This is a trace message")

export default logger
