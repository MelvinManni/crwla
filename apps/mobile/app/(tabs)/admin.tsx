import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../../lib/api';
import { colors, fonts, radii } from '../../lib/theme';

type Req = { id: string; name: string; email: string; team: string; reason: string; requested: string };

export default function Admin() {
  const [items, setItems] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    try {
      const out = await api.get<{ requests: Req[] }>('/admin/requests');
      setItems(out.requests);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function approve(id: string) {
    setBusy(id);
    try {
      await api.post(`/admin/requests/${id}/approve`);
      setItems((arr) => arr.filter((x) => x.id !== id));
    } finally {
      setBusy(null);
    }
  }
  async function deny(id: string) {
    setBusy(id);
    try {
      await api.post(`/admin/requests/${id}/deny`);
      setItems((arr) => arr.filter((x) => x.id !== id));
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.fg} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.appTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.h2}>Admin</Text>
          <Text style={s.topSub}>
            {items.length} PENDING REQUEST{items.length === 1 ? '' : 'S'}
          </Text>
        </View>
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 120, gap: 8 }}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View>
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.metaLine}>
                <Text style={s.mono}>{item.email}</Text> · {item.team} · {item.requested}
              </Text>
            </View>
            {item.reason ? <Text style={s.reason}>{item.reason}</Text> : null}
            <View style={s.actions}>
              <Pressable
                style={[s.btn, s.btnPrimary, busy === item.id && { opacity: 0.5 }]}
                disabled={busy === item.id}
                onPress={() => approve(item.id)}
              >
                <Text style={s.btnPrimaryText}>Approve</Text>
              </Pressable>
              <Pressable
                style={[s.btn, s.btnSecondary, busy === item.id && { opacity: 0.5 }]}
                disabled={busy === item.id}
                onPress={() => deny(item.id)}
              >
                <Text style={s.btnSecondaryText}>Deny</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ padding: 48, alignItems: 'center' }}>
            <Text style={{ color: colors.fgMuted, fontFamily: fonts.sans, fontSize: 13 }}>
              No pending requests.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  appTop: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  h2: { fontSize: 18, fontFamily: fonts.sansSemibold, color: colors.fg, letterSpacing: -0.2 },
  topSub: { fontFamily: fonts.mono, fontSize: 11, color: colors.fgSubtle, marginTop: 2, letterSpacing: 0.4 },
  card: {
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: 16,
    gap: 12,
  },
  name: { fontFamily: fonts.sansSemibold, color: colors.fg, fontSize: 15, letterSpacing: -0.1 },
  metaLine: { fontFamily: fonts.sans, fontSize: 12, color: colors.fgMuted, marginTop: 4 },
  mono: { fontFamily: fonts.mono },
  reason: { fontSize: 13, color: colors.fg, fontFamily: fonts.sans, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: radii.lg, alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.accent },
  btnPrimaryText: { color: colors.accentFg, fontSize: 13, fontFamily: fonts.sansMedium },
  btnSecondary: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgElev },
  btnSecondaryText: { color: colors.fg, fontSize: 13, fontFamily: fonts.sansMedium },
});
