import type { Metadata } from "next";
export const metadata: Metadata = { title: "Your circle" };
export default function FriendsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
