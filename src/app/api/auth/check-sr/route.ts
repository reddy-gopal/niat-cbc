import { NextResponse } from "next/server";
import { z } from "zod";
import { validateNIATRegistration } from "@/lib/niatRegistration";

const schema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid mobile number." },
        { status: 400 }
      );
    }

    const result = await validateNIATRegistration(parsed.data.mobile);
    if (!result.valid) {
      return NextResponse.json(
        { success: false, error: result.errorMessage ?? "SR not completed for this number.", srFailed: true },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
