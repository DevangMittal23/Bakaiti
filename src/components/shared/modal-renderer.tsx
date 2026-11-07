"use client";

import { useRef } from "react";
import { useUIStore } from "@/stores/ui-store";
import { GroupCreate } from "@/components/chat/group-create";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function ModalRenderer() {
  const { activeModal, closeModal } = useUIStore();
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <Dialog
      open={activeModal === "create-group"}
      onOpenChange={(open) => {
        if (!open) closeModal();
      }}
    >
      <DialogContent
        className="max-w-md rounded-2xl border-border bg-surface p-6"
        onOpenAutoFocus={() => {
          returnFocus.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (returnFocus.current?.isConnected) returnFocus.current.focus();
        }}
      >
        <DialogTitle className="sr-only">Create a group chat</DialogTitle>
        <DialogDescription className="sr-only">
          Name your group and choose friends to join the conversation.
        </DialogDescription>
        <GroupCreate />
      </DialogContent>
    </Dialog>
  );
}
