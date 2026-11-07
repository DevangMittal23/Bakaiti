"use client";

import { useCallback } from "react";
import { useCallStore } from "@/stores/call-store";
import { useAuthStore } from "@/stores/auth-store";
import type { CallParticipant, CallType } from "@/types";
import { toast } from "sonner";

export function useCall() {
  const { user: currentUser } = useAuthStore();
  const {
    activeCall,
    incomingCall,
    isMuted,
    isCameraOff,
    isScreenSharing,
    setActiveCall,
    setIncomingCall,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    endCall: resetCallStore,
  } = useCallStore();

  const startCall = useCallback(
    async (conversationId: string, callType: CallType, participants: CallParticipant[]) => {
      if (!currentUser) return;
      
      try {
        // Fetch LiveKit room token from API
        const response = await fetch("/api/livekit/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId,
            callType,
            inviteParticipants: true,
          }),
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "Unable to authorize the call");
        const { token, roomName } = result;
        if (typeof token !== "string" || typeof roomName !== "string") {
          throw new Error("The call service returned an invalid response");
        }
        
        setActiveCall({
          roomName,
          conversationId,
          callType,
          participants,
          token,
        });

      } catch (err) {
        console.error("Failed to start call", err);
        toast.error(err instanceof Error ? err.message : "Unable to start the call. Try again.");
      }
    },
    [currentUser, setActiveCall]
  );

  const joinCall = useCallback(
    async (conversationId: string, callType: CallType) => {
      try {
        // Each participant must receive a token for their own authenticated identity.
        const response = await fetch("/api/livekit/token", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, callType }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "Unable to join this call");
        const { roomName, token } = result;
        if (typeof token !== "string" || typeof roomName !== "string") throw new Error("The call service returned an invalid response");
        setActiveCall({ roomName, conversationId, callType, participants: incomingCall?.participants ?? [], token });
        setIncomingCall(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Unable to join this call. Try again.");
      }
    },
    [incomingCall, setActiveCall, setIncomingCall]
  );

  const rejectIncomingCall = useCallback(async () => {
    if (!incomingCall) return;
    setIncomingCall(null);
  }, [incomingCall, setIncomingCall]);

  const endCall = useCallback(async () => {
    resetCallStore();
  }, [resetCallStore]);

  return {
    activeCall,
    incomingCall,
    isMuted,
    isCameraOff,
    isScreenSharing,
    startCall,
    joinCall,
    rejectIncomingCall,
    endCall,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
  };
}
