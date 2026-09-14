"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { appConfig } from '@/config/app.config';
import { toast } from "sonner";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { deriveProjectName } from "@/lib/projects/name";
import AuthHeaderControl from "@/components/auth/AuthHeaderControl";
import ProjectsList from "@/components/app/(home)/ProjectsList";
import Wordmark from "@/components/Wordmark";
import ArrowRight from "@/components/app/(home)/sections/hero-input/_svg/ArrowRight";

const EXAMPLE_PROMPTS = [
  "En hemsida för en takläggare i Uppsala med tjänster, referenser och offertförfrågan",
  "En bokningssida för en frisörsalong i Malmö med priser, galleri och onlinebokning",
  "En sida för ett lokalt kafé i Göteborg med meny, öppettider och en karta",
];

const PENDING_PROMPT_KEY = 'authPendingUrl';
const PENDING_REFERENCE_URL_KEY = 'authPendingReferenceUrl';

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function HomePage() {
  const [description, setDescription] = useState<string>("");
  const [showReferenceUrlField, setShowReferenceUrlField] = useState<boolean>(false);
  const [referenceUrl, setReferenceUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const router = useRouter();
  const { user } = useSupabaseUser();

  // Restore a prompt (and optional reference URL) that was typed before being
  // sent to /login, now that the user is back and signed in.
  useEffect(() => {
    if (!user) return;
    const pendingPrompt = sessionStorage.getItem(PENDING_PROMPT_KEY);
    if (pendingPrompt) {
      setDescription(pendingPrompt);
      sessionStorage.removeItem(PENDING_PROMPT_KEY);
    }
    const pendingReferenceUrl = sessionStorage.getItem(PENDING_REFERENCE_URL_KEY);
    if (pendingReferenceUrl) {
      setReferenceUrl(pendingReferenceUrl);
      setShowReferenceUrlField(true);
      sessionStorage.removeItem(PENDING_REFERENCE_URL_KEY);
    }
  }, [user]);

  const isURL = (str: string): boolean => {
    const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;
    return urlPattern.test(str.trim());
  };

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const handleSubmit = async () => {
    const inputValue = description.trim();
    const trimmedReferenceUrl = referenceUrl.trim();

    if (!inputValue) {
      toast.error("Beskriv vad du vill bygga");
      return;
    }

    if (trimmedReferenceUrl && !isURL(trimmedReferenceUrl)) {
      toast.error("Referens-URL:en ser inte ut som en giltig webbadress");
      return;
    }

    if (!user) {
      sessionStorage.setItem(PENDING_PROMPT_KEY, inputValue);
      if (trimmedReferenceUrl) {
        sessionStorage.setItem(PENDING_REFERENCE_URL_KEY, trimmedReferenceUrl);
      }
      router.push('/login?redirect=/');
      return;
    }

    setIsSubmitting(true);
    try {
      const name = deriveProjectName(inputValue);
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Kunde inte skapa projekt');

      sessionStorage.setItem('pendingPrompt', inputValue);
      if (trimmedReferenceUrl) {
        sessionStorage.setItem('pendingReferenceUrl', trimmedReferenceUrl);
      }
      sessionStorage.setItem('selectedModel', appConfig.ai.defaultModel);

      router.push(`/project/${data.project.id}`);
    } catch (error) {
      console.error('[HomePage] Failed to create project:', error);
      toast.error('Kunde inte skapa projektet. Försök igen.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f4] text-gray-900 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[1100px] overflow-hidden pointer-events-none" aria-hidden>
        <div className="gradient-blob gradient-blob-blue" />
        <div className="gradient-blob gradient-blob-violet" />
        <div className="gradient-blob gradient-blob-pink" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-20 sm:px-40 py-20">
        <Link href="/">
          <Wordmark />
        </Link>
        <AuthHeaderControl />
      </header>

      <main className="relative z-10 max-w-[720px] mx-auto px-20">
        <div className="min-h-[70vh] flex flex-col items-center justify-center py-48">
          <div className="text-center">
            <h1 className="font-sans font-bold text-[28px] sm:text-[38px] lg:text-[46px] leading-[1.15] tracking-[-0.03em] text-gray-900">
              Bygg din hemsida med AI
            </h1>
            <p className="mt-12 text-base sm:text-lg text-gray-500">
              Beskriv vad du vill ha, så skapar vi ett förslag åt dig – klart på några minuter.
            </p>
          </div>

          <div className="mt-32 w-full max-w-[640px]">
            <div className="bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] p-20">
              <textarea
                ref={textareaRef}
                className="w-full min-h-[24px] max-h-[280px] bg-transparent text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 focus:border-transparent resize-none"
                placeholder="Beskriv vad du vill bygga…"
                rows={1}
                value={description}
                disabled={isSubmitting}
                onChange={(e) => {
                  setDescription(e.target.value);
                  autoGrow(e.target);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !isSubmitting) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />

              {showReferenceUrlField && (
                <input
                  type="text"
                  className="mt-12 w-full px-12 py-8 text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-gray-400"
                  placeholder="https://exempel.se"
                  value={referenceUrl}
                  disabled={isSubmitting}
                  onChange={(e) => setReferenceUrl(e.target.value)}
                />
              )}

              <div className="mt-16 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowReferenceUrlField((prev) => !prev)}
                  aria-label="Utgå från en befintlig sida"
                  title="Utgå från en befintlig sida"
                  className="flex items-center justify-center w-36 h-36 rounded-full border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <PlusIcon />
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  aria-label="Skapa min sida"
                  className="flex items-center justify-center w-36 h-36 rounded-full bg-indigo-500 hover:bg-indigo-400 disabled:bg-gray-200 disabled:cursor-not-allowed text-white transition-colors"
                >
                  <ArrowRight />
                </button>
              </div>
            </div>

            <div className="mt-20 flex flex-wrap justify-center gap-8">
              {EXAMPLE_PROMPTS.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => {
                    setDescription(example);
                    if (textareaRef.current) {
                      textareaRef.current.value = example;
                      autoGrow(textareaRef.current);
                    }
                  }}
                  className="px-16 py-8 rounded-full border border-gray-200 bg-white/70 text-gray-600 text-sm hover:bg-white hover:border-gray-300 transition-colors text-left"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>

        {user && (
          <div className="pb-64 max-w-4xl mx-auto">
            <ProjectsList />
          </div>
        )}
      </main>

      <style jsx>{`
        .gradient-blob {
          position: absolute;
          left: 50%;
          border-radius: 9999px;
          filter: blur(110px);
        }

        .gradient-blob-blue {
          top: 60px;
          width: 900px;
          height: 700px;
          background: radial-gradient(circle, rgba(91, 124, 250, 0.55) 0%, rgba(91, 124, 250, 0) 70%);
          animation: driftBlue 18s ease-in-out infinite;
        }

        .gradient-blob-violet {
          top: 340px;
          width: 800px;
          height: 700px;
          background: radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, rgba(168, 85, 247, 0) 70%);
          animation: driftViolet 22s ease-in-out infinite;
        }

        .gradient-blob-pink {
          top: 620px;
          width: 1000px;
          height: 700px;
          background: radial-gradient(circle, rgba(236, 72, 153, 0.5) 0%, rgba(236, 72, 153, 0) 70%);
          animation: driftPink 20s ease-in-out infinite;
        }

        @keyframes driftBlue {
          0%,
          100% {
            transform: translate(-50%, 0) scale(1);
          }
          50% {
            transform: translate(-53%, 15px) scale(1.06);
          }
        }

        @keyframes driftViolet {
          0%,
          100% {
            transform: translate(-50%, 0) scale(1);
          }
          50% {
            transform: translate(-47%, -15px) scale(1.08);
          }
        }

        @keyframes driftPink {
          0%,
          100% {
            transform: translate(-50%, 0) scale(1);
          }
          50% {
            transform: translate(-50%, 20px) scale(1.04);
          }
        }
      `}</style>
    </div>
  );
}
