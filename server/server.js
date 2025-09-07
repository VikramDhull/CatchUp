import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import { Server } from "socket.io";

// express app and http-server
const app = express();
const server = http.createServer(app);

// initialize socket.io server
export const io = new Server(server, {
  cors: { origin: "*" },
});

// store online users
export const userSocketMap = {}; // {userId: socketId}
const videoCallStatusMap = {}; // { userId: 'idle' | 'calling' | 'in-call' }

// socket.io connection handler
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  console.log("user connected", userId);

  if (userId) userSocketMap[userId] = socket.id;

  // emit online users to all connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("offer", ({ from, to, offer }) => {
    if (
      videoCallStatusMap[to] === "in-call" ||
      videoCallStatusMap[to] === "ringing"
    ) {
      io.to(userSocketMap[from]).emit("busy", {}); //-------------------->>>>>>>>>>>>>>
      return;
    }
    if (!userSocketMap[to]) {
      // callee offline
      io.to(userSocketMap[from]).emit("offline", { to });
      return;
    }
    videoCallStatusMap[from] = "calling";
    videoCallStatusMap[to] = "ringing";
    // console.log({ from, to, offer });
    // console.log(`offer from : ${userSocketMap[from]}`);
    // console.log(`offer to : ${userSocketMap[to]}`);
    io.to(userSocketMap[to]).emit("offer", { from, to, offer });
  });

  socket.on("answer", ({ from, to, answer }) => {
    videoCallStatusMap[from] = "in-call";
    videoCallStatusMap[to] = "in-call";
    // console.log(`answer from : ${userSocketMap[from]}`);
    // console.log(`answer to : ${userSocketMap[to]}`);
    io.to(userSocketMap[from]).emit("answer", { from, to, answer });
  });

  socket.on("endcall", ({ from, to }) => {
    videoCallStatusMap[from] = "idle";
    videoCallStatusMap[to] = "idle";
    // optional: notify both ends
    io.to(userSocketMap[from]).emit("endcall");
    io.to(userSocketMap[to]).emit("endcall");
  });

  socket.on("icecandidate", ({ from, to, candidate }) => {
    if (userSocketMap[to]) {
      io.to(userSocketMap[to]).emit("icecandidate", { from, to, candidate });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected", userId);
    delete userSocketMap[userId];
    videoCallStatusMap[userId] = "idle";
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

// middleware
app.use(express.json({ limit: "4mb" }));
app.use(cors());

// routes
app.use("/api/status", (req, res) => {
  res.send("Server is live");
});
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);

// connect to MongoDB
await connectDB();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is running on PORT ${PORT}`));
