"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useFriends } from "@/hooks/use-friends";
import { FriendList } from "@/components/friends/friend-list";
import { FriendRequest } from "@/components/friends/friend-request";
import { FriendSuggestions } from "@/components/friends/friend-suggestions";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserPlus, Sparkles, Loader2, RefreshCw } from "lucide-react";

type TabType = "friends" | "requests";

export default function FriendsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const {
    friends,
    pendingRequests,
    isLoading: socialLoading,
    acceptRequest,
    rejectRequest,
    removeFriend,
    refresh,
  } = useFriends(user?.id);

  const [activeTab, setActiveTab] = useState<TabType>("friends");

  const tabs = [
    {
      id: "friends" as const,
      label: "My Friends",
      icon: Users,
      count: friends.length,
    },
    {
      id: "requests" as const,
      label: "Requests",
      icon: UserPlus,
      count: pendingRequests.length,
      badge: true,
    },
  ];

  const isLoading = authLoading || (socialLoading && friends.length === 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Your Circle
          </h1>
          <p className="text-sm text-text-secondary">Friends · Requests</p>
        </div>

        <button
          onClick={refresh}
          disabled={isLoading}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-secondary text-text-muted hover:bg-surface-hover hover:text-text-primary active:scale-95 transition-all duration-150 disabled:opacity-50"
          title="Refresh connection list"
        >
          <RefreshCw
            className={`h-4 w-4 ${socialLoading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border gap-1 overflow-x-auto no-scrollbar pt-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 shrink-0 ${
                isActive
                  ? "text-accent"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Icon
                className={`h-4 w-4 ${isActive ? "text-accent" : "text-text-muted group-hover:text-text-secondary"}`}
              />
              <span>{tab.label}</span>

              {tab.count > 0 && (
                <span
                  className={`flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                    tab.badge && tab.id === "requests"
                      ? "bg-accent text-white shadow-md shadow-accent/20"
                      : "bg-surface-secondary text-text-secondary"
                  }`}
                >
                  {tab.count}
                </span>
              )}

              {isActive && (
                <motion.div
                  layoutId="active-friends-tab"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="pt-2">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
              <p className="mt-2 text-xs text-text-muted">
                Loading connection list...
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {activeTab === "friends" && (
                <FriendList friends={friends} onRemoveFriend={removeFriend} />
              )}
              {activeTab === "requests" && (
                <FriendRequest
                  requests={pendingRequests}
                  onAccept={acceptRequest}
                  onReject={rejectRequest}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
