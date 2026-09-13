"use client";

import { useState } from "react";
import type { ProjectPlan } from "@/types/plan";

interface PlanCardProps {
  plan: ProjectPlan;
  status: 'pending' | 'revising' | 'approved';
  onApprove: () => void;
  onRevise: (feedback: string) => void;
}

export default function PlanCard({ plan, status, onApprove, onRevise }: PlanCardProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');

  const busy = status === 'revising';

  const submitFeedback = () => {
    const text = feedback.trim();
    if (!text || busy) return;
    onRevise(text);
    setFeedback('');
    setShowFeedback(false);
  };

  return (
    <div className="mt-3 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl overflow-hidden max-w-[500px] shadow-sm">
      <div className="bg-[#36322F] px-16 py-12 flex items-center justify-between">
        <div className="text-sm font-semibold text-white">Byggplan</div>
        {status === 'approved' && (
          <div className="text-xs text-green-300">Godkänd</div>
        )}
      </div>

      <div className="p-16">
        <p className="text-sm text-gray-700 mb-16">{plan.summary}</p>

        {plan.sections?.length > 0 && (
          <div className="mb-16">
            <div className="text-sm font-semibold text-gray-900 mb-8">Sektioner</div>
            <ul className="flex flex-col gap-6">
              {plan.sections.map((section, i) => (
                <li key={i} className="flex items-start gap-8 text-sm text-gray-700">
                  <span className="mt-1 w-12 h-12 rounded-sm border border-gray-400 flex-shrink-0" />
                  <span>
                    <span className="font-medium text-gray-900">{section.name}</span>
                    {section.description ? ` — ${section.description}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {plan.components?.length > 0 && (
          <div className="mb-16">
            <div className="text-sm font-semibold text-gray-900 mb-8">
              Komponenter ({plan.components.length})
            </div>
            <ul className="flex flex-col gap-6">
              {plan.components.map((component, i) => (
                <li key={i} className="flex items-start gap-8 text-sm text-gray-700">
                  <span className="mt-1 w-12 h-12 rounded-sm border border-gray-400 flex-shrink-0" />
                  <span>
                    <span className="font-mono text-xs text-gray-900">{component.name}</span>
                    {component.description ? ` — ${component.description}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {plan.theme?.colors?.length > 0 && (
          <div className="mb-16">
            <div className="text-sm font-semibold text-gray-900 mb-8">Tema</div>
            <div className="flex items-center gap-8 flex-wrap">
              {plan.theme.colors.map((color, i) => (
                <div
                  key={i}
                  className="w-24 h-24 rounded border border-gray-300"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
              <span className="text-xs text-gray-600">
                {[plan.theme.mood, plan.theme.typography].filter(Boolean).join(' · ')}
              </span>
            </div>
          </div>
        )}

        {plan.packages?.length > 0 && (
          <div className="mb-16">
            <div className="text-sm font-semibold text-gray-900 mb-8">Paket</div>
            <div className="flex flex-wrap gap-6">
              {plan.packages.map((pkg, i) => (
                <span
                  key={i}
                  className="px-8 py-2 bg-gray-100 border border-gray-200 rounded text-xs font-mono text-gray-700"
                >
                  {pkg}
                </span>
              ))}
            </div>
          </div>
        )}

        {plan.questions?.length > 0 && (
          <div className="mb-16">
            <div className="text-sm font-semibold text-gray-900 mb-8">Öppna frågor</div>
            <ul className="list-disc pl-16 flex flex-col gap-4">
              {plan.questions.map((question, i) => (
                <li key={i} className="text-sm text-gray-700">{question}</li>
              ))}
            </ul>
            <p className="mt-8 text-xs text-gray-500">
              Svara genom att trycka “Ändra” och skriva.
            </p>
          </div>
        )}

        {status !== 'approved' && (
          <div className="flex flex-col gap-8">
            {showFeedback && (
              <div className="flex flex-col gap-6">
                <textarea
                  autoFocus
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submitFeedback();
                    }
                  }}
                  placeholder="Vad ska ändras i planen?"
                  rows={2}
                  className="w-full text-sm p-8 border border-gray-300 rounded-lg outline-none focus:border-gray-500 resize-none"
                />
                <div className="flex gap-8">
                  <button
                    onClick={submitFeedback}
                    disabled={!feedback.trim() || busy}
                    className="px-12 py-6 rounded-lg bg-[#36322F] text-white text-sm font-medium disabled:opacity-40"
                  >
                    Uppdatera planen
                  </button>
                  <button
                    onClick={() => setShowFeedback(false)}
                    className="px-12 py-6 rounded-lg border border-gray-300 text-gray-700 text-sm"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            )}

            {!showFeedback && (
              <div className="flex gap-8">
                <button
                  onClick={onApprove}
                  disabled={busy}
                  className="px-12 py-6 rounded-lg bg-[#36322F] text-white text-sm font-medium disabled:opacity-40"
                >
                  Godkänn &amp; bygg
                </button>
                <button
                  onClick={() => setShowFeedback(true)}
                  disabled={busy}
                  className="px-12 py-6 rounded-lg border border-gray-300 text-gray-700 text-sm disabled:opacity-40"
                >
                  Ändra
                </button>
              </div>
            )}

            {busy && (
              <div className="text-xs text-gray-500">Uppdaterar planen…</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
