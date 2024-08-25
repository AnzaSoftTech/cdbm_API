const logger = require('./logger');
const path = require('path');

function logError(error, req, customData = {}) {
  const errorDetails = {
    message: error.message,
    method: req.method,
    url: req.originalUrl,
    query: req.query,
    body: req.body,
    ...customData,
  };

  const errorLocation = getErrorLocation();

  const logMessage = `
    Error Message: ${errorDetails.message}
    Method: ${errorDetails.method}
    URL: ${errorDetails.url}
    Query: ${JSON.stringify(errorDetails.query)}
    Body: ${JSON.stringify(errorDetails.body)}
    File: ${errorLocation.file}
    Line: ${errorLocation.line}
    Column: ${errorLocation.column}
    Function: ${errorLocation.functionName}
  `;

  logger.error(logMessage);
}

function getErrorLocation() {
  const error = new Error();
  const stackLines = error.stack.split('\n');
  const stackLine = stackLines[2]; // Adjust according to where the correct stack line is

  const matchResult = stackLine.match(/at\s+(.*)\s+\((.*):(\d+):(\d+)\)/) ||
                      stackLine.match(/at\s+()(.*):(\d+):(\d+)/);

  if (matchResult) {
    return {
      functionName: matchResult[1] || 'anonymous',
      file: path.basename(matchResult[2]),
      line: matchResult[3],
      column: matchResult[4]
    };
  }

  return {
    functionName: 'unknown',
    file: 'unknown',
    line: 'unknown',
    column: 'unknown'
  };
}

module.exports = logError;
