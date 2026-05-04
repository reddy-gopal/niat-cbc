import type { Challenge } from "@/types/app";

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
    points: 3,
    requiresUpload: true,
    requiresText: false,
  },
  {
    id: 3,
    title: "Connect Their Dots",
    description: "When the conversation is already real, share your link. Points only when your friend applies.",
    day: "Days 1-3",
    points: 7,
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

Task: Students wrote personal messages to their future selves on paper, folded and sealed them. The tribe leader collected ALL folded papers from their group and submitted a photo of the collected batch.

UNDERSTAND THE FORMAT FIRST:
This is a TRIBE COLLECTION submission — not an individual student photo.
Valid submissions look like:
- Multiple folded papers collected together (held, stacked, spread out)
- A pile or bundle of folded/sealed notes from the whole tribe
- Folded papers with names written on the outside, grouped together
- A single folded paper if the tribe has only one member present
The messages INSIDE are intentionally hidden/sealed — that is the point of the task.

STEP 1 — Is there physical proof of collected folded notes?
Look for: multiple folded papers, a stack of sealed notes, papers with names on outside.
If the image shows NO paper or notes at all → REJECT.

STEP 2 — Does it look like a genuine collected batch?
Papers should appear folded/sealed, not blank or empty.
A random unrelated photo with no papers → REJECT.
A single blank unfolded paper with nothing on it → REJECT.

STEP 3 — If any text IS visible on the papers, apply a light check:
Names or labels on the outside of folded papers → perfectly valid, ACCEPT.
If a message happens to be open and readable — it should look personal, not a meme or random caption.

ACCEPT if:
✅ Multiple folded papers collected together
✅ A stack or pile of sealed notes held or placed by tribe leader
✅ Papers with student names written on the outside
✅ Even a single folded paper if it clearly looks sealed and intentional
✅ Papers being handed over or arranged for collection

REJECT if:
❌ No paper or written notes visible anywhere in the image
❌ Completely unrelated photo (food, selfie, random scene)
❌ Blank unfolded papers with nothing written or folded

JSON only: {"verdict":"accepted"/"rejected","reason":"one sentence describing what was visible in the image and why it was accepted or rejected"}`,
    day: "Day 2",
    points: 2,
    requiresUpload: true,
    requiresText: false,
  },
  {
    id: 6,
    title: "Daily Insta Post",
    description: "Upload a screenshot of your Instagram post tagging #niatbootcamp2026",
    day: "Daily",
    points: 2,
    requiresUpload: true,
    requiresText: false,
  },
];
