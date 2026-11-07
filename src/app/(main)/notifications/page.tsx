import { NotificationList } from "@/components/notifications/notification-list";
export const metadata = {
  title: "Activity",
  description: "The latest from your Bakaiti circle.",
};
export default function NotificationsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <header>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-secondary">
          You’re part of the conversation
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          The latest<span className="text-accent">.</span>
        </h1>
        <p className="mt-3 text-sm text-text-secondary">
          Your people. Your updates. All in one place.
        </p>
      </header>
      <NotificationList />
    </div>
  );
}
