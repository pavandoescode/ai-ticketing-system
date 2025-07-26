import { Inngest } from "inngest";
import dotenv from "dotenv";
dotenv.config();

// Log to verify the environment and key values
const eventKey = process.env.INNGEST_EVENT_KEY;

export const inngest = new Inngest({
  id: "ticketing-system", // Your unique identifier for the project
  eventKey: eventKey, // Make sure the Event Key is available
});

// Log to verify that Inngest client was created successfully
console.log("Inngest client initialized");
