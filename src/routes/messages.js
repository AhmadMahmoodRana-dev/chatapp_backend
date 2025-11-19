import express from "express";
import { getMessages, markSeen, sendMessage, upload } from "../controllers/message.controller.js";
import authMiddleware from "../middlewares/auth.js";

const messageRoute = express.Router();

// Send message with file uploads (max 5 files)
messageRoute.post(
  '/:conversationId/messages/send', 
  authMiddleware, 
  upload.array('files', 5), 
  sendMessage
);

// Get messages for a conversation
messageRoute.get(
  '/:conversationId/messages', 
  authMiddleware, 
  getMessages
);

// Mark message as seen
messageRoute.post(
  '/:conversationId/seen', 
  authMiddleware, 
  markSeen
);

export default messageRoute;