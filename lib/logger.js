// Simple logger with leveled logging and structured output
const LEVELS = ['error', 'warn', 'info', 'debug'];
const CURRENT_LEVEL = process.env.LOG_LEVEL || 'info';

function shouldLog(level) {
  return LEVELS.indexOf(level) <= LEVELS.indexOf(CURRENT_LEVEL);
}

function base(level, args) {
  if (!shouldLog(level)) return;
  const ts = new Date().toISOString();
  // Avoid spreading objects directly so we can JSON stringify
  const serialized = args.map(a => {
    if (a instanceof Error) {
      return { message: a.message, stack: a.stack, name: a.name };
    }
    return a;
  });
  // eslint-disable-next-line no-console
  console[level === 'debug' ? 'log' : level](
    JSON.stringify({ ts, level, msg: serialized })
  );
}

export const logger = {
  error: (...a) => base('error', a),
  warn: (...a) => base('warn', a),
  info: (...a) => base('info', a),
  debug: (...a) => base('debug', a),
  child(namespace) {
    return {
      error: (...a) => logger.error(namespace, ...a),
      warn: (...a) => logger.warn(namespace, ...a),
      info: (...a) => logger.info(namespace, ...a),
      debug: (...a) => logger.debug(namespace, ...a)
    };
  }
};

export default logger;