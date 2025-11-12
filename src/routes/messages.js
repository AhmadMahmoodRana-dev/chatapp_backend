import express from "express";
import { getMessages, markSeen, sendMessage } from "../controllers/message.controller.js";
import authMiddleware from "../middlewares/auth.js";

const messageRoute = express.Router();

messageRoute.post('/:conversationId/messages', authMiddleware, sendMessage);
messageRoute.get('/:conversationId/messages', authMiddleware, getMessages);
messageRoute.post('/:conversationId/seen', authMiddleware, markSeen);

export default messageRoute;
