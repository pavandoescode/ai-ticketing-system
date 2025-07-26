import { inngest } from "../client.js";
import Ticket from "../../modals/ticket.js";
import User from "../../modals/user.js";
import { NonRetriableError } from "inngest";
import { sendMail } from "../../utils/mailer.js";
import analyzeTicket from "../../utils/ai.js";

export const onTicketCreated = inngest.createFunction(
  { id: "on-ticket-created", retries: 2 },
  { event: "ticket/created" },
  async ({ event, step }) => {
    try {
      const { ticketId } = event.data;
      // 1. Fetch ticket from DB
      const ticket = await step.run("fetch-ticket", async () => {
        const ticketObject = await Ticket.findById(ticketId);
        if (!ticket) {
          throw new NonRetriableError("Ticket not found");
        }
        return ticketObject;
      });

      // 2. Analyze ticket with AI
      const aiResponse = await step.run("analyze-ticket-with-ai", async () => {
        return analyzeTicket(ticket);
      });

      if (!aiResponse) {
        // AI analysis failed. Log the error and continue,
        // the ticket will be assigned to a default admin.
        console.error(`AI analysis failed for ticket ${ticket._id}.`);
      }

      // 3. Find a moderator based on AI skills
      const moderator = await step.run("find-moderator", async () => {
        if (!aiResponse?.relatedSkills?.length) {
          return User.findOne({ role: "admin" });
        }
        let user = await User.findOne({
          role: "moderator",
          skills: {
            $elemMatch: {
              $regex: aiResponse.relatedSkills.join("|"),
              $options: "i",
            },
          },
        });
        if (!user) {
          user = await User.findOne({ role: "admin" });
        }
        return user;
      });

      // 4. Update ticket with AI results and assignment in a single operation
      await step.run("update-ticket", async () => {
        const updates = {
          assignedTo: moderator?._id || null,
        };
        if (aiResponse) {
          updates.priority = !["low", "medium", "high"].includes(aiResponse.priority)
            ? "medium"
            : aiResponse.priority;
          updates.helpfulNotes = aiResponse.helpfulNotes;
          updates.status = "IN_PROGRESS";
          updates.relatedSkills = aiResponse.relatedSkills;
        }
        await Ticket.findByIdAndUpdate(ticket._id, updates);
      });

      // 5. Send email notification without re-fetching the ticket
      await step.run("send-email-notification", async () => {
        if (moderator) {
          await sendMail(
            moderator.email,
            "Ticket Assigned",
            `A new ticket has been assigned to you: "${ticket.title}"`
          );
        }
      });

      return { success: true };
    } catch (err) {
      console.error("❌ Error running the step", err.message);
      return { success: false };
    }
  }
);