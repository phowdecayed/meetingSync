import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface MeetingSummaryProps {
  summary: {
    summary_title: string;
    summary_content: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MeetingSummary: React.FC<MeetingSummaryProps> = ({ summary, isOpen, onClose }) => {
  if (!isOpen || !summary) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{summary.summary_title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <pre className="whitespace-pre-wrap text-sm">{summary.summary_content}</pre>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};