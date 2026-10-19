"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import MathExpression from "@/components/math-expression";
import {
  Copy,
  Check,
  Bookmark,
  Search,
  Trash2,
  ChevronDown,
  Calculator,
  ArrowUpRight,
} from "lucide-react";
import type { DesmosExpression } from "@/lib/solver-schema";
import MathText from "@/components/math-text";
import styles from "@/components/library-ui.module.css";

export type SavedTrickItem = {
  id: string;
  techniqueName: string;
  structure: string | null;
  question: string;
  answer: string;
  selection: string | null;
  problemId: string | null;
  expressions: DesmosExpression[];
};

export default function SavedTricks({
  initial,
}: {
  initial: SavedTrickItem[];
}) {
  const [tricks, setTricks] = useState(initial);
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
    },
    [],
  );
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const matching = tricks.filter((trick) =>
    `${trick.techniqueName} ${trick.structure ?? ""} ${trick.question}`
      .toLowerCase()
      .includes(query.toLowerCase().trim()),
  );

  async function remove(id: string) {
    setRemoving(id);
    setError(null);
    try {
      const response = await fetch("/api/tricks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok && response.status !== 404)
        throw new Error("request failed");
      setTricks((current) => current.filter((trick) => trick.id !== id));
    } catch {
      setError("That trick could not be removed, please try again");
    } finally {
      setRemoving(null);
    }
  }

  if (tricks.length === 0) {
    return (
      <div className={styles.empty} data-testid="saved-tricks">
        <h2>No saved tricks yet</h2>
        <p>Use Save this trick on a solution to keep its technique here</p>
        <Bookmark size={30} />
        <Link href="/solve" className="secondaryButton">
          Solve a question
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className={styles.toolbar}>
        <p
          className={styles.count}
          data-testid="saved-tricks"
          aria-live="polite"
        >
          {tricks.length} {tricks.length === 1 ? "trick" : "tricks"} saved
        </p>
        <label className={styles.search}>
          <Search size={17} />
          <input
            type="search"
            aria-label="Search saved tricks"
            placeholder="Search your tricks"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <ul className={styles.list}>
        {matching.map((trick) => (
          <li key={trick.id} data-trick-id={trick.id} className={styles.trick}>
            <div className={styles.row}>
              <span className={styles.rowIcon}>
                <Bookmark size={20} />
              </span>
              <div className={styles.rowContent}>
                <div className={styles.rowHeading}>
                  <h2>{trick.techniqueName}</h2>
                  <button
                    type="button"
                    className={`${styles.remove} iconControl dangerControl`}
                    onClick={() => remove(trick.id)}
                    disabled={removing !== null}
                    aria-label={`Remove saved trick ${trick.techniqueName}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className={styles.excerpt}>
                  <MathText>{trick.structure || trick.question}</MathText>
                </p>
                {trick.selection && (
                  <blockquote className={styles.selection}>
                    <MathText>{trick.selection}</MathText>
                  </blockquote>
                )}
              </div>
            </div>
            <details className={styles.details}>
              <summary className="disclosureControl">
                <Calculator size={15} />
                <span className={styles.detailsLabel}>
                  Review trick
                  {trick.expressions.length > 0 &&
                    ` · ${trick.expressions.length} ${trick.expressions.length === 1 ? "line" : "lines"}`}
                </span>
                <ChevronDown size={15} />
              </summary>
              <p>
                <MathText>{trick.question}</MathText>
              </p>
              <ol className={styles.entries}>
                {trick.expressions.map((expression, index) => (
                  <li key={index}>
                    <div>
                      <MathExpression latex={expression.latex} />
                    </div>
                    <button
                      type="button"
                      className="copyButton"
                      aria-label={`Copy saved line ${index + 1} from ${trick.techniqueName}`}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(expression.latex);
                          setCopied(`${trick.id}:${index}`);
                          setCopyError(false);
                        } catch {
                          setCopied(null);
                          setCopyError(true);
                        } finally {
                          if (copyTimeout.current)
                            clearTimeout(copyTimeout.current);
                          copyTimeout.current = setTimeout(() => {
                            setCopied(null);
                            setCopyError(false);
                          }, 2500);
                        }
                      }}
                    >
                      {copied === `${trick.id}:${index}` ? (
                        <Check size={14} />
                      ) : (
                        <Copy size={14} />
                      )}
                      {copied === `${trick.id}:${index}` ? "Copied" : "Copy"}
                    </button>
                  </li>
                ))}
              </ol>
              {copyError && (
                <p role="status">Select the expression to copy it.</p>
              )}
            </details>
            <div className={styles.rowFooter}>
              <span className={styles.answer}>
                Answer{" "}
                <strong>
                  <MathText>{trick.answer}</MathText>
                </strong>
              </span>
              {trick.problemId && (
                <Link
                  href={`/history/${trick.problemId}`}
                  className="outlinedControl"
                >
                  View solution <ArrowUpRight size={14} />
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
      {matching.length === 0 && (
        <div className={styles.empty} role="status">
          <Search size={28} />
          <h2>No matching tricks</h2>
          <p>Try another search.</p>
          <button
            type="button"
            className="secondaryButton"
            onClick={() => setQuery("")}
          >
            Clear search
          </button>
        </div>
      )}
    </>
  );
}
