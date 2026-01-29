"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ScheduleRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/preventative-schedule");
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Redirecting...</div>
    </div>
  );
}
