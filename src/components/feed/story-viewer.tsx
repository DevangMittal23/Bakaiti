"use client";
import {useCallback,useEffect,useState} from "react";
import {ChevronLeft,ChevronRight,Pause,Play} from "lucide-react";
import {Dialog,DialogContent,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import {UserAvatar} from "@/components/shared/user-avatar";
import {viewStory} from "@/actions/stories";
import {mediaUrl} from "@/lib/media";
import {formatRelativeTime} from "@/lib/utils";
import type {Story} from "@/types";
export function StoryViewer({author,stories,onClose}:{author:{id:string;username:string;display_name:string;avatar_url:string|null};stories:Story[];onClose:()=>void}){
 const[index,setIndex]=useState(0);const[paused,setPaused]=useState(false);const current=stories[index];
 const next=useCallback(()=>{if(index<stories.length-1)setIndex(v=>v+1);else onClose();},[index,stories.length,onClose]);
 useEffect(()=>{if(current)void viewStory(current.id).catch(()=>{});},[current]);
 useEffect(()=>{if(!current||paused||current.media_type==="video")return;const timer=setTimeout(next,5000);return()=>clearTimeout(timer);},[current,paused,next]);
 if(!current)return null;
 return <Dialog open onOpenChange={open=>{if(!open)onClose();}}><DialogContent className="max-w-lg p-4"><DialogTitle className="sr-only">{author.display_name}&apos;s story</DialogTitle><DialogDescription className="sr-only">Story {index+1} of {stories.length}. Photos advance after five seconds. Use Previous, Next, or Pause.</DialogDescription><div className="mb-3 flex items-center gap-3 pr-8"><UserAvatar src={author.avatar_url} name={author.display_name} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{author.display_name}</p><p className="text-[10px] text-text-secondary">{formatRelativeTime(current.created_at)} · {index+1}/{stories.length}</p></div>{current.media_type!=="video"&&<button type="button" aria-label={paused?"Resume story":"Pause story"} onClick={()=>setPaused(!paused)} className="flex h-11 w-10 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-container">{paused?<Play className="h-4 w-4" />:<Pause className="h-4 w-4" />}</button>}</div><div className="relative flex min-h-64 items-center justify-center overflow-hidden rounded-xl bg-background">{current.media_type==="video"?<video key={current.id} src={mediaUrl(current.media_url)} controls autoPlay playsInline onEnded={next} className="max-h-[60dvh] w-full object-contain" />:<img src={mediaUrl(current.media_url)} alt={current.caption||`${author.display_name}'s story`} className="max-h-[60dvh] w-full object-contain" />}</div>{current.caption&&<p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">{current.caption}</p>}<div className="mt-3 flex items-center justify-between"><button type="button" disabled={index===0} onClick={()=>setIndex(v=>Math.max(0,v-1))} className="flex min-h-11 items-center gap-1 text-xs text-text-secondary disabled:opacity-30"><ChevronLeft className="h-4 w-4" />Previous</button><button type="button" onClick={next} className="flex min-h-11 items-center gap-1 text-xs font-semibold text-accent">{index===stories.length-1?"Done":"Next"}<ChevronRight className="h-4 w-4" /></button></div></DialogContent></Dialog>;
}
