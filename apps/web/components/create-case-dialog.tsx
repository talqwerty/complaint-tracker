"use client";

import { useState } from "react";
import { PlusIcon } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, CATEGORIES, PRIORITIES, type CreateCaseInput } from "@/lib/api";

const selectClass =
  "flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50";

const empty: CreateCaseInput = {
  customerName: "",
  customerContact: "",
  category: CATEGORIES[0],
  priority: "Medium",
  subject: "",
  description: "",
  assignee: "",
};

export function CreateCaseDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateCaseInput>(empty);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof CreateCaseInput>(key: K, value: CreateCaseInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerName.trim() || !form.category.trim() || !form.subject.trim()) {
      toast.error("กรุณากรอก ชื่อลูกค้า / ประเภท / หัวข้อ");
      return;
    }
    setSubmitting(true);
    try {
      const created = await api.createCase(form);
      toast.success(`สร้างเคส ${created.caseNumber} แล้ว`);
      setForm(empty);
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "สร้างเคสไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon weight="bold" />
        สร้างเคสใหม่
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>สร้างเคสร้องเรียนใหม่</DialogTitle>
            <DialogDescription>กรอกรายละเอียดเคสของลูกค้า</DialogDescription>
          </DialogHeader>

          <form id="create-case-form" onSubmit={handleSubmit} className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="customerName">ชื่อลูกค้า *</Label>
              <Input
                id="customerName"
                value={form.customerName}
                onChange={(e) => update("customerName", e.target.value)}
                placeholder="เช่น บริษัท ABC จำกัด"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="customerContact">ช่องทางติดต่อ</Label>
                <Input
                  id="customerContact"
                  value={form.customerContact ?? ""}
                  onChange={(e) => update("customerContact", e.target.value)}
                  placeholder="โทร / อีเมล"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="assignee">ผู้รับผิดชอบ</Label>
                <Input
                  id="assignee"
                  value={form.assignee ?? ""}
                  onChange={(e) => update("assignee", e.target.value)}
                  placeholder="ชื่อเจ้าหน้าที่"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="category">ประเภท *</Label>
                <select
                  id="category"
                  className={selectClass}
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="priority">ความสำคัญ</Label>
                <select
                  id="priority"
                  className={selectClass}
                  value={form.priority}
                  onChange={(e) => update("priority", e.target.value)}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="subject">หัวข้อ *</Label>
              <Input
                id="subject"
                value={form.subject}
                onChange={(e) => update("subject", e.target.value)}
                placeholder="สรุปปัญหาสั้น ๆ"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="description">รายละเอียด</Label>
              <Textarea
                id="description"
                rows={3}
                value={form.description ?? ""}
                onChange={(e) => update("description", e.target.value)}
                placeholder="อธิบายปัญหาเพิ่มเติม"
              />
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} type="button">
              ยกเลิก
            </Button>
            <Button type="submit" form="create-case-form" disabled={submitting}>
              {submitting ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
