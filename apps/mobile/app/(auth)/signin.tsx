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
        <Text style={s.title}>Sign in to CRWLA</Text>
        <Text style={s.sub}>Internal research tool. Access is granted by an admin.</Text>
      </View>

      <Text style={s.label}>Work email</Text>
      <TextInput
        style={s.input}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder="you@company.com"
      />
      <Text style={s.label}>Password</Text>
      <TextInput
        style={s.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
      />
      {error && <Text style={s.error}>{error}</Text>}
      <Pressable style={s.button} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Sign in</Text>}
      </Pressable>
      <Text style={s.footer}>
        No account yet?{' '}
        <Link href="/(auth)/request-access" style={s.link}>
          Request access
        </Link>
      </Text>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  brand: { marginBottom: 24 },
  glyph: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  glyphText: { color: '#fff', fontFamily: 'monospace', fontSize: 13 },
  title: { fontSize: 22, fontWeight: '600', color: '#111' },
  sub: { color: '#777', marginTop: 4 },
  label: { color: '#111', fontSize: 13, fontWeight: '500', marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  button: {
    backgroundColor: '#111',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  footer: { textAlign: 'center', marginTop: 16, color: '#777' },
  link: { color: '#111', fontWeight: '500' },
  error: { color: '#dc2626', marginTop: 8, fontSize: 13 },
});
