"use client";

import { useState, useCallback } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSection {
  title: string;
  items: FaqItem[];
}

interface FaqAccordionProps {
  sections: FaqSection[];
}

function AccordionItem({
  item,
  isOpen,
  onToggle,
  id,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
  id: string;
}) {
  return (
    <div className="border-b border-gray-700 last:border-b-0">
      <h3>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-4 py-5 px-1 text-left text-white font-medium hover:text-teal-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-sm"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={`faq-answer-${id}`}
          id={`faq-question-${id}`}
        >
          <span className="text-sm sm:text-base">{item.question}</span>
          <svg
            className={`w-5 h-5 flex-shrink-0 text-gray-400 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </h3>
      <div
        id={`faq-answer-${id}`}
        role="region"
        aria-labelledby={`faq-question-${id}`}
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? "max-h-96 pb-5" : "max-h-0"
        }`}
      >
        <p className="text-sm text-gray-400 leading-relaxed px-1">
          {item.answer}
        </p>
      </div>
    </div>
  );
}

export function FaqAccordion({ sections }: FaqAccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = useCallback((id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <div className="space-y-12">
      {sections.map((section, sectionIndex) => (
        <div key={section.title}>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-6">
            {section.title}
          </h2>
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 px-6">
            {section.items.map((item, itemIndex) => {
              const id = `${sectionIndex}-${itemIndex}`;
              return (
                <AccordionItem
                  key={id}
                  item={item}
                  isOpen={openItems.has(id)}
                  onToggle={() => toggleItem(id)}
                  id={id}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
