import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import type { Memory, MessageChannel, MessageDraft } from "@noyala/domain";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { BackButton, Chip, SectionLabel } from "../components/primitives";
import { Card } from "../components/Card";
import { Sheet } from "../components/Sheet";
import { useToast } from "../components/Toast";
import { getPerson, displayName } from "../data/people";
import { getImportantDate } from "../data/dates";
import { listMemoriesForPerson } from "../data/memories";
import { generateDrafts, recordMessageAction, updateDraftContent } from "../data/messages";
import { buildMailtoUrl, buildSmsUrl, buildWhatsAppUrl } from "../lib/handoff";
import { useAuth } from "../lib/auth";
import { color, spacing } from "../theme";
import type { RootStackScreenProps } from "../navigation/types";
import * as Clipboard from "expo-clipboard";
import { Linking } from "react-native";

const OCCASIONS = ["Birthday", "Anniversary", "Thinking of you", "Just because", "Congratulations"];
const CHANNELS: { value: MessageChannel; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "Text message" },
  { value: "email", label: "Email" },
];

type Step = "context" | "loading" | "drafts" | "error" | "approve" | "done";

export function MessageStudioScreen({ route, navigation }: RootStackScreenProps<"MessageStudio">) {
  const { personId, importantDateId } = route.params;
  const { user } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState<Step>("context");
  const [personName, setPersonName] = useState("");
  const [phone, setPhone] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [includeSensitive, setIncludeSensitive] = useState(false);
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<string[]>([]);
  const [occasion, setOccasion] = useState(OCCASIONS[0]!);
  const [channel, setChannel] = useState<MessageChannel>("whatsapp");
  const [drafts, setDrafts] = useState<MessageDraft[]>([]);
  const [chosen, setChosen] = useState<MessageDraft | null>(null);
  const [content, setContent] = useState("");
  const [approved, setApproved] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [person, memoriesList, date] = await Promise.all([
        getPerson(personId),
        listMemoriesForPerson(personId),
        importantDateId ? getImportantDate(importantDateId) : Promise.resolve(null),
      ]);
      if (person) {
        setPersonName(displayName(person));
        setPhone(person.phone);
        setEmail(person.email);
        setChannel(person.phone ? "whatsapp" : "email");
      }
      setMemories(memoriesList);
      setSelectedMemoryIds(memoriesList.filter((m) => m.sensitivity === "standard").map((m) => m.id));
      if (date) setOccasion(date.label);
    })();
  }, [personId, importantDateId]);

  const standardMemories = memories.filter((m) => m.sensitivity === "standard");
  const sensitiveMemories = memories.filter((m) => m.sensitivity === "sensitive");
  const visibleMemories = includeSensitive ? memories : standardMemories;

  function toggleMemory(id: string) {
    setSelectedMemoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const generate = useCallback(async () => {
    setStep("loading");
    try {
      const result = await generateDrafts({
        personId,
        occasion,
        tone: "short_and_warm",
        channel,
        importantDateId,
        memoryIds: selectedMemoryIds,
      });
      setDrafts(result.drafts);
      setStep("drafts");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Couldn't generate messages right now.");
      setStep("error");
    }
  }, [personId, occasion, channel, importantDateId, selectedMemoryIds]);

  function pickDraft(draft: MessageDraft) {
    setChosen(draft);
    setContent(draft.content ?? "");
    setApproved(false);
    setStep("approve");
  }

  async function saveEdit(next: string) {
    setContent(next);
    if (chosen) await updateDraftContent(chosen.id, next);
  }

  async function openHandoff() {
    setSheetOpen(true);
  }

  async function doHandoff(target: MessageChannel) {
    if (!chosen || !user) return;
    const url =
      target === "whatsapp"
        ? buildWhatsAppUrl(phone, content)
        : target === "sms"
          ? buildSmsUrl(phone, content)
          : buildMailtoUrl(email, `A note for ${personName}`, content);
    await Linking.openURL(url).catch(() => {});
    await recordMessageAction(user.id, personId, { ...chosen, content }, "opened_in_app");
    setSheetOpen(false);
    setStep("done");
  }

  async function copyToClipboard() {
    if (!chosen || !user) return;
    await Clipboard.setStringAsync(content);
    await recordMessageAction(user.id, personId, { ...chosen, content }, "copied");
    toast.show("Copied to your clipboard.");
    setSheetOpen(false);
    setStep("done");
  }

  return (
    <Screen>
      <View style={styles.topRow}>
        <BackButton label="Close" />
        <Text variant="metaStrong">
          {step === "context" ? "Context" : step === "drafts" || step === "loading" ? "Options" : step === "approve" ? "Approve" : ""}
        </Text>
      </View>

      {step === "context" ? (
        <View>
          <Text variant="screenTitle" style={styles.title}>
            Prepare a message
          </Text>
          <Text variant="bodyMuted" style={styles.sub}>
            For {personName || "…"}.
          </Text>

          <SectionLabel>Occasion</SectionLabel>
          <View style={styles.chipRow}>
            {OCCASIONS.map((o) => (
              <Chip key={o} label={o} active={occasion === o} onPress={() => setOccasion(o)} />
            ))}
          </View>

          <SectionLabel>Send as</SectionLabel>
          <View style={styles.chipRow}>
            {CHANNELS.map((c) => (
              <Chip key={c.value} label={c.label} active={channel === c.value} onPress={() => setChannel(c.value)} />
            ))}
          </View>

          <SectionLabel>What will be used</SectionLabel>
          <View style={styles.section}>
            {visibleMemories.length === 0 ? (
              <Text variant="bodyMuted">No memories saved yet — Noyala will write from the occasion alone.</Text>
            ) : (
              visibleMemories.map((m) => (
                <Pressable key={m.id} style={styles.contextRow} onPress={() => toggleMemory(m.id)}>
                  <View style={[styles.checkbox, selectedMemoryIds.includes(m.id) && styles.checkboxOn]}>
                    {selectedMemoryIds.includes(m.id) ? <Text style={styles.checkMark}>✓</Text> : null}
                  </View>
                  <Text variant="body" style={styles.flex1}>
                    {m.content}
                  </Text>
                </Pressable>
              ))
            )}
          </View>

          {sensitiveMemories.length > 0 ? (
            <Card style={styles.sensitiveCard}>
              <Text variant="label" style={styles.sensitiveTitle}>
                Private notes are held back
              </Text>
              <Text variant="meta" style={styles.sensitiveBody}>
                {sensitiveMemories.length} private {sensitiveMemories.length === 1 ? "note" : "notes"} won't be
                used unless you include them for this message only.
              </Text>
              <Button
                label={includeSensitive ? "Excluding private notes" : "Include private notes just this once"}
                variant="secondary"
                fullWidth={false}
                onPress={() => setIncludeSensitive((v) => !v)}
              />
            </Card>
          ) : null}

          <Button label="Write three options" onPress={generate} style={styles.gap} />
          <Button
            label="Write it myself"
            variant="secondary"
            onPress={() => {
              setChosen(null);
              setContent("");
              setApproved(false);
              setStep("approve");
            }}
          />
        </View>
      ) : null}

      {step === "loading" ? (
        <View style={styles.center}>
          <ActivityIndicator color={color.clay} />
          <Text variant="bodyMuted" style={styles.loadingText}>
            Reading {personName}'s notes and writing three options. Around ten seconds.
          </Text>
        </View>
      ) : null}

      {step === "error" ? (
        <View>
          <Text variant="body" style={styles.title}>
            Nothing was written.
          </Text>
          <Text variant="bodyMuted" style={styles.sub}>
            {errorMessage} Your context is untouched, so trying again costs nothing.
          </Text>
          <Button label="Try again" onPress={generate} style={styles.gap} />
          <Button label="Write it myself" variant="secondary" onPress={() => setStep("approve")} />
        </View>
      ) : null}

      {step === "drafts" ? (
        <View>
          {drafts.map((d) => {
            const label = (d.modelMetadata as { optionLabel?: string } | null)?.optionLabel ?? "Option";
            return (
              <Card key={d.id} onPress={() => pickDraft(d)} style={styles.draftCard}>
                <Text variant="eyebrowClay" style={styles.draftLabel}>
                  {label}
                </Text>
                <Text variant="messageBody" style={styles.draftBody}>
                  {d.content}
                </Text>
              </Card>
            );
          })}
          <Button label="Three more options" variant="secondary" onPress={generate} style={styles.gap} />
          <Button label="Write it myself" variant="text" onPress={() => setStep("approve")} />
        </View>
      ) : null}

      {step === "approve" ? (
        <View>
          {chosen ? (
            <Text variant="eyebrowClay" style={styles.chosenLabel}>
              {(chosen.modelMetadata as { optionLabel?: string } | null)?.optionLabel ?? "Your message"}
            </Text>
          ) : null}
          <Field label="Message" hideLabel value={content} onChangeText={saveEdit} multiline numberOfLines={7} serif style={styles.textarea} />
          <Pressable style={styles.approveRow} onPress={() => setApproved((v) => !v)}>
            <View style={[styles.checkbox, approved && styles.checkboxOn]}>{approved ? <Text style={styles.checkMark}>✓</Text> : null}</View>
            <View style={styles.flex1}>
              <Text variant="label">I have read this and I approve it</Text>
              <Text variant="meta" style={styles.approveNote}>
                Noyala will not open any app until this is ticked.
              </Text>
            </View>
          </Pressable>
          <Button label="Hand it off" disabled={!approved || !content.trim()} onPress={openHandoff} style={styles.gap} />
          {drafts.length > 0 ? (
            <Button label="Back to the options" variant="text" onPress={() => setStep("drafts")} />
          ) : null}
        </View>
      ) : null}

      {step === "done" ? (
        <View>
          <Text variant="eyebrowClay" style={styles.doneLabel}>
            Handed off
          </Text>
          <Text variant="messageBody" style={styles.gap}>
            Opening an app is not a send — Noyala recorded what you did, not that it arrived.
          </Text>
          <Button label="Back to the profile" variant="secondary" onPress={() => navigation.navigate("Person", { personId })} style={styles.gap} />
          <Button label="Home" variant="text" onPress={() => navigation.navigate("Tabs")} />
        </View>
      ) : null}

      <Sheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Hand it off yourself"
        description="Opening an app is not a send. Noyala records what you did, never that it arrived."
      >
        <View style={styles.handoffOptions}>
          <Button label="Copy to clipboard" variant="secondary" onPress={copyToClipboard} />
          <Button label="Open WhatsApp" variant="secondary" onPress={() => doHandoff("whatsapp")} />
          <Button label="Open Messages" variant="secondary" onPress={() => doHandoff("sms")} />
          <Button label="Open Email" variant="secondary" onPress={() => doHandoff("email")} />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  title: { marginBottom: 10 },
  sub: { marginBottom: spacing.lg },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: spacing.lg },
  section: { marginBottom: spacing.md },
  contextRow: { flexDirection: "row", gap: 12, alignItems: "flex-start", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: color.hairline },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxOn: { backgroundColor: color.action, borderColor: color.action },
  checkMark: { color: "#fff", fontSize: 13, fontWeight: "700" },
  flex1: { flex: 1 },
  sensitiveCard: { marginBottom: spacing.lg },
  sensitiveTitle: { marginBottom: 6 },
  sensitiveBody: { marginBottom: 14 },
  gap: { marginBottom: spacing.sm },
  center: { alignItems: "flex-start", paddingTop: spacing.xl },
  loadingText: { marginTop: spacing.md },
  draftCard: { marginBottom: spacing.smd },
  draftLabel: { marginBottom: 10 },
  draftBody: { marginBottom: 0 },
  chosenLabel: { marginBottom: 10 },
  textarea: { minHeight: 150, textAlignVertical: "top", marginBottom: spacing.sm },
  approveRow: { flexDirection: "row", gap: 12, alignItems: "flex-start", marginBottom: spacing.lg },
  approveNote: { marginTop: 4 },
  doneLabel: { marginBottom: 12 },
  handoffOptions: { gap: 6 },
});
