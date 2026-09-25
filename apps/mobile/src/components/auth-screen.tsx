import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/hooks/use-auth";

type Mode = "login" | "invite";
const ONBOARDING_KEY = "rumo.traveler.onboarding.v1";

const BLUE = "#073BCE";
const BLUE_DEEP = "#061D59";
const CORAL = "#FF6542";
const INK = "#14213D";
const MUTED = "#68728A";

export function AuthScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const { signIn, signUp, authBusy, error, clearError } = useAuth();
  const [mode, setMode] = useState<Mode>("invite");
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);
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
    setForm((current) => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    async function loadOnboarding() {
      try {
        const value = Platform.OS === "web"
          ? (typeof window === "undefined" ? null : window.localStorage.getItem(ONBOARDING_KEY))
          : await SecureStore.getItemAsync(ONBOARDING_KEY);
        setOnboardingComplete(value === "done");
      } catch {
        setOnboardingComplete(false);
      }
    }
    void loadOnboarding();
  }, []);

  const finishOnboarding = async () => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") window.localStorage.setItem(ONBOARDING_KEY, "done");
    } else {
      await SecureStore.setItemAsync(ONBOARDING_KEY, "done");
    }
    setOnboardingComplete(true);
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

  const isInvite = mode === "invite";

  if (onboardingComplete === null) {
    return <View style={styles.onboardingLoading}><ActivityIndicator size="large" color={CORAL} /></View>;
  }

  if (!onboardingComplete) {
    return <Onboarding onComplete={finishOnboarding} />;
  }

  return (
    <View style={styles.page}>
      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            contentContainerStyle={[styles.authScrollContent, isWide && styles.authScrollContentWide]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formColumn}>
              <View style={styles.mobileBrand}>
                <BrandLockup dark />
              </View>

              <View style={styles.formHeader}>
                <View style={styles.formEyebrowRow}>
                  <View style={styles.formEyebrowDot} />
                  <Text style={styles.formEyebrow}>ACESSO DO VIAJANTE</Text>
                </View>
                <Text style={styles.formTitle}>{isInvite ? "Sua viagem começa aqui" : "Bem-vindo de volta"}</Text>
                <Text style={styles.formDescription}>
                  {isInvite
                    ? "Use o convite enviado pelo seu consultor para liberar seu roteiro no app."
                    : "Entre para acompanhar sua próxima viagem e falar com sua agência."}
                </Text>
              </View>

              <View style={styles.modeSelector}>
                <ModeButton active={isInvite} label="Recebi um convite" onPress={() => { clearError(); setMode("invite"); }} />
                <ModeButton active={!isInvite} label="Já tenho acesso" onPress={() => { clearError(); setMode("login"); }} />
              </View>

              <View style={styles.fields}>
                {isInvite ? (
                  <Field
                    label="Código ou link do convite"
                    value={form.inviteToken}
                    onChangeText={(value) => updateField("inviteToken", value)}
                    placeholder="Cole aqui o convite da sua agência"
                    autoCapitalize="none"
                    hint="Você recebeu este código por WhatsApp ou e-mail."
                    featured
                  />
                ) : null}

                {isInvite ? (
                  <Field label="Seu nome completo" value={form.fullName} onChangeText={(value) => updateField("fullName", value)} placeholder="Como devemos chamar você?" />
                ) : null}

                <Field
                  label="E-mail"
                  value={form.email}
                  onChangeText={(value) => updateField("email", value)}
                  placeholder="voce@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                {isInvite ? (
                  <Field
                    label="Confirme seu e-mail"
                    value={form.emailConfirm}
                    onChangeText={(value) => updateField("emailConfirm", value)}
                    placeholder="Digite novamente"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                ) : null}

                <Field
                  label={isInvite ? "Crie uma senha" : "Senha"}
                  value={form.password}
                  onChangeText={(value) => updateField("password", value)}
                  placeholder={isInvite ? "Mínimo de 8 caracteres" : "Digite sua senha"}
                  secureTextEntry={!showPassword}
                  trailing={
                    <Pressable onPress={() => setShowPassword((current) => !current)} hitSlop={10}>
                      <Text style={styles.passwordToggle}>{showPassword ? "Ocultar" : "Mostrar"}</Text>
                    </Pressable>
                  }
                />
              </View>

              {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

              <Pressable
                onPress={handleSubmit}
                disabled={authBusy}
                style={({ pressed }) => [styles.submitButton, { opacity: authBusy ? 0.65 : pressed ? 0.92 : 1 }]}
              >
                {authBusy ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Text style={styles.submitText}>{isInvite ? "Liberar minha viagem" : "Entrar no app"}</Text>
                    <Text style={styles.submitArrow}>→</Text>
                  </>
                )}
              </Pressable>

              <View style={styles.securityLine}>
                <Text style={styles.securityIcon}>✓</Text>
                <Text style={styles.securityText}>Seu acesso é privado e vinculado à agência que criou a viagem.</Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const ONBOARDING_SLIDES = [
  {
    eyebrow: "SUA VIAGEM EM UM SÓ LUGAR",
    title: "A trilha criada para você.",
    description: "Veja cada dia da viagem, horários, reservas e recomendações preparadas pelo seu consultor.",
    kind: "route" as const,
  },
  {
    eyebrow: "VIAJE SEM PROCURAR PAPÉIS",
    title: "Documentos sempre à mão.",
    description: "Passagens, vouchers, hospedagens e informações importantes organizadas no seu celular.",
    kind: "documents" as const,
  },
  {
    eyebrow: "VOCÊ NÃO VIAJA SOZINHO",
    title: "Sua agência por perto.",
    description: "Converse com o consultor, registre momentos e acompanhe despesas enquanto aproveita a viagem.",
    kind: "support" as const,
  },
];

