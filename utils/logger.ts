type LogLevel = "info" | "warn" | "error" | "debug"

class Logger {
  private log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    const timestamp = new Date().toISOString()
    const logData = {
      timestamp,
      level,
      message,
      ...(meta && { meta }),
    }

    // In a real production app, we could send this to a service like Datadog, Sentry, etc.
    // For now, we log to the console with basic formatting.
    switch (level) {
      case "info":
        console.log(`[INFO] ${timestamp} - ${message}`, meta ? meta : "")
        break
      case "warn":
        console.warn(`[WARN] ${timestamp} - ${message}`, meta ? meta : "")
        break
      case "error":
        console.error(`[ERROR] ${timestamp} - ${message}`, meta ? meta : "")
        break
      case "debug":
        if (process.env.NODE_ENV !== "production") {
          console.debug(`[DEBUG] ${timestamp} - ${message}`, meta ? meta : "")
        }
        break
    }
  }

  info(message: string, meta?: Record<string, unknown>) {
    this.log("info", message, meta)
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.log("warn", message, meta)
  }

  error(message: string, meta?: Record<string, unknown> | Error) {
    if (meta instanceof Error) {
      this.log("error", message, { error: meta.message, stack: meta.stack })
    } else {
      this.log("error", message, meta)
    }
  }

  debug(message: string, meta?: Record<string, unknown>) {
    this.log("debug", message, meta)
  }
}

export const logger = new Logger()
