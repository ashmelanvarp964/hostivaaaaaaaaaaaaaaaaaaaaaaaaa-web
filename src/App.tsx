/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "@/src/components/Navbar";
import Hero from "@/src/components/Hero";
import Pricing from "@/src/components/Pricing";
import Features from "@/src/components/Features";
import Footer from "@/src/components/Footer";
import Success from "@/src/components/Success";
import About from "@/src/components/About";
import Login from "@/src/components/Login";
import Billing from "@/src/components/Billing";
import Checkout from "@/src/components/Checkout";
import Support from "@/src/components/Support";
import VerifyPayment from "@/src/components/VerifyPayment";
import AdminPanel from "@/src/components/AdminPanel";
import ScrollToTop from "@/src/components/ScrollToTop";
import InteractiveBackground from "@/src/components/InteractiveBackground";
import { AIAssistant } from "@/src/components/AIAssistant";
import React, { useEffect } from "react";
import { AuthProvider } from "@/src/context/AuthContext";
import { motion, AnimatePresence } from "motion/react";

function PageTransition({ children }: { children: React.ReactNode; key?: string | number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}

function AppContent() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col text-white font-sans selection:bg-blue-500/30 relative">
      <InteractiveBackground />
      <Navbar />
      <AIAssistant />
      <main className="flex-grow relative">
        <AnimatePresence mode="wait">
          <Routes location={location}>
            <Route path="/" element={
              <PageTransition key="home">
                <Hero />
                <About />
                <Features />
                <Pricing />
              </PageTransition>
            } />
            <Route path="/checkout/:planId" element={<PageTransition key="checkout"><Checkout /></PageTransition>} />
            <Route path="/success" element={<PageTransition key="success"><Success /></PageTransition>} />
            <Route path="/login" element={<PageTransition key="login"><Login /></PageTransition>} />
            <Route path="/billing" element={<PageTransition key="billing"><Billing /></PageTransition>} />
            <Route path="/verify-payment" element={<PageTransition key="verify-payment"><VerifyPayment /></PageTransition>} />
            <Route path="/support" element={<PageTransition key="support"><Support /></PageTransition>} />
            <Route path="/admin" element={<PageTransition key="admin"><AdminPanel /></PageTransition>} />
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}

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
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
