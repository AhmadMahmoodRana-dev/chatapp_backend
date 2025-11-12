import express from "express";
import { addMember, createConversation, getMyConversations } from '../controllers/conversation.controller.js';
import authMiddleware from "../middlewares/auth.js";
const conversationRoute = express.Router();

conversationRoute.post('/', authMiddleware, createConversation);
conversationRoute.get('/', authMiddleware, getMyConversations);
conversationRoute.post('/:id/members', authMiddleware, addMember);

export default conversationRoute;
