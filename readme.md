# QueueFlow
 
A distributed background task processing system built with **Node.js** and **Redis** for reliable, concurrent job queuing.
 
---
 
## Why QueueFlow?
 
When a user triggers an action on your app — signing up, placing an order, uploading a file — you often need to do expensive work in response: send an email, resize an image, generate a PDF. Running that work inside the API request forces the user to wait.
 
QueueFlow moves that work out of the request lifecycle entirely. Your API responds instantly. The job runs in the background.
 