function Onboarding({ onComplete }: { onComplete: () => Promise<void> }) {
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const slide = ONBOARDING_SLIDES[step];
  const isLast = step === ONBOARDING_SLIDES.length - 1;

  const continueFlow = async () => {
    if (!isLast) {
      setStep((current) => current + 1);
      return;
    }
    setFinishing(true);
    await onComplete();
  };

  return (
    <View style={styles.onboardingPage}>
      <View style={styles.onboardingGlow} />
      <SafeAreaView style={styles.onboardingSafe} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.onboardingTop}>
          <BrandLockup />
          <Pressable onPress={onComplete} hitSlop={10}><Text style={styles.skipText}>Pular</Text></Pressable>
        </View>

        <View style={styles.illustrationStage}>
          <OnboardingIllustration kind={slide.kind} />
        </View>

        <View style={styles.onboardingContent}>
          <Text style={styles.onboardingEyebrow}>{slide.eyebrow}</Text>
          <Text style={styles.onboardingTitle}>{slide.title}</Text>
          <Text style={styles.onboardingDescription}>{slide.description}</Text>
          <View style={styles.dotsRow}>
            {ONBOARDING_SLIDES.map((_, index) => <View key={index} style={[styles.dot, index === step && styles.dotActive]} />)}
          </View>
          <Pressable onPress={continueFlow} disabled={finishing} style={({ pressed }) => [styles.onboardingButton, { opacity: pressed || finishing ? 0.8 : 1 }]}>
            {finishing ? <ActivityIndicator color={BLUE_DEEP} /> : <><Text style={styles.onboardingButtonText}>{isLast ? "Acessar minha viagem" : "Continuar"}</Text><Text style={styles.onboardingButtonArrow}>→</Text></>}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function OnboardingIllustration({ kind }: { kind: "route" | "documents" | "support" }) {
  if (kind === "documents") {
    return <View style={styles.phoneFrame}><View style={styles.phoneSpeaker} /><View style={styles.documentCard}><View style={styles.documentIcon}><Text style={styles.documentIconText}>✓</Text></View><View style={styles.documentLines}><View style={styles.documentLineLong} /><View style={styles.documentLineShort} /></View></View><View style={[styles.documentCard, styles.documentCardSecond]}><View style={[styles.documentIcon, { backgroundColor: "#EAF0FF" }]}><Text style={[styles.documentIconText, { color: BLUE }]}>↗</Text></View><View style={styles.documentLines}><View style={styles.documentLineLong} /><View style={styles.documentLineShort} /></View></View></View>;
  }
  if (kind === "support") {
    return <View style={styles.phoneFrame}><View style={styles.phoneSpeaker} /><View style={styles.chatBubbleAgency}><Text style={styles.chatAgencyLabel}>SUA AGÊNCIA</Text><Text style={styles.chatText}>Tudo certo para o passeio de amanhã?</Text></View><View style={styles.chatBubbleTraveler}><Text style={styles.chatTravelerText}>Tudo perfeito! ✓</Text></View><View style={styles.supportPulse}><Text style={styles.supportPulseText}>24h</Text></View></View>;
  }
  return <View style={styles.phoneFrame}><View style={styles.phoneSpeaker} /><View style={styles.routeLine} /><View style={[styles.routePoint, { top: 82 }]}><Text style={styles.routePointText}>1</Text></View><View style={[styles.routePoint, { top: 168, left: 105 }]}><Text style={styles.routePointText}>2</Text></View><View style={[styles.routePoint, { top: 255, left: 54, backgroundColor: CORAL }]}><Text style={styles.routePointText}>3</Text></View><View style={styles.routeLabel}><Text style={styles.routeLabelSmall}>HOJE</Text><Text style={styles.routeLabelTitle}>Descobrir o destino</Text></View></View>;
}

function BrandLockup({ dark = false }: { dark?: boolean }) {
  return (
    <View style={styles.brandLockup}>
      <View style={[styles.compassMark, dark && styles.compassMarkDark]}>
        <View style={styles.compassNeedle} />
        <View style={styles.compassCenter} />
      </View>
      <View>
        <Text style={[styles.brandName, dark && styles.brandNameDark]}>RUMO</Text>
        <Text style={[styles.brandTagline, dark && styles.brandTaglineDark]}>SUA VIAGEM, NO SEU RITMO</Text>
      </View>
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function TravelerHero({ compact }: { compact: boolean }) {
  return (
    <View style={[styles.hero, compact && styles.heroCompact]}>
      <View style={styles.heroGlow} />
      <View style={styles.heroRingOne} />
      <View style={styles.heroRingTwo} />
      <BrandLockup />
      <View style={[styles.heroCopy, compact && styles.heroCopyCompact]}>
        <View style={styles.heroPill}><Text style={styles.heroPillText}>O APP DA SUA PRÓXIMA VIAGEM</Text></View>
        <Text style={[styles.heroTitle, compact && styles.heroTitleCompact]}>Tudo o que você precisa, do embarque ao último destino.</Text>
        {!compact ? <Text style={styles.heroText}>Receba o roteiro criado pelo seu consultor e viaje com informações, documentos e suporte sempre à mão.</Text> : null}
      </View>
      {!compact ? (
        <View style={styles.journeyCard}>
          <JourneyStep icon="01" title="Roteiro dia a dia" subtitle="Horários, reservas e lugares" />
          <View style={styles.journeyLine} />
          <JourneyStep icon="02" title="Tudo organizado" subtitle="Documentos e despesas" />
          <View style={styles.journeyLine} />
          <JourneyStep icon="03" title="Suporte na viagem" subtitle="Sua agência por perto" />
        </View>
      ) : null}
    </View>
  );
}

function JourneyStep({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return <View style={styles.journeyStep}><View style={styles.journeyIcon}><Text style={styles.journeyIconText}>{icon}</Text></View><View><Text style={styles.journeyTitle}>{title}</Text><Text style={styles.journeySubtitle}>{subtitle}</Text></View></View>;
}

function ModeButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.modeButton, active && styles.modeButtonActive]}><Text style={[styles.modeText, active && styles.modeTextActive]}>{label}</Text></Pressable>;
}

function Field({ label, hint, featured, trailing, ...props }: React.ComponentProps<typeof TextInput> & { label: string; hint?: string; featured?: boolean; trailing?: React.ReactNode }) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputShell, featured && styles.inputShellFeatured]}>
        <TextInput {...props} placeholderTextColor="#98A0B2" style={styles.input} />
        {trailing ? <View style={styles.inputTrailing}>{trailing}</View> : null}
      </View>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F4F7FC", overflow: "hidden" },
  safeArea: { flex: 1 }, flex: { flex: 1 },
  onboardingLoading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BLUE_DEEP },
  onboardingPage: { flex: 1, backgroundColor: BLUE_DEEP, overflow: "hidden" },
  onboardingGlow: { position: "absolute", width: 520, height: 520, borderRadius: 260, backgroundColor: BLUE, top: -280, right: -220, opacity: 0.75 },
  onboardingSafe: { flex: 1, width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 24, paddingVertical: 12 },
  onboardingTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", zIndex: 2 },
  skipText: { color: "rgba(255,255,255,.65)", fontSize: 12, fontWeight: "800" },
  illustrationStage: { flex: 1, minHeight: 310, alignItems: "center", justifyContent: "center", paddingTop: 18 },
  phoneFrame: { width: 220, height: 330, borderRadius: 34, borderWidth: 7, borderColor: "rgba(255,255,255,.88)", backgroundColor: "#F7F9FD", shadowColor: "#000", shadowOpacity: 0.28, shadowRadius: 30, shadowOffset: { width: 0, height: 20 }, overflow: "hidden" },
  phoneSpeaker: { position: "absolute", alignSelf: "center", top: 8, width: 54, height: 5, borderRadius: 4, backgroundColor: "#D8DFEB" },
  routeLine: { position: "absolute", left: 74, top: 96, width: 62, height: 180, borderLeftWidth: 3, borderBottomWidth: 3, borderColor: "#9BB4F2", borderStyle: "dashed", transform: [{ rotate: "-8deg" }] },
  routePoint: { position: "absolute", left: 48, width: 34, height: 34, borderRadius: 17, backgroundColor: BLUE, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "white", shadowColor: BLUE, shadowOpacity: 0.22, shadowRadius: 8 },
  routePointText: { color: "white", fontSize: 10, fontWeight: "900" },
  routeLabel: { position: "absolute", left: 24, right: 24, bottom: 18, borderRadius: 15, backgroundColor: "white", padding: 13, shadowColor: "#183B8C", shadowOpacity: 0.12, shadowRadius: 12 },
  routeLabelSmall: { color: CORAL, fontSize: 8, fontWeight: "900", letterSpacing: 1 }, routeLabelTitle: { color: INK, fontSize: 12, fontWeight: "900", marginTop: 3 },
  documentCard: { position: "absolute", left: 18, right: 18, top: 68, height: 76, borderRadius: 16, backgroundColor: "white", flexDirection: "row", alignItems: "center", padding: 14, gap: 12, shadowColor: "#183B8C", shadowOpacity: 0.1, shadowRadius: 12 },
  documentCardSecond: { top: 164 }, documentIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#FFF0EB", alignItems: "center", justifyContent: "center" }, documentIconText: { color: CORAL, fontSize: 16, fontWeight: "900" },
  documentLines: { flex: 1, gap: 8 }, documentLineLong: { height: 8, borderRadius: 5, backgroundColor: "#DDE5F3", width: "90%" }, documentLineShort: { height: 7, borderRadius: 5, backgroundColor: "#EEF2F8", width: "58%" },
  chatBubbleAgency: { position: "absolute", left: 18, right: 42, top: 70, borderRadius: 17, borderBottomLeftRadius: 5, backgroundColor: "white", padding: 14, shadowColor: "#183B8C", shadowOpacity: 0.1, shadowRadius: 12 },
  chatAgencyLabel: { color: BLUE, fontSize: 8, fontWeight: "900", letterSpacing: 1 }, chatText: { color: INK, fontSize: 11, lineHeight: 16, fontWeight: "700", marginTop: 5 },
  chatBubbleTraveler: { position: "absolute", right: 18, top: 166, borderRadius: 17, borderBottomRightRadius: 5, backgroundColor: BLUE, paddingHorizontal: 15, paddingVertical: 12 }, chatTravelerText: { color: "white", fontSize: 11, fontWeight: "800" },
  supportPulse: { position: "absolute", alignSelf: "center", bottom: 27, width: 66, height: 66, borderRadius: 33, backgroundColor: CORAL, alignItems: "center", justifyContent: "center", borderWidth: 8, borderColor: "#FFE4DC" }, supportPulseText: { color: "white", fontSize: 14, fontWeight: "900" },
  onboardingContent: { paddingBottom: 12, gap: 10 }, onboardingEyebrow: { color: "#89ADFF", fontSize: 9, fontWeight: "900", letterSpacing: 1.45 },
  onboardingTitle: { color: "white", fontSize: 30, lineHeight: 35, fontWeight: "900", letterSpacing: -1 }, onboardingDescription: { color: "rgba(255,255,255,.62)", fontSize: 13, lineHeight: 20, maxWidth: 440 },
  dotsRow: { flexDirection: "row", gap: 6, marginTop: 7, marginBottom: 5 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,.22)" }, dotActive: { width: 24, backgroundColor: CORAL },
  onboardingButton: { minHeight: 54, borderRadius: 15, backgroundColor: "white", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14 }, onboardingButtonText: { color: BLUE_DEEP, fontSize: 13, fontWeight: "900" }, onboardingButtonArrow: { color: CORAL, fontSize: 21 },
  orbTop: { position: "absolute", width: 380, height: 380, borderRadius: 190, backgroundColor: "#DCE8FF", right: -170, top: -190, opacity: 0.7 },
  orbBottom: { position: "absolute", width: 280, height: 280, borderRadius: 140, backgroundColor: "#FFE8E1", left: -160, bottom: -160, opacity: 0.65 },
  authScrollContent: { flexGrow: 1, padding: 16, justifyContent: "center" },
  authScrollContentWide: { paddingVertical: 36 },
  scrollContent: { flexGrow: 1, padding: 16, justifyContent: "center", gap: 16 },
  scrollContentWide: { flexDirection: "row", padding: 28, gap: 0, alignItems: "stretch", maxWidth: 1220, width: "100%", alignSelf: "center" },
  hero: { flex: 1.08, minHeight: 650, borderTopLeftRadius: 30, borderBottomLeftRadius: 30, backgroundColor: BLUE_DEEP, padding: 42, overflow: "hidden", justifyContent: "space-between" },
  heroCompact: { minHeight: 255, flex: 0, borderRadius: 26, padding: 22 },
  heroGlow: { position: "absolute", width: 420, height: 420, borderRadius: 210, backgroundColor: BLUE, top: -170, right: -100, opacity: 0.7 },
  heroRingOne: { position: "absolute", width: 330, height: 330, borderRadius: 165, borderWidth: 38, borderColor: "rgba(255,255,255,.05)", right: -110, bottom: -70 },
  heroRingTwo: { position: "absolute", width: 190, height: 190, borderRadius: 95, borderWidth: 1, borderColor: "rgba(255,255,255,.12)", right: -35, bottom: 0 },
  brandLockup: { flexDirection: "row", alignItems: "center", gap: 12, zIndex: 2 },
  compassMark: { width: 45, height: 45, borderRadius: 14, borderWidth: 2, borderColor: "rgba(255,255,255,.85)", alignItems: "center", justifyContent: "center", transform: [{ rotate: "45deg" }] },
  compassMarkDark: { borderColor: BLUE },
  compassNeedle: { width: 7, height: 23, borderRadius: 6, backgroundColor: CORAL },
  compassCenter: { position: "absolute", width: 7, height: 7, borderRadius: 4, backgroundColor: "white" },
  brandName: { color: "white", fontSize: 21, fontWeight: "900", letterSpacing: 2 }, brandNameDark: { color: BLUE_DEEP },
  brandTagline: { color: "rgba(255,255,255,.55)", fontSize: 7, fontWeight: "800", letterSpacing: 1.25, marginTop: 2 }, brandTaglineDark: { color: MUTED },
  heroCopy: { maxWidth: 470, zIndex: 2, gap: 18 }, heroCopyCompact: { gap: 10, marginTop: 28 },
  heroPill: { alignSelf: "flex-start", borderRadius: 999, backgroundColor: "rgba(255,255,255,.1)", paddingHorizontal: 12, paddingVertical: 7 },
  heroPillText: { color: "#91B6FF", fontSize: 9, fontWeight: "900", letterSpacing: 1.35 },
  heroTitle: { color: "white", fontSize: 42, lineHeight: 48, fontWeight: "900", letterSpacing: -1.6 }, heroTitleCompact: { fontSize: 26, lineHeight: 31, letterSpacing: -0.8 },
  heroText: { color: "rgba(255,255,255,.65)", fontSize: 15, lineHeight: 23, maxWidth: 430 },
  journeyCard: { zIndex: 2, backgroundColor: "rgba(255,255,255,.075)", borderWidth: 1, borderColor: "rgba(255,255,255,.1)", borderRadius: 22, padding: 20 },
  journeyStep: { flexDirection: "row", alignItems: "center", gap: 13 }, journeyIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: CORAL, alignItems: "center", justifyContent: "center" }, journeyIconText: { color: "white", fontWeight: "900", fontSize: 10 },
  journeyTitle: { color: "white", fontSize: 13, fontWeight: "800" }, journeySubtitle: { color: "rgba(255,255,255,.52)", fontSize: 10, marginTop: 2 },
  journeyLine: { height: 16, width: 1, backgroundColor: "rgba(255,255,255,.15)", marginLeft: 18, marginVertical: 3 },
  formColumn: { backgroundColor: "white", borderRadius: 26, padding: 24, gap: 21, borderWidth: 1, borderColor: "#E4EAF5", width: "100%", maxWidth: 500, alignSelf: "center", shadowColor: "#16306E", shadowOpacity: 0.08, shadowRadius: 26, shadowOffset: { width: 0, height: 12 } },
  formColumnWide: { flex: 0.92, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderTopRightRadius: 30, borderBottomRightRadius: 30, paddingHorizontal: 52, paddingVertical: 42, justifyContent: "center", maxWidth: 540 },
  mobileBrand: { marginBottom: 4 },
  formHeader: { gap: 7 }, formEyebrowRow: { flexDirection: "row", alignItems: "center", gap: 7 }, formEyebrowDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: CORAL },
  formEyebrow: { color: BLUE, fontSize: 9, fontWeight: "900", letterSpacing: 1.4 }, formTitle: { color: INK, fontSize: 28, lineHeight: 34, fontWeight: "900", letterSpacing: -0.8 },
  formDescription: { color: MUTED, fontSize: 13, lineHeight: 20 },
  modeSelector: { flexDirection: "row", backgroundColor: "#F0F4FB", borderRadius: 13, padding: 4 },
  modeButton: { flex: 1, minHeight: 42, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 }, modeButtonActive: { backgroundColor: BLUE, shadowColor: BLUE, shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  modeText: { color: MUTED, fontSize: 11, fontWeight: "800" }, modeTextActive: { color: "white" },
  fields: { gap: 14 }, fieldBlock: { gap: 6 }, fieldLabel: { color: INK, fontSize: 11, fontWeight: "800" },
  inputShell: { minHeight: 50, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#DDE4F0", borderRadius: 13, backgroundColor: "#FBFCFE" }, inputShellFeatured: { borderColor: "#89A9F5", backgroundColor: "#F4F7FF", borderWidth: 1.5 },
  input: { flex: 1, minHeight: 50, paddingHorizontal: 14, color: INK, fontSize: 13, outlineStyle: "none" } as never,
  inputTrailing: { paddingRight: 13 }, passwordToggle: { color: BLUE, fontSize: 10, fontWeight: "800" }, fieldHint: { color: MUTED, fontSize: 9, marginLeft: 2 },
  errorBox: { borderRadius: 12, borderWidth: 1, borderColor: "#FFC8BA", backgroundColor: "#FFF1ED", padding: 11 }, errorText: { color: "#9A3D20", fontSize: 11, fontWeight: "700", lineHeight: 16 },
  submitButton: { minHeight: 54, borderRadius: 14, backgroundColor: CORAL, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14, shadowColor: CORAL, shadowOpacity: 0.23, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  submitText: { color: "white", fontSize: 13, fontWeight: "900" }, submitArrow: { color: "white", fontSize: 21, marginTop: -2 },
  securityLine: { flexDirection: "row", alignItems: "flex-start", justifyContent: "center", gap: 7 }, securityIcon: { color: "#17805C", fontSize: 11, fontWeight: "900" }, securityText: { color: MUTED, fontSize: 9, lineHeight: 14, textAlign: "center", maxWidth: 310 },
});
