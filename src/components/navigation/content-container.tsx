"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ContentContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChat = pathname.startsWith("/chat");
  const isThread = pathname.startsWith("/chat/");
  return (
    <div
      className={cn(
        "mx-auto flex min-w-0 flex-col",
        isChat
          ? cn(
              "w-full lg:pt-[72px]",
              isThread
                ? "pt-0"
                : "pt-16 pb-[calc(72px+env(safe-area-inset-bottom,0px))] lg:pb-0",
            )
          : "w-full max-w-[1360px] px-4 pt-[88px] pb-28 sm:px-6 lg:px-8 lg:pt-[104px] lg:pb-10",
      )}
    >
      <div
        className={cn(isChat && "app-chat-content flex min-h-0 flex-col")}
        data-thread={isThread ? "true" : undefined}
      >
        {children}
      </div>
    </div>
  );
}
