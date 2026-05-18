


// Processes a single task based on its type.
async function processTask(task) {
  if (!task.payload || Object.keys(task.payload).length === 0) {
    throw new Error("payload is empty");
  }

  // Add your task type here, and perform the task under its case
  switch (task.type) {
    case "send_email":
      // Simulates latency (mirrors Go's time.Sleep(2 * time.Second))
      await new Promise((res) => setTimeout(res, 2000));
      console.log(
        `Sending email to ${task.payload.to} with subject "${task.payload.subject}"`
      );
      break;

    case "resize_image":
      console.log(
        `Resizing image to x: ${task.payload.new_x}, y: ${task.payload.new_y}`
      );
      break;

    case "generate_pdf":
      console.log("Generating pdf...");
      break;

    case "":
      throw new Error("task type is empty");

    default:
      throw new Error(`unsupported task: "${task.type}"`);
  }
}

module.exports = { processTask };
