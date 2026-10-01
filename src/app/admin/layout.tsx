import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./admin.css";
import { Notices } from "./Notices";

export const metadata: Metadata = {
  title: "Editor",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin">
      {children}
      <Notices />
    </div>
  );
}
