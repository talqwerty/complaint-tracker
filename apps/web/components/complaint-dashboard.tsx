"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlassIcon, SignOutIcon } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Reveal } from "@/components/reveal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateCaseDialog } from "@/components/create-case-dialog";
import { CaseDetailDialog } from "@/components/case-detail-dialog";
import {
  api,
  PRIORITIES,
  STATUSES,
  type AuthUser,
  type Case,
  type Stats,
} from "@/lib/api";
import { clearToken } from "@/lib/auth";
import { formatDate, priorityClass, statusClass } from "@/lib/format";

const selectClass =
  "h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ComplaintDashboard() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [priority, setPriority] = useState("All");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, st] = await Promise.all([
        api.listCases({ search, status, priority }),
        api.stats(),
      ]);
      setCases(list);
      setStats(st);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `เชื่อมต่อ API ไม่ได้: ${err.message}`
          : "โหลดข้อมูลไม่สำเร็จ",
      );
    } finally {
      setLoading(false);
    }
  }, [search, status, priority]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    let active = true;
    api
      .me()
      .then((u) => {
        if (active) setUser(u);
      })
      .catch(() => {
        // 401 is handled in the api client (redirect to /login)
      });
    return () => {
      active = false;
    };
  }, []);

  function openCase(id: number) {
    setSelectedId(id);
    setDetailOpen(true);
  }

  function logout() {
    clearToken();
    toast.success("ออกจากระบบแล้ว");
    router.replace("/login");
    router.refresh();
  }

  const statusCount = (s: string) =>
    stats?.byStatus.find((x) => x.status === s)?.count ?? 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
      <Reveal>
        <header className="mb-10 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-4xl tracking-tight">
              ระบบติดตามเรื่องร้องเรียน
            </h1>
            <p className="mt-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Customer Complaint Tracker — Forth Smart Service
            </p>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium leading-tight">{user.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{user.email}</p>
              </div>
            ) : null}
            <CreateCaseDialog onCreated={load} />
            <Button
              variant="outline"
              size="icon"
              onClick={logout}
              title="ออกจากระบบ"
            >
              <SignOutIcon weight="bold" />
            </Button>
          </div>
        </header>
      </Reveal>

      <Reveal index={1}>
        <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="ทั้งหมด" value={stats?.total ?? 0} />
          {STATUSES.map((s) => (
            <StatCard key={s} label={s} value={statusCount(s)} accent={statusClass(s)} />
          ))}
        </section>
      </Reveal>

      <section className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-50">
          <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="ค้นหา เลขเคส / ลูกค้า / หัวข้อ"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={selectClass}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="All">ทุกสถานะ</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="All">ทุกความสำคัญ</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </section>

      <Reveal index={2} className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>เลขเคส</TableHead>
              <TableHead>ลูกค้า</TableHead>
              <TableHead>หัวข้อ</TableHead>
              <TableHead>ความสำคัญ</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead>ผู้รับผิดชอบ</TableHead>
              <TableHead>สร้างเมื่อ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  กำลังโหลด...
                </TableCell>
              </TableRow>
            ) : cases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  ไม่พบเคส
                </TableCell>
              </TableRow>
            ) : (
              cases.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => openCase(c.id)}
                >
                  <TableCell className="font-mono text-xs">{c.caseNumber}</TableCell>
                  <TableCell>{c.customerName}</TableCell>
                  <TableCell className="max-w-60 truncate">{c.subject}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={priorityClass(c.priority)}>
                      {c.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusClass(c.status)}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{c.assignee || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(c.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Reveal>

      <CaseDetailDialog
        caseId={selectedId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onChanged={load}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <Card className="gap-0 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {accent ? (
            <Badge variant="outline" className={accent}>
              {label}
            </Badge>
          ) : (
            label
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
