import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import Anthropic from "@anthropic-ai/sdk";

// Initialize Anthropic client conditionally
const getAnthropic = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get("connectionId") || "";

    if (!connectionId) {
      return NextResponse.json({ error: "Missing connectionId" }, { status: 400 });
    }

    const db = getAdminDb();
    
    // 1. Fetch connection document
    const connSnap = await db.collection("connections").doc(connectionId).get();
    if (!connSnap.exists) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }
    const connData = connSnap.data()!;

    // 2. Fetch profiles of both participants
    const profileASnap = await db.collection("profiles").doc(connData.profileA).get();
    const profileBSnap = await db.collection("profiles").doc(connData.profileB).get();

    if (!profileASnap.exists || !profileBSnap.exists) {
      return NextResponse.json({ error: "One or both user profiles not found" }, { status: 404 });
    }

    const profileA = profileASnap.data()!;
    const profileB = profileBSnap.data()!;

    // 3. Fetch recent messages (up to 10)
    const messagesSnap = await db.collection("connections")
      .doc(connectionId)
      .collection("messages")
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    const messages = messagesSnap.docs.map(doc => doc.data()).reverse();

    // 4. Fetch mutual likes between participants for personalized openers
    const likesFromA = await db.collection("likes")
      .where("fromUid", "==", connData.profileA)
      .where("toUid", "==", connData.profileB)
      .get();
    const likesFromB = await db.collection("likes")
      .where("fromUid", "==", connData.profileB)
      .where("toUid", "==", connData.profileA)
      .get();
    const allLikes: { from: string; elementId: string; note: string }[] = [
      ...likesFromA.docs.map(d => {
        const data = d.data() as { elementId: string; note: string };
        return { from: "A", elementId: data.elementId, note: data.note };
      }),
      ...likesFromB.docs.map(d => {
        const data = d.data() as { elementId: string; note: string };
        return { from: "B", elementId: data.elementId, note: data.note };
      }),
    ];
    const likeSummary = allLikes.map(l => 
      `User ${l.from} liked "${l.elementId}"${l.note ? ` with note: "${l.note}"` : ""}`
    ).join("; ");

    const anthropicInstance = getAnthropic();

    if (!anthropicInstance) {
      // SMART FALLBACK RULES (when Anthropic key is missing)
      const suggestions = [];
      const hasMessages = messages.length > 0;
      
      // Determine other person's name
      // We don't track who is requesting, so we provide options
      const name = profileB.displayName;

      if (!hasMessages) {
        // Reference liked elements in fallback starters
        const likedElements = allLikes.filter(l => l.from === "A").map(l => l.elementId);
        if (likedElements.includes("bio")) {
          suggestions.push(`Hey ${name}! I really resonated with your bio. What inspired you to write that?`);
        } else if (likedElements.includes("values")) {
          suggestions.push(`Hey ${name}! I love that we share similar values. Which ones matter most to you?`);
        } else {
          suggestions.push(`Hey ${name}! I noticed in your bio that you love exploring. What's your favorite local spot?`);
        }
        if (likedElements.includes("photo_0") || likedElements.some(e => e.startsWith("photo"))) {
          suggestions.push(`Hi ${name}! Love your photos! Where was that taken?`);
        } else {
          suggestions.push(`Hi ${name}! Super excited to connect. What are you looking forward to this week?`);
        }
        suggestions.push(`Hey ${name}! Since we matched for ${connData.mode}, what's your go-to weekend activity?`);
      } else {
        const lastMsg = messages[messages.length - 1];
        const lastBody = (lastMsg?.body || "").toLowerCase();
        
        if (lastBody.includes("plan") || lastBody.includes("meet") || lastBody.includes("coffee")) {
          suggestions.push("That place sounds perfect! What day or time works best for you?");
          suggestions.push("I'm looking forward to it. Do you go there often?");
          suggestions.push("Sounds like a plan! Let's lock in a time.");
        } else {
          suggestions.push("That's really interesting! Tell me more about that.");
          suggestions.push("I completely agree. What other hobbies are you interested in?");
          suggestions.push(`By the way, what led you to join the ${profileA.metro || "Seattle"} community?`);
        }
      }

      return NextResponse.json({ suggestions });
    }

    // Call real Anthropic API
    const messagesHistoryPrompt = messages.map(msg => 
      `${msg.senderId === connData.profileA ? 'User A' : 'User B'}: ${msg.body}`
    ).join("\n");

    const systemPrompt = `You are "Kindred Buddy", a helpful companion in a connection app. 
You will generate exactly 3 short, context-appropriate, highly engaging conversation starters or response suggestions to keep the conversation going.
Each suggestion must be less than 120 characters, highly conversational, friendly, and natural.
The users are matching for: ${connData.mode} (${connData.agreedSeriousness || 'casual'}).
User A Bio: ${profileA.displayName}, ${profileA.age}yo. Bio: "${profileA.bio || 'None'}"
User B Bio: ${profileB.displayName}, ${profileB.age}yo. Bio: "${profileB.bio || 'None'}"
${likeSummary ? `\nLike signals between them: ${likeSummary}\nIMPORTANT: Reference specific liked elements and notes in your suggestions to make them feel personal and unique.` : ''}

Output MUST be a valid JSON array of exactly 3 strings. Example: ["Hello!", "How is it going?", "What's your favorite spot?"]`;

    const userPrompt = `Here is the conversation history:\n${messagesHistoryPrompt || "No messages yet."}\n\nGenerate the 3 suggestions:`;

    const response = await anthropicInstance.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 250,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const contentText = response.content[0].type === "text" ? response.content[0].text : "";
    
    // Parse response
    let suggestions = [];
    try {
      // Find JSON block if Claude wrapped it in explanation
      const jsonStart = contentText.indexOf("[");
      const jsonEnd = contentText.lastIndexOf("]") + 1;
      if (jsonStart !== -1 && jsonEnd !== -1) {
        suggestions = JSON.parse(contentText.slice(jsonStart, jsonEnd));
      } else {
        suggestions = JSON.parse(contentText);
      }
    } catch (parseErr) {
      console.warn("Claude suggestion parsing failed, fallback used:", parseErr);
      suggestions = [
        "Hey! How is your week going?",
        "What are your favorite hobbies to do around here?",
        "I'd love to grab a coffee sometime soon!",
      ];
    }

    return NextResponse.json({ suggestions });
  } catch (err: any) {
    console.error("Buddy suggestion failed:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
