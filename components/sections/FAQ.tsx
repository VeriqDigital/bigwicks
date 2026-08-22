"use client";

import { useState } from "react";
import { faqs } from "@/data/faq";

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-(--accent)">
          FAQ
        </p>
        <h2 className="mt-4 font-heading text-4xl font-black uppercase text-white md:text-6xl">
          Freight questions, straight answers
        </h2>
      </div>
      <div className="grid items-start gap-5 md:grid-cols-2">
        {faqs.map((item, index) => {
          const isOpen = openIndex === index;

          return (
            <button
              key={item.question}
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="w-full self-start cursor-pointer text-left"
              aria-expanded={isOpen}
              aria-controls={`faq-answer-${index}`}
            >
              <div className="w-full border border-[#393939] bg-[#202020] p-6 transition hover:border-[#686868]">
                <div className="flex items-start justify-between gap-4">
                  <span className="font-heading text-sm font-black uppercase tracking-[0.16em] text-white">
                    {item.question}
                  </span>
                  <span className="text-xl leading-none text-(--accent)">
                    {isOpen ? "−" : "+"}
                  </span>
                </div>
                {isOpen && (
                  <p id={`faq-answer-${index}`} className="pt-5 leading-7 text-[#aaa]">
                    {item.answer}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FAQ;
