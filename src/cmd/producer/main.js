//Producer Service
//   An HTTP server that accepts POST /enqueue requests and pushes
//   serialised Task objects to the Redis "task_queue" list via RPUSH.
require("dotenv").config();

const express = require("express");
const { createClient } = require("redis");

const app = express();
app.use(express.json());

const PORT = process.env.PORT_PRODUCER || 3001;
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

//Redis client
const rdb = createClient({ url: REDIS_URL });

rdb.on("error", (err) => console.error("Redis client error:", err));

// POST /enqueue
app.post("/enqueue", async (req, res) => {
  const task = req.body;

  // Validate: type must be present
  if (!task.type) {
    return res.status(400).send("Bad Request: missing 'type' field");
  }

  // Validate send_email specific fields
  if (task.type === "send_email") {
    if (!task.payload?.to || !task.payload?.subject) {
      return res
        .status(400)
        .send("Bad request: pass 'to' and 'subject' fields inside the payload");
    }
  }

  try {
    const serialised = JSON.stringify(task);

    // RPUSH → pushes to tail of list
    const queueLength = await rdb.rPush("task_queue", serialised);
    console.log("Length of queue:", queueLength);

    res
      .status(200)
      .send(
        `Task of type '${task.type}' has been successfully added to the queue`,
      );
  } catch (err) {
    console.error("Redis error:", err);
    res.status(500).send("Internal server error");
  }
});

//Startup
(async () => {
  await rdb.connect();
  console.log("Connected to Redis at", REDIS_URL);

  app.listen(PORT, () => {
    console.log(`Producer server listening on port ${PORT}`);
  });
})();
