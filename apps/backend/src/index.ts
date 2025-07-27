import express from "express";
import cors from "cors";
import http from "http";

const app = express();
const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

server.listen(PORT, () => {
    console.log("Http sever has been started")
})

app.use(cors());
