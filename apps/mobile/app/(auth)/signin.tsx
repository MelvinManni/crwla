import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { colors, fonts, radii } from '../../lib/theme';

export default function Signin() {
  const router = useRouter();
  const { signin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email || !password) return setError('email and password required');
    setBusy(true);
    setError(null);
    try {
      await signin(email, password);
      router.replace('/(tabs)/dashboard');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={s.container}
    >
      <View style={s.brand}>
        <View style={s.glyph}>
          <Text style={s.glyphText}>CR</Text>
        </View>
        <View>
          <Text style={s.title}>Sign in to CRWLA</Text>
          <Text style={s.sub}>
            Internal research tool. Access is granted by an admin — request below if you don't
            have an account.
          </Text>
        </View>
      </View>

      <View style={s.form}>
        <View>
          <Text style={s.label}>Work email</Text>
          <TextInput
            style={s.input}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@company.com"
            placeholderTextColor={colors.fgSubtle}
          />
        </View>
        <View>
          <Text style={s.label}>Password</Text>
          <TextInput
            style={s.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.fgSubtle}
          />
        </View>
        {error && <Text style={s.error}>{error}</Text>}
        <Pressable style={[s.btn, busy && s.btnDisabled]} onPress={submit} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={colors.accentFg} />
          ) : (
            <Text style={s.btnText}>Sign in</Text>
          )}
        </Pressable>
        <Text style={s.switch}>
          No account yet?{' '}
          <Link href="/(auth)/request-access" style={s.switchLink}>
            Request access
          </Link>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    backgroundColor: colors.bg,
  },
  brand: { gap: 14, alignItems: 'flex-start', marginBottom: 32 },
  glyph: {
    width: 44,
    height: 44,
    borderRadius: radii.container - 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphText: { color: colors.accentFg, fontFamily: fonts.monoMedium, fontSize: 14 },
  title: {
    fontSize: 26,
    fontFamily: fonts.sansSemibold,
    color: colors.fg,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  sub: {
    color: colors.fgMuted,
    fontSize: 13,
    fontFamily: fonts.sans,
    lineHeight: 20,
    marginTop: 6,
  },
  form: { gap: 14 },
  label: {
    color: colors.fg,
    fontSize: 12,
    fontFamily: fonts.sansMedium,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElev,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.fg,
    fontFamily: fonts.sans,
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 6,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.accentFg, fontSize: 14, fontFamily: fonts.sansMedium },
  switch: {
    textAlign: 'center',
    marginTop: 8,
    color: colors.fgMuted,
    fontSize: 12,
    fontFamily: fonts.sans,
  },
  switchLink: { color: colors.fg, fontFamily: fonts.sansMedium, textDecorationLine: 'underline' },
  error: { color: colors.red, fontSize: 11, fontFamily: fonts.mono },
});
