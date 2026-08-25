"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./dialog";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Kept as a thin wrapper over the Radix dialog rather than a second modal
 * implementation.
 *
 * The hand-rolled version portalled to the body and closed on Escape, but it
 * never trapped focus: Tab walked straight out of the open dialog into the page
 * behind it, which for a keyboard or screen-reader user means the note editor
 * silently stops being where they are typing. It also left the page scrollable
 * underneath and told assistive tech nothing about being modal at all.
 *
 * The props are unchanged so the callers did not have to move.
 */
export function Modal({ isOpen, onClose, title, children, className = "" }: ModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent
        className={`max-w-2xl p-0 gap-0 overflow-hidden ${className}`}
      >
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-gray-100 dark:border-border">
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-foreground">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto px-6 pb-6 pt-5">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
