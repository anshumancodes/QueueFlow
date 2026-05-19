//Worker Service

//  Spawns N concurrent async workers that each:
//    1. Block-pop a task from "task_queue" via BLPOP
//    2. Parse and execute the task via processTask()
//    3. On failure: decrement retries, re-enqueue if retries remain, else drop
//    4. Log every success/failure to logs.txt

//   Also exposes GET /metrics for live queue statistics.

require("dotenv").config();

const express = require("express");
const { createClient } = require("redis");
const { processTask } = require("../../internal/worker/worker");
const { logSuccess, logFailure } = require("../../internal/logger/logger");

const app = express();
const PORT = process.env.PORT_WORKER || 3002;
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Metrics
let total_jobs_in_queue = 0;
let jobs_done = 0;
let jobs_failed = 0;

// Redis helpers
// Each worker loop needs its own dedicated client because BLPOP holds the
// connection open. A shared client would block all other commands.
function createRedisClient() {
  const client = createClient({ url: REDIS_URL });
  client.on("error", (err) => console.error("Redis client error:", err));
  return client;
}

// A single "command" client is kept for non-blocking commands (LLEN, RPUSH).
const cmdClient = createRedisClient();

//Worker loop
async function runWorker(workerId) {
  const blpopClient = createRedisClient();
  await blpopClient.connect();
  console.log(`Worker #${workerId} started`);

  // Infinite loop
  while (true) {
    try {
      // BLPOP with timeout 0 = block until an item is available
      // Returns [ key, value ]
      const result = await blpopClient.blPop("task_queue", 0);
      if (!result) continue;

      // Update queue length metric 
      total_jobs_in_queue = await cmdClient.lLen("task_queue");

      // Deserialise
      let task;
      try {
        task = JSON.parse(result.element);
      } catch {
        console.error(`Worker #${workerId}: cannot parse task JSON, skipping`);
        continue;
      }

      let retriesLeft = task.retries ?? 0;

      // Execute 
      try {
        await processTask(task);
        jobs_done++;
        logSuccess(task);
        console.log(`Worker #${workerId}: task done successfully`);
      } catch (err) {
        jobs_failed++;
        logFailure(task, err);
        retriesLeft--;
        console.error(
          `Worker #${workerId}: error processing task: ${err.message}. Retries left: ${retriesLeft}`,
        );

        if (retriesLeft > 0) {
          // Re-enqueue with decremented retries 
          const updatedTask = { ...task, retries: retriesLeft };
          await cmdClient.rPush("task_queue", JSON.stringify(updatedTask));
        } else {
          console.error(
            `Worker #${workerId}: task failed after all retries. Dropping task.`,
          );
        }
      }
    } catch (err) {
     
      console.error(`Worker #${workerId}: Redis error, stopping:`, err.message);
      break;
    }
  }

  await blpopClient.disconnect();
  console.log(`Worker #${workerId} exited`);
}

// GET /metrics 
// Mirrors Go's metrics_handler
app.get("/metrics", (req, res) => {
  const metrics = {
    total_jobs_in_queue,
    jobs_done,
    jobs_failed,
  };
  res.status(200).json(metrics);
});

// Startup
(async () => {
  await cmdClient.connect();
  console.log("Connected to Redis at", REDIS_URL);

  // Number of concurrent workers
  const N_WORKERS = 3;

  // Launch N independent worker loops concurrently
  const workerPromises = [];
  for (let i = 1; i <= N_WORKERS; i++) {
    workerPromises.push(runWorker(i));
  }

  // Start metrics HTTP server
  app.listen(PORT, () => {
    console.log(`Worker metrics server listening on port ${PORT}`);
  });

  // Wait for all workers to finish (run forever unless Redis disconnects)
  await Promise.all(workerPromises);
  console.log("All workers finished executing");
})();
