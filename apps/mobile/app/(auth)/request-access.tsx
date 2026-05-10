import { useState } from 'react';
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
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { colors, fonts, radii } from '../../lib/theme';

export default function RequestAccess() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [team, setTeam] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!name || !email || !password) return setError('name, email, and password required');
    if (password.length < 8) return setError('password must be at least 8 characters');
    setBusy(true);
    setError(null);
    try {
      await api.post('/auth/request-access', { name, email, password, team, reason });
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <View style={s.successGlyph}>
          <Ionicons name="checkmark" size={24} color={colors.fg} />
        </View>
        <Text style={s.successTitle}>Request submitted</Text>
        <Text style={s.successSub}>
          An admin will review and email you at{' '}
          <Text style={s.mono}>{email || 'your email'}</Text> within 1 business day.
        </Text>
        <Pressable style={s.secondaryBtn} onPress={() => router.replace('/(auth)/signin')}>
          <Ionicons name="arrow-back" size={14} color={colors.fg} />
          <Text style={s.secondaryBtnText}>Back to sign in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={s.container}>
        <View style={s.header}>
          <Link href="/(auth)/signin" asChild>
            <Pressable style={s.iconBtn}>
              <Ionicons name="arrow-back" size={16} color={colors.fg} />
            </Pressable>
          </Link>
          <View style={{ flex: 1 }}>
            <Text style={s.h1}>Request access</Text>
            <Text style={s.h1Sub}>
              We'll route this to an admin. Set the password you'll sign in with.
            </Text>
          </View>
        </View>

        <View>
          <Text style={s.label}>Full name</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Jane Doe" placeholderTextColor={colors.fgSubtle} />
        </View>

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
          <Text style={s.help}>Must match an approved company domain.</Text>
        </View>

        <View>
          <Text style={s.label}>
            Password <Text style={s.help}>min 8 chars</Text>
          </Text>
          <TextInput
            style={s.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.fgSubtle}
          />
        </View>

        <View>
          <Text style={s.label}>Team</Text>
          <TextInput
            style={s.input}
            value={team}
            onChangeText={setTeam}
            placeholder="Marketing, Sales, Research…"
            placeholderTextColor={colors.fgSubtle}
          />
        </View>

        <View>
          <Text style={s.label}>What will you use it for?</Text>
          <TextInput
            style={[s.input, { height: 84, textAlignVertical: 'top', paddingTop: 11 }]}
            multiline
            value={reason}
            onChangeText={setReason}
            placeholder="One or two sentences helps the admin approve faster."
            placeholderTextColor={colors.fgSubtle}
          />
        </View>

        {error && <Text style={s.error}>{error}</Text>}

        <Pressable style={[s.btn, busy && { opacity: 0.5 }]} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color={colors.accentFg} /> : <Text style={s.btnText}>Submit request</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { padding: 24, paddingTop: 64, gap: 14, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElev,
    alignItems: 'center',
    justifyContent: 'center',
  },
  h1: { fontSize: 22, fontFamily: fonts.sansSemibold, color: colors.fg, letterSpacing: -0.3 },
  h1Sub: { fontSize: 13, fontFamily: fonts.sans, color: colors.fgMuted, marginTop: 4, lineHeight: 18 },
  label: { color: colors.fg, fontSize: 12, fontFamily: fonts.sansMedium, marginBottom: 8 },
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
  help: { color: colors.fgMuted, fontSize: 11, fontFamily: fonts.mono, marginTop: 6 },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 6,
  },
  btnText: { color: colors.accentFg, fontSize: 14, fontFamily: fonts.sansMedium },
  error: { color: colors.red, fontSize: 11, fontFamily: fonts.mono },
  successGlyph: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: { fontSize: 17, fontFamily: fonts.sansSemibold, color: colors.fg, marginBottom: 6 },
  successSub: {
    fontSize: 13,
    fontFamily: fonts.sans,
    color: colors.fgMuted,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 19,
  },
  mono: { fontFamily: fonts.mono },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElev,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.lg,
  },
  secondaryBtnText: { color: colors.fg, fontSize: 13, fontFamily: fonts.sansMedium },
});
