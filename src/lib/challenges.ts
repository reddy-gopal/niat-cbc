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
Task: Student reached out to someone they were thinking about.

ACCEPT if image plausibly shows: a chat screenshot, message draft,
sent message, partial conversation, blurred names, or any outreach evidence.
Cropped, blurry, or partially visible screenshots are fine.

REJECT only if: completely unrelated image, blank, abusive/inappropriate content, or obvious non-attempt.

JSON only: {"verdict":"accepted"/"rejected","reason":"one sentence"}`,
    day: "Day 1",
    points: 5,
    requiresUpload: true,
    requiresText: false,
  },
  {
    id: 3,
    title: "Connect Their Dots",
    description: "When the conversation is already real, share your link. Points only when your friend applies.",
    day: "Days 1-3",
    points: 5,
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
    points: 3,
    requiresUpload: false,
    requiresText: true,
    placeholder: "Who did you catch being great? What exactly did you see? What did you tell them?",
  },
  {
    id: 5,
    title: "Tribe Time Capsule",
    description: "One sentence to your future self. Sealed. Collected by your tribe leader. Opened one year from today.",
    verificationPrompt: `You are evaluating "Tribe Time Capsule" for NIAT CBC.
Task: Student submitted proof of a time capsule moment with their tribe.

ACCEPT any plausible photo, screenshot, note, or image that could
represent a memory, group moment, or future message.
Accept imperfect, blurry, casual, or low-quality proof.

REJECT only if: completely unrelated, blank, abusive/inappropriate, or obvious non-attempt.

JSON only: {"verdict":"accepted"/"rejected","reason":"one sentence"}`,
    day: "Day 2",
    points: 2,
    requiresUpload: true,
    requiresText: false,
  },
  {
    id: 6,
    title: "3-Day Real Streak",
    description: "One real post. Every day. All 3 days. No templates. Just one honest moment each day.",
    verificationPrompt: `You are evaluating "3-Day Real Streak" for NIAT CBC.
Task: Student posted consistently for 3 days and submitted proof.

ACCEPT any plausible screenshot, post image, or photo that could
represent a social post or daily activity — even casual or imperfect.

REJECT only if: completely unrelated image, blank, abusive/inappropriate content, or obvious non-attempt.

JSON only: {"verdict":"accepted"/"rejected","reason":"one sentence"}`,
    day: "Days 1-3",
    points: 3,
    requiresUpload: true,
    requiresText: false,
  },
];
