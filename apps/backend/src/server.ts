import app from "./app";
import http from "http";
import { setupWebSocketServer } from "./socket/ws";

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
setupWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
