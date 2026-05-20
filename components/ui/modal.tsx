"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className = "" }: ModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999, backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-2xl max-h-[90vh] ${className}`}
        onClick={e => e.stopPropagation()}
      >
        <Card className="shadow-2xl dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-gray-100 dark:border-border">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-foreground">
              {title}
            </CardTitle>
            <Button onClick={onClose} variant="ghost" size="sm" className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="max-h-[70vh] overflow-y-auto pt-5">
            {children}
          </CardContent>
        </Card>
      </div>
    </div>,
    document.body
  );
}
