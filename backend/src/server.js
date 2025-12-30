import express from "express";
import os from "os";

const app = express();
const PORT = 5000;

// health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "backend",
    time: new Date().toISOString(),
  });
});

app.get("/api/whoami", (req, res) => {
  res.json({
    hostname: os.hostname(),
    pid: process.pid,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
