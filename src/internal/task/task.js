function createTask(type, payload, retries) {
  return { type, payload, retries };
}

module.exports = { createTask };
