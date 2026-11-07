"use client";

import { useEffect, useMemo } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useConnectionState,
  useLocalParticipant,
  useParticipants,
  useIsMuted,
  useTracks,
} from "@livekit/components-react";
import type { TrackReference } from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import { Camera, CameraOff, Mic, MicOff, PhoneOff, Signal } from "lucide-react";
import { toast } from "sonner";
import { useCall } from "@/hooks/use-call";
import { useAuth } from "@/hooks/use-auth";
import { UserAvatar } from "@/components/shared/user-avatar";
import type { ActiveCall, CallParticipant, CallType } from "@/types";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function CallHeader({ call }: { call: ActiveCall }) {
  const connection = useConnectionState();
  const { user } = useAuth();
  const otherPeople = call.participants.filter((person) => person.id !== user?.id);
  const title = otherPeople.length > 1
    ? "Group call"
    : otherPeople[0]?.display_name || "Your conversation";
  const connected = connection === ConnectionState.Connected;
  const status = connected
    ? "Connected"
    : connection === ConnectionState.Reconnecting
      ? "Reconnecting"
      : "Connecting";

  return (
    <header className="relative z-10 flex min-h-[76px] shrink-0 items-center justify-between gap-3 border-b border-white/[0.07] px-4 sm:px-7">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-accent/15 text-accent ring-1 ring-accent/20">
          <Signal aria-hidden="true" className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-display text-sm font-semibold text-white sm:text-base">{title}</h1>
          <p className="mt-0.5 text-xs text-white/55">{call.callType === "video" ? "Video call" : "Voice call"}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-xs text-white/75 shadow-lg shadow-black/10">
        <span className={`h-2 w-2 rounded-full ${connected ? "bg-secondary shadow-[0_0_12px_var(--color-secondary)]" : "bg-accent animate-pulse motion-reduce:animate-none"}`} />
        <span aria-live="polite">{status}</span>
      </div>
    </header>
  );
}

type LivePerson = {
  identity: string;
  name: string;
  avatar: string | null;
  isLocal: boolean;
  isSpeaking: boolean;
  isConnected: boolean;
};

