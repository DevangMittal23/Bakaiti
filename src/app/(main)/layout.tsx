import { Sidebar } from "@/components/navigation/sidebar";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { Header } from "@/components/navigation/header";
import { ContentContainer } from "@/components/navigation/content-container";
import { NavigationSync } from "@/components/navigation/navigation-sync";
import { CallModal } from "@/components/chat/call-modal";
import { CallRoom } from "@/components/chat/call-room";
import { ModalRenderer } from "@/components/shared/modal-renderer";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background text-text-primary">
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[100] -translate-y-24 rounded-xl bg-accent px-4 py-3 font-semibold text-on-primary focus:translate-y-0"
      >
        Skip to content
      </a>
      <NavigationSync />
      <Sidebar />
      <Header />
      <main id="main-content" tabIndex={-1} className="min-w-0 lg:ml-[240px]">
        <ContentContainer>{children}</ContentContainer>
      </main>
      <BottomNav />
      <CallModal />
      <CallRoom />
      <ModalRenderer />
    </div>
  );
}
