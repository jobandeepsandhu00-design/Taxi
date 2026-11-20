"use client";

import { useRouter } from "next/navigation";
import { RotateCcw, Search } from "lucide-react";
import { useState } from "react";
import { QuestionCard } from "@/components/quiz/question-card";
import type { ClientQuestion } from "@/components/quiz/types";
import { Button } from "@/components/ui/button";
import { answerSingleQuestionAction } from "@/server/actions/learning";

export function SingleQuestion({ question, bookmarked }: { question: ClientQuestion; bookmarked: boolean }) {
  const router = useRouter();
  const [round, setRound] = useState(0);
  return (
    <QuestionCard
      key={round}
      question={question}
      bookmarked={bookmarked}
      onSubmit={(selectedOptionIds, timeSpentSec, unsure) => answerSingleQuestionAction({ questionId: question.id, selectedOptionIds, timeSpentSec, unsure })}
      onNext={() => router.back()}
      nextSlot={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="lg" onClick={() => setRound((r) => r + 1)}>
            <RotateCcw /> Nochmal
          </Button>
          <Button size="lg" onClick={() => router.push("/fragen")}>
            <Search /> Weitere Fragen
          </Button>
        </div>
      }
    />
  );
}
