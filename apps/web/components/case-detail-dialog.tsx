"use client";

import { useEffect, useRef, useState } from "react";
import { PaperclipIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  api,
  PRIORITIES,
  STATUSES,
  type CaseDetail,
} from "@/lib/api";
import { formatDate, priorityClass, statusClass } from "@/lib/format";

const selectClass =
  "flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

interface Props {
  caseId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

export function CaseDetailDialog({ caseId, open, onOpenChange, onChanged }: Props) {
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);
  const [noteAuthor, setNoteAuthor] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived: showing stale/empty detail while the requested case loads.
  const loading = open && caseId != null && detail?.id !== caseId;

  // Fetch on open / case change. setState happens after the await (async),
  // never synchronously inside the effect body.
  useEffect(() => {
    if (!open || caseId == null) return;
    let active = true;
    api
      .getCase(caseId)
      .then((d) => {
        if (!active) return;
        setDetail(d);
        setNoteContent("");
      })
      .catch((err: unknown) => {
        if (active) {
          toast.error(err instanceof Error ? err.message : "โหลดเคสไม่สำเร็จ");
        }
      });
    return () => {
      active = false;
    };
  }, [open, caseId]);

  async function patchField(
    patch: Parameters<typeof api.updateCase>[1],
  ) {
    if (!detail) return;
    setSavingMeta(true);
    try {
      const updated = await api.updateCase(detail.id, patch);
      setDetail({ ...detail, ...updated });
      onChanged();
      toast.success("อัปเดตเคสแล้ว");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "อัปเดตไม่สำเร็จ");
    } finally {
      setSavingMeta(false);
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!detail || !noteAuthor.trim() || !noteContent.trim()) {
      toast.error("กรอกชื่อผู้บันทึกและเนื้อหา");
      return;
    }
    setAddingNote(true);
    try {
      const note = await api.addNote(detail.id, {
        author: noteAuthor,
        content: noteContent,
      });
      setDetail({ ...detail, notes: [...detail.notes, note] });
      setNoteContent("");
      onChanged();
      toast.success("เพิ่มบันทึกแล้ว");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เพิ่มบันทึกไม่สำเร็จ");
    } finally {
      setAddingNote(false);
    }
  }

  async function handleDelete() {
    if (!detail) return;
    if (!window.confirm(`ลบเคส ${detail.caseNumber}?`)) return;
    try {
      await api.deleteCase(detail.id);
      toast.success("ลบเคสแล้ว");
      onOpenChange(false);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!detail || !file) return;

    setUploading(true);
    try {
      const attachment = await api.uploadAttachment(detail.id, file);
      setDetail({ ...detail, attachments: [...detail.attachments, attachment] });
      toast.success("แนบรูปแล้ว");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "แนบรูปไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteAttachment(attachmentId: number) {
    if (!detail) return;
    try {
      await api.deleteAttachment(detail.id, attachmentId);
      setDetail({
        ...detail,
        attachments: detail.attachments.filter((a) => a.id !== attachmentId),
      });
      toast.success("ลบรูปแล้ว");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ลบรูปไม่สำเร็จ");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {loading ? "กำลังโหลด..." : detail ? detail.caseNumber : "รายละเอียดเคส"}
          </DialogTitle>
          <DialogDescription>
            {loading
              ? "กรุณารอสักครู่"
              : detail
                ? detail.subject
                : "ข้อมูลเคสร้องเรียนและประวัติการอัปเดต"}
          </DialogDescription>
        </DialogHeader>

        {detail && !loading && (
          <div className="grid gap-5">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Info label="ลูกค้า" value={detail.customerName} />
              <Info label="ติดต่อ" value={detail.customerContact || "-"} />
              <Info label="ประเภท" value={detail.category} />
              <Info label="สร้างเมื่อ" value={formatDate(detail.createdAt)} />
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">รายละเอียด</p>
                <p className="whitespace-pre-wrap">{detail.description || "-"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-lg border p-3">
              <div className="grid gap-1.5">
                <Label htmlFor="detail-status">สถานะ</Label>
                <select
                  id="detail-status"
                  className={selectClass}
                  value={detail.status}
                  disabled={savingMeta}
                  onChange={(e) => patchField({ status: e.target.value })}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="detail-priority">ความสำคัญ</Label>
                <select
                  id="detail-priority"
                  className={selectClass}
                  value={detail.priority}
                  disabled={savingMeta}
                  onChange={(e) => patchField({ priority: e.target.value })}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Badge variant="outline" className={statusClass(detail.status)}>
                  {detail.status}
                </Badge>
                <Badge variant="outline" className={priorityClass(detail.priority)}>
                  {detail.priority}
                </Badge>
                {detail.assignee ? (
                  <span className="text-sm text-muted-foreground">
                    ผู้รับผิดชอบ: {detail.assignee}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  รูปแนบ ({detail.attachments.length})
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <PaperclipIcon weight="bold" />
                  {uploading ? "กำลังอัปโหลด..." : "แนบรูป"}
                </Button>
              </div>

              {detail.attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">ยังไม่มีรูปแนบ</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {detail.attachments.map((a) => (
                    <div
                      key={a.id}
                      className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
                    >
                      {a.url ? (
                        <a href={a.url} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={a.url}
                            alt={a.filename}
                            className="h-full w-full object-cover"
                          />
                        </a>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center p-1 text-center text-[10px] text-muted-foreground">
                          {a.filename}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(a.id)}
                        title="ลบรูป"
                        className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-md bg-background/80 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <XIcon weight="bold" className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <p className="text-sm font-medium">
                ประวัติบันทึก ({detail.notes.length})
              </p>
              {detail.notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">ยังไม่มีบันทึก</p>
              ) : (
                <ul className="grid gap-2">
                  {detail.notes.map((n) => (
                    <li key={n.id} className="rounded-lg border bg-muted/40 p-2.5 text-sm">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{n.author}</span>
                        <span>{formatDate(n.createdAt)}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap">{n.content}</p>
                    </li>
                  ))}
                </ul>
              )}

              <form onSubmit={handleAddNote} className="mt-1 grid gap-2">
                <Input
                  placeholder="ชื่อผู้บันทึก"
                  value={noteAuthor}
                  onChange={(e) => setNoteAuthor(e.target.value)}
                />
                <Textarea
                  rows={2}
                  placeholder="เพิ่มบันทึก..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                />
                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                  >
                    <TrashIcon weight="bold" />
                    ลบเคส
                  </Button>
                  <Button type="submit" size="sm" disabled={addingNote}>
                    {addingNote ? "กำลังเพิ่ม..." : "เพิ่มบันทึก"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p>{value}</p>
    </div>
  );
}
