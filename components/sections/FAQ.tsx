"use client";

import { useState } from "react";
import { faqs } from "@/data/faq";

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr]">
      <div>
        <p className="text-sm font-extrabold uppercase tracking-[0.1em] text-(--red)">
          FAQ
        </p>
        <h2 className="text-balance mt-4 font-heading text-5xl font-bold uppercase leading-[0.9] text-[#171719] md:text-6xl">
          Before you make the drive
        </h2>
        <p className="mt-6 max-w-md leading-7 text-[#625f5b]">
          Straight answers about the store, our location, and how the Big Wicks
          team can help.
        </p>
      </div>
      <div className="space-y-3">
        {faqs.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={item.question}
              className="relative overflow-hidden rounded-[7px] border border-[#d5d5d0] bg-white transition-colors hover:border-(--red)"
            >
              <span
                className={`absolute inset-y-0 left-0 w-1 ${isOpen ? "bg-(--red)" : "bg-transparent"}`}
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full cursor-pointer items-start justify-between gap-5 px-6 py-6 text-left"
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${index}`}
              >
                <span className="text-sm font-bold text-[#171719] sm:text-base">
                  {item.question}
                </span>
                <span
                  className={`flex size-8 shrink-0 items-center justify-center text-xl leading-none ${isOpen ? "text-(--red)" : "text-[#171719]"}`}
                  aria-hidden="true"
                >
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              {isOpen && (
                <p
                  id={`faq-answer-${index}`}
                  className="px-6 pb-6 pr-16 leading-7 text-[#625f5b]"
                >
                  {item.answer}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FAQ;
