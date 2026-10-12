import type { Metadata } from "next";
import { TeamAdmin } from "@/modules/auth/ui/TeamAdmin";

export const metadata: Metadata = { title: "Equipo" };

export default function TeamPage() {
  return <TeamAdmin />;
}
