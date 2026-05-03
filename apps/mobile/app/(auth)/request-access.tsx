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
import { Link } from 'expo-router';
import { api } from '../../lib/api';

export default function RequestAccess() {
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
      <View style={[s.container, { justifyContent: 'center' }]}>
        <Text style={s.title}>Request submitted</Text>
        <Text style={s.sub}>We'll let an admin know.</Text>
        <Link href="/(auth)/signin" style={[s.link, { marginTop: 24 }]}>
          ← Back to sign in
        </Link>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.container}>
        <Text style={s.title}>Request access</Text>
        <Text style={s.sub}>We'll route this to an admin. Set the password you'll sign in with.</Text>

        <Text style={s.label}>Name</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} />

        <Text style={s.label}>Work email</Text>
        <TextInput
          style={s.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={s.label}>Password (min 8 chars)</Text>
        <TextInput style={s.input} secureTextEntry value={password} onChangeText={setPassword} />

        <Text style={s.label}>Team (optional)</Text>
        <TextInput style={s.input} value={team} onChangeText={setTeam} />

        <Text style={s.label}>Why do you need access?</Text>
        <TextInput
          style={[s.input, { height: 80, textAlignVertical: 'top' }]}
          multiline
          value={reason}
          onChangeText={setReason}
        />

        {error && <Text style={s.error}>{error}</Text>}

        <Pressable style={s.button} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Submit</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '600', color: '#111' },
  sub: { color: '#777', marginTop: 4, marginBottom: 12 },
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
  link: { color: '#111', fontWeight: '500' },
  error: { color: '#dc2626', marginTop: 8, fontSize: 13 },
});
