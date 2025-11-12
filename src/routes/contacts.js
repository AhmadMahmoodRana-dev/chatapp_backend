import express from "express";
import { addContact, getContacts } from "../controllers/contact.controller.js";
import authMiddleware from "../middlewares/auth.js";

const contactRoute = express.Router();

contactRoute.post('/add', authMiddleware,addContact);
contactRoute.get('/', authMiddleware,getContacts);

export default contactRoute;
