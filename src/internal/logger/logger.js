const fs = require("fs");
const path = require("path");
const { createTask } = require("../task/task");

const LOG_FILE = path.join(__dirname, "../../../logs.txt");

  // Appends a success log entry to logs.txt

 

function logSuccess(task) {
  const payloadStr = JSON.stringify(task.payload ?? {});
  const text = `\nSUCCESS: Task type: ${task.type} | Payload: ${payloadStr} | Retries left: ${task.retries}`;
  _appendLog(text);
}

//Appends a failure log entry to logs.txt
function logFailure(task, err) {
  const payloadStr = JSON.stringify(task.payload ?? {});
  const text = `\nFAILURE: Task type: ${task.type} | Payload: ${payloadStr} | Retries left: ${task.retries} | Error: ${err.message}`;
  _appendLog(text);
}

//Internal helper tht appends text to the log file

function _appendLog(text) {
  try {
    fs.appendFileSync(LOG_FILE, text, "utf8");
    console.log("Logged successfully to file");
  } catch (err) {
    console.error("Error writing to log file:", err.message);
  }
}

module.exports = { logSuccess, logFailure };
