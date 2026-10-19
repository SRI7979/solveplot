"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  ChartNoAxesCombined,
  History,
  Search,
} from "lucide-react";
import type { ProblemSummary } from "@/lib/problem-history";
import { METHOD_LABELS } from "@/lib/method-labels";
import MathText from "@/components/math-text";
import styles from "@/components/library-ui.module.css";

export default function HistoryList({
  problems,
}: {
  problems: ProblemSummary[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "solved" | "attention">("all");
  const matching = problems.filter(
    (problem) =>
      (filter === "all" ||
        (filter === "solved"
          ? problem.status === "solved"
          : problem.status !== "solved")) &&
      `${problem.question} ${problem.trick ?? ""} ${problem.answer}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );
  return (
    <>
      <div className={styles.toolbar}>
        <div
          className={`${styles.filters} segmentedControl`}
          role="group"
          aria-label="Filter history"
        >
          <button
            type="button"
            className="choiceControl"
            aria-pressed={filter === "all"}
            onClick={() => setFilter("all")}
          >
            All problems <span>{problems.length}</span>
          </button>
          <button
            type="button"
            className="choiceControl"
            aria-pressed={filter === "solved"}
            onClick={() => setFilter("solved")}
          >
            Solved
          </button>
          {problems.some((p) => p.status !== "solved") && (
            <button
              type="button"
              className="choiceControl"
              aria-pressed={filter === "attention"}
              onClick={() => setFilter("attention")}
            >
              Needs attention
            </button>
          )}
        </div>
        <label className={styles.search}>
          <Search size={17} />
          <input
            type="search"
            aria-label="Search this page of history"
            placeholder="Search this page"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      {matching.length ? (
        <ul className={styles.list}>
          {matching.map((problem) => (
            <li key={problem.id}>
              <Link href={`/history/${problem.id}`} className={styles.problem}>
                <div className={styles.row}>
                  <span className={styles.rowIcon}>
                    <ChartNoAxesCombined size={20} />
                  </span>
                  <div className={styles.rowContent}>
                    <div className={styles.rowHeading}>
                      <h2>
                        {problem.status === "solved"
                          ? problem.trick || METHOD_LABELS[problem.method]
                          : "Check your upload"}
                      </h2>
                      <time dateTime={problem.created_at}>
                        {new Date(problem.created_at).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            timeZone: "UTC",
                          },
                        )}
                      </time>
                    </div>
                    <p className={styles.excerpt}>
                      <MathText>
                        {problem.question || "This upload needs another look."}
                      </MathText>
                    </p>
                  </div>
                </div>
                <div className={styles.rowFooter}>
                  <span className={styles.answer}>
                    {problem.status === "solved" ? (
                      <>
                        <Check size={13} /> Answer{" "}
                        <strong>
                          <MathText>{problem.answer}</MathText>
                        </strong>
                      </>
                    ) : (
                      "Needs attention"
                    )}
                  </span>
                  <span className={styles.open}>
                    View solution <ArrowRight size={15} />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.empty} role="status">
          <History size={28} />
          <h2>No matching problems</h2>
          <p>Try a different search or filter.</p>
          <button
            type="button"
            className="secondaryButton"
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </>
  );
}
