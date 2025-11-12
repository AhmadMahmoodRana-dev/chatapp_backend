import authroute from "./auth.js";
import contactRoute from "./contacts.js";
import conversationRoute from "./conversations.js";
import messageRoute from "./messages.js";

const mainFunction = (app) =>{
app.use("/api",authroute,contactRoute,conversationRoute,messageRoute)
}

export default mainFunction;