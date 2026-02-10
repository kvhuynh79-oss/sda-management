"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const { canInstall, isInstalled, isIOS, promptInstall } = useInstallPrompt();

  useEffect(() => {
    const user = localStorage.getItem("sda_user");
    setIsLoggedIn(!!user);
  }, []);

  const handleInstall = async () => {
    await promptInstall();
  };

  // Still checking auth
  if (isLoggedIn === null) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/Logo.jpg"
              alt="MySDAManager"
              width={80}
              height={32}
              className="rounded object-contain h-7 w-auto"
              priority
            />
            <span className="text-white font-semibold text-lg hidden sm:inline">
              MySDAManager
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/pricing"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Pricing
            </Link>
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="text-sm bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-gray-300 hover:text-white transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="text-sm bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
            SDA Property Management,{" "}
            <span className="text-teal-400">Simplified</span>
          </h1>
          <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto">
            The all-in-one platform for Australian Specialist Disability
            Accommodation providers. Manage properties, participants,
            compliance, and maintenance from anywhere.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white font-medium px-8 py-3 rounded-lg transition-colors text-center"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                href="/register"
                className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white font-medium px-8 py-3 rounded-lg transition-colors text-center"
              >
                Start Free Trial
              </Link>
            )}

            {/* Install App button */}
            {canInstall && !isInstalled && (
              <button
                onClick={handleInstall}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-medium px-8 py-3 rounded-lg border border-gray-600 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Install App
              </button>
            )}

            {isIOS && !isInstalled && (
              <div className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-800 text-gray-300 font-medium px-8 py-3 rounded-lg border border-gray-600">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span className="text-sm">
                  Tap <strong>Share</strong> then <strong>Add to Home Screen</strong>
                </span>
              </div>
            )}

            {isInstalled && (
              <div className="flex items-center gap-2 text-teal-400 text-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                App installed
              </div>
            )}
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-5">
              <div className="w-10 h-10 bg-teal-600/20 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-white font-medium mb-1">Property Management</h3>
              <p className="text-sm text-gray-400">
                Track properties, dwellings, inspections, and maintenance in one place.
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-5">
              <div className="w-10 h-10 bg-teal-600/20 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-white font-medium mb-1">NDIS Compliance</h3>
              <p className="text-sm text-gray-400">
                Incident reporting, complaints handling, and audit-ready documentation.
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-5">
              <div className="w-10 h-10 bg-teal-600/20 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-white font-medium mb-1">Works Offline</h3>
              <p className="text-sm text-gray-400">
                Install as an app on any device. Log incidents and inspections offline.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} MySDAManager. Built for NDIS compliance.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
