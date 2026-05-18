/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "@/src/components/Navbar";
import Hero from "@/src/components/Hero";
import Pricing from "@/src/components/Pricing";
import Features from "@/src/components/Features";
import Footer from "@/src/components/Footer";
import Success from "@/src/components/Success";
import About from "@/src/components/About";
import Login from "@/src/components/Login";
import Billing from "@/src/components/Billing";
import Support from "@/src/components/Support";
import VerifyPayment from "@/src/components/VerifyPayment";
import ScrollToTop from "@/src/components/ScrollToTop";
import InteractiveBackground from "@/src/components/InteractiveBackground";
import { AIAssistant } from "@/src/components/AIAssistant";
import { useEffect } from "react";
import { AuthProvider } from "@/src/context/AuthContext";

export default function App() {
  useEffect(() => {
    // Disable automatic browser scroll restoration
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    // Basic protection against right-click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Basic protection against DevTools hotkeys
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
        (e.ctrlKey && e.key === "U")
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <div className="min-h-screen flex flex-col text-white font-sans selection:bg-blue-500/30 relative">
          <InteractiveBackground />
          <Navbar />
          <AIAssistant />
          <main className="flex-grow relative">
            <Routes>
            <Route path="/" element={
              <>
                <Hero />
                <About />
                <Features />
                <Pricing />
              </>
            } />
            <Route path="/success" element={<Success />} />
            <Route path="/login" element={<Login />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/verify-payment" element={<VerifyPayment />} />
            <Route path="/support" element={<Support />} />
          </Routes>
        </main>
        <Footer />
      </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
