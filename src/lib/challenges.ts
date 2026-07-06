import type { Challenge } from "@/types/app";

/** Mapping of backend Task IDs (Old) to frontend display IDs (New). */
export const CHALLENGE_ID_MAP: Record<number, number> = {
  1: 1,
  2: 2,
  4: 3,
  5: 4,
  6: 5,
  3: 6,
};

export const CHALLENGES: Challenge[] = [
  {
    id: 1,
    title: "Common Ground Connect",
    description: "Find 1 teammate. 5 minutes. 3 real things in common. Not the obvious ones.",
    verificationPrompt: `You are evaluating "Common Ground Connect" for NIAT CBC.
Task: Student found real things in common with someone.

Default verdict: ACCEPT.

ACCEPT if the response contains ANY real words that could plausibly be common ground (traits, goals, hobbies, interests, values, background, skills, experiences).
This includes simple keyword lists of 1-5 words like:
- "entrepreneurship patience respectful"
- "cricket movies"
- "same village"
- "coding goal"

Do NOT require the student to explicitly say "we both" / "same" / "shared".
Do NOT require proof that a teammate was found.
Do NOT require meaningful shared experiences, detailed explanation, or full sentences.

REJECT only if: blank, gibberish, spam, abusive/inappropriate, or completely unrelated (e.g. random unrelated sentence).

Do NOT require:
- all 3 common points
- full sentences
- names
- detailed explanation
- proof they found a teammate (assume the interaction happened if the response is plausibly common ground)

Examples:
✅ "same village and both want to be developers"
✅ "we both lost someone close"
✅ "cricket and movies"
✅ "entrepreneurship patience respectful"
❌ "asdfgh"
❌ "" (blank)

JSON only: {"verdict":"accepted"/"rejected","reason":"one sentence"}`,
    day: "Day 1",
    points: 1,
    requiresUpload: false,
    requiresText: true,
    placeholder: "What were the 3 things you found in common? Describe the moment.",
  },
  {
    id: 2,
    title: "You Crossed My Mind",
    description: "Someone will cross your mind today. After the session, open their chat. Write your real words. Not a forward. Just you.",
    verificationPrompt: `You are evaluating "You Crossed My Mind" for NIAT CBC.
Task: Student reached out personally to someone they were thinking about, with a real heartfelt message.

STEP 1 — Platform check:
The image must show a WhatsApp chat window or Instagram DM conversation.
Look for: green WhatsApp UI, chat bubbles, message input bar, Instagram DM header, timestamps.
If no recognizable messaging platform UI is visible → REJECT immediately.

STEP 2 — Message presence check:
There must be a visible outgoing message sent by the student (blue/green bubble on right side).
If only an empty chat or only received messages are visible → REJECT.

STEP 3 — Content intent check (most important):
READ the actual message content in the screenshot.
The message must show genuine personal outreach — the student reaching out to someone they were thinking about.

REJECT if the message is:
- A casual greeting only ("hi", "hey", "what's up", "hello")
- A one-word or one-emoji reply
- A forwarded message (shows "Forwarded" label)
- A meme, sticker, GIF, or media-only message with no personal text
- Small talk or a routine conversation with no personal intent
- AI-generated or copy-pasted motivational text with no personal element
- Completely unrelated to reaching out to someone they were thinking about

ACCEPT only if the message contains a genuine personal note — something the student actually wrote to connect with that person. It doesn't need to be long, but it must be real and personal.

Examples:
✅ "Bro I randomly thought of you today, hope you're doing well"
✅ "I've been meaning to say this — you really helped me during exams and I never thanked you"
✅ Short personal message showing the student initiated a real conversation
❌ "hi" alone
❌ A meme or forwarded quote
❌ A group chat screenshot
❌ A random conversation about food/plans with no personal intent

JSON only: {"verdict":"accepted"/"rejected","reason":"one sentence describing what the message actually said and why it was accepted or rejected"}`,
    day: "Day 1",
    points: 2,
    requiresUpload: true,
    requiresText: false,
  },
  {
    id: 3,
    title: "Connect Their Dots",
    description:
      "When the conversation is already real, share your link. Earn 10 points for each NIAT admission test fee paid.",
    day: "Days 1-3",
    points: 15,
    requiresUpload: false,
    requiresText: false,
    isReferral: true,
  },
  {
    id: 4,
    title: "Caught You Being Great",
    description: "Find someone with a quality you admire. Walk up. Tell them exactly what you saw. Be specific.",
    verificationHint:
      "Accept any genuine description of someone displaying positive qualities. Do not require the student to prove they spoke to the person. Observation and recognition is enough.",
    verificationPrompt: `You are evaluating a student submission for the NIAT CBC challenge "Caught You Being Great".

Challenge intent:
The student noticed a real person showing a positive quality they admired.

ACCEPT if the response includes ANY of the following:
- a person or role such as friend, teacher, senior, classmate, brother, sister, leader, stranger, he, she, they
- a positive quality such as kind, patient, respectful, calm, helpful, hardworking, honest, disciplined, caring, supportive
- a feeling of admiration, respect, motivation, or inspiration

Accept even if the answer is:
- only 2-3 words
- informal
- grammatically incorrect
- missing names or details

Examples of acceptable short answers:
- "kind teacher"
- "patient friend"
- "kind senior"
- "calm teacher"
- "helpful senior"
- "respectful leader"

REJECT only if the response is:
- blank
- gibberish
- spam
- abusive or inappropriate
- completely unrelated

Do NOT require:
- proof that they walked up and spoke to the person
- long explanation
- exact names
- polished grammar

Examples:
✅ "i saw a guy who was very patient with everyone, motivated me a lot"
✅ "my friend helped someone without expecting anything back. inspired me"
✅ "teacher stayed calm even when students were being difficult. respect"
✅ "kind teacher"
✅ "patient friend"
✅ "kind senior"
✅ "calm teacher"
✅ "helpful senior"
❌ "yes done"
❌ "asdfgh lkjh"

Respond with JSON only:
{"verdict":"accepted"|"rejected","reason":"one short sentence"}`,
    day: "Day 2",
    points: 2,
    requiresUpload: false,
    requiresText: true,
    placeholder: "Who did you catch being great? What exactly did you see? What did you tell them?",
  },
  {
    id: 5,
    title: "Tribe Time Capsule",
    description: "One sentence to your future self. Sealed. Collected by your tribe leader. Opened one year from today. Any proof format is allowed.",
    verificationPrompt: `You are evaluating "Tribe Time Capsule" for NIAT CBC.

Task: A student wrote a personal message to their future self on paper and submitted proof of it.

DEFAULT VERDICT: ACCEPT.

WHAT TO LOOK FOR:
Any physical paper, card, notebook page, or sticky note with ANY handwriting on it — a name, a sentence, a goal, a date, or a personal note.

ACCEPT if the image shows:
- A piece of paper or notebook page with any handwriting visible
- Multiple papers collected together (tribe leader batch submission)
- A single paper with one or more personal messages on it
- Multiple messages written on one shared sheet
- Papers that are folded, unfolded, open, or sealed — ALL are valid
- A hand holding a paper with writing on it
- Papers spread on a table or floor with writing
- Even just a name and date written on paper counts
- Any physical writing surface with handwritten content

REJECT only if:
- The image is completely blank with zero writing anywhere
- It is a digital app, phone screen, WhatsApp chat, or text message screenshot
- It is a completely unrelated photo (selfie only, food, classroom with no papers, promotional poster)
- It is pure gibberish or spam

DO NOT REJECT because:
- Papers are unfolded or readable — that is fine
- Only one paper is visible — individual submissions are valid
- The message is short or only has a name and date
- The paper has multiple people's messages on one sheet — that is valid
- Writing is partially visible or hard to read
- It doesn't look like a "batch" collection

JSON only: {"verdict":"accepted"/"rejected","reason":"one sentence describing what was visible and why"}`,
    day: "Day 2",
    points: 2,
    requiresUpload: true,
    requiresText: false,
  },
  {
    id: 6,
    title: "3-day Streak",
    description:
      "Share your moment, tag @niat_india and drop #niatbootcamp2026 in your caption, then submit your screenshot.",
    day: "Daily",
    points: 2,
    requiresUpload: true,
    requiresText: false,
  },
];
