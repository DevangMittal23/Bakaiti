import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateLiveKitToken } from "@/lib/livekit";
import { conversationRoomName } from "@/lib/security/calls";
import { createAdminClient } from "@/lib/supabase/admin";

const callRequest = z.object({
  conversationId: z.uuid(),
  callType: z.enum(["voice", "video"]),
  inviteParticipants: z.boolean().optional().default(false),
}).strict();

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = callRequest.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid call request" }, { status: 400 });
    const { conversationId, callType, inviteParticipants } = parsed.data;

    // Verify user is a participant of this conversation
    const { data: participant, error: pError } = await supabase
      .from("participants")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .single();

    if (pError || !participant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let recipients: { user_id: string }[] = [];
    if (inviteParticipants) {
      const { data, error } = await supabase
        .from("participants")
        .select("user_id")
        .eq("conversation_id", conversationId)
        .neq("user_id", user.id);
      if (error) throw error;
      recipients = data || [];
      if (!recipients.length) {
        return NextResponse.json({ error: "No other participant is available for this call" }, { status: 409 });
      }
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "LiveKit server credentials not configured" },
        { status: 500 }
      );
    }

    // A conversation has one server-derived room. A supplied room name is never trusted.
    const roomName = conversationRoomName(conversationId);
    const token = await generateLiveKitToken(user.id, roomName);
    if (inviteParticipants) {
      const admin = createAdminClient();
      const { error: invitationError } = await admin.from("notifications").insert(
        recipients.map(({ user_id }) => ({
          recipient_id: user_id,
          actor_id: user.id,
          type: "message",
          entity_type: "conversation",
          entity_id: conversationId,
          body: `is calling you (${callType} call)`,
        })),
      );
      if (invitationError) throw invitationError;
    }
    return NextResponse.json({ token, roomName });
  } catch (err: unknown) {
    console.error("Call token failed", err instanceof Error ? err.name : "UnknownError");
    return NextResponse.json({ error: "Unable to authorize call" }, { status: 500 });
  }
}
