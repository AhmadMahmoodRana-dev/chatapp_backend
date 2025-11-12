import express from "express";
import { body } from "express-validator";
import validate from "../middlewares/validate.js";
import { login, register } from "../controllers/auth.controller.js";

const authroute = express.Router();

authroute.post('/auth/register',
  [ body('name').notEmpty(), body('email').isEmail(), body('password').isLength({ min: 6 }) ],
  validate,register);

authroute.post('/auth/login',
  [ body('email').isEmail(), body('password').notEmpty() ],
  validate,login);

export default authroute;
