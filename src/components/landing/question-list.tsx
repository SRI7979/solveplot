import { Plus } from "lucide-react";

type Question = { id: string; question: string; answer: string };

export function QuestionList({ questions }: { questions: readonly Question[] }) {
  return <div className="faq-questions">{questions.map(item => (
    <details key={item.id} id={item.id}>
      <summary><span>{item.question}</span><Plus size={18} aria-hidden="true" /></summary>
      <p>{item.answer}</p>
    </details>
  ))}</div>;
}
