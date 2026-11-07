"use client";

import { useEffect, useState } from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useCall } from "@/hooks/use-call";
import { UserAvatar } from "@/components/shared/user-avatar";

export function CallModal() {
  const { incomingCall, rejectIncomingCall, joinCall } = useCall();
  const [ringtone, setRingtone] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (incomingCall) {
      // Loop a standard ring sound
      const audio = new Audio("/sounds/ringtone.mp3");
      audio.loop = true;
      // If we don't have this asset, we just handle the error silently
      audio.play().catch(() => {});
      setRingtone(audio);
    } else {
      if (ringtone) {
        ringtone.pause();
        setRingtone(null);
      }
    }

    return () => {
      if (ringtone) ringtone.pause();
    };
  }, [incomingCall]);

  if (!incomingCall) return null;

  const handleAccept = () => {
    if (ringtone) ringtone.pause();
    joinCall(
      incomingCall.conversationId,
      incomingCall.callType
    );
  };

  const handleDecline = () => {
    if (ringtone) ringtone.pause();
    rejectIncomingCall();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="glass-card flex flex-col items-center justify-center p-8 max-w-sm w-full text-center space-y-6 animate-scale-in">
        {/* Call Type Indicator */}
        <span className="text-[10px] uppercase font-bold tracking-widest text-accent flex items-center gap-1.5 animate-pulse">
          {incomingCall.callType === "video" ? (
            <>
              <Video className="h-3.5 w-3.5" />
              Incoming Video Call
            </>
          ) : (
            <>
              <Phone className="h-3.5 w-3.5" />
              Incoming Voice Call
            </>
          )}
        </span>

        {/* User Details */}
        <div className="flex flex-col items-center gap-2">
          <UserAvatar
            src={incomingCall.callerAvatar}
            name={incomingCall.callerName}
            size="xl"
            className="border-2 border-accent"
          />
          <h3 className="text-lg font-bold text-text-primary mt-1">
            {incomingCall.callerName}
          </h3>
          <p className="text-xs text-text-muted">Calling you...</p>
        </div>

        {/* Accept/Decline Actions */}
        <div className="flex items-center gap-8 pt-4">
          <button
            onClick={handleDecline}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-error text-white hover:scale-105 transition-all shadow-lg shadow-error/30 cursor-pointer active:scale-95"
            title="Decline Call"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
          <button
            onClick={handleAccept}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-success text-white hover:scale-105 transition-all shadow-lg shadow-success/30 cursor-pointer active:scale-95"
            title="Accept Call"
          >
            <Phone className="h-6 w-6 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
}
