import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import { colors, fonts, radii } from '../../lib/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signout, updateProfile, deleteAccount } = useAuth();

  // The tab is gated by AuthProvider — if user is null we just shouldn't
  // render anything (route will redirect via the (tabs) layout).
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [team, setTeam] = useState(user?.team ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  async function save() {
    if (!user) return;
    setError(null);

    const patch: Parameters<typeof updateProfile>[0] = {};
    if (name.trim() && name.trim() !== user.name) patch.name = name.trim();
    if (email.trim() && email.trim() !== user.email) patch.email = email.trim();
    const nextTeam = team.trim() === '' ? null : team.trim();
    if (nextTeam !== (user.team ?? null)) patch.team = nextTeam;
    if (newPassword) {
      patch.newPassword = newPassword;
      patch.currentPassword = currentPassword;
    }

    if (Object.keys(patch).length === 0) {
      Alert.alert('Nothing to update');
      return;
    }

    setSaving(true);
    try {
      await updateProfile(patch);
      setCurrentPassword('');
      setNewPassword('');
      Alert.alert('Profile saved');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Delete your account?',
      'This signs you out and prevents future sign-ins. Saved crawls, alerts, and billing history are kept for audit, but you won\'t see them again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              router.replace('/(auth)/signin');
            } catch (e) {
              Alert.alert('Delete failed', (e as Error).message);
            }
          },
        },
      ],
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={s.container}
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.h2}>Profile</Text>
          <Text style={s.topSub}>
            {user.role} · {user.email}
          </Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Account</Text>
          <Text style={s.cardSub}>Changes save immediately. Email must be unique.</Text>

          <Field label="Name" value={name} onChange={setName} autoComplete="name" />
          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field label="Team" value={team} onChange={setTeam} placeholder="(optional)" />

          <View style={s.divider} />
          <Text style={s.subTitle}>Change password</Text>
          <Text style={s.cardSub}>Leave blank to keep your current password.</Text>
          <Field
            label="Current password"
            value={currentPassword}
            onChange={setCurrentPassword}
            secureTextEntry
            autoComplete="current-password"
          />
          <Field
            label="New password"
            value={newPassword}
            onChange={setNewPassword}
            secureTextEntry
            autoComplete="new-password"
          />

          {error && <Text style={s.error}>{error}</Text>}

          <Pressable
            style={[s.primary, saving && { opacity: 0.5 }]}
            onPress={save}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.accentFg} />
            ) : (
              <Text style={s.primaryText}>Save changes</Text>
            )}
          </Pressable>
        </View>

        <Pressable style={s.signoutRow} onPress={signout}>
          <Ionicons name="log-out-outline" size={16} color={colors.fgMuted} />
          <Text style={s.signoutText}>Sign out</Text>
        </Pressable>

        <View style={s.danger}>
          <Text style={s.dangerTitle}>Danger zone</Text>
          <Text style={s.dangerSub}>
            Soft-deletes your account. Data is retained but you'll no longer be able to sign
            in. Contact an admin to restore.
          </Text>
          <Pressable style={s.dangerBtn} onPress={confirmDelete}>
            <Text style={s.dangerBtnText}>Delete account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  secureTextEntry,
  autoComplete,
  autoCapitalize,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoComplete?: React.ComponentProps<typeof TextInput>['autoComplete'];
  autoCapitalize?: React.ComponentProps<typeof TextInput>['autoCapitalize'];
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
}) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.fgSubtle}
        secureTextEntry={secureTextEntry}
        autoComplete={autoComplete}
        autoCapitalize={autoCapitalize ?? 'none'}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 120 },
  header: { marginBottom: 18 },
  h2: { fontSize: 22, fontFamily: fonts.sansSemibold, color: colors.fg, letterSpacing: -0.3 },
  topSub: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.fgSubtle,
    marginTop: 4,
    letterSpacing: 0.4,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    backgroundColor: colors.bgElev,
    padding: 18,
  },
  cardTitle: { fontSize: 15, fontFamily: fonts.sansSemibold, color: colors.fg },
  cardSub: { fontSize: 12, color: colors.fgMuted, marginTop: 4, fontFamily: fonts.sans },
  subTitle: { fontSize: 13, fontFamily: fonts.sansMedium, color: colors.fg },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    borderStyle: 'dashed',
    marginVertical: 18,
  },
  label: { fontSize: 12, fontFamily: fonts.sansMedium, color: colors.fg, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.fg,
    fontFamily: fonts.sans,
  },
  error: { color: colors.red, fontSize: 11, fontFamily: fonts.mono, marginTop: 12 },
  primary: {
    marginTop: 16,
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryText: { color: colors.accentFg, fontSize: 14, fontFamily: fonts.sansMedium },

  signoutRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  signoutText: { color: colors.fgMuted, fontSize: 13, fontFamily: fonts.sansMedium },

  danger: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: colors.red,
    borderRadius: radii.card,
    backgroundColor: colors.bg,
    padding: 18,
  },
  dangerTitle: { fontSize: 15, fontFamily: fonts.sansSemibold, color: colors.red },
  dangerSub: {
    fontSize: 12,
    color: colors.fgMuted,
    marginTop: 4,
    fontFamily: fonts.sans,
    lineHeight: 18,
  },
  dangerBtn: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.red,
    borderRadius: radii.lg,
    paddingVertical: 11,
    alignItems: 'center',
  },
  dangerBtnText: { color: colors.red, fontSize: 14, fontFamily: fonts.sansMedium },
});
