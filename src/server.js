import "dotenv/config.js";
import express from "express";
import http from "http";
import morgan from "morgan";
import cors from "cors";
import { Server } from "socket.io";
import connectDb from "./config/connectDb.js";
import User from "./models/User.js";
import Conversation from "./models/Conversation.js";
import Message from "./models/Message.js";
import mainFunction from "./routes/mainFunction.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "change_me";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

// In-memory map: userId -> set of socketIds
const userSockets = new Map();

function addSocket(userId, socketId) {
  const set = userSockets.get(userId) || new Set();
  set.add(socketId);
  userSockets.set(userId, set);
}
function removeSocket(userId, socketId) {
  const set = userSockets.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) userSockets.delete(userId);
  else userSockets.set(userId, set);
}
function getSockets(userId) {
  return userSockets.get(userId) ? Array.from(userSockets.get(userId)) : [];
}

// Express middlewares
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

mainFunction(app);


// Health
app.get("/", (req, res) => res.send("Chat backend OK"));

// Connect to MongoDB
connectDb();

// Socket auth middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token"));
    const payload = jwt.verify(token, JWT_SECRET);
    socket.userId = payload.id;
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});

io.on("connection", async (socket) => {
  const userId = socket.userId;
  addSocket(userId, socket.id);

  // mark online
  try {
    const me = await User.findById(userId);
    if (me) {
      me.isOnline = true;
      await me.save();

      // notify only contacts
      const contacts = me.contacts || [];
      for (const c of contacts) {
        const sockets = getSockets(c.toString());
        sockets.forEach((sid) => {
          io.to(sid).emit("contact:online", { userId });
        });
      }
    }
  } catch (err) {
    console.error("presence error", err);
  }

  // Join rooms for conversations client wants (client will emit join)
  socket.on("join_conversation", (conversationId) => {
    socket.join(`conv:${conversationId}`);
  });

  // Leave conversation
  socket.on("leave_conversation", (conversationId) => {
    socket.leave(`conv:${conversationId}`);
  });

  // Typing indicators (emit to conversation room)
  socket.on("typing:start", (payload) => {
    // payload: { conversationId }
    socket
      .to(`conv:${payload.conversationId}`)
      .emit("typing:start", { conversationId: payload.conversationId, userId });
  });
  socket.on("typing:stop", (payload) => {
    socket
      .to(`conv:${payload.conversationId}`)
      .emit("typing:stop", { conversationId: payload.conversationId, userId });
  });

  // Send message: server validates membership, saves message, updates conversation, emits to room & offline recipients
  socket.on("message:send", async (data, ack) => {
    // data: { conversationId, text, type, attachments }
    try {
      const { conversationId, text, type, attachments } = data;
      const conv = await Conversation.findById(conversationId);
      if (!conv) return ack && ack({ error: "Conversation not found" });

      if (!conv.members.some((m) => m.userId.toString() === userId))
        return ack && ack({ error: "Not a member" });

      const msg = await Message.create({
        conversationId,
        sender: userId,
        text,
        type: type || "text",
        attachments: attachments || [],
      });

      conv.lastMessage = {
        text: msg.text || "",
        messageId: msg._id,
        updatedAt: new Date(),
      };
      await conv.save();

      // Emit to all in conversation room
      io.to(`conv:${conversationId}`).emit("message:new", msg);

      // For offline users, optionally send push notifications here (not implemented)
      ack && ack({ ok: true, message: msg });
    } catch (err) {
      console.error(err);
      ack && ack({ error: "Server error" });
    }
  });

  // Mark message seen: update DB and notify conversation
  socket.on("message:seen", async (data) => {
    // data: { conversationId, messageId }
    try {
      const { messageId, conversationId } = data;
      const msg = await Message.findById(messageId);
      if (!msg) return;
      if (!msg.readBy.some((r) => r.toString() === userId)) {
        msg.readBy.push(userId);
        await msg.save();
      }
      io.to(`conv:${conversationId}`).emit("message:seen", {
        messageId,
        userId,
      });
    } catch (err) {
      console.error(err);
    }
  });

  socket.on("disconnect", async () => {
    removeSocket(userId, socket.id);
    // if user has no other sockets, mark offline and notify contacts
    if (!getSockets(userId).length) {
      try {
        const me = await User.findById(userId);
        if (me) {
          me.isOnline = false;
          me.lastSeen = new Date();
          await me.save();
          const contacts = me.contacts || [];
          for (const c of contacts) {
            const sockets = getSockets(c.toString());
            sockets.forEach((sid) => {
              io.to(sid).emit("contact:offline", {
                userId,
                lastSeen: me.lastSeen,
              });
            });
          }
        }
      } catch (err) {
        console.error("disconnect presence error", err);
      }
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log("Server running on port", PORT));
