"use client";

import { useState } from "react";
import { faqs } from "@/data/faq";

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="grid gap-7 lg:grid-cols-[0.7fr_1.3fr] lg:gap-14">
      <div>
        <p className="text-sm font-extrabold uppercase tracking-widest text-(--red)">
          FAQ
        </p>
        <h2 className="text-balance mt-4 max-w-sm font-heading text-4xl font-bold uppercase leading-none text-[#171719] md:text-5xl">
          Before you make the drive
        </h2>
        <p className="mt-5 max-w-sm leading-7 text-[#625f5b]">
          A few things to know before you stop in.
        </p>
      </div>
      <div className="border-t border-[#bfbfb9]">
        {faqs.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={item.question}
              className="relative border-b border-[#cfcfc8]"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full cursor-pointer items-center justify-between gap-5 py-4 text-left hover:text-(--red)"
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
              <p
                id={`faq-answer-${index}`}
                hidden={!isOpen}
                className="pb-5 pr-10 text-[15px] leading-7 text-[#625f5b]"
              >
                {item.answer}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FAQ;
