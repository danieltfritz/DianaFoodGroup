"use client";

import { useState, useTransition } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, KeyRound } from "lucide-react";
import { changeOwnPassword } from "@/lib/actions/users";

export function UserMenu() {
  const { data: session } = useSession();
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [, startTransition] = useTransition();

  const name = session?.user?.name ?? session?.user?.email ?? "User";
  const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  function openChangePw() { setCurrent(""); setNext(""); setConfirm(""); setError(""); setSuccess(false); setChangePwOpen(true); }

  async function handleChangePw(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (next !== confirm) { setError("New passwords do not match."); return; }
    startTransition(async () => {
      try {
        await changeOwnPassword(current, next);
        setSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to change password.");
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 hover:bg-accent">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start text-left">
            <span className="text-sm font-medium leading-none">{name}</span>
            {session?.user?.email && (
              <span className="mt-0.5 text-xs text-muted-foreground">{session.user.email}</span>
            )}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={openChangePw}>
            <KeyRound className="mr-2 size-4" />Change Password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut className="mr-2 size-4" />Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={changePwOpen} onOpenChange={setChangePwOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Change Password</DialogTitle></DialogHeader>
          {success ? (
            <div className="space-y-4">
              <p className="text-sm text-green-600">Password changed successfully.</p>
              <div className="flex justify-end">
                <Button onClick={() => setChangePwOpen(false)}>Close</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleChangePw} className="space-y-3">
              <div className="space-y-1">
                <Label>Current Password *</Label>
                <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>New Password *</Label>
                <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={6} />
              </div>
              <div className="space-y-1">
                <Label>Confirm New Password *</Label>
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setChangePwOpen(false)}>Cancel</Button>
                <Button type="submit">Change</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
