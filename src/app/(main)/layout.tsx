import { Sidebar } from "@/components/navigation/sidebar";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { ContentContainer } from "@/components/navigation/content-container";
import { CallModal } from "@/components/chat/call-modal";
import { CallRoom } from "@/components/chat/call-room";
import { ModalRenderer } from "@/components/shared/modal-renderer";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content area */}
      <main className="flex-1 lg:ml-[260px] flex flex-col min-h-dvh">
        <ContentContainer>{children}</ContentContainer>
      </main>

      {/* Mobile bottom nav */}
      <BottomNav />

      {/* Global Call Overlays */}
      <CallModal />
      <CallRoom />

      {/* Global Modal Renderer (groups, etc.) */}
      <ModalRenderer />
    </div>
  );
}
