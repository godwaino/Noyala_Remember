"use client";

import { useActionState, useMemo, useState } from "react";
import {
  PERSON_IMPORT_FIELDS,
  buildCandidatesFromCsvRows,
  findDuplicateMatches,
  guessFieldMapping,
  parseCsv,
  parseVCardCollection,
  validateCandidate,
  type DuplicateMatch,
  type ExistingPersonLite,
  type PersonImportCandidate,
  type PersonImportField,
} from "@noyala/domain";
import { confirmImport, type ImportFormState } from "@/server/import/actions";
import { createBrowserContactPicker } from "./browser-contact-picker";

const initialState: ImportFormState = { status: "idle" };

const FIELD_LABELS: Record<PersonImportField, string> = {
  firstName: "First name",
  lastName: "Last name",
  nickname: "Nickname",
  relationshipType: "Relationship",
  phone: "Phone",
  email: "Email",
  pronouns: "Pronouns",
  notes: "Notes",
  birthday: "Birthday",
  ignore: "Don't import",
};

type Step = "upload" | "mapping" | "preview";

function candidateLabel(c: PersonImportCandidate): string {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || "(no name)";
}

export function ImportWizard({ existingPeople }: { existingPeople: ExistingPersonLite[] }) {
  const [state, formAction, isPending] = useActionState(confirmImport, initialState);
  const [step, setStep] = useState<Step>("upload");
  const [parseError, setParseError] = useState<string | null>(null);

  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, PersonImportField>>({});

  const [candidates, setCandidates] = useState<PersonImportCandidate[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const duplicates = useMemo(
    () => findDuplicateMatches(candidates, existingPeople),
    [candidates, existingPeople],
  );
  const duplicateByIndex = useMemo(() => {
    const map = new Map<number, DuplicateMatch>();
    for (const d of duplicates) map.set(d.candidateIndex, d);
    return map;
  }, [duplicates]);

  const contactPicker = useMemo(() => createBrowserContactPicker(), []);

  function startPreview(built: PersonImportCandidate[]) {
    const matches = findDuplicateMatches(built, existingPeople);
    const duplicateIndexes = new Set(matches.map((m) => m.candidateIndex));
    const initiallySelected = new Set<number>();
    built.forEach((c, i) => {
      if (validateCandidate(c).valid && !duplicateIndexes.has(i)) initiallySelected.add(i);
    });
    setCandidates(built);
    setSelected(initiallySelected);
    setStep("preview");
  }

  async function handleFile(file: File) {
    setParseError(null);
    const text = await file.text();
    const looksLikeVCard = /^\s*BEGIN:VCARD/i.test(text) || file.name.toLowerCase().endsWith(".vcf");

    if (looksLikeVCard) {
      const built = parseVCardCollection(text);
      if (built.length === 0) {
        setParseError("Couldn't find any contacts in that file.");
        return;
      }
      startPreview(built);
      return;
    }

    const { headers: parsedHeaders, rows } = parseCsv(text);
    if (parsedHeaders.length === 0 || rows.length === 0) {
      setParseError("Couldn't read that as a CSV file.");
      return;
    }
    setHeaders(parsedHeaders);
    setRawRows(rows);
    setMapping(guessFieldMapping(parsedHeaders));
    setStep("mapping");
  }

  async function handleDevicePicker() {
    setParseError(null);
    try {
      const picked = await contactPicker.pickContacts();
      if (picked.length === 0) {
        setParseError("No contacts were selected.");
        return;
      }
      startPreview(picked);
    } catch {
      setParseError("Couldn't read contacts from this device.");
    }
  }

  function toggleSelected(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  const selectedCandidates = candidates.filter((_, i) => selected.has(i));

  if (step === "upload") {
    return (
      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="import-file" className="text-sm font-medium">
            Upload a CSV or vCard (.vcf) file
          </label>
          <input
            id="import-file"
            type="file"
            accept=".csv,.vcf,text/csv,text/vcard"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
            className="text-sm"
          />
        </div>

        {contactPicker.isAvailable() ? (
          <div>
            <p className="text-ink-muted text-sm">or</p>
            <button
              type="button"
              onClick={() => void handleDevicePicker()}
              className="border-border mt-2 rounded-md border px-3 py-1.5 text-sm font-medium"
            >
              Import from this device&apos;s contacts
            </button>
          </div>
        ) : null}

        {parseError ? (
          <p role="alert" className="text-danger text-sm">
            {parseError}
          </p>
        ) : null}
      </div>
    );
  }

  if (step === "mapping") {
    return (
      <div className="mt-6 flex flex-col gap-4">
        <p className="text-ink-muted text-sm">
          Match each column in your file to a field. Columns set to &ldquo;Don&apos;t import&rdquo; are
          skipped.
        </p>
        <div className="border-border divide-border divide-y rounded-lg border">
          {headers.map((header, index) => (
            <div key={index} className="flex items-center justify-between gap-4 p-3">
              <span className="text-ink text-sm font-medium">{header || `Column ${index + 1}`}</span>
              <select
                value={mapping[index] ?? "ignore"}
                onChange={(e) =>
                  setMapping((prev) => ({ ...prev, [index]: e.target.value as PersonImportField }))
                }
                className="border-border rounded-md border px-2 py-1 text-sm"
              >
                {PERSON_IMPORT_FIELDS.map((field) => (
                  <option key={field} value={field}>
                    {FIELD_LABELS[field]}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => startPreview(buildCandidatesFromCsvRows(rawRows, mapping))}
            className="bg-primary text-surface rounded-md px-4 py-2 text-sm font-medium"
          >
            Continue
          </button>
          <button
            type="button"
            onClick={() => setStep("upload")}
            className="border-border rounded-md border px-4 py-2 text-sm font-medium"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // step === "preview"
  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="candidates" value={JSON.stringify(selectedCandidates)} />
      <p className="text-ink-muted text-sm">
        {selected.size} of {candidates.length} selected. Possible duplicates and invalid rows start
        unchecked — this only ever creates new people, it never changes an existing one.
      </p>
      <div className="border-border divide-border divide-y rounded-lg border">
        {candidates.map((candidate, index) => {
          const validation = validateCandidate(candidate);
          const duplicate = duplicateByIndex.get(index);
          return (
            <label key={index} className="flex items-start gap-3 p-3 text-sm">
              <input
                type="checkbox"
                checked={selected.has(index)}
                disabled={!validation.valid}
                onChange={() => toggleSelected(index)}
                className="mt-1"
              />
              <span className="flex-1">
                <span className="text-ink font-medium">{candidateLabel(candidate)}</span>
                <span className="text-ink-muted ml-2">
                  {[candidate.email, candidate.phone].filter(Boolean).join(" · ")}
                </span>
                {!validation.valid ? (
                  <span className="text-danger ml-2">({validation.error})</span>
                ) : duplicate ? (
                  <span className="ml-2 text-amber-600">
                    (possible duplicate of {duplicate.existingPersonName})
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending || selectedCandidates.length === 0}
          className="bg-primary text-surface rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {isPending ? "Importing…" : `Import ${selectedCandidates.length} selected`}
        </button>
        <button
          type="button"
          onClick={() => setStep("upload")}
          className="border-border rounded-md border px-4 py-2 text-sm font-medium"
        >
          Start over
        </button>
      </div>
      {state.status === "error" && state.message ? (
        <p role="alert" className="text-danger text-sm">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
