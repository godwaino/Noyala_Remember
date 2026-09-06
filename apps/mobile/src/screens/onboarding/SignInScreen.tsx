import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { StaticScreen } from "../../components/Screen";
import { Text } from "../../components/Text";
import { Button } from "../../components/Button";
import { Field } from "../../components/Field";
import { BackButton } from "../../components/primitives";
import { useAuth } from "../../lib/auth";
import { spacing } from "../../theme";
import type { AuthStackScreenProps } from "../../navigation/types";

/** Email, then a typed 6-digit code — never a clickable link, per
 * docs/decisions/0009-otp-code-sign-in.md (a link-scanning email client can
 * silently consume a magic link before the real user clicks it; a code
 * they type themselves can't be intercepted that way). */
export function SignInScreen({ navigation }: AuthStackScreenProps<"SignIn">) {
  const { requestCode, verifyCode } = useAuth();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    setError(null);
    setBusy(true);
    try {
      await requestCode(email.trim());
      setStep("code");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send a code.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode() {
    setError(null);
    setBusy(true);
    try {
      await verifyCode(email.trim(), code.trim());
      // RootNavigator reacts to the new session automatically.
    } catch (e) {
      setError("That code has expired. A fresh one is on its way.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <StaticScreen>
      <BackButton onPress={() => (step === "code" ? setStep("email") : navigation.goBack())} />
      {step === "email" ? (
        <View>
          <Text variant="screenTitle" style={styles.title}>
            What's your email?
          </Text>
          <Text variant="bodyMuted" style={styles.sub}>
            No password to keep — Noyala sends a six-digit code instead.
          </Text>
          <Field
            label="Email"
            hideLabel
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            error={error}
          />
          <Button label={busy ? "Sending…" : "Send code"} onPress={sendCode} disabled={busy || !email.includes("@")} />
        </View>
      ) : (
        <View>
          <Text variant="screenTitle" style={styles.title}>
            Enter your code
          </Text>
          <Text variant="bodyMuted" style={styles.sub}>
            Six digits, sent to {email}. No password to keep.
          </Text>
          <Field
            label="Code"
            hideLabel
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            keyboardType="number-pad"
            maxLength={6}
            error={error}
          />
          <Button label={busy ? "Checking…" : "Continue"} onPress={confirmCode} disabled={busy || code.length < 6} />
          <Button label="Send another code" variant="text" onPress={sendCode} style={styles.resend} />
        </View>
      )}
    </StaticScreen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 10 },
  sub: { marginBottom: spacing.lg },
  resend: { marginTop: spacing.sm },
});