function CallStage({ call, currentUser }: { call: ActiveCall; currentUser: CallParticipant | null }) {
  const connectedParticipants = useParticipants();
  const connection = useConnectionState();
  const cameraTracks = useTracks([Track.Source.Camera]);
  const roster = useMemo(() => {
    const profileById = new Map(call.participants.map((profile) => [profile.id, profile]));
    if (currentUser) profileById.set(currentUser.id, currentUser);

    const live = connectedParticipants.map((participant): LivePerson => {
      const profile = profileById.get(participant.identity);
      const knownName = participant.name && !uuidPattern.test(participant.name)
        ? participant.name
        : undefined;
      return {
        identity: participant.identity,
        name: profile?.display_name || knownName || (participant.isLocal ? "You" : "Bakaiti friend"),
        avatar: profile?.avatar_url ?? null,
        isLocal: participant.isLocal,
        isSpeaking: participant.isSpeaking,
        isConnected: true,
      };
    });

    const liveById = new Map(live.map((person) => [person.identity, person]));
    const expected = [...profileById.values()].map((profile): LivePerson => liveById.get(profile.id) ?? ({
      identity: profile.id,
      name: profile.display_name || (profile.id === currentUser?.id ? "You" : "Bakaiti friend"),
      avatar: profile.avatar_url,
      isLocal: profile.id === currentUser?.id,
      isSpeaking: false,
      isConnected: false,
    }));
    return [...expected, ...live.filter((person) => !profileById.has(person.identity))];
  }, [call.participants, connectedParticipants, currentUser]);

  const connectionReady = connection === ConnectionState.Connected;

  if (call.callType === "voice") {
    const featured = roster.find((person) => !person.isLocal) || roster[0];
    const stagePeople = roster.length > 2 ? roster : featured ? [featured] : [];
    return (
      <section aria-label="Voice call participants" className="flex w-full max-w-5xl flex-col items-center justify-center py-8 text-center">
        <div className="relative flex min-h-[250px] w-full items-center justify-center sm:min-h-[340px]">
          <div aria-hidden="true" className="absolute h-52 w-52 rounded-full bg-accent/10 blur-3xl sm:h-72 sm:w-72" />
          {roster.length > 2 ? (
            <div className="relative grid w-full max-w-3xl grid-cols-2 justify-items-center gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-8">
              {roster.slice(0, 9).map((person) => (
                <VoiceAvatar key={person.identity} person={person} connected={person.isConnected} compact />
              ))}
            </div>
          ) : stagePeople.length ? (
            <VoiceAvatar person={stagePeople[0]} connected={stagePeople[0].isConnected} />
          ) : (
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/45">
              <Signal aria-hidden="true" className="h-8 w-8" />
            </div>
          )}
        </div>
        <div className="relative mt-1">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {roster.length > 2 ? "Your people" : stagePeople[0]?.name || "Starting your call"}
          </h2>
          <p className="mt-2 text-sm text-white/55">
            {connectionReady
              ? `${connectedParticipants.length} ${connectedParticipants.length === 1 ? "person" : "people"} connected · voice call`
              : "Calling · waiting for them to join"}
          </p>
          {roster.some((person) => person.isLocal) && (
            <div className="mt-4 flex justify-center gap-2" aria-label="Participants">
              {roster.map((person) => (
                <span key={person.identity} title={`${person.name}${person.isLocal ? " · You" : ""}`} className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs text-white/75">
                  {person.isLocal ? "You" : person.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  if (!roster.length) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 text-center text-white/65">
        <div className="h-16 w-16 animate-pulse rounded-2xl bg-white/10 motion-reduce:animate-none" />
        <p className="text-sm">Connecting your video…</p>
      </div>
    );
  }

  return (
    <section aria-label="Video call participants" className="grid w-full max-w-6xl grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
      {roster.map((person) => {
        const videoTrack = cameraTracks.find((track) => track.participant.identity === person.identity);
        return (
          <VideoParticipantTile key={person.identity} person={person} track={videoTrack} />
        );
      })}
    </section>
  );
}

function VideoParticipantTile({ person, track }: { person: LivePerson; track?: TrackReference }) {
  if (track) return <LiveVideoTile person={person} track={track} />;
  return <VideoTileFrame person={person} />;
}

function LiveVideoTile({ person, track }: { person: LivePerson; track: TrackReference }) {
  const muted = useIsMuted(track);
  return muted || !track.publication.track ? <VideoTileFrame person={person} /> : <VideoTileFrame person={person} track={track} />;
}

function VideoTileFrame({ person, track }: { person: LivePerson; track?: TrackReference }) {
  return (
    <article className="relative aspect-video min-h-[210px] overflow-hidden rounded-[26px] border border-white/10 bg-[#1b1a25] shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:min-h-[260px]">
      {track ? (
        <VideoTrack trackRef={track} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[radial-gradient(ellipse_at_50%_20%,rgba(184,160,251,0.22),transparent_65%),linear-gradient(145deg,#242330,#15151d)]">
          <div className="rounded-full p-2 ring-1 ring-accent/25 shadow-[0_0_70px_rgba(184,160,251,0.15)]">
            <UserAvatar src={person.avatar} name={person.name} size="xl" className="rounded-full ring-4 ring-accent/15" />
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-white/70">
            <CameraOff aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
            {person.isConnected ? "Camera off" : person.isLocal ? "Connecting" : "Calling…"}
          </span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/80 via-black/25 to-transparent px-4 pb-4 pt-14 sm:px-5 sm:pb-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white sm:text-base">{person.name}</p>
          <p className="mt-0.5 text-xs text-white/65">{person.isLocal ? "You" : person.isConnected ? "In this call" : "Invited"}</p>
        </div>
        {person.isSpeaking && <span className="mb-1 h-2 w-2 shrink-0 rounded-full bg-secondary shadow-[0_0_12px_var(--color-secondary)]" aria-label={`${person.name} is speaking`} />}
      </div>
    </article>
  );
}

function VoiceAvatar({ person, connected, compact = false }: { person: LivePerson; connected: boolean; compact?: boolean }) {
  return (
    <div className={`relative flex flex-col items-center text-center ${compact ? "gap-3" : "gap-5"}`}>
      <div className={`relative flex items-center justify-center rounded-full ${compact ? "h-24 w-24" : "h-36 w-36 sm:h-44 sm:w-44"}`}>
        <div aria-hidden="true" className={`absolute inset-0 rounded-full border border-accent/25 ${person.isSpeaking ? "animate-ping motion-reduce:animate-none" : ""}`} />
        <div aria-hidden="true" className="absolute inset-[9px] rounded-full border border-accent/20" />
        <div className="relative rounded-full bg-[#17151f] p-2 shadow-[0_0_70px_rgba(184,160,251,0.18)] ring-1 ring-white/10">
          <UserAvatar src={person.avatar} name={person.name} size={compact ? "lg" : "xl"} />
        </div>
        {person.isSpeaking && <span className="absolute bottom-2 right-2 h-4 w-4 rounded-full border-[3px] border-[#111016] bg-secondary" aria-label={`${person.name} is speaking`} />}
      </div>
      <div>
        <p className={`font-semibold text-white ${compact ? "text-sm" : "text-lg sm:text-xl"}`}>
          {person.name}{person.isLocal ? <span className="ml-2 text-xs font-normal text-white/50">you</span> : null}
        </p>
        <p className="mt-1 text-xs text-white/55">{connected ? "In the conversation" : person.isLocal ? "Connecting your audio" : "Calling…"}</p>
      </div>
    </div>
  );
}

function CallControls({ callType, onEnd }: { callType: CallType; onEnd: () => void }) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const toggleMicrophone = () => {
    void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled).catch(() => toast.error("Could not change microphone state"));
  };
  const toggleCamera = () => {
    void localParticipant.setCameraEnabled(!isCameraEnabled).catch(() => toast.error("Could not change camera state"));
  };

  return (
    <div className="relative z-10 flex shrink-0 justify-center px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:pb-8 sm:pt-5">
      <div className="flex items-center gap-2 rounded-[26px] border border-white/10 bg-[#1c1b25]/90 p-2.5 shadow-[0_18px_70px_rgba(0,0,0,0.48)] backdrop-blur-xl sm:gap-3 sm:p-3">
        <ControlButton label={isMicrophoneEnabled ? "Mute mic" : "Turn mic on"} pressed={!isMicrophoneEnabled} onClick={toggleMicrophone}>
          {isMicrophoneEnabled ? <Mic aria-hidden="true" className="h-5 w-5" /> : <MicOff aria-hidden="true" className="h-5 w-5" />}
        </ControlButton>
        {callType === "video" && (
          <ControlButton label={isCameraEnabled ? "Turn camera off" : "Turn camera on"} pressed={!isCameraEnabled} onClick={toggleCamera}>
            {isCameraEnabled ? <Camera aria-hidden="true" className="h-5 w-5" /> : <CameraOff aria-hidden="true" className="h-5 w-5" />}
          </ControlButton>
        )}
        <span aria-hidden="true" className="mx-0.5 h-8 w-px bg-white/10 sm:mx-1" />
        <button type="button" onClick={onEnd} aria-label="End call" title="End call" className="flex h-12 min-w-12 items-center justify-center gap-2 rounded-2xl bg-[#ef737b] px-4 text-white shadow-lg shadow-[#ef737b]/20 transition-[transform,filter] hover:brightness-110 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1c1b25] sm:h-14 sm:min-w-14 sm:rounded-[20px]">
          <PhoneOff aria-hidden="true" className="h-5 w-5" />
          <span className="text-sm font-semibold">Leave</span>
        </button>
      </div>
    </div>
  );
}

function ControlButton({ children, label, pressed, onClick }: { children: React.ReactNode; label: string; pressed: boolean; onClick: () => void }) {
  const controlStyle = pressed
    ? "bg-[#3b2830] text-[#ffd3cf] ring-1 ring-[#ef737b]/25 hover:bg-[#493039]"
    : "bg-white/[0.06] text-white hover:bg-white/[0.12]";
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-pressed={pressed} title={label} className={`flex h-12 min-w-12 items-center justify-center rounded-2xl px-3 transition-[background-color,color,transform] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:h-14 sm:min-w-14 sm:rounded-[20px] ${controlStyle}`}>
      {children}
    </button>
  );
}

export function CallRoom() {
  const { activeCall, endCall } = useCall();
  const { user } = useAuth();
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const currentUser: CallParticipant | null = user ? {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
  } : null;

  useEffect(() => {
    if (activeCall && !serverUrl) {
      toast.error("LiveKit server URL is not configured");
      endCall();
    }
  }, [activeCall, endCall, serverUrl]);

  if (!activeCall || !serverUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#100f15] text-white" style={{ backgroundImage: "radial-gradient(ellipse at 50% 32%, rgba(184,160,251,0.13), transparent 42%), radial-gradient(ellipse at 8% 92%, rgba(215,248,123,0.055), transparent 30%)" }}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:radial-gradient(rgba(255,255,255,.28)_0.5px,transparent_0.5px)] [background-size:20px_20px]" />
      <LiveKitRoom
        video={activeCall.callType === "video"}
        audio
        token={activeCall.token}
        serverUrl={serverUrl}
        onDisconnected={endCall}
        onError={() => toast.error("Could not connect to the call. Check your network and LiveKit configuration.")}
        className="relative flex h-full min-h-0 flex-col"
      >
        <CallHeader call={activeCall} />
        <main className="relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-3 sm:px-8 sm:py-6">
          <CallStage call={activeCall} currentUser={currentUser} />
        </main>
        <RoomAudioRenderer />
        <CallControls callType={activeCall.callType} onEnd={endCall} />
      </LiveKitRoom>
    </div>
  );
}
