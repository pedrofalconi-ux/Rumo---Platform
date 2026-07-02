import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";

type Mode = "login" | "register";

export function AuthScreen() {
  const theme = useTheme();
  const { signIn, signUp, authBusy, error, clearError } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    emailConfirm: "",
    phone: "",
    password: "",
    inviteToken: "",
  });

  const updateField = (key: keyof typeof form, value: string) => {
    clearError();
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (mode === "login") {
      await signIn(form.email.trim(), form.password);
      return;
    }

    await signUp({
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      emailConfirm: form.emailConfirm.trim(),
      phone: form.phone.trim(),
      password: form.password,
      inviteToken: form.inviteToken.trim(),
    });
  };

  const isRegister = mode === "register";

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.brandBlock}>
              <ThemedText style={styles.eyebrow}>RUMO</ThemedText>
              <ThemedText style={styles.title} type="title">
                Área do viajante
              </ThemedText>
              <ThemedText style={styles.subtitle} themeColor="textSecondary">
                Acesse suas trilhas de viagem, documentos e convites no celular.
              </ThemedText>
            </View>

            <ThemedView
              style={[
                styles.card,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
              ]}
            >
              <View style={styles.modeRow}>
                <Pressable
                  onPress={() => setMode("login")}
                  style={[
                    styles.modeButton,
                    { backgroundColor: mode === "login" ? "#004782" : "transparent" },
                  ]}
                >
                  <ThemedText style={[styles.modeText, mode === "login" && styles.modeTextActive]}>
                    Entrar
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setMode("register")}
                  style={[
                    styles.modeButton,
                    { backgroundColor: mode === "register" ? "#004782" : "transparent" },
                  ]}
                >
                  <ThemedText style={[styles.modeText, mode === "register" && styles.modeTextActive]}>
                    Criar conta
                  </ThemedText>
                </Pressable>
              </View>

              {isRegister && (
                <Field
                  label="Nome completo"
                  value={form.fullName}
                  onChangeText={(value) => updateField("fullName", value)}
                  theme={theme}
                />
              )}

              <Field
                label="E-mail"
                value={form.email}
                onChangeText={(value) => updateField("email", value)}
                theme={theme}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {isRegister && (
                <Field
                  label="Confirmar e-mail"
                  value={form.emailConfirm}
                  onChangeText={(value) => updateField("emailConfirm", value)}
                  theme={theme}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              )}

              {isRegister && (
                <Field
                  label="Telefone"
                  value={form.phone}
                  onChangeText={(value) => updateField("phone", value)}
                  theme={theme}
                  keyboardType="phone-pad"
                />
              )}

              {isRegister && (
                <Field
                  label="Convite da agência"
                  value={form.inviteToken}
                  onChangeText={(value) => updateField("inviteToken", value)}
                  theme={theme}
                  placeholder="Cole o link ou código do convite"
                  autoCapitalize="none"
                />
              )}

              <Field
                label="Senha"
                value={form.password}
                onChangeText={(value) => updateField("password", value)}
                theme={theme}
                secureTextEntry
              />

              {error ? (
                <View style={styles.errorBox}>
                  <ThemedText style={styles.errorText}>{error}</ThemedText>
                </View>
              ) : null}

              <Pressable
                onPress={handleSubmit}
                disabled={authBusy}
                style={({ pressed }) => [
                  styles.submitButton,
                  { opacity: authBusy ? 0.7 : pressed ? 0.92 : 1 },
                ]}
              >
                {authBusy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.submitText}>
                    {isRegister ? "Criar conta e importar viagem" : "Entrar na minha conta"}
                  </ThemedText>
                )}
              </Pressable>

              <ThemedText style={styles.hintText} themeColor="textSecondary">
                {isRegister
                  ? "Use o convite enviado pela sua agência para liberar a primeira viagem."
                  : "Se você ainda não tem conta, peça o convite da sua agência e crie seu acesso."}
              </ThemedText>
            </ThemedView>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Field({
  label,
  theme,
  ...props
}: {
  label: string;
  theme: ReturnType<typeof useTheme>;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.fieldBlock}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <TextInput
        {...props}
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          {
            backgroundColor: theme.background,
            color: theme.text,
            borderColor: theme.backgroundSelected,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    width: "100%",
    alignSelf: "center",
    maxWidth: MaxContentWidth,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
    gap: Spacing.four,
  },
  brandBlock: {
    gap: Spacing.two,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "900",
    color: "#004782",
    letterSpacing: 2,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modeRow: {
    flexDirection: "row",
    backgroundColor: "#E9EEF4",
    borderRadius: 999,
    padding: 4,
    marginBottom: Spacing.one,
  },
  modeButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
  },
  modeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#004782",
  },
  modeTextActive: {
    color: "#fff",
  },
  fieldBlock: {
    gap: Spacing.one,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
  },
  errorBox: {
    backgroundColor: "#FBEAF0",
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: "#8A1C4A",
    fontSize: 13,
    fontWeight: "700",
  },
  submitButton: {
    marginTop: Spacing.one,
    backgroundColor: "#004782",
    borderRadius: 14,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  submitText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  hintText: {
    fontSize: 12,
    lineHeight: 18,
  },
});

