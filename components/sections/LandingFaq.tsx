export default function LandingFaq({ title, items }: {
  title: string;
  items: readonly { question: string; answer: string }[];
}) {
  return (
    <section className="public-container landing-faq">
      <div><p className="public-kicker">Questions, answered</p><h2 className="public-title">{title}</h2></div>
      <div>
        {items.map(({ question, answer }) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
