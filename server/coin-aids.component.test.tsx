// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuestionScreen } from "../client/src/components/GameShell";

afterEach(() => {
  document.body.innerHTML = "";
});

const question = {
  id: "component-coin-test",
  category: "جمع سريع",
  difficulty: "سهل" as const,
  question: "كم يساوي 1 + 1؟",
  options: ["1", "2", "3", "4"] as [string, string, string, string],
  correctIndex: 1,
};

function renderQuestion(overrides: Partial<React.ComponentProps<typeof QuestionScreen>> = {}) {
  const props: React.ComponentProps<typeof QuestionScreen> = {
    question,
    questionNumber: 1,
    level: "سهل",
    timeLeft: 25,
    streak: 0,
    answeredIndex: null,
    eliminatedOptions: [],
    hintStatus: "ready",
    coins: 50,
    coinMessage: null,
    coinAdStatus: "ready",
    onWatchCoins: vi.fn(),
    onAnswer: vi.fn(),
    onHint: vi.fn(),
    onCoinEliminate: vi.fn(),
    onBuyTime: vi.fn(),
    onNext: vi.fn(),
    mode: "standard",
    ...overrides,
  };
  return { ...render(<QuestionScreen {...props} />), props };
}

describe("Coin aids in QuestionScreen", () => {
  it("routes the watch-video button to the coin ad handler", () => {
    const { props } = renderQuestion();
    fireEvent.click(screen.getByRole("button", { name: /شاهد فيديو واكسب 25 عملة/ }));
    expect(props.onWatchCoins).toHaveBeenCalledTimes(1);
  });

  it("routes both coin aid purchases to their handlers", () => {
    const { props } = renderQuestion({ coins: 100 });
    fireEvent.click(screen.getByRole("button", { name: /حذف إجابتين/ }));
    fireEvent.click(screen.getByRole("button", { name: /\+10 ثواني/ }));
    expect(props.onCoinEliminate).toHaveBeenCalledTimes(1);
    expect(props.onBuyTime).toHaveBeenCalledTimes(1);
  });

  it("does not expose coin purchases after the question is answered", () => {
    renderQuestion({ answeredIndex: 1 });
    expect(screen.queryByRole("button", { name: /حذف إجابتين/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /\+10 ثواني/ })).toBeNull();
  });
});

